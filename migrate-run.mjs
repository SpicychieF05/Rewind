// migrate-run.mjs
// Run with: node migrate-run.mjs
// Reads DATABASE_URL from .env.local directly

import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';

// Parse .env.local manually (no dotenv needed)
let DATABASE_URL = '';
try {
  const envContent = readFileSync('.env.local', 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      DATABASE_URL = line.slice('DATABASE_URL='.length).trim();
    }
  }
} catch {
  console.error('Could not read .env.local');
  process.exit(1);
}

if (!DATABASE_URL || DATABASE_URL === 'PASTE_YOUR_NEON_CONNECTION_STRING_HERE') {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log('🚀 Running Rewind database migration...\n');

  await sql`
    CREATE TABLE IF NOT EXISTS saved_channels (
      channel_id       TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      logo             TEXT,
      subscriber_count BIGINT,
      saved_at         TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✅ saved_channels');

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

  await sql`
    CREATE TABLE IF NOT EXISTS playlists (
      playlist_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✅ playlists');

  await sql`
    CREATE TABLE IF NOT EXISTS playlist_videos (
      playlist_id UUID    REFERENCES playlists(playlist_id) ON DELETE CASCADE,
      video_id    TEXT    REFERENCES saved_videos(video_id) ON DELETE CASCADE,
      position    INTEGER NOT NULL,
      PRIMARY KEY (playlist_id, video_id)
    )
  `;
  console.log('✅ playlist_videos');

  await sql`
    CREATE TABLE IF NOT EXISTS quota_usage (
      usage_date  DATE    PRIMARY KEY,
      units_used  INTEGER NOT NULL DEFAULT 0
    )
  `;
  console.log('✅ quota_usage');

  await sql`
    CREATE TABLE IF NOT EXISTS search_cache (
      cache_key  TEXT        PRIMARY KEY,
      results    JSONB       NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
  console.log('✅ search_cache');

  console.log('\n🎉 Migration complete! All 6 tables are ready.');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
