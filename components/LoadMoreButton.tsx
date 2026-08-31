'use client';

interface Props {
  nextPageToken: string | null;
  quotaNearLimit: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

export default function LoadMoreButton({ nextPageToken, quotaNearLimit, loading, onLoadMore }: Props) {
  if (!nextPageToken && !quotaNearLimit) return null;

  if (quotaNearLimit && !nextPageToken) {
    return (
      <div id="load-more-quota-warning" className="load-more-area" role="alert">
        <p className="load-more-warning">
          ⚠️ API quota is nearly exhausted — loading more results is disabled to protect your daily limit. Try again after midnight PST.
        </p>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div id="load-more-container" className="load-more-area">
      {quotaNearLimit && (
        <p className="load-more-warning">
          ⚠️ Quota is nearly exhausted. Each page load costs 100 API units.
        </p>
      )}
      <button
        id="load-more-btn"
        className="btn btn-ghost load-more-btn"
        onClick={onLoadMore}
        disabled={loading}
        aria-busy={loading}
        aria-label="Load more video results"
      >
        {loading ? (
          <><span className="spinner" aria-hidden="true" /> Loading…</>
        ) : (
          'Load more results'
        )}
      </button>
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .load-more-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-6) 0 var(--space-8);
  }
  .load-more-btn {
    min-width: 200px;
    justify-content: center;
  }
  .load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .load-more-warning {
    font-size: var(--text-sm);
    color: var(--warning);
    text-align: center;
    max-width: 500px;
  }

  @media (max-width: 640px) {
    .load-more-btn { width: 100%; }
  }
`;
