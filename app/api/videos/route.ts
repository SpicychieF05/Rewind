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

  const channelId = req.nextUrl.searchParams.get('channelId');
  const q = req.nextUrl.searchParams.get('q')?.trim();

  let rows;
  if (channelId && q) {
    const searchPattern = `%${q}%`;
    rows = await sql`
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
      WHERE user_id = ${userId} AND channel_id = ${channelId} AND title ILIKE ${searchPattern}
      ORDER BY saved_at DESC
    `;
  } else if (channelId) {
    rows = await sql`
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
      WHERE user_id = ${userId} AND channel_id = ${channelId}
      ORDER BY saved_at DESC
    `;
  } else if (q) {
    const searchPattern = `%${q}%`;
    rows = await sql`
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
      WHERE user_id = ${userId} AND title ILIKE ${searchPattern}
      ORDER BY saved_at DESC
    `;
  } else {
    rows = await sql`
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
      WHERE user_id = ${userId}
      ORDER BY saved_at DESC
    `;
  }
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
  const { videoId, title, channelId, channelName, channelLogo, thumbnail, publishedAt, views, likes } = body;

  if (!videoId || !title || !channelId) {
    return NextResponse.json({ error: 'videoId, title, and channelId are required' }, { status: 400 });
  }

  // Auto-save the associated channel into saved_channels for this user if not already present
  if (channelId && channelName) {
    await sql`
      INSERT INTO saved_channels
        (channel_id, name, logo, subscriber_count, user_id)
      VALUES
        (${channelId}, ${channelName}, ${channelLogo ?? null}, null, ${userId})
      ON CONFLICT (user_id, channel_id) DO UPDATE
        SET logo = COALESCE(saved_channels.logo, EXCLUDED.logo),
            name = COALESCE(EXCLUDED.name, saved_channels.name)
    `;
  }

  const rows = await sql`
    INSERT INTO saved_videos
      (video_id, title, channel_id, channel_name, channel_logo, thumbnail, published_at, views, likes, user_id)
    VALUES
      (${videoId}, ${title}, ${channelId}, ${channelName ?? ''}, ${channelLogo ?? null},
       ${thumbnail ?? null}, ${publishedAt ?? null}, ${views ?? null}, ${likes ?? null}, ${userId})
    ON CONFLICT (user_id, video_id) DO NOTHING
    RETURNING *
  `;
  return NextResponse.json(rows[0] ?? body);
}

export async function DELETE(req: NextRequest) {
  const sessionRes = await auth.getSession();
  const session = (sessionRes as { data?: { user?: { id: string } } | null })?.data ?? (sessionRes as { user?: { id: string } });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const videoId = req.nextUrl.searchParams.get('videoId');
  if (!videoId) return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });

  // Remove video from saved_videos for this user
  await sql`DELETE FROM saved_videos WHERE video_id = ${videoId} AND user_id = ${userId}`;

  // Cascade removal in playlist_videos for this user's playlists
  await sql`
    DELETE FROM playlist_videos pv
    USING playlists p
    WHERE pv.playlist_id = p.playlist_id
      AND p.user_id = ${userId}
      AND pv.video_id = ${videoId}
  `;

  return NextResponse.json({ success: true });
}
