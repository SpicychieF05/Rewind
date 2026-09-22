'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, RotateCcw, Info, Pencil } from 'lucide-react';
import type { Timeline } from '@/lib/timeline';
import { formatTimeline } from '@/lib/timeline';
import TimelinePicker from './TimelinePicker';
import SegmentedControl from './ui/SegmentedControl';
import Button from './ui/Button';
import IconButton from './ui/IconButton';
import Icon from './ui/Icon';
import { useAvailableSpace } from '@/hooks/useAvailableSpace';

export type MatchMode = 'exact' | 'contains';

export interface SearchFormValues {
  channelInput: string;
  query: string;
  matchMode: MatchMode;
  timeline: Timeline;
}

export interface SearchFormPrefill {
  channelInput?: string;
  query?: string;
  matchMode?: MatchMode;
  timeline?: Timeline;
}

interface Props {
  onSearch: (values: SearchFormValues) => void;
  loading: boolean;
  initialQuery?: string;
  hasSearched?: boolean;
  prefill?: SearchFormPrefill | null;
}

export default function SearchForm({
  onSearch,
  loading,
  initialQuery = '',
  hasSearched = false,
  prefill,
}: Props) {
  const router = useRouter();
  const space = useAvailableSpace();

  const [channelInput, setChannelInput] = useState('');
  const [query, setQuery] = useState(initialQuery);
  const [matchMode, setMatchMode] = useState<MatchMode>('contains');
  const [timeline, setTimeline] = useState<Timeline | null>(null);

  // Validation feedback
  const [showValidationHint, setShowValidationHint] = useState(false);
  const [channelError, setChannelError] = useState(false);
  const [timelineError, setTimelineError] = useState(false);

  // Collapsed state on compact viewports after search
  const [isCollapsed, setIsCollapsed] = useState(false);

  const channelInputRef = useRef<HTMLInputElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);

  // Collapse automatically on compact screen after search succeeds
  useEffect(() => {
    if (hasSearched && (space.isCompactWidth || space.isCompactHeight)) {
      const timer = setTimeout(() => setIsCollapsed(true), 0);
      return () => clearTimeout(timer);
    }
  }, [hasSearched, space.isCompactWidth, space.isCompactHeight]);

  // Handle prefill updates (e.g. from Example chips or Recent searches)
  useEffect(() => {
    if (!prefill) return;
    const timer = setTimeout(() => {
      if (prefill.channelInput !== undefined) setChannelInput(prefill.channelInput);
      if (prefill.query !== undefined) setQuery(prefill.query);
      if (prefill.matchMode !== undefined) setMatchMode(prefill.matchMode);
      if (prefill.timeline !== undefined) setTimeline(prefill.timeline);
      setIsCollapsed(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [prefill]);

  const canSearch = channelInput.trim() !== '' && timeline !== null;
  const isDirty = channelInput.trim() !== '' || query.trim() !== '' || timeline !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!channelInput.trim()) {
      setChannelError(true);
      channelInputRef.current?.focus();
      return;
    }
    setChannelError(false);

    if (!timeline) {
      setTimelineError(true);
      setShowValidationHint(true);
      return;
    }
    setTimelineError(false);
    setShowValidationHint(false);

    onSearch({
      channelInput: channelInput.trim(),
      query: query.trim(),
      matchMode,
      timeline,
    });
  };

  const handleReset = () => {
    setChannelInput('');
    setQuery('');
    setMatchMode('contains');
    setTimeline(null);
    setChannelError(false);
    setTimelineError(false);
    setShowValidationHint(false);
    setIsCollapsed(false);
    router.push('/');
  };

  const handleEditSearch = () => {
    setIsCollapsed(false);
    setTimeout(() => channelInputRef.current?.focus(), 50);
  };

  // Summary bar collapsed view on compact screens (§9.2)
  if (isCollapsed && hasSearched) {
    return (
      <div className="search-summary-card">
        <div className="summary-info">
          <span className="summary-channel truncate">
            {channelInput.startsWith('@') ? channelInput : `@${channelInput}`}
          </span>
          {query.trim() && <span className="summary-query truncate">&ldquo;{query.trim()}&rdquo;</span>}
          {timeline && <span className="summary-timeline">{formatTimeline(timeline)}</span>}
        </div>

        <div className="summary-actions">
          <Button
            tier="secondary"
            size="sm"
            onClick={handleEditSearch}
            icon={<Icon as={Pencil} size={14} />}
            aria-label="Edit search parameters"
          >
            Edit
          </Button>
          <IconButton
            size="sm"
            onClick={handleReset}
            aria-label="Clear search and reset"
            tooltip="Reset search"
          >
            <Icon as={RotateCcw} size={14} anim="spin-once" />
          </IconButton>
        </div>

        <style jsx>{`
          .search-summary-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-2);
            padding: var(--space-2) var(--space-3);
            background-color: var(--surface-1);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-lg);
            box-shadow: var(--surface-highlight);
            margin-bottom: var(--space-3);
          }
          .summary-info {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            min-width: 0;
            flex: 1;
            font-size: var(--text-xs);
          }
          .summary-channel {
            font-weight: 600;
            color: var(--text-primary);
          }
          .summary-query {
            color: var(--text-secondary);
          }
          .summary-timeline {
            color: var(--accent);
            background-color: var(--accent-subtle);
            padding: 2px 6px;
            border-radius: var(--radius-sm);
            white-space: nowrap;
          }
          .summary-actions {
            display: flex;
            align-items: center;
            gap: var(--space-1);
            flex-shrink: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="search-form-card" suppressHydrationWarning>
      <form
        id="search-form"
        onSubmit={handleSubmit}
        className="search-form"
        aria-label="Video search form"
      >
        <div className="search-container-inner" suppressHydrationWarning>
          {/* Channel field (Required) */}
          <div className="search-col field-channel">
            <label htmlFor="channel-input" className="field-label">
              Channel <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <input
              ref={channelInputRef}
              id="channel-input"
              type="text"
              className={`input ${channelError ? 'input-error' : ''}`}
              placeholder="Channel handle (@mkbhd) or URL"
              value={channelInput}
              onChange={(e) => {
                setChannelInput(e.target.value);
                if (channelError) setChannelError(false);
              }}
              required
              aria-required="true"
              disabled={loading}
            />
          </div>

          {/* Keyword field (Optional) */}
          <div className="search-col field-keyword">
            <label htmlFor="keyword-input" className="field-label">
              Keyword
            </label>
            <input
              id="keyword-input"
              type="text"
              className="input"
              placeholder="Video title keyword (optional)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Match Mode Segmented Control */}
          <div className="search-col field-match">
            <span className="field-label" id="match-mode-label">
              Match
            </span>
            <SegmentedControl
              options={[
                { value: 'contains', label: 'Contains' },
                { value: 'exact', label: 'Exact' },
              ]}
              value={matchMode}
              onChange={(v) => setMatchMode(v)}
              aria-label="Match mode"
              disabled={loading}
              fullWidth
            />
          </div>

          {/* Timeline Picker (Required, No default) */}
          <div className="search-col field-timeline">
            <label htmlFor="timeline-picker" className="field-label">
              Timeline <span style={{ color: 'var(--accent)' }}>*</span>
            </label>
            <TimelinePicker
              id="timeline-picker"
              value={timeline}
              onChange={(tl) => {
                setTimeline(tl);
                if (timelineError) setTimelineError(false);
                if (showValidationHint) setShowValidationHint(false);
              }}
              disabled={loading}
              hasError={timelineError}
            />
          </div>

          {/* Submit & Reset actions */}
          <div className="search-col field-actions">
            <span className="field-label label-spacer" aria-hidden="true">
              &nbsp;
            </span>
            <div className="actions-cluster">
              <Button
                ref={searchBtnRef}
                type="submit"
                id="search-submit-btn"
                tier="accent"
                loading={loading}
                aria-disabled={!canSearch && !loading}
                icon={<Icon as={Search} size={16} anim="wiggle" />}
                className={`search-submit-btn ${!canSearch ? 'cta-disabled' : ''}`}
                pill={false}
              >
                {loading ? 'Searching…' : 'Search'}
              </Button>

              {isDirty && !loading && (
                <IconButton
                  type="button"
                  id="search-reset-btn"
                  onClick={handleReset}
                  aria-label="Reset search form"
                  tooltip="Clear all fields"
                  className="search-reset-btn"
                >
                  <Icon as={RotateCcw} size={16} anim="spin-once" />
                </IconButton>
              )}
            </div>
          </div>
        </div>

        {/* Validation hint / feedback when button is disabled or clicked without required values */}
        {(!canSearch || showValidationHint) && !loading && (
          <div className="search-hint" role="status">
            <Icon as={Info} size={14} />
            <span>
              {!channelInput.trim() && !timeline
                ? 'Add a channel and choose a timeline to search.'
                : !channelInput.trim()
                ? 'Enter a channel handle or URL to search.'
                : 'Select a timeline (Range or Date) to search.'}
            </span>
          </div>
        )}
      </form>

      <style jsx>{`
        .search-form-card {
          background-color: var(--surface-1);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          box-shadow: var(--surface-highlight);
          padding: var(--space-4);
          margin-bottom: var(--space-4);
          container-type: inline-size;
          container-name: search-container;
        }

        .search-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          width: 100%;
        }

        .search-container-inner {
          display: flex;
          gap: var(--space-3);
          align-items: flex-end;
          flex-wrap: wrap;
          width: 100%;
        }

        .search-col {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .field-channel {
          flex: 2 1 200px;
        }

        .field-keyword {
          flex: 2 1 180px;
        }

        .field-match {
          flex: 1 1 140px;
        }

        .field-timeline {
          flex: 2 1 180px;
        }

        .field-actions {
          flex: 1 1 130px;
        }

        .label-spacer {
          user-select: none;
        }

        .actions-cluster {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          width: 100%;
        }

        :global(.search-submit-btn) {
          flex: 1;
          border-radius: var(--radius-md) !important;
          height: var(--control-h);
        }

        :global(.search-submit-btn.cta-disabled) {
          background-color: rgba(255, 30, 64, 0.18) !important;
          border: 1px solid var(--accent) !important;
          color: var(--text-secondary) !important;
          opacity: 0.8 !important;
        }

        :global(.search-reset-btn) {
          border: 1px solid var(--border);
          border-radius: var(--radius-md) !important;
          height: var(--control-h);
          width: var(--control-h);
        }

        .input-error {
          border-color: var(--error) !important;
        }

        .search-hint {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-xs);
          color: var(--text-muted);
          padding-top: var(--space-1);
        }

        /* ── Container Queries on .search-form-card ── */
        @container search-container (max-width: 899px) {
          .field-channel {
            flex: 1 1 45%;
          }
          .field-keyword {
            flex: 1 1 45%;
          }
          .field-match {
            flex: 1 1 140px;
          }
          .field-timeline {
            flex: 1 1 180px;
          }
          .field-actions {
            flex: 1 1 140px;
          }
        }

        @container search-container (max-width: 599px) {
          .label-spacer {
            display: none;
          }
          .field-channel,
          .field-keyword,
          .field-match,
          .field-timeline,
          .field-actions {
            flex: 1 1 100%;
            width: 100%;
          }
          .actions-cluster {
            margin-top: var(--space-1);
          }
        }
      `}</style>
    </div>
  );
}
