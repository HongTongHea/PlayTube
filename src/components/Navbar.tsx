"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  Search,
  X,
  Sun,
  Moon,
  Play,
  History,
  Trash2,
  ArrowUpLeft,
  Headphones,
  Loader2,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { searchYouTubeVideos } from "@/lib/youtube";
import { VideoItem } from "@/types/youtube";

export default function Navbar() {
  const {
    apiKey,
    sidebarOpen,
    setSidebarOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    searchQuery,
    setSearchQuery,
    searchHistory,
    addSearchHistory,
    removeSearchHistoryItem,
    clearSearchHistory,
    setActiveSection,
    darkMode,
    toggleDarkMode,
    playTrack,
  } = useApp();

  const [inputVal, setInputVal] = useState(searchQuery);
  const [showDropdown, setShowDropdown] = useState(false);
  const [liveResults, setLiveResults] = useState<VideoItem[]>([]);
  const [searchingLive, setSearchingLive] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setInputVal(searchQuery);
  }, [searchQuery]);

  // Live debounced search as user types in the search bar
  useEffect(() => {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      setLiveResults([]);
      setSearchingLive(false);
      return;
    }

    let cancelled = false;
    setSearchingLive(true);

    const timer = setTimeout(async () => {
      // Update main feed searchQuery dynamically when on home page
      setSearchQuery(trimmed);

      const res = await searchYouTubeVideos(trimmed, apiKey, 5);
      if (!cancelled) {
        setLiveResults(res.videos);
        setSearchingLive(false);
      }
    }, 380);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [inputVal, apiKey]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const executeSearch = (query: string) => {
    const trimmed = query.trim();
    setInputVal(trimmed);
    setSearchQuery(trimmed);
    if (trimmed) {
      addSearchHistory(trimmed);
    }
    setShowDropdown(false);
    setActiveSection("home");
    if (pathname !== "/") {
      router.push("/");
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(inputVal);
  };

  const handleClearSearch = () => {
    setInputVal("");
    setSearchQuery("");
    setLiveResults([]);
  };

  const handleLogoClick = () => {
    setInputVal("");
    setSearchQuery("");
    setLiveResults([]);
    setShowDropdown(false);
    setActiveSection("home");
  };

  const handleMenuToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const filteredHistory = inputVal.trim()
    ? searchHistory.filter((item) =>
        item.toLowerCase().includes(inputVal.trim().toLowerCase())
      )
    : searchHistory;

  const hasDropdownContent =
    filteredHistory.length > 0 || liveResults.length > 0 || searchingLive;

  return (
    <header className="sticky top-0 z-40 h-14 sm:h-16 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4">
      {/* Left: Hamburger + Brand */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          onClick={handleMenuToggle}
          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors"
          aria-label="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          href="/"
          onClick={handleLogoClick}
          className="flex items-center gap-2 group focus:outline-none"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center shadow-sm shadow-red-500/20 group-hover:scale-105 transition-transform">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
          <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-white">
            Play<span className="text-red-500">Tube</span>
          </span>
        </Link>
      </div>

      {/* Center: Clean Search Bar with Live Search & Search History Dropdown */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-xl">
        <form onSubmit={handleSearchSubmit} className="flex w-full items-center">
          <div className="relative flex w-full items-center">
            <input
              type="text"
              value={inputVal}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setInputVal(e.target.value);
                setShowDropdown(true);
              }}
              placeholder="Search music, videos, channels..."
              className="w-full h-9 sm:h-10 pl-3.5 sm:pl-4 pr-16 sm:pr-20 rounded-full text-xs sm:text-sm bg-zinc-100 dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-red-500/60 dark:focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10 transition-all"
            />
            {inputVal && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-10 sm:right-12 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1 h-7 sm:h-8 px-2.5 sm:px-3.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-colors"
              aria-label="Search"
            >
              {searchingLive ? (
                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-red-500" />
              ) : (
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </button>
          </div>
        </form>

        {/* Search Dropdown: Recent Searches + Live Video/Channel Matches */}
        {showDropdown && hasDropdownContent && (
          <div className="absolute left-0 right-0 top-11 sm:top-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden z-50 max-h-[75vh] overflow-y-auto">
            {/* Recent Searches Section */}
            {filteredHistory.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Recent Searches
                  </span>
                  <button
                    type="button"
                    onClick={clearSearchHistory}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-red-500 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear all
                  </button>
                </div>

                <div className="py-1">
                  {filteredHistory.slice(0, 5).map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between px-3.5 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => executeSearch(item)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left text-xs sm:text-sm text-zinc-700 dark:text-zinc-200"
                      >
                        <History className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{item}</span>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setInputVal(item)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                          title="Fill search bar"
                        >
                          <ArrowUpLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSearchHistoryItem(item);
                          }}
                          className="p-1 text-zinc-400 hover:text-red-500"
                          title="Remove from search history"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instant Live Video & Music Matches */}
            {inputVal.trim() && (
              <div className="border-t border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center justify-between px-4 py-2 bg-zinc-50/60 dark:bg-zinc-950/40">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Instant Matches
                  </span>
                  {searchingLive && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-red-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Searching...
                    </span>
                  )}
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                  {liveResults.map((video) => (
                    <div
                      key={video.id}
                      className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          addSearchHistory(inputVal.trim());
                          setShowDropdown(false);
                          router.push(`/watch/${video.id}`);
                        }}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <img
                          src={
                            video.thumbnailUrl ||
                            `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
                          }
                          alt={video.title}
                          referrerPolicy="no-referrer"
                          className="w-14 aspect-video rounded-lg object-cover bg-zinc-800 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {video.title}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            {video.channelAvatar ? (
                              <img
                                src={video.channelAvatar}
                                alt={video.channelTitle}
                                referrerPolicy="no-referrer"
                                className="w-4 h-4 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                {(video.channelTitle || "P")[0].toUpperCase()}
                              </span>
                            )}
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                              {video.channelTitle}
                            </span>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          addSearchHistory(inputVal.trim());
                          playTrack(video, "music", liveResults);
                          setShowDropdown(false);
                        }}
                        className="p-2 rounded-full bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-colors shrink-0"
                        title="Stream Music Immediately"
                      >
                        <Headphones className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Theme Toggle */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={toggleDarkMode}
          className="p-2 sm:p-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
          aria-label="Toggle color theme"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
