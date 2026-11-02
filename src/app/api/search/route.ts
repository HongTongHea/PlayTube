import { NextRequest, NextResponse } from "next/server";
import { VideoItem } from "@/types/youtube";

function mapVideoRenderer(vr: any): VideoItem | null {
  const videoId = vr?.videoId;
  if (!videoId) return null;

  const title =
    vr.title?.runs?.map((r: any) => r.text).join("") ||
    vr.title?.simpleText ||
    "Untitled Video";

  const channelTitle =
    vr.ownerText?.runs?.[0]?.text ||
    vr.longBylineText?.runs?.[0]?.text ||
    vr.shortBylineText?.runs?.[0]?.text ||
    "YouTube Creator";

  const channelId =
    vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
    vr.longBylineText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
    "";

  const channelAvatar =
    vr.channelThumbnailSupportedRenderers?.channelThumbnailWithLinkRenderer
      ?.thumbnail?.thumbnails?.[0]?.url || "";

  const thumbs = vr.thumbnail?.thumbnails || [];
  const bestThumb =
    thumbs[thumbs.length - 1]?.url ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const durationText =
    vr.lengthText?.simpleText ||
    vr.thumbnailOverlays?.find((o: any) => o.thumbnailOverlayTimeStatusRenderer)
      ?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText ||
    "";

  const rawViewText =
    vr.viewCountText?.simpleText ||
    vr.viewCountText?.runs?.map((r: any) => r.text).join("") ||
    vr.shortViewCountText?.simpleText ||
    "";

  // Extract numeric views if formatted like "1,234,567 views", or keep readable string
  const digitsOnly = rawViewText.replace(/[^0-9]/g, "");
  const viewCount =
    rawViewText.includes("M") || rawViewText.includes("K") || rawViewText.includes("B")
      ? rawViewText
      : digitsOnly || rawViewText;

  const publishedAt = vr.publishedTimeText?.simpleText || "";

  const description =
    vr.detailedMetadataSnippets?.[0]?.snippetText?.runs
      ?.map((r: any) => r.text)
      .join("") ||
    vr.descriptionSnippet?.runs?.map((r: any) => r.text).join("") ||
    "";

  return {
    id: videoId,
    title,
    description,
    thumbnailUrl: bestThumb,
    channelTitle,
    channelId,
    channelAvatar,
    publishedAt,
    viewCount,
    duration: durationText || "PT0S",
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() || "";
  const pageToken = searchParams.get("pageToken")?.trim() || "";
  const maxResults = parseInt(searchParams.get("maxResults") || "20", 10);

  if (!query && !pageToken) {
    return NextResponse.json({ videos: [], nextPageToken: undefined });
  }

  try {
    const bodyPayload: any = {
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20241101.01.00",
          hl: "en",
          gl: "US",
        },
      },
    };

    if (pageToken && !pageToken.startsWith("demo_")) {
      bodyPayload.continuation = pageToken;
    } else {
      bodyPayload.query = query;
    }

    const ytRes = await fetch("https://www.youtube.com/youtubei/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!ytRes.ok) {
      throw new Error(`YouTube search endpoint returned ${ytRes.status}`);
    }

    const data = await ytRes.json();
    let contentsList: any[] = [];
    let nextContinuationToken: string | undefined = undefined;

    if (pageToken && !pageToken.startsWith("demo_")) {
      const contItems =
        data?.onResponseReceivedCommands?.[0]?.appendContinuationItemsAction
          ?.continuationItems || [];
      for (const block of contItems) {
        if (block.itemSectionRenderer?.contents) {
          contentsList.push(...block.itemSectionRenderer.contents);
        }
        if (block.continuationItemRenderer) {
          nextContinuationToken =
            block.continuationItemRenderer?.continuationEndpoint
              ?.continuationCommand?.token;
        }
      }
    } else {
      const sections =
        data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents || [];
      for (const section of sections) {
        if (section.itemSectionRenderer?.contents) {
          contentsList.push(...section.itemSectionRenderer.contents);
        }
        if (section.continuationItemRenderer) {
          nextContinuationToken =
            section.continuationItemRenderer?.continuationEndpoint
              ?.continuationCommand?.token;
        }
      }
    }

    const videos: VideoItem[] = [];
    const seen = new Set<string>();

    for (const item of contentsList) {
      if (item.videoRenderer) {
        const mapped = mapVideoRenderer(item.videoRenderer);
        if (mapped && !seen.has(mapped.id)) {
          seen.add(mapped.id);
          videos.push(mapped);
          if (videos.length >= maxResults) break;
        }
      }
    }

    return NextResponse.json({
      videos,
      nextPageToken: nextContinuationToken,
    });
  } catch (err: any) {
    return NextResponse.json(
      { videos: [], error: err?.message || "Search failed" },
      { status: 500 }
    );
  }
}
