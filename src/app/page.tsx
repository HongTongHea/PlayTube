"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Flame,
  Bookmark,
  History,
  Trash2,
  Play,
  AlertCircle,
  Search,
  Loader2,
  Headphones,
  X,
  RefreshCw,
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
    searchHistory,
    addSearchHistory,
    removeSearchHistoryItem,
    clearSearchHistory,
    savedVideos,
    watchHistory,
    clearHistory,
    currentTrack,
    setQueue,
    playTrack,
  } = useApp();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [refreshSeed, setRefreshSeed] = useState<number>(0);

  const observerTarget = useRef<HTMLDivElement | null>(null);
  const currentTrackRef = useRef(currentTrack);
  const router = useRouter();

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  const directVideoId = searchQuery ? extractYouTubeId(searchQuery) : null;

  const handleManualRefresh = () => {
    setRefreshSeed((prev) => prev + 1);
  };

  // Initial feed load when section, category, searchQuery, or refreshSeed changes
  useEffect(() => {
    let cancelled = false;

    async function loadInitialFeed() {
      if (activeSection === "saved" || activeSection === "history") {
        setLoading(false);
        return;
      }

      setLoading(true);
      setNextPageToken(undefined);

      try {
        let res;
        if (searchQuery.trim()) {
          res = await searchYouTubeVideos(
            searchQuery.trim(),
            apiKey,
            16,
            undefined,
            refreshSeed > 0
          );
        } else if (activeSection === "trending") {
          res = await fetchPopularVideos({
            apiKey,
            categoryKey: "trending",
            maxResults: 16,
            shuffle: true,
          });
        } else {
          const selectedCat = CATEGORIES.find((c) => c.id === activeCategory);
          res = await fetchPopularVideos({
            apiKey,
            categoryKey: selectedCat?.id || "all",
            categoryId: selectedCat?.categoryId,
            query: selectedCat?.query,
            maxResults: 16,
            shuffle: true,
          });
        }

        if (!cancelled && res) {
          setVideos(res.videos);
          setNextPageToken(res.nextPageToken);
          if (!currentTrackRef.current && res.videos.length > 0) {
            setQueue(res.videos);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialFeed();
    return () => {
      cancelled = true;
    };
  }, [apiKey, activeSection, activeCategory, searchQuery, refreshSeed, setQueue]);

  // Load more videos when scrolling down (Infinite Scroll)
  const loadMoreVideos = useCallback(async () => {
    if (
      loading ||
      loadingMore ||
      !nextPageToken ||
      activeSection === "saved" ||
      activeSection === "history"
    ) {
      return;
    }

    setLoadingMore(true);
    try {
      let res;
      if (searchQuery.trim()) {
        res = await searchYouTubeVideos(searchQuery.trim(), apiKey, 12, nextPageToken);
      } else if (activeSection === "trending") {
        res = await fetchPopularVideos({
          apiKey,
          categoryKey: "trending",
          maxResults: 12,
          pageToken: nextPageToken,
        });
      } else {
        const selectedCat = CATEGORIES.find((c) => c.id === activeCategory);
        res = await fetchPopularVideos({
          apiKey,
          categoryKey: selectedCat?.id || "all",
          categoryId: selectedCat?.categoryId,
          query: selectedCat?.query,
          maxResults: 12,
          pageToken: nextPageToken,
        });
      }

      if (res && res.videos.length > 0) {
        setVideos((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const uniqueNew = res.videos.filter((v) => !existingIds.has(v.id));
          return [...prev, ...uniqueNew];
        });
        setNextPageToken(res.nextPageToken);
      } else {
        setNextPageToken(undefined);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [
    loading,
    loadingMore,
    nextPageToken,
    activeSection,
    searchQuery,
    apiKey,
    activeCategory,
  ]);

  // IntersectionObserver for smooth Infinite Scroll on mobile and desktop
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreVideos();
        }
      },
      { rootMargin: "350px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMoreVideos]);

  const displayedVideos =
    activeSection === "saved"
      ? savedVideos
      : activeSection === "history"
      ? watchHistory
      : videos;

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-5">
      {/* Top Category Pills + Refresh & Stream All Buttons */}
      {activeSection === "home" && !searchQuery && (
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (active) {
                      handleManualRefresh();
                    } else {
                      setActiveCategory(cat.id);
                    }
                  }}
                  className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? "bg-red-600 text-white shadow-sm shadow-red-600/20"
                      : "bg-zinc-200/70 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300/70 dark:hover:bg-zinc-700"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              title="Refresh for new videos and songs"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-red-500" : ""}`} />
              <span className="hidden sm:inline">New Mix</span>
            </button>

            {displayedVideos.length > 0 && (
              <button
                onClick={() => playTrack(displayedVideos[0], "music", displayedVideos)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 shrink-0 transition-opacity"
              >
                <Headphones className="w-3.5 h-3.5 text-red-500" />
                Stream All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Direct YouTube URL / Video ID Quick Play Banner */}
      {directVideoId && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shrink-0">
              <Play className="w-4 h-4 fill-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                YouTube Video Link Detected ({directVideoId})
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Open this video directly in the player.
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/watch/${directVideoId}`)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            Watch Now
          </button>
        </div>
      )}

      {/* Search History Section when inside History tab */}
      {activeSection === "history" && searchHistory.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                Search History ({searchHistory.length})
              </h2>
            </div>
            <button
              onClick={clearSearchHistory}
              className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Search History
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {searchHistory.map((term) => (
              <div
                key={term}
                className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/80"
              >
                <button
                  onClick={() => {
                    setSearchQuery(term);
                    addSearchHistory(term);
                    setActiveSection("home");
                  }}
                  className="hover:text-red-500 transition-colors"
                >
                  {term}
                </button>
                <button
                  onClick={() => removeSearchHistoryItem(term)}
                  className="p-0.5 rounded-full text-zinc-400 hover:text-red-500 transition-colors"
                  title="Remove search term"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Header */}
      {(searchQuery || activeSection !== "home") && (
        <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            {searchQuery ? (
              <>
                <Search className="w-5 h-5 text-red-500" />
                <h1 className="text-base sm:text-lg font-bold">
                  Results for &ldquo;{searchQuery}&rdquo;
                </h1>
              </>
            ) : activeSection === "trending" ? (
              <>
                <Flame className="w-5 h-5 text-red-500" />
                <h1 className="text-base sm:text-lg font-bold">Trending Music &amp; Videos</h1>
              </>
            ) : activeSection === "saved" ? (
              <>
                <Bookmark className="w-5 h-5 text-red-500" />
                <h1 className="text-base sm:text-lg font-bold">
                  Watch Later ({savedVideos.length})
                </h1>
              </>
            ) : (
              <>
                <History className="w-5 h-5 text-red-500" />
                <h1 className="text-base sm:text-lg font-bold">
                  Watch History ({watchHistory.length})
                </h1>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeSection === "trending" && !searchQuery && (
              <button
                onClick={handleManualRefresh}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-red-500" : ""}`} />
                Refresh
              </button>
            )}

            {activeSection === "history" && watchHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Watch History
              </button>
            )}

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Back to All
              </button>
            )}
          </div>
        </div>
      )}

      {/* Video Grid or Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 space-y-3 animate-pulse"
            >
              <div className="aspect-video w-full rounded-xl bg-zinc-200 dark:bg-zinc-800/80" />
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
              ? "No saved tracks or videos yet"
              : activeSection === "history"
              ? "Your watch history is empty"
              : "No videos found"}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
            {activeSection === "saved"
              ? "Tap the bookmark icon on any card to save it for later."
              : activeSection === "history"
              ? "Videos and music you stream will automatically appear here."
              : "Try searching for another keyword or artist."}
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {displayedVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                playlist={displayedVideos}
              />
            ))}
          </div>

          {/* Infinite Scroll Sentinel & Loading Spinner */}
          {activeSection !== "saved" && activeSection !== "history" && (
            <div
              ref={observerTarget}
              className="py-8 flex flex-col items-center justify-center gap-2"
            >
              {loadingMore ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-200/70 dark:bg-zinc-900 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                  <span>Loading more streams...</span>
                </div>
              ) : nextPageToken ? (
                <button
                  onClick={loadMoreVideos}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-zinc-200/80 dark:bg-zinc-800/90 hover:bg-red-600 hover:text-white text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  Load More
                </button>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
