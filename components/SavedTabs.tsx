'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Users, Film, ListVideo } from 'lucide-react';
import Icon from './ui/Icon';

export type SavedTab = 'channels' | 'videos' | 'playlists';

interface Props {
  activeTab: SavedTab;
  onTabChange: (tab: SavedTab) => void;
  counts?: {
    channels?: number;
    videos?: number;
    playlists?: number;
  };
}

const TABS: { id: SavedTab; label: string; icon: typeof Users }[] = [
  { id: 'channels',  label: 'Channels',  icon: Users },
  { id: 'videos',    label: 'Videos',    icon: Film },
  { id: 'playlists', label: 'Playlists', icon: ListVideo },
];

export default function SavedTabs({ activeTab, onTabChange, counts }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const updateIndicator = React.useCallback(() => {
    if (!containerRef.current) return;
    const activeEl = containerRef.current.querySelector<HTMLButtonElement>(`#tab-${activeTab}`);
    if (activeEl) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const tabRect = activeEl.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [activeTab]);

  useEffect(() => {
    updateIndicator();
    // Update on resize
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % TABS.length;
      onTabChange(TABS[nextIndex].id);
      const nextBtn = containerRef.current?.querySelector<HTMLButtonElement>(`#tab-${TABS[nextIndex].id}`);
      nextBtn?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + TABS.length) % TABS.length;
      onTabChange(TABS[prevIndex].id);
      const prevBtn = containerRef.current?.querySelector<HTMLButtonElement>(`#tab-${TABS[prevIndex].id}`);
      prevBtn?.focus();
    }
  };

  return (
    <div className="saved-tabs-wrapper">
      <nav
        ref={containerRef}
        className="saved-tabs-nav"
        role="tablist"
        aria-label="Saved library sections"
      >
        {TABS.map((tab, idx) => {
          const isActive = activeTab === tab.id;
          const count = counts?.[tab.id];

          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              type="button"
              tabIndex={isActive ? 0 : -1}
              className={`saved-tab-btn ${isActive ? 'is-active' : ''}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              <Icon
                as={tab.icon}
                size={18}
                anim={tab.id === 'videos' ? 'pulse' : tab.id === 'playlists' ? 'bounce' : undefined}
                className="saved-tab-icon"
              />
              <span className="saved-tab-label">{tab.label}</span>
              {typeof count === 'number' && (
                <span className={`saved-tab-count ${isActive ? 'is-active-count' : ''}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Sliding accent underline indicator */}
        <span
          className="saved-tabs-indicator"
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
          }}
          aria-hidden="true"
        />
      </nav>

      <style jsx>{`
        .saved-tabs-wrapper {
          width: 100%;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: var(--space-4);
          overflow-x: auto;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        .saved-tabs-wrapper::-webkit-scrollbar {
          display: none;
        }
        .saved-tabs-nav {
          display: inline-flex;
          align-items: center;
          position: relative;
          min-width: 100%;
          gap: var(--space-1);
        }
        .saved-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: var(--text-sm);
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          border-radius: var(--radius-md) var(--radius-md) 0 0;
          transition: color var(--transition-fast), background-color var(--transition-fast);
          min-height: 44px;
        }
        .saved-tab-btn:hover {
          color: var(--text-primary);
          background-color: var(--surface-1);
        }
        .saved-tab-btn.is-active {
          color: var(--text-primary);
          font-weight: 600;
        }
        :global(.saved-tab-icon) {
          color: inherit;
        }
        .saved-tab-btn.is-active :global(.saved-tab-icon) {
          color: var(--accent);
        }
        .saved-tab-count {
          font-size: 11px;
          font-weight: 600;
          padding: 1px 7px;
          border-radius: var(--radius-full);
          background-color: var(--surface-2);
          color: var(--text-secondary);
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        .saved-tab-count.is-active-count {
          background-color: var(--accent-subtle);
          color: var(--accent);
        }
        .saved-tabs-indicator {
          position: absolute;
          bottom: 0;
          height: 2px;
          background-color: var(--accent);
          transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1), width 240ms cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: none;
          border-radius: 2px 2px 0 0;
        }

        @media (max-width: 480px) {
          .saved-tab-btn {
            padding: var(--space-2) var(--space-3);
            font-size: var(--text-xs);
          }
        }
      `}</style>
    </div>
  );
}
