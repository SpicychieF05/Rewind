'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type IconAnimation =
  | 'pop'
  | 'wiggle'
  | 'nudge-x'
  | 'nudge-up'
  | 'spin-once'
  | 'shake'
  | 'swap'
  | 'tick'
  | 'flip'
  | 'bounce'
  | 'pulse'
  | 'none';

export interface IconProps {
  as: LucideIcon;
  size?: number;
  strokeWidth?: number;
  anim?: IconAnimation;
  className?: string;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean;
}

export default function Icon({
  as: LucideComponent,
  size = 18,
  strokeWidth = 1.75,
  anim,
  className = '',
  style,
  'aria-hidden': ariaHidden = true,
}: IconProps) {
  return (
    <span
      className={`icon-wrapper ${className}`}
      data-anim={anim && anim !== 'none' ? anim : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 0,
        flexShrink: 0,
        ...style,
      }}
      aria-hidden={ariaHidden}
    >
      <LucideComponent size={size} strokeWidth={strokeWidth} aria-hidden="true" />
    </span>
  );
}
