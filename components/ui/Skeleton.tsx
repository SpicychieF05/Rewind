'use client';

import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 'var(--radius-sm)',
  className = '',
  style,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      aria-hidden="true"
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
        ...style,
      }}
    />
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-thumb" />
      <div className="skeleton-info">
        <div className="skeleton skeleton-avatar" />
        <div className="skeleton-lines">
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      </div>
    </div>
  );
}

export function ChannelHeaderSkeleton() {
  return (
    <div className="channel-skeleton-header" aria-hidden="true">
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div className="skeleton" style={{ width: 140, height: 18 }} />
        <div className="skeleton" style={{ width: 90, height: 13 }} />
      </div>
      <style jsx>{`
        .channel-skeleton-header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-4) 0;
          border-bottom: 1px solid var(--border-subtle);
          margin-bottom: var(--space-2);
        }
      `}</style>
    </div>
  );
}
