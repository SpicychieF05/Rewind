import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/lib/auth/server';

export async function GET(req: NextRequest) {
  const sessionRes = await auth.getSession();
  const session = (sessionRes as { data?: { user?: { id: string } } | null })?.data ?? (sessionRes as { user?: { id: string } });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const playlistId = req.nextUrl.searchParams.get('playlistId');
  if (!playlistId) return NextResponse.json({ error: 'Missing playlistId' }, { status: 400 });

  // Ownership pre-check
  const plCheck = await sql`
    SELECT 1 FROM playlists WHERE playlist_id = ${playlistId} AND user_id = ${userId}
  `;
  if (plCheck.length === 0) {
    return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
  }

  const rows = await sql`
    SELECT
      sv.video_id AS "videoId",
      sv.title,
      sv.channel_id AS "channelId",
      sv.channel_name AS "channelName",
      sv.channel_logo AS "channelLogo",
      sv.thumbnail,
      sv.published_at AS "publishedAt",
      sv.views,
      sv.likes,
      pv.position
    FROM playlist_videos pv
    JOIN saved_videos sv ON sv.video_id = pv.video_id AND sv.user_id = ${userId}
    WHERE pv.playlist_id = ${playlistId}
    ORDER BY pv.position ASC
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

  const { playlistId, videoId } = await req.json();
  if (!playlistId || !videoId) {
    return NextResponse.json({ error: 'playlistId and videoId are required' }, { status: 400 });
  }

  // Explicit ownership pre-check
  const plCheck = await sql`
    SELECT 1 FROM playlists WHERE playlist_id = ${playlistId} AND user_id = ${userId}
  `;
  if (plCheck.length === 0) {
    return NextResponse.json({ error: 'Forbidden: playlist does not belong to user' }, { status: 403 });
  }

  // Assign next position
  const posRows = await sql`
    SELECT COALESCE(MAX(position), 0) + 1 AS next_pos
    FROM playlist_videos
    WHERE playlist_id = ${playlistId}
  `;
  const position = posRows[0].next_pos as number;

  await sql`
    INSERT INTO playlist_videos (playlist_id, video_id, position)
    VALUES (${playlistId}, ${videoId}, ${position})
    ON CONFLICT (playlist_id, video_id) DO NOTHING
  `;
  return NextResponse.json({ success: true, position });
}

export async function DELETE(req: NextRequest) {
  const sessionRes = await auth.getSession();
  const session = (sessionRes as { data?: { user?: { id: string } } | null })?.data ?? (sessionRes as { user?: { id: string } });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const playlistId = req.nextUrl.searchParams.get('playlistId');
  const videoId    = req.nextUrl.searchParams.get('videoId');
  if (!playlistId || !videoId) {
    return NextResponse.json({ error: 'playlistId and videoId are required' }, { status: 400 });
  }

  // Explicit ownership pre-check
  const plCheck = await sql`
    SELECT 1 FROM playlists WHERE playlist_id = ${playlistId} AND user_id = ${userId}
  `;
  if (plCheck.length === 0) {
    return NextResponse.json({ error: 'Forbidden: playlist does not belong to user' }, { status: 403 });
  }

  await sql`
    DELETE FROM playlist_videos
    WHERE playlist_id = ${playlistId} AND video_id = ${videoId}
  `;
  // Compact positions after removal
  await sql`
    WITH ordered AS (
      SELECT video_id, ROW_NUMBER() OVER (ORDER BY position) AS new_pos
      FROM playlist_videos
      WHERE playlist_id = ${playlistId}
    )
    UPDATE playlist_videos pv
    SET position = o.new_pos
    FROM ordered o
    WHERE pv.playlist_id = ${playlistId} AND pv.video_id = o.video_id
  `;
  return NextResponse.json({ success: true });
}
