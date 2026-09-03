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
    SELECT
      p.playlist_id,
      p.name,
      p.created_at,
      COUNT(pv.video_id)::int AS video_count
    FROM playlists p
    LEFT JOIN playlist_videos pv ON pv.playlist_id = p.playlist_id
    WHERE p.user_id = ${userId}
    GROUP BY p.playlist_id, p.name, p.created_at
    ORDER BY p.created_at DESC
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

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const rows = await sql`
    INSERT INTO playlists (name, user_id)
    VALUES (${name.trim()}, ${userId})
    RETURNING *
  `;
  return NextResponse.json({ ...rows[0], video_count: 0 });
}

export async function PATCH(req: NextRequest) {
  const sessionRes = await auth.getSession();
  const session = (sessionRes as { data?: { user?: { id: string } } | null })?.data ?? (sessionRes as { user?: { id: string } });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const rows = await sql`
    UPDATE playlists
    SET name = ${name.trim()}
    WHERE playlist_id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  if (rows.length === 0) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: NextRequest) {
  const sessionRes = await auth.getSession();
  const session = (sessionRes as { data?: { user?: { id: string } } | null })?.data ?? (sessionRes as { user?: { id: string } });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Cascade in playlist_videos is handled by FK ON DELETE CASCADE
  const result = await sql`DELETE FROM playlists WHERE playlist_id = ${id} AND user_id = ${userId} RETURNING playlist_id`;
  if (result.length === 0) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
