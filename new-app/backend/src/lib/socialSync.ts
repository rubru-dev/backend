/**
 * Social Media API sync helpers.
 * Each function fetches recent posts/metrics from the respective platform API
 * and returns a normalized array of RawPostMetric objects.
 */

import axios from "axios";

export interface RawPostMetric {
  post_id_platform: string;
  judul_konten: string | null;
  link_konten: string | null;
  tanggal: string; // YYYY-MM-DD
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  watch_time_minutes: number | null;
  engagement_rate: number | null;
}

// ── Instagram Graph API v18.0 ──────────────────────────────────────────────
/**
 * Fetch recent media and per-post insights for an Instagram Business account.
 * Requires: instagram_user_id + long-lived access_token with permissions:
 *   instagram_basic, instagram_manage_insights, pages_read_engagement
 */
export async function syncInstagram(
  instagram_user_id: string,
  access_token: string,
): Promise<RawPostMetric[]> {
  const BASE = "https://graph.facebook.com/v18.0";

  // 1. Fetch recent media (max 20 posts)
  const mediaRes = await axios.get(`${BASE}/${instagram_user_id}/media`, {
    params: {
      fields: "id,caption,timestamp,like_count,comments_count,permalink,media_type",
      limit: 20,
      access_token,
    },
  });

  const mediaList: any[] = mediaRes.data?.data ?? [];
  const results: RawPostMetric[] = [];

  for (const media of mediaList) {
    // 2. Fetch insights per post
    let impressions = 0, reach = 0, saved = 0, video_views = 0, shares = 0;
    try {
      const insightMetrics =
        media.media_type === "VIDEO"
          ? "impressions,reach,saved,shares,video_views"
          : "impressions,reach,saved,shares";

      const insightRes = await axios.get(`${BASE}/${media.id}/insights`, {
        params: { metric: insightMetrics, access_token },
      });
      const insightData: any[] = insightRes.data?.data ?? [];
      for (const metric of insightData) {
        if (metric.name === "impressions") impressions = metric.values?.[0]?.value ?? 0;
        if (metric.name === "reach") reach = metric.values?.[0]?.value ?? 0;
        if (metric.name === "saved") saved = metric.values?.[0]?.value ?? 0;
        if (metric.name === "shares") shares = metric.values?.[0]?.value ?? 0;
        if (metric.name === "video_views") video_views = metric.values?.[0]?.value ?? 0;
      }
    } catch {
      // Some posts may not support insights — skip gracefully
    }

    const likes = media.like_count ?? 0;
    const comments = media.comments_count ?? 0;
    const totalInteractions = likes + comments + shares + saved;
    const engRate = reach > 0 ? parseFloat(((totalInteractions / reach) * 100).toFixed(4)) : null;

    results.push({
      post_id_platform: media.id,
      judul_konten: media.caption ? String(media.caption).slice(0, 255) : null,
      link_konten: media.permalink ?? null,
      tanggal: String(media.timestamp).split("T")[0],
      views: video_views || impressions,
      likes,
      comments,
      shares,
      saves: saved,
      reach,
      watch_time_minutes: null,
      engagement_rate: engRate,
    });
  }

  return results;
}

// ── TikTok Business API ────────────────────────────────────────────────────
/**
 * Fetch video analytics from TikTok Business Center API.
 * Requires: advertiser_id + access_token with MEASUREMENT scope.
 * API ref: https://business-api.tiktok.com/portal/docs
 */
