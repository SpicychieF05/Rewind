# Rewind — YouTube Channel Search & Saved Library

A fast, modern web tool to search any YouTube channel's video history by keyword and timeframe, and save channels/videos into a personal library with custom playlists.

Built with: **Next.js 16 (App Router)** · **React 19** · **Neon Postgres** · **YouTube Data API v3** · **Vercel**

---

## ✨ Features

- **🔍 Smart Channel Video Search**:
  - Resolve channels by `@handle`, custom URL, full channel URL, or any video link.
  - Search by keyword with **Exact** or **Contains** match modes.
  - Filter across customizable timeframes (1 month up to 5 years).
- **💾 Saved Video Search in Header**:
  - Instant live dropdown search in the navbar to quickly search saved videos by title.
  - Shows video thumbnail, channel name, views, and 1-click watch on YouTube.
  - Helpful fallback: if no saved video matches the search term, easily jump directly to searching channel videos on Home with 1 click.
- **📚 Personal Saved Library**:
  - **Channels**: Bookmark your favorite YouTube channels with subscriber count & logos.
  - **Videos**: Save individual videos and organize them.
  - **Playlists**: Create custom playlists, add videos, and reorder them with drag-and-drop (desktop) or arrow controls (mobile).
- **🛡️ Quota Management & Caching**:
  - PostgreSQL-backed search cache (24h TTL) to save quota.
  - Real-time daily quota tracker with a warning indicator when approaching YouTube API limits.
- **🌙 YouTube Dark Aesthetics**:
  - Clean, responsive UI inspired by YouTube's modern design system with glassmorphism touches and smooth animations.

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js 18+**
- A **YouTube Data API v3 key** ([Get one here on Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com))
- A **Neon Postgres database** ([neon.tech](https://neon.tech)) — free tier works great

### 2. Clone & Install
```bash
git clone https://github.com/SpicychieF05/Rewind.git
cd Rewind
npm install
```

### 3. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Fill in your credentials in `.env.local`:
```env
YOUTUBE_API_KEY=your_youtube_api_key_here
DATABASE_URL=postgres://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### 4. Run Database Migration (Once)
Creates all required tables in your Neon PostgreSQL database:
```bash
node migrate-run.mjs
```

### 5. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Deploying to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Update application"
git push origin main
```

### 2. Import to Vercel
1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your **Rewind** repository (Vercel automatically detects Next.js).

### 3. Add Environment Variables
In the Vercel project settings (**Settings → Environment Variables**), add:

| Key | Description | Example |
|-----|-------------|---------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 key | `AIzaSy...` |
| `DATABASE_URL` | Neon Postgres connection string | `postgres://...@...neon.tech/neondb?sslmode=require` |

### 4. Deploy
Click **Deploy** — future pushes to the `main` branch will automatically deploy.

---

## 🗄️ Database Schema

The application uses 6 tables managed via `@neondatabase/serverless`:

| Table | Purpose |
|-------|---------|
| `saved_channels` | Bookmarked YouTube channels |
| `saved_videos` | Saved individual videos |
| `playlists` | Custom playlist groups |
| `playlist_videos` | Join table connecting videos to playlists with custom ordering |
| `quota_usage` | Daily YouTube Data API quota tracking (resets daily at midnight PST) |
| `search_cache` | Server-side database search cache (24h TTL) |

---

## 🔑 YouTube API Quota & Efficiency

YouTube Data API v3 default free tier is **10,000 units/day**:
- `search.list` = **100 units** per call (each page of results)
- `videos.list` = **1 unit** per call

**How Rewind protects your quota**:
- Caches search queries in PostgreSQL (`search_cache`) for 24 hours.
- Tracks daily consumption in `quota_usage`.
- Displays a quota progress banner on the home page and disables pagination when usage reaches 9,500 units.

---

## 📁 Project Structure

```
Rewind/
├── app/
│   ├── api/
│   │   ├── channels/             # CRUD saved channels
│   │   ├── playlist-videos/      # Add/remove & reorder playlist videos
│   │   │   └── reorder/          # Batch reorder playlist video positions
│   │   ├── playlists/            # CRUD custom playlists
│   │   ├── resolve-channel/      # Resolve URLs / @handles to channel ID
│   │   ├── search/               # YouTube search with DB cache & quota guard
│   │   └── videos/               # Save/unsave & search saved videos (?q=...)
│   ├── globals.css               # Global dark theme tokens & styles
│   ├── icon.png                  # Application favicon / icon
│   ├── layout.tsx                # Root layout with sticky NavBar & SEO metadata
│   ├── page.tsx                  # Home search page
│   └── saved/
│       └── page.tsx              # Saved library (Channels, Videos, Playlists)
│
├── components/
│   ├── ChannelBadge.tsx          # Channel chip with logo & subscriber count
│   ├── LoadMoreButton.tsx        # Paginated search results button with quota check
│   ├── NavBar.tsx                # Navigation bar with live saved video search dropdown
│   ├── PlaylistOrderModal.tsx    # Drag-and-drop / arrow reorder modal for playlists
│   ├── PlaylistView.tsx          # Playlist manager with expandable video lists
│   ├── QuotaBanner.tsx           # Visual daily API quota usage bar
│   ├── SavedTabs.tsx             # Tab switcher for Saved page
│   ├── SearchForm.tsx            # Channel + keyword + timeframe search form
│   └── VideoCard.tsx             # Video card with thumbnail, info & save actions
│
├── lib/
│   ├── channelResolver.ts        # Parses channel input (@handle, URL, ID, video URL)
│   ├── db.ts                     # Neon Postgres serverless client singleton
│   ├── migrate.ts                # Database migration schemas
│   └── youtube.ts                # YouTube Data API client & cache logic
│
├── public/                       # Static public assets & favicons
├── migrate-run.mjs               # Standalone runner for database migration
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies and scripts
└── tsconfig.json                 # TypeScript configuration
```

---

## 📱 Responsive Experience

- **Desktop**: Multi-column video grids, real-time live autocomplete search dropdown, drag-to-reorder playlists.
- **Mobile (< 640px)**: Compact single-column layouts, mobile search drawer, arrow-button playlist reordering, and responsive touch controls.
