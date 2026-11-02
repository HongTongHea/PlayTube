"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { VideoItem } from "@/types/youtube";
import { getResolvedApiKey } from "@/lib/youtube";

export type NavSection = "home" | "trending" | "saved" | "history";

interface AppContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  hasValidKeyConfigured: boolean;
  isApiModalOpen: boolean;
  setIsApiModalOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  activeCategory: string;
  setActiveCategory: (catId: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  savedVideos: VideoItem[];
  toggleSaveVideo: (video: VideoItem) => void;
  isVideoSaved: (videoId: string) => boolean;
  watchHistory: VideoItem[];
  addToHistory: (video: VideoItem) => void;
  clearHistory: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  API_KEY: "puretube_yt_api_key",
  SAVED: "puretube_saved_videos",
  HISTORY: "puretube_watch_history",
  THEME: "puretube_theme",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string>(() => getResolvedApiKey());
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<NavSection>("home");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<VideoItem[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
      if (storedKey) {
        setApiKeyState(storedKey);
      } else {
        const envKey = getResolvedApiKey();
        if (envKey) setApiKeyState(envKey);
      }

      const storedSaved = localStorage.getItem(STORAGE_KEYS.SAVED);
      if (storedSaved) setSavedVideos(JSON.parse(storedSaved));

      const storedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (storedHistory) setWatchHistory(JSON.parse(storedHistory));

      const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (storedTheme === "light") {
        setDarkMode(false);
        document.documentElement.classList.remove("dark");
      } else {
        setDarkMode(true);
        document.documentElement.classList.add("dark");
      }
    } catch {
      // Ignore storage errors in private browsing
    }
  }, []);

  const setApiKey = (key: string) => {
    const trimmed = key.trim();
    setApiKeyState(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, trimmed);
      } else {
        localStorage.removeItem(STORAGE_KEYS.API_KEY);
      }
    } catch {}
  };

  const toggleSaveVideo = (video: VideoItem) => {
    setSavedVideos((prev) => {
      const exists = prev.some((v) => v.id === video.id);
      const next = exists ? prev.filter((v) => v.id !== video.id) : [video, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const isVideoSaved = (videoId: string) => savedVideos.some((v) => v.id === videoId);

  const addToHistory = (video: VideoItem) => {
    setWatchHistory((prev) => {
      const filtered = prev.filter((v) => v.id !== video.id);
      const next = [video, ...filtered].slice(0, 50);
      try {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearHistory = () => {
    setWatchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch {}
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEYS.THEME, next ? "dark" : "light");
      } catch {}
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  const hasValidKeyConfigured = Boolean(getResolvedApiKey(apiKey));

  return (
    <AppContext.Provider
      value={{
        apiKey,
        setApiKey,
        hasValidKeyConfigured,
        isApiModalOpen,
        setIsApiModalOpen,
        sidebarOpen,
        setSidebarOpen,
        activeSection,
        setActiveSection,
        activeCategory,
        setActiveCategory,
        searchQuery,
        setSearchQuery,
        savedVideos,
        toggleSaveVideo,
        isVideoSaved,
        watchHistory,
        addToHistory,
        clearHistory,
        darkMode,
        toggleDarkMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
