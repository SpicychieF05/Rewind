'use client';

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
    <div className={`channel-badge ${isActive ? 'active' : ''}`}>
      <button
        id={`channel-badge-${channel.channel_id}`}
        className="channel-badge-inner"
        onClick={handleClick}
        aria-label={`Filter by ${channel.name}`}
        aria-pressed={isActive}
      >
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="badge-logo"
            width={48}
            height={48}
            loading="lazy"
          />
        ) : (
          <div className="badge-logo-placeholder" aria-hidden="true">
            {channel.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="badge-name truncate">{channel.name}</span>
        {channel.subscriber_count != null && (
          <span className="badge-subs">{formatSubs(channel.subscriber_count)}</span>
        )}
      </button>
      {onUnsave && (
        <button
          id={`unsave-channel-${channel.channel_id}`}
          className="badge-remove"
          onClick={handleUnsave}
          aria-label={`Remove ${channel.name} from saved channels`}
          title="Remove"
        >
          <XIcon />
        </button>
      )}

      <style jsx>{`
        .channel-badge {
          position: relative;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          overflow: hidden;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .channel-badge:hover {
          border-color: var(--text-muted);
        }
        .channel-badge.active {
          border-color: var(--text-primary);
          box-shadow: inset 0 0 0 1px var(--text-primary);
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
          transition: background-color var(--transition-fast);
        }
        .channel-badge-inner:hover { background-color: var(--bg-secondary); }
        .badge-logo {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
        }
        .badge-logo-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: var(--accent);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-lg);
          font-weight: 700;
          flex-shrink: 0;
        }
        .badge-name {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
          max-width: 100%;
          text-align: center;
        }
        .badge-subs {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .badge-remove {
          position: absolute;
          top: var(--space-1);
          right: var(--space-1);
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity var(--transition-fast), color var(--transition-fast);
          cursor: pointer;
          padding: 0;
        }
        .channel-badge:hover .badge-remove { opacity: 1; }
        .badge-remove:hover { color: var(--accent); }
      `}</style>
    </div>
  );
}

function formatSubs(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M subs`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K subs`;
  return `${n} subs`;
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
