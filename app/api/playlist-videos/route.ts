import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const playlistId = req.nextUrl.searchParams.get('playlistId');
  if (!playlistId) return NextResponse.json({ error: 'Missing playlistId' }, { status: 400 });

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
    JOIN saved_videos sv ON sv.video_id = pv.video_id
    WHERE pv.playlist_id = ${playlistId}
    ORDER BY pv.position ASC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const { playlistId, videoId } = await req.json();
  if (!playlistId || !videoId) {
    return NextResponse.json({ error: 'playlistId and videoId are required' }, { status: 400 });
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
  const playlistId = req.nextUrl.searchParams.get('playlistId');
  const videoId    = req.nextUrl.searchParams.get('videoId');
  if (!playlistId || !videoId) {
    return NextResponse.json({ error: 'playlistId and videoId are required' }, { status: 400 });
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
