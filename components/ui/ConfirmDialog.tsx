'use client';

import React, { useRef, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import Icon from './Icon';
import { Trash2 } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
}: ConfirmDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => cancelBtnRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        maxWidth={420}
        footer={
          <div className="confirm-footer">
            <Button
              ref={cancelBtnRef}
              tier="ghost"
              onClick={onClose}
              disabled={loading}
              className="confirm-btn"
            >
              {cancelLabel}
            </Button>
            <Button
              tier="danger-filled"
              onClick={handleConfirm}
              loading={loading}
              icon={<Icon as={Trash2} size={16} anim="shake" />}
              className="confirm-btn"
            >
              {confirmLabel}
            </Button>
          </div>
        }
      >
        <p className="confirm-desc">{description}</p>
      </Modal>

      <style jsx global>{`
        .confirm-footer {
          display: flex;
          gap: var(--space-2);
          width: 100%;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .confirm-btn {
          min-width: 90px;
        }
        .confirm-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          line-height: 1.5;
        }
      `}</style>
    </>
  );
}
