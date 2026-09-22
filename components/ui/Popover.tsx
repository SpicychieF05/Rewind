'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAvailableSpace } from '@/hooks/useAvailableSpace';
import Modal from './Modal';

export interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  title?: React.ReactNode;
  width?: number | string;
  maxHeight?: number | string;
  align?: 'start' | 'center' | 'end';
}

export default function Popover({
  isOpen,
  onClose,
  triggerRef,
  children,
  title,
  width = 360,
  maxHeight = 480,
  align = 'start',
}: PopoverProps) {
  const space = useAvailableSpace();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'bottom' | 'top' }>({
    top: 0,
    left: 0,
    placement: 'bottom',
  });

  const isSheet = space.isCompactWidth || space.isCompactHeight;

  // Calculate position when opening or scrolling
  useEffect(() => {
    if (!isOpen || isSheet) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const popoverWidth = typeof width === 'number' ? width : 360;
      const popoverHeight = typeof maxHeight === 'number' ? maxHeight : 400;

      // Vertical placement
      const spaceBelow = window.innerHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const placement: 'bottom' | 'top' = spaceBelow >= 260 || spaceBelow >= spaceAbove ? 'bottom' : 'top';

      const top = placement === 'bottom' ? rect.bottom + 6 : Math.max(12, rect.top - popoverHeight - 6);

      // Horizontal placement
      let left = rect.left;
      if (align === 'end') {
        left = rect.right - popoverWidth;
      } else if (align === 'center') {
        left = rect.left + (rect.width - popoverWidth) / 2;
      }

      // Clamp within safe viewport
      const maxLeft = window.innerWidth - popoverWidth - 12;
      const clampedLeft = Math.max(12, Math.min(left, maxLeft));

      setCoords({ top, left: clampedLeft, placement });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, isSheet, triggerRef, width, maxHeight, align]);

  // Click outside & Escape handler
  useEffect(() => {
    if (!isOpen || isSheet) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSheet, triggerRef, onClose]);

  if (!isOpen) return null;

  // Small viewport: render as Bottom Sheet
  if (isSheet) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={title} forceSheet>
        {children}
      </Modal>
    );
  }

  return (
    <div
      ref={popoverRef}
      className={`popover-container placement-${coords.placement}`}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: typeof width === 'number' ? `${width}px` : width,
        maxHeight: `min(${typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight}, calc(100dvh - ${coords.top + 16}px))`,
        zIndex: 'var(--z-popover)' as unknown as number,
      }}
      role="dialog"
      aria-modal="false"
    >
      <div className="popover-content">{children}</div>

      <style jsx>{`
        .popover-container {
          background-color: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg), var(--surface-highlight);
          overflow-y: auto;
          overscroll-behavior: contain;
          animation: popoverFadeIn 160ms var(--ease-standard);
        }
        @keyframes popoverFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .popover-content {
          width: 100%;
          height: 100%;
        }
      `}</style>
    </div>
  );
}
