'use client';

import React, { useState, useRef, useCallback } from 'react';
import { GripVertical, ChevronUp, ChevronDown, Play } from 'lucide-react';
import type { VideoResult } from '@/lib/youtube';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Icon from './ui/Icon';
import { useToast } from './ui/ToastProvider';

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
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function PlaylistOrderModal({ playlistName, videos, onSave, onClose, onPlay }: Props) {
  const { showToast } = useToast();
  const [items, setItems] = useState<PlaylistVideo[]>([...videos].sort((a, b) => a.position - b.position));
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  // Drag state
  const dragIndexRef = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDrop = useCallback(() => {
    const from = dragIndexRef.current;
    const to = dropTargetIndex;
    if (from != null && to != null && from !== to) {
      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next.map((v, i) => ({ ...v, position: i + 1 }));
      });
    }
    dragIndexRef.current = null;
    setDraggedIndex(null);
    setDropTargetIndex(null);
  }, [dropTargetIndex]);

  // Arrow movements
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(items.map((v) => v.videoId));
      showToast('Playlist order updated', 'success');
    } catch {
      showToast('Failed to save order', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Reorder: ${playlistName}`}
      maxWidth={640}
      footer={
        <div className="order-footer">
          <Button tier="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            tier="accent"
            onClick={handleSave}
            loading={saving}
          >
            Save order
          </Button>
        </div>
      }
    >
      <div className="order-body">
        <p className="order-hint">
          Drag and drop rows or use the arrow buttons to reorder videos.
        </p>

        <ul className="order-list" role="list" aria-label="Playlist video order">
          {items.map((video, index) => {
            const isDragging = draggedIndex === index;
            const isDropTarget = dropTargetIndex === index;

            return (
              <li
                key={video.videoId}
                id={`order-item-${video.videoId}`}
                className={`order-item ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'is-drop-target' : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                aria-label={`Position ${String(index + 1).padStart(2, '0')}: ${video.title}`}
              >
                {/* Position number */}
                <span className="order-num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>

                {/* Thumbnail */}
                <div
                  className="order-thumb-wrap"
                  onClick={() => onPlay?.(video)}
                  role={onPlay ? 'button' : undefined}
                  tabIndex={onPlay ? 0 : -1}
                  aria-label={onPlay ? `Play ${video.title}` : undefined}
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
                  {onPlay && (
                    <span className="order-thumb-play" aria-hidden="true">
                      <Icon as={Play} size={14} />
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="order-info">
                  <span className="order-title line-clamp-2">{video.title}</span>
                  <span className="order-date tabular-nums">
                    {video.publishedAt ? formatDate(video.publishedAt) : ''}
                  </span>
                </div>

                {/* Controls */}
                <div className="order-controls">
                  <div className="order-arrows" role="group" aria-label={`Move ${video.title}`}>
                    <button
                      id={`move-up-${video.videoId}`}
                      type="button"
                      className="order-arrow-btn"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      aria-label={`Move ${video.title} up`}
                      title="Move up"
                    >
                      <Icon as={ChevronUp} size={16} />
                    </button>
                    <button
                      id={`move-down-${video.videoId}`}
                      type="button"
                      className="order-arrow-btn"
                      onClick={() => moveDown(index)}
                      disabled={index === items.length - 1}
                      aria-label={`Move ${video.title} down`}
                      title="Move down"
                    >
                      <Icon as={ChevronDown} size={16} />
                    </button>
                  </div>

                  <div className="drag-handle" aria-hidden="true" title="Drag to reorder">
                    <Icon as={GripVertical} size={18} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <style jsx>{`
        .order-body {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          max-height: min(65dvh, 520px);
        }
        .order-hint {
          font-size: var(--text-xs);
          color: var(--text-muted);
          padding-bottom: var(--space-1);
        }
        .order-list {
          list-style: none;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-right: 4px;
        }
        .order-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2) var(--space-3);
          background-color: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          transition: background-color var(--transition-fast), border-color var(--transition-fast), opacity var(--transition-fast);
        }
        .order-item:hover {
          background-color: var(--surface-2);
          border-color: var(--border);
        }
        .order-item.is-dragging {
          opacity: 0.4;
        }
        .order-item.is-drop-target {
          border-color: var(--accent);
          background-color: var(--accent-subtle);
        }
        .order-num {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--text-muted);
          min-width: 22px;
          text-align: center;
          flex-shrink: 0;
        }
        .order-thumb-wrap {
          position: relative;
          width: 72px;
          height: 40px;
          flex-shrink: 0;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background-color: var(--surface-2);
          cursor: pointer;
        }
        .order-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .order-thumb-placeholder {
          width: 100%;
          height: 100%;
          background-color: var(--surface-3);
        }
        .order-thumb-play {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(0, 0, 0, 0.45);
          color: #fff;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }
        .order-thumb-wrap:hover .order-thumb-play {
          opacity: 1;
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
        .order-arrows {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .order-arrow-btn {
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          cursor: pointer;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .order-arrow-btn:hover:not(:disabled) {
          background-color: var(--surface-3);
          color: var(--text-primary);
        }
        .order-arrow-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }
        .drag-handle {
          display: none;
          color: var(--text-muted);
          cursor: grab;
          padding: 4px;
        }
        .drag-handle:active {
          cursor: grabbing;
        }
        @media (pointer: fine) {
          .drag-handle {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
        .order-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: var(--space-2);
          width: 100%;
        }

        @media (pointer: coarse) {
          .order-arrow-btn {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </Modal>
  );
}
