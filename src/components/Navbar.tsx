"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  Search,
  X,
  KeyRound,
  ShieldCheck,
  Sun,
  Moon,
  Play,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function Navbar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    searchQuery,
    setSearchQuery,
    setActiveSection,
    hasValidKeyConfigured,
    setIsApiModalOpen,
    darkMode,
    toggleDarkMode,
  } = useApp();

  const [inputVal, setInputVal] = useState(searchQuery);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setInputVal(searchQuery);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(inputVal.trim());
    setActiveSection("home");
    if (pathname !== "/") {
      router.push("/");
    }
  };

  const handleClearSearch = () => {
    setInputVal("");
    setSearchQuery("");
  };

  const handleLogoClick = () => {
    setInputVal("");
    setSearchQuery("");
    setActiveSection("home");
  };

  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-md px-4 flex items-center justify-between gap-4">
      {/* Left: Hamburger + Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition-colors"
          aria-label="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link
          href="/"
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-600 flex items-center justify-center shadow-sm shadow-red-500/20 group-hover:scale-105 transition-transform">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-white">
              Pure<span className="text-red-500">Tube</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              No Ads
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Clean Search Bar */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex-1 max-w-xl flex items-center"
      >
        <div className="relative flex w-full items-center">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search videos, topics, channels (ad-free)..."
            className="w-full h-10 pl-4 pr-20 rounded-full text-sm bg-zinc-100 dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:border-red-500/60 dark:focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10 transition-all"
          />
          {inputVal && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-12 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1 h-8 px-3.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition-colors"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Right: API Key Button + Theme Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsApiModalOpen(true)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium border transition-all ${
            hasValidKeyConfigured
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
          }`}
          title="Configure YouTube Data API v3 Key"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span className="hidden md:inline">
            {hasValidKeyConfigured ? "API Key Active" : "Set YouTube API Key"}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              hasValidKeyConfigured ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
            }`}
          />
        </button>

        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
          aria-label="Toggle color theme"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
