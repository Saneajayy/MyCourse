'use client';

import React, { useEffect, useRef, useState, useCallback, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type Hls from 'hls.js';
import { useAuth } from '../../../context/auth-context';
import { apiClient, ApiError } from '../../../lib/api-client';
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
  Folder,
  FolderOpen,
  X,
  ArrowLeft,
  ArrowRight,
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
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  // Fullscreen Handler: Native fullscreen on mobile (landscape video) & desktop (container), with in-page fallback
  const toggleCustomFullscreen = useCallback(async () => {
    const video = videoRef.current;
    const container = containerRef.current;

    // 1. Check if browser is in native fullscreen mode
    const doc = typeof document !== 'undefined' ? (document as any) : null;
    const isDocFullscreen = Boolean(
      doc && (
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      )
    );

    // If currently in native fullscreen, exit it
    if (isDocFullscreen && doc) {
      try {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      } catch (err) {
        console.warn('Error exiting native fullscreen:', err);
      }
      setIsFullscreen(false);
      return;
    }

    // If currently in in-page fallback fullscreen, exit it
    if (isFullscreen) {
      setIsFullscreen(false);
      return;
    }

    // 2. Detect mobile device
    const isTouchOrMobile =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 768);

    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    // 3. On iOS: Use WebKit native video player (triggers landscape hardware playback)
    if (isIOS && video && typeof (video as any).webkitEnterFullscreen === 'function') {
      try {
        (video as any).webkitEnterFullscreen();
        return;
      } catch (err) {
        console.warn('iOS webkitEnterFullscreen failed, falling back:', err);
      }
    }

    // 4. On Android / Mobile: Prefer video element fullscreen to trigger auto-rotation to landscape
    if (isTouchOrMobile && video) {
      try {
        if (video.requestFullscreen) {
          await video.requestFullscreen();
          setIsFullscreen(true);
        } else if ((video as any).webkitRequestFullscreen) {
          await (video as any).webkitRequestFullscreen();
          setIsFullscreen(true);
        } else if (typeof (video as any).webkitEnterFullscreen === 'function') {
          (video as any).webkitEnterFullscreen();
          return;
        }

        // Try locking orientation to landscape
        if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
          try {
            await (screen.orientation as any).lock('landscape');
          } catch {
            // Screen orientation lock is optional
          }
        }
        return;
      } catch (err) {
        console.warn('Mobile video requestFullscreen failed, attempting container:', err);
      }
    }

    // 5. Desktop: Use Fullscreen API on containerRef to keep custom controls visible
    const target = container ?? video;
    if (target) {
      try {
        if (target.requestFullscreen) {
          await target.requestFullscreen();
          setIsFullscreen(true);
          return;
        } else if ((target as any).webkitRequestFullscreen) {
          await (target as any).webkitRequestFullscreen();
          setIsFullscreen(true);
          return;
        } else if ((target as any).mozRequestFullScreen) {
          await (target as any).mozRequestFullScreen();
          setIsFullscreen(true);
          return;
        } else if ((target as any).msRequestFullscreen) {
          await (target as any).msRequestFullscreen();
          setIsFullscreen(true);
          return;
        }
      } catch (err) {
        console.warn('Container requestFullscreen failed, falling back to in-page mode:', err);
      }
    }

    // 6. Fallback: In-page fullscreen with close button
    setIsFullscreen((prev) => !prev);
  }, [isFullscreen]);

  // Synchronize fullscreen state with browser / native player events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = typeof document !== 'undefined' ? (document as any) : null;
      const isDocFullscreen = Boolean(
        doc && (
          doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement
        )
      );
      setIsFullscreen(isDocFullscreen);
    };

    const video = videoRef.current;
    const handleWebkitBegin = () => setIsFullscreen(true);
    const handleWebkitEnd = () => setIsFullscreen(false);

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    if (video) {
      video.addEventListener('webkitbeginfullscreen', handleWebkitBegin);
      video.addEventListener('webkitendfullscreen', handleWebkitEnd);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);

      if (video) {
        video.removeEventListener('webkitbeginfullscreen', handleWebkitBegin);
        video.removeEventListener('webkitendfullscreen', handleWebkitEnd);
      }
    };
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

  // Navigate to Previous Lesson
  const handlePrevLesson = () => {
    const allLessonsList = sections.flatMap((s) => s.lessons);
    const currIdx = allLessonsList.findIndex((l) => l.lessonId === selectedLessonId);
    if (currIdx > 0) {
      const prev = allLessonsList[currIdx - 1];
      if (prev) {
        setSelectedLessonId(prev.lessonId);
      }
    }
  };

  // Navigate to Next Lesson
  const handleNextLesson = () => {
    const allLessonsList = sections.flatMap((s) => s.lessons);
    const currIdx = allLessonsList.findIndex((l) => l.lessonId === selectedLessonId);
    if (currIdx >= 0 && currIdx < allLessonsList.length - 1) {
      const next = allLessonsList[currIdx + 1];
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

  const allFlattenedLessons = sections.flatMap((s) => s.lessons);
  const currentLessonIndex = allFlattenedLessons.findIndex((l) => l.lessonId === selectedLessonId);
  const currentLesson = allFlattenedLessons[currentLessonIndex];
  const hasPrevLesson = currentLessonIndex > 0;
  const hasNextLesson = currentLessonIndex >= 0 && currentLessonIndex < allFlattenedLessons.length - 1;

  const currentSection = sections.find((s) =>
    s.lessons.some((l) => l.lessonId === selectedLessonId)
  );
  const currentSectionIdx = sections.findIndex((s) =>
    s.lessons.some((l) => l.lessonId === selectedLessonId)
  );

  const currentLessonTitle =
    currentLesson?.title ||
    playbackData?.title ||
    'Video Lesson';

  const isCurrentCompleted = currentLesson?.isCompleted || false;

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-black overflow-hidden font-reddit select-none text-white w-full max-w-full">
      {/* Main Split Layout: On mobile: video player is fixed at the top, syllabus scrolls below. On desktop: 2-panel with Syllabus on left and Video on right. */}
      <div className="flex-1 flex flex-col md:flex-row-reverse overflow-hidden min-h-0 bg-[#121417] w-full max-w-full">
        {/* MAIN VIDEO & PLAYER AREA: On mobile: shrink-0 (FIXED at top, does not scroll). On desktop: flex-1 md:h-full md:overflow-y-auto */}
        <main className="w-full shrink-0 md:shrink md:flex-1 flex flex-col md:h-full md:overflow-y-auto bg-[#121417] min-w-0 max-w-full border-b md:border-b-0 border-white/20">
          {/* Top Breadcrumb/Header Strip above video player */}
          <div className="flex px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 bg-[#16191d] border-b border-white/10 items-center justify-between gap-4 shrink-0">
            <div className="min-w-0 flex items-center gap-2.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 shrink-0">
                {currentSection ? `Module ${currentSectionIdx + 1}` : 'Curriculum'}
              </span>
              <span className="text-white/30 text-xs">/</span>
              <h1 className="text-sm lg:text-[15px] font-bold text-white truncate">
                {currentLessonTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isCurrentCompleted && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 text-white border border-white/20 text-[11px] font-mono font-medium rounded-md">
                  <Check className="w-3 h-3 stroke-[3]" />
                  Completed
                </span>
              )}
            </div>
          </div>

          <div className="w-full flex flex-col items-center justify-start p-3 pb-3 sm:p-4 sm:pb-4 md:p-5 lg:px-8 lg:py-5">
            <div className="w-full max-w-5xl md:max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px] mx-auto flex flex-col">
              {/* Video Player Frame with rounded edges */}
              <div
                ref={containerRef}
                className={`relative bg-black select-none max-w-full transition-all ${
                  isFullscreen
                    ? 'fixed inset-0 z-[9999] w-full h-[100dvh] flex flex-col justify-center items-center bg-black rounded-none border-none overflow-hidden'
                    : 'w-full aspect-video max-h-[46vh] sm:max-h-[56vh] md:max-h-[76vh] lg:max-h-[80vh] xl:max-h-[82vh] mx-auto rounded-xl sm:rounded-2xl border border-white/15 overflow-hidden'
                }`}
              >
                {/* Floating Exit Fullscreen Button (always accessible when fullscreen is active) */}
                {isFullscreen && (
                  <button
                    type="button"
                    onClick={toggleCustomFullscreen}
                    aria-label="Exit fullscreen"
                    className="absolute top-4 right-4 z-50 p-2.5 bg-black/80 hover:bg-black text-white rounded-full border border-white/30 backdrop-blur-md shadow-2xl flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 group"
                  >
                    <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform" />
                  </button>
                )}
                  {/* Loading Overlay */}
                  {streamLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-20 space-y-2">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
                      <span className="text-xs font-mono tracking-widest uppercase text-white/80">
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

                  {/* Session Eviction Overlay */}
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
                    className="w-full h-full object-contain max-w-full"
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

                  {/* Big Center Play Button Overlay with rounded aesthetic */}
                  {!isPlaying && !streamLoading && !streamError && !isEvicted && (
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label="Play video"
                      className="absolute inset-0 m-auto w-14 h-14 sm:w-18 sm:h-18 bg-black/60 hover:bg-black/80 text-white rounded-full border border-white/40 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 z-10 shadow-2xl group"
                    >
                      <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-white group-hover:scale-110 transition-transform ml-0.5" />
                    </button>
                  )}

                  {/* Custom Video Control Bar (Floating seamlessly over video without top dividing border line) */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-3 py-2 sm:px-4 sm:py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-1.5 sm:gap-2 text-white max-w-full">
                    {/* Scrubbing timeline slider with timestamps at ends */}
                    <div className="flex items-center gap-2 sm:gap-3 w-full">
                      <span className="text-[11px] sm:text-xs font-mono text-white/90 shrink-0">
                        {formatTime(currentTime)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        aria-label="Video seek slider"
                        className="flex-1 h-1 bg-white/25 accent-white cursor-pointer"
                      />
                      <span className="text-[11px] sm:text-xs font-mono text-white/70 shrink-0">
                        {formatTime(duration)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 w-full">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          type="button"
                          onClick={togglePlay}
                          aria-label={isPlaying ? 'Pause video (Space)' : 'Play video (Space)'}
                          className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center text-white hover:text-white/80 transition-colors cursor-pointer shrink-0"
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={toggleMute}
                          aria-label={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                          className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center text-white hover:text-white/80 transition-colors cursor-pointer shrink-0"
                        >
                          {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>

                        {/* Volume Slider hidden on mobile */}
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          aria-label="Volume slider"
                          className="w-16 md:w-20 h-1 bg-white/20 accent-white hidden sm:block"
                        />
                      </div>

                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {/* Settings Menu (Speed & Quality) */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                            aria-label="Player settings"
                            className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center text-white hover:text-white/80 transition-colors cursor-pointer shrink-0"
                          >
                            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>

                          {showSettingsMenu && (
                            <div className="absolute right-0 bottom-12 sm:bottom-14 w-52 bg-black/80 backdrop-blur-2xl border border-white/20 p-3.5 space-y-3 z-30 shadow-2xl rounded-xl sm:rounded-2xl text-xs text-white select-none">
                              {/* Playback speed */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-white/60">
                                    Playback Speed
                                  </span>
                                  <span className="text-[10px] font-mono font-bold text-white/80">
                                    {playbackRate}x
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {[0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => handleSpeedChange(s)}
                                      className={`py-1.5 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                                        playbackRate === s
                                          ? 'bg-white text-black border border-white shadow-sm'
                                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/25 active:scale-95'
                                      }`}
                                    >
                                      {s}x
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Quality selector */}
                              {qualityLevels.length > 0 && (
                                <div className="border-t border-white/15 pt-2.5">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-white/60">
                                      Quality
                                    </span>
                                    <span className="text-[10px] font-mono text-white/80">
                                      {currentQuality === -1
                                        ? 'Auto'
                                        : qualityLevels.find((q) => q.id === currentQuality)?.label || 'Auto'}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <button
                                      type="button"
                                      onClick={() => handleQualityChange(-1)}
                                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                                        currentQuality === -1
                                          ? 'bg-white text-black border border-white shadow-sm'
                                          : 'bg-white/5 hover:bg-white/15 text-white/90 hover:text-white border border-white/10 hover:border-white/20 active:scale-95'
                                      }`}
                                    >
                                      <span>Auto</span>
                                      {currentQuality === -1 && <Check className="w-3 h-3 stroke-[3]" />}
                                    </button>
                                    {qualityLevels.map((lvl) => (
                                      <button
                                        key={lvl.id}
                                        type="button"
                                        onClick={() => handleQualityChange(lvl.id)}
                                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                                          currentQuality === lvl.id
                                            ? 'bg-white text-black border border-white shadow-sm'
                                            : 'bg-white/5 hover:bg-white/15 text-white/90 hover:text-white border border-white/10 hover:border-white/20 active:scale-95'
                                        }`}
                                      >
                                        <span>{lvl.label}</span>
                                        {currentQuality === lvl.id && <Check className="w-3 h-3 stroke-[3]" />}
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
                          className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center text-white hover:text-white/80 transition-colors cursor-pointer shrink-0"
                        >
                          <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        {/* Fullscreen Button */}
                        <button
                          type="button"
                          onClick={toggleCustomFullscreen}
                          aria-label={isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'}
                          className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center text-white hover:text-white/80 transition-colors cursor-pointer shrink-0"
                        >
                          {isFullscreen ? (
                            <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
                          ) : (
                            <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Independently Floating Previous & Next Video Buttons (not in any box) */}
              <div className="w-full flex items-center justify-between gap-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={handlePrevLesson}
                  disabled={!hasPrevLesson}
                  className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-3.5 sm:px-5 text-xs sm:text-sm font-semibold tracking-wide rounded-lg sm:rounded-xl border transition-all ${
                    hasPrevLesson
                      ? 'border-white/25 bg-white/10 hover:bg-white/15 text-white cursor-pointer active:scale-95'
                      : 'border-white/10 bg-white/[0.03] text-white/30 cursor-not-allowed'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="sm:hidden">Previous</span>
                  <span className="hidden sm:inline">Previous Video</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextLesson}
                  disabled={!hasNextLesson}
                  className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-4 sm:px-5 text-xs sm:text-sm font-bold tracking-wide rounded-lg sm:rounded-xl border transition-all ${
                    hasNextLesson
                      ? 'bg-white hover:bg-neutral-200 text-black border-white cursor-pointer active:scale-95'
                      : 'border-white/10 bg-white/[0.03] text-white/30 cursor-not-allowed'
                  }`}
                >
                  <span className="sm:hidden">Next</span>
                  <span className="hidden sm:inline">Next Video</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* SYLLABUS & MODULES: Second in DOM -> Below video on mobile. On desktop: Left panel via md:flex-row-reverse */}
        <aside
          className="w-full flex-1 overflow-y-auto md:w-72 lg:w-80 md:h-full md:flex-none border-t-0 md:border-r border-white/50 bg-black text-white flex flex-col relative select-none shadow-none max-w-full"
        >
          {/* Background Image Embedded on Column Back (Shifted to right, subtle opacity) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
            <Image
              src="/login-pixelated.png"
              alt="Hydraulic System Graphic"
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              priority
              style={{ objectPosition: '85% center' }}
              className="object-cover mix-blend-screen opacity-[0.07] select-none"
            />
          </div>

          {/* Syllabus Header with Back to Courses Button */}
          <div className="relative z-10 w-full px-5 sm:px-6 py-4 sm:py-5 border-b border-white/50 text-left shrink-0">
            <Link
              href="/my-courses"
              className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-widest text-white/70 hover:text-white uppercase mb-2 group transition-colors cursor-pointer"
              aria-label="Back to My Courses"
            >
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Courses</span>
            </Link>
            <h2 className="font-extrabold text-[16px] sm:text-[18px] text-white leading-tight">
              Hydraulic System Basics
            </h2>
          </div>

          {/* Scrollable Modules List (Independent Scroll on desktop) */}
          <div className="relative z-10 flex-1 md:overflow-y-auto flex flex-col">
            {sections.map((section, sIdx) => {
              const isExpanded = expandedSections[section.sectionId] ?? true;
              const completedCount = section.lessons.filter((l) => l.isCompleted).length;
              const isModuleCompleted =
                section.lessons.length > 0 && completedCount === section.lessons.length;

              return (
                <div key={section.sectionId} className="w-full border-b border-white/50">
                  {/* MODULE HEADER: Generous py-5 padding so upper line never touches text/folder icon */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.sectionId)}
                    className="w-full text-left px-5 sm:px-6 py-5 sm:py-6 text-[15px] sm:text-[16px] font-bold transition-colors cursor-pointer select-none bg-transparent hover:bg-white/10 text-white flex items-start justify-between gap-3"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Folder icon rooting the connecting line */}
                      <div className="relative shrink-0 w-4 self-stretch flex flex-col items-center">
                        <div className="pt-0.5 z-10">
                          {isExpanded ? (
                            <FolderOpen className="w-4 h-4 text-white" />
                          ) : (
                            <Folder className="w-4 h-4 text-white" />
                          )}
                        </div>
                        {isExpanded && (
                          <div className="w-px flex-1 bg-white/40 mt-1.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block font-bold text-[15px] sm:text-[16px] leading-tight">
                          Module {sIdx + 1}
                        </span>
                        {section.title && (
                          <span className="block text-xs sm:text-[13px] text-white/75 font-normal mt-1.5 leading-snug whitespace-normal break-words">
                            {section.title.replace(/^Module\s*\d+\s*:\s*/i, '')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 text-white/80 pt-0.5">
                      {/* Tick on module after all the videos of that module get completed */}
                      {isModuleCompleted ? (
                        <div
                          className="w-5 h-5 rounded-none bg-white flex items-center justify-center shrink-0"
                          title="Module Completed"
                        >
                          <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-medium text-white/70">
                          {completedCount}/{section.lessons.length}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* CONNECTED LESSONS: Generous vertical padding, clear branch bend, readable text */}
                  {isExpanded && (
                    <div className="w-full pb-5 pt-1.5">
                      {section.lessons.map((lesson, lIdx) => {
                        const isLast = lIdx === section.lessons.length - 1;
                        const isCurrent = lesson.lessonId === selectedLessonId;

                        return (
                          <button
                            key={lesson.lessonId}
                            type="button"
                            onClick={() => setSelectedLessonId(lesson.lessonId)}
                            className={`w-full text-left px-5 sm:px-6 py-3 sm:py-3.5 flex items-start gap-3 transition-colors cursor-pointer select-none group ${
                              isCurrent ? 'bg-white/[0.08]' : 'bg-transparent hover:bg-white/[0.04]'
                            }`}
                          >
                            {/* Branch line rooting from module and bending towards lesson title */}
                            <div className="relative shrink-0 w-5 sm:w-6 self-stretch">
                              {/* Curved L-bend line from top to right towards lesson title */}
                              <div
                                className={`absolute left-[7px] top-0 w-3.5 sm:w-4 h-4 border-l border-b ${
                                  isCurrent ? 'border-white' : 'border-white/40'
                                } rounded-bl-[5px]`}
                              />

                              {/* Continuing vertical stem for subsequent lessons */}
                              {!isLast && (
                                <div
                                  className={`absolute left-[7px] top-4 bottom-0 w-px ${
                                    isCurrent ? 'bg-white' : 'bg-white/40'
                                  }`}
                                />
                              )}
                            </div>

                            {/* Lesson Content: Tick in front when completed, title, and video time below */}
                            <div className="min-w-0 flex-1 pt-0.5 flex items-start gap-2.5">
                              {lesson.isCompleted && (
                                <div
                                  className="w-4 h-4 rounded-none bg-white flex items-center justify-center shrink-0 mt-0.5"
                                  title="Completed"
                                >
                                  <Check className="w-2.5 h-2.5 stroke-[3] text-black" />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div
                                  className={`text-[13px] sm:text-[14px] leading-snug whitespace-normal break-words ${
                                    isCurrent
                                      ? 'font-extrabold text-white'
                                      : 'font-medium text-white/90 group-hover:text-white'
                                  }`}
                                >
                                  {lesson.title}
                                </div>

                                {/* Video time placed directly below the title with clean spacing */}
                                <div
                                  className={`text-xs font-mono mt-1 ${
                                    isCurrent
                                      ? 'text-white/80 font-semibold'
                                      : 'text-white/50 group-hover:text-white/70'
                                  }`}
                                >
                                  {Math.floor(lesson.durationSeconds / 60)}m
                                  {lesson.durationSeconds % 60 > 0
                                    ? ` ${lesson.durationSeconds % 60}s`
                                    : ''}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty Space Column Continuing Down, allowing graphic to shine through */}
            <div className="flex-1 w-full" />
          </div>
        </aside>
      </div>
    </div>
  );
}
