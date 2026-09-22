'use client';

import React from 'react';
import { X } from 'lucide-react';
import Icon from './Icon';

export interface ChipProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
  removeAriaLabel?: string;
  className?: string;
}

export default function Chip({
  label,
  icon,
  onRemove,
  onClick,
  active = false,
  removeAriaLabel = 'Remove filter',
  className = '',
}: ChipProps) {
  const isClickable = !!onClick;

  return (
    <div
      className={`chip-root ${active ? 'active' : ''} ${isClickable ? 'clickable' : ''} ${className}`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {icon && <span className="chip-icon">{icon}</span>}
      <span className="chip-label">{label}</span>
      {onRemove && (
        <button
          type="button"
          className="chip-remove-btn"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={removeAriaLabel}
        >
          <Icon as={X} size={12} />
        </button>
      )}

      <style jsx>{`
        .chip-root {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background-color: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          padding: 8px 14px;
          font-size: var(--text-xs);
          color: var(--text-secondary);
          transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
          user-select: none;
          max-width: 100%;
          line-height: 1.4;
        }
        .chip-root.clickable {
          cursor: pointer;
        }
        .chip-root.clickable:hover {
          background-color: var(--surface-3);
          border-color: var(--border-strong);
          color: var(--text-primary);
        }
        .chip-root.active {
          background-color: var(--surface-3);
          border-color: var(--accent);
          color: var(--text-primary);
        }
        .chip-icon {
          display: inline-flex;
          align-items: center;
        }
        .chip-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .chip-remove-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          color: var(--text-muted);
          transition: color var(--transition-fast), background-color var(--transition-fast);
          cursor: pointer;
          margin-right: -4px;
        }
        .chip-remove-btn:hover {
          color: var(--text-primary);
          background-color: var(--surface-4);
        }

        @media (pointer: coarse) {
          .chip-root {
            padding: 10px 16px;
          }
          .chip-remove-btn {
            width: 24px;
            height: 24px;
          }
        }
      `}</style>
    </div>
  );
}
