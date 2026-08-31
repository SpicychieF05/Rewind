import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(req: NextRequest) {
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
