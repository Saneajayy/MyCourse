'use client';

import React, { useEffect, useRef, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type Hls from 'hls.js';
import { useAuth } from '../../../context/auth-context';
import { apiClient, ApiError } from '../../../lib/api-client';
import { siteConfig } from '../../../config/site';
import { Button } from '../../../components/ui';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertTriangle,
  RotateCcw,
  SkipForward,
  Menu,
  X,
  Loader2,
  Lock,
} from 'lucide-react';

interface LessonProgressItem {
  lessonId: string;
  title: string;
  durationSeconds: number;
  isCompleted: boolean;
  completedAt: string | null;
  lastPositionSeconds: number;
  watchedSeconds: number;
}

interface SectionProgressItem {
  sectionId: string;
  title: string;
  lessons: LessonProgressItem[];
}

interface PlaybackData {
  sessionId: string;
  lessonId: string;
  title: string;
  durationSeconds: number;
  playbackUrl: string;
  embedUrl: string;
  expiresAt: number;
  watermark: {
    text: string;
    userId: string;
  };
  progress: {
    lastPositionSeconds: number;
    watchedSeconds: number;
    isCompleted: boolean;
  };
}

export default function CoursePlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const { slug } = use(params);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Curriculum State
  const [sections, setSections] = useState<SectionProgressItem[]>([]);
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Video & Stream State
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [playbackData, setPlaybackData] = useState<PlaybackData | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isEvicted, setIsEvicted] = useState(false); // Session takeover by another device

  // Player Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<{ id: number; label: string }[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = Auto
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Dynamic Floating Watermark
  const [watermarkPos, setWatermarkPos] = useState({ top: '20%', left: '25%' });

  useEffect(() => {
    const interval = setInterval(() => {
      const top = `${Math.floor(Math.random() * 70) + 10}%`;
      const left = `${Math.floor(Math.random() * 60) + 10}%`;
      setWatermarkPos({ top, left });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // 1. Auth Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/learn/${slug}`);
    }
  }, [authLoading, isAuthenticated, router, slug]);

  // 2. Fetch Course Curriculum & Progress
  const fetchCurriculum = useCallback(async () => {
    try {
      const data = await apiClient<SectionProgressItem[]>(`/courses/${slug}/progress`);
      setSections(data);

      // Select first lesson or first uncompleted lesson if none selected
      if (!selectedLessonId && data.length > 0) {
        let candidateId: string | null = null;
        for (const sec of data) {
          const uncompleted = sec.lessons.find((l) => !l.isCompleted);
          if (uncompleted) {
            candidateId = uncompleted.lessonId;
            break;
          }
        }
        if (!candidateId && data[0]?.lessons[0]) {
          candidateId = data[0].lessons[0].lessonId;
        }
        if (candidateId) {
          setSelectedLessonId(candidateId);
        }
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        setCurriculumError('You do not have an active enrollment for this course.');
      } else {
        setCurriculumError(err instanceof Error ? err.message : 'Failed to load course lessons');
      }
    } finally {
      setCurriculumLoading(false);
    }
  }, [slug, selectedLessonId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCurriculum();
    }
  }, [isAuthenticated, fetchCurriculum]);

  // 3. Fetch Playback Token & Start HLS Stream
  const loadLessonStream = useCallback(async (lessonId: string) => {
    setStreamLoading(true);
    setStreamError(null);
    setIsEvicted(false);

    try {
      const data = await apiClient<PlaybackData>(`/lessons/${lessonId}/playback`, {
        method: 'POST',
      });
      setPlaybackData(data);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'STREAM_SESSION_TERMINATED') {
        setIsEvicted(true);
      } else {
        setStreamError(err instanceof Error ? err.message : 'Failed to initialize video player');
      }
    } finally {
      setStreamLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLessonId) {
      loadLessonStream(selectedLessonId);
    }
  }, [selectedLessonId, loadLessonStream]);

  // 4. Initialize Hls.js dynamically on video element
  useEffect(() => {
    if (!playbackData || !videoRef.current) return;

    const video = videoRef.current;
    const url = playbackData.playbackUrl;
    let hlsInstance: Hls | null = null;
    let isCancelled = false;

    async function initPlayer() {
      try {
        const { default: HlsClass } = await import('hls.js');
        if (isCancelled || !videoRef.current) return;

        if (HlsClass.isSupported() && url.endsWith('.m3u8')) {
          const hls = new HlsClass({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 90,
          });

          hlsRef.current = hls;
          hlsInstance = hls;
          hls.loadSource(url);
          hls.attachMedia(video);

          hls.on(HlsClass.Events.MANIFEST_PARSED, (_event, data) => {
            // Extract available quality levels
            const levels = data.levels.map((lvl, index) => ({
              id: index,
              label: `${lvl.height}p`,
            }));
            setQualityLevels(levels);

            // Resume from saved position if > 5 seconds
            const resumePos = playbackData?.progress?.lastPositionSeconds ?? 0;
            if (resumePos > 5 && resumePos < (video.duration || 99999)) {
              video.currentTime = resumePos;
            }

            video.play().catch(() => setIsPlaying(false));
          });

          hls.on(HlsClass.Events.ERROR, (_event, errData) => {
            if (errData.fatal) {
              switch (errData.type) {
                case HlsClass.ErrorTypes.NETWORK_ERROR:
                  // Quiet token refresh on 403 or network failure
                  if (selectedLessonId) {
                    loadLessonStream(selectedLessonId);
                  }
                  break;
                case HlsClass.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  setStreamError('Media playback error. Re-acquiring stream...');
                  break;
              }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
          const resumePos = playbackData?.progress?.lastPositionSeconds ?? 0;
          if (resumePos > 5) {
            video.currentTime = resumePos;
          }
          video.play().catch(() => setIsPlaying(false));
        }
      } catch (err) {
        console.error('Failed to load HLS playback library', err);
        setStreamError('Failed to initialize playback engine.');
      }
    }

    initPlayer();

    return () => {
      isCancelled = true;
      if (hlsInstance) {
        hlsInstance.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.src = '';
      }
    };
  }, [playbackData, selectedLessonId, loadLessonStream]);

  // 5. Heartbeat loop (every 20s) - keeps session alive in Redis even when paused
  useEffect(() => {
    if (!playbackData || !selectedLessonId) return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video) return;

      try {
        await apiClient(`/lessons/${selectedLessonId}/heartbeat`, {
          method: 'POST',
          body: JSON.stringify({
            sessionId: playbackData.sessionId,
            positionSeconds: Math.floor(video.currentTime),
            durationSeconds: Math.floor(video.duration || playbackData.durationSeconds),
            watchedSeconds: Math.floor(video.currentTime),
            isPlaying: !video.paused,
            state: video.paused ? 'paused' : 'playing',
          }),
        });
      } catch (err: unknown) {
        if (err instanceof ApiError && err.code === 'STREAM_SESSION_TERMINATED') {
          setIsEvicted(true);
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }
      }
    }, 20000);

    heartbeatTimerRef.current = interval;

    return () => {
      clearInterval(interval);
      heartbeatTimerRef.current = null;
    };
  }, [playbackData, selectedLessonId]);

  // 6. Player Control Handlers
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pos = parseFloat(e.target.value);
    setCurrentTime(pos);
    if (videoRef.current) {
      videoRef.current.currentTime = pos;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSettingsMenu(false);
  };

  const handleQualityChange = (levelId: number) => {
    setCurrentQuality(levelId);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
    }
    setShowSettingsMenu(false);
  };

  // Custom "Page-Level Fullscreen" Mode
  const toggleCustomFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is in an input
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          }
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              videoRef.current.duration || 99999,
              videoRef.current.currentTime + 5,
            );
          }
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleCustomFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute, toggleCustomFullscreen]);

  // Navigate to Next Lesson
  const handleNextLesson = () => {
    const allLessons = sections.flatMap((s) => s.lessons);
    const currIdx = allLessons.findIndex((l) => l.lessonId === selectedLessonId);
    if (currIdx >= 0 && currIdx < allLessons.length - 1) {
      const next = allLessons[currIdx + 1];
      if (next) {
        setSelectedLessonId(next.lessonId);
      }
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  if (authLoading || curriculumLoading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-course-orange" />
        <p className="text-xs uppercase font-mono tracking-widest text-course-darkBlue">
          Loading Classroom &amp; Video Streams...
        </p>
      </div>
    );
  }

  if (curriculumError) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-700 inline-flex items-center justify-center border border-rose-800">
          <Lock className="w-6 h-6 text-rose-700" />
        </div>
        <h1 className="text-2xl font-black text-course-darkBlue">Access Restricted</h1>
        <p className="text-xs text-course-navyMuted leading-relaxed">{curriculumError}</p>
        <div className="pt-2">
          <Link href="/#pricing" className="btn-primary text-xs uppercase tracking-wide">
            Enroll to Unlock Access
          </Link>
        </div>
      </div>
    );
  }

  const currentLessonTitle =
    sections.flatMap((s) => s.lessons).find((l) => l.lessonId === selectedLessonId)?.title ||
    playbackData?.title ||
    'Video Lesson';

  return (
    <div className="flex flex-col flex-1 bg-course-white">
      {/* Top Banner Bar */}
      <div className="border-b border-black bg-course-bg px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/my-courses"
            className="text-xs font-bold text-course-darkBlue hover:text-course-orange uppercase tracking-wider flex items-center gap-1"
          >
            ← My Courses
          </Link>
          <span className="text-black/30">|</span>
          <span className="text-xs font-bold text-course-darkBlue truncate max-w-xs md:max-w-md">
            {currentLessonTitle}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-xs font-bold uppercase tracking-wider border border-black px-2.5 py-1 bg-course-white text-course-darkBlue hover:bg-course-orangeSubtle md:hidden flex items-center gap-1"
        >
          {isSidebarOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
          <span>Curriculum</span>
        </button>
      </div>

      {/* Main Classroom Workspace */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Video Player Workspace */}
        <div className="flex-1 flex flex-col p-4 md:p-6 bg-course-white overflow-y-auto">
          {/* Player Container (Supports Custom Page-Level Fullscreen) */}
          <div
            ref={containerRef}
            className={`relative bg-black border-2 border-black overflow-hidden select-none ${
              isFullscreen
                ? 'fixed inset-0 z-50 w-screen h-screen flex flex-col justify-center bg-black'
                : 'w-full aspect-video'
            }`}
          >
            {/* Loading Overlay */}
            {streamLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10 space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-course-orange" />
                <span className="text-xs font-mono tracking-widest uppercase">
                  Securing Stream Ticket...
                </span>
              </div>
            )}

            {/* Error Overlay */}
            {streamError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-6 z-20 text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-rose-500" />
                <p className="text-sm font-bold text-rose-200">{streamError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white text-black"
                  onClick={() => selectedLessonId && loadLessonStream(selectedLessonId)}
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Retry Playback
                </Button>
              </div>
            )}

            {/* Session Eviction Overlay: Another Device Took Over */}
            {isEvicted && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 text-white p-6 z-30 text-center space-y-4">
                <div className="w-12 h-12 bg-amber-500/20 text-amber-400 inline-flex items-center justify-center border border-amber-500">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="text-lg font-black text-amber-300">
                    You started watching on another device
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Your streaming session was paused because playback was initiated on another
                    browser or device.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => selectedLessonId && loadLessonStream(selectedLessonId)}
                >
                  Resume Watching Here
                </Button>
              </div>
            )}

            {/* HTML5 Video Element */}
            <video
              ref={videoRef}
              playsInline
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                  setDuration(videoRef.current.duration || 0);
                }
              }}
              onEnded={() => {
                setIsPlaying(false);
                fetchCurriculum(); // Refresh progress ticks
              }}
              onClick={togglePlay}
            />

            {/* Moving Anti-Piracy Watermark Overlay (Pointer-events none) */}
            <div
              className="absolute pointer-events-none transition-all duration-1000 ease-in-out font-mono font-bold text-xs uppercase px-2.5 py-1 bg-black/60 text-white/70 border border-white/20 select-none"
              style={{ top: watermarkPos.top, left: watermarkPos.left }}
              aria-hidden="true"
            >
              {user?.email || siteConfig.brandName}
            </div>

            {/* Custom Video Control Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-black/90 p-2 md:p-3 flex flex-col gap-2 text-white border-t border-black/40">
              {/* Scrubbing timeline slider */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Video seek slider"
                className="w-full h-1.5 bg-gray-700 accent-course-orange cursor-pointer"
              />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 md:gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause video (Space)' : 'Play video (Space)'}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white hover:text-course-orange"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 fill-current" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white hover:text-course-orange"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  {/* Volume Slider */}
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Volume slider"
                    className="w-16 md:w-20 h-1 bg-gray-700 accent-course-orange hidden sm:block"
                  />

                  <span className="text-xs font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Settings Menu (Speed & Quality) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                      aria-label="Player settings"
                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:text-course-orange"
                    >
                      <Settings className="w-5 h-5" />
                    </button>

                    {showSettingsMenu && (
                      <div className="absolute right-0 bottom-12 w-48 bg-course-white text-course-darkBlue border-2 border-black p-3 space-y-3 z-30 shadow-none text-xs">
                        {/* Playback speed */}
                        <div>
                          <span className="font-bold uppercase tracking-wider block mb-1">
                            Speed
                          </span>
                          <div className="grid grid-cols-3 gap-1">
                            {[0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => handleSpeedChange(s)}
                                className={`p-1 border border-black font-mono font-bold ${
                                  playbackRate === s
                                    ? 'bg-course-orange text-white'
                                    : 'bg-white hover:bg-course-orangeSubtle'
                                }`}
                              >
                                {s}x
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Quality selector */}
                        {qualityLevels.length > 0 && (
                          <div className="border-t border-black pt-2">
                            <span className="font-bold uppercase tracking-wider block mb-1">
                              Quality
                            </span>
                            <div className="space-y-1">
                              <button
                                type="button"
                                onClick={() => handleQualityChange(-1)}
                                className={`w-full text-left p-1 border border-black font-bold ${
                                  currentQuality === -1
                                    ? 'bg-course-orange text-white'
                                    : 'bg-white hover:bg-course-orangeSubtle'
                                }`}
                              >
                                Auto
                              </button>
                              {qualityLevels.map((lvl) => (
                                <button
                                  key={lvl.id}
                                  type="button"
                                  onClick={() => handleQualityChange(lvl.id)}
                                  className={`w-full text-left p-1 border border-black font-bold ${
                                    currentQuality === lvl.id
                                      ? 'bg-course-orange text-white'
                                      : 'bg-white hover:bg-course-orangeSubtle'
                                  }`}
                                >
                                  {lvl.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Next Lesson Trigger */}
                  <button
                    type="button"
                    onClick={handleNextLesson}
                    aria-label="Next lesson"
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:text-course-orange"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>

                  {/* Fullscreen Button */}
                  <button
                    type="button"
                    onClick={toggleCustomFullscreen}
                    aria-label={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:text-course-orange"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5" />
                    ) : (
                      <Maximize className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lesson Metadata & Description */}
          <div className="mt-6 border border-black p-6 bg-course-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-course-orange uppercase tracking-wider">
                  Industrial Lesson Stream
                </span>
                <h1 className="text-xl md:text-2xl font-black text-course-darkBlue tracking-tight mt-1">
                  {currentLessonTitle}
                </h1>
              </div>

              <Button variant="outline" size="sm" onClick={handleNextLesson}>
                <span>Next Lesson</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            <p className="text-xs md:text-sm text-course-navyMuted leading-relaxed">
              Keyboard shortcuts: Space / K (Play/Pause), Left/Right (Seek 5s), M (Mute), F
              (Fullscreen).
            </p>
          </div>
        </div>

        {/* Right: Curriculum Sidebar */}
        <aside
          className={`w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-black bg-course-white flex flex-col ${
            isSidebarOpen ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="border-b border-black p-4 bg-course-bg">
            <h2 className="font-extrabold text-sm uppercase tracking-wider text-course-darkBlue">
              Course Curriculum
            </h2>
            <div className="text-[11px] font-mono text-course-navyMuted mt-0.5">
              Click any lesson to switch stream
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-black">
            {sections.map((section) => (
              <div key={section.sectionId} className="bg-course-white">
                <div className="p-3 bg-course-orangeSubtle border-b border-black text-xs font-black uppercase tracking-wider text-course-darkBlue">
                  {section.title}
                </div>
                <div className="divide-y divide-black/10">
                  {section.lessons.map((lesson) => {
                    const isCurrent = lesson.lessonId === selectedLessonId;
                    return (
                      <button
                        key={lesson.lessonId}
                        type="button"
                        onClick={() => setSelectedLessonId(lesson.lessonId)}
                        className={`w-full p-3 text-left flex items-start gap-3 transition-colors ${
                          isCurrent
                            ? 'bg-course-darkBlue text-course-white'
                            : 'hover:bg-course-orangeSubtle text-course-darkBlue'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {lesson.isCompleted ? (
                            <CheckCircle2
                              className={`w-4 h-4 ${
                                isCurrent ? 'text-course-orange' : 'text-emerald-700'
                              }`}
                            />
                          ) : (
                            <Circle className="w-4 h-4 text-black/30" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold leading-snug">{lesson.title}</div>
                          <div
                            className={`text-[10px] font-mono mt-1 ${
                              isCurrent ? 'text-white/70' : 'text-course-navySubtle'
                            }`}
                          >
                            {Math.floor(lesson.durationSeconds / 60)} mins
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
