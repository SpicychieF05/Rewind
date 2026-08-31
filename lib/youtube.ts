import { sql } from './db';

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CACHE_TTL_HOURS = 24;
const QUOTA_SAFETY_CEILING = 9500; // warn/block at this many units used per day

// ─── Types ────────────────────────────────────────────────────────────────────

export type MatchMode = 'exact' | 'contains';

export type Timeframe =
  | '1month' | '2months' | '3months' | '6months' | '12months'
  | '1year' | '2years' | '3years' | '4years' | '5years';

export interface VideoResult {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  channelLogo: string;
  thumbnail: string;
  publishedAt: string;
  views: number | null;
  likes: number | null;
  duration: string | null;
}

export interface SearchResponse {
  videos: VideoResult[];
  nextPageToken: string | null;
  quotaNearLimit: boolean;
  fromCache: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY is not set');
  return key;
}

function buildCacheKey(
  channelId: string,
  query: string,
  matchMode: MatchMode,
  timeframe: Timeframe,
  pageToken: string,
): string {
  return `${channelId}|${query.toLowerCase().trim()}|${matchMode}|${timeframe}|${pageToken}`;
}

function timeframeToDate(timeframe: Timeframe): Date {
  const now = new Date();
  const map: Record<Timeframe, () => Date> = {
    '1month':   () => new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
    '2months':  () => new Date(now.getFullYear(), now.getMonth() - 2, now.getDate()),
    '3months':  () => new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
    '6months':  () => new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
    '12months': () => new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
    '1year':    () => new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
    '2years':   () => new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()),
    '3years':   () => new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()),
    '4years':   () => new Date(now.getFullYear() - 4, now.getMonth(), now.getDate()),
    '5years':   () => new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()),
  };
  return map[timeframe]();
}

function formatCount(n: string | undefined | null): number | null {
  if (!n) return null;
  return parseInt(n, 10);
}

function pickThumbnail(thumbnails: Record<string, { url: string } | undefined>): string {
  return (
    thumbnails.maxres?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    ''
  );
}

// ─── Quota ────────────────────────────────────────────────────────────────────

export async function getTodayQuotaUsed(): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const rows = await sql`
    SELECT units_used FROM quota_usage WHERE usage_date = ${today}
  `;
  return rows.length > 0 ? (rows[0].units_used as number) : 0;
}

async function addQuota(units: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await sql`
    INSERT INTO quota_usage (usage_date, units_used)
    VALUES (${today}, ${units})
    ON CONFLICT (usage_date)
    DO UPDATE SET units_used = quota_usage.units_used + ${units}
  `;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

async function getCached(key: string): Promise<VideoResult[] | null> {
  const rows = await sql`
    SELECT results FROM search_cache
    WHERE cache_key = ${key} AND expires_at > NOW()
  `;
  if (rows.length === 0) return null;
  return rows[0].results as VideoResult[];
}

async function setCache(key: string, results: VideoResult[]): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
  await sql`
    INSERT INTO search_cache (cache_key, results, expires_at)
    VALUES (${key}, ${JSON.stringify(results)}, ${expiresAt})
    ON CONFLICT (cache_key)
    DO UPDATE SET results = EXCLUDED.results, expires_at = EXCLUDED.expires_at
  `;
}

// ─── Core: fetch video details (cheap — 1 quota unit per 50 IDs) ──────────────

