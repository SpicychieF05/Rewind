'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { VideoResult } from '@/lib/youtube';

interface PlaylistVideo extends VideoResult {
  position: number;
}

interface Props {
  playlistName: string;
  videos: PlaylistVideo[];
  onSave: (orderedVideoIds: string[]) => Promise<void>;
  onClose: () => void;
  onPlay?: (video: VideoResult) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PlaylistOrderModal({ playlistName, videos, onSave, onClose, onPlay }: Props) {
  const [items, setItems] = useState<PlaylistVideo[]>([...videos].sort((a, b) => a.position - b.position));
  const [saving, setSaving] = useState(false);

  // Drag state
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverIndex.current = index;
  };

  const handleDrop = useCallback(() => {
    const from = dragIndex.current;
    const to = dragOverIndex.current;
    if (from == null || to == null || from === to) return;

    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((v, i) => ({ ...v, position: i + 1 }));
    });
    dragIndex.current = null;
    dragOverIndex.current = null;
  }, []);

  // ── Arrow handlers (Touch & Keyboard friendly) ─────────────────────────────

  const moveUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((v, i) => ({ ...v, position: i + 1 }));
    });
  };

  const moveDown = (index: number) => {
    if (index === items.length - 1) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((v, i) => ({ ...v, position: i + 1 }));
    });
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(items.map((v) => v.videoId));
    } finally {
      setSaving(false);
    }
  };

  // ── Keyboard: close on Esc ──────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      id="order-modal-overlay"
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-modal-title"
    >
      <div className="modal-box order-modal">
        <div className="modal-header">
          <h2 id="order-modal-title" className="modal-title">
            Reorder: <em>{playlistName}</em>
          </h2>
          <button
            id="order-modal-close"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close reorder dialog"
          >
            <XIcon />
          </button>
        </div>

        <p className="order-hint">
          Drag and drop rows or use the arrow buttons to reorder videos.
        </p>

        <ul className="order-list" role="list" aria-label="Playlist video order">
          {items.map((video, index) => (
            <li
              key={video.videoId}
              id={`order-item-${video.videoId}`}
              className="order-item"
              draggable={true}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              aria-label={`Position ${String(index + 1).padStart(2, '0')}: ${video.title}`}
            >
              {/* Position number */}
              <span className="order-num" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>

              {/* Thumbnail */}
              <a
                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                target={onPlay ? undefined : '_blank'}
                rel={onPlay ? undefined : 'noopener noreferrer'}
                className="order-thumb-link"
                tabIndex={-1}
                aria-label={onPlay ? `Play ${video.title} in Rewind` : `Watch ${video.title} on YouTube`}
                onClick={(e) => { if (onPlay) { e.preventDefault(); onPlay(video); } }}
              >
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt=""
                    className="order-thumb"
                    width={80}
                    height={45}
                    loading="lazy"
                  />
                ) : (
                  <div className="order-thumb-placeholder" aria-hidden="true" />
                )}
              </a>

              {/* Title & Date */}
              <div className="order-info">
                <span className="order-title line-clamp-2">{video.title}</span>
                <span className="order-date text-xs text-muted">
                  {video.publishedAt ? formatDate(video.publishedAt) : ''}
                </span>
              </div>

              {/* Reorder controls: Drag handle + Accessible Arrows */}
              <div className="order-controls">
                <div className="order-arrows" role="group" aria-label={`Move ${video.title}`}>
                  <button
                    id={`move-up-${video.videoId}`}
                    type="button"
                    className="btn-icon order-arrow-btn"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    aria-label={`Move ${video.title} up`}
                    title="Move up"
                  >
                    <ChevronUpIcon />
                  </button>
                  <button
                    id={`move-down-${video.videoId}`}
                    type="button"
                    className="btn-icon order-arrow-btn"
                    onClick={() => moveDown(index)}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${video.title} down`}
                    title="Move down"
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
                <div className="drag-handle" aria-hidden="true" title="Drag to reorder">
                  <GripIcon />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="modal-footer">
          <button
            id="order-cancel-btn"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            id="order-save-btn"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            aria-busy={saving}
          >
            {saving ? <><span className="spinner" aria-hidden="true" /> Saving…</> : 'Save order'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .order-modal {
          max-width: 640px;
          max-height: min(90dvh, 740px);
          display: flex;
          flex-direction: column;
        }
        .modal-title { font-size: var(--text-lg); font-weight: 700; }
        .modal-title em { font-style: normal; color: var(--text-secondary); font-weight: 400; }
        .order-hint {
          padding: 0 var(--space-4) var(--space-3);
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .order-list {
          list-style: none;
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .order-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2) var(--space-4);
          border-top: 1px solid var(--border-subtle);
          cursor: grab;
          transition: background-color var(--transition-fast);
        }
        .order-item:hover { background-color: var(--bg-tertiary); }
        .order-item:first-child { border-top: none; }
        .order-num {
          font-size: var(--text-sm);
          font-weight: 700;
          color: var(--text-muted);
          min-width: 20px;
          text-align: center;
          flex-shrink: 0;
        }
        .order-thumb-link { flex-shrink: 0; display: block; }
        .order-thumb {
          width: 72px;
          height: 40px;
          object-fit: cover;
          border-radius: var(--radius-sm);
          background-color: var(--bg-primary);
        }
        .order-thumb-placeholder {
          width: 72px;
          height: 40px;
          border-radius: var(--radius-sm);
          background-color: var(--bg-secondary);
        }
        .order-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .order-title {
          font-size: var(--text-sm);
          color: var(--text-primary);
          line-height: 1.35;
          word-break: break-word;
        }
        .order-date {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .order-controls {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          flex-shrink: 0;
        }
        .drag-handle {
          color: var(--text-muted);
          cursor: grab;
          padding: var(--space-1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .drag-handle:hover {
          color: var(--text-primary);
        }
        .order-arrows {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex-shrink: 0;
        }
        .order-arrow-btn {
          width: 32px;
          height: 32px;
          color: var(--text-secondary);
        }
        .order-arrow-btn:disabled { opacity: 0.2; cursor: not-allowed; }

        @media (pointer: coarse) {
          .order-arrow-btn {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/>
      <circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/>
      <circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/>
    </svg>
  );
}
function ChevronUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
