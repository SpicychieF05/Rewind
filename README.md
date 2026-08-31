# Rewind — YouTube Channel Search & Saved Library

A personal web tool to search any YouTube channel's video history by keyword + timeframe, and save channels/videos into a personal library with custom playlists.

Built with: **Next.js 14** · **Neon Postgres** · **YouTube Data API v3** · **Vercel**

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+
- A YouTube Data API v3 key ([get one here](https://console.cloud.google.com/apis/library/youtube.googleapis.com))
- A Neon database ([neon.tech](https://neon.tech)) — free tier works great

### 2. Clone & Install
```bash
git clone <your-repo-url>
cd Rewind
npm install
```

### 3. Configure environment variables
```bash
cp .env.local.example .env.local
# Edit .env.local and fill in your keys
```

### 4. Run the database migration (once)
This creates all 6 tables in your Neon database:
```bash
node migrate-run.mjs
```

> ⚠️ Make sure `DATABASE_URL` is set in `.env.local` before running this.

### 5. Start the dev server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🚀 Deploying to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Import to Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo — Vercel auto-detects Next.js, no config needed

### 3. Add Environment Variables
In Vercel dashboard → **Settings → Environment Variables**, add:

| Key | Value |
|-----|-------|
| `YOUTUBE_API_KEY` | Your YouTube Data API v3 key |
| `DATABASE_URL` | Your Neon connection string (`postgres://...?sslmode=require`) |

### 4. Deploy
Click **Deploy** — every `git push main` after that auto-deploys.

---

## 🗄️ Database Schema

Six Postgres tables (created by `lib/migrate.ts`):

| Table | Purpose |
|-------|---------|
| `saved_channels` | Bookmarked YouTube channels |
| `saved_videos` | Saved individual videos |
| `playlists` | Named playlist groups |
| `playlist_videos` | Join table: which videos are in which playlists (with position order) |
| `quota_usage` | Daily YouTube API quota tracking (one row per day) |
| `search_cache` | DB-backed search result cache (24h TTL, safe for Vercel stateless) |

---

## 🔑 API Quota

YouTube Data API v3 free tier: **10,000 units/day**
- `search.list` = **100 units** per call (each page of results)
- `videos.list` = **1 unit** per call

The app caches results in Postgres (`search_cache`) for 24 hours and blocks extra page loads when usage approaches 9,500 units. A quota banner is shown on the homepage.

---

## 📁 Project Structure

```
app/
  page.tsx                  ← Homepage / Search
  saved/page.tsx            ← Saved Library (channels, videos, playlists)
  layout.tsx                ← Root layout with NavBar
  globals.css               ← YouTube-mirrored dark theme + design tokens
  api/
    resolve-channel/        ← Resolves channel URL/@handle/ID → channelId
    search/                 ← YouTube search with DB cache + quota guard
    channels/               ← Save/unsave channels
    videos/                 ← Save/unsave videos
    playlists/              ← CRUD playlists
    playlist-videos/        ← Add/remove/reorder playlist videos

components/
  NavBar.tsx                ← Sticky nav (responsive)
  SearchForm.tsx            ← Channel + keyword + match mode + timeframe
  VideoCard.tsx             ← YouTube-style video card
  ChannelBadge.tsx          ← Channel button for Saved grid
  SavedTabs.tsx             ← Tab bar (Channels | Videos | Playlists)
  PlaylistView.tsx          ← Playlist CRUD + expand
  PlaylistOrderModal.tsx    ← Drag (desktop) / arrow buttons (mobile) reorder
  QuotaBanner.tsx           ← Daily quota usage indicator
  LoadMoreButton.tsx        ← Pagination with quota guard

lib/
  db.ts                     ← Neon serverless connection
  migrate.ts                ← One-time DB migration script
  channelResolver.ts        ← Parses any channel input format
  youtube.ts                ← YouTube API wrapper + cache + quota tracking
```

---

## 📱 Responsive Layout

- Desktop: multi-column video grid, inline search form, drag-to-reorder playlists
- Mobile (< 640px): single-column, stacked form, arrow-button playlist reorder, collapsible nav search
