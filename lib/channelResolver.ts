const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

export interface ChannelMeta {
  channelId: string;
  name: string;
  logo: string;
  subscriberCount: number | null;
}

function getApiKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY is not set');
  return key;
}

function parseInput(input: string): { type: 'id' | 'handle' | 'video' | 'url'; value: string } {
  const trimmed = input.trim();

  // Full channel ID (starts with UC and 24 chars)
  if (/^UC[\w-]{22}$/.test(trimmed)) {
    return { type: 'id', value: trimmed };
  }

  // Raw @handle
  if (trimmed.startsWith('@')) {
    return { type: 'handle', value: trimmed.slice(1) };
  }

  // URL patterns
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const pathname = url.pathname;
    const hostname = url.hostname.replace(/^www\./, '');

    // youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      const vid = pathname.slice(1).split(/[?&#/]/)[0];
      if (vid) return { type: 'video', value: vid };
    }

    // youtube.com/watch?v=VIDEO_ID
    const vParam = url.searchParams.get('v');
    if (vParam) {
      return { type: 'video', value: vParam };
    }

    // youtube.com/shorts/VIDEO_ID
    const shortsMatch = pathname.match(/^\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch) return { type: 'video', value: shortsMatch[1] };

    // youtube.com/live/VIDEO_ID
    const liveMatch = pathname.match(/^\/live\/([a-zA-Z0-9_-]+)/);
    if (liveMatch) return { type: 'video', value: liveMatch[1] };

    // youtube.com/embed/VIDEO_ID
    const embedMatch = pathname.match(/^\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch) return { type: 'video', value: embedMatch[1] };

    // /channel/UCxxx
    const channelMatch = pathname.match(/^\/channel\/(UC[\w-]{22})/);
    if (channelMatch) return { type: 'id', value: channelMatch[1] };

    // /@handle
    const handleMatch = pathname.match(/^\/@([\w.-]+)/);
    if (handleMatch) return { type: 'handle', value: handleMatch[1] };

    // /c/customname or /user/username — fall back to search by handle
    const customMatch = pathname.match(/^\/(?:c|user)\/([\w.-]+)/);
    if (customMatch) return { type: 'handle', value: customMatch[1] };
  } catch {
    // Not a valid URL — proceed to fallback
  }

  // Raw 11-char video ID (e.g. dQw4w9WgXcQ)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { type: 'video', value: trimmed };
  }

  // Fallback: treat as handle
  const handle = trimmed.replace(/^@/, '');
  return { type: 'handle', value: handle };
}

function mapChannelItem(item: Record<string, unknown>): ChannelMeta {
  const snippet = item.snippet as Record<string, unknown>;
  const stats = item.statistics as Record<string, unknown> | undefined;
  const thumbnails = (snippet.thumbnails as Record<string, { url: string }>) ?? {};
  const logo =
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    '';

  return {
    channelId: item.id as string,
    name: snippet.title as string,
    logo,
    subscriberCount: stats?.subscriberCount
      ? parseInt(stats.subscriberCount as string, 10)
      : null,
  };
}

export async function resolveChannel(input: string): Promise<ChannelMeta> {
  const apiKey = getApiKey();
  const parsed = parseInput(input);

  let targetChannelId: string | null = null;

  if (parsed.type === 'video') {
    // Look up video to retrieve its channelId
    const videoUrl = `${YT_API_BASE}/videos?part=snippet&id=${encodeURIComponent(parsed.value)}&key=${apiKey}`;
    const videoRes = await fetch(videoUrl, { cache: 'no-store' });
    if (videoRes.ok) {
      const videoData = (await videoRes.json()) as { items?: Array<{ snippet?: { channelId?: string } }> };
      if (videoData.items && videoData.items.length > 0 && videoData.items[0].snippet?.channelId) {
        targetChannelId = videoData.items[0].snippet.channelId;
      }
    }
    if (!targetChannelId) {
      throw new Error(`Could not find channel for video: "${input}"`);
    }
  }

  let url: string;

  if (targetChannelId || parsed.type === 'id') {
    const cid = targetChannelId || parsed.value;
    url = `${YT_API_BASE}/channels?part=snippet,statistics&id=${encodeURIComponent(cid)}&key=${apiKey}`;
  } else {
    // forHandle works for @handles; also covers custom URL slugs for most modern channels
    url = `${YT_API_BASE}/channels?part=snippet,statistics&forHandle=${encodeURIComponent(parsed.value)}&key=${apiKey}`;
  }

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube API error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { items?: unknown[] };

  if (!data.items || data.items.length === 0) {
    throw new Error(`Channel not found for input: "${input}"`);
  }

  return mapChannelItem(data.items[0] as Record<string, unknown>);
}
