'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Bookmark, MonitorPlay, SearchX, CircleAlert } from 'lucide-react';
import SearchForm, { type SearchFormValues, type SearchFormPrefill } from '@/components/SearchForm';
import VideoCard from '@/components/VideoCard';
import VideoPlayer from '@/components/VideoPlayer';
import QuotaBanner from '@/components/QuotaBanner';
import LoadMoreButton from '@/components/LoadMoreButton';
import SignInPromptModal from '@/components/SignInPromptModal';
import PlaylistPicker from '@/components/PlaylistPicker';
import type { VideoResult } from '@/lib/youtube';
import type { Timeline } from '@/lib/timeline';
import { formatTimeline } from '@/lib/timeline';
import { authClient } from '@/lib/auth/client';
import { useToast } from '@/components/ui/ToastProvider';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import EmptyState from '@/components/ui/EmptyState';
import Chip from '@/components/ui/Chip';

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

interface RecentSearchItem {
  channelInput: string;
  query: string;
  matchMode: 'exact' | 'contains';
  timeline: Timeline;
  timestamp: number;
}

const RECENT_SEARCHES_KEY = 'rewind.recentSearches.v1';

function HomePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') ?? '';
  const { showToast } = useToast();

  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const [playlistPickerVideo, setPlaylistPickerVideo] = useState<VideoResult | null>(null);

  // Saved states
  const [savedVideoIds, setSavedVideoIds] = useState<Set<string>>(new Set());
  const [savedChannelIds, setSavedChannelIds] = useState<Set<string>>(new Set());
  const [savedVideos, setSavedVideos] = useState<VideoResult[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoResult | null>(null);

  // Form prefill state (for Example chips or Recent searches)
  const [formPrefill, setFormPrefill] = useState<SearchFormPrefill | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);

  // Search state
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

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const timer = setTimeout(() => setRecentSearches(parsed.slice(0, 5)), 0);
          return () => clearTimeout(timer);
        }
      }
    } catch {}
  }, []);

  // Save to recent searches
  const addRecentSearch = (values: SearchFormValues) => {
    try {
      setRecentSearches((prev) => {
        const filtered = prev.filter(
          (s) =>
            !(
              s.channelInput.toLowerCase() === values.channelInput.toLowerCase() &&
              s.query.toLowerCase() === values.query.toLowerCase()
            )
        );
        const next: RecentSearchItem[] = [
          {
            channelInput: values.channelInput,
            query: values.query,
            matchMode: values.matchMode,
            timeline: values.timeline,
            timestamp: Date.now(),
          },
          ...filtered,
        ].slice(0, 5);
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
        return next;
      });
    } catch {}
  };

  const clearRecentSearches = () => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
      showToast('Recent searches cleared', 'info');
    } catch {}
  };

  // Load saved videos and channels for authenticated user
  useEffect(() => {
    if (!isAuthenticated) {
      const timer = setTimeout(() => {
        setSavedVideoIds(new Set());
        setSavedChannelIds(new Set());
        setSavedVideos([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    // Fetch saved videos
    type DbRow = {
      video_id: string; title: string; channel_id: string; channel_name: string;
      channel_logo: string; thumbnail: string; published_at: string;
      views: number | null; likes: number | null;
    };
    fetch('/api/videos')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: DbRow[]) => {
        if (!Array.isArray(rows)) return;
        setSavedVideoIds(new Set(rows.map((r) => r.video_id)));
        setSavedVideos(
          rows.map((r) => ({
            videoId: r.video_id,
            title: r.title ?? 'Untitled Video',
            channelId: r.channel_id ?? '',
            channelName: r.channel_name ?? '',
            channelLogo: r.channel_logo ?? '',
            thumbnail: r.thumbnail ?? '',
            publishedAt: r.published_at ?? '',
            views: r.views != null ? Number(r.views) : null,
            likes: r.likes != null ? Number(r.likes) : null,
            duration: null,
          }))
        );
      })
      .catch(() => {});

    // Fetch saved channels
    fetch('/api/channels')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { channel_id: string }[]) => {
        if (Array.isArray(rows)) {
          setSavedChannelIds(new Set(rows.map((r) => r.channel_id)));
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // ── Core search execution ──────────────────────────────────────────────────

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
      // Step 1: Resolve channel
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

      // Step 2: Build search params (Range vs Date mode)
      const params = new URLSearchParams({
        channelId: channelMeta.channelId,
        channelName: channelMeta.name,
        channelLogo: channelMeta.logo ?? '',
        query: values.query,
        matchMode: values.matchMode,
        ...(pageToken ? { pageToken } : {}),
      });

      if (values.timeline.kind === 'range') {
        params.set('timeframe', values.timeline.preset);
      } else {
        params.set('date', values.timeline.date);
        // Pass local timezone offset in minutes (per PRD §7.6)
        const [y, m, d] = values.timeline.date.split('-').map(Number);
        const tzOffset = new Date(y, m - 1, d).getTimezoneOffset();
        params.set('tzOffset', tzOffset.toString());
      }

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

      // Save to recent searches on success
      if (!isLoadMore) {
        addRecentSearch(values);
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
    setState((prev) => ({ ...prev, channelMeta: null, videos: [], nextPageToken: null }));
    doSearch(values);
    if (values.query) {
      router.push(`/?q=${encodeURIComponent(values.query)}`, { scroll: false });
    }
  };

  const handleLoadMore = () => {
    if (!state.currentFormValues || !state.nextPageToken) return;
    doSearch(state.currentFormValues, state.nextPageToken);
  };

  // ── Save & Unsave Videos ───────────────────────────────────────────────────

  const handleSaveVideo = async (video: VideoResult) => {
    if (!isAuthenticated) {
      setSignInPromptOpen(true);
      return;
    }
    await fetch('/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(video),
    });
    setSavedVideoIds((prev) => new Set([...prev, video.videoId]));
    showToast(`Saved "${video.title}" to library`, 'success');
  };

  const handleUnsaveVideo = async (videoId: string) => {
    if (!isAuthenticated) {
      setSignInPromptOpen(true);
      return;
    }
    await fetch(`/api/videos?videoId=${videoId}`, { method: 'DELETE' });
    setSavedVideoIds((prev) => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
    showToast('Video removed from saved library', 'info');
  };

  // ── Save & Unsave Channels (PRD §9.3 & User Q1) ───────────────────────────

  const isChannelSaved = state.channelMeta ? savedChannelIds.has(state.channelMeta.channelId) : false;

  const handleChannelSaveToggle = async () => {
    if (!state.channelMeta) return;
    if (!isAuthenticated) {
      setSignInPromptOpen(true);
      return;
    }

    const { channelId, name, logo, subscriberCount } = state.channelMeta;

    if (isChannelSaved) {
      await fetch(`/api/channels?channelId=${channelId}`, { method: 'DELETE' });
      setSavedChannelIds((prev) => {
        const next = new Set(prev);
        next.delete(channelId);
        return next;
      });
      showToast(`Removed "${name}" from saved channels`, 'info');
    } else {
      await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, name, logo, subscriberCount }),
      });
      setSavedChannelIds((prev) => new Set([...prev, channelId]));
      showToast(`Saved "${name}" to your channels`, 'success');
    }
  };

  return (
    <div className="container home-container" suppressHydrationWarning>
      <h1 className="sr-only">Rewind — YouTube Channel Search Tool</h1>

      {/* Quota Banner */}
      {(state.quotaUsed > 0 || state.quotaExceeded) && (
        <QuotaBanner quotaUsed={state.quotaUsed} exceeded={state.quotaExceeded} />
      )}

      {/* Main Search Form */}
      <SearchForm
        onSearch={handleSearch}
        loading={state.loading}
        initialQuery={initialQuery}
        hasSearched={state.hasSearched}
        prefill={formPrefill}
      />

      {/* Resolved Channel Header with Save Channel button (§9.3) */}
      {state.channelMeta && !state.loading && (
        <div id="channel-header" className="channel-header" aria-label={`Results from ${state.channelMeta.name}`}>
          {state.channelMeta.logo ? (
            <img
              src={state.channelMeta.logo}
              alt={state.channelMeta.name}
              className="channel-logo-img"
              width={48}
              height={48}
            />
          ) : (
            <div className="channel-logo-placeholder">
              {state.channelMeta.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="channel-header-info">
            <h2 className="channel-header-title">{state.channelMeta.name}</h2>
            {state.channelMeta.subscriberCount != null && (
              <p className="channel-header-subs">
                {formatSubs(state.channelMeta.subscriberCount)}
              </p>
            )}
          </div>

          <div className="channel-header-actions">
            <Button
              tier={isChannelSaved ? 'secondary' : 'accent'}
              size="sm"
              onClick={handleChannelSaveToggle}
              icon={<Icon as={Bookmark} size={14} anim="pop" style={{ fill: isChannelSaved ? 'currentColor' : 'none' }} />}
            >
              {isChannelSaved ? 'Saved' : 'Save Channel'}
            </Button>

            <span className="channel-result-count tabular-nums">
              {state.videos.length} video{state.videos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Loading Skeletons */}
      {state.loading && (
        <div className="video-grid" aria-busy="true" aria-label="Loading search results">
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

      {/* Error state with Retry */}
      {state.error && !state.loading && (
        <EmptyState
          icon={CircleAlert}
          title="Search Failed"
          description={state.error}
          role="alert"
          aria-live="assertive"
          actions={
            state.currentFormValues && (
              <Button
                tier="accent"
                onClick={() => state.currentFormValues && doSearch(state.currentFormValues)}
              >
                Retry Search
              </Button>
            )
          }
        />
      )}

      {/* Quota Exceeded */}
      {state.quotaExceeded && !state.loading && (
        <EmptyState
          icon={CircleAlert}
          title="API Quota Exceeded"
          description="YouTube search quota is exhausted for today. It resets at midnight PST. Your saved library and playlists remain fully available."
          role="alert"
        />
      )}

      {/* Results Grid */}
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
                  isAuthenticated={isAuthenticated}
                  onPromptSignIn={() => setSignInPromptOpen(true)}
                  onSave={handleSaveVideo}
                  onUnsave={handleUnsaveVideo}
                  onAddToPlaylist={(vid) => setPlaylistPickerVideo(vid)}
                  showAddToPlaylist={true}
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

      {/* No Results Found State (§9.6) */}
      {!state.loading && !state.error && !state.quotaExceeded && state.hasSearched && state.videos.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="No videos found"
          description={
            state.currentFormValues?.timeline.kind === 'date'
              ? `No videos published on ${formatTimeline(state.currentFormValues.timeline)}.`
              : `No matching videos published in ${formatTimeline(state.currentFormValues?.timeline ?? null)}.`
          }
          actions={
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {state.currentFormValues?.query && (
                <Button
                  tier="secondary"
                  size="sm"
                  onClick={() => {
                    if (state.currentFormValues) {
                      const updated = { ...state.currentFormValues, query: '' };
                      setFormPrefill(updated);
                      doSearch(updated);
                    }
                  }}
                >
                  Clear keyword
                </Button>
              )}
            </div>
          }
        />
      )}

      {/* Pre-search Hero Prompt with Examples and Recent Searches (§9.6) */}
      {!state.hasSearched && !state.loading && (
        <div className="hero-section">
          <EmptyState
            icon={MonitorPlay}
            rewindBadge
            compact
            title="Search a channel's video history"
            description="Enter any YouTube channel handle or URL, pick a range or exact calendar day, and find videos instantly."
          />

          {/* Try an Example Chips */}
          <div className="hero-suggestions">
            <span className="suggestions-label">Try an example:</span>
            <div className="chips-row">
              {[
                { channel: '@mkbhd', label: 'MKBHD' },
                { channel: '@veritasium', label: 'Veritasium' },
                { channel: '@TED', label: 'TED Talks' },
              ].map((ex) => (
                <Chip
                  key={ex.channel}
                  label={ex.label}
                  onClick={() => {
                    // Prefill channel and timeline preset (User Q2)
                    setFormPrefill({
                      channelInput: ex.channel,
                      timeline: { kind: 'range', preset: '1year' },
                    });
                  }}
                />
              ))}
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="recent-searches-box">
              <div className="recent-searches-header">
                <span className="recent-title">Recent searches</span>
                <button
                  type="button"
                  className="recent-clear-btn"
                  onClick={clearRecentSearches}
                >
                  Clear
                </button>
              </div>
              <div className="chips-row">
                {recentSearches.map((item, idx) => (
                  <Chip
                    key={`${item.channelInput}-${item.query}-${idx}`}
                    label={`${item.channelInput}${item.query ? ` · "${item.query}"` : ''} · ${formatTimeline(item.timeline)}`}
                    onClick={() => {
                      setFormPrefill({
                        channelInput: item.channelInput,
                        query: item.query,
                        matchMode: item.matchMode,
                        timeline: item.timeline,
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Player In-App Overlay */}
      {activeVideo && (
        <VideoPlayer
          videoId={activeVideo.videoId}
          savedVideos={savedVideos}
          onClose={() => setActiveVideo(null)}
        />
      )}

      {/* Sign-in Prompt Modal */}
      <SignInPromptModal
        isOpen={signInPromptOpen}
        onClose={() => setSignInPromptOpen(false)}
      />

      {/* Playlist Picker Modal (Home Cards) */}
      {playlistPickerVideo && (
        <PlaylistPicker
          video={playlistPickerVideo}
          playlists={[]}
          onClose={() => setPlaylistPickerVideo(null)}
        />
      )}

      <style jsx>{`
        .home-container {
          padding-top: var(--space-4);
          padding-bottom: var(--space-12);
        }

        /* Channel Header */
        .channel-header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          background-color: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          box-shadow: var(--surface-highlight);
          margin-bottom: var(--space-4);
          flex-wrap: wrap;
        }

        .channel-logo-img {
          border-radius: 50%;
          object-fit: cover;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
        }

        .channel-logo-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: var(--accent);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: var(--text-lg);
          flex-shrink: 0;
        }

        .channel-header-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .channel-header-title {
          font-size: clamp(var(--text-base), 2.5vw, var(--text-lg));
          font-weight: 700;
          color: var(--text-primary);
          word-break: break-word;
        }

        .channel-header-subs {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }

        .channel-header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          flex-shrink: 0;
        }

        .channel-result-count {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }

        /* Hero Suggestions & Recent Searches */
        .hero-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);  /* tightened from space-5 to close the gap */
          width: 100%;
        }

        .hero-suggestions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          width: 100%;
        }

        .suggestions-label {
          font-size: var(--text-xs);
          color: var(--text-muted);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .chips-row {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
          justify-content: center;
          max-width: 680px;
        }

        .recent-searches-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          width: 100%;
          max-width: 680px;
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-subtle);
        }

        .recent-searches-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0 var(--space-2);
        }

        .recent-title {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .recent-clear-btn {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color var(--transition-fast);
        }
        .recent-clear-btn:hover {
          color: var(--accent);
        }

        @media (max-width: 540px) {
          .channel-header {
            gap: var(--space-2);
          }
          .channel-header-actions {
            width: 100%;
            justify-content: space-between;
            padding-top: var(--space-2);
            border-top: 1px solid var(--border-subtle);
          }
        }
      `}</style>
    </div>
  );
}

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
