import { NextRequest, NextResponse } from 'next/server';
import { searchVideos, getTodayQuotaUsed, type MatchMode, type Timeframe, type SearchTimelineParams } from '@/lib/youtube';
import { YT_LAUNCH_DATE } from '@/lib/timeline';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;

  const channelId   = p.get('channelId');
  const channelName = p.get('channelName') ?? '';
  const channelLogo = p.get('channelLogo') ?? '';
  const query       = p.get('query') ?? '';
  const matchMode   = (p.get('matchMode') ?? 'contains') as MatchMode;
  const timeframe   = p.get('timeframe');
  const date        = p.get('date');
  const tzOffsetStr = p.get('tzOffset');
  const pageToken   = p.get('pageToken') ?? '';

  if (!channelId) {
    return NextResponse.json({ error: 'Missing "channelId" query parameter' }, { status: 400 });
  }

  // PRD §7.6: Accept exactly one of timeframe or date
  if ((!timeframe && !date) || (timeframe && date)) {
    return NextResponse.json(
      { error: 'Specify exactly one of "timeframe" or "date"' },
      { status: 400 }
    );
  }

  const timeline: SearchTimelineParams = {};

  if (timeframe) {
    timeline.timeframe = (timeframe === '12months' ? '1year' : timeframe) as Timeframe;
  } else if (date) {
    // Validate date format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Expected YYYY-MM-DD' }, { status: 400 });
    }

    let tzOffset = 0;
    if (tzOffsetStr !== null) {
      const parsedOffset = parseInt(tzOffsetStr, 10);
      if (isNaN(parsedOffset) || parsedOffset < -840 || parsedOffset > 840) {
        return NextResponse.json({ error: 'tzOffset must be an integer between -840 and +840' }, { status: 400 });
      }
      tzOffset = parsedOffset;
    }

    // Client's local today date (tzOffset is in minutes, e.g. -330 for UTC+5:30)
    const clientNow = new Date(Date.now() - tzOffset * 60 * 1000);
    const clientTodayStr = clientNow.toISOString().split('T')[0];

    if (date < YT_LAUNCH_DATE) {
      return NextResponse.json({ error: 'Date must be on or after YouTube launch date (2005-04-23)' }, { status: 400 });
    }
    if (date > clientTodayStr) {
      return NextResponse.json({ error: 'Date cannot be in the future' }, { status: 400 });
    }

    // Validate real calendar date
    const [y, m, d] = date.split('-').map(Number);
    const testDate = new Date(y, m - 1, d);
    if (testDate.getFullYear() !== y || testDate.getMonth() !== m - 1 || testDate.getDate() !== d) {
      return NextResponse.json({ error: 'Invalid calendar date' }, { status: 400 });
    }

    timeline.date = date;
    timeline.tzOffset = tzOffset;
  }

  // Quota check before calling search
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
      timeline,
      pageToken,
    );
    return NextResponse.json({ ...result, quotaUsed: await getTodayQuotaUsed() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.toLowerCase().includes('quota')) {
      return NextResponse.json(
        { error: 'YouTube API quota exceeded. Try again after midnight PST.', quotaExceeded: true },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
