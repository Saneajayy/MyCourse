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
  ChevronDown,
  ChevronRight,
  Check,
  AlertTriangle,
  RotateCcw,
  SkipForward,
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [curriculumLoading, setCurriculumLoading] = useState(true);
  const [curriculumError, setCurriculumError] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

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

      // Initialize all sections as expanded by default
      setExpandedSections((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const initial: Record<string, boolean> = {};
        data.forEach((s) => {
          initial[s.sectionId] = true;
        });
        return initial;
      });

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
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/login?redirect=/learn/${slug}&message=session-expired`);
        return;
      }
      if (err instanceof ApiError && err.status === 403) {
        setCurriculumError('You do not have an active enrollment for this course.');
      } else {
        setCurriculumError(err instanceof Error ? err.message : 'Failed to load course lessons');
      }
    } finally {
      setCurriculumLoading(false);
    }
  }, [slug, selectedLessonId, router]);

  // Ensure the section containing the active lesson is always expanded
  useEffect(() => {
    if (!selectedLessonId || sections.length === 0) return;
    const currentSection = sections.find((s) =>
      s.lessons.some((l) => l.lessonId === selectedLessonId)
    );
    if (currentSection && !expandedSections[currentSection.sectionId]) {
      setExpandedSections((prev) => ({
        ...prev,
        [currentSection.sectionId]: true,
      }));
    }
  }, [selectedLessonId, sections]);

  // Accordion toggle helpers
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

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
      <div className="bg-black min-h-screen text-white font-reddit relative selection:bg-white selection:text-black overflow-hidden flex flex-col justify-center items-center space-y-4">
        <div className="noise-texture" aria-hidden="true" />
        <Loader2 className="w-10 h-10 animate-spin text-white" />
        <p className="text-sm font-semibold tracking-wider uppercase text-white/80">
          Loading Classroom &amp; Video Streams...
        </p>
      </div>
    );
  }

  if (curriculumError) {
    return (
      <div className="bg-black min-h-screen text-white font-reddit relative selection:bg-white selection:text-black overflow-hidden flex flex-col justify-center items-center p-4">
        <div className="noise-texture" aria-hidden="true" />
        <div className="max-w-md w-full bg-white p-8 rounded-none border border-neutral-300 shadow-none text-neutral-900 space-y-4 text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 inline-flex items-center justify-center border border-rose-200 mx-auto rounded-none">
            <Lock className="w-6 h-6 text-rose-600" />
          </div>
          <h1 className="text-2xl font-black text-black">Access Restricted</h1>
          <p className="text-xs text-neutral-600 leading-relaxed">{curriculumError}</p>
          <div className="pt-2">
            <Link
              href="/#pricing"
              className="inline-flex items-center justify-center h-11 px-6 bg-black hover:bg-[#262626] text-white font-bold text-xs uppercase tracking-wider rounded-none transition-all"
            >
              Enroll to Unlock Access
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentLessonTitle =
    sections.flatMap((s) => s.lessons).find((l) => l.lessonId === selectedLessonId)?.title ||
    playbackData?.title ||
    'Video Lesson';

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-black overflow-hidden font-reddit select-none text-white">
      {/* Top Header Bar: Glassy navbar matching home page (figma-glass-nav) */}
      <header className="h-16 md:h-20 w-full figma-glass-nav px-6 sm:px-8 flex items-stretch justify-between shrink-0 z-30 select-none">
        {/* Left: HYDRO BASICS Logo */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link
            href="/"
            className="flex flex-col justify-center -space-y-0.5 leading-[0.92] text-white hover:opacity-90 transition-opacity shrink-0"
            aria-label="HYDRO BASICS Home"
          >
            <span className="font-extrabold text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              HYDRO
            </span>
            <span className="font-extrabold text-[20px] tracking-[0.02em] uppercase leading-[0.92]">
              BASICS
            </span>
          </Link>
        </div>

        {/* Right: Glassy Actions with Full-Height Vertical Dividers */}
        <div className="flex items-stretch">
          <Link
            href="/my-courses"
            className="figma-glass-divider border-r border-white/20 h-full flex items-center justify-center px-4 sm:px-6 text-white/90 hover:text-white hover:bg-white/10 transition-colors font-semibold text-xs sm:text-sm uppercase tracking-wider"
          >
            <span>← My Courses</span>
          </Link>
        </div>
      </header>

      {/* Main Split Layout: On mobile, flows vertically with video sticky on top -> details -> modules */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden min-h-0 bg-black">
        {/* SYLLABUS & MODULES: On mobile: order-2 (placed below video & details). On desktop: order-1 (left column) */}
        <aside
          className="order-2 md:order-1 w-full md:w-80 lg:w-[340px] xl:w-[380px] md:h-full border-t md:border-t-0 md:border-r border-white/20 bg-black flex flex-col shrink-0 md:overflow-hidden"
        >
          {/* Actual Course Name Header Cell (Aligned to left side, NO 'COURSE NAME' text, NO plus icon) */}
          <div className="border-b border-white/20 py-4 px-5 bg-black text-left shrink-0">
            <span className="text-[10px] font-mono tracking-widest text-white/70 uppercase block mb-1">
              Course Curriculum
            </span>
            <h2 className="font-bold text-sm sm:text-base text-white">
              Hydraulic System Basics
            </h2>
          </div>

          {/* Scrollable Modules List (Independent Scroll on desktop) */}
          <div className="flex-1 md:overflow-y-auto bg-black">
            {sections.map((section, sIdx) => {
              const isExpanded = expandedSections[section.sectionId] ?? true;
              const completedCount = section.lessons.filter((l) => l.isCompleted).length;
              const isModuleCompleted =
                section.lessons.length > 0 && completedCount === section.lessons.length;

              return (
                <div key={section.sectionId} className="bg-black">
                  {/* MODULE HEADER: border-b border-white/20 (thin line, normal capitalization, font-bold) */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.sectionId)}
                    className="w-full py-3.5 px-5 border-b border-white/20 text-white flex items-center justify-between hover:bg-white/10 transition-colors cursor-pointer select-none bg-black text-left"
                    aria-expanded={isExpanded}
                  >
                    <div className="min-w-0 pr-3">
                      <span className="block font-bold text-xs sm:text-sm">
                        Module {sIdx + 1}
                      </span>
                      {section.title && (
                        <span className="block text-xs text-white/80 font-normal mt-0.5 truncate">
                          {section.title.replace(/^Module\s*\d+\s*:\s*/i, '')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 text-white/80">
                      {isModuleCompleted ? (
                        <div
                          className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0"
                          title="Module Completed"
                        >
                          <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[10px] font-mono">
                          {completedCount}/{section.lessons.length}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-white" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </button>

                  {/* LESSONS: Each separated by a thin white horizontal divider line, video titles 1 step less bold than module */}
                  {isExpanded && (
                    <div className="bg-black">
                      {section.lessons.map((lesson, lIdx) => {
                        const isCurrent = lesson.lessonId === selectedLessonId;
                        return (
                          <button
                            key={lesson.lessonId}
                            type="button"
                            onClick={() => setSelectedLessonId(lesson.lessonId)}
                            className={`w-full py-3 px-5 border-b border-white/15 text-left flex items-center gap-3 transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-white text-black'
                                : 'text-white hover:bg-white/10'
                            }`}
                          >
                            <div className="shrink-0 flex items-center justify-center w-5">
                              {lesson.isCompleted ? (
                                <div
                                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                    isCurrent ? 'bg-black' : 'bg-white'
                                  }`}
                                  title="Completed"
                                >
                                  <Check
                                    className={`w-2.5 h-2.5 stroke-[3] ${
                                      isCurrent ? 'text-white' : 'text-black'
                                    }`}
                                  />
                                </div>
                              ) : isCurrent ? (
                                <span className="text-xs font-black text-black">▶</span>
                              ) : (
                                <span className="text-[10px] font-mono text-white/60">
                                  {String(lIdx + 1).padStart(2, '0')}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div
                                className={`text-xs sm:text-[13px] leading-snug truncate ${
                                  isCurrent ? 'font-semibold text-black' : 'font-medium text-white/90'
                                }`}
                              >
                                {lesson.title}
                              </div>
                            </div>

                            <div
                              className={`text-[10px] font-mono shrink-0 ${
                                isCurrent ? 'text-black/80 font-bold' : 'text-white/60'
                              }`}
                            >
                              {Math.floor(lesson.durationSeconds / 60)}m
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* MAIN VIDEO & DETAILS AREA: On mobile: order-1 (sits at the top). On desktop: order-2 (right column) */}
        <main className="order-1 md:order-2 flex-1 flex flex-col md:h-full md:overflow-y-auto bg-black min-w-0 shrink-0">
          <div className="w-full flex-1 flex flex-col">
            {/* Black Video Player Frame (Sticky on mobile) */}
            <div className="w-full bg-black shrink-0 relative flex items-center justify-center border-b border-white/20 sticky top-0 z-20">
              <div
                ref={containerRef}
                className={`relative bg-black w-full select-none ${
                  isFullscreen
                    ? 'fixed inset-0 z-50 w-screen h-screen flex flex-col justify-center bg-black'
                    : 'aspect-video max-h-[68vh] mx-auto'
                }`}
              >
                {/* Loading Overlay */}
                {streamLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10 space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-black" />
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
                      className="bg-white text-black rounded-none border border-black"
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
                    <div className="w-12 h-12 bg-amber-500/20 text-amber-400 inline-flex items-center justify-center border border-amber-500 rounded-none">
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
                      className="bg-black hover:bg-[#262626] text-white rounded-none"
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
                    if (selectedLessonId) {
                      setSections((prev) =>
                        prev.map((sec) => ({
                          ...sec,
                          lessons: sec.lessons.map((l) =>
                            l.lessonId === selectedLessonId ? { ...l, isCompleted: true } : l
                          ),
                        }))
                      );
                      if (playbackData) {
                        apiClient(`/lessons/${selectedLessonId}/heartbeat`, {
                          method: 'POST',
                          body: JSON.stringify({
                            sessionId: playbackData.sessionId,
                            positionSeconds: Math.floor(duration || playbackData.durationSeconds),
                            durationSeconds: Math.floor(duration || playbackData.durationSeconds),
                            watchedSeconds: Math.floor(duration || playbackData.durationSeconds),
                            isPlaying: false,
                            state: 'completed',
                          }),
                        }).catch(() => {});
                      }
                      fetchCurriculum();
                    }
                  }}
                  onClick={togglePlay}
                />

                {/* Moving Anti-Piracy Watermark: Greyed-out text, no box */}
                <div
                  className="absolute pointer-events-none transition-all duration-1000 ease-in-out font-mono text-xs uppercase text-white/30 select-none"
                  style={{ top: watermarkPos.top, left: watermarkPos.left }}
                  aria-hidden="true"
                >
                  {user?.email || siteConfig.brandName}
                </div>

                {/* Custom Video Control Bar */}
                <div className="absolute bottom-0 inset-x-0 bg-black/90 p-2 md:p-3 flex flex-col gap-2 text-white border-t border-white/10">
                  {/* Scrubbing timeline slider with Royal Blue accent */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    aria-label="Video seek slider"
                    className="w-full h-1.5 bg-white/20 accent-black cursor-pointer"
                  />

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 md:gap-3">
                      <button
                        type="button"
                        onClick={togglePlay}
                        aria-label={isPlaying ? 'Pause video (Space)' : 'Play video (Space)'}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white hover:text-black transition-colors cursor-pointer"
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
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white hover:text-black transition-colors cursor-pointer"
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>

                      {/* Volume Slider with Royal Blue accent */}
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        aria-label="Volume slider"
                        className="w-16 md:w-20 h-1 bg-white/20 accent-black hidden sm:block"
                      />

                      <span className="text-xs font-mono text-white/90">
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
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white hover:text-black transition-colors cursor-pointer"
                        >
                          <Settings className="w-5 h-5" />
                        </button>

                        {showSettingsMenu && (
                          <div className="absolute right-0 bottom-12 w-48 bg-white text-black border border-neutral-300 p-3 space-y-3 z-30 shadow-none rounded-none text-xs">
                            {/* Playback speed */}
                            <div>
                              <span className="font-bold uppercase tracking-wider block mb-1 text-black">
                                Speed
                              </span>
                              <div className="grid grid-cols-3 gap-1">
                                {[0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => handleSpeedChange(s)}
                                    className={`p-1 border border-neutral-300 font-mono font-bold rounded-none cursor-pointer ${
                                      playbackRate === s
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white hover:bg-neutral-100 text-black'
                                    }`}
                                  >
                                    {s}x
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Quality selector */}
                            {qualityLevels.length > 0 && (
                              <div className="border-t border-neutral-200 pt-2">
                                <span className="font-bold uppercase tracking-wider block mb-1 text-black">
                                  Quality
                                </span>
                                <div className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => handleQualityChange(-1)}
                                    className={`w-full text-left p-1 border border-neutral-300 font-bold rounded-none cursor-pointer ${
                                      currentQuality === -1
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white hover:bg-neutral-100 text-black'
                                    }`}
                                  >
                                    Auto
                                  </button>
                                  {qualityLevels.map((lvl) => (
                                    <button
                                      key={lvl.id}
                                      type="button"
                                      onClick={() => handleQualityChange(lvl.id)}
                                      className={`w-full text-left p-1 border border-neutral-300 font-bold rounded-none cursor-pointer ${
                                        currentQuality === lvl.id
                                          ? 'bg-black text-white border-black'
                                          : 'bg-white hover:bg-neutral-100 text-black'
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
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white hover:text-black transition-colors cursor-pointer"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>

                      {/* Fullscreen Button */}
                      <button
                        type="button"
                        onClick={toggleCustomFullscreen}
                        aria-label={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white hover:text-black transition-colors cursor-pointer"
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
            </div>

            {/* Lesson Title and Description on Royal Blue Background */}
            <div className="p-6 md:p-8 lg:p-10 space-y-4 bg-black text-white">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                    {currentLessonTitle}
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={handleNextLesson}
                  className="inline-flex items-center justify-center h-10 px-5 bg-white hover:bg-neutral-100 text-black font-black text-xs uppercase tracking-wider rounded-none transition-all gap-2 cursor-pointer shrink-0 border border-white"
                >
                  <span>Next Lesson</span>
                  <span className="text-xs">▶</span>
                </button>
              </div>

              <div className="space-y-2 text-white/90 text-xs sm:text-sm leading-relaxed max-w-3xl">
                <p>
                  Fundamental principles of fluid power, hydraulic circuit behavior, and practical workplace concepts. Watch the stream above, use playback controls as needed, and proceed to the next lesson once completed.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
