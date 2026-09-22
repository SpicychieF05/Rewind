'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { RectangleHorizontal, Maximize, Minimize, X, Play, ChevronDown } from 'lucide-react';
import Icon from './ui/Icon';
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
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

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
      playerRef.current.loadVideoById(currentVideoId);
      return;
    }

    playerRef.current = new window.YT.Player(playerDivRef.current, {
      videoId: currentVideoId,
      playerVars: {
        autoplay: 1,
        rel: 0,
        fs: 0, // disable YouTube's own native fullscreen button
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
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheater, toggleFullscreen, onClose]);

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
        {/* Top Control Bar */}
        <div className="player-topbar">
          <div className="player-mode-controls">
            {/* Theater button */}
            <button
              id="player-theater-btn"
              type="button"
              className={`player-ctrl-btn ${isTheater ? 'is-active' : ''}`}
              onClick={toggleTheater}
              aria-label={isTheater ? 'Exit theater mode' : 'Enter theater mode'}
              title={isTheater ? 'Exit theater (T)' : 'Theater mode (T)'}
            >
              <Icon as={RectangleHorizontal} size={18} />
            </button>

            {/* Fullscreen button */}
            <button
              id="player-fullscreen-btn"
              type="button"
              className={`player-ctrl-btn ${isFullscreen ? 'is-active' : ''}`}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              <Icon as={isFullscreen ? Minimize : Maximize} size={18} />
            </button>
          </div>

          {/* Close button */}
          <button
            id="player-close-btn"
            type="button"
            className="player-ctrl-btn player-close"
            onClick={onClose}
            aria-label="Close player"
            title="Close (Esc)"
          >
            <Icon as={X} size={20} />
          </button>
        </div>

        {/* Main content */}
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

            {/* Keyboard shortcut hint */}
            {!isFullscreen && (
              <p className="player-shortcut-hint" aria-hidden="true">
                <kbd>T</kbd> theater &nbsp;·&nbsp; <kbd>F</kbd> fullscreen &nbsp;·&nbsp; <kbd>Esc</kbd> close
              </p>
            )}
          </div>

          {/* Saved Videos side panel (Normal mode only) */}
          {showPanel && (
            <div className="player-panel-section">
              {/* Mobile collapse toggle */}
              <button
                type="button"
                className="player-mobile-panel-toggle"
                onClick={() => setMobilePanelOpen((v) => !v)}
                aria-expanded={mobilePanelOpen}
                aria-controls="player-saved-panel"
              >
                <span>Saved Videos ({savedVideos.length})</span>
                <span className={`toggle-chevron ${mobilePanelOpen ? 'open' : ''}`}>
                  <Icon as={ChevronDown} size={16} />
                </span>
              </button>

              <aside
                id="player-saved-panel"
                className={`player-saved-panel ${mobilePanelOpen ? 'mobile-open' : ''}`}
                aria-label="Saved videos"
              >
                <h2 className="panel-heading">Saved Videos ({savedVideos.length})</h2>
                <ul className="panel-list" role="list">
                  {savedVideos.map((v) => {
                    const isCurrent = v.videoId === currentVideoId;

                    return (
                      <li key={v.videoId}>
                        <button
                          id={`panel-video-${v.videoId}`}
                          type="button"
                          className={`panel-item ${isCurrent ? 'panel-item-active' : ''}`}
                          onClick={() => handleSwap(v)}
                          aria-label={`Play ${v.title}`}
                          aria-current={isCurrent ? 'true' : undefined}
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
                                <Icon as={Play} size={16} />
                              </div>
                            )}
                            {isCurrent && (
                              <div className="panel-now-playing" aria-hidden="true">
                                <Icon as={Play} size={14} />
                              </div>
                            )}
                          </div>
                          <div className="panel-info">
                            <span className="panel-title line-clamp-2">{v.title}</span>
                            <span className="panel-channel truncate">{v.channelName || 'YouTube Channel'}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </aside>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .player-overlay {
          position: fixed;
          inset: 0;
          z-index: 500;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding-top: max(var(--nav-height), env(safe-area-inset-top, 0px));
          padding-bottom: max(var(--space-2), env(safe-area-inset-bottom, 0px));
          padding-left: max(var(--space-2), env(safe-area-inset-left, 0px));
          padding-right: max(var(--space-2), env(safe-area-inset-right, 0px));
          background-color: var(--bg-primary);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .player-overlay.theater {
          background-color: #000;
          overflow: hidden;
        }

        .player-shell {
          width: 100%;
          max-width: var(--content-max-width);
          padding: var(--space-2) var(--space-4) var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          container-type: inline-size;
          container-name: player-container;
        }

        .theater .player-shell {
          position: relative;
          z-index: 1;
          background-color: var(--bg-primary);
          border-radius: var(--radius-lg);
          padding: var(--space-2) var(--space-4) var(--space-4);
          box-shadow: 0 0 0 1px var(--border-subtle), var(--shadow-lg);
          height: calc(100dvh - var(--nav-height));
          max-width: 100%;
          overflow: hidden;
        }

        .player-shell:fullscreen,
        .player-shell:-webkit-full-screen {
          background-color: #000;
          padding: 0;
          max-width: none;
          border-radius: 0;
        }

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
          width: 38px;
          height: 38px;
          border-radius: var(--radius-full);
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .player-ctrl-btn:hover {
          background-color: var(--surface-2);
          color: var(--text-primary);
        }
        .player-ctrl-btn.is-active {
          color: var(--accent);
          background-color: var(--accent-subtle);
        }
        .player-close {
          color: var(--text-muted);
        }
        .player-close:hover {
          background-color: var(--error-subtle);
          color: var(--error);
        }

        .player-content {
          display: flex;
          gap: var(--space-4);
          align-items: flex-start;
        }

        .theater .player-content {
          flex: 1;
          min-height: 0;
          flex-direction: column;
        }

        .player-area {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .theater .player-area {
          flex: 1;
          min-height: 0;
          width: 100%;
        }

        .player-iframe-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background-color: #000;
          border-radius: var(--radius-md);
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .theater .player-iframe-wrap {
          width: 100%;
          max-height: calc(100dvh - var(--nav-height) - 48px);
          border-radius: 0;
        }

        .player-iframe-target {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .player-iframe-target :global(iframe) {
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
          background-color: var(--surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-family: inherit;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .player-panel-section {
          width: 340px;
          flex-shrink: 0;
        }

        .player-mobile-panel-toggle {
          display: none;
        }

        .player-saved-panel {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          max-height: calc(100dvh - var(--nav-height) - 60px);
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--border-subtle) transparent;
        }

        .panel-heading {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding-bottom: var(--space-2);
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }

        .panel-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          list-style: none;
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
          border: 1px solid transparent;
          color: var(--text-primary);
          transition: background-color var(--transition-fast), border-color var(--transition-fast);
          cursor: pointer;
        }
        .panel-item:hover {
          background-color: var(--surface-2);
        }
        .panel-item-active {
          background-color: var(--surface-2);
          border-color: var(--accent);
        }

        .panel-thumb-wrap {
          position: relative;
          width: 100px;
          aspect-ratio: 16 / 9;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background-color: var(--surface-2);
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
          background-color: rgba(255, 30, 64, 0.7);
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
          line-height: 1.35;
        }
        .panel-channel {
          font-size: 11px;
          color: var(--text-muted);
        }

        /* Responsive adjustments via Container Query */
        @container player-container (max-width: 800px) {
          .player-content {
            flex-direction: column;
          }
          .player-panel-section {
            width: 100%;
          }
          .player-mobile-panel-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: var(--space-3) var(--space-4);
            background-color: var(--surface-1);
            border-radius: var(--radius-md);
            color: var(--text-primary);
            font-size: var(--text-sm);
            font-weight: 600;
            margin-top: var(--space-2);
            cursor: pointer;
            border: 1px solid var(--border-subtle);
          }
          .toggle-chevron {
            display: flex;
            align-items: center;
            transition: transform 200ms ease;
          }
          .toggle-chevron.open {
            transform: rotate(180deg);
          }
          .player-saved-panel {
            display: none;
            width: 100%;
            max-height: 300px;
            background-color: var(--surface-1);
            border-radius: var(--radius-md);
            padding: var(--space-3);
            margin-top: var(--space-1);
            border: 1px solid var(--border-subtle);
          }
          .player-saved-panel.mobile-open {
            display: flex;
          }
          .panel-heading {
            display: none;
          }
          .panel-thumb-wrap {
            width: 80px;
          }
        }

        /* Short Viewports (Landscape Mobile, short windows) */
        @media (max-height: 520px) {
          .player-overlay {
            padding-top: max(4px, env(safe-area-inset-top, 0px));
            padding-bottom: max(4px, env(safe-area-inset-bottom, 0px));
          }
          .player-shell {
            padding: 0 var(--space-2) var(--space-2);
            gap: 2px;
          }
          .player-topbar {
            margin-bottom: 2px;
          }
          .player-ctrl-btn {
            width: 32px;
            height: 32px;
          }
          .player-shortcut-hint {
            display: none;
          }
          .theater .player-iframe-wrap {
            max-height: calc(100dvh - 38px);
          }
        }

        @media (hover: none) {
          .player-shortcut-hint {
            display: none;
          }
        }

        @media (pointer: coarse) {
          .player-ctrl-btn {
            min-width: 44px;
            min-height: 44px;
          }
          .player-mobile-panel-toggle {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
}
