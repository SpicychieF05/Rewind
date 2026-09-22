'use client';

import React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  tooltip?: string;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'surface' | 'accent' | 'danger';
}

export default function IconButton({
  'aria-label': ariaLabel,
  tooltip,
  active = false,
  size = 'md',
  variant = 'ghost',
  children,
  className = '',
  style,
  ...rest
}: IconButtonProps) {
  const sizeDims = {
    sm: { visual: 30, minTouch: 44 },
    md: { visual: 36, minTouch: 44 },
    lg: { visual: 42, minTouch: 44 },
  }[size];

  return (
    <button
      className={`btn-icon icon-btn-root ${active ? 'active' : ''} variant-${variant} ${className}`}
      aria-label={ariaLabel}
      title={tooltip || ariaLabel}
      style={{
        width: `${sizeDims.visual}px`,
        height: `${sizeDims.visual}px`,
        ...style,
      }}
      {...rest}
    >
      {children}

      <style jsx>{`
        .icon-btn-root {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-full);
          transition: background-color var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
          flex-shrink: 0;
          position: relative;
        }
        .variant-ghost {
          background-color: transparent;
          color: var(--text-secondary);
        }
        .variant-ghost:hover:not(:disabled) {
          background-color: var(--surface-2);
          color: var(--text-primary);
        }
        .variant-surface {
          background-color: var(--surface-2);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
        }
        .variant-surface:hover:not(:disabled) {
          background-color: var(--surface-3);
        }
        .variant-accent {
          background-color: var(--accent);
          color: #fff;
        }
        .variant-accent:hover:not(:disabled) {
          background-color: var(--accent-hover);
        }
        .variant-danger:hover:not(:disabled) {
          background-color: rgba(239, 68, 68, 0.15);
          color: var(--error);
        }
        .icon-btn-root.active {
          color: var(--accent);
        }
        .icon-btn-root:active:not(:disabled) {
          transform: scale(0.92);
        }

        @media (pointer: coarse) {
          .icon-btn-root {
            min-width: 44px;
            min-height: 44px;
          }
        }
      `}</style>
    </button>
  );
}
