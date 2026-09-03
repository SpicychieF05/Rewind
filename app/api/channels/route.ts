import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/lib/auth/server';

export async function GET() {
  const sessionRes = await auth.getSession();
  const session = (sessionRes as { data?: { user?: { id: string } } | null })?.data ?? (sessionRes as { user?: { id: string } });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const rows = await sql`
    SELECT channel_id, name, logo, subscriber_count, saved_at
    FROM saved_channels
    WHERE user_id = ${userId}
    ORDER BY saved_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const sessionRes = await auth.getSession();
  const session = (sessionRes as { data?: { user?: { id: string } } | null })?.data ?? (sessionRes as { user?: { id: string } });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();
  const { channelId, name, logo, subscriberCount } = body;

  if (!channelId || !name) {
    return NextResponse.json({ error: 'channelId and name are required' }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO saved_channels (channel_id, name, logo, subscriber_count, user_id)
    VALUES (${channelId}, ${name}, ${logo ?? null}, ${subscriberCount ?? null}, ${userId})
    ON CONFLICT (user_id, channel_id) DO NOTHING
    RETURNING *
  `;
  return NextResponse.json(rows[0] ?? { channelId, name, logo, subscriberCount });
}

export async function DELETE(req: NextRequest) {
  const sessionRes = await auth.getSession();
  const session = (sessionRes as { data?: { user?: { id: string } } | null })?.data ?? (sessionRes as { user?: { id: string } });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const channelId = req.nextUrl.searchParams.get('channelId');
  if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });

  await sql`DELETE FROM saved_channels WHERE channel_id = ${channelId} AND user_id = ${userId}`;
  return NextResponse.json({ success: true });
}
