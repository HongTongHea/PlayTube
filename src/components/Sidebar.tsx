"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Flame,
  Bookmark,
  History,
  Code2,
  Music2,
  Gamepad2,
  Atom,
  Film,
  Newspaper,
  Trophy,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { useApp, NavSection } from "@/context/AppContext";
import { CATEGORIES } from "@/lib/mockData";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <Home className="w-4 h-4" />,
  coding: <Code2 className="w-4 h-4" />,
  music: <Music2 className="w-4 h-4" />,
  gaming: <Gamepad2 className="w-4 h-4" />,
  science: <Atom className="w-4 h-4" />,
  movies: <Film className="w-4 h-4" />,
  news: <Newspaper className="w-4 h-4" />,
  sports: <Trophy className="w-4 h-4" />,
};

export default function Sidebar() {
  const {
    sidebarOpen,
    activeSection,
    setActiveSection,
    activeCategory,
    setActiveCategory,
    setSearchQuery,
    savedVideos,
    watchHistory,
    hasValidKeyConfigured,
    setIsApiModalOpen,
  } = useApp();

  const router = useRouter();
  const pathname = usePathname();

  const handleNavClick = (section: NavSection) => {
    setActiveSection(section);
    setSearchQuery("");
    if (pathname !== "/") {
      router.push("/");
    }
  };

  const handleCategoryClick = (catId: string) => {
    setActiveSection("home");
    setActiveCategory(catId);
    setSearchQuery("");
    if (pathname !== "/") {
      router.push("/");
    }
  };

  if (!sidebarOpen) {
    return (
      <aside className="hidden md:flex flex-col items-center py-4 px-2 w-18 border-r border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-[#0f0f0f] shrink-0 gap-2">
        {[
          { id: "home", label: "Home", icon: Home },
          { id: "trending", label: "Trending", icon: Flame },
          { id: "saved", label: "Saved", icon: Bookmark },
          { id: "history", label: "History", icon: History },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id && pathname === "/";
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as NavSection)}
              className={`flex flex-col items-center justify-center w-14 py-2.5 rounded-xl text-[11px] font-medium transition-colors gap-1 ${
                active
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </aside>
    );
  }

  return (
    <aside className="w-60 shrink-0 hidden md:flex flex-col justify-between border-r border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-[#0f0f0f] h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto p-3 select-none">
      <div className="space-y-6">
        {/* Primary Navigation */}
        <div className="space-y-1">
          {[
            { id: "home", label: "Home Feed", icon: Home },
            { id: "trending", label: "Trending Now", icon: Flame },
            {
              id: "saved",
              label: "Watch Later",
              icon: Bookmark,
              badge: savedVideos.length,
            },
            {
              id: "history",
              label: "Watch History",
              icon: History,
              badge: watchHistory.length,
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id && pathname === "/";
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id as NavSection)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 font-semibold"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {item.label}
                </span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Topics / Categories */}
        <div>
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Explore Topics
          </p>
          <div className="space-y-0.5">
            {CATEGORIES.map((cat) => {
              const isSelected =
                activeSection === "home" && activeCategory === cat.id && pathname === "/";
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  {CATEGORY_ICONS[cat.id] || <Flame className="w-4 h-4" />}
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
