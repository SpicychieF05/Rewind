'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import IconButton from './IconButton';
import Icon from './Icon';
import { useAvailableSpace } from '@/hooks/useAvailableSpace';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number | string;
  forceSheet?: boolean;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 540,
  forceSheet = false,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const space = useAvailableSpace();
  const isSheet = forceSheet || space.isCompactWidth || space.isCompactHeight;

  // Keyboard: close on Escape & focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Auto-focus first interactive element
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const first = modalRef.current.querySelector<HTMLElement>(
          'button:not(.modal-close-btn), input, select, textarea'
        );
        first?.focus();
      }
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
    >
      <div
        ref={modalRef}
        className={`modal-box ${isSheet ? 'sheet-box' : ''}`}
        style={{
          maxWidth: isSheet ? '100%' : typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
        }}
      >
        {isSheet && <div className="sheet-handle" aria-hidden="true" />}

        {title && (
          <div className="modal-header">
            <div className="modal-title-wrap">{title}</div>
            <IconButton
              aria-label="Close dialog"
              onClick={onClose}
              size="md"
              className="modal-close-btn"
            >
              <Icon as={X} size={18} anim="pop" />
            </IconButton>
          </div>
        )}

        <div className="modal-body">{children}</div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>

      <style jsx>{`
        .modal-title-wrap {
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
