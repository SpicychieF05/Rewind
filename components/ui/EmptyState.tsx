'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import Icon from './Icon';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  rewindBadge?: boolean;
  compact?: boolean;           // tighter vertical padding for hero/inline contexts
  className?: string;
  style?: React.CSSProperties;
  role?: string;
  'aria-live'?: 'polite' | 'assertive';
}

export default function EmptyState({
  icon: IconComponent,
  title,
  description,
  actions,
  rewindBadge = false,
  compact = false,
  className = '',
  style,
  role = 'status',
  'aria-live': ariaLive,
}: EmptyStateProps) {
  return (
    <div
      className={`empty-state-root ${compact ? 'compact' : ''} ${className}`}
      role={role}
      aria-live={ariaLive}
      style={style}
    >
      <div className="empty-icon-container">
        {IconComponent && <Icon as={IconComponent} size={36} />}
        {rewindBadge && (
          <div className="empty-rewind-motif" aria-hidden="true">
            <svg width="24" height="14" viewBox="0 0 32 22" fill="currentColor">
              <path d="M9.3 10.38C8.9 10.68 8.9 11.32 9.3 11.62L14.4 15.35C14.88 15.7 15.5 15.35 15.5 14.73V7.27C15.5 6.65 14.88 6.3 14.4 6.65L9.3 10.38Z" />
              <path d="M16.8 10.38C16.4 10.68 16.4 11.32 16.8 11.62L21.9 15.35C22.38 15.7 23 15.35 23 14.73V7.27C23 6.65 22.38 6.3 21.9 6.65L16.8 10.38Z" />
            </svg>
          </div>
        )}
      </div>

      <h2 className="empty-title">{title}</h2>
      {description && <p className="empty-desc">{description}</p>}
      {actions && <div className="empty-actions">{actions}</div>}

      <style jsx>{`
        .empty-state-root {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: clamp(var(--space-8), 6vw, var(--space-12)) var(--space-4);
          text-align: center;
          gap: var(--space-2);
          width: 100%;
        }
        .empty-state-root.compact {
          padding-top: var(--space-6);
          padding-bottom: var(--space-4);
        }
        .empty-icon-container {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: var(--radius-full);
          background-color: var(--surface-2);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          margin-bottom: var(--space-2);
        }
        .empty-rewind-motif {
          position: absolute;
          bottom: -4px;
          right: -4px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background-color: var(--accent);
          color: white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
        }
        .empty-title {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--text-primary);
        }
        .empty-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          max-width: 440px;
          line-height: 1.5;
        }
        .empty-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
          margin-top: var(--space-3);
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
}
