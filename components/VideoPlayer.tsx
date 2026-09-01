'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { VideoResult } from '@/lib/youtube';

// ── YouTube IFrame API types (minimal) ────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onError?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: Record<string, number>;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  loadVideoById(videoId: string): void;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
}

// ── Singleton API loader ──────────────────────────────────────────────────────

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise<void>((resolve) => {
    if (typeof window === 'undefined') return;
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  });
  return apiLoadPromise;
}

// ── Component ─────────────────────────────────────────────────────────────────

type ViewMode = 'normal' | 'theater' | 'fullscreen';

interface Props {
  videoId: string;
  savedVideos: VideoResult[];
  onClose: () => void;
  onVideoSwap?: (video: VideoResult) => void;
}

export default function VideoPlayer({ videoId, savedVideos, onClose, onVideoSwap }: Props) {
  const [mode, setMode] = useState<ViewMode>('normal');
  const [apiReady, setApiReady] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState(videoId);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const modeRef = useRef<ViewMode>('normal');

  // Keep modeRef in sync for use inside event handlers
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ── Load API ────────────────────────────────────────────────────────────────

  useEffect(() => {
    loadYouTubeAPI().then(() => setApiReady(true));
  }, []);

  // ── Initialize / swap player ─────────────────────────────────────────────────

  useEffect(() => {
    if (!apiReady || !playerDivRef.current) return;

    if (playerRef.current) {
      // Already initialised — just swap the video
      playerRef.current.loadVideoById(currentVideoId);
      return;
    }

    playerRef.current = new window.YT.Player(playerDivRef.current, {
      videoId: currentVideoId,
      playerVars: {
        autoplay: 1,
        rel: 0,
        fs: 0,        // disable YouTube's own native fullscreen button
        modestbranding: 1,
      },
    });
  }, [apiReady, currentVideoId]);

  // ── Destroy on unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  // ── Swap video (side panel click) ────────────────────────────────────────────

  const handleSwap = useCallback((video: VideoResult) => {
    setCurrentVideoId(video.videoId);
    if (playerRef.current) {
      playerRef.current.loadVideoById(video.videoId);
    }
    onVideoSwap?.(video);
  }, [onVideoSwap]);

  // ── Fullscreen helpers ───────────────────────────────────────────────────────

  const enterFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen?.().catch(() => {});
    setMode('fullscreen');
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setMode('normal');
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (modeRef.current === 'fullscreen') {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen]);

  const toggleTheater = useCallback(() => {
    setMode((prev) => (prev === 'theater' ? 'normal' : 'theater'));
  }, []);

  // ── Sync mode when browser exits fullscreen via Esc ─────────────────────────

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement && modeRef.current === 'fullscreen') {
        setMode('normal');
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: don't fire inside input/textarea/select/contenteditable
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      const isEditable = document.activeElement?.getAttribute('contenteditable') === 'true';
      if (['input', 'textarea', 'select'].includes(tag) || isEditable) return;

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTheater();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'Escape' && modeRef.current !== 'fullscreen') {
        // Esc closes overlay (when NOT in browser fullscreen — browser handles that case)
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheater, toggleFullscreen, onClose]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const isTheater = mode === 'theater';
  const isFullscreen = mode === 'fullscreen';
  const showPanel = mode === 'normal' && savedVideos.length > 0;

  return (
    <div
      id="video-player-overlay"
      className={`player-overlay ${isTheater ? 'theater' : ''} ${isFullscreen ? 'fullscreen-mode' : ''}`}
      aria-modal="true"
      role="dialog"
      aria-label="In-app video player"
    >

      <div className="player-shell" ref={containerRef}>
        {/* ── Top bar ── */}
        <div className="player-topbar">
          <div className="player-mode-controls">
            {/* Theater button */}
            <button
              id="player-theater-btn"
              className={`player-ctrl-btn ${isTheater ? 'active' : ''}`}
              onClick={toggleTheater}
              aria-label={isTheater ? 'Exit theater mode' : 'Enter theater mode'}
              title={isTheater ? 'Exit theater (T)' : 'Theater mode (T)'}
            >
              <TheaterIcon active={isTheater} />
            </button>

            {/* Fullscreen button */}
            <button
              id="player-fullscreen-btn"
              className={`player-ctrl-btn ${isFullscreen ? 'active' : ''}`}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              <FullscreenIcon active={isFullscreen} />
            </button>
          </div>

          {/* Close button */}
          <button
            id="player-close-btn"
            className="player-ctrl-btn player-close"
            onClick={onClose}
            aria-label="Close player"
            title="Close (Esc)"
          >
            <CloseIcon />
          </button>
        </div>

        {/* ── Main content row ── */}
        <div className="player-content">
          {/* Player area */}
          <div className="player-area">
            <div className="player-iframe-wrap">
              {apiReady ? (
                <div ref={playerDivRef} className="player-iframe-target" />
              ) : (
                <div className="player-loading" aria-label="Loading player…">
                  <span className="spinner" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Keyboard hint */}
            {!isFullscreen && (
              <p className="player-shortcut-hint" aria-hidden="true">
                <kbd>T</kbd> theater &nbsp;·&nbsp; <kbd>F</kbd> fullscreen
              </p>
            )}
          </div>

          {/* ── Saved Videos side panel (Normal mode only) ── */}
          {showPanel && (
            <aside
              id="player-saved-panel"
              className="player-saved-panel"
              aria-label="Saved videos"
            >
              <h2 className="panel-heading">Saved Videos</h2>
              <ul className="panel-list" role="list">
                {savedVideos.map((v) => (
                  <li key={v.videoId}>
                    <button
                      id={`panel-video-${v.videoId}`}
                      className={`panel-item ${v.videoId === currentVideoId ? 'panel-item-active' : ''}`}
                      onClick={() => handleSwap(v)}
                      aria-label={`Play ${v.title}`}
                      aria-current={v.videoId === currentVideoId ? 'true' : undefined}
                    >
                      <div className="panel-thumb-wrap">
                        {v.thumbnail ? (
                          <img
                            src={v.thumbnail}
                            alt={v.title}
                            className="panel-thumb"
                            width={100}
                            height={56}
                            loading="lazy"
                          />
                        ) : (
                          <div className="panel-thumb-placeholder" aria-hidden="true">
                            <PanelPlayIcon />
                          </div>
                        )}
                        {v.videoId === currentVideoId && (
                          <div className="panel-now-playing" aria-hidden="true">▶</div>
                        )}
                      </div>
                      <div className="panel-info">
                        <span className="panel-title line-clamp-2">{v.title}</span>
                        <span className="panel-channel">{v.channelName || 'YouTube Channel'}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </div>

      <style jsx>{`
        /* ── Overlay ── */
        .player-overlay {
          position: fixed;
          inset: 0;
          z-index: 500;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding-top: var(--nav-height);
          background-color: var(--bg-primary);
          overflow-y: auto;
        }

        /* Theater: full-black, no scroll — mirrors YouTube theater mode */
        .player-overlay.theater {
          background-color: #000;
          overflow: hidden;
        }

        /* ── Shell ── */
        .player-shell {
          width: 100%;
          max-width: var(--content-max-width);
          padding: var(--space-3) var(--space-4) var(--space-8);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        /* Theater: shell becomes centered, narrower padding */
        .theater .player-shell {
          position: relative;
          z-index: 1;
          background-color: var(--bg-primary);
          border-radius: var(--radius-lg);
          padding: var(--space-3) var(--space-6) var(--space-6);
          box-shadow: 0 0 0 1px var(--border-subtle), var(--shadow-lg);
        }

        /* Fullscreen: container fills entire screen */
        .player-shell:fullscreen,
        .player-shell:-webkit-full-screen {
          background-color: #000;
          padding: 0;
          max-width: none;
          border-radius: 0;
        }

        /* ── Top bar ── */
        .player-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-1);
        }
        .player-mode-controls {
          display: flex;
          align-items: center;
          gap: var(--space-1);
        }
        .player-ctrl-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: transparent;
          color: var(--text-secondary);
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .player-ctrl-btn:hover {
          background-color: var(--bg-secondary);
          color: var(--text-primary);
        }
        .player-ctrl-btn.active {
          color: var(--accent);
        }
        .player-close {
          color: var(--text-muted);
        }
        .player-close:hover {
          background-color: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        /* ── Content row ── */
        .player-content {
          display: flex;
          gap: var(--space-4);
          align-items: flex-start;
        }

        /* ── Player area ── */
        .player-area {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .player-iframe-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background-color: #000;
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .player-iframe-target {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        /* The actual iframe injected by YT API */
        .player-iframe-target iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }
        .player-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .player-shortcut-hint {
          font-size: var(--text-xs);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 1px 6px;
          background-color: var(--bg-tertiary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-family: var(--font-body);
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* Theater: shell fills viewport height, no padding overflow */
        .theater .player-shell {
          height: calc(100vh - var(--nav-height));
          max-width: 100%;
          padding: var(--space-2) var(--space-4) 0;
          overflow: hidden;
        }

        /* Theater: single-column, fill remaining height */
        .theater .player-content {
          flex: 1;
          min-height: 0;
          flex-direction: column;
        }
        .theater .player-area {
          flex: 1;
          min-height: 0;
          width: 100%;
        }

        /* Theater: max-height drives sizing, aspect-ratio adjusts width proportionally */
        .theater .player-iframe-wrap {
          width: 100%;
          max-height: calc(100vh - var(--nav-height) - 54px); /* 54px = topbar row + gap */
          border-radius: 0;
        }

        /* ── Saved Videos panel ── */
        .player-saved-panel {
          width: 340px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          max-height: calc(100vh - var(--nav-height) - 80px);
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .panel-heading {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding-bottom: var(--space-2);
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }
        .panel-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .panel-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-2);
          width: 100%;
          text-align: left;
          padding: var(--space-2);
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--text-primary);
          transition: background-color var(--transition-fast);
          cursor: pointer;
        }
        .panel-item:hover {
          background-color: var(--bg-secondary);
        }
        .panel-item-active {
          background-color: var(--bg-tertiary);
        }
        .panel-thumb-wrap {
          position: relative;
          width: 100px;
          aspect-ratio: 16 / 9;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background-color: var(--bg-secondary);
          flex-shrink: 0;
        }
        .panel-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .panel-thumb-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        .panel-now-playing {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(0, 0, 0, 0.55);
          font-size: 18px;
          color: #fff;
        }
        .panel-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .panel-title {
          font-size: var(--text-xs);
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.4;
        }
        .panel-channel {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* ── Mobile responsive ── */
        @media (max-width: 900px) {
          .player-saved-panel {
            width: 260px;
          }
        }
        @media (max-width: 640px) {
          .player-content {
            flex-direction: column;
          }
          .player-saved-panel {
            width: 100%;
            max-height: 320px;
          }
          .panel-thumb-wrap {
            width: 80px;
          }
        }
      `}</style>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function TheaterIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {active ? (
        // Theater active: narrow rectangle (exit theater)
        <>
          <rect x="2" y="7" width="20" height="10" rx="2" />
        </>
      ) : (
        // Theater inactive: wide rectangle
        <>
          <rect x="2" y="5" width="20" height="14" rx="2" />
        </>
      )}
    </svg>
  );
}

function FullscreenIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {active ? (
        // Exit fullscreen
        <>
          <polyline points="8 3 3 3 3 8" />
          <polyline points="21 8 21 3 16 3" />
          <polyline points="3 16 3 21 8 21" />
          <polyline points="16 21 21 21 21 16" />
        </>
      ) : (
        // Enter fullscreen
        <>
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </>
      )}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PanelPlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}
