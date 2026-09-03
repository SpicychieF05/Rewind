'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function SignInPromptModal({
  isOpen,
  onClose,
  title = 'Sign in to save to your library',
  description = 'Sign in with your account to save videos and channels, build custom playlists, and access your personal library from any device.',
}: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="signin-prompt-overlay"
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-prompt-title"
    >
      <div className="modal-box signin-prompt-box">
        <div className="modal-header">
          <div className="prompt-icon-wrap">
            <BookmarkIcon />
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <XIcon />
          </button>
        </div>

        <div className="modal-body">
          <h2 id="signin-prompt-title" className="prompt-title">
            {title}
          </h2>
          <p className="prompt-desc">{description}</p>

          <div className="prompt-actions">
            <Link
              href="/auth/sign-in"
              className="btn btn-primary w-full"
              onClick={onClose}
              id="signin-prompt-login-btn"
            >
              Sign In / Sign Up
            </Link>
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={onClose}
              id="signin-prompt-cancel-btn"
            >
              Not now
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .signin-prompt-box {
          max-width: 400px;
          text-align: center;
          padding: var(--space-6) var(--space-5);
        }
        .prompt-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: var(--radius-full);
          background-color: rgba(255, 30, 64, 0.15);
          color: #ff1e40;
          margin: 0 auto var(--space-3);
        }
        .prompt-title {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--space-2);
        }
        .prompt-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: var(--space-6);
        }
        .prompt-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
      `}</style>
    </div>
  );
}

function BookmarkIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
