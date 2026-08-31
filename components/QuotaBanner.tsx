'use client';

interface Props {
  quotaUsed: number;
  dailyLimit?: number;
  exceeded?: boolean;
}

const DAILY_LIMIT = 10000;
const WARN_THRESHOLD = 0.85; // warn at 85%

export default function QuotaBanner({ quotaUsed, dailyLimit = DAILY_LIMIT, exceeded = false }: Props) {
  const pct = Math.min((quotaUsed / dailyLimit) * 100, 100);
  const isWarning = pct >= WARN_THRESHOLD * 100;
  const remaining = Math.max(dailyLimit - quotaUsed, 0);

  if (exceeded) {
    return (
      <div id="quota-banner" className="quota-banner quota-exceeded" role="alert" aria-live="assertive">
        <ExclamationIcon />
        <span className="quota-text">
          <strong>API quota exceeded.</strong> YouTube search is unavailable until midnight PST (quota resets daily).
        </span>
        <style jsx>{bannerStyles}</style>
      </div>
    );
  }

  return (
    <div
      id="quota-banner"
      className={`quota-banner ${isWarning ? 'quota-warning' : 'quota-ok'}`}
      role="status"
      aria-label={`API quota: ${quotaUsed} of ${dailyLimit} units used`}
    >
      <div className="quota-left">
        <QuotaIcon />
        <span className="quota-text">
          <span className="quota-label">API Quota:</span>{' '}
          <strong>{quotaUsed.toLocaleString()}</strong> / {dailyLimit.toLocaleString()} units
          <span className="quota-remaining"> ({remaining.toLocaleString()} remaining)</span>
        </span>
      </div>
      <div className="quota-bar-wrapper" aria-hidden="true">
        <div
          className={`quota-bar-fill ${isWarning ? 'warn' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <style jsx>{bannerStyles}</style>
    </div>
  );
}

const bannerStyles = `
  .quota-banner {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    margin-bottom: var(--space-3);
  }
  .quota-ok      { background-color: var(--bg-secondary); color: var(--text-secondary); }
  .quota-warning { background-color: rgba(245,158,11,0.12); color: var(--warning); border: 1px solid rgba(245,158,11,0.3); }
  .quota-exceeded{ background-color: rgba(239,68,68,0.12); color: var(--error); border: 1px solid rgba(239,68,68,0.3); }
  .quota-left { display: flex; align-items: center; gap: var(--space-2); flex: 1; }
  .quota-label { color: var(--text-muted); }
  .quota-remaining { color: var(--text-muted); }
  .quota-bar-wrapper {
    width: 80px;
    height: 4px;
    background-color: var(--border);
    border-radius: var(--radius-full);
    overflow: hidden;
    flex-shrink: 0;
  }
  .quota-bar-fill {
    height: 100%;
    background-color: var(--success);
    border-radius: var(--radius-full);
    transition: width 0.4s ease;
  }
  .quota-bar-fill.warn { background-color: var(--warning); }
  .quota-text strong { color: inherit; }

  @media (max-width: 640px) {
    .quota-remaining { display: none; }
    .quota-bar-wrapper { display: none; }
  }
`;

function QuotaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
