import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ResolvedAudioStream {
  url: string;
  mimeType: string;
  contentLength: number;
  itag: number;
  userAgent: string;
  expiresAt: number;
}

const streamCache = new Map<string, ResolvedAudioStream>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks for fast mobile range streaming & serverless compatibility

const INNERTUBE_CLIENTS = [
  {
    name: "IOS",
    userAgent:
      "com.google.ios.youtube/20.03.02 (iPhone16,2; U; CPU iOS 18_2_1 like Mac OS X;)",
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "20.03.02",
        deviceMake: "Apple",
        deviceModel: "iPhone16,2",
        osName: "iPhone",
        osVersion: "18.2.1.22C161",
        hl: "en",
        gl: "US",
      },
    },
  },
  {
    name: "ANDROID_VR",
    userAgent:
      "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
    context: {
      client: {
        clientName: "ANDROID_VR",
        clientVersion: "1.60.19",
        deviceMake: "Oculus",
        deviceModel: "Quest 3",
        osName: "Android",
        osVersion: "12L",
        androidSdkVersion: 32,
        hl: "en",
        gl: "US",
      },
    },
  },
];

function pickBestAudioFormat(
  adaptiveFormats: any[],
  combinedFormats: any[]
): { url: string; mimeType: string; contentLength: number; itag: number } | null {
  // Filter adaptive audio formats with direct URL
  const allAudio = adaptiveFormats.filter(
    (f) => f?.mimeType?.startsWith("audio/") && typeof f.url === "string" && f.url.length > 0
  );

  // Prefer original/default audio track when multiple language dubs exist
  const defaultAudio = allAudio.filter(
    (f) => !f.audioTrack || f.audioTrack.audioIsDefault === true
  );
  const candidates = defaultAudio.length > 0 ? defaultAudio : allAudio;

  if (candidates.length > 0) {
    // Priority 1: itag 140 (audio/mp4 AAC-LC ~128kbps) - works natively on 100% of iOS Safari & Android lock screens
    const itag140 = candidates.find((f) => f.itag === 140);
    // Priority 2: any audio/mp4 format sorted by highest bitrate
    const mp4Audio = candidates
      .filter((f) => f.mimeType?.startsWith("audio/mp4"))
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    // Priority 3: any audio/webm format sorted by highest bitrate
    const webmAudio = candidates
      .filter((f) => f.mimeType?.startsWith("audio/webm"))
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    const chosen = itag140 || mp4Audio[0] || webmAudio[0] || candidates[0];
    if (chosen) {
      const cleanMime = chosen.mimeType.split(";")[0].trim() || "audio/mp4";
      return {
        url: chosen.url,
        mimeType: cleanMime,
        contentLength: parseInt(chosen.contentLength || "0", 10) || 0,
        itag: chosen.itag || 140,
      };
    }
  }

  // Fallback to combined mp4 format (e.g. itag 18) which <audio> elements can also play
  const combined = combinedFormats.find(
    (f) => typeof f?.url === "string" && f.url.length > 0 && f.mimeType?.includes("mp4")
  );
  if (combined) {
    return {
      url: combined.url,
      mimeType: "audio/mp4",
      contentLength: parseInt(combined.contentLength || "0", 10) || 0,
      itag: combined.itag || 18,
    };
  }

  return null;
}

