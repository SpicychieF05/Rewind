'use client';

import React from 'react';
import { ChevronDown, TriangleAlert } from 'lucide-react';
import Button from './ui/Button';
import Icon from './ui/Icon';

interface Props {
  nextPageToken: string | null;
  quotaNearLimit: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

export default function LoadMoreButton({
  nextPageToken,
  quotaNearLimit,
  loading,
  onLoadMore,
}: Props) {
  if (!nextPageToken && !quotaNearLimit) return null;

  if (quotaNearLimit && !nextPageToken) {
    return (
      <div id="load-more-quota-warning" className="load-more-area" role="alert">
        <p className="load-more-warning">
          <Icon as={TriangleAlert} size={16} />
          <span>API quota is nearly exhausted — loading more results is disabled to protect your daily limit. Try again after midnight PST.</span>
        </p>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div id="load-more-container" className="load-more-area">
      {quotaNearLimit && (
        <p className="load-more-warning">
          <Icon as={TriangleAlert} size={16} />
          <span>Quota is nearly exhausted. Each page load costs 100 API units.</span>
        </p>
      )}

      <Button
        id="load-more-btn"
        tier="secondary"
        size="md"
        onClick={onLoadMore}
        disabled={loading}
        loading={loading}
        icon={<Icon as={ChevronDown} size={16} anim="nudge-x" />}
        iconPosition="right"
        className="load-more-btn"
        aria-label="Load more video results"
      >
        {loading ? 'Loading…' : 'Load more results'}
      </Button>

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
    width: 100%;
  }
  :global(.load-more-btn) {
    width: min(100%, 280px) !important;
    height: 42px !important;
  }
  .load-more-warning {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--text-xs);
    color: var(--warning);
    text-align: center;
    max-width: min(100%, 500px);
    padding: var(--space-2) var(--space-3);
    background-color: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.25);
    border-radius: var(--radius-md);
  }
`;
