'use client';

import React, { useState } from 'react';
import { ListVideo, Plus, ChevronDown, ListOrdered, Pencil, Trash2 } from 'lucide-react';
import PlaylistOrderModal from './PlaylistOrderModal';
import ConfirmDialog from './ui/ConfirmDialog';
import Button from './ui/Button';
import Icon from './ui/Icon';
import EmptyState from './ui/EmptyState';
import { useToast } from './ui/ToastProvider';
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
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedVideos, setExpandedVideos] = useState<PlaylistVideo[]>([]);
  const [loadingExpand, setLoadingExpand] = useState(false);
  const [orderModal, setOrderModal] = useState<{ id: string; name: string; videos: PlaylistVideo[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Delete confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setBusy('create');
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        showToast(`Playlist "${trimmed}" created`, 'success');
        setNewName('');
        setCreating(false);
        onRefresh();
      } else {
        showToast('Failed to create playlist', 'error');
      }
    } catch {
      showToast('Network error creating playlist', 'error');
    } finally {
      setBusy(null);
    }
  };

  // ── Rename ────────────────────────────────────────────────────────────────
  const startRename = (pl: Playlist) => {
    setRenaming(pl.playlist_id);
    setRenameValue(pl.name);
  };

  const handleRename = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/playlists?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        showToast(`Renamed to "${trimmed}"`, 'success');
        setRenaming(null);
        onRefresh();
      } else {
        showToast('Failed to rename playlist', 'error');
      }
    } catch {
      showToast('Network error renaming playlist', 'error');
    } finally {
      setBusy(null);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/playlists?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Playlist "${deleteTarget.name}" deleted`, 'info');
        if (expanded === deleteTarget.id) {
          setExpanded(null);
          setExpandedVideos([]);
        }
        onRefresh();
      } else {
        showToast('Failed to delete playlist', 'error');
      }
    } catch {
      showToast('Network error deleting playlist', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
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
    try {
      const res = await fetch(`/api/playlist-videos?playlistId=${pl.playlist_id}`);
      const data = await res.json();
      setExpandedVideos(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load playlist videos', 'error');
    } finally {
      setLoadingExpand(false);
    }
  };

  // ── Reorder ────────────────────────────────────────────────────────────────
  const openOrderModal = async (pl: Playlist) => {
    setLoadingExpand(true);
    try {
      const res = await fetch(`/api/playlist-videos?playlistId=${pl.playlist_id}`);
      const data: PlaylistVideo[] = await res.json();
      setOrderModal({ id: pl.playlist_id, name: pl.name, videos: Array.isArray(data) ? data : [] });
    } catch {
      showToast('Failed to load videos for reordering', 'error');
    } finally {
      setLoadingExpand(false);
    }
  };

  const handleSaveOrder = async (orderedVideoIds: string[]) => {
    if (!orderModal) return;
    const res = await fetch('/api/playlist-videos/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId: orderModal.id, orderedVideoIds }),
    });
    if (res.ok) {
      setOrderModal(null);
      if (expanded === orderModal.id) {
        const fetchRes = await fetch(`/api/playlist-videos?playlistId=${orderModal.id}`);
        setExpandedVideos(await fetchRes.json());
      }
      onRefresh();
    } else {
      throw new Error('Failed to save order');
    }
  };

  return (
    <div className="playlist-view-root">
      {/* Toolbar */}
      <div className="playlist-toolbar">
        <div className="playlist-toolbar-left">
          <h2 className="section-heading">Playlists</h2>
          <span className="playlist-total-count tabular-nums">
            {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
          </span>
        </div>
        {!creating && (
          <Button
            id="create-playlist-btn"
            tier="accent"
            size="sm"
            onClick={() => setCreating(true)}
            icon={<Icon as={Plus} size={16} anim="spin-once" />}
          >
            New playlist
          </Button>
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
            className="input playlist-create-input"
            placeholder="Playlist name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            required
            aria-label="New playlist name"
          />
          <Button
            type="submit"
            tier="accent"
            size="sm"
            disabled={busy === 'create'}
            loading={busy === 'create'}
          >
            Create
          </Button>
          <Button
            type="button"
            tier="ghost"
            size="sm"
            onClick={() => { setCreating(false); setNewName(''); }}
          >
            Cancel
          </Button>
        </form>
      )}

      {/* Empty state */}
      {playlists.length === 0 && !creating && (
        <EmptyState
          icon={ListVideo}
          title="No playlists yet"
          description="Create a playlist to group your saved videos by topic, series, or project."
          actions={
            <Button
              tier="accent"
              onClick={() => setCreating(true)}
              icon={<Icon as={Plus} size={16} anim="spin-once" />}
            >
              Create playlist
            </Button>
          }
        />
      )}

      {/* Playlist list */}
      {playlists.length > 0 && (
        <ul className="playlist-list" role="list">
          {playlists.map((pl) => {
            const isExpanded = expanded === pl.playlist_id;
            const isRenamingThis = renaming === pl.playlist_id;

            return (
              <li key={pl.playlist_id} className={`playlist-card ${isExpanded ? 'is-expanded' : ''}`}>
                {/* Header row */}
                <div className="playlist-row">
                  <button
                    id={`playlist-expand-${pl.playlist_id}`}
                    type="button"
                    className="playlist-toggle-btn"
                    onClick={() => toggleExpand(pl)}
                    aria-expanded={isExpanded}
                    aria-controls={`playlist-panel-${pl.playlist_id}`}
                  >
                    <Icon as={ListVideo} size={20} className="playlist-icon" />

                    {isRenamingThis ? (
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
                        <Button
                          type="submit"
                          tier="accent"
                          size="xs"
                          loading={busy === pl.playlist_id}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          tier="ghost"
                          size="xs"
                          onClick={() => setRenaming(null)}
                        >
                          Cancel
                        </Button>
                      </form>
                    ) : (
                      <div className="playlist-titles">
                        <span className="playlist-name truncate">{pl.name}</span>
                        <span className="playlist-count tabular-nums">
                          {pl.video_count} {pl.video_count === 1 ? 'video' : 'videos'}
                        </span>
                      </div>
                    )}

                    <span className={`playlist-chevron ${isExpanded ? 'is-flipped' : ''}`} aria-hidden="true">
                      <Icon as={ChevronDown} size={18} />
                    </span>
                  </button>

                  {/* Actions (Order, Rename, Delete) */}
                  {!isRenamingThis && (
                    <div className="playlist-actions">
                      <button
                        id={`order-btn-${pl.playlist_id}`}
                        type="button"
                        className="pl-action-btn"
                        onClick={() => openOrderModal(pl)}
                        disabled={pl.video_count === 0 || loadingExpand}
                        aria-label={`Reorder videos in ${pl.name}`}
                        title="Reorder"
                      >
                        <Icon as={ListOrdered} size={15} anim="bounce" />
                        <span className="pl-action-text">Order</span>
                      </button>

                      <button
                        id={`rename-btn-${pl.playlist_id}`}
                        type="button"
                        className="pl-action-btn"
                        onClick={() => startRename(pl)}
                        aria-label={`Rename ${pl.name}`}
                        title="Rename"
                      >
                        <Icon as={Pencil} size={15} anim="spin-once" />
                        <span className="pl-action-text">Rename</span>
                      </button>

                      <button
                        id={`delete-btn-${pl.playlist_id}`}
                        type="button"
                        className="pl-action-btn is-danger"
                        onClick={() => setDeleteTarget({ id: pl.playlist_id, name: pl.name })}
                        disabled={busy === pl.playlist_id}
                        aria-label={`Delete ${pl.name}`}
                        title="Delete"
                      >
                        <Icon as={Trash2} size={15} anim="shake" />
                        <span className="pl-action-text">Delete</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded video list */}
                {isExpanded && (
                  <div
                    id={`playlist-panel-${pl.playlist_id}`}
                    className="playlist-panel"
                    role="region"
                    aria-label={`Videos in ${pl.name}`}
                  >
                    {loadingExpand ? (
                      <div className="playlist-loading">
                        <span className="spinner" aria-hidden="true" />
                        <span>Loading videos…</span>
                      </div>
                    ) : expandedVideos.length === 0 ? (
                      <p className="playlist-empty-msg">No videos in this playlist yet. Add videos from your library or search results.</p>
                    ) : (
                      <ul className="playlist-video-list" role="list">
                        {expandedVideos.map((v, i) => (
                          <li key={v.videoId} className="playlist-video-row">
                            <span className="pv-num tabular-nums" aria-hidden="true">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <div
                              className="pv-thumb-wrap"
                              role={onPlay ? 'button' : undefined}
                              tabIndex={onPlay ? 0 : -1}
                              aria-label={onPlay ? `Play ${v.title} in Rewind` : undefined}
                              onClick={() => onPlay?.(v)}
                            >
                              {v.thumbnail && (
                                <img src={v.thumbnail} alt="" className="pv-thumb" width={68} height={38} loading="lazy" />
                              )}
                            </div>
                            <div className="pv-content">
                              <a
                                href={`https://www.youtube.com/watch?v=${v.videoId}`}
                                target={onPlay ? undefined : '_blank'}
                                rel={onPlay ? undefined : 'noopener noreferrer'}
                                className="pv-title line-clamp-2"
                                onClick={(e) => {
                                  if (onPlay) {
                                    e.preventDefault();
                                    onPlay(v);
                                  }
                                }}
                              >
                                {v.title}
                              </a>
                              <span className="pv-channel truncate text-muted text-xs">
                                {v.channelName}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

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

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          title="Delete playlist?"
          description={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Delete playlist"
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
          loading={isDeleting}
        />
      )}

      <style jsx>{`
        .playlist-view-root {
          width: 100%;
          container-type: inline-size;
          container-name: playlist-container;
        }
        .playlist-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-4);
          gap: var(--space-3);
          flex-wrap: wrap;
        }
        .playlist-toolbar-left {
          display: flex;
          align-items: baseline;
          gap: var(--space-3);
        }
        .section-heading {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--text-primary);
        }
        .playlist-total-count {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .playlist-create-form {
          display: flex;
          gap: var(--space-2);
          margin-bottom: var(--space-4);
          padding: var(--space-3);
          background-color: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          align-items: center;
          flex-wrap: wrap;
        }
        .playlist-create-input {
          flex: 1 1 200px;
          min-height: 38px;
        }
        .playlist-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          list-style: none;
        }
        .playlist-card {
          background-color: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: border-color var(--transition-fast), background-color var(--transition-fast);
        }
        .playlist-card:hover {
          border-color: var(--border);
        }
        .playlist-card.is-expanded {
          border-color: var(--border);
          background-color: var(--surface-1);
        }
        .playlist-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          flex-wrap: wrap;
        }
        .playlist-toggle-btn {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          flex: 1 1 220px;
          padding: var(--space-2) var(--space-2);
          text-align: left;
          color: var(--text-primary);
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          min-width: 0;
          min-height: 44px;
          transition: background-color var(--transition-fast);
        }
        .playlist-toggle-btn:hover {
          background-color: var(--surface-2);
        }
        :global(.playlist-icon) {
          color: var(--accent);
          flex-shrink: 0;
        }
        .playlist-titles {
          display: flex;
          align-items: baseline;
          gap: var(--space-2);
          min-width: 0;
          flex: 1;
        }
        .playlist-name {
          font-weight: 600;
          font-size: var(--text-sm);
          color: var(--text-primary);
        }
        .playlist-count {
          font-size: var(--text-xs);
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .playlist-chevron {
          color: var(--text-muted);
          display: flex;
          align-items: center;
          transition: transform 200ms ease;
          margin-left: auto;
          flex-shrink: 0;
        }
        .playlist-chevron.is-flipped {
          transform: rotate(180deg);
        }
        .playlist-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
          margin-left: auto;
        }
        .pl-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-secondary);
          font-size: var(--text-xs);
          font-weight: 500;
          cursor: pointer;
          transition: color var(--transition-fast), background-color var(--transition-fast), border-color var(--transition-fast);
          min-height: 36px;
        }
        .pl-action-btn:hover:not(:disabled) {
          color: var(--text-primary);
          background-color: var(--surface-2);
          border-color: var(--border-subtle);
        }
        .pl-action-btn.is-danger:hover:not(:disabled) {
          color: var(--error);
          background-color: var(--error-subtle);
          border-color: transparent;
        }
        .pl-action-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .rename-form {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex: 1;
          flex-wrap: wrap;
        }
        .rename-input {
          flex: 1 1 140px;
          min-width: 120px;
          height: 34px;
          font-size: var(--text-sm);
          padding: 0 var(--space-2);
        }
        .playlist-panel {
          border-top: 1px solid var(--border-subtle);
          padding: var(--space-3) var(--space-4);
          background-color: var(--surface-half);
        }
        .playlist-loading {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--text-muted);
          font-size: var(--text-sm);
          padding: var(--space-2) 0;
        }
        .playlist-empty-msg {
          font-size: var(--text-sm);
          color: var(--text-muted);
          padding: var(--space-2) 0;
        }
        .playlist-video-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          list-style: none;
        }
        .playlist-video-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2) var(--space-2);
          border-radius: var(--radius-sm);
          transition: background-color var(--transition-fast);
        }
        .playlist-video-row:hover {
          background-color: var(--surface-1);
        }
        .pv-num {
          font-size: var(--text-xs);
          color: var(--text-muted);
          font-weight: 700;
          min-width: 22px;
          text-align: center;
          flex-shrink: 0;
        }
        .pv-thumb-wrap {
          position: relative;
          width: 68px;
          height: 38px;
          flex-shrink: 0;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background-color: var(--surface-2);
          cursor: pointer;
        }
        .pv-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pv-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .pv-title {
          font-size: var(--text-sm);
          color: var(--text-primary);
          text-decoration: none;
          line-height: 1.35;
        }
        .pv-title:hover {
          color: var(--accent);
        }

        /* Container Query for action button labels */
        @container playlist-container (max-width: 520px) {
          .pl-action-text {
            display: none;
          }
          .pl-action-btn {
            padding: 8px;
            min-width: 36px;
            justify-content: center;
          }
        }

        @media (pointer: coarse) {
          .pl-action-btn {
            min-height: 44px;
            min-width: 44px;
            padding: var(--space-2);
          }
        }
      `}</style>
    </div>
  );
}
