"use client";

import React, { useEffect, useState, use } from "react";
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

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: videoId } = use(params);
  const { apiKey, toggleSaveVideo, isVideoSaved, addToHistory, playTrack } = useApp();
  const router = useRouter();

  const [video, setVideo] = useState<VideoItem | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<VideoItem[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [theaterMode, setTheaterMode] = useState<boolean>(false);
  const [descExpanded, setDescExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

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
          setRelatedVideos(relatedRes.videos.filter((v) => v.id !== videoId));
        }
      }
      setComments(commentsRes.comments);
    }

    loadWatchData();
    return () => {
      cancelled = true;
    };
  }, [videoId, apiKey]);

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

  // Ad-free privacy-enhanced embed URL with playsinline=1 for smooth mobile & desktop playback
  const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
    videoId
  )}?autoplay=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3`;

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
          {/* Ad-Free Video Player */}
          <div
            className={`relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-xl ring-1 ring-zinc-200 dark:ring-zinc-800 ${
              theaterMode ? "max-h-[78vh]" : ""
            }`}
          >
            <iframe
              src={embedUrl}
              title={video?.title || "PlayTube Video Player"}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
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
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white px-2">
            Up Next in Queue
          </h2>
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
        </div>
      </div>
    </div>
  );
}
