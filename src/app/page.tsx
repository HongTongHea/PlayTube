"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flame,
  Bookmark,
  History,
  KeyRound,
  Sparkles,
  Trash2,
  Play,
  AlertCircle,
  Search,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { CATEGORIES } from "@/lib/mockData";
import { fetchPopularVideos, searchYouTubeVideos } from "@/lib/youtube";
import { VideoItem } from "@/types/youtube";
import VideoCard from "@/components/VideoCard";

function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  const urlRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = trimmed.match(urlRegex);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

export default function HomePage() {
  const {
    apiKey,
    activeSection,
    setActiveSection,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    savedVideos,
    watchHistory,
    clearHistory,
    setIsApiModalOpen,
  } = useApp();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [apiNotice, setApiNotice] = useState<string | undefined>(undefined);
  const router = useRouter();

  const directVideoId = searchQuery ? extractYouTubeId(searchQuery) : null;

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      if (activeSection === "saved" || activeSection === "history") {
        setLoading(false);
        return;
      }

      setLoading(true);
      setApiNotice(undefined);

      try {
        if (searchQuery.trim()) {
          const res = await searchYouTubeVideos(searchQuery.trim(), apiKey, 16);
          if (!cancelled) {
            setVideos(res.videos);
            setIsDemoMode(res.isDemo);
            setApiNotice(res.error);
          }
        } else if (activeSection === "trending") {
          const res = await fetchPopularVideos({ apiKey, maxResults: 16 });
          if (!cancelled) {
            setVideos(res.videos);
            setIsDemoMode(res.isDemo);
            setApiNotice(res.error);
          }
        } else {
          const selectedCat = CATEGORIES.find((c) => c.id === activeCategory);
          const res = await fetchPopularVideos({
            apiKey,
            categoryId: selectedCat?.categoryId,
            query: selectedCat?.query,
            maxResults: 16,
          });
          if (!cancelled) {
            setVideos(res.videos);
            setIsDemoMode(res.isDemo);
            setApiNotice(res.error);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFeed();
    return () => {
      cancelled = true;
    };
  }, [apiKey, activeSection, activeCategory, searchQuery]);

  const displayedVideos =
    activeSection === "saved"
      ? savedVideos
      : activeSection === "history"
      ? watchHistory
      : videos;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
      {/* Top Category Pills (shown on Home feed) */}
      {activeSection === "home" && !searchQuery && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs"
                    : "bg-zinc-200/70 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300/70 dark:hover:bg-zinc-700"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Demo / API Key Banner when no API key is configured */}
      {isDemoMode && activeSection !== "saved" && activeSection !== "history" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-red-950/60 dark:from-zinc-900/90 dark:to-red-950/40 text-white border border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/15 text-red-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-semibold">Curated Ad-Free Preview Mode</span>
              <span className="text-zinc-300 ml-1.5">
                {apiNotice
                  ? `(${apiNotice})`
                  : "Connect your YouTube Data API v3 key to unlock live search, trending charts, and comments."}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsApiModalOpen(true)}
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Add API Key
          </button>
        </div>
      )}

      {/* Direct YouTube URL / Video ID Quick Play Banner */}
      {directVideoId && (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white">
              <Play className="w-4 h-4 fill-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                YouTube Video Link Detected ({directVideoId})
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Open this video directly in the ad-free player.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/watch/${directVideoId}`)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            Watch Ad-Free Now
          </button>
        </div>
      )}

      {/* Section Header */}
      {(searchQuery || activeSection !== "home") && (
        <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            {searchQuery ? (
              <>
                <Search className="w-5 h-5 text-red-500" />
                <h1 className="text-lg font-bold">
                  Search results for &ldquo;{searchQuery}&rdquo;
                </h1>
              </>
            ) : activeSection === "trending" ? (
              <>
                <Flame className="w-5 h-5 text-red-500" />
                <h1 className="text-lg font-bold">Trending Videos</h1>
              </>
            ) : activeSection === "saved" ? (
              <>
                <Bookmark className="w-5 h-5 text-red-500" />
                <h1 className="text-lg font-bold">Watch Later ({savedVideos.length})</h1>
              </>
            ) : (
              <>
                <History className="w-5 h-5 text-red-500" />
                <h1 className="text-lg font-bold">Watch History ({watchHistory.length})</h1>
              </>
            )}
          </div>

          {activeSection === "history" && watchHistory.length > 0 && (
            <button
              onClick={clearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          )}

          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              Back to All Videos
            </button>
          )}
        </div>
      )}

      {/* Video Grid or Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="space-y-3 animate-pulse">
              <div className="aspect-video w-full rounded-2xl bg-zinc-200 dark:bg-zinc-800/80" />
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800/80 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-4/5 rounded bg-zinc-200 dark:bg-zinc-800/80" />
                  <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800/80" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayedVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            {activeSection === "saved"
              ? "No saved videos yet"
              : activeSection === "history"
              ? "Your watch history is empty"
              : "No videos found"}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
            {activeSection === "saved"
              ? "Click the bookmark icon on any video card to save it for later."
              : activeSection === "history"
              ? "Videos you watch will automatically appear here."
              : "Try searching for another keyword or topic."}
          </p>
          {activeSection !== "home" && (
            <button
              onClick={() => setActiveSection("home")}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              Explore Home Feed
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
          {displayedVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