async function resolveAudioStream(videoId: string): Promise<ResolvedAudioStream | null> {
  const cached = streamCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  for (const clientProfile of INNERTUBE_CLIENTS) {
    try {
      const res = await fetch(
        "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
        {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": clientProfile.userAgent,
          },
          body: JSON.stringify({
            videoId,
            context: clientProfile.context,
            contentCheckOk: true,
            racyCheckOk: true,
          }),
        }
      );

      if (!res.ok) continue;
      const data = await res.json();
      if (data?.playabilityStatus?.status !== "OK") continue;

      const adaptiveFormats = data?.streamingData?.adaptiveFormats || [];
      const combinedFormats = data?.streamingData?.formats || [];
      const picked = pickBestAudioFormat(adaptiveFormats, combinedFormats);

      if (picked && picked.url) {
        const resolved: ResolvedAudioStream = {
          ...picked,
          userAgent: clientProfile.userAgent,
          expiresAt: Date.now() + CACHE_TTL_MS,
        };
        streamCache.set(videoId, resolved);
        return resolved;
      }
    } catch {
      // Try next client profile
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("id")?.trim();
  const infoOnly = searchParams.get("info") === "1";

  if (!videoId || !/^[a-zA-Z0-9_-]{6,15}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
  }

  let streamInfo = await resolveAudioStream(videoId);
  if (!streamInfo) {
    return NextResponse.json(
      { error: "Direct audio stream unavailable for this video" },
      { status: 404 }
    );
  }

  if (infoOnly) {
    return NextResponse.json({
      ok: true,
      videoId,
      mimeType: streamInfo.mimeType,
      contentLength: streamInfo.contentLength,
      itag: streamInfo.itag,
    });
  }

  const incomingRange = req.headers.get("range");
  const totalLength = streamInfo.contentLength;

  let targetRangeHeader: string | undefined = undefined;

  if (incomingRange && incomingRange.startsWith("bytes=")) {
    const parts = incomingRange.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const requestedEnd = parts[1] ? parseInt(parts[1], 10) : NaN;

    if (!Number.isNaN(start) && start >= 0) {
      if (!Number.isNaN(requestedEnd) && requestedEnd >= start) {
        // Respect explicit small probes (e.g. bytes=0-1 from iOS Safari), cap huge ranges
        const cappedEnd =
          totalLength > 0
            ? Math.min(requestedEnd, start + MAX_CHUNK_SIZE - 1, totalLength - 1)
            : Math.min(requestedEnd, start + MAX_CHUNK_SIZE - 1);
        targetRangeHeader = `bytes=${start}-${cappedEnd}`;
      } else if (totalLength > 0) {
        const cappedEnd = Math.min(start + MAX_CHUNK_SIZE - 1, totalLength - 1);
        targetRangeHeader = `bytes=${start}-${cappedEnd}`;
      } else {
        targetRangeHeader = `bytes=${start}-${start + MAX_CHUNK_SIZE - 1}`;
      }
    }
  } else if (totalLength > 0) {
    const cappedEnd = Math.min(MAX_CHUNK_SIZE - 1, totalLength - 1);
    targetRangeHeader = `bytes=0-${cappedEnd}`;
  }

  const fetchUpstream = async (info: ResolvedAudioStream, rangeHdr?: string) => {
    const headers: Record<string, string> = {
      "User-Agent": info.userAgent,
      Accept: "*/*",
    };
    if (rangeHdr) {
      headers["Range"] = rangeHdr;
    }
    return fetch(info.url, {
      method: "GET",
      headers,
      cache: "no-store",
    });
  };

  try {
    let upstreamRes = await fetchUpstream(streamInfo, targetRangeHeader);

    // If cached googlevideo URL expired (403/404), evict cache and re-resolve once
    if (upstreamRes.status === 403 || upstreamRes.status === 404) {
      streamCache.delete(videoId);
      const refreshed = await resolveAudioStream(videoId);
      if (!refreshed) {
        return NextResponse.json({ error: "Audio stream expired" }, { status: 502 });
      }
      streamInfo = refreshed;
      upstreamRes = await fetchUpstream(streamInfo, targetRangeHeader);
    }

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return NextResponse.json(
        { error: `Upstream audio status ${upstreamRes.status}` },
        { status: 502 }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      streamInfo.mimeType || upstreamRes.headers.get("content-type") || "audio/mp4"
    );
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "public, max-age=3600");
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    const contentRange = upstreamRes.headers.get("content-range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status === 206 || contentRange ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to stream audio" },
      { status: 500 }
    );
  }
}
