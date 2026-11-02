"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  Search,
  X,
  ShieldCheck,
  Sun,
  Moon,
  Play,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export default function Navbar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    searchQuery,
    setSearchQuery,
    setActiveSection,
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

  const handleMenuToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

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
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base sm:text-lg tracking-tight text-zinc-900 dark:text-white">
              Play<span className="text-red-500">Tube</span>
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </form>

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
