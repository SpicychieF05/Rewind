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
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PlaylistOrderModal({ playlistName, videos, onSave, onClose }: Props) {
  const [items, setItems] = useState<PlaylistVideo[]>([...videos].sort((a, b) => a.position - b.position));
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Drag state
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Desktop: drag handlers ────────────────────────────────────────────────

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

  // ── Mobile: arrow handlers ─────────────────────────────────────────────────

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
          {isMobile
            ? 'Use the arrow buttons to reorder.'
            : 'Drag and drop rows to reorder.'}
        </p>

        <ul className="order-list" role="list" aria-label="Playlist video order">
          {items.map((video, index) => (
            <li
              key={video.videoId}
              id={`order-item-${video.videoId}`}
              className="order-item"
              draggable={!isMobile}
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
                target="_blank"
                rel="noopener noreferrer"
                className="order-thumb-link"
                tabIndex={-1}
                aria-label={`Watch ${video.title} on YouTube`}
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

              {/* Title */}
              <span className="order-title line-clamp-2">{video.title}</span>
              <span className="order-date text-xs text-muted">
                {video.publishedAt ? formatDate(video.publishedAt) : ''}
              </span>

              {/* Desktop: drag handle / Mobile: arrow buttons */}
              {isMobile ? (
                <div className="order-arrows" role="group" aria-label={`Move ${video.title}`}>
                  <button
                    id={`move-up-${video.videoId}`}
                    className="btn-icon order-arrow-btn"
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    aria-label={`Move ${video.title} up`}
                  >
                    <ChevronUpIcon />
                  </button>
                  <button
                    id={`move-down-${video.videoId}`}
                    className="btn-icon order-arrow-btn"
                    onClick={() => moveDown(index)}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${video.title} down`}
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
              ) : (
                <div className="drag-handle" aria-hidden="true" title="Drag to reorder">
                  <GripIcon />
                </div>
              )}
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
        .order-modal { max-width: 640px; }
        .modal-title { font-size: var(--text-lg); font-weight: 700; }
        .modal-title em { font-style: normal; color: var(--text-secondary); font-weight: 400; }
        .order-hint {
          padding: 0 var(--space-5) var(--space-3);
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .order-list { list-style: none; }
        .order-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2) var(--space-5);
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
          min-width: 24px;
          text-align: center;
          flex-shrink: 0;
        }
        .order-thumb-link { flex-shrink: 0; display: block; }
        .order-thumb {
          width: 80px;
          height: 45px;
          object-fit: cover;
          border-radius: var(--radius-sm);
          background-color: var(--bg-primary);
        }
        .order-thumb-placeholder {
          width: 80px;
          height: 45px;
          border-radius: var(--radius-sm);
          background-color: var(--bg-secondary);
        }
        .order-title {
          flex: 1;
          font-size: var(--text-sm);
          color: var(--text-primary);
          min-width: 0;
          line-height: 1.4;
        }
        .order-date { flex-shrink: 0; }
        .drag-handle {
          flex-shrink: 0;
          color: var(--text-muted);
          cursor: grab;
          padding: var(--space-1);
        }
        .order-arrows {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex-shrink: 0;
        }
        .order-arrow-btn {
          width: 28px;
          height: 28px;
          color: var(--text-secondary);
        }
        .order-arrow-btn:disabled { opacity: 0.25; cursor: not-allowed; }
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
