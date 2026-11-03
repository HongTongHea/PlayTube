"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { VideoItem } from "@/types/youtube";
import { getResolvedApiKey } from "@/lib/youtube";
import { DEMO_VIDEOS } from "@/lib/mockData";
import {
  startBackgroundAudioKeepAlive,
  stopBackgroundAudioKeepAlive,
} from "@/lib/backgroundAudio";

export type NavSection = "home" | "trending" | "saved" | "history";
export type StreamMode = "video" | "music";

interface AppContextType {
  apiKey: string;
  setApiKey: (key: string) => void;
  hasValidKeyConfigured: boolean;
  isApiModalOpen: boolean;
  setIsApiModalOpen: (open: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  activeSection: NavSection;
  setActiveSection: (section: NavSection) => void;
  activeCategory: string;
  setActiveCategory: (catId: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // Search History
  searchHistory: string[];
  addSearchHistory: (query: string) => void;
  removeSearchHistoryItem: (query: string) => void;
  clearSearchHistory: () => void;
  // Saved & Watch History
  savedVideos: VideoItem[];
  toggleSaveVideo: (video: VideoItem) => void;
  isVideoSaved: (videoId: string) => boolean;
  watchHistory: VideoItem[];
  addToHistory: (video: VideoItem) => void;
  clearHistory: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  // Music & Video Stream Player State
  currentTrack: VideoItem | null;
  streamMode: StreamMode;
  setStreamMode: (mode: StreamMode) => void;
  queue: VideoItem[];
  setQueue: React.Dispatch<React.SetStateAction<VideoItem[]>>;
  playTrack: (video: VideoItem, mode?: StreamMode, list?: VideoItem[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  closePlayer: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  API_KEY: "puretube_yt_api_key",
  SAVED: "puretube_saved_videos",
  HISTORY: "puretube_watch_history",
  SEARCH_HISTORY: "playtube_search_history",
  THEME: "puretube_theme",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string>(() => getResolvedApiKey());
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<NavSection>("home");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<VideoItem[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Persistent Stream Player
  const [currentTrack, setCurrentTrack] = useState<VideoItem | null>(null);
  const [streamMode, setStreamMode] = useState<StreamMode>("music");
  const [queue, setQueue] = useState<VideoItem[]>(DEMO_VIDEOS);

  const currentTrackRef = useRef<VideoItem | null>(null);
  const queueRef = useRef<VideoItem[]>(DEMO_VIDEOS);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

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

      const storedSearchHistory = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
      if (storedSearchHistory) setSearchHistory(JSON.parse(storedSearchHistory));

      const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      if (storedTheme === "light") {
        setDarkMode(false);
        document.documentElement.classList.remove("dark");
      } else {
        setDarkMode(true);
        document.documentElement.classList.add("dark");
      }
    } catch {
      // Ignore storage errors
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

  const addSearchHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter(
        (item) => item.toLowerCase() !== trimmed.toLowerCase()
      );
      const next = [trimmed, ...filtered].slice(0, 20);
      try {
        localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const removeSearchHistoryItem = (query: string) => {
    setSearchHistory((prev) => {
      const next = prev.filter((item) => item !== query);
      try {
        localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
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

  const addToHistory = useCallback((video: VideoItem) => {
    setWatchHistory((prev) => {
      const filtered = prev.filter((v) => v.id !== video.id);
      const next = [video, ...filtered].slice(0, 50);
      try {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

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

  const playTrack = useCallback(
    (video: VideoItem, mode: StreamMode = "music", list?: VideoItem[]) => {
      startBackgroundAudioKeepAlive();
      currentTrackRef.current = video;
      setCurrentTrack(video);
      setStreamMode(mode);
      if (list && list.length > 1) {
        const hasVideo = list.some((v) => v.id === video.id);
        const nextQueue = hasVideo ? list : [video, ...list];
        queueRef.current = nextQueue;
        setQueue(nextQueue);
      } else {
        setQueue((prev) => {
          const base = prev.length > 1 ? prev : DEMO_VIDEOS;
          const filtered = base.filter((v) => v.id !== video.id);
          const nextQueue = [video, ...filtered];
          queueRef.current = nextQueue;
          return nextQueue;
        });
      }
      addToHistory(video);
    },
    [addToHistory]
  );

  const playNext = useCallback(() => {
    const activeTrack = currentTrackRef.current;
    const activeQueue =
      queueRef.current && queueRef.current.length > 0 ? queueRef.current : DEMO_VIDEOS;
    if (!activeTrack || activeQueue.length === 0) return;

    const idx = activeQueue.findIndex((v) => v.id === activeTrack.id);
    const nextIdx = idx >= 0 && idx + 1 < activeQueue.length ? idx + 1 : 0;
    let nextVideo = activeQueue[nextIdx];

    if (nextVideo && nextVideo.id === activeTrack.id && activeQueue.length > 1) {
      nextVideo = activeQueue[(nextIdx + 1) % activeQueue.length];
    }

    if (nextVideo) {
      startBackgroundAudioKeepAlive();
      currentTrackRef.current = nextVideo;
      setCurrentTrack(nextVideo);
      addToHistory(nextVideo);
    }
  }, [addToHistory]);

  const playPrevious = useCallback(() => {
    const activeTrack = currentTrackRef.current;
    const activeQueue =
      queueRef.current && queueRef.current.length > 0 ? queueRef.current : DEMO_VIDEOS;
    if (!activeTrack || activeQueue.length === 0) return;

    const idx = activeQueue.findIndex((v) => v.id === activeTrack.id);
    const prevIdx = idx > 0 ? idx - 1 : activeQueue.length - 1;
    const prevVideo = activeQueue[prevIdx];
    if (prevVideo) {
      startBackgroundAudioKeepAlive();
      currentTrackRef.current = prevVideo;
      setCurrentTrack(prevVideo);
      addToHistory(prevVideo);
    }
  }, [addToHistory]);

  const closePlayer = useCallback(() => {
    stopBackgroundAudioKeepAlive();
    currentTrackRef.current = null;
    setCurrentTrack(null);
  }, []);

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
        mobileMenuOpen,
        setMobileMenuOpen,
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
        toggleSaveVideo,
        isVideoSaved,
        watchHistory,
        addToHistory,
        clearHistory,
        darkMode,
        toggleDarkMode,
        currentTrack,
        streamMode,
        setStreamMode,
        queue,
        setQueue,
        playTrack,
        playNext,
        playPrevious,
        closePlayer,
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
