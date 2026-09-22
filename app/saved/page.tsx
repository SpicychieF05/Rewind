'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Users, Film, X, Search } from 'lucide-react';
import SavedTabs, { type SavedTab } from '@/components/SavedTabs';
import ChannelBadge from '@/components/ChannelBadge';
import VideoCard from '@/components/VideoCard';
import VideoPlayer from '@/components/VideoPlayer';
import PlaylistView from '@/components/PlaylistView';
import PlaylistPicker from '@/components/PlaylistPicker';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { useToast } from '@/components/ui/ToastProvider';
import type { VideoResult } from '@/lib/youtube';

interface SavedChannel {
  channel_id: string;
  name: string;
  logo: string | null;
  subscriber_count: number | null;
}

interface Playlist {
  playlist_id: string;
  name: string;
  created_at: string;
  video_count: number;
}

function SavedPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const urlQuery = searchParams.get('q') || '';

  const [activeTab, setActiveTab] = useState<SavedTab>(urlQuery ? 'videos' : 'channels');
  const [activeChannelFilter, setActiveChannelFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(urlQuery);

  const [channels, setChannels] = useState<SavedChannel[]>([]);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const [playlistPickerVideo, setPlaylistPickerVideo] = useState<VideoResult | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoResult | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(urlQuery);
      if (urlQuery) {
        setActiveTab('videos');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [urlQuery]);

  const normalizeVideo = (v: Record<string, unknown>): VideoResult => ({
    videoId:     (v.videoId as string) || (v.video_id as string) || '',
    title:       (v.title as string) || 'Untitled Video',
    channelId:   (v.channelId as string) || (v.channel_id as string) || '',
    channelName: (v.channelName as string) || (v.channel_name as string) || 'YouTube Channel',
    channelLogo: (v.channelLogo as string) || (v.channel_logo as string) || '',
    thumbnail:   (v.thumbnail as string) || '',
    publishedAt: (v.publishedAt as string) || (v.published_at as string) || '',
    views:       v.views != null ? Number(v.views) : null,
    likes:       v.likes != null ? Number(v.likes) : null,
    duration:    null,
  });

  // Load all saved data
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [chRes, vidRes, plRes] = await Promise.all([
        fetch('/api/channels'),
        fetch('/api/videos'),
        fetch('/api/playlists'),
      ]);

      if (chRes.status === 401 || vidRes.status === 401 || plRes.status === 401) {
        router.push('/auth/sign-in');
        return;
      }

      const [ch, vids, pls] = await Promise.all([chRes.json(), vidRes.json(), plRes.json()]);
      setChannels(Array.isArray(ch) ? ch : []);
      setVideos(Array.isArray(vids) ? vids.map(normalizeVideo) : []);
      setPlaylists(Array.isArray(pls) ? pls : []);
    } catch {
      showToast('Failed to load saved library', 'error');
    } finally {
      setLoading(false);
    }
  }, [router, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAll();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadAll]);

  // Filter videos by channel and title search query
  const filteredVideos = videos.filter((v) => {
    if (activeChannelFilter && v.channelId !== activeChannelFilter) return false;
    if (searchQuery.trim() && !v.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  // ── Channel actions ──────────────────────────────────────────────────────
  const handleChannelSelect = (channelId: string) => {
    setActiveChannelFilter((prev) => (prev === channelId ? null : channelId));
    setActiveTab('videos');
  };

  const handleUnsaveChannel = async (channelId: string) => {
    const channelToRemove = channels.find((c) => c.channel_id === channelId);
    try {
      const res = await fetch(`/api/channels?channelId=${channelId}`, { method: 'DELETE' });
      if (res.ok) {
        setChannels((prev) => prev.filter((c) => c.channel_id !== channelId));
        if (activeChannelFilter === channelId) {
          setActiveChannelFilter(null);
        }
        showToast(
          channelToRemove ? `Removed "${channelToRemove.name}" from saved channels` : 'Channel removed',
          'info'
        );
      } else {
        showToast('Failed to remove channel', 'error');
      }
    } catch {
      showToast('Network error removing channel', 'error');
    }
  };

  // ── Video actions ────────────────────────────────────────────────────────
  const handleUnsaveVideo = async (videoId: string) => {
    try {
      const res = await fetch(`/api/videos?videoId=${videoId}`, { method: 'DELETE' });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.videoId !== videoId));
        showToast('Video removed from saved library', 'info');
      } else {
        showToast('Failed to remove video', 'error');
      }
    } catch {
      showToast('Network error removing video', 'error');
    }
  };

  const clearSearchFilter = () => {
    setSearchQuery('');
    router.push('/saved', { scroll: false });
  };

  const activeChannelObj = channels.find((c) => c.channel_id === activeChannelFilter);

  return (
    <div className="saved-page-container">
      {/* Header */}
      <div className="saved-header">
        <h1 className="saved-title">Saved Library</h1>
        <p className="saved-subtitle">
          Your bookmarked channels, saved videos, and custom playlists.
        </p>
      </div>

      {/* Filter chips (Channel & Search query) */}
      {(activeChannelFilter || searchQuery.trim()) && (
        <div className="filter-chips-bar" role="status" aria-live="polite">
          {activeChannelFilter && (
            <div id="channel-filter-chip" className="filter-pill">
              <Icon as={Users} size={14} className="filter-pill-icon" />
              <span>
                Channel: <strong>{activeChannelObj?.name || 'Selected'}</strong>
              </span>
              <button
                type="button"
                className="filter-pill-clear"
                onClick={() => setActiveChannelFilter(null)}
                aria-label="Clear channel filter"
                title="Clear channel filter"
              >
                <Icon as={X} size={14} />
              </button>
            </div>
          )}

          {searchQuery.trim() && (
            <div id="search-filter-chip" className="filter-pill">
              <Icon as={Search} size={14} className="filter-pill-icon" />
              <span>
                Search: <strong>&quot;{searchQuery.trim()}&quot;</strong>
              </span>
              <button
                type="button"
                className="filter-pill-clear"
                onClick={clearSearchFilter}
                aria-label="Clear search filter"
                title="Clear search filter"
              >
                <Icon as={X} size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tabs navigation */}
      <SavedTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          channels: channels.length,
          videos: videos.length,
          playlists: playlists.length,
        }}
      />

      {/* Loading state */}
      {loading && (
        <div className="saved-loading-state">
          <span className="spinner" aria-hidden="true" />
          <span>Loading your library…</span>
        </div>
      )}

      {/* Tab Panels */}
      {!loading && (
        <>
          {/* ── Channels Tab ────────────────────────────────────── */}
          {activeTab === 'channels' && (
            <div
              id="tabpanel-channels"
              role="tabpanel"
              aria-labelledby="tab-channels"
              className="tabpanel-content"
            >
              {channels.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No saved channels"
                  description="Search for a YouTube creator on the Home page and save their channel to keep tabs on their archive."
                  actions={
                    <Link href="/">
                      <Button tier="accent" icon={<Icon as={Search} size={16} />}>
                        Explore Channels
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <div className="saved-channel-grid">
                  {channels.map((ch) => (
                    <ChannelBadge
                      key={ch.channel_id}
                      channel={ch}
                      isActive={activeChannelFilter === ch.channel_id}
                      onSelect={handleChannelSelect}
                      onUnsave={handleUnsaveChannel}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Videos Tab ──────────────────────────────────────── */}
          {activeTab === 'videos' && (
            <div
              id="tabpanel-videos"
              role="tabpanel"
              aria-labelledby="tab-videos"
              className="tabpanel-content"
            >
              {filteredVideos.length === 0 ? (
                <EmptyState
                  icon={Film}
                  title={
                    searchQuery.trim()
                      ? `No saved videos matching "${searchQuery.trim()}"`
                      : activeChannelFilter
                      ? `No saved videos from ${activeChannelObj?.name || 'this channel'}`
                      : 'No saved videos yet'
                  }
                  description={
                    searchQuery.trim()
                      ? 'Try searching with different keywords, or search channel archives on the Home page to discover and bookmark videos.'
                      : activeChannelFilter
                      ? 'You have not saved any individual videos from this channel yet.'
                      : 'Bookmark videos from timeline search results to build your personalized archive.'
                  }
                  actions={
                    searchQuery.trim() ? (
                      <div className="empty-actions-row">
                        <Link href={`/?q=${encodeURIComponent(searchQuery.trim())}`}>
                          <Button tier="accent" icon={<Icon as={Search} size={16} />}>
                            Search Home Archive
                          </Button>
                        </Link>
                        <Button tier="ghost" onClick={clearSearchFilter}>
                          Clear Filter
                        </Button>
                      </div>
                    ) : (
                      <Link href="/">
                        <Button tier="accent" icon={<Icon as={Search} size={16} />}>
                          Discover Videos
                        </Button>
                      </Link>
                    )
                  }
                />
              ) : (
                <div
                  className="saved-video-grid"
                  role="list"
                  aria-label="Saved videos"
                >
                  {filteredVideos.map((v) => (
                    <div key={v.videoId} role="listitem">
                      <VideoCard
                        video={v}
                        isSaved={true}
                        onUnsave={handleUnsaveVideo}
                        onAddToPlaylist={(vid) => setPlaylistPickerVideo(vid)}
                        showAddToPlaylist={true}
                        onPlay={setActiveVideo}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Playlists Tab ───────────────────────────────────── */}
          {activeTab === 'playlists' && (
            <div
              id="tabpanel-playlists"
              role="tabpanel"
              aria-labelledby="tab-playlists"
              className="tabpanel-content"
            >
              <PlaylistView
                playlists={playlists}
                onRefresh={loadAll}
                onPlay={setActiveVideo}
              />
            </div>
          )}
        </>
      )}

      {/* Playlist Picker Modal */}
      {playlistPickerVideo && (
        <PlaylistPicker
          video={playlistPickerVideo}
          playlists={playlists}
          onRefreshPlaylists={loadAll}
          onClose={() => setPlaylistPickerVideo(null)}
        />
      )}

      {/* In-app Video Player Overlay */}
      {activeVideo && (
        <VideoPlayer
          videoId={activeVideo.videoId}
          savedVideos={videos}
          onClose={() => setActiveVideo(null)}
        />
      )}

      <style jsx>{`
        .saved-page-container {
          max-width: var(--content-max-width);
          margin: 0 auto;
          padding: var(--space-6) var(--space-4) var(--space-12);
          width: 100%;
        }
        .saved-header {
          margin-bottom: var(--space-4);
        }
        .saved-title {
          font-size: clamp(var(--text-xl), 3.5vw, var(--text-2xl));
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }
        .saved-subtitle {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .filter-chips-bar {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
        }
        .filter-pill {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background-color: var(--surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          padding: 4px var(--space-2) 4px var(--space-3);
          font-size: var(--text-xs);
          color: var(--text-secondary);
          transition: border-color var(--transition-fast);
        }
        .filter-pill:hover {
          border-color: var(--border);
        }
        :global(.filter-pill-icon) {
          color: var(--accent);
          flex-shrink: 0;
        }
        .filter-pill strong {
          color: var(--text-primary);
        }
        .filter-pill-clear {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .filter-pill-clear:hover {
          background-color: var(--surface-3);
          color: var(--text-primary);
        }
        .saved-loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-12) 0;
          gap: var(--space-3);
          color: var(--text-muted);
          font-size: var(--text-sm);
        }
        .tabpanel-content {
          padding-top: var(--space-3);
        }
        .saved-channel-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: var(--space-3);
        }
        .saved-video-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-4);
          container-type: inline-size;
        }
        .empty-actions-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-wrap: wrap;
          justify-content: center;
        }

        @media (max-width: 480px) {
          .saved-channel-grid {
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
            gap: var(--space-2);
          }
          .saved-video-grid {
            grid-template-columns: 1fr;
            gap: var(--space-3);
          }
        }
      `}</style>
    </div>
  );
}

export default function SavedPage() {
  return (
    <Suspense>
      <SavedPageContent />
    </Suspense>
  );
}
