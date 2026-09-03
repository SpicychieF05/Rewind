# Rewind — YouTube Channel Search & Saved Library

A fast, modern web tool to search any YouTube channel's video history by keyword and timeframe, and save channels/videos into a personal library with custom playlists.

Built with: **Next.js 16 (App Router)** · **React 19** · **Neon Postgres** · **Neon Auth** · **YouTube Data API v3** · **Vercel**

---

## ✨ Features

- **🔍 Smart Channel Video Search**:
  - Resolve channels by `@handle`, custom URL, full channel URL, or any video link.
  - Search by keyword with **Exact** or **Contains** match modes.
  - Filter across customizable timeframes (1 month up to 5 years).
  - Search remains 100% public and free without requiring login.
- **🔐 Multi-User Authentication (Neon Auth)**:
  - Secure authentication powered by Neon Auth (Managed Better Auth).
  - Two streamlined sign-in methods: **Google Sign-In** and **Email & Password**.
  - **Email OTP Verification**: Automatic redirection to a 6-digit OTP verification screen after signup, complete with a dedicated countdown timer and **Resend OTP** button.
  - User avatar, session-aware controls in the navbar, and automated route protection via Edge Middleware (`/saved`).
- **💾 Saved Video Search in Header**:
  - Instant live dropdown search in the navbar to quickly search saved videos by title.
  - Shows video thumbnail, channel name, views, and 1-click watch on YouTube.
  - Helpful fallback: if logged out or if no saved video matches the search term, easily jump directly to searching channel videos on Home with 1 click.
