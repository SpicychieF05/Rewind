'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SearchForm, { type SearchFormValues } from '@/components/SearchForm';
import VideoCard from '@/components/VideoCard';
import VideoPlayer from '@/components/VideoPlayer';
import QuotaBanner from '@/components/QuotaBanner';
import LoadMoreButton from '@/components/LoadMoreButton';
import type { VideoResult } from '@/lib/youtube';

interface ChannelMeta {
  channelId: string;
  name: string;
  logo: string;
  subscriberCount: number | null;
}

interface SearchState {
  channelMeta: ChannelMeta | null;
  videos: VideoResult[];
  nextPageToken: string | null;
  quotaUsed: number;
  quotaNearLimit: boolean;
  quotaExceeded: boolean;
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
  hasSearched: boolean;
  currentFormValues: SearchFormValues | null;
}

function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') ?? '';

  const [savedVideoIds, setSavedVideoIds] = useState<Set<string>>(new Set());
  const [savedVideos, setSavedVideos] = useState<VideoResult[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoResult | null>(null);
  const [state, setState] = useState<SearchState>({
    channelMeta: null,
    videos: [],
    nextPageToken: null,
    quotaUsed: 0,
    quotaNearLimit: false,
    quotaExceeded: false,
    error: null,
    loading: false,
    loadingMore: false,
    hasSearched: false,
    currentFormValues: null,
  });

  // Load saved video IDs on mount for bookmark state; also keep full list for player side-panel
  useEffect(() => {
    type DbRow = {
      video_id: string; title: string; channel_id: string; channel_name: string;
      channel_logo: string; thumbnail: string; published_at: string;
      views: number | null; likes: number | null;
    };
    fetch('/api/videos')
      .then((r) => r.json())
      .then((rows: DbRow[]) => {
        setSavedVideoIds(new Set(rows.map((r) => r.video_id)));
        setSavedVideos(rows.map((r) => ({
          videoId:     r.video_id,
          title:       r.title ?? 'Untitled Video',
          channelId:   r.channel_id ?? '',
          channelName: r.channel_name ?? '',
          channelLogo: r.channel_logo ?? '',
          thumbnail:   r.thumbnail ?? '',
          publishedAt: r.published_at ?? '',
          views:       r.views != null ? Number(r.views) : null,
          likes:       r.likes != null ? Number(r.likes) : null,
          duration:    null,
        })));
      })
      .catch(() => {});
  }, []);

  // ── Core search ──────────────────────────────────────────────────────────

  const doSearch = useCallback(async (values: SearchFormValues, pageToken = '') => {
    const isLoadMore = !!pageToken;

    setState((prev) => ({
      ...prev,
      loading: !isLoadMore,
      loadingMore: isLoadMore,
      error: null,
      currentFormValues: values,
    }));

    try {
      // Step 1: resolve channel
      let channelMeta = state.channelMeta;
      if (!isLoadMore || !channelMeta) {
        const resolveRes = await fetch(
          `/api/resolve-channel?input=${encodeURIComponent(values.channelInput)}`
        );
        const resolveData = await resolveRes.json();
        if (!resolveRes.ok) {
          setState((prev) => ({
            ...prev,
            loading: false,
            loadingMore: false,
            error: resolveData.error ?? 'Could not find that channel.',
            hasSearched: true,
          }));
          return;
        }
        channelMeta = resolveData as ChannelMeta;
      }

      // Step 2: search videos
      const params = new URLSearchParams({
        channelId:   channelMeta.channelId,
        channelName: channelMeta.name,
        channelLogo: channelMeta.logo ?? '',
        query:       values.query,
        matchMode:   values.matchMode,
        timeframe:   values.timeframe,
        ...(pageToken ? { pageToken } : {}),
      });

      const searchRes = await fetch(`/api/search?${params}`);
      const data = await searchRes.json();

      if (searchRes.status === 429 || data.quotaExceeded) {
        setState((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
          quotaExceeded: true,
          hasSearched: true,
          channelMeta,
          quotaUsed: data.quotaUsed ?? prev.quotaUsed,
        }));
        return;
      }

      if (!searchRes.ok) {
        setState((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
          error: data.error ?? 'Search failed. Please try again.',
          hasSearched: true,
          channelMeta,
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        channelMeta,
        videos: isLoadMore ? [...prev.videos, ...data.videos] : data.videos,
        nextPageToken: data.nextPageToken ?? null,
        quotaUsed: data.quotaUsed ?? prev.quotaUsed,
        quotaNearLimit: data.quotaNearLimit ?? false,
        quotaExceeded: false,
        error: null,
        loading: false,
        loadingMore: false,
        hasSearched: true,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        loadingMore: false,
        error: 'Network error. Please check your connection.',
        hasSearched: true,
      }));
    }
  }, [state.channelMeta]);

  const handleSearch = (values: SearchFormValues) => {
    // Reset between searches
    setState((prev) => ({ ...prev, channelMeta: null, videos: [], nextPageToken: null }));
    doSearch(values);
    router.push(`/?q=${encodeURIComponent(values.query)}`, { scroll: false });
  };

  const handleLoadMore = () => {
    if (!state.currentFormValues || !state.nextPageToken) return;
    doSearch(state.currentFormValues, state.nextPageToken);
  };

  // ── Save/unsave ───────────────────────────────────────────────────────────

  const handleSave = async (video: VideoResult) => {
    await fetch('/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(video),
    });
    setSavedVideoIds((prev) => new Set([...prev, video.videoId]));
  };

  const handleUnsave = async (videoId: string) => {
    await fetch(`/api/videos?videoId=${videoId}`, { method: 'DELETE' });
    setSavedVideoIds((prev) => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--space-5)', paddingBottom: 'var(--space-12)' }} suppressHydrationWarning>
      {/* SEO heading */}
      <h1 className="sr-only">Rewind — YouTube Channel Search Tool</h1>

      {/* Quota banner */}
      {(state.quotaUsed > 0 || state.quotaExceeded) && (
        <QuotaBanner
          quotaUsed={state.quotaUsed}
          exceeded={state.quotaExceeded}
        />
      )}

      {/* Search form */}
      <SearchForm
        onSearch={handleSearch}
        loading={state.loading}
        initialQuery={initialQuery}
      />

      {/* Channel header */}
      {state.channelMeta && !state.loading && (
        <div id="channel-header" className="channel-header" aria-label={`Results from ${state.channelMeta.name}`}>
          {state.channelMeta.logo && (
            <img
              src={state.channelMeta.logo}
              alt={state.channelMeta.name}
              className="channel-header-logo"
              width={48}
              height={48}
            />
          )}
          <div>
            <h2 className="channel-header-name">{state.channelMeta.name}</h2>
            {state.channelMeta.subscriberCount != null && (
              <p className="channel-header-subs text-secondary text-sm">
                {formatSubs(state.channelMeta.subscriberCount)}
              </p>
            )}
          </div>
          <span className="channel-header-count text-muted text-sm">
            {state.videos.length} result{state.videos.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Loading skeleton */}
      {state.loading && (
        <div className="video-grid" aria-busy="true" aria-label="Loading results">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card" aria-hidden="true">
              <div className="skeleton skeleton-thumb" />
              <div className="skeleton-info">
                <div className="skeleton skeleton-avatar" />
                <div className="skeleton-lines">
                  <div className="skeleton skeleton-line" />
                  <div className="skeleton skeleton-line short" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {state.error && !state.loading && (
        <div id="search-error" className="empty-state" role="alert" aria-live="assertive">
          <ErrorIcon />
          <h3>Something went wrong</h3>
          <p>{state.error}</p>
        </div>
      )}

      {/* Quota exceeded */}
      {state.quotaExceeded && !state.loading && (
        <div id="quota-exceeded-msg" className="empty-state" role="alert">
          <QuotaIcon />
          <h3>API Quota Exceeded</h3>
          <p>YouTube search quota is exhausted for today. It resets at midnight PST. Your saved library is still available.</p>
        </div>
      )}

      {/* Results grid */}
      {!state.loading && !state.error && !state.quotaExceeded && state.videos.length > 0 && (
        <>
          <div
            id="results-grid"
            className="video-grid"
            role="list"
            aria-label={`Search results — ${state.videos.length} videos`}
          >
            {state.videos.map((video) => (
              <div key={video.videoId} role="listitem">
                <VideoCard
                  video={video}
                  isSaved={savedVideoIds.has(video.videoId)}
                  onSave={handleSave}
                  onUnsave={handleUnsave}
                  onPlay={setActiveVideo}
                />
              </div>
            ))}
          </div>
          <LoadMoreButton
            nextPageToken={state.nextPageToken}
            quotaNearLimit={state.quotaNearLimit}
            loading={state.loadingMore}
            onLoadMore={handleLoadMore}
          />
        </>
      )}

      {/* Empty results */}
      {!state.loading && !state.error && !state.quotaExceeded && state.hasSearched && state.videos.length === 0 && (
        <div id="no-results" className="empty-state" role="status">
          <SearchIcon />
          <h3>No videos found</h3>
          <p>Try a different keyword, timeframe, or match mode.</p>
        </div>
      )}

      {/* Hero / pre-search state */}
      {!state.hasSearched && !state.loading && (
        <div id="hero-prompt" className="hero-prompt" aria-hidden="true" suppressHydrationWarning>
          <HeroIcon />
          <p>Enter a channel and a keyword above to search their video history</p>
        </div>
      )}

      {/* In-app video player overlay */}
      {activeVideo && (
        <VideoPlayer
          videoId={activeVideo.videoId}
          savedVideos={savedVideos}
          onClose={() => setActiveVideo(null)}
        />
      )}

      <style jsx>{`
        .channel-header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4) 0;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: var(--space-2);
        }
        .channel-header-logo {
          border-radius: 50%;
          object-fit: cover;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
        }
        .channel-header-name {
          font-size: var(--text-lg);
          font-weight: 700;
        }
        .channel-header-count {
          margin-left: auto;
          flex-shrink: 0;
        }

        /* Skeleton loader */
        .skeleton-card { display: flex; flex-direction: column; gap: var(--space-2); }
        .skeleton-info { display: flex; gap: var(--space-2); padding: 0 var(--space-1); }
        .skeleton-lines { flex: 1; display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-1); }
        .skeleton {
          background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: var(--radius-sm);
        }
        .skeleton-thumb { aspect-ratio: 16/9; width: 100%; border-radius: var(--radius-md); }
        .skeleton-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; }
        .skeleton-line { height: 14px; width: 100%; }
        .skeleton-line.short { width: 60%; }
        @keyframes shimmer { to { background-position: -200% 0; } }

        /* Hero prompt */
        .hero-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-12) var(--space-4);
          color: var(--text-muted);
          text-align: center;
        }
        .hero-prompt p { font-size: var(--text-md); max-width: 400px; }
      `}</style>
    </div>
  );
}

// Wrapped in Suspense because useSearchParams requires it in Next.js App Router
export default function Page() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}

function formatSubs(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M subscribers`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K subscribers`;
  return `${n} subscribers`;
}

function ErrorIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--error)' }} aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--text-muted)' }} aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function QuotaIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--warning)' }} aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function HeroIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
