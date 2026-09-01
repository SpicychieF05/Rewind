'use client';

import { useState } from 'react';
import PlaylistOrderModal from './PlaylistOrderModal';
import type { VideoResult } from '@/lib/youtube';

interface Playlist {
  playlist_id: string;
  name: string;
  created_at: string;
  video_count: number;
}

interface PlaylistVideo extends VideoResult {
  position: number;
}

interface Props {
  playlists: Playlist[];
  onRefresh: () => void;
  onPlay?: (video: VideoResult) => void;
}

export default function PlaylistView({ playlists, onRefresh, onPlay }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedVideos, setExpandedVideos] = useState<PlaylistVideo[]>([]);
  const [loadingExpand, setLoadingExpand] = useState(false);
  const [orderModal, setOrderModal] = useState<{ id: string; name: string; videos: PlaylistVideo[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // ── Create ────────────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy('create');
    await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName('');
    setCreating(false);
    setBusy(null);
    onRefresh();
  };

  // ── Rename ────────────────────────────────────────────────────────────────

  const startRename = (pl: Playlist) => {
    setRenaming(pl.playlist_id);
    setRenameValue(pl.name);
  };

  const handleRename = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!renameValue.trim()) return;
    setBusy(id);
    await fetch(`/api/playlists?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    setRenaming(null);
    setBusy(null);
    onRefresh();
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete playlist "${name}"? This cannot be undone.`)) return;
    setBusy(id);
    await fetch(`/api/playlists?id=${id}`, { method: 'DELETE' });
    if (expanded === id) setExpanded(null);
    setBusy(null);
    onRefresh();
  };

  // ── Expand ────────────────────────────────────────────────────────────────

  const toggleExpand = async (pl: Playlist) => {
    if (expanded === pl.playlist_id) {
      setExpanded(null);
      setExpandedVideos([]);
      return;
    }
    setExpanded(pl.playlist_id);
    setLoadingExpand(true);
    const res = await fetch(`/api/playlist-videos?playlistId=${pl.playlist_id}`);
    const data = await res.json();
    setExpandedVideos(data);
    setLoadingExpand(false);
  };

  // ── Reorder ────────────────────────────────────────────────────────────────

  const openOrderModal = async (pl: Playlist) => {
    setLoadingExpand(true);
    const res = await fetch(`/api/playlist-videos?playlistId=${pl.playlist_id}`);
    const data: PlaylistVideo[] = await res.json();
    setLoadingExpand(false);
    setOrderModal({ id: pl.playlist_id, name: pl.name, videos: data });
  };

  const handleSaveOrder = async (orderedVideoIds: string[]) => {
    if (!orderModal) return;
    await fetch('/api/playlist-videos/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId: orderModal.id, orderedVideoIds }),
    });
    setOrderModal(null);
    // Refresh expanded view if open
    if (expanded === orderModal.id) {
      const res = await fetch(`/api/playlist-videos?playlistId=${orderModal.id}`);
      setExpandedVideos(await res.json());
    }
    onRefresh();
  };

  return (
    <div className="playlist-view">
      {/* Toolbar */}
      <div className="playlist-toolbar">
        <h2 className="section-heading">Playlists</h2>
        {!creating && (
          <button
            id="create-playlist-btn"
            className="btn btn-secondary"
            onClick={() => setCreating(true)}
          >
            <PlusIcon /> New playlist
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <form
          id="create-playlist-form"
          onSubmit={handleCreate}
          className="playlist-create-form"
          aria-label="Create new playlist"
        >
          <input
            id="new-playlist-name"
            type="text"
            className="input"
            placeholder="Playlist name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            required
            aria-label="New playlist name"
          />
          <button
            type="submit"
            id="create-playlist-submit"
            className="btn btn-primary"
            disabled={busy === 'create'}
          >
            {busy === 'create' ? <span className="spinner" aria-hidden="true" /> : 'Create'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => { setCreating(false); setNewName(''); }}
          >
            Cancel
          </button>
        </form>
      )}

      {/* Empty state */}
      {playlists.length === 0 && !creating && (
        <div className="empty-state">
          <PlaylistIcon size={48} />
          <h3>No playlists yet</h3>
          <p>Create a playlist to group your saved videos.</p>
        </div>
      )}

      {/* Playlist list */}
      <ul className="playlist-list" role="list">
        {playlists.map((pl) => (
          <li key={pl.playlist_id} className="playlist-item">
            {/* Header row */}
            <div className="playlist-row">
              <button
                id={`playlist-expand-${pl.playlist_id}`}
                className="playlist-main-btn"
                onClick={() => toggleExpand(pl)}
                aria-expanded={expanded === pl.playlist_id}
                aria-controls={`playlist-panel-${pl.playlist_id}`}
              >
                <PlaylistIcon size={20} />
                {renaming === pl.playlist_id ? (
                  <form
                    onSubmit={(e) => handleRename(e, pl.playlist_id)}
                    onClick={(e) => e.stopPropagation()}
                    className="rename-form"
                    aria-label={`Rename playlist ${pl.name}`}
                  >
                    <input
                      id={`rename-input-${pl.playlist_id}`}
                      type="text"
                      className="input rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      autoFocus
                      aria-label="Playlist name"
                    />
                    <button
                      type="submit"
                      id={`rename-save-${pl.playlist_id}`}
                      className="btn btn-primary"
                      disabled={busy === pl.playlist_id}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setRenaming(null)}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="playlist-name">{pl.name}</span>
                    <span className="playlist-count">{pl.video_count} video{pl.video_count !== 1 ? 's' : ''}</span>
                  </>
                )}
                <ChevronIcon down={expanded === pl.playlist_id} />
              </button>

              {/* Actions */}
              {renaming !== pl.playlist_id && (
                <div className="playlist-actions">
                  <button
                    id={`order-btn-${pl.playlist_id}`}
                    className="btn btn-ghost playlist-action-btn"
                    onClick={() => openOrderModal(pl)}
                    disabled={pl.video_count === 0 || loadingExpand}
                    aria-label={`Reorder videos in ${pl.name}`}
                    title="Reorder"
                  >
                    <OrderIcon />
                    <span className="playlist-action-label">Order</span>
                  </button>
                  <button
                    id={`rename-btn-${pl.playlist_id}`}
                    className="btn btn-ghost playlist-action-btn"
                    onClick={() => startRename(pl)}
                    aria-label={`Rename ${pl.name}`}
                    title="Rename"
                  >
                    <EditIcon />
                    <span className="playlist-action-label">Rename</span>
                  </button>
                  <button
                    id={`delete-btn-${pl.playlist_id}`}
                    className="btn btn-ghost playlist-action-btn delete-btn"
                    onClick={() => handleDelete(pl.playlist_id, pl.name)}
                    disabled={busy === pl.playlist_id}
                    aria-label={`Delete ${pl.name}`}
                    title="Delete"
                  >
                    <TrashIcon />
                    <span className="playlist-action-label">Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Expanded video list */}
            {expanded === pl.playlist_id && (
              <div
                id={`playlist-panel-${pl.playlist_id}`}
                className="playlist-panel"
                role="region"
                aria-label={`Videos in ${pl.name}`}
              >
                {loadingExpand ? (
                  <div className="playlist-loading">
                    <span className="spinner" aria-hidden="true" />
                    <span>Loading…</span>
                  </div>
                ) : expandedVideos.length === 0 ? (
                  <p className="playlist-empty-msg">No videos in this playlist yet.</p>
                ) : (
                  <ul className="playlist-video-list" role="list">
                    {expandedVideos.map((v, i) => (
                      <li key={v.videoId} className="playlist-video-row">
                        <span className="pv-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                        <a
                          href={`https://www.youtube.com/watch?v=${v.videoId}`}
                          target={onPlay ? undefined : '_blank'}
                          rel={onPlay ? undefined : 'noopener noreferrer'}
                          aria-label={onPlay ? `Play ${v.title} in Rewind` : `Watch ${v.title} on YouTube`}
                          onClick={(e) => { if (onPlay) { e.preventDefault(); onPlay(v); } }}
                        >
                          {v.thumbnail && (
                            <img src={v.thumbnail} alt="" className="pv-thumb" width={60} height={34} loading="lazy" />
                          )}
                        </a>
                        <span className="pv-title truncate">{v.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Reorder modal */}
      {orderModal && (
        <PlaylistOrderModal
          playlistName={orderModal.name}
          videos={orderModal.videos}
          onSave={handleSaveOrder}
          onClose={() => setOrderModal(null)}
          onPlay={onPlay}
        />
      )}

      <style jsx>{`
        .playlist-view { width: 100%; }
        .playlist-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-4);
        }
        .section-heading { font-size: var(--text-xl); font-weight: 700; }
        .playlist-create-form {
          display: flex;
          gap: var(--space-2);
          margin-bottom: var(--space-4);
          flex-wrap: wrap;
        }
        .playlist-create-form .input { flex: 1; min-width: 200px; }
        .playlist-list { display: flex; flex-direction: column; gap: var(--space-2); }
        .playlist-item {
          background-color: var(--bg-secondary);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .playlist-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-1) var(--space-2) var(--space-1) 0;
        }
        .playlist-main-btn {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          flex: 1;
          padding: var(--space-3) var(--space-4);
          text-align: left;
          color: var(--text-primary);
          background: transparent;
          border-radius: var(--radius-md);
          transition: background-color var(--transition-fast);
          min-width: 0;
        }
        .playlist-main-btn:hover { background-color: var(--bg-tertiary); }
        .playlist-name { font-weight: 500; font-size: var(--text-base); }
        .playlist-count { font-size: var(--text-xs); color: var(--text-muted); white-space: nowrap; }
        .playlist-actions {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          flex-shrink: 0;
          padding-right: var(--space-2);
        }
        .playlist-action-btn {
          border-radius: var(--radius-sm);
          padding: var(--space-1) var(--space-2);
          font-size: var(--text-xs);
          height: 32px;
          gap: var(--space-1);
        }
        .playlist-action-label { display: none; }
        @media (min-width: 480px) { .playlist-action-label { display: inline; } }
        .delete-btn:hover { color: var(--error); border-color: var(--error); }
        .rename-form {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex: 1;
          flex-wrap: wrap;
        }
        .rename-input { min-width: 150px; height: 32px; padding: 0 var(--space-2); }
        .playlist-panel {
          border-top: 1px solid var(--border-subtle);
          padding: var(--space-3) var(--space-4);
        }
        .playlist-loading { display: flex; align-items: center; gap: var(--space-2); color: var(--text-muted); font-size: var(--text-sm); }
        .playlist-empty-msg { font-size: var(--text-sm); color: var(--text-muted); }
        .playlist-video-list { display: flex; flex-direction: column; gap: var(--space-1); }
        .playlist-video-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-1) 0;
        }
        .pv-num { font-size: var(--text-xs); color: var(--text-muted); font-weight: 700; min-width: 20px; }
        .pv-thumb { border-radius: var(--radius-sm); object-fit: cover; background-color: var(--bg-primary); }
        .pv-title { font-size: var(--text-sm); color: var(--text-primary); min-width: 0; }
      `}</style>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlaylistIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
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
function ChevronIcon({ down }: { down: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: down ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginLeft: 'auto', flexShrink: 0 }} aria-hidden="true">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}
function OrderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
      <polyline points="9 3 3 9 9 15"/><polyline points="15 9 21 15 15 21"/>
    </svg>
  );
}
