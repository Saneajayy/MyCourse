'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type Hls from 'hls.js';
import { siteConfig } from '../config/site';
import { Play, Pause, Volume2, VolumeX, Maximize, AlertCircle, Loader2, X } from 'lucide-react';

interface PreviewPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseSlug: string;
  lessonId: string;
  lessonTitle: string;
}

export function PreviewPlayerModal({
  isOpen,
  onClose,
  courseSlug,
  lessonId,
  lessonTitle,
}: PreviewPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Watermark position state
  const [watermarkPos, setWatermarkPos] = useState({ top: '15%', left: '20%' });

  // Handle Escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Move watermark every 8 seconds
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const top = `${Math.floor(Math.random() * 70) + 10}%`;
      const left = `${Math.floor(Math.random() * 60) + 10}%`;
      setWatermarkPos({ top, left });
    }, 8000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Fetch preview token & HLS URL
  useEffect(() => {
    if (!isOpen || !lessonId || !courseSlug) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);

    async function fetchPreview() {
      try {
        const res = await fetch(
          `${siteConfig.urls.api}/api/v1/courses/${courseSlug}/lessons/${lessonId}/preview-token`,
        );
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || 'Failed to load preview stream');
        }

        if (isMounted) {
          setPlaybackUrl(data.data.playbackUrl || data.data.embedUrl);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMsg(err instanceof Error ? err.message : 'Network error loading preview');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [isOpen, courseSlug, lessonId]);

  // Initialize HLS dynamically on demand
  useEffect(() => {
    if (!playbackUrl || !videoRef.current) return;

    const video = videoRef.current;
    let hlsInstance: Hls | null = null;
    let isCancelled = false;

    async function initHls() {
      try {
        const { default: HlsClass } = await import('hls.js');
        if (isCancelled || !videoRef.current) return;

        const isHls = playbackUrl?.includes('.m3u8');

        if (HlsClass.isSupported() && playbackUrl && isHls) {
          const hls = new HlsClass({
            enableWorker: true,
            lowLatencyMode: false,
          });

          hlsRef.current = hls;
          hlsInstance = hls;
          hls.loadSource(playbackUrl);
          hls.attachMedia(video);

          hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {
              // Autoplay may be blocked by browser policy; user can click play
              setIsPlaying(false);
            });
          });

          hls.on(HlsClass.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case HlsClass.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case HlsClass.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  hls.destroy();
                  setErrorMsg('Playback error encountered. Please try again.');
                  break;
              }
            }
          });
        } else if (playbackUrl && (video.canPlayType('application/vnd.apple.mpegurl') || !isHls)) {
          // Native Safari HLS or direct fallback
          video.src = playbackUrl;
          video.play().catch(() => setIsPlaying(false));
        }
      } catch (err) {
        console.error('Failed to load video streaming engine', err);
        setErrorMsg('Failed to initialize video player.');
      }
    }

    initHls();

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
  }, [playbackUrl]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch((err) => {
        console.warn('Preview video play() promise rejected:', err);
      });
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

  const changeSpeed = useCallback(() => {
    if (!videoRef.current) return;
    const speeds = [1, 1.25, 1.5, 1.75, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx] ?? 1;
    videoRef.current.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  }, [playbackRate]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = newProgress * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Backdrop Click Dismiss */}
      <div className="fixed inset-0" aria-hidden="true" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-4xl bg-gradient-to-b from-[#000000] via-[#171717] to-[#000000] border border-white/25 rounded-none p-5 sm:p-7 md:p-8 max-h-[92vh] overflow-y-auto font-reddit text-white shadow-[0_25px_80px_rgba(0,0,0,0.65)] select-none">
        {/* Modal Header: Big standalone FREE PREVIEW heading & standalone rotating cross mark */}
        <div className="flex items-start justify-between gap-4 mb-4 sm:mb-5">
          <div className="min-w-0">
            <h2
              id="preview-modal-title"
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white uppercase tracking-[-0.02em] leading-none select-none"
            >
              FREE PREVIEW
            </h2>
            <p className="text-white/85 font-medium text-base sm:text-lg mt-2 sm:mt-2.5 tracking-tight">
              {(() => {
                const cleaned = (lessonTitle || 'How hydraulic systems work')
                  .replace(/^Lesson\s*\d+(\.\d+)?\s*[:-]?\s*/i, '')
                  .trim();
                return `Lesson 1 - ${cleaned || 'How hydraulic systems work'}`;
              })()}
            </p>
          </div>

          {/* Standalone Cross Mark (rotates 90 degrees on hover) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-white hover:text-white/80 transition-transform duration-300 ease-out hover:rotate-90 p-1 shrink-0 cursor-pointer focus:outline-none"
          >
            <X className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
          </button>
        </div>

        {/* Video Player Container */}
        <div
          ref={containerRef}
          className="relative w-full aspect-video bg-black/95 rounded-none border border-white/20 overflow-hidden flex items-center justify-center select-none shadow-2xl group/player"
        >
          {isLoading && (
            <div className="flex flex-col items-center gap-2.5 text-white/80">
              <Loader2 className="w-8 h-8 animate-spin text-white/80" />
              <span className="text-xs uppercase font-reddit font-medium tracking-widest text-white/70">
                Securing Preview Stream...
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-6 text-center text-white max-w-md">
              <AlertCircle className="w-10 h-10 text-cyan-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white/90 mb-4">{errorMsg}</p>
              <button
                type="button"
                className="px-4 py-1.5 rounded-none bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-white/90 active:scale-95 transition-all shadow-sm cursor-pointer"
                onClick={onClose}
              >
                Close Preview
              </button>
            </div>
          )}

          {!isLoading && !errorMsg && (
            <>
              <video
                ref={videoRef}
                playsInline
                className="w-full h-full object-contain cursor-pointer"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                    setDuration(videoRef.current.duration || 0);
                  }
                }}
                onClick={togglePlay}
              />

              {/* Subtle Anti-Piracy Watermark: small greyed-out HSB text, not a bold button */}
              <div
                className="absolute pointer-events-none transition-all duration-700 ease-in-out font-mono font-medium text-[11px] sm:text-xs text-white/35 select-none tracking-widest uppercase"
                style={{ top: watermarkPos.top, left: watermarkPos.left }}
                aria-hidden="true"
              >
                HSB
              </div>

              {/* Custom Video Controls Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 sm:p-4 text-white">
                {/* Scrubber Progress Bar */}
                <div
                  className="w-full h-1.5 hover:h-2 bg-white/25 rounded-none cursor-pointer transition-all duration-150 mb-2.5 relative group/bar"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-white rounded-none transition-all duration-75 relative"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-none shadow opacity-0 group-hover/bar:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Control Buttons Row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    <button
                      type="button"
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Pause video' : 'Play video'}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-none bg-white text-black flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all shadow-md cursor-pointer"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current translate-x-0.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-none bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <span className="text-xs sm:text-[13px] font-mono font-medium text-white/90">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={changeSpeed}
                      aria-label={`Current speed ${playbackRate}x. Click to change.`}
                      className="px-2 py-1 rounded-none bg-white/15 hover:bg-white/25 active:scale-95 text-white font-mono text-xs font-bold border border-white/20 transition-all cursor-pointer"
                    >
                      {playbackRate}x
                    </button>

                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      aria-label="Toggle Fullscreen"
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-none bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Below video: Simple standalone ENROLL NOW button */}
        <div className="mt-5 sm:mt-6 flex justify-center w-full">
          <button
            type="button"
            onClick={() => {
              onClose();
              window.location.href = '/checkout';
            }}
            className="w-full sm:w-auto min-w-[240px] px-8 py-3.5 sm:px-10 sm:py-4 rounded-none bg-white text-black font-black text-lg sm:text-xl md:text-2xl uppercase tracking-wide shadow-md hover:bg-white/95 active:scale-95 transition-all cursor-pointer leading-none flex items-center justify-center gap-2.5"
          >
            <span>ENROLL NOW</span>
            <span className="text-xl sm:text-2xl leading-none">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
