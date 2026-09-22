'use client';

import React from 'react';
import { Gauge, TriangleAlert, CircleAlert } from 'lucide-react';
import Icon from './ui/Icon';

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
        <Icon as={CircleAlert} size={18} />
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
        <Icon as={isWarning ? TriangleAlert : Gauge} size={16} />
        <span className="quota-text">
          <span className="quota-label">API Quota:</span>{' '}
          <strong className="tabular-nums">{quotaUsed.toLocaleString()}</strong> /{' '}
          <span className="tabular-nums">{dailyLimit.toLocaleString()}</span> units
          <span className="quota-remaining tabular-nums"> ({remaining.toLocaleString()} remaining)</span>
        </span>
      </div>

      {/* Scrub-bar accent with playhead dot (§3, §9.4) */}
      <div className="quota-track-wrap" aria-hidden="true">
        <div className="scrub-track">
          <div
            className={`scrub-fill ${isWarning ? 'warn' : ''}`}
            style={{ width: `${pct}%` }}
          >
            {pct > 4 && <span className="scrub-playhead" />}
          </div>
        </div>
      </div>

      <style jsx>{bannerStyles}</style>
    </div>
  );
}

const bannerStyles = `
  .quota-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--text-xs);
    margin-bottom: var(--space-3);
    border: 1px solid var(--border-subtle);
    flex-wrap: wrap;
    box-shadow: var(--surface-highlight);
  }
  .quota-ok {
    background-color: var(--surface-1);
    color: var(--text-secondary);
  }
  .quota-warning {
    background-color: rgba(245, 158, 11, 0.12);
    color: var(--warning);
    border-color: rgba(245, 158, 11, 0.3);
  }
  .quota-exceeded {
    background-color: rgba(239, 68, 68, 0.12);
    color: var(--error);
    border-color: rgba(239, 68, 68, 0.3);
  }
  .quota-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    flex: 1 1 220px;
    flex-wrap: wrap;
  }
  .quota-label {
    color: var(--text-muted);
  }
  .quota-remaining {
    color: var(--text-muted);
  }
  .quota-track-wrap {
    width: 96px;
    flex-shrink: 0;
  }
  .scrub-track {
    position: relative;
    width: 100%;
    height: 4px;
    background-color: var(--surface-3);
    border-radius: var(--radius-full);
  }
  .scrub-fill {
    position: relative;
    height: 100%;
    background-color: var(--accent);
    border-radius: var(--radius-full);
    transition: width 0.4s ease;
  }
  .scrub-fill.warn {
    background-color: var(--warning);
  }
  .scrub-playhead {
    position: absolute;
    right: -3px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #fff;
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.7);
  }
  .quota-text {
    line-height: 1.4;
    word-break: break-word;
  }
  .quota-text strong {
    color: var(--text-primary);
  }
`;
