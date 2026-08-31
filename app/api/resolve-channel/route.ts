import { NextRequest, NextResponse } from 'next/server';
import { resolveChannel } from '@/lib/channelResolver';

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input');
  if (!input) {
    return NextResponse.json({ error: 'Missing "input" query parameter' }, { status: 400 });
  }

  try {
    const meta = await resolveChannel(input);
    return NextResponse.json(meta);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
