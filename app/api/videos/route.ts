import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';


export async function GET(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get('channelId');
  const rows = channelId
    ? await sql`
        SELECT
          video_id AS "videoId",
          title,
          channel_id AS "channelId",
          channel_name AS "channelName",
          channel_logo AS "channelLogo",
          thumbnail,
          published_at AS "publishedAt",
          views,
          likes,
          saved_at AS "savedAt"
        FROM saved_videos
        WHERE channel_id = ${channelId}
        ORDER BY saved_at DESC
      `
    : await sql`
        SELECT
          video_id AS "videoId",
          title,
          channel_id AS "channelId",
          channel_name AS "channelName",
          channel_logo AS "channelLogo",
          thumbnail,
          published_at AS "publishedAt",
          views,
          likes,
          saved_at AS "savedAt"
        FROM saved_videos
        ORDER BY saved_at DESC
      `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { videoId, title, channelId, channelName, channelLogo, thumbnail, publishedAt, views, likes } = body;

  if (!videoId || !title || !channelId) {
    return NextResponse.json({ error: 'videoId, title, and channelId are required' }, { status: 400 });
  }

  // Auto-save the associated channel into saved_channels if not already present
  if (channelId && channelName) {
    await sql`
      INSERT INTO saved_channels
        (channel_id, name, logo, subscriber_count)
      VALUES
        (${channelId}, ${channelName}, ${channelLogo ?? null}, null)
      ON CONFLICT (channel_id) DO UPDATE
        SET logo = COALESCE(saved_channels.logo, EXCLUDED.logo),
            name = COALESCE(EXCLUDED.name, saved_channels.name)
    `;
  }

  const rows = await sql`
    INSERT INTO saved_videos
      (video_id, title, channel_id, channel_name, channel_logo, thumbnail, published_at, views, likes)
    VALUES
      (${videoId}, ${title}, ${channelId}, ${channelName ?? ''}, ${channelLogo ?? null},
       ${thumbnail ?? null}, ${publishedAt ?? null}, ${views ?? null}, ${likes ?? null})
    ON CONFLICT (video_id) DO NOTHING
    RETURNING *
  `;
  return NextResponse.json(rows[0] ?? body);
}

export async function DELETE(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  // Cascade in playlist_videos is handled by FK ON DELETE CASCADE
  await sql`DELETE FROM saved_videos WHERE video_id = ${videoId}`;
  return NextResponse.json({ success: true });
}
