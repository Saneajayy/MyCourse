'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Modal, Button } from './ui';
import { siteConfig } from '../config/site';
import { Play, Pause, Volume2, VolumeX, Maximize, AlertCircle, Loader2 } from 'lucide-react';

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

  // Initialize HLS
  useEffect(() => {
    if (!playbackUrl || !videoRef.current) return;

    const video = videoRef.current;

    if (Hls.isSupported() && playbackUrl.endsWith('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });

      hlsRef.current = hls;
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // Autoplay may be blocked by browser policy; user can click play
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setErrorMsg('Playback error encountered. Please try again.');
              break;
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = playbackUrl;
      video.play().catch(() => setIsPlaying(false));
      return () => {
        video.src = '';
      };
    }
    return undefined;
  }, [playbackUrl]);

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

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lessonTitle || 'Free Lesson Preview'}
      description="Experience the lesson delivery, schematic diagrams, and teaching methodology."
      size="xl"
    >
      <div className="space-y-4">
        {/* Video Player Container */}
        <div
          ref={containerRef}
          className="relative w-full aspect-video bg-black border border-black overflow-hidden flex items-center justify-center select-none"
        >
          {isLoading && (
            <div className="flex flex-col items-center gap-2 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-course-orange" />
              <span className="text-xs uppercase font-mono tracking-widest">
                Securing Preview Stream...
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-6 text-center text-white max-w-sm">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-bold">{errorMsg}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 bg-white text-black"
                onClick={onClose}
              >
                Close Preview
              </Button>
            </div>
          )}

          {!isLoading && !errorMsg && (
            <>
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
                onClick={togglePlay}
              />

              {/* Anti-Piracy Watermark Overlay */}
              <div
                className="absolute pointer-events-none transition-all duration-700 ease-in-out font-mono font-bold text-xs uppercase px-2 py-1 bg-black/60 text-white/70 border border-white/20 select-none"
                style={{ top: watermarkPos.top, left: watermarkPos.left }}
                aria-hidden="true"
              >
                FREE PREVIEW • {siteConfig.brandName}
              </div>

              {/* Player Bottom Control Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-black/85 p-3 flex items-center justify-between gap-3 text-white border-t border-black/40">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white hover:text-course-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
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
                    aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white hover:text-course-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>

                  <span className="text-xs font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={changeSpeed}
                    aria-label={`Current speed ${playbackRate}x. Click to change.`}
                    className="min-h-[44px] px-2 text-xs font-bold font-mono hover:text-course-orange"
                  >
                    {playbackRate}x
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label="Toggle Fullscreen"
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center hover:text-course-orange"
                  >
                    <Maximize className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Call to Action below preview */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-black bg-course-orangeSubtle">
          <div>
            <div className="text-sm font-extrabold text-course-darkBlue">
              Liked this preview? Get the complete industrial training
            </div>
            <div className="text-xs text-course-navySubtle mt-0.5">
              Includes all 60+ lessons, blueprint downloads, and direct Q&amp;A support.
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              window.location.href = '/checkout';
            }}
          >
            Enroll in Full Course
          </Button>
        </div>
      </div>
    </Modal>
  );
}
