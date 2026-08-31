import { NextRequest, NextResponse } from 'next/server';
import { searchVideos, getTodayQuotaUsed, type MatchMode, type Timeframe } from '@/lib/youtube';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const channelId   = p.get('channelId');
  const channelName = p.get('channelName') ?? '';
  const channelLogo = p.get('channelLogo') ?? '';
  const query       = p.get('query') ?? '';
  const matchMode   = (p.get('matchMode') ?? 'contains') as MatchMode;
  const timeframe   = (p.get('timeframe') ?? '1year') as Timeframe;
  const pageToken   = p.get('pageToken') ?? '';

  if (!channelId) {
    return NextResponse.json({ error: 'Missing "channelId" query parameter' }, { status: 400 });
  }

  // Quick quota check before doing anything
  const quotaUsed = await getTodayQuotaUsed();
  if (quotaUsed + 100 > 9500 && !pageToken) {
    return NextResponse.json(
      { videos: [], nextPageToken: null, quotaNearLimit: true, fromCache: false, quotaUsed },
      { status: 200 }
    );
  }

  try {
    const result = await searchVideos(
      channelId,
      channelName,
      channelLogo,
      query,
      matchMode,
      timeframe,
      pageToken,
    );
    return NextResponse.json({ ...result, quotaUsed: await getTodayQuotaUsed() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.toLowerCase().includes('quota')) {
      return NextResponse.json({ error: 'YouTube API quota exceeded. Try again after midnight PST.', quotaExceeded: true }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
