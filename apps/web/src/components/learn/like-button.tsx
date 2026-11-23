'use client';

import React, { useEffect, useState } from 'react';
import { ThumbsUp, Loader2 } from 'lucide-react';
import { interactionsApi, LikesData } from '../../lib/interactions';
import { useRouter } from 'next/navigation';

interface LikeButtonProps {
  lessonId: string;
  isAuthenticated: boolean;
}

export function LikeButton({ lessonId, isAuthenticated }: LikeButtonProps) {
  const router = useRouter();
  const [likesData, setLikesData] = useState<LikesData>({ likeCount: 0, hasLiked: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!lessonId) return;

    setIsLoading(true);
    interactionsApi
      .getLikes(lessonId)
      .then((data) => {
        if (isMounted) setLikesData(data);
      })
      .catch((err) => {
        console.error('Failed to load likes:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  const handleToggleLike = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isToggling) return;

    // Optimistic UI update
    const previousState = likesData;
    const nextHasLiked = !previousState.hasLiked;
    const nextLikeCount = nextHasLiked
      ? previousState.likeCount + 1
      : Math.max(0, previousState.likeCount - 1);

    setLikesData({
      likeCount: nextLikeCount,
      hasLiked: nextHasLiked,
    });
    setIsToggling(true);

    try {
      const updated = await interactionsApi.toggleLike(lessonId);
      setLikesData(updated);
    } catch (err) {
      console.error('Failed to toggle like:', err);
      // Revert to previous state on failure
      setLikesData(previousState);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggleLike}
      disabled={isLoading}
      title={
        !isAuthenticated
          ? 'Log in to like this lesson'
          : likesData.hasLiked
            ? 'Unlike this lesson'
            : 'Like this lesson'
      }
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer select-none outline-none focus:outline-none focus-visible:outline-none ${
        likesData.hasLiked
          ? 'text-[#337df6] hover:text-[#2b6ad0]'
          : 'text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      <ThumbsUp
        className={`w-3.5 h-3.5 transition-transform active:scale-125 ${
          likesData.hasLiked ? 'fill-[#337df6] stroke-[#337df6]' : 'stroke-current'
        }`}
      />
      <span className="font-mono text-[11px] sm:text-xs">
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin text-white/40" />
        ) : (
          likesData.likeCount
        )}
      </span>
    </button>
  );
}
