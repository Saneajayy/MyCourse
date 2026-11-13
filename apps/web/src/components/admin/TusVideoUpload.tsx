'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as tus from 'tus-js-client';
import { apiClient } from '../../lib/api-client';
import { ProgressBar } from '../ui/ProgressBar';
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  PlayCircle,
  Pause,
  Play,
  RotateCw,
} from 'lucide-react';

interface UploadTicketResponse {
  uploadUrl: string;
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
}

export interface TusVideoUploadProps {
  lessonId: string;
  lessonTitle: string;
  initialVideoProviderId?: string | null;
  initialStatus?: 'PROCESSING' | 'READY' | 'FAILED' | null;
  initialDurationSeconds?: number;
  onUploadSuccess?: (videoId: string) => void;
}

export function TusVideoUpload({
  lessonId,
  lessonTitle,
  initialVideoProviderId,
  initialStatus,
  initialDurationSeconds = 0,
  onUploadSuccess,
}: TusVideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [bytesUploaded, setBytesUploaded] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentVideoId, setCurrentVideoId] = useState<string | null>(
    initialVideoProviderId || null,
  );
  const [status, setStatus] = useState<'IDLE' | 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED'>(
    initialVideoProviderId
      ? (initialStatus as 'PROCESSING' | 'READY' | 'FAILED') || 'PROCESSING'
      : 'IDLE',
  );
  const [durationSeconds, setDurationSeconds] = useState<number>(initialDurationSeconds);

  const tusUploadRef = useRef<tus.Upload | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Poll for transcoding status when status is PROCESSING
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let mounted = true;

    if (status === 'PROCESSING' && lessonId) {
      const checkStatus = async () => {
        try {
          const res = await apiClient<{
            status: 'PROCESSING' | 'READY' | 'FAILED';
            durationSeconds: number;
          }>(`/admin/lessons/${lessonId}/status`).catch(async () => {
            // Fallback: fetch section lessons
            return null;
          });

          if (res && mounted) {
            if (res.status === 'READY') {
              setStatus('READY');
              setDurationSeconds(res.durationSeconds || 0);
              onUploadSuccess?.(currentVideoId || initialVideoProviderId || '');
              return;
            } else if (res.status === 'FAILED') {
              setStatus('FAILED');
              setErrorMessage('Video encoding failed on Bunny Stream. Please upload again.');
              return;
            }
          }
        } catch {
          // ignore polling network errors
        }

        if (mounted && status === 'PROCESSING') {
          timer = setTimeout(checkStatus, 5000);
        }
      };

      timer = setTimeout(checkStatus, 4000);
    }

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [status, lessonId]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0 min';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic file type validation (browser sanity check)
    const allowedExtensions = ['.mp4', '.mov', '.webm', '.mkv', '.m4v'];
    const lowerName = file.name.toLowerCase();
    const isExtensionValid = allowedExtensions.some((ext) => lowerName.endsWith(ext));

    if (!file.type.startsWith('video/') && !isExtensionValid) {
      setErrorMessage('Please select a valid video file (MP4, MOV, WebM, or MKV).');
      return;
    }

    // 5GB size sanity limit
    const maxSizeBytes = 5 * 1024 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage('File size exceeds the 5 GB maximum limit.');
      return;
    }

    setSelectedFile(file);
    setTotalBytes(file.size);
  };

  const startUpload = async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    setIsUploading(true);
    setIsPaused(false);
    setProgressPercent(0);
    setStatus('UPLOADING');

    try {
      // 1. Fetch direct TUS upload authorization ticket from API
      // Express server creates placeholder in Bunny and signs authorization ticket.
      const ticket = await apiClient<UploadTicketResponse>(
        `/admin/lessons/${lessonId}/upload-ticket`,
        {
          method: 'POST',
        },
      );

      setCurrentVideoId(ticket.videoId);

      // 2. Initialize TUS client pointing directly to Bunny Stream
      // Zero video bytes route through our Express server
      const upload = new tus.Upload(selectedFile, {
        endpoint: ticket.uploadUrl,
        retryDelays: [0, 1000, 3000, 5000],
        headers: {
          AuthorizationSignature: ticket.authorizationSignature,
          AuthorizationExpire: String(ticket.authorizationExpire),
          VideoId: ticket.videoId,
          LibraryId: ticket.libraryId,
        },
        metadata: {
          filetype: selectedFile.type,
          title: lessonTitle,
        },
        onError: (error) => {
          setIsUploading(false);
          setIsPaused(false);
          setStatus('FAILED');
          setErrorMessage(
            error.message || 'Direct video upload to Bunny Stream failed. Please try again.',
          );
        },
        onProgress: (uploaded, total) => {
          setBytesUploaded(uploaded);
          setTotalBytes(total);
          const percent = Math.round((uploaded / total) * 100);
          setProgressPercent(percent);
        },
        onSuccess: () => {
          setIsUploading(false);
          setIsPaused(false);
          setProgressPercent(100);
          setStatus('PROCESSING');
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          if (onUploadSuccess) {
            onUploadSuccess(ticket.videoId);
          }
        },
      });

      tusUploadRef.current = upload;
      upload.start();
    } catch (err: unknown) {
      setIsUploading(false);
      setStatus('FAILED');
      const msg = err instanceof Error ? err.message : 'Failed to generate video upload ticket';
      setErrorMessage(msg);
    }
  };

  const handlePauseResume = () => {
    if (!tusUploadRef.current) return;

    if (isPaused) {
      tusUploadRef.current.start();
      setIsPaused(false);
    } else {
      tusUploadRef.current.abort();
      setIsPaused(true);
    }
  };

  const handleResetForReplace = () => {
    if (tusUploadRef.current) {
      tusUploadRef.current.abort();
      tusUploadRef.current = null;
    }
    setSelectedFile(null);
    setIsUploading(false);
    setIsPaused(false);
    setProgressPercent(0);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="border border-neutral-200/80 p-5 bg-white space-y-4 font-reddit">
      {/* Existing Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {status === 'READY' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold tracking-wide">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Video Ready ({formatDuration(durationSeconds)})
              {currentVideoId && (
                <span className="font-mono text-[10px] text-emerald-700 ml-1">
                  [{currentVideoId.slice(0, 8)}]
                </span>
              )}
            </span>
          )}
          {status === 'PROCESSING' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold tracking-wide">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              Processing / Transcoding
            </span>
          )}
          {status === 'UPLOADING' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold tracking-wide">
              <UploadCloud className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
              Streaming to Bunny ({progressPercent}%)
            </span>
          )}
          {status === 'FAILED' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold tracking-wide">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Upload Error
            </span>
          )}
          {status === 'IDLE' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-semibold tracking-wide">
              <PlayCircle className="w-3.5 h-3.5 text-neutral-500" />
              No Video Attached
            </span>
          )}
        </div>

        {/* Action Button: Replace or Select */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />

          {(status === 'READY' || status === 'PROCESSING') && !selectedFile && (
            <button
              type="button"
              onClick={handleResetForReplace}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-300 hover:border-neutral-900 hover:bg-neutral-50 text-neutral-800 text-xs font-semibold transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Replace Video
            </button>
          )}

          {status === 'IDLE' && !selectedFile && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 text-white hover:bg-black text-xs font-semibold transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Select Video
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 border border-rose-200 bg-rose-50 text-rose-950 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{errorMessage}</p>
            <p className="text-[11px] text-rose-700">
              Videos are uploaded directly to Bunny Stream CDN. Please ensure your internet
              connection is stable.
            </p>
          </div>
        </div>
      )}

      {/* Selected File Stage & Upload Controls */}
      {selectedFile && !isUploading && (
        <div className="p-3.5 border border-neutral-200/80 bg-neutral-50 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-neutral-900">
            <span className="truncate max-w-[280px] font-mono">{selectedFile.name}</span>
            <span className="font-mono text-neutral-500">{formatFileSize(selectedFile.size)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startUpload}
              className="px-4 py-2 bg-neutral-900 text-white hover:bg-black text-xs font-semibold transition-colors"
            >
              Start Direct Upload
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="px-3.5 py-2 border border-neutral-300 hover:border-neutral-900 text-neutral-700 hover:bg-white text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Live Upload Progress */}
      {isUploading && (
        <div className="p-3.5 border border-sky-200 bg-sky-50/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-950">
            <span>Direct Stream: {progressPercent}%</span>
            <span className="font-mono text-[11px] text-sky-800">
              {formatFileSize(bytesUploaded)} / {formatFileSize(totalBytes)}
            </span>
          </div>

          <ProgressBar value={progressPercent} max={100} className="h-2" />

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-sky-800 font-normal">
              Streaming directly to Bunny CDN. Please keep this browser window open.
            </p>
            <button
              type="button"
              onClick={handlePauseResume}
              className="inline-flex items-center gap-1.5 px-3 py-1 border border-neutral-300 hover:border-neutral-900 bg-white text-neutral-800 text-xs font-semibold transition-colors"
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-emerald-600" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-600" />
                  Pause
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
