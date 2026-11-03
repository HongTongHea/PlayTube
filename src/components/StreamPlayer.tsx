"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Headphones,
  Tv,
  Maximize2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export default function StreamPlayer() {
  const {
    currentTrack,
    streamMode,
    setStreamMode,
    playNext,
    playPrevious,
    closePlayer,
  } = useApp();

  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const currentVideoIdRef = useRef<string | null>(null);
  const lastEndedVideoIdRef = useRef<string | null>(null);

  const playNextRef = useRef(playNext);
  const playPreviousRef = useRef(playPrevious);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  useEffect(() => {
    playPreviousRef.current = playPrevious;
  }, [playPrevious]);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [apiReady, setApiReady] = useState<boolean>(false);

  const triggerAutoNext = () => {
    const activeId = currentVideoIdRef.current;
    if (!activeId) return;
    if (lastEndedVideoIdRef.current === activeId) return;
    lastEndedVideoIdRef.current = activeId;
    playNextRef.current();
  };

  // Load YouTube IFrame API script once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }

    const existingScript = document.getElementById("yt-iframe-api");
    if (!existingScript) {
      const tag = document.createElement("script");
      tag.id = "yt-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      setApiReady(true);
    };

    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        setApiReady(true);
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Initialize or update YT player when currentTrack changes
  useEffect(() => {
    if (!currentTrack || !apiReady || typeof window === "undefined") return;

    currentVideoIdRef.current = currentTrack.id;
    lastEndedVideoIdRef.current = null;

    // Update OS / Mobile Lock-Screen MediaSession metadata
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.channelTitle,
          album: "PlayTube Stream",
          artwork: [
            {
              src: currentTrack.thumbnailUrl,
              sizes: "480x360",
              type: "image/jpeg",
            },
          ],
        });

        navigator.mediaSession.setActionHandler("play", () => {
          playerRef.current?.playVideo?.();
          setIsPlaying(true);
        });
        navigator.mediaSession.setActionHandler("pause", () => {
          playerRef.current?.pauseVideo?.();
          setIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler("previoustrack", () => {
          playPreviousRef.current();
        });
        navigator.mediaSession.setActionHandler("nexttrack", () => {
          playNextRef.current();
        });
      } catch {
        // Ignore unsupported mediaSession handlers
      }
    }

    // If player already exists, load the new track without re-creating the instance
    if (playerRef.current) {
      if (
        playerReadyRef.current &&
        typeof playerRef.current.loadVideoById === "function"
      ) {
        playerRef.current.loadVideoById(currentTrack.id);
        playerRef.current.playVideo?.();
        setIsPlaying(true);
      }
      return;
    }

    if (!wrapperRef.current) return;
    wrapperRef.current.innerHTML = "";
    const mountEl = document.createElement("div");
    mountEl.style.width = "100%";
    mountEl.style.height = "100%";
    wrapperRef.current.appendChild(mountEl);

    const initialVideoId = currentTrack.id;
    playerReadyRef.current = false;

    playerRef.current = new window.YT.Player(mountEl, {
      height: "100%",
      width: "100%",
      videoId: initialVideoId,
      playerVars: {
        autoplay: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        enablejsapi: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: any) => {
          playerReadyRef.current = true;
          const latestId = currentVideoIdRef.current;
          if (latestId && latestId !== initialVideoId) {
            event.target.loadVideoById(latestId);
          }
          event.target.playVideo?.();
          setIsPlaying(true);
        },
        onStateChange: (event: any) => {
          const state = event.data;
          if (state === window.YT.PlayerState.PLAYING) {
            lastEndedVideoIdRef.current = null;
            setIsPlaying(true);
          } else if (state === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          } else if (state === window.YT.PlayerState.CUED) {
            event.target.playVideo?.();
            setIsPlaying(true);
          } else if (state === window.YT.PlayerState.ENDED) {
            triggerAutoNext();
          }
        },
        onError: () => {
          setTimeout(() => {
            triggerAutoNext();
          }, 800);
        },
      },
    });
  }, [currentTrack, apiReady]);

  // Fallback polling for ENDED state (handles background tab throttling on mobile/desktop)
  useEffect(() => {
    if (!currentTrack || !apiReady) return;
    const timer = setInterval(() => {
      if (!playerRef.current || !playerReadyRef.current) return;
      try {
        const state = playerRef.current.getPlayerState?.();
        if (state === 0) {
          triggerAutoNext();
        }
      } catch {}
    }, 1000);
    return () => clearInterval(timer);
  }, [currentTrack, apiReady]);

  // Cleanup player when closed
  useEffect(() => {
    if (!currentTrack && playerRef.current) {
      try {
        playerRef.current.destroy?.();
      } catch {}
      playerRef.current = null;
      playerReadyRef.current = false;
      currentVideoIdRef.current = null;
      lastEndedVideoIdRef.current = null;
      if (wrapperRef.current) {
        wrapperRef.current.innerHTML = "";
      }
    }
  }, [currentTrack]);

  if (!currentTrack) return null;

  // Hide mini player if already watching the exact same video on /watch/[id]
  const isOnSameWatchPage = pathname === `/watch/${currentTrack.id}`;

  const togglePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo?.();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo?.();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute?.();
      setIsMuted(false);
    } else {
      playerRef.current.mute?.();
      setIsMuted(true);
    }
  };

  return (
    <>
      {/* Floating Video Preview Window (Visible in Video Mode, hidden in Music Mode but kept in DOM at >=200x200 so audio & next-track autoplay work continuously on mobile & desktop) */}
      <div
        className={`fixed transition-all duration-300 overflow-hidden shadow-2xl border border-zinc-700/80 bg-black ${
          streamMode === "video" && !isOnSameWatchPage
            ? "z-50 bottom-32 md:bottom-24 right-3 sm:right-6 w-64 sm:w-80 aspect-video rounded-2xl opacity-100 pointer-events-auto"
            : "-z-10 bottom-0 right-0 w-[200px] h-[200px] opacity-[0.001] pointer-events-none"
        }`}
      >
        <div ref={wrapperRef} className="w-full h-full" />
      </div>

      {/* Bottom Music & Video Streaming Control Dock */}
      {!isOnSameWatchPage && (
        <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/90 px-3 sm:px-6 py-2.5 shadow-2xl">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
            {/* Left: Spinning Track Artwork + Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-zinc-800 shrink-0 shadow-md">
                <img
                  src={currentTrack.thumbnailUrl}
                  alt={currentTrack.title}
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    isPlaying ? "scale-105" : "scale-100 opacity-80"
                  }`}
                />
                {/* Equalizer animation overlay */}
                {isPlaying && (
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center gap-0.5">
                    <span className="w-1 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="w-1 h-4 bg-red-400 rounded-full animate-bounce" />
                    <span className="w-1 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/watch/${currentTrack.id}`}
                  className="block text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate hover:text-red-500 transition-colors"
                >
                  {currentTrack.title}
                </Link>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {currentTrack.channelTitle}
                </p>
              </div>
            </div>

            {/* Center: Playback Controls (Prev / Play-Pause / Next) */}
            <div className="flex items-center gap-1.5 sm:gap-3">
              <button
                onClick={playPrevious}
                className="p-2 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
                title="Previous Track"
                aria-label="Previous Track"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={togglePlayPause}
                className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-600/25 transition-transform active:scale-95"
                title={isPlaying ? "Pause" : "Play"}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-white" />
                ) : (
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                )}
              </button>

              <button
                onClick={playNext}
                className="p-2 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
                title="Next Track"
                aria-label="Next Track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Mode Switch (Music vs Video), Mute, Fullscreen & Close */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-1">
              <button
                onClick={() =>
                  setStreamMode(streamMode === "music" ? "video" : "music")
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  streamMode === "music"
                    ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                    : "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
                }`}
                title="Switch between Music Stream and Mini Video"
              >
                {streamMode === "music" ? (
                  <>
                    <Headphones className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Music Mode</span>
                  </>
                ) : (
                  <>
                    <Tv className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Video Mode</span>
                  </>
                )}
              </button>

              <button
                onClick={toggleMute}
                className="hidden sm:inline-flex p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-red-500" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <Link
                href={`/watch/${currentTrack.id}`}
                className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Open Full Watch Page"
              >
                <Maximize2 className="w-4 h-4" />
              </Link>

              <button
                onClick={closePlayer}
                className="p-2 rounded-full text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Close Player"
                aria-label="Close Player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
