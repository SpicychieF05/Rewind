'use client';

import React, { useRef, useEffect, useState } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  'aria-label'?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
  disabled?: boolean;
  'aria-label'?: string;
  size?: 'sm' | 'md';
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fullWidth = true,
  disabled = false,
  'aria-label': ariaLabel,
  size = 'md',
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const activeIndex = options.findIndex((o) => o.value === value);
    if (activeIndex === -1) return;
    const activeEl = containerRef.current.children[activeIndex + 1] as HTMLElement | undefined;
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
      });
    }
  }, [value, options]);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (disabled) return;
    let nextIndex = currentIndex;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    }
    if (nextIndex !== currentIndex) {
      onChange(options[nextIndex].value);
      const nextEl = containerRef.current?.children[nextIndex + 1] as HTMLElement | undefined;
      nextEl?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`segmented-control size-${size} ${fullWidth ? 'full-width' : ''} ${disabled ? 'disabled' : ''}`}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {/* Sliding Active Indicator */}
      <div
        className="segment-indicator"
        aria-hidden="true"
        style={{
          transform: `translateX(${indicatorStyle.left}px)`,
          width: `${indicatorStyle.width}px`,
        }}
      />

      {options.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option['aria-label']}
            tabIndex={isSelected ? 0 : -1}
            disabled={disabled}
            className={`segment-button ${isSelected ? 'selected' : ''}`}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {option.icon && <span className="segment-icon">{option.icon}</span>}
            <span className="segment-label">{option.label}</span>
          </button>
        );
      })}

      <style jsx>{`
        .segmented-control {
          position: relative;
          display: inline-flex;
          align-items: center;
          background-color: var(--surface-2);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 3px;
          user-select: none;
          gap: 2px;
          height: var(--control-h);
        }
        .segmented-control.full-width {
          display: flex;
          width: 100%;
        }
        .size-sm {
          height: 34px;
          padding: 2px;
        }
        .segment-indicator {
          position: absolute;
          top: 3px;
          bottom: 3px;
          left: 0;
          background-color: var(--surface-4);
          border-radius: calc(var(--radius-md) - 2px);
          transition: transform 180ms var(--ease-standard), width 180ms var(--ease-standard);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), var(--surface-highlight);
          pointer-events: none;
          z-index: 1;
        }
        .size-sm .segment-indicator {
          top: 2px;
          bottom: 2px;
        }
        .segment-button {
          position: relative;
          z-index: 2;
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          height: 100%;
          padding: 0 var(--space-3);
          border-radius: calc(var(--radius-md) - 2px);
          background: transparent;
          color: var(--text-secondary);
          font-size: var(--text-sm);
          font-weight: 500;
          transition: color var(--transition-fast);
          white-space: nowrap;
          cursor: pointer;
        }
        .segment-button:hover:not(:disabled) {
          color: var(--text-primary);
        }
        .segment-button.selected {
          color: var(--text-primary);
          font-weight: 600;
        }
        .segment-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .segment-icon {
          display: inline-flex;
          align-items: center;
        }
      `}</style>
    </div>
  );
}
