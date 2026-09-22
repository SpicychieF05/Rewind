'use client';

import React, { useState, useEffect } from 'react';
import { ListVideo, Plus, Check } from 'lucide-react';
import type { VideoResult } from '@/lib/youtube';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Icon from './ui/Icon';
import { useToast } from './ui/ToastProvider';

export interface Playlist {
  playlist_id: string;
  name: string;
  created_at: string;
  video_count: number;
}

export interface PlaylistPickerProps {
  video: VideoResult;
  playlists: Playlist[];
  onAdd?: (playlistId: string) => void;
  onRefreshPlaylists?: () => void;
  onClose: () => void;
}

export default function PlaylistPicker({
  video,
  playlists: initialPlaylists,
  onAdd,
  onRefreshPlaylists,
  onClose,
}: PlaylistPickerProps) {
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>(initialPlaylists);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [addedPlaylists, setAddedPlaylists] = useState<Set<string>>(new Set());

  // Load playlists if empty
  useEffect(() => {
    if (playlists.length === 0) {
      fetch('/api/playlists')
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setPlaylists(data);
        })
        .catch(() => {});
    }
  }, [playlists.length]);

  const handleAddToPlaylist = async (playlist: Playlist) => {
    setLoadingId(playlist.playlist_id);
    try {
      const res = await fetch('/api/playlist-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId: playlist.playlist_id,
          videoId: video.videoId,
        }),
      });

      if (!res.ok) {
        showToast('Failed to add video to playlist', 'error');
        return;
      }

      setAddedPlaylists((prev) => new Set([...prev, playlist.playlist_id]));
      showToast(`Added to "${playlist.name}"`, 'success');
      onAdd?.(playlist.playlist_id);
      onRefreshPlaylists?.();
      setTimeout(onClose, 400);
    } catch {
      showToast('Network error while adding to playlist', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    setLoadingId('create');
    try {
      // 1. Create playlist
      const createRes = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!createRes.ok) {
        showToast('Failed to create playlist', 'error');
        return;
      }

      const newPl: Playlist = await createRes.json();

      // 2. Add video to new playlist
      await fetch('/api/playlist-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId: newPl.playlist_id,
          videoId: video.videoId,
        }),
      });

      showToast(`Created "${trimmed}" and added video`, 'success');
      onAdd?.(newPl.playlist_id);
      onRefreshPlaylists?.();
      onClose();
    } catch {
      showToast('Network error while creating playlist', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add to playlist"
      maxWidth={440}
    >
      <div className="picker-body">
        <p className="picker-video-title truncate">
          Adding: <strong>{video.title}</strong>
        </p>

        {/* Existing Playlists */}
        {playlists.length > 0 && (
          <ul className="picker-list" role="list">
            {playlists.map((pl) => {
              const isAdded = addedPlaylists.has(pl.playlist_id);
              const isLoading = loadingId === pl.playlist_id;

              return (
                <li key={pl.playlist_id}>
                  <button
                    type="button"
                    className={`picker-row ${isAdded ? 'is-added' : ''}`}
                    onClick={() => handleAddToPlaylist(pl)}
                    disabled={isLoading}
                    aria-label={`Add to ${pl.name}`}
                  >
                    <Icon as={ListVideo} size={18} />
                    <span className="picker-name truncate">{pl.name}</span>
                    <span className="picker-count tabular-nums">
                      {pl.video_count} video{pl.video_count !== 1 ? 's' : ''}
                    </span>
                    {isAdded && (
                      <span className="picker-check" aria-hidden="true">
                        <Icon as={Check} size={16} />
                      </span>
                    )}
                    {isLoading && <span className="spinner" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* New Playlist Trigger / Form */}
        {!isCreating ? (
          <Button
            tier="ghost"
            fullWidth
            onClick={() => setIsCreating(true)}
            icon={<Icon as={Plus} size={16} anim="spin-once" />}
            className="picker-create-btn"
          >
            New playlist
          </Button>
        ) : (
          <form onSubmit={handleCreateAndAdd} className="picker-create-form">
            <input
              type="text"
              className="input"
              placeholder="Playlist name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              required
              aria-label="New playlist name"
            />
            <div className="picker-create-actions">
              <Button
                type="submit"
                tier="accent"
                size="sm"
                loading={loadingId === 'create'}
              >
                Create & Add
              </Button>
              <Button
                type="button"
                tier="ghost"
                size="sm"
                onClick={() => {
                  setIsCreating(false);
                  setNewName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .picker-body {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .picker-video-title {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          margin-bottom: 2px;
        }
        .picker-video-title strong {
          color: var(--text-primary);
        }
        .picker-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 240px;
          overflow-y: auto;
          margin-bottom: var(--space-2);
        }
        .picker-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          width: 100%;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          background-color: var(--surface-2);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          font-size: var(--text-sm);
          transition: background-color var(--transition-fast), border-color var(--transition-fast);
          cursor: pointer;
          min-height: 44px;
        }
        .picker-row:hover:not(:disabled) {
          background-color: var(--surface-3);
          border-color: var(--border);
        }
        .picker-row.is-added {
          border-color: var(--accent);
          color: #fff;
        }
        .picker-name {
          flex: 1;
          text-align: left;
          font-weight: 500;
        }
        .picker-count {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .picker-check {
          color: var(--accent);
          display: flex;
          align-items: center;
        }
        .picker-create-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          padding-top: var(--space-1);
        }
        .picker-create-actions {
          display: flex;
          gap: var(--space-2);
          justify-content: flex-end;
        }
      `}</style>
    </Modal>
  );
}
