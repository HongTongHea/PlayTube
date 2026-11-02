"use client";

import React from "react";
import Link from "next/link";
import { Bookmark, Check } from "lucide-react";
import { VideoItem } from "@/types/youtube";
import { formatViewCount, formatDuration, formatTimeAgo } from "@/lib/youtube";
import { useApp } from "@/context/AppContext";

interface VideoCardProps {
  video: VideoItem;
  compact?: boolean;
}

export default function VideoCard({ video, compact = false }: VideoCardProps) {
  const { toggleSaveVideo, isVideoSaved } = useApp();
  const saved = isVideoSaved(video.id);
  const durationBadge = formatDuration(video.duration);
  const channelInitial = (video.channelTitle || "Y")[0].toUpperCase();

  if (compact) {
    return (
      <div className="group flex gap-3 p-2 rounded-xl hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 transition-colors">
        <Link
          href={`/watch/${video.id}`}
          className="relative w-40 aspect-video rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0"
        >
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
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
        </Link>

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
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
            <span>{formatViewCount(video.viewCount)}</span>
            <span>•</span>
            <span>{formatTimeAgo(video.publishedAt)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col rounded-2xl overflow-hidden transition-all">
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-900">
        <Link href={`/watch/${video.id}`} className="block w-full h-full">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            loading="lazy"
          />
        </Link>

        {durationBadge && (
          <span
            className={`absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide pointer-events-none ${
              durationBadge === "LIVE"
                ? "bg-red-600 text-white"
                : "bg-black/80 text-white backdrop-blur-xs"
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
          className={`absolute top-2.5 right-2.5 p-2 rounded-lg backdrop-blur-md transition-all ${
            saved
              ? "bg-red-600 text-white opacity-100"
              : "bg-black/70 text-white opacity-0 group-hover:opacity-100 hover:bg-black/90"
          }`}
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Metadata */}
      <div className="flex gap-3 pt-3 px-0.5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 dark:from-zinc-800 dark:to-zinc-700 text-white font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
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
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            <span>{formatViewCount(video.viewCount)}</span>
            <span>•</span>
            <span>{formatTimeAgo(video.publishedAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
