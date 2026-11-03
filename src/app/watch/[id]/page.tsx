"use client";

import React, { useEffect, useState, useRef, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ThumbsUp,
  Bookmark,
  Check,
  Share2,
  Maximize2,
  Minimize2,
  MessageSquare,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Headphones,
  Loader2,
  SkipForward,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  fetchVideoDetails,
  fetchVideoComments,
  fetchPopularVideos,
  formatViewCount,
  formatCompactNumber,
  formatTimeAgo,
} from "@/lib/youtube";
import { VideoItem, CommentItem } from "@/types/youtube";
import VideoCard from "@/components/VideoCard";
import {
  installMobileBackgroundSupport,
  startBackgroundAudioKeepAlive,
  stopBackgroundAudioKeepAlive,
  updateLockScreenMediaSession,
  updateMediaSessionPlaybackState,
  updateMediaSessionPosition,
  wasRecentlyBackgrounded,
} from "@/lib/backgroundAudio";

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: videoId } = use(params);
  const {
    apiKey,
    toggleSaveVideo,
    isVideoSaved,
    addToHistory,
    playTrack,
    closePlayer,
    queue,
    setQueue,
  } = useApp();
  const router = useRouter();

  const [video, setVideo] = useState<VideoItem | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<VideoItem[]>([]);
  const [relatedPageToken, setRelatedPageToken] = useState<string | undefined>(undefined);
  const [loadingMoreRelated, setLoadingMoreRelated] = useState<boolean>(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [theaterMode, setTheaterMode] = useState<boolean>(false);
  const [descExpanded, setDescExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(true);
  const [apiReady, setApiReady] = useState<boolean>(false);

  const playerWrapperRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);
  const currentVideoIdRef = useRef<string>(videoId);
  const lastEndedVideoIdRef = useRef<string | null>(null);
  const userIntendedPlayRef = useRef<boolean>(true);
  const playedIdsRef = useRef<Set<string>>(new Set([videoId]));
  const relatedVideosRef = useRef<VideoItem[]>([]);
  const queueRef = useRef<VideoItem[]>(queue);
  const autoPlayNextRef = useRef<boolean>(autoPlayNext);

  useEffect(() => {
    currentVideoIdRef.current = videoId;
    playedIdsRef.current.add(videoId);
    userIntendedPlayRef.current = true;
    startBackgroundAudioKeepAlive();
  }, [videoId]);

  useEffect(() => {
    relatedVideosRef.current = relatedVideos;
  }, [relatedVideos]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    autoPlayNextRef.current = autoPlayNext;
  }, [autoPlayNext]);

  const forceResumeWatchPlayback = useCallback(() => {
    if (!userIntendedPlayRef.current) return;
    startBackgroundAudioKeepAlive();
    updateMediaSessionPlaybackState(true);
    const delays = [0, 120, 350, 800, 1600, 2800];
    delays.forEach((ms) => {
      setTimeout(() => {
        if (!userIntendedPlayRef.current || !playerRef.current) return;
        try {
          playerRef.current.playVideo?.();
          startBackgroundAudioKeepAlive();
          updateMediaSessionPlaybackState(true);
        } catch {}
      }, ms);
    });
  }, []);

  useEffect(() => {
    return installMobileBackgroundSupport(() => {
      if (userIntendedPlayRef.current) {
        forceResumeWatchPlayback();
      }
    });
  }, [forceResumeWatchPlayback]);

  const handlePlayNextVideo = useCallback(
    (force = false) => {
      if (!force && !autoPlayNextRef.current) return;

      const activeId = currentVideoIdRef.current;
      if (!force && lastEndedVideoIdRef.current === activeId) return;
      lastEndedVideoIdRef.current = activeId;

      const relList = relatedVideosRef.current;
      const globalQueue = queueRef.current;

      // 1. Pick the first unplayed video from Up Next (relatedVideos)
      let nextVideo = relList.find(
        (v) => v.id !== activeId && !playedIdsRef.current.has(v.id)
      );

      // 2. Fallback to next video in global queue
      if (!nextVideo && globalQueue.length > 0) {
        const idx = globalQueue.findIndex((v) => v.id === activeId);
        if (idx >= 0 && idx + 1 < globalQueue.length) {
          nextVideo = globalQueue[idx + 1];
        } else {
          nextVideo = globalQueue.find(
            (v) => v.id !== activeId && !playedIdsRef.current.has(v.id)
          );
        }
      }

      // 3. Fallback to first item in relatedVideos or globalQueue
      if (!nextVideo) {
        playedIdsRef.current.clear();
        playedIdsRef.current.add(activeId);
        nextVideo =
          relList.find((v) => v.id !== activeId) ||
          globalQueue.find((v) => v.id !== activeId);
      }

      if (nextVideo) {
        playedIdsRef.current.add(nextVideo.id);
        userIntendedPlayRef.current = true;
        startBackgroundAudioKeepAlive();
        router.push(`/watch/${nextVideo.id}`);
      }
    },
    [router]
  );

  const handlePlayNextRef = useRef(handlePlayNextVideo);
  useEffect(() => {
    handlePlayNextRef.current = handlePlayNextVideo;
  }, [handlePlayNextVideo]);

  // Register Lock-Screen MediaSession when video metadata loads on WatchPage
  useEffect(() => {
    if (!video) return;
    updateLockScreenMediaSession(
      video,
      {
        onPlay: () => {
          userIntendedPlayRef.current = true;
          startBackgroundAudioKeepAlive();
          playerRef.current?.playVideo?.();
          updateMediaSessionPlaybackState(true);
        },
        onPause: () => {
          userIntendedPlayRef.current = false;
          stopBackgroundAudioKeepAlive();
          playerRef.current?.pauseVideo?.();
          updateMediaSessionPlaybackState(false);
        },
        onNext: () => {
          userIntendedPlayRef.current = true;
          startBackgroundAudioKeepAlive();
          handlePlayNextRef.current(true);
        },
        onSeekTo: (seconds: number) => {
          playerRef.current?.seekTo?.(seconds, true);
        },
      },
      true
    );
  }, [video]);

  // Load YouTube IFrame API script
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

  // Initialize or update YT Player on Watch Page
  useEffect(() => {
    if (!apiReady || typeof window === "undefined") return;

    currentVideoIdRef.current = videoId;
    lastEndedVideoIdRef.current = null;
    userIntendedPlayRef.current = true;

    if (playerRef.current) {
      if (
        playerReadyRef.current &&
        typeof playerRef.current.loadVideoById === "function"
      ) {
        playerRef.current.loadVideoById(videoId);
        playerRef.current.playVideo?.();
        startBackgroundAudioKeepAlive();
      }
      return;
    }

    if (!playerWrapperRef.current) return;
    playerWrapperRef.current.innerHTML = "";
    const mountEl = document.createElement("div");
    mountEl.style.width = "100%";
    mountEl.style.height = "100%";
    playerWrapperRef.current.appendChild(mountEl);

    const initialVideoId = videoId;
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
          startBackgroundAudioKeepAlive();
          updateMediaSessionPlaybackState(true);
        },
        onStateChange: (event: any) => {
          const state = event.data;
          if (state === window.YT.PlayerState.PLAYING) {
            lastEndedVideoIdRef.current = null;
            userIntendedPlayRef.current = true;
            startBackgroundAudioKeepAlive();
            updateMediaSessionPlaybackState(true);
          } else if (state === window.YT.PlayerState.PAUSED) {
            // If paused because mobile screen just locked or tab backgrounded, auto-resume!
            if (userIntendedPlayRef.current && wasRecentlyBackgrounded(4500)) {
              try {
                event.target.playVideo?.();
              } catch {}
              forceResumeWatchPlayback();
            } else {
              userIntendedPlayRef.current = false;
              stopBackgroundAudioKeepAlive();
              updateMediaSessionPlaybackState(false);
            }
          } else if (state === window.YT.PlayerState.CUED) {
            if (userIntendedPlayRef.current) {
              event.target.playVideo?.();
              startBackgroundAudioKeepAlive();
            }
          } else if (state === window.YT.PlayerState.ENDED) {
            handlePlayNextRef.current(false);
          }
        },
      },
    });
  }, [videoId, apiReady, forceResumeWatchPlayback]);

  // Polling for ENDED state, lock-screen auto-resume, and MediaSession position on Watch Page
  useEffect(() => {
    if (!apiReady) return;
    const timer = setInterval(() => {
      if (!playerRef.current || !playerReadyRef.current) return;
      try {
        const state = playerRef.current.getPlayerState?.();
        if (state === 0) {
          handlePlayNextRef.current(false);
        } else if (
          state === 2 &&
          userIntendedPlayRef.current &&
          wasRecentlyBackgrounded(5000)
        ) {
          playerRef.current.playVideo?.();
          startBackgroundAudioKeepAlive();
          updateMediaSessionPlaybackState(true);
        } else if (state === 1) {
          const duration = playerRef.current.getDuration?.() ?? 0;
          const currentTime = playerRef.current.getCurrentTime?.() ?? 0;
          updateMediaSessionPosition(duration, currentTime);
        }
      } catch {}
    }, 1000);
    return () => clearInterval(timer);
  }, [apiReady]);

  // Destroy Watch Page player on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy?.();
        } catch {}
        playerRef.current = null;
        playerReadyRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    closePlayer();
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function loadWatchData() {
      const [detailsRes, commentsRes] = await Promise.all([
        fetchVideoDetails(videoId, apiKey),
        fetchVideoComments(videoId, apiKey),
      ]);

      if (cancelled) return;

      if (detailsRes.video) {
        setVideo(detailsRes.video);
        addToHistory(detailsRes.video);

        // Fetch related videos based on video title
        const queryTopic = detailsRes.video.title
          .split(" ")
          .slice(0, 3)
          .join(" ");
        const relatedRes = await fetchPopularVideos({
          apiKey,
          query: queryTopic,
          maxResults: 12,
        });
        if (!cancelled) {
          const filteredRelated = relatedRes.videos.filter((v) => v.id !== videoId);
          setRelatedVideos(filteredRelated);
          setRelatedPageToken(relatedRes.nextPageToken);
          if (filteredRelated.length > 0) {
            setQueue([detailsRes.video, ...filteredRelated]);
          }
        }
      }
      setComments(commentsRes.comments);
    }

    loadWatchData();
    return () => {
      cancelled = true;
    };
  }, [videoId, apiKey, addToHistory, closePlayer, setQueue]);

  const handleLoadMoreRelated = async () => {
    if (loadingMoreRelated || !video) return;
    setLoadingMoreRelated(true);
    try {
      const queryTopic = video.title
        .split(" ")
        .slice(0, 3)
        .join(" ");
      const res = await fetchPopularVideos({
        apiKey,
        query: relatedPageToken ? queryTopic : undefined,
        maxResults: 10,
        pageToken: relatedPageToken,
      });

      if (res.videos.length > 0) {
        setRelatedVideos((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          existingIds.add(videoId);
          const uniqueNew = res.videos.filter((v) => !existingIds.has(v.id));
          return [...prev, ...uniqueNew];
        });
        setRelatedPageToken(res.nextPageToken);
      }
    } finally {
      setLoadingMoreRelated(false);
    }
  };

  const saved = video ? isVideoSaved(video.id) : false;

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleContinueInMusicBar = () => {
    if (!video) return;
    playTrack(video, "music", [video, ...relatedVideos]);
    router.push("/");
  };

  return (
    <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5">
      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Feed
        </Link>

        <div className="flex items-center gap-2">
          {relatedVideos.length > 0 && (
            <button
              type="button"
              onClick={() => handlePlayNextVideo(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
              title="Play Next Video in Queue"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Next Video</span>
            </button>
          )}

          {video && (
            <button
              onClick={handleContinueInMusicBar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-xs transition-colors"
              title="Minimize into the persistent Music Stream bar and keep browsing"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Background Music Mode</span>
            </button>
          )}

          <button
            onClick={() => setTheaterMode(!theaterMode)}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            title="Toggle Theater Mode"
          >
            {theaterMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" /> Default View
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" /> Theater Mode
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 ${
          theaterMode ? "lg:grid-cols-1" : "lg:grid-cols-3"
        } gap-6 sm:gap-7`}
      >
        {/* Left / Main Column: Video Player + Info + Comments */}
        <div className={theaterMode ? "w-full" : "lg:col-span-2 space-y-4 sm:space-y-5"}>
          {/* Ad-Free Video Player with Autoplay-Next Support */}
          <div
            className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 ${
              theaterMode ? "max-h-[78vh]" : ""
            }`}
          >
            <div ref={playerWrapperRef} className="w-full h-full" />
          </div>

          {/* Video Title & Actions */}
          {video && (
            <div className="space-y-4 pt-1">
              <h1 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-white leading-snug">
                {video.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
                {/* Channel Info with Real Channel Avatar */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-red-600 to-rose-700 text-white font-bold text-sm flex items-center justify-center shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-800">
                    {video.channelAvatar ? (
                      <img
                        src={video.channelAvatar}
                        alt={video.channelTitle}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (video.channelTitle || "P")[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {video.channelTitle}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Verified Artist / Creator
                    </p>
                  </div>
                </div>

                {/* Action Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {video.likeCount && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200">
                      <ThumbsUp className="w-3.5 h-3.5 text-red-500" />
                      <span>{formatCompactNumber(video.likeCount)}</span>
                    </div>
                  )}

                  <button
                    onClick={() => toggleSaveVideo(video)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors ${
                      saved
                        ? "bg-red-600 text-white"
                        : "bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    {saved ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Saved
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5" /> Save
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/90 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copied ? "Copied!" : "Share"}</span>
                  </button>
                </div>
              </div>

              {/* Description Card */}
              <div className="p-4 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/90 border border-zinc-200/60 dark:border-zinc-800/80 text-xs space-y-2">
                <div className="flex items-center gap-3 font-semibold text-zinc-900 dark:text-zinc-100">
                  <span>{formatViewCount(video.viewCount)}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(video.publishedAt)}</span>
                </div>
                <p
                  className={`text-zinc-600 dark:text-zinc-300 whitespace-pre-line leading-relaxed ${
                    descExpanded ? "" : "line-clamp-3"
                  }`}
                >
                  {video.description || "No description provided for this video."}
                </p>
                {video.description && video.description.length > 160 && (
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="inline-flex items-center gap-1 font-semibold text-zinc-900 dark:text-white pt-1 hover:underline"
                  >
                    {descExpanded ? (
                      <>
                        Show less <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Show more <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Comments Section */}
              <div className="pt-2 space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-red-500" />
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Comments ({comments.length})
                  </h2>
                </div>

                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="flex gap-3 p-3.5 rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden">
                        {comment.authorAvatar ? (
                          <img
                            src={comment.authorAvatar}
                            alt={comment.authorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (comment.authorName || "U")[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {comment.authorName}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {formatTimeAgo(comment.publishedAt)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed break-words">
                          {comment.textDisplay}
                        </p>
                        {comment.likeCount > 0 && (
                          <div className="flex items-center gap-1 text-[11px] text-zinc-400 pt-1">
                            <ThumbsUp className="w-3 h-3" />
                            <span>{comment.likeCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Up Next / Related Videos */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Up Next in Queue
            </h2>
            <button
              type="button"
              onClick={() => setAutoPlayNext(!autoPlayNext)}
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300"
              title="Automatically play next video when current video ends"
            >
              <span>Autoplay</span>
              <span
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  autoPlayNext ? "bg-red-600" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    autoPlayNext ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </span>
            </button>
          </div>
          <div className="space-y-1.5">
            {relatedVideos.map((relVideo) => (
              <VideoCard
                key={relVideo.id}
                video={relVideo}
                compact
                playlist={relatedVideos}
              />
            ))}
          </div>

          {relatedVideos.length > 0 && (
            <div className="pt-2 px-2">
              <button
                type="button"
                onClick={handleLoadMoreRelated}
                disabled={loadingMoreRelated}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-zinc-200/80 dark:bg-zinc-800/90 hover:bg-red-600 hover:text-white dark:hover:bg-red-600 text-zinc-700 dark:text-zinc-200 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
              >
                {loadingMoreRelated ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading more videos...</span>
                  </>
                ) : (
                  <span>Load More Videos</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
