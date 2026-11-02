import { VideoItem, CommentItem } from "@/types/youtube";
import { DEMO_VIDEOS, DEMO_COMMENTS } from "@/lib/mockData";

const YT_BASE_URL = "https://www.googleapis.com/youtube/v3";
const DEFAULT_YOUTUBE_API_KEY = "AIzaSyCKDFWdLvKs-6Z8XBnCIIFnGySXWtwmA7E";
const channelAvatarCache = new Map<string, string>();

async function enrichVideosWithChannelAvatars(
  videos: VideoItem[],
  apiKey: string
): Promise<VideoItem[]> {
  if (!apiKey || videos.length === 0) return videos;

  const missingChannelIds = Array.from(
    new Set(
      videos
        .map((v) => v.channelId)
        .filter((id) => Boolean(id) && !channelAvatarCache.has(id))
    )
  );

  if (missingChannelIds.length > 0) {
    try {
      const params = new URLSearchParams({
        part: "snippet",
        id: missingChannelIds.slice(0, 50).join(","),
        key: apiKey,
      });
      const res = await fetch(`${YT_BASE_URL}/channels?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        for (const ch of data.items || []) {
          const thumbs = ch.snippet?.thumbnails || {};
          const avatarUrl =
            thumbs.medium?.url || thumbs.default?.url || thumbs.high?.url || "";
          if (ch.id && avatarUrl) {
            channelAvatarCache.set(ch.id, avatarUrl);
          }
        }
      }
    } catch {
      // Ignore channel avatar fetch errors
    }
  }

  return videos.map((v) => ({
    ...v,
    channelAvatar: channelAvatarCache.get(v.channelId) || v.channelAvatar,
  }));
}

export function getResolvedApiKey(customKey?: string): string {
  if (customKey && customKey.trim().length > 10) {
    return customKey.trim();
  }
  const envKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (envKey && envKey !== "your_youtube_data_api_v3_key_here" && envKey.trim().length > 10) {
    return envKey.trim();
  }
  return DEFAULT_YOUTUBE_API_KEY;
}

export function formatViewCount(views?: string | number): string {
  if (!views) return "— views";
  if (typeof views === "string" && /[a-zA-Z]/.test(views)) {
    return views.toLowerCase().includes("view") ? views : `${views} views`;
  }
  const num = typeof views === "string" ? parseInt(views, 10) : views;
  if (isNaN(num)) return "— views";
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B views`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M views`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K views`;
  return `${num} views`;
}

export function formatCompactNumber(val?: string | number): string {
  if (!val) return "0";
  const num = typeof val === "string" ? parseInt(val, 10) : val;
  if (isNaN(num)) return "0";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${num}`;
}

export function formatDuration(isoDuration?: string): string {
  if (!isoDuration) return "";
  if (isoDuration === "PT0S" || isoDuration === "P0D") return "LIVE";
  if (/^\d+:\d+(?::\d+)?$/.test(isoDuration.trim())) {
    return isoDuration.trim();
  }
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatTimeAgo(dateString: string): string {
  if (!dateString) return "";
  if (dateString.includes("ago") || dateString.includes("Streamed")) {
    return dateString;
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const now = new Date();
  const diffSeconds = Math.max(1, Math.floor((now.getTime() - date.getTime()) / 1000));

  const intervals: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];

  for (const [seconds, label] of intervals) {
    const count = Math.floor(diffSeconds / seconds);
    if (count >= 1) {
      return `${count} ${label}${count > 1 ? "s" : ""} ago`;
    }
  }
  return "Just now";
}

function mapYouTubeVideoItem(item: any): VideoItem {
  const videoId = typeof item.id === "string" ? item.id : item.id?.videoId || "";
  const snippet = item.snippet || {};
  const stats = item.statistics || {};
  const contentDetails = item.contentDetails || {};
  const thumbnails = snippet.thumbnails || {};

  const thumb =
    thumbnails.high?.url ||
    thumbnails.standard?.url ||
    thumbnails.maxres?.url ||
    thumbnails.medium?.url ||
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");

  return {
    id: videoId,
    title: snippet.title || "Untitled Video",
    description: snippet.description || "",
    thumbnailUrl: thumb,
    channelTitle: snippet.channelTitle || "YouTube Creator",
    channelId: snippet.channelId || "",
    publishedAt: snippet.publishedAt || new Date().toISOString(),
    viewCount: stats.viewCount,
    likeCount: stats.likeCount,
    duration: contentDetails.duration,
    categoryId: snippet.categoryId,
    tags: snippet.tags || [],
  };
}

export async function verifyYouTubeApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const url = `${YT_BASE_URL}/videos?part=snippet&chart=mostPopular&maxResults=1&key=${encodeURIComponent(apiKey.trim())}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP Error ${res.status}`;
      return { valid: false, error: msg };
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err?.message || "Network error verifying API key" };
  }
}

export async function fetchPopularVideos(options: {
  apiKey?: string;
  categoryId?: string;
  query?: string;
  maxResults?: number;
  pageToken?: string;
}): Promise<{ videos: VideoItem[]; nextPageToken?: string; isDemo: boolean; error?: string }> {
  const key = getResolvedApiKey(options.apiKey);
  const maxResults = options.maxResults || 16;

  // If a search query is provided (either search bar or topic query), use searchYouTubeVideos (powered by /api/search)
  if (options.query && options.query.trim()) {
    return await searchYouTubeVideos(options.query.trim(), key, maxResults, options.pageToken);
  }

  if (!key) {
    return {
      videos: filterDemoVideos(options.categoryId, options.query),
      nextPageToken: "demo_page_2",
      isDemo: true,
    };
  }

  try {
    const params = new URLSearchParams({
      part: "snippet,contentDetails,statistics",
      chart: "mostPopular",
      regionCode: "US",
      maxResults: String(maxResults),
      key,
    });

    if (options.categoryId && options.categoryId !== "all") {
      params.set("videoCategoryId", options.categoryId);
    }
    if (options.pageToken && !options.pageToken.startsWith("demo_")) {
      params.set("pageToken", options.pageToken);
    }

    const res = await fetch(`${YT_BASE_URL}/videos?${params.toString()}`);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `YouTube API returned ${res.status}`);
    }

    const data = await res.json();
    const rawVideos: VideoItem[] = (data.items || []).map(mapYouTubeVideoItem);
    const videos = await enrichVideosWithChannelAvatars(rawVideos, key);
    return {
      videos,
      nextPageToken: data.nextPageToken,
      isDemo: false,
    };
  } catch (err: any) {
    return {
      videos: filterDemoVideos(options.categoryId, options.query),
      nextPageToken: undefined,
      isDemo: true,
      error: err?.message || "Failed to load from YouTube API; showing curated videos.",
    };
  }
}

export async function searchYouTubeVideos(
  query: string,
  apiKey?: string,
  maxResults = 16,
  pageToken?: string
): Promise<{ videos: VideoItem[]; nextPageToken?: string; isDemo: boolean; error?: string }> {
  // Primary: Use our Next.js /api/search endpoint (unlimited quota, real thumbnails, real channel avatars & continuation pagination)
  try {
    const apiParams = new URLSearchParams({
      q: query,
      maxResults: String(maxResults),
    });
    if (pageToken && !pageToken.startsWith("demo_")) {
      apiParams.set("pageToken", pageToken);
    }
    const localSearchRes = await fetch(`/api/search?${apiParams.toString()}`);
    if (localSearchRes.ok) {
      const localData = await localSearchRes.json();
      if (Array.isArray(localData.videos) && localData.videos.length > 0) {
        return {
          videos: localData.videos,
          nextPageToken: localData.nextPageToken,
          isDemo: false,
        };
      }
    }
  } catch {
    // Fallback to YouTube Data API v3 below
  }

  const key = getResolvedApiKey(apiKey);
  if (!key) {
    return {
      videos: filterDemoVideos(undefined, query),
      nextPageToken: undefined,
      isDemo: true,
    };
  }

  try {
    const searchParams = new URLSearchParams({
      part: "snippet",
      q: query,
      type: "video",
      videoEmbeddable: "true",
      maxResults: String(maxResults),
      key,
    });

    if (pageToken && !pageToken.startsWith("demo_")) {
      searchParams.set("pageToken", pageToken);
    }

    const searchRes = await fetch(`${YT_BASE_URL}/search?${searchParams.toString()}`);
    if (!searchRes.ok) {
      const errJson = await searchRes.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `YouTube Search API returned ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    const items = searchData.items || [];
    const nextToken = searchData.nextPageToken;
    const videoIds = items
      .map((item: any) => item.id?.videoId)
      .filter(Boolean)
      .join(",");

    if (!videoIds) {
      return { videos: [], nextPageToken: undefined, isDemo: false };
    }

    const detailsParams = new URLSearchParams({
      part: "snippet,contentDetails,statistics",
      id: videoIds,
      key,
    });

    const detailsRes = await fetch(`${YT_BASE_URL}/videos?${detailsParams.toString()}`);
    if (detailsRes.ok) {
      const detailsData = await detailsRes.json();
      const rawVideos = (detailsData.items || []).map(mapYouTubeVideoItem);
      const enriched = await enrichVideosWithChannelAvatars(rawVideos, key);
      return {
        videos: enriched,
        nextPageToken: nextToken,
        isDemo: false,
      };
    }

    const fallbackMapped = items.map(mapYouTubeVideoItem);
    const enrichedFallback = await enrichVideosWithChannelAvatars(fallbackMapped, key);
    return {
      videos: enrichedFallback,
      nextPageToken: nextToken,
      isDemo: false,
    };
  } catch (err: any) {
    return {
      videos: filterDemoVideos(undefined, query),
      nextPageToken: undefined,
      isDemo: true,
      error: err?.message || "Search fallback activated",
    };
  }
}

export async function fetchVideoDetails(
  videoId: string,
  apiKey?: string
): Promise<{ video: VideoItem | null; isDemo: boolean }> {
  const key = getResolvedApiKey(apiKey);
  const demoMatch = DEMO_VIDEOS.find((v) => v.id === videoId);

  if (!key) {
    return {
      video:
        demoMatch || {
          id: videoId,
          title: "YouTube Video Player",
          description:
            "Playing in ad-free privacy-enhanced mode. Add your YouTube Data API v3 key in the top bar to load full video metadata, statistics, and live comments.",
          thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          channelTitle: "YouTube Creator",
          channelId: "",
          publishedAt: new Date().toISOString(),
        },
      isDemo: true,
    };
  }

  try {
    const params = new URLSearchParams({
      part: "snippet,contentDetails,statistics",
      id: videoId,
      key,
    });
    const res = await fetch(`${YT_BASE_URL}/videos?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch video details");
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const mapped = mapYouTubeVideoItem(data.items[0]);
      const [enriched] = await enrichVideosWithChannelAvatars([mapped], key);
      return { video: enriched, isDemo: false };
    }
  } catch {
    // Fallback below
  }

  return {
    video:
      demoMatch || {
        id: videoId,
        title: "YouTube Video",
        description: "Playing in clean, ad-free mode.",
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        channelTitle: "YouTube Channel",
        channelId: "",
        publishedAt: new Date().toISOString(),
      },
    isDemo: true,
  };
}

export async function fetchVideoComments(
  videoId: string,
  apiKey?: string
): Promise<{ comments: CommentItem[]; isDemo: boolean }> {
  const key = getResolvedApiKey(apiKey);
  if (!key) {
    return { comments: DEMO_COMMENTS, isDemo: true };
  }

  try {
    const params = new URLSearchParams({
      part: "snippet",
      videoId,
      maxResults: "15",
      order: "relevance",
      textFormat: "plainText",
      key,
    });
    const res = await fetch(`${YT_BASE_URL}/commentThreads?${params.toString()}`);
    if (!res.ok) throw new Error("Comments unavailable");
    const data = await res.json();
    const comments: CommentItem[] = (data.items || []).map((item: any) => {
      const top = item.snippet?.topLevelComment?.snippet || {};
      return {
        id: item.id,
        authorName: top.authorDisplayName || "Viewer",
        authorAvatar: top.authorProfileImageUrl || "",
        textDisplay: top.textDisplay || "",
        publishedAt: top.publishedAt || new Date().toISOString(),
        likeCount: top.likeCount || 0,
      };
    });
    return { comments, isDemo: false };
  } catch {
    return { comments: DEMO_COMMENTS, isDemo: true };
  }
}

function filterDemoVideos(categoryId?: string, query?: string): VideoItem[] {
  let list = [...DEMO_VIDEOS];

  if (query && query.trim()) {
    const qWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1);
    const filtered = list.filter((v) => {
      const hay = `${v.title} ${v.description} ${v.channelTitle} ${(v.tags || []).join(" ")}`.toLowerCase();
      return qWords.some((word) => hay.includes(word));
    });
    if (filtered.length > 0) return filtered;
  }

  if (categoryId && categoryId !== "all") {
    const byCat = list.filter((v) => v.categoryId === categoryId);
    if (byCat.length > 0) return byCat;
  }

  return list;
}
