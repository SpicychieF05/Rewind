'use client';

import { useState, useEffect, useCallback } from 'react';
import SavedTabs, { type SavedTab } from '@/components/SavedTabs';
import ChannelBadge from '@/components/ChannelBadge';
import VideoCard from '@/components/VideoCard';
import VideoPlayer from '@/components/VideoPlayer';
import PlaylistView from '@/components/PlaylistView';
import type { VideoResult } from '@/lib/youtube';

// Metadata can't be used with 'use client', it's handled in a server wrapper below
// See app/saved/page.tsx at the bottom.

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

interface PlaylistPickerProps {
  video: VideoResult;
  playlists: Playlist[];
  onAdd: (playlistId: string) => void;
  onClose: () => void;
}

function PlaylistPicker({ video, playlists, onAdd, onClose }: PlaylistPickerProps) {
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleAdd = async (playlistId: string) => {
    setLoading(playlistId);
    await fetch('/api/playlist-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId, videoId: video.videoId }),
    });
    setLoading(null);
    onAdd(playlistId);
    onClose();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading('create');
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const pl: Playlist = await res.json();
    await fetch('/api/playlist-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId: pl.playlist_id, videoId: video.videoId }),
    });
    setLoading(null);
    onAdd(pl.playlist_id);
    onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      id="playlist-picker-overlay"
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-title"
    >
      <div className="modal-box">
        <div className="modal-header">
          <h2 id="picker-title" style={{ fontSize: 'var(--text-md)', fontWeight: 700 }}>
            Add to playlist
          </h2>
          <button
            id="picker-close"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close playlist picker"
          >
            <XIcon />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
            Adding: <strong style={{ color: 'var(--text-primary)' }}>{video.title}</strong>
          </p>

          {playlists.length > 0 && (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', marginBottom: 'var(--space-4)' }}>
              {playlists.map((pl) => (
                <li key={pl.playlist_id}>
                  <button
                    id={`picker-playlist-${pl.playlist_id}`}
                    onClick={() => handleAdd(pl.playlist_id)}
                    disabled={loading === pl.playlist_id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                      background: 'transparent', color: 'var(--text-primary)',
                      transition: 'background-color 0.15s',
                      fontSize: 'var(--text-sm)',
                    }}
                    className="picker-row"
                    aria-label={`Add to ${pl.name}`}
                  >
                    <PlaylistIcon />
                    <span style={{ flex: 1, textAlign: 'left' }}>{pl.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                      {pl.video_count} video{pl.video_count !== 1 ? 's' : ''}
                    </span>
                    {loading === pl.playlist_id && <span className="spinner" aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!creating ? (
            <button
              id="picker-new-playlist"
              className="btn btn-ghost w-full"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => setCreating(true)}
            >
              <PlusIcon /> New playlist
            </button>
          ) : (
            <form onSubmit={handleCreate} style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <input
                id="picker-new-name"
                type="text"
                className="input"
                style={{ flex: 1, minWidth: 150 }}
                placeholder="Playlist name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                required
                aria-label="New playlist name"
              />
              <button
                type="submit"
                id="picker-create-submit"
                className="btn btn-primary"
                disabled={loading === 'create'}
              >
                {loading === 'create' ? <span className="spinner" aria-hidden="true" /> : 'Create & add'}
              </button>
            </form>
          )}
        </div>
      </div>
      <style jsx>{`
        .picker-row:hover { background-color: var(--bg-tertiary); }
      `}</style>
    </div>
  );
}

// ── Main Saved Page ───────────────────────────────────────────────────────────

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function SavedPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get('q') || '';

  const [activeTab, setActiveTab] = useState<SavedTab>(urlQuery ? 'videos' : 'channels');
  const [activeChannelFilter, setActiveChannelFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(urlQuery);

  const [channels, setChannels] = useState<SavedChannel[]>([]);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const [playlistPicker, setPlaylistPicker] = useState<VideoResult | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoResult | null>(null);

  useEffect(() => {
    setSearchQuery(urlQuery);
    if (urlQuery) {
      setActiveTab('videos');
    }
  }, [urlQuery]);

  const normalizeVideo = (v: Record<string, unknown>): VideoResult => ({
    videoId:     (v.videoId as string) || (v.video_id as string) || '',
    title:       (v.title as string) || 'Untitled Video',
    channelId:   (v.channelId as string) || (v.channel_id as string) || '',
    channelName: (v.channelName as string) || (v.channel_name as string) || 'YouTube Channel',
    channelLogo: (v.channelLogo as string) || (v.channel_logo as string) || '',
    thumbnail:   (v.thumbnail as string) || (v.thumbnail as string) || '',
    publishedAt: (v.publishedAt as string) || (v.published_at as string) || '',
    views:       v.views != null ? Number(v.views) : null,
    likes:       v.likes != null ? Number(v.likes) : null,
    duration:    null,
  });

  // Load all data
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
      // Handle error gracefully
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Filter videos by channel and title search query
  const filteredVideos = videos.filter((v) => {
    if (activeChannelFilter && v.channelId !== activeChannelFilter) return false;
    if (searchQuery.trim() && !v.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const filteredPlaylists = activeChannelFilter
    ? playlists // playlist filtering is done server-side on expand
    : playlists;

  // ── Channel actions ──────────────────────────────────────────────────────

  const handleChannelSelect = (channelId: string) => {
    setActiveChannelFilter((prev) => (prev === channelId ? null : channelId));
    setActiveTab('videos');
  };

  const handleUnsaveChannel = async (channelId: string) => {
    await fetch(`/api/channels?channelId=${channelId}`, { method: 'DELETE' });
    setChannels((prev) => prev.filter((c) => c.channel_id !== channelId));
  };

  // ── Video actions ──────────────────────────────────────────────────────

  const handleUnsaveVideo = async (videoId: string) => {
    await fetch(`/api/videos?videoId=${videoId}`, { method: 'DELETE' });
    setVideos((prev) => prev.filter((v) => v.videoId !== videoId));
  };

  const clearSearchFilter = () => {
    setSearchQuery('');
    router.push('/saved', { scroll: false });
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--space-5)', paddingBottom: 'var(--space-12)' }}>
      <h1 className="saved-heading">Saved Library</h1>

      {/* Filter chips (Channel & Search query) */}
      <div className="filter-chips-container" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        {activeChannelFilter && (
          <div id="channel-filter-chip" className="filter-chip" role="status" aria-live="polite">
            <span>Filtered by channel: <strong>{channels.find((c) => c.channel_id === activeChannelFilter)?.name}</strong></span>
            <button
              className="btn-icon filter-chip-close"
              onClick={() => setActiveChannelFilter(null)}
              aria-label="Clear channel filter"
            >
              <XIcon />
            </button>
          </div>
        )}

        {searchQuery.trim() && (
          <div id="search-filter-chip" className="filter-chip" role="status" aria-live="polite">
            <span>Title search: <strong>"{searchQuery.trim()}"</strong></span>
            <button
              className="btn-icon filter-chip-close"
              onClick={clearSearchFilter}
              aria-label="Clear search filter"
            >
              <XIcon />
            </button>
          </div>
        )}
      </div>

      <SavedTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-12)', gap: 'var(--space-3)', color: 'var(--text-muted)' }}>
          <span className="spinner" aria-label="Loading saved library" />
          <span>Loading…</span>
        </div>
      )}

      {!loading && (
        <>
          {/* ── Channels tab ───────────────────────────────────────── */}
          {activeTab === 'channels' && (
            <div
              id="tabpanel-channels"
              role="tabpanel"
              aria-labelledby="tab-channels"
            >
              {channels.length === 0 ? (
                <div className="empty-state">
                  <ChannelIcon />
                  <h3>No saved channels</h3>
                  <p>Search a channel and save it here for quick access.</p>
                </div>
              ) : (
                <div className="channel-grid" style={{ paddingTop: 'var(--space-4)' }}>
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

          {/* ── Videos tab ─────────────────────────────────────────── */}
          {activeTab === 'videos' && (
            <div
              id="tabpanel-videos"
              role="tabpanel"
              aria-labelledby="tab-videos"
            >
              {filteredVideos.length === 0 ? (
                <div className="empty-state" role="status">
                  <VideoIcon />
                  <h3>
                    {searchQuery.trim()
                      ? `No saved videos matching "${searchQuery.trim()}"`
                      : activeChannelFilter
                      ? 'No saved videos from this channel'
                      : 'No saved videos'}
                  </h3>
                  <p>
                    {searchQuery.trim()
                      ? "You haven't saved any videos matching this title yet. Search a channel's videos on the home page first to find and save them to your library!"
                      : activeChannelFilter
                      ? 'No saved videos found for this channel.'
                      : 'Save videos from search results to build your library.'}
                  </p>
                  {searchQuery.trim() ? (
                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <Link
                        href={`/?q=${encodeURIComponent(searchQuery.trim())}`}
                        className="btn btn-primary"
                      >
                        Search Channel Videos on Home
                      </Link>
                      <button
                        type="button"
                        onClick={clearSearchFilter}
                        className="btn btn-ghost"
                      >
                        Clear search
                      </button>
                    </div>
                  ) : (
                    <Link href="/" className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }}>
                      Search Channel Videos
                    </Link>
                  )}
                </div>
              ) : (
                <div
                  className="video-grid"
                  role="list"
                  aria-label="Saved videos"
                >
                  {filteredVideos.map((v) => (
                    <div key={v.videoId} role="listitem">
                      <VideoCard
                        video={v}
                        isSaved={true}
                        onUnsave={handleUnsaveVideo}
                        onAddToPlaylist={(video) => setPlaylistPicker(video)}
                        showAddToPlaylist={true}
                        onPlay={setActiveVideo}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Playlists tab ──────────────────────────────────────── */}
          {activeTab === 'playlists' && (
            <div
              id="tabpanel-playlists"
              role="tabpanel"
              aria-labelledby="tab-playlists"
              style={{ paddingTop: 'var(--space-5)' }}
            >
              <PlaylistView playlists={filteredPlaylists} onRefresh={loadAll} onPlay={setActiveVideo} />
            </div>
          )}
        </>
      )}

      {/* Playlist picker modal */}
      {playlistPicker && (
        <PlaylistPicker
          video={playlistPicker}
          playlists={playlists}
          onAdd={() => loadAll()}
          onClose={() => setPlaylistPicker(null)}
        />
      )}

      {/* In-app video player overlay */}
      {activeVideo && (
        <VideoPlayer
          videoId={activeVideo.videoId}
          savedVideos={videos}
          onClose={() => setActiveVideo(null)}
        />
      )}

      <style jsx>{`
        .saved-heading {
          font-size: var(--text-2xl);
          font-weight: 700;
          margin-bottom: var(--space-4);
        }
        .filter-chip {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background-color: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          padding: var(--space-1) var(--space-2) var(--space-1) var(--space-3);
          font-size: var(--text-sm);
          color: var(--text-secondary);
        }
        .filter-chip-close {
          width: 20px;
          height: 20px;
          color: var(--text-muted);
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

// ── Icon helpers ──────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
function PlaylistIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="11" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
function ChannelIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--text-muted)' }} aria-hidden="true">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}
function VideoIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--text-muted)' }} aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}
