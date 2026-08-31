# Product Requirements Document

## YouTube Channel Search & Saved Library Tool

**Version:** 1.0
**Status:** Draft
**Owner:** SpicyChief
**Last updated:** August 31, 2026

---

## 1. Overview

A personal web tool that lets a user search a specific YouTube channel's video history by title/keyword and a custom timeframe, using a YouTube-style interface. Results show real video metadata (thumbnail, channel logo/name, publish date, views, likes) pulled live from the YouTube Data API. The tool does not host or play video — clicking a thumbnail redirects to YouTube itself.

A second core area, the **Saved page**, lets the user bookmark channels and videos for later, and organize saved videos into custom playlists (again, playback happens on YouTube — this tool only stores references and metadata).

---

## 2. Problem Statement

YouTube's native search and channel-page browsing don't let users:

- Search _within_ a single channel by title keyword combined with a specific historical time window (e.g. "show me this channel's videos from 2–3 years ago containing 'tutorial'").
- Save channels and individual videos into a personal, self-organized library independent of YouTube's own "Watch Later"/subscriptions system, including custom playlists that mix videos from different channels.

This tool solves that gap with a lightweight, YouTube-familiar UI.

---

## 3. Goals

- Let a user find old/specific videos on a channel fast, using title search + timeframe filtering.
- Present results in a UI immediately familiar to YouTube users (thumbnail, title, channel logo/name, date, views, likes).
- Let the user save channels and videos into a persistent personal "Saved" area.
- Let the user group saved videos into custom playlists.
- Keep the build simple enough for a solo dev + AI coding agent (e.g. Antigravity) to implement without complex infra.

### Non-Goals (v1)

- No in-app video playback (thumbnail click → opens the video on YouTube).
- No user accounts/multi-user support (single-user, local/personal use assumed for v1).
- No comments, subscriptions, notifications, or recommendation engine.
- No mobile app — responsive web only.

---

## 4. Users

Single primary persona: **the builder/owner themselves**, someone who follows specific YouTube channels closely and wants a faster way to dig through a channel's back catalog and keep a personal curated shortlist — without relying on YouTube's own history/algorithm.

---

## 5. Core Features (v1)

### 5.1 Channel Search

**Input fields (all on homepage):**
| Field | Details |
|---|---|
| Channel | Accepts channel URL, `@handle`, or raw channel ID. Must resolve to a valid `channelId`. |
| Video title / keyword | Free text. Two match modes: **Exact match** (title must contain the exact phrase) and **Contains words** (title contains any/all of the given words — YouTube relevance search, refined by local filtering). |
| Timeline | Preset dropdown: Last 1 / 2 / 3 / 6 / 12 months, or Last 1 / 2 / 3 / 4 / 5 years. Maps to `publishedAfter` (and optionally `publishedBefore`). |

**Behavior:**

1. Resolve channel input → `channelId`.
2. Query YouTube Data API `search.list` scoped to that channel, keyword, and date range.
3. Apply local post-filtering for exact-match mode (and optionally to tighten contains-mode).
4. Batch-fetch full stats (views, likes, duration, thumbnail) for matched video IDs.
5. Fetch channel metadata once (name, logo/avatar, subscriber count).
6. Render results as a YouTube-style grid.

**Result card contents:** thumbnail, video title, channel logo, channel name, publish date, view count, like count.

**Empty/edge states:** invalid channel input, no results in timeframe, API quota exceeded (see §7) — each needs a clear inline message, not a silent failure.

### 5.2 Saved Page

A new page, linked from the homepage via a persistent button/nav item (e.g. "Saved").

**Structure:**

- **Saved Channels** — a grid/list of channels the user has bookmarked, each shown as a button with just the **channel logo + channel name** (no extra stats needed on the button itself). Clicking a saved channel button opens a **channel-wise filtered view of the user's own saved library**: all individually **saved videos** from that channel, plus any **playlists that contain at least one video** from that channel. This is a filter into what's already saved — it does not trigger a new YouTube search.
- **Saved Videos** — a grid/list of individually saved videos (same card style as search results: thumbnail, title, channel, date, views, likes).
  - Within Saved Videos, the user can create **playlists** — named groupings of saved videos. A saved video can belong to multiple playlists, and a playlist can mix videos from different channels.
  - **Playlist ordering:** an explicit **"Order" mode/button** on each playlist. Entering this mode shows all videos in the playlist as a reorderable list, each row showing its **thumbnail** alongside a position number (01, 02, … n) for easy visual arrangement. User can drag to reorder; new position numbers update live. Exiting order mode saves the sequence.

**Save actions:**

- "Save channel" button — available on search results (channel header) and anywhere a channel appears.
- "Save video" button — available on every video card, in search results or elsewhere.
- "Add to playlist" — available on any saved video; opens a picker to add to an existing playlist or create a new one.

### 5.3 Playback Behavior