export async function syncTikTok(
  advertiser_id: string,
  access_token: string,
): Promise<RawPostMetric[]> {
  const BASE = "https://business-api.tiktok.com/open_api/v1.3";

  // Date range: last 30 days
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const res = await axios.post(
    `${BASE}/report/integrated/get/`,
    {
      advertiser_id,
      service_type: "AUCTION",
      report_type: "BASIC",
      data_level: "AUCTION_ADGROUP",
      dimensions: ["ad_id"],
      metrics: [
        "ad_name",
        "impressions",
        "clicks",
        "likes",
        "comments",
        "shares",
        "video_play_actions",
        "video_watched_2s",
      ],
      start_date: fmt(start),
      end_date: fmt(end),
      page: 1,
      page_size: 50,
    },
    {
      headers: { "Access-Token": access_token, "Content-Type": "application/json" },
    },
  );

  const rows: any[] = res.data?.data?.list ?? [];
  const results: RawPostMetric[] = [];

  for (const row of rows) {
    const m = row.metrics ?? {};
    const likes = parseInt(m.likes ?? "0") || 0;
    const comments = parseInt(m.comments ?? "0") || 0;
    const shares = parseInt(m.shares ?? "0") || 0;
    const impressions = parseInt(m.impressions ?? "0") || 0;
    const totalInteractions = likes + comments + shares;
    const engRate =
      impressions > 0
        ? parseFloat(((totalInteractions / impressions) * 100).toFixed(4))
        : null;

    results.push({
      post_id_platform: row.dimensions?.ad_id ?? String(Date.now()),
      judul_konten: m.ad_name ? String(m.ad_name).slice(0, 255) : null,
      link_konten: null,
      tanggal: fmt(new Date()),
      views: parseInt(m.video_play_actions ?? "0") || 0,
      likes,
      comments,
      shares,
      saves: 0,
      reach: impressions,
      watch_time_minutes: null,
      engagement_rate: engRate,
    });
  }

  return results;
}

// ── YouTube Data API v3 ────────────────────────────────────────────────────
/**
 * Fetch recent video statistics from a YouTube channel using Data API v3.
 * Requires: channel_id + api_key (public data, no OAuth needed for public channels).
 * API ref: https://developers.google.com/youtube/v3/docs/videos
 */
export async function syncYouTube(
  channel_id: string,
  api_key: string,
): Promise<RawPostMetric[]> {
  const BASE = "https://www.googleapis.com/youtube/v3";

  // 1. Get recent videos from the channel (search by channelId, order by date)
  const searchRes = await axios.get(`${BASE}/search`, {
    params: {
      part: "snippet",
      channelId: channel_id,
      order: "date",
      maxResults: 20,
      type: "video",
      key: api_key,
    },
  });

  const videoIds: string[] = (searchRes.data?.items ?? [])
    .map((item: any) => item.id?.videoId)
    .filter(Boolean);

  if (videoIds.length === 0) return [];

  // 2. Fetch statistics for all video IDs
  const statsRes = await axios.get(`${BASE}/videos`, {
    params: {
      part: "statistics,snippet,contentDetails",
      id: videoIds.join(","),
      key: api_key,
    },
  });

  const results: RawPostMetric[] = [];

  for (const video of statsRes.data?.items ?? []) {
    const stats = video.statistics ?? {};
    const snippet = video.snippet ?? {};

    // Parse ISO 8601 duration (e.g., PT5M30S → 5.5 minutes)
    const durationStr: string = video.contentDetails?.duration ?? "PT0S";
    const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match?.[1] ?? "0");
    const minutes = parseInt(match?.[2] ?? "0");
    const seconds = parseInt(match?.[3] ?? "0");
    const durationMinutes = hours * 60 + minutes + seconds / 60;

    const views = parseInt(stats.viewCount ?? "0") || 0;
    const likes = parseInt(stats.likeCount ?? "0") || 0;
    const comments = parseInt(stats.commentCount ?? "0") || 0;
    const totalInteractions = likes + comments;
    const engRate =
      views > 0 ? parseFloat(((totalInteractions / views) * 100).toFixed(4)) : null;

    results.push({
      post_id_platform: video.id,
      judul_konten: snippet.title ? String(snippet.title).slice(0, 255) : null,
      link_konten: `https://www.youtube.com/watch?v=${video.id}`,
      tanggal: snippet.publishedAt
        ? String(snippet.publishedAt).split("T")[0]
        : new Date().toISOString().split("T")[0],
      views,
      likes,
      comments,
      shares: 0, // YouTube API doesn't expose shares
      saves: 0,
      reach: 0, // YouTube API doesn't expose reach for non-channel-owners
      watch_time_minutes: parseFloat(durationMinutes.toFixed(2)),
      engagement_rate: engRate,
    });
  }

  return results;
}
