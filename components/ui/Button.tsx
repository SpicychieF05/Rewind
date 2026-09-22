'use client';

import React, { forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import Icon from './Icon';

export type ButtonTier = 'accent' | 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-filled';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tier?: ButtonTier;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  pill?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    tier = 'secondary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    pill = true,
    fullWidth = false,
    disabled,
    children,
    className = '',
    style,
    ...rest
  },
  ref
) {
  const tierClass = {
    accent: 'btn-accent',
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-secondary',       // ghost merged into secondary — same visual intent
    danger: 'btn-danger',
    'danger-filled': 'btn-danger-filled',
  }[tier];

  const sizeStyle: React.CSSProperties = {
    xs: { height: '28px', fontSize: '11px', padding: '0 var(--space-2)' },
    sm: { height: '32px', fontSize: 'var(--text-xs)', padding: '0 var(--space-3)' },
    md: { height: 'var(--control-h)', fontSize: 'var(--text-sm)', padding: '0 var(--space-4)' },
    lg: { height: '48px', fontSize: 'var(--text-base)', padding: '0 var(--space-6)' },
  }[size];

  const radiusStyle: React.CSSProperties = {
    borderRadius: pill ? 'var(--radius-full)' : 'var(--radius-md)',
    width: fullWidth ? '100%' : undefined,
  };

  return (
    <button
      ref={ref}
      className={`btn ${tierClass} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      style={{
        ...sizeStyle,
        ...radiusStyle,
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true">
          <Icon as={LoaderCircle} size={size === 'xs' || size === 'sm' ? 14 : 16} className="spinner-icon" />
        </span>
      ) : (
        iconPosition === 'left' && icon && <span className="btn-icon-left">{icon}</span>
      )}
      <span className="btn-label">{children}</span>
      {!loading && iconPosition === 'right' && icon && (
        <span className="btn-icon-right">{icon}</span>
      )}

      <style jsx>{`
        .btn-spinner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          animation: spin 0.7s linear infinite;
        }
        .btn-icon-left, .btn-icon-right {
          display: inline-flex;
          align-items: center;
        }
      `}</style>
    </button>
  );
});

export default Button;