No video is ever embedded or played inside the tool. Clicking any thumbnail (in search results, saved videos, or a playlist) opens that video on `youtube.com` in a new tab. This applies uniformly across the whole app — it's a metadata/discovery layer only, not a viewer.

---

## 6. UI/UX Requirements

- Visual style mirrors YouTube's own layout conventions: card grid, thumbnail aspect ratio, typography weight/hierarchy for title vs. metadata line.
- Persistent top nav: logo/home, search bar, "Saved" button.
- Saved page uses tabs or side-sections: **Channels | Videos | Playlists**.
- Save/bookmark icons should reflect current state (e.g. filled star/bookmark if already saved).
- Responsive layout (desktop-first is fine for v1, but shouldn't break on smaller screens).

---

## 7. Technical Considerations

### 7.1 Data Source

YouTube Data API v3, `search.list` endpoint (per prior decision — chosen over the uploads-playlist approach because not all target videos are guaranteed to appear in a channel's uploads playlist).

### 7.2 Quota Management (critical constraint)

- `search.list` costs **100 quota units per call**; free tier daily quota is **10,000 units** → roughly **100 base searches/day**, fewer if results paginate (each extra page of 50 results is another 100 units).
- `videos.list` and `channels.list` are cheap (1 unit per call, up to 50 IDs batched) and won't be the bottleneck.
- **Required mitigations for v1:**
  - Cache search results per (channelId, query, matchMode, timeframe) combination for a reasonable window (e.g. 24 hours) to avoid repeat-cost on repeat searches.
  - Show the user a visible quota usage indicator or at least a graceful "quota exceeded, try again after reset" error state.
  - Saved channels/videos should store their metadata at save-time so revisiting the Saved page **never** re-calls the API unless the user explicitly refreshes.

### 7.3 Architecture (decided — optimized for Antigravity free-plan build + free deploy)

- **Framework: Next.js** (React) — frontend UI and backend logic live in one project. API routes (`/api/...`) act as the backend, so there's no separate server to stand up or manage.
- **Hosting: Vercel free tier** — deploys directly from a GitHub repo, zero-config for Next.js, generous free usage for a single-user tool. (GitHub Pages was ruled out: it's static-file hosting only and can't run backend code or hide the API key.)
- **Database: Neon free tier (serverless Postgres)** — Vercel's serverless functions don't retain local disk between requests, so a file-based DB like SQLite won't reliably persist. Neon gives a free, hosted Postgres database that connects to Vercel directly through Vercel's own "Storage" integration tab (a few clicks, no separate account juggling), with no server to manage.
- **API key handling:** YouTube Data API key and Neon database connection string both stored as Vercel environment variables, read only inside API routes — never sent to the browser.
- **Core tables (Neon/Postgres):**
  - `saved_channels` (channelId, name, logo, subscriberCount, savedAt)
  - `saved_videos` (videoId, title, channelId, thumbnail, publishedAt, views, likes, savedAt)
  - `playlists` (playlistId, name, createdAt)
  - `playlist_videos` (playlistId, videoId, position) — join table; `position` drives the Order-mode sequence (01, 02, … n)

The **channel-wise saved view** (§5.2) needs no separate table — it's just a query: filter `saved_videos` by `channelId`, and separately find any `playlists` that contain at least one video with that `channelId` (via `playlist_videos` joined to `saved_videos`).

This combination (Next.js + Vercel + Neon) is one of the most common, well-documented starter stacks available — Neon even has an official one-click Vercel integration — which makes it a strong fit for an AI coding agent like Antigravity to scaffold reliably with minimal manual setup.

### 7.4 Channel Resolution

Need a small utility to parse any of: full channel URL, `/@handle` URL, or raw channel ID, and resolve to a canonical `channelId` via the `channels.list` API (`forHandle` or search fallback).

---

## 8. Success Criteria (v1)

- User can search any public channel by title/keyword + timeframe and get accurate, correctly-dated results.
- Exact-match vs. contains-match modes behave distinguishably and correctly.
- User can save channels/videos and see them persist across sessions.
- User can create a playlist and add/remove/reorder saved videos in it.
- No video ever attempts to play inside the app; all thumbnails link out to YouTube.
- Tool stays usable within the free API quota under normal personal-use search volume.

---

## 9. Future Considerations (explicitly out of scope for v1, per your note that more features will be added later)

- Multi-user accounts/auth.
- Notes/tags on saved videos.
- Export/import of saved library.
- Multiple search terms or boolean search (AND/OR/exclude words).
- Sort/filter within results (by views, likes, date).
- Channel activity stats/dashboards.
- Browser extension version.

---

## 10. Open Questions

- Should playlists also support **rename** and **delete** in v1, or is create + add/remove + reorder enough to start? (Reordering is now confirmed in scope; rename/delete not yet explicitly decided.)
- Should removing a video from a playlist also remove it from "Saved Videos" generally, or are these independent (a video can be un-playlisted but stay saved)? Recommended default: independent — playlist membership and "saved" status are separate.
