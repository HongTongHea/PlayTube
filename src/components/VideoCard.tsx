"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Bookmark, Check, Play, Headphones, Tv } from "lucide-react";
import { VideoItem } from "@/types/youtube";
import { formatViewCount, formatDuration, formatTimeAgo } from "@/lib/youtube";
import { useApp } from "@/context/AppContext";

interface VideoCardProps {
  video: VideoItem;
  compact?: boolean;
  playlist?: VideoItem[];
}

export default function VideoCard({ video, compact = false, playlist }: VideoCardProps) {
  const { toggleSaveVideo, isVideoSaved, currentTrack, playTrack } = useApp();
  const saved = isVideoSaved(video.id);
  const isNowPlaying = currentTrack?.id === video.id;
  const durationBadge = formatDuration(video.duration);
  const channelInitial = (video.channelTitle || "P")[0].toUpperCase();

  const resolvedRealThumb =
    video.thumbnailUrl && video.thumbnailUrl.trim() !== ""
      ? video.thumbnailUrl
      : `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

  const [thumbSrc, setThumbSrc] = useState<string>(resolvedRealThumb);

  useEffect(() => {
    setThumbSrc(resolvedRealThumb);
  }, [resolvedRealThumb]);

  const handleThumbError = () => {
    const hqFallback = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    const mqFallback = `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`;
    if (thumbSrc !== hqFallback) {
      setThumbSrc(hqFallback);
    } else if (thumbSrc !== mqFallback) {
      setThumbSrc(mqFallback);
    }
  };

  if (compact) {
    return (
      <div
        className={`group flex gap-3 p-2.5 rounded-2xl border transition-all ${
          isNowPlaying
            ? "bg-red-500/10 border-red-500/30"
            : "border-transparent hover:bg-zinc-100/90 dark:hover:bg-zinc-900/80 hover:border-zinc-200/60 dark:hover:border-zinc-800/70"
        }`}
      >
        <div className="relative w-36 sm:w-40 aspect-video rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
          <Link href={`/watch/${video.id}`} className="block w-full h-full">
            <img
              src={thumbSrc}
              alt={video.title}
              referrerPolicy="no-referrer"
              onError={handleThumbError}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          </Link>
          {durationBadge && (
            <span
              className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                durationBadge === "LIVE"
                  ? "bg-red-600 text-white"
                  : "bg-black/80 text-white"
              }`}
            >
              {durationBadge}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              playTrack(video, "music", playlist);
            }}
            title="Stream in background player"
            className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <span className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </span>
          </button>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <Link
              href={`/watch/${video.id}`}
              className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 group-hover:text-red-500 transition-colors leading-snug"
            >
              {video.title}
            </Link>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {video.channelTitle}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5 truncate">
              <span>{formatViewCount(video.viewCount)}</span>
              <span>•</span>
              <span>{formatTimeAgo(video.publishedAt)}</span>
            </div>
            <button
              type="button"
              onClick={() => playTrack(video, "music", playlist)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
              title="Play as Music Stream"
            >
              <Headphones className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex flex-col rounded-2xl p-2.5 sm:p-3 transition-all duration-300 border ${
        isNowPlaying
          ? "bg-gradient-to-b from-red-500/10 to-transparent border-red-500/40 shadow-lg shadow-red-500/5"
          : "bg-white/70 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900/95 border-zinc-200/70 dark:border-zinc-800/70 hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:shadow-xl hover:-translate-y-0.5"
      }`}
    >
      {/* Real Thumbnail Container (Bright & Unobstructed) */}
      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 shadow-xs">
        <Link href={`/watch/${video.id}`} className="block w-full h-full">
          <img
            src={thumbSrc}
            alt={video.title}
            referrerPolicy="no-referrer"
            onError={handleThumbError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        </Link>

        {/* Now Playing Equalizer Badge */}
        {isNowPlaying && (
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md">
            <span className="flex items-end gap-0.5 h-2.5">
              <span className="w-0.5 h-2 bg-white animate-pulse" />
              <span className="w-0.5 h-2.5 bg-white animate-bounce" />
              <span className="w-0.5 h-1.5 bg-white animate-pulse" />
            </span>
            Playing
          </div>
        )}

        {/* Duration Badge */}
        {durationBadge && (
          <span
            className={`absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide pointer-events-none ${
              durationBadge === "LIVE"
                ? "bg-red-600 text-white"
                : "bg-black/80 text-white"
            }`}
          >
            {durationBadge}
          </span>
        )}

        {/* Quick Save to Watch Later Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleSaveVideo(video);
          }}
          title={saved ? "Saved in Watch Later" : "Save to Watch Later"}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all ${
            saved
              ? "bg-red-600 text-white opacity-100"
              : "bg-black/60 text-white opacity-90 sm:opacity-0 group-hover:opacity-100 hover:bg-black/85"
          }`}
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        </button>

        {/* Music Stream Floating Play Button (Bottom-Right of Thumbnail) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            playTrack(video, "music", playlist);
          }}
          title="Play immediately in Music/Stream Bar"
          className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/40 translate-y-1 opacity-95 sm:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 active:scale-95"
        >
          <Play className="w-4 h-4 fill-white ml-0.5" />
        </button>
      </div>

      {/* Track / Video Metadata + Stream Actions */}
      <div className="flex flex-col justify-between flex-1 pt-3 px-0.5 gap-2.5">
        <div className="flex gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-rose-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            {channelInitial}
          </div>

          <div className="flex-1 min-w-0">
            <Link
              href={`/watch/${video.id}`}
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug group-hover:text-red-500 transition-colors"
            >
              {video.title}
            </Link>
            <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
              {video.channelTitle}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
              <span>{formatViewCount(video.viewCount)}</span>
              <span>•</span>
              <span>{formatTimeAgo(video.publishedAt)}</span>
            </div>
          </div>
        </div>

        {/* Quick Stream Action Pills (Music Stream / Mini Video) */}
        <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/60">
          <button
            type="button"
            onClick={() => playTrack(video, "music", playlist)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[11px] font-semibold transition-colors ${
              isNowPlaying
                ? "bg-red-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800/80 hover:bg-red-500/15 hover:text-red-500 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>{isNowPlaying ? "Streaming Now" : "Listen Stream"}</span>
          </button>

          <button
            type="button"
            onClick={() => playTrack(video, "video", playlist)}
            className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            title="Play in Floating Mini Video Player"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Mini Video</span>
          </button>
        </div>
      </div>
    </div>
  );
}
