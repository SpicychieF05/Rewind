'use client';

import { useState } from 'react';
import type { VideoResult } from '@/lib/youtube';

interface Props {
  video: VideoResult;
  isSaved?: boolean;
  onSave?: (video: VideoResult) => Promise<void>;
  onUnsave?: (videoId: string) => Promise<void>;
  onAddToPlaylist?: (video: VideoResult) => void;
  showAddToPlaylist?: boolean;
  /** When provided, clicking the thumbnail or title opens the in-app player instead of navigating to YouTube. */
  onPlay?: (video: VideoResult) => void;
}

export default function VideoCard({
  video,
  isSaved = false,
  onSave,
  onUnsave,
  onAddToPlaylist,
  showAddToPlaylist = false,
  onPlay,
}: Props) {
  const [saved, setSaved] = useState(isSaved);
  const [savingState, setSavingState] = useState<'idle' | 'loading'>('idle');

  const ytUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const handlePlay = (e: React.MouseEvent) => {
    if (onPlay) {
      e.preventDefault();
      onPlay(video);
    }
  };

  return (
    <article className="video-card" aria-label={`Video: ${video.title}`}>
      {/* Thumbnail */}
      <a
        href={ytUrl}
        target={onPlay ? undefined : '_blank'}
        rel={onPlay ? undefined : 'noopener noreferrer'}
        className="thumbnail-link"
        aria-label={onPlay ? `Play "${video.title}" in Rewind` : `Watch "${video.title}" on YouTube`}
        id={`video-${video.videoId}`}
        onClick={handlePlay}
      >
        <div className="thumbnail-wrapper">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              loading="lazy"
              width={320}
              height={180}
            />
          ) : (
            <div className="thumbnail-placeholder" aria-hidden="true">
              <PlayIcon />
            </div>
          )}
        </div>
      </a>

      {/* Info row */}
      <div className="video-info">
        {/* Channel logo */}
        <a
          href={video.channelId ? `https://www.youtube.com/channel/${video.channelId}` : '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="channel-logo-link"
          aria-label={`Visit ${video.channelName || 'channel'} on YouTube`}
          tabIndex={-1}
        >
          {video.channelLogo ? (
            <img
              src={video.channelLogo}
              alt={video.channelName || 'Channel'}
              className="channel-logo"
              width={36}
              height={36}
              loading="lazy"
            />
          ) : (
            <div className="channel-logo-placeholder" aria-hidden="true">
              {(video.channelName || 'Y').charAt(0).toUpperCase()}
            </div>
          )}
        </a>

        {/* Text */}
        <div className="video-text">
          <a
            href={ytUrl}
            target={onPlay ? undefined : '_blank'}
            rel={onPlay ? undefined : 'noopener noreferrer'}
            className="video-title line-clamp-2"
            title={video.title || 'Untitled'}
            onClick={handlePlay}
          >
            {video.title || 'Untitled'}
          </a>
          <div className="video-meta">
            <span className="channel-name">{video.channelName || 'YouTube Channel'}</span>
            <span className="meta-sep" aria-hidden="true">·</span>
            <span>{formatCount(video.views)} views</span>
            {video.likes != null && (
              <>
                <span className="meta-sep" aria-hidden="true">·</span>
                <span>{formatCount(video.likes)} likes</span>
              </>
            )}
          </div>
          <div className="video-date text-muted text-xs">
            {video.publishedAt ? formatDate(video.publishedAt) : ''}
          </div>
        </div>

        {/* Actions */}
        <div className="video-actions">
          {(onSave || onUnsave) && (
            <button
              id={`save-btn-${video.videoId}`}
              className={`btn-icon save-btn ${saved ? 'saved' : ''}`}
              onClick={handleSaveToggle}
              disabled={savingState === 'loading'}
              aria-label={saved ? `Unsave "${video.title}"` : `Save "${video.title}"`}
              aria-pressed={saved}
              title={saved ? 'Unsave' : 'Save'}
            >
              <BookmarkIcon filled={saved} />
            </button>
          )}
          {showAddToPlaylist && (
            <button
              id={`playlist-btn-${video.videoId}`}
              className="btn-icon"
              onClick={() => onAddToPlaylist?.(video)}
              aria-label={`Add "${video.title}" to playlist`}
              title="Add to playlist"
            >
              <PlaylistAddIcon />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .video-card {
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-md);
          overflow: hidden;
          background-color: transparent;
          transition: transform var(--transition-fast);
        }
        .video-card:hover {
          transform: translateY(-2px);
        }
        .thumbnail-link { display: block; }
        .thumbnail-placeholder {
          width: 100%;
          aspect-ratio: 16/9;
          background-color: var(--bg-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        .video-info {
          display: flex;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-1) var(--space-1);
          align-items: flex-start;
        }
        .channel-logo-link { flex-shrink: 0; }
        .channel-logo {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          background-color: var(--bg-secondary);
        }
        .channel-logo-placeholder {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: var(--accent);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: var(--text-base);
        }
        .video-text {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .video-title {
          font-size: var(--text-base);
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.4;
          text-decoration: none;
        }
        .video-title:hover { color: var(--text-primary); }
        .video-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: var(--space-1);
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }
        .channel-name { color: var(--text-secondary); }
        .meta-sep { color: var(--text-muted); }
        .video-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          flex-shrink: 0;
        }
        .save-btn { color: var(--text-secondary); }
        .save-btn.saved { color: var(--accent); }
        .save-btn:disabled { opacity: 0.5; }
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

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function PlaylistAddIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="11" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
      <line x1="16" y1="15" x2="16" y2="21"/>
      <line x1="13" y1="18" x2="19" y2="18"/>
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}
