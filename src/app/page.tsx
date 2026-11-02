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
  Shuffle,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { CATEGORIES } from "@/lib/mockData";
import {
  fetchPopularVideos,
  fetchRandomHomeMix,
  searchYouTubeVideos,
} from "@/lib/youtube";
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
    playTrack,
  } = useApp();

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [mixRefreshSeed, setMixRefreshSeed] = useState<number>(0);

  const observerTarget = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const directVideoId = searchQuery ? extractYouTubeId(searchQuery) : null;

  // Initial feed load when section, category, or searchQuery changes
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
        if (searchQuery.trim()) {
          const res = await searchYouTubeVideos(searchQuery.trim(), apiKey, 16);
          if (!cancelled) {
            setVideos(res.videos);
            setNextPageToken(res.nextPageToken);
          }
        } else if (activeSection === "trending") {
          const res = await fetchPopularVideos({ apiKey, maxResults: 16 });
          if (!cancelled) {
            setVideos(res.videos);
            setNextPageToken(res.nextPageToken);
          }
        } else if (activeCategory === "all") {
          // Random All Mix: Khmer music + English music + Funny videos
          const res = await fetchRandomHomeMix({ apiKey });
          if (!cancelled) {
            setVideos(res.videos);
            setNextPageToken(res.nextPageToken);
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
            setNextPageToken(res.nextPageToken);
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
  }, [apiKey, activeSection, activeCategory, searchQuery, mixRefreshSeed]);

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
          maxResults: 12,
          pageToken: nextPageToken,
        });
      } else if (activeCategory === "all") {
        res = await fetchRandomHomeMix({
          apiKey,
          pageToken: nextPageToken,
        });
      } else {
        const selectedCat = CATEGORIES.find((c) => c.id === activeCategory);
        res = await fetchPopularVideos({
          apiKey,
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
      {/* Top Category Pills + Play All Stream Button */}
      {activeSection === "home" && !searchQuery && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
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

          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {activeCategory === "all" && (
              <button
                onClick={() => setMixRefreshSeed((s) => s + 1)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-red-600 hover:text-white transition-colors"
                title="Shuffle a new random mix of Khmer, English & Funny videos"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Shuffle Mix
              </button>
            )}
            {displayedVideos.length > 0 && (
              <button
                onClick={() => playTrack(displayedVideos[0], "music", displayedVideos)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
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
