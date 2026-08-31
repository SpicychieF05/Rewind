
import { config } from 'dotenv';
import path from 'path';

// Load .env.local so we can run this script locally
config({ path: path.resolve(process.cwd(), '.env.local') });

import { sql } from './db';

async function migrate() {
  console.log('🚀 Running Rewind database migration...\n');

  // 1. saved_channels
  await sql`
    CREATE TABLE IF NOT EXISTS saved_channels (
      channel_id      TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      logo            TEXT,
      subscriber_count BIGINT,
      saved_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✅ saved_channels');

  // 2. saved_videos
  await sql`
    CREATE TABLE IF NOT EXISTS saved_videos (
      video_id     TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      channel_id   TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      channel_logo TEXT,
      thumbnail    TEXT,
      published_at TIMESTAMPTZ,
      views        BIGINT,
      likes        BIGINT,
      saved_at     TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✅ saved_videos');

  // 3. playlists
  await sql`
    CREATE TABLE IF NOT EXISTS playlists (
      playlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✅ playlists');

  // 4. playlist_videos  (join table with explicit ordering)
  await sql`
    CREATE TABLE IF NOT EXISTS playlist_videos (
      playlist_id UUID    REFERENCES playlists(playlist_id) ON DELETE CASCADE,
      video_id    TEXT    REFERENCES saved_videos(video_id) ON DELETE CASCADE,
      position    INTEGER NOT NULL,
      PRIMARY KEY (playlist_id, video_id)
    )
  `;
  console.log('✅ playlist_videos');

  // 5. quota_usage  (one row per calendar day — upserted on every API call)
  await sql`
    CREATE TABLE IF NOT EXISTS quota_usage (
      usage_date  DATE    PRIMARY KEY,
      units_used  INTEGER NOT NULL DEFAULT 0
    )
  `;
  console.log('✅ quota_usage');

  // 6. search_cache  (DB-backed cache — safe for Vercel stateless functions)
  await sql`
    CREATE TABLE IF NOT EXISTS search_cache (
      cache_key  TEXT        PRIMARY KEY,
      results    JSONB       NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
  console.log('✅ search_cache');

  console.log('\n🎉 Migration complete! All 6 tables are ready.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
