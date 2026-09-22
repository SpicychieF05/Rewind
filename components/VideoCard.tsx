'use client';

import React, { useState } from 'react';
import { Bookmark, ListPlus, Play } from 'lucide-react';
import type { VideoResult } from '@/lib/youtube';
import Icon from './ui/Icon';
import IconButton from './ui/IconButton';

interface Props {
  video: VideoResult;
  isSaved?: boolean;
  isAuthenticated?: boolean;
  onPromptSignIn?: () => void;
  onSave?: (video: VideoResult) => Promise<void>;
  onUnsave?: (videoId: string) => Promise<void>;
  onAddToPlaylist?: (video: VideoResult) => void;
  showAddToPlaylist?: boolean;
  onPlay?: (video: VideoResult) => void;
}

export default function VideoCard({
  video,
  isSaved = false,
  isAuthenticated = true,
  onPromptSignIn,
  onSave,
  onUnsave,
  onAddToPlaylist,
  showAddToPlaylist = true,
  onPlay,
}: Props) {
  const [saved, setSaved] = useState(isSaved);
  const [savingState, setSavingState] = useState<'idle' | 'loading'>('idle');

  const ytUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      onPromptSignIn?.();
      return;
    }
    if (savingState === 'loading') return;
    setSavingState('loading');
    try {
      if (saved) {
        await onUnsave?.(video.videoId);
        setSaved(false);
      } else {
        await onSave?.(video);
        setSaved(true);
      }
    } finally {
      setSavingState('idle');
    }
  };

  const handleAddToPlaylistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      onPromptSignIn?.();
      return;
    }
    onAddToPlaylist?.(video);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onPlay) {
      e.preventDefault();
      onPlay(video);
    }
  };

  return (
    <article className="video-card-container" aria-label={`Video: ${video.title}`}>
      <div className="video-card">
        {/* Thumbnail Area with Floating Overlay Actions (§9.5) */}
        <div className="thumbnail-box">
          <a
            href={ytUrl}
            target={onPlay ? undefined : '_blank'}
            rel={onPlay ? undefined : 'noopener noreferrer'}
            className="thumbnail-anchor"
            aria-label={onPlay ? `Play "${video.title}" in Rewind` : `Watch "${video.title}" on YouTube`}
            id={`video-${video.videoId}`}
            onClick={handleCardClick}
          >
            <div className="thumbnail-aspect">
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  loading="lazy"
                  width={320}
                  height={180}
                  className="thumbnail-img"
                />
              ) : (
                <div className="thumbnail-placeholder" aria-hidden="true">
                  <Icon as={Play} size={36} />
                </div>
              )}
            </div>
          </a>

          {/* Top-Right Thumbnail Overlay Actions */}
          <div className="thumbnail-actions-overlay">
            {/* Bookmark button */}
            {(onSave || onUnsave) && (
              <IconButton
                id={`save-btn-${video.videoId}`}
                aria-label={saved ? `Unsave "${video.title}"` : `Save "${video.title}"`}
                onClick={handleSaveToggle}
                disabled={savingState === 'loading'}
                size="sm"
                className={`card-overlay-btn bookmark-btn ${saved ? 'is-saved' : ''}`}
                tooltip={saved ? 'Unsave' : 'Save'}
              >
                <Icon
                  as={Bookmark}
                  size={16}
                  anim="pop"
                  style={{ fill: saved ? 'currentColor' : 'none' }}
                />
              </IconButton>
            )}

            {/* Add to Playlist button */}
            {showAddToPlaylist && onAddToPlaylist && (
              <IconButton
                id={`playlist-btn-${video.videoId}`}
                aria-label={`Add "${video.title}" to playlist`}
                onClick={handleAddToPlaylistClick}
                size="sm"
                className="card-overlay-btn"
                tooltip="Add to playlist"
              >
                <Icon as={ListPlus} size={16} anim="nudge-up" />
              </IconButton>
            )}
          </div>
        </div>

        {/* Video Info Section */}
        <div className="video-info-row">
          {/* Channel Logo */}
          <a
            href={video.channelId ? `https://www.youtube.com/channel/${video.channelId}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="channel-avatar-link"
            aria-label={`Visit ${video.channelName || 'channel'} on YouTube`}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            {video.channelLogo ? (
              <img
                src={video.channelLogo}
                alt=""
                className="channel-avatar-img"
                width={36}
                height={36}
                loading="lazy"
              />
            ) : (
              <div className="channel-avatar-fallback" aria-hidden="true">
                {(video.channelName || 'Y').charAt(0).toUpperCase()}
              </div>
            )}
          </a>

          {/* Metadata Block */}
          <div className="video-details">
            <a
              href={ytUrl}
              target={onPlay ? undefined : '_blank'}
              rel={onPlay ? undefined : 'noopener noreferrer'}
              className="video-title-link line-clamp-2"
              title={video.title || 'Untitled'}
              onClick={handleCardClick}
            >
              {video.title || 'Untitled'}
            </a>

            <span className="channel-name truncate">
              {video.channelName || 'YouTube Channel'}
            </span>

            <div className="video-stats tabular-nums">
              <span>{formatCount(video.views)} views</span>
              {video.likes != null && (
                <>
                  <span className="meta-sep" aria-hidden="true">·</span>
                  <span>{formatCount(video.likes)} likes</span>
                </>
              )}
              {video.publishedAt && (
                <>
                  <span className="meta-sep" aria-hidden="true">·</span>
                  <span>{formatDate(video.publishedAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .video-card-container {
          container-type: inline-size;
          container-name: card-container;
          width: 100%;
        }

        .video-card {
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-lg);
          background-color: transparent;
          transition: transform var(--transition-fast);
          overflow: hidden;
        }

        .video-card:hover {
          transform: translateY(-2px);
        }

        /* ── Thumbnail & Overlay ── */
        .thumbnail-box {
          position: relative;
          width: 100%;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background-color: var(--surface-2);
          box-shadow: var(--shadow-sm);
        }

        .thumbnail-anchor {
          display: block;
          width: 100%;
          outline: none;
        }

        .thumbnail-aspect {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background-color: var(--surface-2);
        }

        .thumbnail-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--dur-slow) var(--ease-standard);
        }

        @media (hover: hover) {
          .video-card:hover .thumbnail-img {
            transform: scale(1.03);
          }
        }

        .thumbnail-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        /* Floating Overlay Buttons */
        .thumbnail-actions-overlay {
          position: absolute;
          top: 6px;
          right: 6px;
          display: flex;
          gap: 6px;
          z-index: 2;
        }

        :global(.card-overlay-btn) {
          background-color: rgba(15, 15, 15, 0.78) !important;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.12) !important;
          color: var(--text-primary) !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
          transition: opacity var(--transition-fast), transform var(--transition-fast), background-color var(--transition-fast) !important;
        }

        :global(.card-overlay-btn:hover) {
          background-color: rgba(25, 25, 25, 0.95) !important;
          transform: scale(1.08);
        }

        :global(.card-overlay-btn.bookmark-btn.is-saved) {
          color: var(--accent) !important;
          background-color: rgba(255, 30, 64, 0.18) !important;
          border-color: var(--accent) !important;
          opacity: 1 !important;
        }

        /* Hover reveals for fine pointers, always visible on touch */
        @media (hover: hover) and (pointer: fine) {
          .thumbnail-actions-overlay {
            opacity: 0;
            transition: opacity var(--transition-fast);
          }
          .video-card:hover .thumbnail-actions-overlay,
          .video-card:focus-within .thumbnail-actions-overlay {
            opacity: 1;
          }
          /* Always show bookmark if saved */
          :global(.card-overlay-btn.is-saved) {
            opacity: 1 !important;
          }
          .thumbnail-actions-overlay:has(.is-saved) {
            opacity: 1;
          }
        }

        /* ── Info Row ── */
        .video-info-row {
          display: flex;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-1) var(--space-2);
          align-items: flex-start;
        }

        .channel-avatar-link {
          flex-shrink: 0;
        }

        .channel-avatar-img {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          background-color: var(--surface-2);
        }

        .channel-avatar-fallback {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: var(--accent);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: var(--text-sm);
        }

        .video-details {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .video-title-link {
          font-size: clamp(0.85rem, 0.8rem + 0.25vw, 0.95rem);
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.35;
          text-decoration: none;
          word-break: break-word;
        }
        .video-title-link:hover {
          color: #fff;
        }

        .channel-name {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          margin-top: 1px;
        }

        .video-stats {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 4px;
          font-size: var(--text-xs);
          color: var(--text-muted);
          margin-top: 2px;
        }

        .meta-sep {
          color: var(--border-strong);
        }

        /* ── Card Container Query Density (§9.5) ── */
        @container card-container (max-width: 240px) {
          .video-info-row {
            gap: var(--space-2);
          }
          .channel-avatar-img,
          .channel-avatar-fallback {
            width: 28px;
            height: 28px;
            font-size: var(--text-xs);
          }
          .video-title-link {
            font-size: var(--text-xs);
          }
        }
      `}</style>
    </article>
  );
}

function formatCount(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
