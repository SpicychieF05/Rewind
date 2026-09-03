// auth-migrate.mjs
// Run with: node auth-migrate.mjs
// Reads DATABASE_URL from .env.local and executes Neon Auth migration

import { readFileSync } from 'fs';
import { neon } from '@neondatabase/serverless';

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

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log('🚀 Running Rewind Neon Auth database migration...\n');

  const chCount = await sql`SELECT COUNT(*)::int AS count FROM saved_channels`;
  const vidCount = await sql`SELECT COUNT(*)::int AS count FROM saved_videos`;
  const plCount = await sql`SELECT COUNT(*)::int AS count FROM playlists`;
  const pvCount = await sql`SELECT COUNT(*)::int AS count FROM playlist_videos`;
  console.log(`Current rows: channels=${chCount[0].count}, videos=${vidCount[0].count}, playlists=${plCount[0].count}, playlist_videos=${pvCount[0].count}`);

  // Per PRD Section 1 & 2: saved-data tables are intended to be empty before auth
  if (chCount[0].count > 0 || vidCount[0].count > 0 || plCount[0].count > 0 || pvCount[0].count > 0) {
    console.log('⚠️ Clearing leftover unowned rows per PRD requirement...');
    await sql`DELETE FROM playlist_videos`;
    await sql`DELETE FROM playlists`;
    await sql`DELETE FROM saved_videos`;
    await sql`DELETE FROM saved_channels`;
    console.log('✅ Cleared unowned rows.');
  }

  // 1. playlist_videos: Drop FK to saved_videos(video_id) so saved_videos can use composite PK (user_id, video_id)
  console.log('⏳ Updating playlist_videos foreign keys...');
  await sql`
    ALTER TABLE playlist_videos
      DROP CONSTRAINT IF EXISTS playlist_videos_video_id_fkey
  `;
  console.log('✅ playlist_videos: dropped video_id FK to saved_videos');

  // 2. saved_channels: add user_id, update primary key to (user_id, channel_id)
  console.log('⏳ Updating saved_channels table...');
  const chCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'saved_channels' AND column_name = 'user_id'
  `;
  if (chCols.length === 0) {
    await sql`ALTER TABLE saved_channels ADD COLUMN user_id TEXT NOT NULL`;
  }
  await sql`
    ALTER TABLE saved_channels DROP CONSTRAINT IF EXISTS saved_channels_pkey;
  `;
  await sql`
    ALTER TABLE saved_channels ADD CONSTRAINT saved_channels_pkey PRIMARY KEY (user_id, channel_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS saved_channels_user_id_idx ON saved_channels (user_id);
  `;
  console.log('✅ saved_channels: composite PK (user_id, channel_id) & index created');

  // 3. saved_videos: add user_id, update primary key to (user_id, video_id)
  console.log('⏳ Updating saved_videos table...');
  const vidCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'saved_videos' AND column_name = 'user_id'
  `;
  if (vidCols.length === 0) {
    await sql`ALTER TABLE saved_videos ADD COLUMN user_id TEXT NOT NULL`;
  }
  await sql`
    ALTER TABLE saved_videos DROP CONSTRAINT IF EXISTS saved_videos_pkey;
  `;
  await sql`
    ALTER TABLE saved_videos ADD CONSTRAINT saved_videos_pkey PRIMARY KEY (user_id, video_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS saved_videos_user_id_idx ON saved_videos (user_id);
  `;
  console.log('✅ saved_videos: composite PK (user_id, video_id) & index created');

  // 4. playlists: add user_id column
  console.log('⏳ Updating playlists table...');
  const plCols = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'playlists' AND column_name = 'user_id'
  `;
  if (plCols.length === 0) {
    await sql`ALTER TABLE playlists ADD COLUMN user_id TEXT NOT NULL`;
  }
  await sql`
    CREATE INDEX IF NOT EXISTS playlists_user_id_idx ON playlists (user_id);
  `;
  console.log('✅ playlists: user_id column & index created');

  console.log('\n🎉 Neon Auth database migration completed successfully!');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
