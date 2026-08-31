import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  const rows = await sql`SELECT * FROM saved_channels ORDER BY saved_at DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { channelId, name, logo, subscriberCount } = body;

  if (!channelId || !name) {
    return NextResponse.json({ error: 'channelId and name are required' }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO saved_channels (channel_id, name, logo, subscriber_count)
    VALUES (${channelId}, ${name}, ${logo ?? null}, ${subscriberCount ?? null})
    ON CONFLICT (channel_id) DO NOTHING
    RETURNING *
  `;
  return NextResponse.json(rows[0] ?? { channelId, name, logo, subscriberCount });
}

export async function DELETE(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get('channelId');
  if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });

  await sql`DELETE FROM saved_channels WHERE channel_id = ${channelId}`;
  return NextResponse.json({ success: true });
}
