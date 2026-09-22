'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CircleCheck, CircleAlert, Info, X } from 'lucide-react';
import Icon from './Icon';
import IconButton from './IconButton';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, action?: { label: string; onClick: () => void }) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', action?: { label: string; onClick: () => void }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, message, type, action };

      setToasts((prev) => {
        const next = [newToast, ...prev].slice(0, 3); // Max 3 visible
        return next;
      });

      const timer = setTimeout(() => {
        dismissToast(id);
      }, 4000);
      timersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  const pauseToast = (id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  };

  const resumeToast = (id: string) => {
    if (!timersRef.current.has(id)) {
      const timer = setTimeout(() => dismissToast(id), 2500);
      timersRef.current.set(id, timer);
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}

      <div className="toast-portal" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const IconComp = toast.type === 'error' ? CircleAlert : toast.type === 'info' ? Info : CircleCheck;
          const iconColor =
            toast.type === 'error' ? 'var(--error)' : toast.type === 'info' ? 'var(--text-secondary)' : 'var(--success)';

          return (
            <div
              key={toast.id}
              className={`toast-item toast-${toast.type}`}
              role={toast.type === 'error' ? 'alert' : 'status'}
              onMouseEnter={() => pauseToast(toast.id)}
              onMouseLeave={() => resumeToast(toast.id)}
              onFocus={() => pauseToast(toast.id)}
              onBlur={() => resumeToast(toast.id)}
            >
              <span className="toast-icon" style={{ color: iconColor }}>
                <Icon as={IconComp} size={18} />
              </span>
              <span className="toast-message">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  className="toast-action-btn"
                  onClick={() => {
                    toast.action?.onClick();
                    dismissToast(toast.id);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <IconButton
                aria-label="Dismiss notification"
                size="sm"
                onClick={() => dismissToast(toast.id)}
                className="toast-close-btn"
              >
                <Icon as={X} size={14} />
              </IconButton>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .toast-portal {
          position: fixed;
          bottom: max(var(--space-4), var(--safe-bottom));
          left: max(var(--space-4), var(--safe-left));
          z-index: var(--z-toast);
          display: flex;
          flex-direction: column-reverse;
          gap: var(--space-2);
          pointer-events: none;
          max-width: min(440px, calc(100vw - var(--space-8)));
        }

        .toast-item {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          background-color: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg), var(--surface-highlight);
          color: var(--text-primary);
          font-size: var(--text-sm);
          animation: toastSlideUp 180ms var(--ease-standard);
        }

        .toast-message {
          flex: 1;
          line-height: 1.35;
          word-break: break-word;
        }

        .toast-action-btn {
          color: var(--accent);
          font-weight: 600;
          font-size: var(--text-xs);
          text-transform: uppercase;
          padding: var(--space-1) var(--space-2);
          border-radius: var(--radius-sm);
          white-space: nowrap;
        }
        .toast-action-btn:hover {
          text-decoration: underline;
        }

        :global(.toast-close-btn) {
          color: var(--text-muted) !important;
          margin-left: -4px;
        }
        :global(.toast-close-btn:hover) {
          color: var(--text-primary) !important;
        }

        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 640px) {
          .toast-portal {
            left: max(var(--space-3), var(--safe-left));
            right: max(var(--space-3), var(--safe-right));
            bottom: max(var(--space-3), var(--safe-bottom));
            max-width: 100%;
            align-items: center;
          }
          .toast-item {
            width: 100%;
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
