"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
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
  Smartphone,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  installMobileBackgroundSupport,
  isPageActuallyHidden,
  pauseDummyKeepAliveAudio,
  startBackgroundAudioKeepAlive,
  stopBackgroundAudioKeepAlive,
  unlockAudioElementOnGesture,
  updateLockScreenMediaSession,
  updateMediaSessionPlaybackState,
  updateMediaSessionPosition,
  wasRecentlyBackgrounded,
} from "@/lib/backgroundAudio";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const total = Math.floor(sec);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const currentVideoIdRef = useRef<string | null>(null);
  const lastEndedVideoIdRef = useRef<string | null>(null);
  const userIntendedPlayRef = useRef<boolean>(true);
  const streamModeRef = useRef(streamMode);
  const useIframeFallbackRef = useRef<boolean>(false);
  const lockScreenHandoffActiveRef = useRef<boolean>(false);
  const currentTimeRef = useRef<number>(0);

  const playNextRef = useRef(playNext);
  const playPreviousRef = useRef(playPrevious);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [apiReady, setApiReady] = useState<boolean>(false);
  const [useIframeFallback, setUseIframeFallback] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    streamModeRef.current = streamMode;
  }, [streamMode]);

  useEffect(() => {
    useIframeFallbackRef.current = useIframeFallback;
  }, [useIframeFallback]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  useEffect(() => {
    playPreviousRef.current = playPrevious;
  }, [playPrevious]);

  // Unlock persistent <audio> element on first user touch/click for iOS Safari & Android lock screen
  useEffect(() => {
    return unlockAudioElementOnGesture(audioRef.current);
  }, []);

  const isUsingNativeAudio = useCallback(() => {
    if (useIframeFallbackRef.current) return false;
    return streamModeRef.current === "music" || lockScreenHandoffActiveRef.current;
  }, []);

  const triggerAutoNext = useCallback(() => {
    const activeId = currentVideoIdRef.current;
    if (!activeId) return;
    if (lastEndedVideoIdRef.current === activeId) return;
    lastEndedVideoIdRef.current = activeId;
    userIntendedPlayRef.current = true;
    playNextRef.current();
  }, []);

  const seekToSeconds = useCallback(
    (seconds: number) => {
      const target = Math.max(0, seconds);
      currentTimeRef.current = target;
      setCurrentTime(target);

      if (isUsingNativeAudio() && audioRef.current) {
        try {
          audioRef.current.currentTime = target;
        } catch {}
      } else if (playerRef.current) {
        try {
          playerRef.current.seekTo?.(target, true);
        } catch {}
      }
    },
    [isUsingNativeAudio]
  );

  // Mobile lock-screen & background visibility listener:
  // Hands off video playback to native <audio> when locking the screen, and keeps native <audio> playing!
  useEffect(() => {
    return installMobileBackgroundSupport(
      () => {
        // Screen locked or browser minimized
        if (!userIntendedPlayRef.current || !currentVideoIdRef.current) return;

        if (!useIframeFallbackRef.current && audioRef.current) {
          // If user was in Video Mode, hand off to native <audio> at exact timestamp so lock screen keeps playing
          if (streamModeRef.current === "video" && !lockScreenHandoffActiveRef.current) {
            lockScreenHandoffActiveRef.current = true;
            const ytTime =
              playerRef.current?.getCurrentTime?.() || currentTimeRef.current || 0;
            try {
              playerRef.current?.pauseVideo?.();
            } catch {}
            const expectedSrc = `/api/audio?id=${currentVideoIdRef.current}`;
            if (!audioRef.current.src.includes(expectedSrc)) {
              audioRef.current.src = expectedSrc;
            }
            try {
              if (ytTime > 0) {
                audioRef.current.currentTime = ytTime;
              }
            } catch {}
          }

          pauseDummyKeepAliveAudio();
          audioRef.current.play().catch(() => {});
          updateMediaSessionPlaybackState(true);
          setIsPlaying(true);
        } else if (playerRef.current) {
          // Fallback if native audio is unavailable for this video
          startBackgroundAudioKeepAlive(true);
          const delays = [0, 150, 400, 900, 1800];
          delays.forEach((ms) => {
            setTimeout(() => {
              if (!userIntendedPlayRef.current || !playerRef.current) return;
              try {
                playerRef.current.playVideo?.();
                updateMediaSessionPlaybackState(true);
              } catch {}
            }, ms);
          });
        }
      },
      () => {
        // Screen unlocked / returned to foreground
        if (
          lockScreenHandoffActiveRef.current &&
          streamModeRef.current === "video" &&
          !useIframeFallbackRef.current
        ) {
          lockScreenHandoffActiveRef.current = false;
          const audioTime = audioRef.current?.currentTime || currentTimeRef.current || 0;
          try {
            audioRef.current?.pause();
          } catch {}
          if (playerRef.current && userIntendedPlayRef.current) {
            try {
              playerRef.current.seekTo?.(audioTime, true);
              playerRef.current.playVideo?.();
            } catch {}
          }
        }
      }
    );
  }, []);

  // Load YouTube IFrame API script once (for Video Mode and fallback)
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

  // Handle track changes: start Native <audio> in Music Mode (or preload it in Video Mode)
  useEffect(() => {
    if (!currentTrack || typeof window === "undefined") return;

    const isNewTrack = currentVideoIdRef.current !== currentTrack.id;
    currentVideoIdRef.current = currentTrack.id;
    lastEndedVideoIdRef.current = null;
    userIntendedPlayRef.current = true;

    if (isNewTrack) {
      setUseIframeFallback(false);
      useIframeFallbackRef.current = false;
      lockScreenHandoffActiveRef.current = isPageActuallyHidden();
      currentTimeRef.current = 0;
      setCurrentTime(0);
      setDuration(0);
    }

    // Configure OS Lock-Screen MediaSession controls
    updateLockScreenMediaSession(
      currentTrack,
      {
        onPlay: () => {
          userIntendedPlayRef.current = true;
          if (!useIframeFallbackRef.current && (streamModeRef.current === "music" || isPageActuallyHidden() || lockScreenHandoffActiveRef.current)) {
            pauseDummyKeepAliveAudio();
            audioRef.current?.play().catch(() => {});
          } else {
            startBackgroundAudioKeepAlive(true);
            playerRef.current?.playVideo?.();
          }
          setIsPlaying(true);
          updateMediaSessionPlaybackState(true);
        },
        onPause: () => {
          userIntendedPlayRef.current = false;
          stopBackgroundAudioKeepAlive();
          audioRef.current?.pause();
          try {
            playerRef.current?.pauseVideo?.();
          } catch {}
          setIsPlaying(false);
          updateMediaSessionPlaybackState(false);
        },
        onPrevious: () => {
          userIntendedPlayRef.current = true;
          playPreviousRef.current();
        },
        onNext: () => {
          userIntendedPlayRef.current = true;
          playNextRef.current();
        },
        onSeekTo: (seconds: number) => {
          seekToSeconds(seconds);
        },
        onSeekOffset: (delta: number) => {
          seekToSeconds((currentTimeRef.current || 0) + delta);
        },
      },
      true
    );

    if (audioRef.current) {
      const targetSrc = `/api/audio?id=${currentTrack.id}`;
      if (!audioRef.current.src.includes(targetSrc)) {
        audioRef.current.src = targetSrc;
        audioRef.current.load();
      }
      audioRef.current.muted = isMuted;

      if (streamModeRef.current === "music" || isPageActuallyHidden()) {
        pauseDummyKeepAliveAudio();
        try {
          playerRef.current?.pauseVideo?.();
        } catch {}
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            updateMediaSessionPlaybackState(true);
          })
          .catch(() => {
            // If native audio fails to play, onError or fallback will handle it
          });
      } else {
        audioRef.current.pause();
      }
    }
  }, [currentTrack, seekToSeconds]);

  // Synchronize switching between Music Mode (native <audio>) and Video Mode (YouTube IFrame)
  useEffect(() => {
    if (!currentTrack || typeof window === "undefined") return;

    if (useIframeFallback) {
      // Using YouTube IFrame as fallback
      try {
        audioRef.current?.pause();
      } catch {}
      startBackgroundAudioKeepAlive(true);
      if (playerRef.current && playerReadyRef.current) {
        try {
          if (currentTimeRef.current > 1) {
            playerRef.current.seekTo?.(currentTimeRef.current, true);
          }
          if (userIntendedPlayRef.current) {
            playerRef.current.playVideo?.();
            setIsPlaying(true);
          }
        } catch {}
      }
      return;
    }

    if (streamMode === "music") {
      lockScreenHandoffActiveRef.current = false;
      const syncTime =
        playerRef.current?.getCurrentTime?.() || currentTimeRef.current || 0;
      try {
        playerRef.current?.pauseVideo?.();
      } catch {}
      pauseDummyKeepAliveAudio();

      if (audioRef.current) {
        const targetSrc = `/api/audio?id=${currentTrack.id}`;
        if (!audioRef.current.src.includes(targetSrc)) {
          audioRef.current.src = targetSrc;
        }
        if (syncTime > 1 && Math.abs((audioRef.current.currentTime || 0) - syncTime) > 1.5) {
          try {
            audioRef.current.currentTime = syncTime;
          } catch {}
        }
        if (userIntendedPlayRef.current) {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
          updateMediaSessionPlaybackState(true);
        }
      }
    } else {
      // Switched to Video Mode
      const syncTime = audioRef.current?.currentTime || currentTimeRef.current || 0;
      try {
        audioRef.current?.pause();
      } catch {}
      if (playerRef.current && playerReadyRef.current) {
        try {
          if (syncTime > 1) {
            playerRef.current.seekTo?.(syncTime, true);
          }
          if (userIntendedPlayRef.current) {
            playerRef.current.playVideo?.();
            setIsPlaying(true);
          }
        } catch {}
      }
    }
  }, [streamMode, useIframeFallback, currentTrack]);

  // Initialize or update YT player when in Video Mode or when native audio falls back
  useEffect(() => {
    if (!currentTrack || !apiReady || typeof window === "undefined") return;
    const shouldRunYtPlayer = streamMode === "video" || useIframeFallback;
    if (!shouldRunYtPlayer) return;

    if (playerRef.current) {
      if (
        playerReadyRef.current &&
        typeof playerRef.current.loadVideoById === "function"
      ) {
        playerRef.current.loadVideoById({
          videoId: currentTrack.id,
          startSeconds: currentTimeRef.current > 1 ? currentTimeRef.current : 0,
        });
        if (userIntendedPlayRef.current) {
          playerRef.current.playVideo?.();
          setIsPlaying(true);
        } else {
          playerRef.current.pauseVideo?.();
        }
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
          if (currentTimeRef.current > 1) {
            event.target.seekTo?.(currentTimeRef.current, true);
          }
          if (
            userIntendedPlayRef.current &&
            (streamModeRef.current === "video" || useIframeFallbackRef.current)
          ) {
            event.target.playVideo?.();
            setIsPlaying(true);
            updateMediaSessionPlaybackState(true);
          } else {
            event.target.pauseVideo?.();
          }
        },
        onStateChange: (event: any) => {
          if (isUsingNativeAudio()) return;
          const state = event.data;
          if (state === window.YT.PlayerState.PLAYING) {
            lastEndedVideoIdRef.current = null;
            setIsPlaying(true);
            updateMediaSessionPlaybackState(true);
          } else if (state === window.YT.PlayerState.PAUSED) {
            if (userIntendedPlayRef.current && wasRecentlyBackgrounded(4500)) {
              try {
                event.target.playVideo?.();
              } catch {}
              setIsPlaying(true);
            } else {
              userIntendedPlayRef.current = false;
              setIsPlaying(false);
              stopBackgroundAudioKeepAlive();
              updateMediaSessionPlaybackState(false);
            }
          } else if (state === window.YT.PlayerState.ENDED) {
            triggerAutoNext();
          }
        },
        onError: () => {
          if (!isUsingNativeAudio()) {
            setTimeout(() => {
              triggerAutoNext();
            }, 800);
          }
        },
      },
    });
  }, [currentTrack, apiReady, streamMode, useIframeFallback, isUsingNativeAudio, triggerAutoNext]);

  // Poll YT player position only when YT player is active
  useEffect(() => {
    if (!currentTrack || !apiReady) return;
    const timer = setInterval(() => {
      if (isUsingNativeAudio()) return;
      if (!playerRef.current || !playerReadyRef.current) return;
      try {
        const state = playerRef.current.getPlayerState?.();
        if (state === 0) {
          triggerAutoNext();
        } else if (state === 1) {
          const dur = playerRef.current.getDuration?.() ?? 0;
          const cur = playerRef.current.getCurrentTime?.() ?? 0;
          currentTimeRef.current = cur;
          setCurrentTime(cur);
          if (dur > 0) setDuration(dur);
          updateMediaSessionPosition(dur, cur);
        }
      } catch {}
    }, 1000);
    return () => clearInterval(timer);
  }, [currentTrack, apiReady, isUsingNativeAudio, triggerAutoNext]);

  // Cleanup when player is closed
  useEffect(() => {
    if (!currentTrack) {
      stopBackgroundAudioKeepAlive();
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.removeAttribute("src");
        } catch {}
      }
      if (playerRef.current) {
        try {
          playerRef.current.destroy?.();
        } catch {}
        playerRef.current = null;
        playerReadyRef.current = false;
      }
      currentVideoIdRef.current = null;
      lastEndedVideoIdRef.current = null;
      if (wrapperRef.current) {
        wrapperRef.current.innerHTML = "";
      }
    }
  }, [currentTrack]);

  const togglePlayPause = () => {
    if (isPlaying) {
      userIntendedPlayRef.current = false;
      stopBackgroundAudioKeepAlive();
      audioRef.current?.pause();
      try {
        playerRef.current?.pauseVideo?.();
      } catch {}
      setIsPlaying(false);
      updateMediaSessionPlaybackState(false);
    } else {
      userIntendedPlayRef.current = true;
      if (isUsingNativeAudio() && audioRef.current) {
        pauseDummyKeepAliveAudio();
        audioRef.current.play().catch(() => {});
      } else {
        startBackgroundAudioKeepAlive(true);
        playerRef.current?.playVideo?.();
      }
      setIsPlaying(true);
      updateMediaSessionPlaybackState(true);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }
    if (playerRef.current) {
      if (nextMuted) {
        playerRef.current.mute?.();
      } else {
        playerRef.current.unMute?.();
      }
    }
  };

  const isOnSameWatchPage = currentTrack ? pathname === `/watch/${currentTrack.id}` : false;

  return (
    <>
      {/* Persistent Native HTML5 <audio> Element — enables 100% uninterrupted mobile lock-screen playback */}
      <audio
        ref={audioRef}
        playsInline
        preload="auto"
        className="hidden"
        onPlay={() => {
          if (!isUsingNativeAudio()) return;
          setIsPlaying(true);
          pauseDummyKeepAliveAudio();
          updateMediaSessionPlaybackState(true);
        }}
        onPause={() => {
          if (!isUsingNativeAudio()) return;
          // If mobile browser momentarily paused <audio> during screen lock transition, immediately resume!
          if (
            userIntendedPlayRef.current &&
            !audioRef.current?.ended &&
            wasRecentlyBackgrounded(2500)
          ) {
            audioRef.current?.play().catch(() => {});
            return;
          }
          if (!userIntendedPlayRef.current) {
            setIsPlaying(false);
            updateMediaSessionPlaybackState(false);
          }
        }}
        onTimeUpdate={(e) => {
          if (!isUsingNativeAudio()) return;
          const el = e.currentTarget;
          const cur = el.currentTime || 0;
          const dur = Number.isFinite(el.duration) ? el.duration : 0;
          currentTimeRef.current = cur;
          setCurrentTime(cur);
          if (dur > 0) {
            setDuration(dur);
            updateMediaSessionPosition(dur, cur);
          }
        }}
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          if (Number.isFinite(dur) && dur > 0) {
            setDuration(dur);
          }
        }}
        onEnded={() => {
          if (!isUsingNativeAudio()) return;
          triggerAutoNext();
        }}
        onError={() => {
          if (!currentTrack) return;
          // Seamlessly fall back to YouTube IFrame if direct stream is unavailable (e.g. live stream)
          setUseIframeFallback(true);
          useIframeFallbackRef.current = true;
        }}
      />

      {currentTrack && (
        <>
          {/* Floating Video Preview Window */}
          <div
            className={`fixed transition-all duration-300 overflow-hidden shadow-2xl border border-zinc-700/80 bg-black ${
              streamMode === "video" && !isOnSameWatchPage
                ? "z-50 bottom-36 md:bottom-24 right-3 sm:right-6 w-64 sm:w-80 aspect-video rounded-2xl opacity-100 pointer-events-auto"
                : "z-50 bottom-16 md:bottom-2 left-3 sm:left-6 w-11 h-11 rounded-xl opacity-[0.01] pointer-events-none"
            }`}
          >
            <div ref={wrapperRef} className="w-full h-full" />
          </div>

          {/* Bottom Music & Video Streaming Control Dock */}
          {!isOnSameWatchPage && (
            <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-200/80 dark:border-zinc-800/90 px-3 sm:px-6 pt-1.5 pb-2.5 shadow-2xl">
              {/* Interactive Lock-Screen Synced Progress Bar */}
              <div className="max-w-[1600px] mx-auto flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400 w-8 text-right">
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration > 0 ? duration : 100}
                  step={0.5}
                  value={duration > 0 ? Math.min(currentTime, duration) : 0}
                  onChange={(e) => seekToSeconds(parseFloat(e.target.value))}
                  aria-label="Seek audio position"
                  className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
                <span className="text-[10px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400 w-8">
                  {duration > 0 ? formatTime(duration) : "--:--"}
                </span>
              </div>

              <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
                {/* Left: Track Artwork + Title + Lock-Screen Ready Badge */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-zinc-800 shrink-0 shadow-md">
                    <img
                      src={currentTrack.thumbnailUrl}
                      alt={currentTrack.title}
                      className={`w-full h-full object-cover transition-transform duration-700 ${
                        isPlaying ? "scale-105" : "scale-100 opacity-80"
                      }`}
                    />
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
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {currentTrack.channelTitle}
                      </p>
                      {!useIframeFallback && (
                        <span className="hidden xs:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-semibold shrink-0">
                          <Smartphone className="w-2.5 h-2.5" />
                          Lock-Screen Active
                        </span>
                      )}
                    </div>
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
                    title="Switch between Lock-Screen Music Stream and Mini Video"
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
      )}
    </>
  );
}