export async function fetchVideoDetails(videoIds: string[]): Promise<Map<string, Partial<VideoResult>>> {
  if (videoIds.length === 0) return new Map();
  const apiKey = getApiKey();
  const ids = videoIds.slice(0, 50).join(',');
  const url = `${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${ids}&key=${apiKey}`;

  const res = await fetch(url, { cache: 'no-store' });
  await addQuota(1);
  if (!res.ok) throw new Error(`videos.list failed: ${res.status}`);

  const data = await res.json() as { items?: Record<string, unknown>[] };
  const map = new Map<string, Partial<VideoResult>>();

  for (const item of data.items ?? []) {
    const snippet = item.snippet as Record<string, unknown>;
    const stats = item.statistics as Record<string, unknown>;
    const details = item.contentDetails as Record<string, unknown>;
    map.set(item.id as string, {
      videoId: item.id as string,
      title: snippet.title as string,
      channelId: snippet.channelId as string,
      channelName: snippet.channelTitle as string,
      thumbnail: pickThumbnail(snippet.thumbnails as Record<string, { url: string } | undefined>),
      publishedAt: snippet.publishedAt as string,
      views: formatCount(stats?.viewCount as string),
      likes: formatCount(stats?.likeCount as string),
      duration: details?.duration as string ?? null,
    });
  }

  return map;
}

// ─── Core: search.list (100 quota units per call) ─────────────────────────────

export async function searchVideos(
  channelId: string,
  channelName: string,
  channelLogo: string,
  query: string,
  matchMode: MatchMode,
  timeframe: Timeframe,
  pageToken: string = '',
): Promise<SearchResponse> {
  const cacheKey = buildCacheKey(channelId, query, matchMode, timeframe, pageToken);

  // 1. Check DB cache
  const cached = await getCached(cacheKey);
  if (cached) {
    const quotaUsed = await getTodayQuotaUsed();
    return {
      videos: cached,
      nextPageToken: null, // cached page doesn't carry a live token — user must load more fresh
      quotaNearLimit: quotaUsed >= QUOTA_SAFETY_CEILING,
      fromCache: true,
    };
  }

  // 2. Quota guard before making a fresh call
  const quotaUsed = await getTodayQuotaUsed();
  if (quotaUsed + 100 > QUOTA_SAFETY_CEILING) {
    return {
      videos: [],
      nextPageToken: null,
      quotaNearLimit: true,
      fromCache: false,
    };
  }

  // 3. Call search.list
  const apiKey = getApiKey();
  const publishedAfter = timeframeToDate(timeframe).toISOString();
  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    q: query,
    type: 'video',
    maxResults: '50',
    publishedAfter,
    key: apiKey,
  });
  if (pageToken) params.set('pageToken', pageToken);

  const res = await fetch(`${YT_API_BASE}/search?${params}`, { cache: 'no-store' });
  await addQuota(100);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`search.list failed ${res.status}: ${body}`);
  }

  const data = await res.json() as {
    items?: Record<string, unknown>[];
    nextPageToken?: string;
  };

  const items = data.items ?? [];
  const nextPageToken = data.nextPageToken ?? null;

  // 4. Fetch full stats for matched IDs
  const videoIds = items
    .filter((item) => (item.id as Record<string, unknown>).kind === 'youtube#video')
    .map((item) => (item.id as Record<string, unknown>).videoId as string);

  const detailMap = await fetchVideoDetails(videoIds);

  // 5. Build result list + apply local filtering for exact-match
  let videos: VideoResult[] = videoIds.map((id) => {
    const d = detailMap.get(id);
    return {
      videoId: id,
      title: d?.title ?? '',
      channelId: d?.channelId ?? channelId,
      channelName: d?.channelName ?? channelName,
      channelLogo,
      thumbnail: d?.thumbnail ?? '',
      publishedAt: d?.publishedAt ?? '',
      views: d?.views ?? null,
      likes: d?.likes ?? null,
      duration: d?.duration ?? null,
    };
  });

  if (matchMode === 'exact' && query.trim()) {
    const lower = query.toLowerCase().trim();
    videos = videos.filter((v) => v.title.toLowerCase().includes(lower));
  }

  // 6. Write to cache
  await setCache(cacheKey, videos);

  const freshQuotaUsed = await getTodayQuotaUsed();
  return {
    videos,
    nextPageToken,
    quotaNearLimit: freshQuotaUsed >= QUOTA_SAFETY_CEILING,
    fromCache: false,
  };
}
