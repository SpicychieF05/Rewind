'use client';

import React from 'react';
import Link from 'next/link';
import { Bookmark, LogIn } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Icon from './ui/Icon';

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
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={400}
    >
      <div className="signin-prompt-body">
        <div className="prompt-icon-wrap" aria-hidden="true">
          <Icon as={Bookmark} size={28} className="prompt-icon" />
        </div>

        <h2 id="signin-prompt-title" className="prompt-title">
          {title}
        </h2>
        <p className="prompt-desc">{description}</p>

        <div className="prompt-actions">
          <Link href="/auth/sign-in" className="w-full" onClick={onClose}>
            <Button
              id="signin-prompt-login-btn"
              tier="accent"
              fullWidth
              size="md"
              icon={<Icon as={LogIn} size={16} />}
            >
              Sign In / Sign Up
            </Button>
          </Link>
          <Button
            id="signin-prompt-cancel-btn"
            type="button"
            tier="ghost"
            fullWidth
            size="md"
            onClick={onClose}
          >
            Not now
          </Button>
        </div>
      </div>

      <style jsx>{`
        .signin-prompt-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--space-2) 0;
        }
        .prompt-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: var(--radius-full);
          background-color: var(--accent-subtle);
          color: var(--accent);
          margin-bottom: var(--space-3);
          box-shadow: 0 0 20px rgba(255, 30, 64, 0.2);
        }
        :global(.prompt-icon) {
          color: var(--accent);
        }
        .prompt-title {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--space-2);
          letter-spacing: -0.01em;
        }
        .prompt-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: var(--space-5);
          max-width: 320px;
        }
        .prompt-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          width: 100%;
        }
      `}</style>
    </Modal>
  );
}
