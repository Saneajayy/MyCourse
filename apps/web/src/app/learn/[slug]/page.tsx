'use client';

import React, { useEffect, useRef, useState, useCallback, use } from 'react';
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
  ChevronLeft,
  Check,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Lock,
  Folder,
  FolderOpen,
  X,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

interface LessonProgressItem {
  lessonId: string;
  title: string;
  durationSeconds: number;
  thumbnailUrl?: string | null;
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
  thumbnailUrl?: string | null;
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

  // Dragger vertical offset state (allows moving video up/down on desktop)
  const [videoOffsetY, setVideoOffsetY] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const videoWrapperRef = useRef<HTMLDivElement>(null);
  const maxDragOffsetYRef = useRef<number>(100);

  // Sync desktop status & reset offset on mobile
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (!desktop) {
        setVideoOffsetY(0);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!isDesktop) return;
      e.preventDefault();
      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartYRef.current = e.clientY;
      dragStartOffsetRef.current = videoOffsetY;

      // Compute exact available vertical travel within visible canvas
      if (canvasRef.current && videoWrapperRef.current) {
        const canvasHeight = canvasRef.current.clientHeight;
        const videoHeight = videoWrapperRef.current.clientHeight;
        maxDragOffsetYRef.current = Math.max(0, canvasHeight - videoHeight - 16);
      } else {
        maxDragOffsetYRef.current = 80;
      }

      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const deltaY = moveEvent.clientY - dragStartYRef.current;
        const nextOffset = Math.max(
          0,
          Math.min(maxDragOffsetYRef.current, dragStartOffsetRef.current + deltaY),
        );
        setVideoOffsetY(nextOffset);
      };

      const onMouseUp = () => {
        isDraggingRef.current = false;
        setIsDragging(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [videoOffsetY, isDesktop],
  );

  const handleTouchDragStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isDesktop) return;
      const touch = e.touches[0];
      if (!touch) return;
      isDraggingRef.current = true;
      setIsDragging(true);
      dragStartYRef.current = touch.clientY;
      dragStartOffsetRef.current = videoOffsetY;

      if (canvasRef.current && videoWrapperRef.current) {
        const canvasHeight = canvasRef.current.clientHeight;
        const videoHeight = videoWrapperRef.current.clientHeight;
        maxDragOffsetYRef.current = Math.max(0, canvasHeight - videoHeight - 16);
      } else {
        maxDragOffsetYRef.current = 80;
      }

      const onTouchMove = (moveEvent: TouchEvent) => {
        const moveTouch = moveEvent.touches[0];
        if (!isDraggingRef.current || !moveTouch) return;
        const deltaY = moveTouch.clientY - dragStartYRef.current;
        const nextOffset = Math.max(
          0,
          Math.min(maxDragOffsetYRef.current, dragStartOffsetRef.current + deltaY),
        );
        setVideoOffsetY(nextOffset);
      };

      const onTouchEnd = () => {
        isDraggingRef.current = false;
        setIsDragging(false);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    },
    [videoOffsetY, isDesktop],
  );

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
  const [useEmbed, setUseEmbed] = useState(false); // Fallback to verified Bunny Embed iframe if CDN HLS has referrer/token restriction
  const [hasStartedWatching, setHasStartedWatching] = useState<boolean>(false);

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
  const [settingsView, setSettingsView] = useState<'main' | 'quality' | 'speed'>('main');
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Double-tap / double-click seeking state and refs
  const [seekFeedback, setSeekFeedback] = useState<{
    direction: 'forward' | 'backward';
    amount: number;
  } | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickSideRef = useRef<'left' | 'right' | null>(null);
  const seekFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (seekFeedbackTimeoutRef.current) clearTimeout(seekFeedbackTimeoutRef.current);
    };
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
      s.lessons.some((l) => l.lessonId === selectedLessonId),
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

  const handleStartWatching = useCallback(() => {
    setHasStartedWatching(true);
    if (selectedLessonId) {
      loadLessonStream(selectedLessonId);
    }
  }, [selectedLessonId, loadLessonStream]);

  const handleSelectLesson = useCallback(
    (newLessonId: string) => {
      if (newLessonId === selectedLessonId) return;

      // 1. Pause video immediately
      if (videoRef.current) {
        videoRef.current.pause();
      }

      // 2. Destroy active HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // 3. Reset player & viewing states so the new lesson displays its thumbnail & glassy play button
      setHasStartedWatching(false);
      setIsPlaying(false);
      setPlaybackData(null);
      setCurrentTime(0);
      setDuration(0);
      setStreamError(null);
      setIsEvicted(false);
      setAreControlsVisible(true);
      setShowSettingsMenu(false);

      // 4. Update selected lesson ID
      setSelectedLessonId(newLessonId);
    },
    [selectedLessonId],
  );

  // 4. Initialize Hls.js dynamically on video element
  useEffect(() => {
    if (useEmbed || !playbackData || !videoRef.current) return;

    const video = videoRef.current;
    const url = playbackData.playbackUrl;
    let hlsInstance: Hls | null = null;
    let isCancelled = false;

    async function initPlayer() {
      try {
        const { default: HlsClass } = await import('hls.js');
        if (isCancelled || !videoRef.current) return;

        const isHls = url.includes('.m3u8');

        if (HlsClass.isSupported() && isHls) {
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
                  console.warn(
                    'Direct HLS network error (403/CORS); falling back to verified Bunny Embed Player',
                  );
                  hls.destroy();
                  hlsRef.current = null;
                  if (playbackData?.embedUrl) {
                    setUseEmbed(true);
                  } else {
                    setStreamError('Network error loading stream. Please check connection.');
                  }
                  break;
                case HlsClass.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  hlsRef.current = null;
                  if (playbackData?.embedUrl) {
                    setUseEmbed(true);
                  } else {
                    setStreamError('Media playback error. Please retry.');
                  }
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
        } else {
          // Direct fallback for non-HLS or browsers natively supporting the source
          video.src = url;
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
  }, [playbackData, selectedLessonId, loadLessonStream, useEmbed]);

  // 5. Heartbeat loop (every 20s) - keeps session alive in Redis even when paused
  useEffect(() => {
    if (!playbackData || !selectedLessonId) return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      const curPos = video ? Math.floor(video.currentTime) : Math.floor(currentTime);
      const curDur = Math.floor(video?.duration || duration || playbackData.durationSeconds);
      const isCurrentlyPlaying = video ? !video.paused : isPlaying;

      try {
        await apiClient(`/lessons/${selectedLessonId}/heartbeat`, {
          method: 'POST',
          body: JSON.stringify({
            sessionId: playbackData.sessionId,
            positionSeconds: curPos,
            durationSeconds: curDur,
            watchedSeconds: curPos,
            isPlaying: isCurrentlyPlaying,
            state: isCurrentlyPlaying ? 'playing' : 'paused',
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
  }, [playbackData, selectedLessonId, currentTime, duration, isPlaying]);

  // 5b. Listen for Player.js postMessage events from Bunny Embed iframe
  useEffect(() => {
    if (!useEmbed || !playbackData) return;

    function handlePlayerMessage(event: MessageEvent) {
      if (typeof event.origin === 'string' && !event.origin.includes('mediadelivery.net')) return;
      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!payload) return;

        const eventType = payload.event || payload.method;
        if (eventType === 'timeupdate') {
          const val = payload.value || payload.data;
          if (val?.seconds !== undefined) setCurrentTime(val.seconds);
          if (val?.duration !== undefined) setDuration(val.duration);
        } else if (eventType === 'play') {
          setIsPlaying(true);
        } else if (eventType === 'pause') {
          setIsPlaying(false);
        } else if (eventType === 'ended') {
          setIsPlaying(false);
          if (selectedLessonId) {
            setSections((prev) =>
              prev.map((sec) => ({
                ...sec,
                lessons: sec.lessons.map((l) =>
                  l.lessonId === selectedLessonId ? { ...l, isCompleted: true } : l,
                ),
              })),
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
              }).catch(() => { });
            }
            fetchCurriculum();
          }
        }
      } catch {
        // Ignore non-JSON or unrelated messages
      }
    }

    window.addEventListener('message', handlePlayerMessage);
    return () => {
      window.removeEventListener('message', handlePlayerMessage);
    };
  }, [useEmbed, playbackData, selectedLessonId, duration, fetchCurriculum]);

  // 6. Player Control Handlers & Auto-hide Timer
  const resetControlsTimeout = useCallback(() => {
    setAreControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setAreControlsVisible(false);
        setShowSettingsMenu(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, resetControlsTimeout]);

  const togglePlay = useCallback(() => {
    if (!hasStartedWatching) {
      handleStartWatching();
      return;
    }
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch((err) => {
        console.warn('Video playback play() promise rejected:', err);
      });
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [hasStartedWatching, handleStartWatching]);

  const handleVideoClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      // 1. If settings menu is open, dismiss it immediately without delay
      if (showSettingsMenu) {
        setShowSettingsMenu(false);
        resetControlsTimeout();
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastClickTimeRef.current;
      const container = containerRef.current || (e.currentTarget as HTMLElement);
      const rect = container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const isRightHalf = clickX > rect.width / 2;
      const side: 'left' | 'right' = isRightHalf ? 'right' : 'left';

      // 2. Check for double-click / double-tap (within 350ms on the same side)
      if (timeDiff < 350 && lastClickSideRef.current === side) {
        // Clear pending single-click action
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = null;
        }
        lastClickTimeRef.current = now;

        // Perform 10-second seek
        const delta = side === 'right' ? 10 : -10;
        if (videoRef.current) {
          const video = videoRef.current;
          const current = video.currentTime;
          const dur = video.duration || 99999;
          const target = Math.max(0, Math.min(dur, current + delta));
          video.currentTime = target;
          setCurrentTime(target);
        }

        // Show animated feedback badge (accumulates if tapped repeatedly)
        setSeekFeedback((prev) => {
          const currentAmount =
            prev && prev.direction === (side === 'right' ? 'forward' : 'backward')
              ? prev.amount + 10
              : 10;
          return {
            direction: side === 'right' ? 'forward' : 'backward',
            amount: currentAmount,
          };
        });

        if (seekFeedbackTimeoutRef.current) {
          clearTimeout(seekFeedbackTimeoutRef.current);
        }
        seekFeedbackTimeoutRef.current = setTimeout(() => {
          setSeekFeedback(null);
          lastClickTimeRef.current = 0;
          lastClickSideRef.current = null;
        }, 700);

        resetControlsTimeout();
        return;
      }

      // 3. First tap: record timestamp & side, wait 260ms to see if a second tap follows
      lastClickTimeRef.current = now;
      lastClickSideRef.current = side;

      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }

      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        lastClickTimeRef.current = 0;
        lastClickSideRef.current = null;

        // Single Click Action:
        if (!areControlsVisible) {
          resetControlsTimeout();
          return;
        }

        if (isPlaying) {
          setAreControlsVisible(false);
          if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
          }
          return;
        }

        togglePlay();
      }, 260);
    },
    [showSettingsMenu, areControlsVisible, isPlaying, resetControlsTimeout, togglePlay],
  );

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
    resetControlsTimeout();
  };

  const handleQualityChange = (levelId: number) => {
    setCurrentQuality(levelId);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelId;
    }
    setShowSettingsMenu(false);
    resetControlsTimeout();
  };

  // Fullscreen Handler: Native fullscreen on mobile (landscape video) & desktop (container), with in-page fallback
  const toggleCustomFullscreen = useCallback(async () => {
    const video = videoRef.current;
    const container = containerRef.current;

    // 1. Check if browser is in native fullscreen mode
    const doc = typeof document !== 'undefined' ? (document as any) : null;
    const isDocFullscreen = Boolean(
      doc &&
      (doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement),
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
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768);

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
        doc &&
        (doc.fullscreenElement ||
          doc.webkitFullscreenElement ||
          doc.mozFullScreenElement ||
          doc.msFullscreenElement),
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

  // Prevent background document scroll, reset scroll offset, and eliminate mobile WebKit touch hit-test offset bug
  useEffect(() => {
    // 1. Force the window scroll to top immediately (instant, overriding any smooth scroll)
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyLeft = document.body.style.left;
    const originalBodyWidth = document.body.style.width;
    const originalBodyHeight = document.body.style.height;

    // Standard iOS Safari lock: fix body at (0, 0)
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = '0px';
    document.body.style.left = '0px';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.left = originalBodyLeft;
      document.body.style.width = originalBodyWidth;
      document.body.style.height = originalBodyHeight;
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

  const allFlattenedLessons = sections.flatMap((s) => s.lessons);
  const currentLessonIndex = allFlattenedLessons.findIndex((l) => l.lessonId === selectedLessonId);
  const currentLesson = allFlattenedLessons[currentLessonIndex];
  const hasPrevLesson = currentLessonIndex > 0;
  const hasNextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < allFlattenedLessons.length - 1;

  const currentLessonTitle = currentLesson?.title || playbackData?.title || 'Video Lesson';
  const activeThumbnailUrl = currentLesson?.thumbnailUrl || playbackData?.thumbnailUrl || null;

  const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0);
  const totalCompletedLessons = sections.reduce(
    (acc, s) => acc + s.lessons.filter((l) => l.isCompleted).length,
    0,
  );

  // Navigate to Previous Lesson
  const handlePrevLesson = useCallback(() => {
    if (currentLessonIndex > 0) {
      const prev = allFlattenedLessons[currentLessonIndex - 1];
      if (prev) {
        handleSelectLesson(prev.lessonId);
      }
    }
  }, [currentLessonIndex, allFlattenedLessons, handleSelectLesson]);

  // Navigate to Next Lesson
  const handleNextLesson = useCallback(() => {
    if (currentLessonIndex >= 0 && currentLessonIndex < allFlattenedLessons.length - 1) {
      const next = allFlattenedLessons[currentLessonIndex + 1];
      if (next) {
        handleSelectLesson(next.lessonId);
      }
    }
  }, [currentLessonIndex, allFlattenedLessons, handleSelectLesson]);

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

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] bg-black text-white p-2.5 sm:p-3 overflow-hidden font-reddit select-none z-10 flex flex-col md:flex-row gap-2.5 sm:gap-3">
      {/* ============================================================== */}
      {/* 1. LEFT CARD: SYLLABUS                                        */}
      {/* ============================================================== */}
      <aside className="w-full flex-1 min-h-0 md:flex-none md:w-72 lg:w-80 md:h-full md:shrink-0 bg-[#131316] rounded-xl flex flex-col overflow-hidden order-2 md:order-1">
        {/* Brand Logo: Top Left Corner HYDRO BASICS */}
        <div className="px-5 py-3.5 flex items-center justify-between shrink-0">
          <Link
            href="/my-courses"
            className="flex flex-col select-none group"
            title="Back to My Courses"
          >
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              HYDRO
            </span>
            <span className="font-extrabold text-[15px] sm:text-[16px] text-white leading-[1.05] tracking-wider uppercase group-hover:text-white/80 transition-colors">
              BASICS
            </span>
          </Link>
          <Link
            href="/my-courses"
            className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-white/50 hover:text-white transition-colors"
            title="Back to My Courses"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Courses</span>
          </Link>
        </div>

        {/* Thin Stroke Separation Line */}
        <div className="border-b border-white/10 w-full shrink-0" />

        {/* Small Name of Course (without separation line below it) */}
        <div className="px-5 pt-3.5 pb-2 flex items-center justify-between shrink-0">
          <span className="text-[12px] font-medium text-white/70 truncate">
            Hydraulic System Basics
          </span>
          <span className="text-[11px] font-mono text-white/40 shrink-0 ml-2">
            {totalCompletedLessons}/{totalLessons}
          </span>
        </div>

        {/* Scrollable Modules & Connected Lessons List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-1">
          {sections.map((section, sIdx) => {
            const isExpanded = expandedSections[section.sectionId] ?? true;
            const completedCount = section.lessons.filter((l) => l.isCompleted).length;
            const isModuleCompleted =
              section.lessons.length > 0 && completedCount === section.lessons.length;

            return (
              <div key={section.sectionId} className="w-full">
                {/* Module Header Button: directly module name, folder icon, chevron */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.sectionId)}
                  className="w-full text-left px-3 py-2 text-xs sm:text-[13px] font-semibold transition-colors cursor-pointer select-none hover:bg-white/5 text-white/90 hover:text-white flex items-center justify-between gap-2 rounded-md"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {isExpanded ? (
                      <FolderOpen className="w-4 h-4 text-white/90 shrink-0" />
                    ) : (
                      <Folder className="w-4 h-4 text-white/60 shrink-0" />
                    )}
                    <span className="leading-tight font-medium whitespace-normal break-words">
                      {section.title.replace(/^Module\s*\d+\s*[-:–]?\s*/i, '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-white/60">
                    {isModuleCompleted && (
                      <div
                        className="w-4 h-4 rounded-none bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0"
                        title="Module Completed"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-white/80' : 'text-white/40'
                        }`}
                    />
                  </div>
                </button>

                {/* Tree connecting lines bending to each lesson title */}
                {isExpanded && (
                  <div className="w-full pl-3.5 pr-1 py-1">
                    {(() => {
                      const activeLessonIdx = section.lessons.findIndex(
                        (l) => l.lessonId === selectedLessonId,
                      );

                      return section.lessons.map((lesson, lIdx) => {
                        const isLast = lIdx === section.lessons.length - 1;
                        const isCurrent = lesson.lessonId === selectedLessonId;
                        const isAboveActive = activeLessonIdx !== -1 && lIdx < activeLessonIdx;

                        return (
                          <div key={lesson.lessonId} className="relative flex items-center py-1">
                            {/* Tree branch line: Single continuous non-overlapping stem */}
                            <div className="absolute left-[7px] top-0 bottom-0 w-3.5 pointer-events-none">
                              {/* Top vertical entry + curved L-bend into lesson title */}
                              <div
                                className={`absolute left-0 ${lIdx === 0 ? '-top-2 h-[27px]' : 'top-0 h-[19px]'
                                  } w-3.5 border-b border-l rounded-bl-[6px] ${isCurrent
                                    ? 'border-l-white border-b-white'
                                    : isAboveActive
                                      ? 'border-l-white border-b-white/15'
                                      : 'border-l-white/15 border-b-white/15'
                                  } transition-colors`}
                              />

                              {/* Bottom continuing vertical stem */}
                              {!isLast && (
                                <div
                                  className={`absolute left-0 top-[19px] bottom-0 w-px ${isAboveActive ? 'bg-white' : 'bg-white/15'
                                    } transition-colors`}
                                />
                              )}
                            </div>

                            {/* Lesson Button: Faded grey tab when clicked */}
                            <button
                              type="button"
                              onClick={() => handleSelectLesson(lesson.lessonId)}
                              className={`ml-5 w-full text-left px-3 py-2 flex flex-col justify-center transition-all cursor-pointer select-none rounded-xl group ${isCurrent
                                ? 'bg-white/10 text-white shadow-xs'
                                : 'bg-transparent hover:bg-white/5 text-white/70 hover:text-white'
                                }`}
                            >
                              <div className="flex items-start justify-between gap-2 w-full">
                                <span
                                  className={`text-[12px] sm:text-[13px] leading-snug whitespace-normal break-words ${isCurrent
                                    ? 'font-semibold text-white'
                                    : 'font-normal text-white/80 group-hover:text-white'
                                    }`}
                                >
                                  {lesson.title}
                                </span>
                                {lesson.isCompleted && (
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5] mt-0.5" />
                                )}
                              </div>
                              {lesson.durationSeconds > 0 && (
                                <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/40 mt-1">
                                  <Play className="w-2.5 h-2.5 fill-none stroke-[2] text-white/40 shrink-0" />
                                  <span>{Math.round(lesson.durationSeconds / 60)} min</span>
                                </div>
                              )}
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* Separation line after each module */}
                {sIdx < sections.length - 1 && (
                  <div className="border-b border-white/10 mt-2.5 mb-1.5 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. RIGHT CARD: VIDEO PLAYER & BOTTOM CONTROLS                 */}
      {/* ============================================================== */}
      <main className="w-full h-auto shrink-0 md:flex-1 md:h-full md:min-w-0 bg-[#131316] rounded-xl flex flex-col overflow-hidden relative order-1 md:order-2">
        {/* Top Header Bar: Clean Lesson Title */}
        <div className="h-12 px-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-[#131316]">
          <h1 className="text-sm sm:text-[15px] font-bold text-white truncate">
            {currentLessonTitle}
          </h1>

          <div className="flex items-center gap-2 shrink-0">
            {playbackData?.embedUrl && (
              <button
                type="button"
                onClick={() => setUseEmbed((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/80 border border-white/15 text-[11px] font-mono font-medium rounded-md transition-colors cursor-pointer"
                title="Switch between Direct HLS Player and Bunny Embed Player"
              >
                <RefreshCw className="w-3 h-3 text-white/50" />
                <span>{useEmbed ? 'Embed' : 'Direct'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Video Canvas Area with Attached Dragger (Desktop) */}
        <div
          ref={canvasRef}
          className="w-full flex flex-col items-center justify-start p-3 sm:p-3.5 md:p-3 md:sm:p-4 overflow-hidden relative shrink-0 md:flex-1 md:min-h-0"
        >
          {/* Video Player Frame with Vertical Drag Offset & Attached Dragger Handle */}
          <div
            ref={videoWrapperRef}
            style={{ transform: isDesktop ? `translateY(${videoOffsetY}px)` : undefined }}
            className="w-full max-w-5xl md:max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px] md:transition-transform md:duration-75 md:ease-out flex flex-col items-center shrink-0"
          >
            {/* Dragger Tab attached directly to the top edge of the video frame (Desktop only) */}
            {!isFullscreen && (
              <div
                onMouseDown={handleDragStart}
                onTouchStart={handleTouchDragStart}
                onDoubleClick={() => setVideoOffsetY(0)}
                className={`z-20 hidden md:flex w-10 h-3.5 bg-black rounded-t-[6px] items-center justify-center select-none shadow-sm transition-colors ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                title="Drag up or down to adjust video position (Double-click to reset)"
              >
                <div className="grid grid-cols-3 gap-1 pointer-events-none">
                  <span className="block w-[3px] h-[3px] rounded-full bg-[#d9d9d9]" />
                  <span className="block w-[3px] h-[3px] rounded-full bg-[#d9d9d9]" />
                  <span className="block w-[3px] h-[3px] rounded-full bg-[#d9d9d9]" />
                  <span className="block w-[3px] h-[3px] rounded-full bg-[#d9d9d9]" />
                  <span className="block w-[3px] h-[3px] rounded-full bg-[#d9d9d9]" />
                  <span className="block w-[3px] h-[3px] rounded-full bg-[#d9d9d9]" />
                </div>
              </div>
            )}

            <div
              ref={containerRef}
              onMouseMove={resetControlsTimeout}
              className={`relative bg-black select-none max-w-full transition-all ${isFullscreen
                ? 'fixed inset-0 z-[9999] w-full h-[100dvh] flex flex-col justify-center items-center bg-black rounded-none border-none overflow-hidden'
                : 'w-full aspect-video max-h-[46vh] sm:max-h-[56vh] md:max-h-[74vh] lg:max-h-[78vh] mx-auto rounded-none shadow-2xl overflow-hidden'
                }`}
            >
              {!hasStartedWatching ? (
                <div
                  className="relative w-full h-full flex items-center justify-center bg-neutral-950 overflow-hidden cursor-pointer group"
                  onClick={handleStartWatching}
                >
                  {/* Lesson Thumbnail Background */}
                  {activeThumbnailUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeThumbnailUrl}
                        alt={currentLessonTitle}
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300 opacity-90 group-hover:opacity-100"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors duration-300" />
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black flex items-center justify-center">
                      <div className="noise-texture opacity-30" />
                    </div>
                  )}

                  {/* Centered Minimal Play Button (clean, borderless, low opacity dark circle with crisp outline play icon) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartWatching();
                    }}
                    aria-label="Start watching video"
                    className="relative z-10 w-13 h-13 sm:w-15 sm:h-15 md:w-16 md:h-16 bg-black/25 hover:bg-black/35 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200 active:scale-95 group/btn"
                  >
                    <Play className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] stroke-white fill-none text-transparent ml-1" />
                  </button>
                </div>
              ) : (
                <>
                  {/* Floating Exit Fullscreen Button (fades out when controls auto-hide) */}
                  {isFullscreen && (
                    <button
                      type="button"
                      onClick={toggleCustomFullscreen}
                      aria-label="Exit fullscreen"
                      className={`absolute top-4 right-4 z-50 p-2.5 bg-black/80 hover:bg-black text-white rounded-full border border-white/30 backdrop-blur-md shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 group ${areControlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                        }`}
                    >
                      <X className="w-5 h-5 text-white group-hover:rotate-90 transition-transform" />
                    </button>
                  )}
                  {/* Loading Overlay (Spinner only) */}
                  {streamLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs text-white z-20">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
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

                  {useEmbed && playbackData?.embedUrl ? (
                    /* Verified Bunny Stream Embed Player (High-performance adaptive iframe) */
                    <iframe
                      src={playbackData.embedUrl}
                      title={currentLessonTitle}
                      loading="lazy"
                      className="w-full h-full border-0 absolute inset-0 z-10"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                      allowFullScreen
                    />
                  ) : (
                    <>
                      {/* HTML5 Video Element */}
                      <video
                        ref={videoRef}
                        playsInline
                        poster={activeThumbnailUrl || undefined}
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
                                  l.lessonId === selectedLessonId ? { ...l, isCompleted: true } : l,
                                ),
                              })),
                            );
                            if (playbackData) {
                              apiClient(`/lessons/${selectedLessonId}/heartbeat`, {
                                method: 'POST',
                                body: JSON.stringify({
                                  sessionId: playbackData.sessionId,
                                  positionSeconds: Math.floor(
                                    duration || playbackData.durationSeconds,
                                  ),
                                  durationSeconds: Math.floor(
                                    duration || playbackData.durationSeconds,
                                  ),
                                  watchedSeconds: Math.floor(
                                    duration || playbackData.durationSeconds,
                                  ),
                                  isPlaying: false,
                                  state: 'completed',
                                }),
                              }).catch(() => { });
                            }
                            fetchCurriculum();
                          }
                        }}
                        onClick={handleVideoClick}
                        onDoubleClick={(e) => e.preventDefault()}
                      />

                      {/* Double-tap / Double-click 10-second Seek Feedback Overlay (Minimal white text) */}
                      {seekFeedback && (
                        <div
                          className={`absolute top-0 bottom-0 ${seekFeedback.direction === 'backward' ? 'left-6 sm:left-12' : 'right-6 sm:right-12'
                            } flex items-center justify-center pointer-events-none z-30`}
                        >
                          <div className="text-xs sm:text-sm font-mono font-bold text-white tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] select-none animate-in fade-in zoom-in-95 duration-150">
                            {seekFeedback.direction === 'backward'
                              ? `${seekFeedback.amount}s <<<`
                              : `>>> ${seekFeedback.amount}s`}
                          </div>
                        </div>
                      )}

                      {/* Big Center Play Button Overlay (clean, borderless, low opacity dark circle) */}
                      {!isPlaying && !streamLoading && !streamError && !isEvicted && (
                        <button
                          type="button"
                          onClick={togglePlay}
                          aria-label="Play video"
                          className="absolute inset-0 m-auto w-13 h-13 sm:w-15 sm:h-15 md:w-16 md:h-16 bg-black/25 hover:bg-black/35 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200 active:scale-95 z-10 group"
                        >
                          <Play className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2] stroke-white fill-none text-transparent ml-1" />
                        </button>
                      )}

                      {/* Settings Menu Backdrop: Clicking outside settings dismisses it without toggling play/pause */}
                      {showSettingsMenu && (
                        <div
                          className="absolute inset-0 z-20 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowSettingsMenu(false);
                            resetControlsTimeout();
                          }}
                        />
                      )}

                      {/* Custom Video Control Bar (Floating seamlessly over video, auto-hides after 3s during playback) */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={resetControlsTimeout}
                        onTouchStart={resetControlsTimeout}
                        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-3 py-2 sm:px-4 sm:py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-1.5 sm:gap-2 text-white max-w-full transition-opacity duration-300 z-20 ${areControlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                          }`}
                      >
                        {/* Scrubbing timeline slider with timestamps at ends */}
                        <div className="flex items-center gap-2 sm:gap-3 w-full">
                          <span className="text-[11px] sm:text-xs font-mono text-white/90 shrink-0 select-none">
                            {formatTime(currentTime)}
                          </span>
                          <div className="relative flex-1 flex items-center h-4 cursor-pointer group/slider py-1">
                            {/* Base grey track */}
                            <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden">
                              {/* Blue filled progress track */}
                              <div
                                className="h-full bg-[#337df6] rounded-full transition-[width] duration-75"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(0, duration > 0 ? (currentTime / duration) * 100 : 0),
                                  )}%`,
                                }}
                              />
                            </div>

                            {/* Scrubber Knob: White circle with blue center dot */}
                            <div
                              className="absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#337df6] border-[2.5px] border-white shadow-md pointer-events-none transition-transform group-hover/slider:scale-110"
                              style={{
                                left: `${Math.min(
                                  100,
                                  Math.max(0, duration > 0 ? (currentTime / duration) * 100 : 0),
                                )}%`,
                              }}
                            />

                            {/* Invisible native range input for touch & drag precision */}
                            <input
                              type="range"
                              min={0}
                              max={duration || 100}
                              step={0.1}
                              value={currentTime}
                              onChange={handleSeek}
                              aria-label="Video seek slider"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                          </div>
                          <span className="text-[11px] sm:text-xs font-mono text-white/70 shrink-0 select-none">
                            {formatTime(duration)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 w-full">
                          {/* Left: Play/Pause and Audio Controls */}
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <button
                              type="button"
                              onClick={togglePlay}
                              aria-label={isPlaying ? 'Pause video (Space)' : 'Play video (Space)'}
                              className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center text-white hover:text-white/80 transition-colors cursor-pointer shrink-0"
                            >
                              {isPlaying ? (
                                <Pause className="w-4 h-4 fill-white text-white" />
                              ) : (
                                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={toggleMute}
                              aria-label={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                              className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center text-white hover:text-white/80 transition-colors cursor-pointer shrink-0"
                            >
                              {isMuted ? (
                                <VolumeX className="w-4 h-4 text-white" />
                              ) : (
                                <Volume2 className="w-4 h-4 text-white" />
                              )}
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
                              className="w-14 sm:w-16 h-1 bg-white/20 accent-white hidden sm:block cursor-pointer"
                            />
                          </div>

                          {/* Right: Settings and Large Screen (Fullscreen) Controls */}
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            {/* Settings Menu Button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSettingsView('main');
                                  setShowSettingsMenu((prev) => !prev);
                                  resetControlsTimeout();
                                }}
                                aria-label="Player settings"
                                className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center text-white hover:text-white/80 transition-colors cursor-pointer shrink-0"
                              >
                                <Settings className="w-4 h-4 text-white" />
                              </button>

                              {showSettingsMenu && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 bottom-10 sm:bottom-11 w-52 sm:w-56 bg-[#18181b]/95 backdrop-blur-xl border border-white/10 p-2 sm:p-2.5 z-30 shadow-2xl rounded-2xl text-xs text-white select-none animate-in fade-in zoom-in-95 duration-150"
                                >
                                  {/* Main Menu: Quality & Speed */}
                                  {settingsView === 'main' && (
                                    <div className="space-y-1 py-0.5">
                                      {qualityLevels.length > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => setSettingsView('quality')}
                                          className="w-full px-3 py-2 rounded-xl text-[13px] hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group"
                                        >
                                          <span className="font-medium text-white/90">Quality</span>
                                          <div className="flex items-center gap-1.5 text-white/50 group-hover:text-white">
                                            <span className="text-xs">
                                              {currentQuality === -1
                                                ? 'Auto'
                                                : qualityLevels.find((q) => q.id === currentQuality)?.label || 'Auto'}
                                            </span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          </div>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => setSettingsView('speed')}
                                        className="w-full px-3 py-2 rounded-xl text-[13px] hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer group"
                                      >
                                        <span className="font-medium text-white/90">Speed</span>
                                        <div className="flex items-center gap-1.5 text-white/50 group-hover:text-white">
                                          <span className="text-xs">{playbackRate}x</span>
                                          <ChevronRight className="w-3.5 h-3.5" />
                                        </div>
                                      </button>
                                    </div>
                                  )}

                                  {/* Quality Submenu */}
                                  {settingsView === 'quality' && (
                                    <div className="py-0.5">
                                      <button
                                        type="button"
                                        onClick={() => setSettingsView('main')}
                                        className="w-full px-2 py-1.5 mb-2 flex items-center gap-2 text-xs font-semibold text-white/80 hover:text-white border-b border-white/10 cursor-pointer"
                                      >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        <span>Quality</span>
                                      </button>

                                      {/* Horizontal Grid matching the Speed tab */}
                                      <div className="grid grid-cols-3 gap-1.5 px-1">
                                        <button
                                          type="button"
                                          onClick={() => handleQualityChange(-1)}
                                          className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                                            currentQuality === -1
                                              ? 'bg-[#337df6] text-white shadow-sm font-bold'
                                              : 'bg-white/10 hover:bg-white/20 text-white/90 hover:text-white'
                                          }`}
                                        >
                                          Auto
                                        </button>
                                        {qualityLevels.map((lvl) => (
                                          <button
                                            key={lvl.id}
                                            type="button"
                                            onClick={() => handleQualityChange(lvl.id)}
                                            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                                              currentQuality === lvl.id
                                                ? 'bg-[#337df6] text-white shadow-sm font-bold'
                                                : 'bg-white/10 hover:bg-white/20 text-white/90 hover:text-white'
                                            }`}
                                          >
                                            {lvl.label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Speed Submenu */}
                                  {settingsView === 'speed' && (
                                    <div className="py-0.5">
                                      <button
                                        type="button"
                                        onClick={() => setSettingsView('main')}
                                        className="w-full px-2 py-1.5 mb-2 flex items-center gap-2 text-xs font-semibold text-white/80 hover:text-white border-b border-white/10 cursor-pointer"
                                      >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        <span>Speed</span>
                                      </button>

                                      {/* Presets Grid: 1x, 1.25x, 1.5x, 1.75x, 2x, 3x */}
                                      <div className="grid grid-cols-3 gap-1.5 px-1">
                                        {[1, 1.25, 1.5, 1.75, 2, 3].map((s) => (
                                          <button
                                            key={s}
                                            type="button"
                                            onClick={() => handleSpeedChange(s)}
                                            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                                              playbackRate === s
                                                ? 'bg-[#337df6] text-white shadow-sm font-bold'
                                                : 'bg-white/10 hover:bg-white/20 text-white/90 hover:text-white'
                                            }`}
                                          >
                                            {s}x
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Fullscreen Button */}
                            <button
                              type="button"
                              onClick={toggleCustomFullscreen}
                              aria-label={
                                isFullscreen ? 'Exit fullscreen (F)' : 'Enter fullscreen (F)'
                              }
                              className="w-7 h-7 sm:w-8 sm:h-8 inline-flex items-center justify-center text-white hover:text-white/80 transition-colors cursor-pointer shrink-0"
                            >
                              {isFullscreen ? (
                                <Minimize className="w-4 h-4 text-white" />
                              ) : (
                                <Maximize className="w-4 h-4 text-white" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar below video: Full-width matching top strip */}
        <div className="h-12 px-5 border-t border-white/10 flex items-center justify-between shrink-0 bg-[#131316]">
          <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
            {currentLesson?.durationSeconds ? (
              <span>{formatTime(currentLesson.durationSeconds)}</span>
            ) : null}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrevLesson}
              disabled={!hasPrevLesson}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Previous Lesson"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextLesson}
              disabled={!hasNextLesson}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
              title="Next Lesson"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
