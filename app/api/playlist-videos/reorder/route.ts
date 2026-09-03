import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { auth } from '@/lib/auth/server';

export async function PATCH(req: NextRequest) {
  const sessionRes = await auth.getSession();
  const session = (sessionRes as { data?: { user?: { id: string } } | null })?.data ?? (sessionRes as { user?: { id: string } });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const { playlistId, orderedVideoIds } = await req.json() as {
    playlistId: string;
    orderedVideoIds: string[];
  };

  if (!playlistId || !Array.isArray(orderedVideoIds) || orderedVideoIds.length === 0) {
    return NextResponse.json(
      { error: 'playlistId and orderedVideoIds[] are required' },
      { status: 400 }
    );
  }

  // Explicit ownership pre-check
  const plCheck = await sql`
    SELECT 1 FROM playlists WHERE playlist_id = ${playlistId} AND user_id = ${userId}
  `;
  if (plCheck.length === 0) {
    return NextResponse.json({ error: 'Forbidden: playlist does not belong to user' }, { status: 403 });
  }

  const caseLines = orderedVideoIds
    .map((id, i) => `WHEN video_id = '${id.replace(/'/g, "''")}' THEN ${i + 1}`)
    .join(' ');

  await sql`
    UPDATE playlist_videos
    SET position = CASE ${sql.unsafe(caseLines)} ELSE position END
    WHERE playlist_id = ${playlistId}
  `;

  return NextResponse.json({ success: true });
}
