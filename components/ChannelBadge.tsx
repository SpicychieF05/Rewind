'use client';

import React from 'react';
import { X } from 'lucide-react';
import Icon from './ui/Icon';

interface SavedChannel {
  channel_id: string;
  name: string;
  logo: string | null;
  subscriber_count: number | null;
}

interface Props {
  channel: SavedChannel;
  isActive?: boolean;
  onSelect?: (channelId: string) => void;
  onUnsave?: (channelId: string) => Promise<void>;
}

export default function ChannelBadge({ channel, isActive = false, onSelect, onUnsave }: Props) {
  const handleClick = () => onSelect?.(channel.channel_id);
  const handleUnsave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onUnsave?.(channel.channel_id);
  };

  return (
    <div className={`channel-badge-card ${isActive ? 'is-active' : ''}`}>
      <button
        id={`channel-badge-${channel.channel_id}`}
        type="button"
        className="channel-badge-inner"
        onClick={handleClick}
        aria-label={`Filter by ${channel.name}`}
        aria-pressed={isActive}
      >
        <div className="badge-avatar-wrap">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="badge-logo"
              width={52}
              height={52}
              loading="lazy"
            />
          ) : (
            <div className="badge-logo-placeholder" aria-hidden="true">
              {channel.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span className="badge-name truncate">{channel.name}</span>
        {channel.subscriber_count != null && (
          <span className="badge-subs tabular-nums">{formatSubs(channel.subscriber_count)}</span>
        )}
      </button>

      {onUnsave && (
        <button
          id={`unsave-channel-${channel.channel_id}`}
          type="button"
          className="badge-remove-btn"
          onClick={handleUnsave}
          aria-label={`Remove ${channel.name} from saved channels`}
          title={`Remove ${channel.name}`}
        >
          <Icon as={X} size={14} />
        </button>
      )}

      <style jsx>{`
        .channel-badge-card {
          position: relative;
          border-radius: var(--radius-lg);
          background-color: var(--surface-1);
          border: 1px solid var(--border-subtle);
          overflow: hidden;
          transition: border-color var(--transition-fast), background-color var(--transition-fast), transform var(--transition-fast), box-shadow var(--transition-fast);
        }
        .channel-badge-card:hover {
          border-color: var(--border);
          background-color: var(--surface-2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .channel-badge-card.is-active {
          border-color: var(--accent);
          background-color: var(--surface-2);
          box-shadow: 0 0 0 1px var(--accent), 0 4px 12px rgba(255, 30, 64, 0.15);
        }
        .channel-badge-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-4) var(--space-3);
          width: 100%;
          cursor: pointer;
          background: transparent;
          border: none;
          color: inherit;
        }
        .badge-avatar-wrap {
          position: relative;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          padding: 2px;
          background: var(--surface-3);
        }
        .channel-badge-card.is-active .badge-avatar-wrap {
          background: var(--accent);
        }
        .badge-logo {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          display: block;
        }
        .badge-logo-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: var(--accent-subtle);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-lg);
          font-weight: 700;
        }
        .badge-name {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
          max-width: 100%;
          text-align: center;
          line-height: 1.3;
        }
        .badge-subs {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .badge-remove-btn {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: var(--surface-3);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity var(--transition-fast), color var(--transition-fast), background-color var(--transition-fast), transform var(--transition-fast);
          cursor: pointer;
          padding: 0;
          z-index: 2;
        }
        .channel-badge-card:hover .badge-remove-btn,
        .channel-badge-card:focus-within .badge-remove-btn {
          opacity: 1;
        }
        .badge-remove-btn:hover {
          color: #fff;
          background-color: var(--accent);
          border-color: var(--accent);
          transform: scale(1.08);
        }

        /* Coarse pointer (touch) adjustments */
        @media (hover: none) or (pointer: coarse) {
          .badge-remove-btn {
            opacity: 0.9;
            width: 36px;
            height: 36px;
            top: 4px;
            right: 4px;
            background-color: rgba(30, 30, 30, 0.9);
          }
          .badge-remove-btn:active {
            opacity: 1;
            background-color: var(--accent);
            color: #fff;
          }
        }
      `}</style>
    </div>
  );
}

function formatSubs(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M subs`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K subs`;
  return `${n} subs`;
}
