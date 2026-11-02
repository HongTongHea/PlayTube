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
  X,
} from "lucide-react";
import { useApp, NavSection } from "@/context/AppContext";
import { CATEGORIES } from "@/lib/mockData";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <Home className="w-4 h-4" />,
  khmer: <Music2 className="w-4 h-4 text-red-500" />,
  english_music: <Music2 className="w-4 h-4 text-rose-500" />,
  funny: <Flame className="w-4 h-4 text-amber-500" />,
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
    mobileMenuOpen,
    setMobileMenuOpen,
    activeSection,
    setActiveSection,
    activeCategory,
    setActiveCategory,
    setSearchQuery,
    savedVideos,
    watchHistory,
  } = useApp();

  const router = useRouter();
  const pathname = usePathname();

  const handleNavClick = (section: NavSection) => {
    setActiveSection(section);
    setSearchQuery("");
    setMobileMenuOpen(false);
    if (pathname !== "/") {
      router.push("/");
    }
  };

  const handleCategoryClick = (catId: string) => {
    setActiveSection("home");
    setActiveCategory(catId);
    setSearchQuery("");
    setMobileMenuOpen(false);
    if (pathname !== "/") {
      router.push("/");
    }
  };

  const navItems = [
    { id: "home", label: "Home", fullLabel: "Home Feed", icon: Home },
    { id: "trending", label: "Trending", fullLabel: "Trending Now", icon: Flame },
    {
      id: "saved",
      label: "Saved",
      fullLabel: "Watch Later",
      icon: Bookmark,
      badge: savedVideos.length,
    },
    {
      id: "history",
      label: "History",
      fullLabel: "Watch History",
      icon: History,
      badge: watchHistory.length,
    },
  ];

  return (
    <>
      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-64 h-full bg-white dark:bg-[#0f0f0f] border-r border-zinc-200 dark:border-zinc-800 p-4 overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-base text-zinc-900 dark:text-white">
                Play<span className="text-red-500">Tube</span> Menu
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
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
                      {item.fullLabel}
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
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!sidebarOpen ? (
        <aside className="hidden md:flex flex-col items-center py-4 px-2 w-18 border-r border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-[#0f0f0f] shrink-0 gap-2">
          {navItems.map((item) => {
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
      ) : (
        <aside className="w-60 shrink-0 hidden md:flex flex-col justify-between border-r border-zinc-200/70 dark:border-zinc-800/70 bg-white dark:bg-[#0f0f0f] h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto p-3 select-none">
          <div className="space-y-6">
            {/* Primary Navigation */}
            <div className="space-y-1">
              {navItems.map((item) => {
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
                      {item.fullLabel}
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
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden h-14 bg-white/95 dark:bg-[#0f0f0f]/95 backdrop-blur-lg border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id && pathname === "/";
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as NavSection)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl text-[10px] font-medium transition-colors gap-0.5 ${
                active
                  ? "text-red-500 font-semibold"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {typeof item.badge === "number" && item.badge > 0 && (
                <span className="absolute top-0.5 right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
