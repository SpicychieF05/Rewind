'use client';

import { useState } from 'react';

export type MatchMode = 'exact' | 'contains';
export type Timeframe =
  | '1month' | '2months' | '3months' | '6months' | '12months'
  | '1year' | '2years' | '3years' | '4years' | '5years';

export interface SearchFormValues {
  channelInput: string;
  query: string;
  matchMode: MatchMode;
  timeframe: Timeframe;
}

interface Props {
  onSearch: (values: SearchFormValues) => void;
  loading: boolean;
  initialQuery?: string;
}

const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: '1month',  label: 'Last 1 month'  },
  { value: '2months', label: 'Last 2 months' },
  { value: '3months', label: 'Last 3 months' },
  { value: '6months', label: 'Last 6 months' },
  { value: '12months',label: 'Last 12 months'},
  { value: '1year',   label: 'Last 1 year'   },
  { value: '2years',  label: 'Last 2 years'  },
  { value: '3years',  label: 'Last 3 years'  },
  { value: '4years',  label: 'Last 4 years'  },
  { value: '5years',  label: 'Last 5 years'  },
];

export default function SearchForm({ onSearch, loading, initialQuery = '' }: Props) {
  const [channelInput, setChannelInput] = useState('');
  const [query, setQuery] = useState(initialQuery);
  const [matchMode, setMatchMode] = useState<MatchMode>('contains');
  const [timeframe, setTimeframe] = useState<Timeframe>('1year');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelInput.trim()) return;
    onSearch({ channelInput: channelInput.trim(), query: query.trim(), matchMode, timeframe });
  };

  return (
    <form
      id="search-form"
      onSubmit={handleSubmit}
      className="search-form"
      aria-label="Video search form"
      suppressHydrationWarning
    >
      {/* Channel input */}
      <div className="search-field" suppressHydrationWarning>
        <label htmlFor="channel-input" className="search-label">Channel</label>
        <input
          id="channel-input"
          type="text"
          className="input"
          placeholder="Channel handle, channel URL, or any video URL"
          value={channelInput}
          onChange={(e) => setChannelInput(e.target.value)}
          required
          aria-required="true"
          disabled={loading}
        />
      </div>

      {/* Keyword */}
      <div className="search-field" suppressHydrationWarning>
        <label htmlFor="keyword-input" className="search-label">Keyword</label>
        <input
          id="keyword-input"
          type="text"
          className="input"
          placeholder="Video title or keyword (optional)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Match mode */}
      <div className="search-field search-field-narrow" suppressHydrationWarning>
        <span className="search-label" id="match-mode-label">Match</span>
        <div
          className="match-toggle"
          role="group"
          aria-labelledby="match-mode-label"
          suppressHydrationWarning
        >
          <button
            type="button"
            id="match-contains"
            className={`match-btn ${matchMode === 'contains' ? 'active' : ''}`}
            onClick={() => setMatchMode('contains')}
            aria-pressed={matchMode === 'contains'}
            disabled={loading}
          >
            Contains
          </button>
          <button
            type="button"
            id="match-exact"
            className={`match-btn ${matchMode === 'exact' ? 'active' : ''}`}
            onClick={() => setMatchMode('exact')}
            aria-pressed={matchMode === 'exact'}
            disabled={loading}
          >
            Exact
          </button>
        </div>
      </div>

      {/* Timeframe */}
      <div className="search-field search-field-narrow" suppressHydrationWarning>
        <label htmlFor="timeframe-select" className="search-label">Timeframe</label>
        <select
          id="timeframe-select"
          className="input select"
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as Timeframe)}
          disabled={loading}
          aria-label="Select timeframe"
        >
          {TIMEFRAME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <div className="search-field search-field-submit" suppressHydrationWarning>
        <button
          id="search-submit-btn"
          type="submit"
          className="btn btn-primary search-submit"
          disabled={loading || !channelInput.trim()}
          aria-busy={loading}
        >
          {loading ? <><span className="spinner" aria-hidden="true" /> Searching…</> : 'Search'}
        </button>
      </div>

      <style jsx>{`
        .search-form {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
          align-items: flex-end;
          padding: var(--space-5) 0;
        }
        .search-field {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          flex: 1;
          min-width: 200px;
        }
        .search-field-narrow { flex: 0 0 auto; min-width: 140px; }
        .search-field-submit  { flex: 0 0 auto; min-width: unset; }
        .search-label {
          font-size: var(--text-xs);
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .match-toggle {
          display: flex;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          overflow: hidden;
          height: 38px;
        }
        .match-btn {
          flex: 1;
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          transition: background-color var(--transition-fast), color var(--transition-fast);
          padding: 0 var(--space-3);
        }
        .match-btn:hover { background-color: var(--bg-secondary); color: var(--text-primary); }
        .match-btn.active { background-color: var(--bg-secondary); color: var(--text-primary); }
        .match-btn:first-child { border-right: 1px solid var(--border); }
        .match-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .search-submit {
          height: 38px;
          padding: 0 var(--space-6);
          border-radius: var(--radius-sm);
          font-size: var(--text-sm);
          font-weight: 500;
        }
        .search-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 640px) {
          .search-form { flex-direction: column; }
          .search-field,
          .search-field-narrow,
          .search-field-submit { min-width: unset; width: 100%; flex: unset; }
          .search-submit { width: 100%; justify-content: center; }
        }
      `}</style>
    </form>
  );
}