- **📚 Personal Saved Library**:
  - Private to each authenticated user across all devices.
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
- **Node.js 18+** installed
- A **Google Cloud account** (for YouTube Data API v3)
- A **Neon account** ([neon.tech](https://neon.tech)) with a serverless Postgres project

---

### 2. Gathering Required Information & Credentials

Before configuring your environment, gather the following 4 credentials:

#### A. YouTube Data API v3 Key (`YOUTUBE_API_KEY`)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or select an existing one).
3. Navigate to **APIs & Services → Library**, search for **YouTube Data API v3**, and click **Enable**.
4. Go to **APIs & Services → Credentials**, click **Create Credentials → API Key**.
5. Copy your generated API key.

#### B. Neon Postgres Database URL (`DATABASE_URL`)
1. Log in to your [Neon Console](https://console.neon.tech/).
2. Create a new project (or select an existing one).
3. Under **Dashboard → Connection Details**, choose **Pooled connection**.
4. Copy the connection string (format: `postgres://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require`).

#### C. Neon Auth Base URL (`NEON_AUTH_BASE_URL`)
1. In your Neon Console project, navigate to **Auth** in the left sidebar.
2. If not already enabled, click **Enable Auth**.
3. Under **Auth Settings**:
   - Ensure **Email & Password** is toggled on (with Email Verification via OTP enabled).
   - Under Social Providers, configure **Google OAuth** with your Google Client ID & Secret if desired.
   - Under **Allowed Origins / Redirect URLs**, ensure `http://localhost:3000` is present.
4. Copy your project's **Auth URL** (format: `https://ep-xyz.neonauth.region.aws.neon.tech/neondb/auth`).

#### D. Neon Auth Cookie Secret (`NEON_AUTH_COOKIE_SECRET`)
Neon Auth requires a `NEON_AUTH_COOKIE_SECRET` — a random 32+ character string used to sign session cookies. Generate one by running:

```bash
openssl rand -base64 32
```

in a terminal (Mac/Linux, or Git Bash on Windows), and save the output somewhere safe. If you can't run that command, any random 32+ character string works, but `openssl` is the recommended way to get a properly secure one.

> **Note**: This command generates a cryptographically random 32-byte value, base64-encoded, which is what Neon Auth uses to sign and verify session cookies. If you ever need to rotate your secret, re-run this exact command, copy the new output, and update it in both your Neon Auth dashboard and Vercel/local environment variables.

---

### 3. Clone & Install

```bash
git clone https://github.com/SpicychieF05/Rewind.git
cd Rewind
npm install
```

---

### 4. Configure Environment Variables

Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```

Fill in your 4 credentials in `.env.local`:
```env
# YouTube Data API v3 key
YOUTUBE_API_KEY=your_youtube_api_key_here

# Neon Postgres connection string
DATABASE_URL=postgres://user:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require

# Neon Auth Configuration
NEON_AUTH_BASE_URL=https://your-project.neonauth.region.aws.neon.tech/neondb/auth
NEON_AUTH_COOKIE_SECRET=your_generated_openssl_32_byte_secret
```

---

### 5. Run Database Migration (Once)

Initializes the required database schema, multi-tenant ownership columns, and indexes:
```bash
node auth-migrate.mjs
```

---

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Deploying to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Deploy Rewind with Neon Auth"
git push origin main
```

### 2. Import to Vercel
1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your **Rewind** repository (Vercel automatically detects Next.js).

### 3. Add Environment Variables
In your Vercel project settings (**Settings → Environment Variables**), add all 4 variables for **Production**, **Preview**, and **Development**:

| Key | Description | Example |
|-----|-------------|---------|
| `YOUTUBE_API_KEY` | Google YouTube Data API v3 key | `AIzaSy...` |
| `DATABASE_URL` | Neon Postgres pooled connection string | `postgres://...@...neon.tech/neondb?sslmode=require` |
| `NEON_AUTH_BASE_URL` | Neon Auth base URL from Neon Console | `https://ep-xyz.neonauth.region.aws.neon.tech/neondb/auth` |
| `NEON_AUTH_COOKIE_SECRET` | 32+ character cookie secret from `openssl` | Generated base64 string |

### 4. Configure Production URL in Neon Console
After Vercel assigns your project domain (e.g., `https://rewind.vercel.app`):
1. Go to **Neon Console → Auth → Settings**.
2. Add your production domain to **Allowed Origins / Redirect URLs**:
   - `https://your-project.vercel.app` (and your custom domain if applicable)
3. Save changes.

### 5. Deploy
Click **Deploy** — future pushes to the `main` branch will automatically deploy.

---

## 🗄️ Database Schema

The application uses 6 tables in PostgreSQL managed via `@neondatabase/serverless`:

| Table | Primary Key | Description |
|-------|-------------|-------------|
| `saved_channels` | `(user_id, channel_id)` | User-bookmarked channels with logos & subscriber counts |
| `saved_videos` | `(user_id, video_id)` | User-saved videos with metadata & timestamps |
| `playlists` | `playlist_id` | User-created custom playlists scoped by `user_id` |
| `playlist_videos` | `(playlist_id, video_id)` | Join table connecting saved videos to playlists with `position` ordering |
| `quota_usage` | `date` | Global YouTube Data API quota tracking (resets daily at midnight PST) |
| `search_cache` | `cache_key` | Server-side query cache (24h TTL) to minimize external API requests |

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
│   │   ├── auth/[...path]/       # Neon Auth catch-all route handler
│   │   ├── channels/             # CRUD saved channels (user-scoped)
│   │   ├── playlist-videos/      # Add/remove & query playlist videos
│   │   │   └── reorder/          # Batch reorder playlist video positions
│   │   ├── playlists/            # CRUD custom playlists (user-scoped)
│   │   ├── resolve-channel/      # Public: resolve URLs / @handles to channel ID
│   │   ├── search/               # Public: YouTube search with DB cache & quota guard
│   │   └── videos/               # CRUD saved videos & search saved library (?q=...)
│   ├── auth/[path]/              # Dynamic Neon Auth views (sign-in, sign-up, email-verification)
│   ├── globals.css               # Global dark theme tokens & styles
│   ├── icon.png                  # Application favicon / icon
│   ├── layout.tsx                # Root layout with Providers & sticky NavBar
│   ├── page.tsx                  # Public home search page
│   ├── providers.tsx             # NeonAuthUIProvider configuration
│   └── saved/
│       └── page.tsx              # Private saved library (gated by middleware)
│
├── components/
│   ├── ChannelBadge.tsx          # Channel chip with logo & subscriber count
│   ├── LoadMoreButton.tsx        # Paginated search results button with quota check
│   ├── NavBar.tsx                # Navigation bar with session avatar & live saved search
│   ├── PlaylistOrderModal.tsx    # Drag-and-drop / arrow reorder modal for playlists
│   ├── PlaylistView.tsx          # Playlist manager with expandable video lists
│   ├── QuotaBanner.tsx           # Visual daily API quota usage bar
│   ├── SavedTabs.tsx             # Tab switcher for Saved page
│   ├── SearchForm.tsx            # Channel + keyword + timeframe search form
│   ├── SignInPromptModal.tsx     # Modal prompting unauthenticated users to sign in
│   ├── VideoCard.tsx             # Video card with auth-gated save & playlist actions
│   └── VideoPlayer.tsx           # In-app video player overlay
│
├── lib/
│   ├── auth/
│   │   ├── client.ts             # Client-side authClient instance
│   │   └── server.ts             # Server-side createNeonAuth instance
│   ├── channelResolver.ts        # Parses channel input (@handle, URL, ID, video URL)
│   ├── db.ts                     # Neon Postgres serverless client singleton
│   ├── migrate.ts                # Database migration definitions
│   └── youtube.ts                # YouTube Data API client & cache logic
│
├── middleware.ts                 # Edge proxy protecting /saved routes
├── auth-migrate.mjs              # Standalone migration script for multi-tenant auth schema
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies and scripts
└── tsconfig.json                 # TypeScript configuration
```

---

## 📱 Responsive Experience

- **Desktop**: Multi-column video grids, real-time live autocomplete search dropdown, drag-to-reorder playlists.
- **Mobile (< 640px)**: Compact single-column layouts, mobile navigation drawer, mobile search input, arrow-button playlist reordering, and responsive touch controls.
