'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import type { VideoResult } from '@/lib/youtube';
import { authClient } from '@/lib/auth/client';

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();

  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const mobileSearchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target as Node) &&
        mobileSearchBoxRef.current &&
        !mobileSearchBoxRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for saved videos by title
  useEffect(() => {
    const trimmed = navQuery.trim();
    if (!trimmed) {
      const timer = setTimeout(() => {
        setResults([]);
        setIsSearching(false);
        setHasSearched(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    // If user is not signed in, do not query /api/videos (which requires session)
    if (!session?.user) {
      const timer = setTimeout(() => {
        setResults([]);
        setIsSearching(false);
        setHasSearched(true);
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/videos?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
        setHasSearched(true);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [navQuery, session]);

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = navQuery.trim();
    if (query) {
      setDropdownOpen(false);
      setSearchOpen(false);
      router.push(`/saved?q=${encodeURIComponent(query)}`);
    }
  };

  const handleGoToChannelSearch = () => {
    const query = navQuery.trim();
    setDropdownOpen(false);
    setSearchOpen(false);
    if (query) {
      router.push(`/?q=${encodeURIComponent(query)}`);
    } else {
      router.push('/');
    }
  };

  const renderDropdownContent = () => {
    if (!session?.user) {
      return (
        <div className="nav-dropdown-empty" role="status">
          <div className="empty-icon-wrap">
            <BookmarkIcon />
          </div>
          <p className="empty-title">Sign in to search saved videos</p>
          <p className="empty-desc">
            Your saved library and playlists are private to your account. Sign in to view and search your saved videos.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link
              href="/auth/sign-in"
              className="btn btn-primary btn-sm empty-action-btn"
              onClick={() => { setDropdownOpen(false); setSearchOpen(false); }}
            >
              Sign In
            </Link>
            <button
              type="button"
              className="btn btn-secondary btn-sm empty-action-btn"
              onClick={handleGoToChannelSearch}
            >
              Search Channel on Home
            </button>
          </div>
        </div>
      );
    }

    if (isSearching) {
      return (
        <div className="nav-dropdown-loading">
          <span className="spinner" aria-hidden="true" />
          <span>Searching saved videos…</span>
        </div>
      );
    }

    if (hasSearched && results.length === 0) {
      return (
        <div className="nav-dropdown-empty" role="status">
          <div className="empty-icon-wrap">
            <BookmarkIcon />
          </div>
          <p className="empty-title">No saved videos found</p>
          <p className="empty-desc">
            No saved videos match <strong className="query-highlight">&ldquo;{navQuery.trim()}&rdquo;</strong>. Search a channel&apos;s videos on the home page first to find and save them!
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm empty-action-btn"
            onClick={handleGoToChannelSearch}
          >
            <SearchIcon />
            <span>Search Channel Videos on Home</span>
          </button>
        </div>
      );
    }

    if (results.length > 0) {
      return (
        <div className="nav-dropdown-results">
          <div className="dropdown-header">
            <span className="dropdown-title">Saved Videos ({results.length})</span>
            <Link
              href={`/saved?q=${encodeURIComponent(navQuery.trim())}`}
              onClick={() => setDropdownOpen(false)}
              className="dropdown-view-all-link"
            >
              View in Saved
            </Link>
          </div>
          <ul className="dropdown-list">
            {results.slice(0, 5).map((vid) => (
              <li key={vid.videoId}>
                <Link
                  href={`/saved?q=${encodeURIComponent(navQuery.trim())}`}
                  className="dropdown-item"
                  onClick={() => { setDropdownOpen(false); setSearchOpen(false); }}
                  aria-label={`View "${vid.title}" in Saved library`}
                >
                  <div className="dropdown-thumb-wrap">
                    {vid.thumbnail ? (
                      <img
                        src={vid.thumbnail}
                        alt={vid.title}
                        className="dropdown-thumb"
                        width={56}
                        height={32}
                      />
                    ) : (
                      <div className="dropdown-thumb-placeholder">▶</div>
                    )}
                  </div>
                  <div className="dropdown-item-info">
                    <span className="dropdown-item-title line-clamp-2">{vid.title}</span>
                    <span className="dropdown-item-channel">{vid.channelName || 'YouTube'}</span>
                  </div>
                  <span className="dropdown-go-icon" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
          {results.length > 5 && (
            <div className="dropdown-footer">
              <Link
                href={`/saved?q=${encodeURIComponent(navQuery.trim())}`}
                onClick={() => setDropdownOpen(false)}
                className="dropdown-footer-btn"
              >
                View all {results.length} saved results →
              </Link>
            </div>
          )}
        </div>

      );
    }

    return null;
  };

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbar-inner" suppressHydrationWarning>

          {/* Left: Logo */}
          <Link href="/" className="navbar-logo" aria-label="Rewind home">
            <svg
              className="navbar-logo-icon"
              width="32"
              height="22"
              viewBox="0 0 32 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="rewindBadgeGrad" x1="0" y1="0" x2="32" y2="22" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FF1E40" />
                  <stop offset="1" stopColor="#D90026" />
                </linearGradient>
              </defs>
              <rect width="32" height="22" rx="6" fill="url(#rewindBadgeGrad)" />
              <rect
                x="0.5"
                y="0.5"
                width="31"
                height="21"
                rx="5.5"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1"
                fill="none"
              />
              {/* Rewind double triangles pointing left */}
              <path
                d="M9.3 10.38C8.9 10.68 8.9 11.32 9.3 11.62L14.4 15.35C14.88 15.7 15.5 15.35 15.5 14.73V7.27C15.5 6.65 14.88 6.3 14.4 6.65L9.3 10.38Z"
                fill="white"
              />
              <path
                d="M16.8 10.38C16.4 10.68 16.4 11.32 16.8 11.62L21.9 15.35C22.38 15.7 23 15.35 23 14.73V7.27C23 6.65 22.38 6.3 21.9 6.65L16.8 10.38Z"
                fill="white"
              />
            </svg>
            <span className="navbar-logo-text">Rewind</span>
          </Link>

          {/* Centre: Search bar for saved videos */}
          <div
            ref={searchBoxRef}
            className={`navbar-search-container ${searchOpen ? 'search-open' : ''}`}
            suppressHydrationWarning
          >
            <form
              className="navbar-search-form"
              onSubmit={handleNavSearch}
              role="search"
              aria-label="Search saved videos"
            >
              <div className="navbar-search-box" suppressHydrationWarning>
                <input
                  ref={inputRef}
                  id="nav-search-input"
                  type="search"
                  className="navbar-search-input"
                  placeholder="Search saved videos by title…"
                  value={navQuery}
                  onChange={(e) => {
                    setNavQuery(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => {
                    if (navQuery.trim()) setDropdownOpen(true);
                  }}
                  aria-label="Search saved videos"
                />
                {navQuery && (
                  <button
                    type="button"
                    className="navbar-search-clear-btn"
                    onClick={() => {
                      setNavQuery('');
                      setDropdownOpen(false);
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear search input"
                  >
                    <CloseIconSmall />
                  </button>
                )}
                <button
                  type="submit"
                  className="navbar-search-btn"
                  aria-label="Search saved videos"
                  title="Search saved videos"
                >
                  <SearchIcon />
                </button>
              </div>
            </form>

            {/* Desktop Autocomplete Dropdown */}
            {dropdownOpen && navQuery.trim() && (
              <div className="nav-dropdown-menu" role="dialog" aria-label="Saved video search results">
                {renderDropdownContent()}
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="navbar-actions" suppressHydrationWarning>
            {/* Mobile: search icon */}
            <button
              id="nav-search-toggle"
              className="btn-icon navbar-mobile-search"
              onClick={() => {
                setSearchOpen((v) => !v);
                setDropdownOpen(true);
              }}
              aria-label="Open search"
              aria-expanded={searchOpen}
            >
              <SearchIcon />
            </button>

            {/* Saved link */}
            <Link
              href="/saved"
              id="nav-saved-btn"
              className={`btn btn-secondary navbar-saved-btn ${pathname === '/saved' ? 'active' : ''}`}
              aria-current={pathname === '/saved' ? 'page' : undefined}
            >
              <BookmarkIcon />
              <span>Saved</span>
            </Link>

            {/* Auth Session Controls */}
            {isAuthPending ? (
              <div className="navbar-auth-skeleton" aria-hidden="true" />
            ) : !session?.user ? (
              <Link
                href="/auth/sign-in"
                id="nav-signin-btn"
                className="btn btn-primary navbar-signin-btn"
              >
                Sign In
              </Link>
            ) : (
              <div className="navbar-user-menu">
                <div
                  className="navbar-user-avatar"
                  title={session.user.name || session.user.email || 'Account'}
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User avatar'}
                      className="navbar-avatar-img"
                      width={32}
                      height={32}
                    />
                  ) : (
                    <span>{((session.user.name || session.user.email || 'U')[0]).toUpperCase()}</span>
                  )}
                </div>
                <button
                  type="button"
                  id="nav-signout-btn"
                  className="btn btn-ghost navbar-signout-btn"
                  onClick={async () => {
                    await authClient.signOut();
                    router.refresh();
                  }}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  Sign Out
                </button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              id="nav-menu-toggle"
              className="btn-icon navbar-mobile-menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <MenuIcon />
            </button>
          </div>
        </div>

        {/* Mobile menu drawer & overlay */}
        {mobileMenuOpen && (
          <div
            className="navbar-mobile-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setMobileMenuOpen(false);
            }}
          >
            <div className="navbar-mobile-drawer" role="dialog" aria-modal="true" aria-label="Mobile navigation menu">
              <div className="drawer-header">
                <span className="drawer-title">Navigation</span>
                <button
                  type="button"
                  className="btn-icon drawer-close-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <CloseIconSmall />
                </button>
              </div>
              <Link
                href="/saved"
                className={`navbar-mobile-link ${pathname === '/saved' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <BookmarkIcon />
                <span>Saved Library</span>
              </Link>
              <div className="navbar-mobile-auth">
                {isAuthPending ? (
                  <div className="navbar-auth-skeleton w-full" />
                ) : !session?.user ? (
                  <Link
                    href="/auth/sign-in"
                    className="btn btn-primary w-full"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In / Sign Up
                  </Link>
                ) : (
                  <div className="navbar-mobile-user">
                    <div className="navbar-mobile-user-info">
                      <div className="navbar-user-avatar">
                        {session.user.image ? (
                          <img src={session.user.image} alt={session.user.name || 'Avatar'} className="navbar-avatar-img" />
                        ) : (
                          <span>{((session.user.name || session.user.email || 'U')[0]).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="navbar-mobile-user-name">{session.user.name || session.user.email}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary w-full"
                      onClick={async () => {
                        setMobileMenuOpen(false);
                        await authClient.signOut();
                        router.refresh();
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile / Compact: Option A Fullscreen Search Overlay */}
        {searchOpen && (
          <div
            ref={mobileSearchBoxRef}
            className="navbar-fullscreen-search"
            role="dialog"
            aria-modal="true"
            aria-label="Search saved videos"
          >
            <div className="fullscreen-search-bar">
              <button
                type="button"
                className="btn-icon search-back-btn"
                onClick={() => {
                  setSearchOpen(false);
                  setDropdownOpen(false);
                }}
                aria-label="Close search"
                title="Back"
              >
                <ArrowLeftIcon />
              </button>
              <form onSubmit={handleNavSearch} className="fullscreen-search-form" role="search">
                <input
                  ref={inputRef}
                  type="search"
                  className="fullscreen-search-input"
                  placeholder="Search saved videos by title…"
                  value={navQuery}
                  onChange={(e) => {
                    setNavQuery(e.target.value);
                    setDropdownOpen(true);
                  }}
                  autoFocus
                  aria-label="Search saved videos"
                />
                {navQuery && (
                  <button
                    type="button"
                    className="fullscreen-search-clear"
                    onClick={() => {
                      setNavQuery('');
                      setDropdownOpen(false);
                      inputRef.current?.focus();
                    }}
                    aria-label="Clear search input"
                  >
                    <CloseIconSmall />
                  </button>
                )}
                <button
                  type="submit"
                  className="fullscreen-search-submit"
                  aria-label="Search"
                  title="Search saved videos"
                >
                  <SearchIcon />
                </button>
              </form>
            </div>

            <div className="fullscreen-search-content">
              {navQuery.trim() ? (
                renderDropdownContent()
              ) : (
                <div className="fullscreen-search-empty">
                  <BookmarkIcon />
                  <p className="empty-title">Search your saved videos</p>
                  <p className="empty-desc">
                    Type video title keywords to quickly find and jump to videos in your library.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm empty-action-btn"
                    onClick={handleGoToChannelSearch}
                  >
                    Search Channel Videos on Home
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: var(--nav-height);
          background-color: var(--bg-primary);
          border-bottom: 1px solid var(--border-subtle);
          z-index: 100;
        }
        .navbar-inner {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          height: 100%;
          padding: 0 var(--space-4);
          max-width: var(--content-max-width);
          margin: 0 auto;
        }
        .navbar-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          text-decoration: none;
          user-select: none;
          transition: opacity var(--transition-fast);
        }
        .navbar-logo:hover {
          opacity: 0.95;
        }
        .navbar-logo-icon {
          display: block;
          flex-shrink: 0;
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.22s ease;
        }
        .navbar-logo:hover .navbar-logo-icon {
          transform: scale(1.05);
          filter: drop-shadow(0 2px 10px rgba(255, 30, 64, 0.45));
        }
        .navbar-logo-text {
          font-size: 1.18rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.5px;
          line-height: 1;
        }
        .navbar-search-container {
          position: relative;
          flex: 1;
          max-width: 640px;
          margin: 0 auto;
        }
        .navbar-search-form {
          width: 100%;
        }
        .navbar-search-box {
          display: flex;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          overflow: hidden;
          background-color: var(--bg-primary);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .navbar-search-box:focus-within {
          border-color: #1c62b9;
          box-shadow: 0 0 0 1px #1c62b9;
        }
        .navbar-search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: var(--space-2) var(--space-4);
          color: var(--text-primary);
          font-size: var(--text-base);
          min-width: 0;
        }
        .navbar-search-input::placeholder {
          color: var(--text-muted);
        }
        .navbar-search-clear-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 var(--space-2);
          color: var(--text-muted);
          cursor: pointer;
          transition: color var(--transition-fast);
        }
        .navbar-search-clear-btn:hover {
          color: var(--text-primary);
        }
        .navbar-search-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 var(--space-4);
          height: 38px;
          background-color: var(--bg-secondary);
          border-left: 1px solid var(--border);
          color: var(--text-primary);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        .navbar-search-btn:hover {
          background-color: var(--bg-hover);
        }

        /* Autocomplete dropdown */
        .nav-dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 200;
          overflow: hidden;
          animation: dropDownAnim 0.18s ease-out;
        }
        .mobile-dropdown {
          position: relative;
          top: var(--space-2);
          left: 0;
          right: 0;
        }
        @keyframes dropDownAnim {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .nav-dropdown-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
          padding: var(--space-5);
          color: var(--text-muted);
          font-size: var(--text-sm);
        }
        .nav-dropdown-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--space-5) var(--space-4);
          gap: var(--space-2);
        }
        .empty-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: var(--radius-full);
          background-color: rgba(255, 30, 64, 0.15);
          color: #ff1e40;
          margin-bottom: var(--space-1);
        }
        .empty-title {
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--text-primary);
        }
        .empty-desc {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          max-width: 380px;
          line-height: 1.45;
        }
        .query-highlight {
          color: var(--text-primary);
        }
        .empty-action-btn {
          margin-top: var(--space-2);
          font-size: var(--text-xs);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-full);
        }
        .nav-dropdown-results {
          display: flex;
          flex-direction: column;
        }
        .dropdown-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-2) var(--space-4);
          background-color: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-subtle);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .dropdown-view-all-link {
          color: #3ea6ff;
          font-weight: 500;
          text-transform: none;
          letter-spacing: normal;
        }
        .dropdown-view-all-link:hover {
          text-decoration: underline;
        }
        .dropdown-list {
          display: flex;
          flex-direction: column;
          max-height: 320px;
          overflow-y: auto;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2) var(--space-4);
          border-bottom: 1px solid var(--border-subtle);
          transition: background-color var(--transition-fast);
          text-decoration: none;
          color: inherit;
        }
        .dropdown-item:last-child {
          border-bottom: none;
        }
        .dropdown-item:hover {
          background-color: var(--bg-hover);
        }
        .dropdown-thumb-wrap {
          width: 56px;
          aspect-ratio: 16 / 9;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background-color: var(--bg-primary);
          flex-shrink: 0;
        }
        .dropdown-thumb {
          width: 56px;
          height: 32px;
          object-fit: cover;
          display: block;
          flex-shrink: 0;
        }
        .dropdown-thumb-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: var(--text-muted);
        }
        .dropdown-item-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .dropdown-item-title {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.3;
        }
        .dropdown-item-channel {
          font-size: var(--text-xs);
          color: var(--text-secondary);
        }
        .dropdown-go-icon {
          color: var(--text-muted);
          flex-shrink: 0;
          font-size: 20px;
          line-height: 1;
          transition: color var(--transition-fast);
        }
        .dropdown-item:hover .dropdown-go-icon {
          color: var(--text-primary);
        }
        .dropdown-footer {
          padding: var(--space-2) var(--space-4);
          background-color: var(--bg-tertiary);
          border-top: 1px solid var(--border-subtle);
          text-align: center;
        }
        .dropdown-footer-btn {
          font-size: var(--text-xs);
          font-weight: 500;
          color: var(--text-secondary);
        }
        .dropdown-footer-btn:hover {
          color: var(--text-primary);
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-shrink: 0;
        }
        .navbar-saved-btn.active {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .navbar-mobile-search { display: none; }
        .navbar-mobile-menu   { display: none; }

        .navbar-auth-skeleton {
          width: 76px;
          height: 36px;
          border-radius: var(--radius-md);
          background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%);
          background-size: 200% 100%;
          animation: navShimmer 1.4s infinite;
        }
        @keyframes navShimmer { to { background-position: -200% 0; } }

        .navbar-signin-btn {
          font-size: var(--text-sm);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-md);
          white-space: nowrap;
        }

        .navbar-user-menu {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .navbar-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: var(--accent);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: var(--text-sm);
          overflow: hidden;
          flex-shrink: 0;
          user-select: none;
        }

        .navbar-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .navbar-signout-btn {
          font-size: var(--text-xs);
          padding: var(--space-2) var(--space-3);
          color: var(--text-secondary);
        }
        .navbar-signout-btn:hover {
          color: var(--text-primary);
        }

        /* Option A Fullscreen Mobile Search Overlay */
        .navbar-fullscreen-search {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background-color: var(--bg-primary);
          display: flex;
          flex-direction: column;
          animation: searchSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          padding-top: max(var(--space-2), var(--safe-top));
          padding-bottom: max(var(--space-3), var(--safe-bottom));
          padding-left: max(var(--space-3), var(--safe-left));
          padding-right: max(var(--space-3), var(--safe-right));
        }
        @keyframes searchSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fullscreen-search-bar {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          height: 52px;
          border-bottom: 1px solid var(--border-subtle);
          padding: 0 var(--space-2);
          flex-shrink: 0;
        }
        .search-back-btn {
          color: var(--text-primary);
          width: 44px;
          height: 44px;
        }
        .fullscreen-search-form {
          flex: 1;
          display: flex;
          align-items: center;
          background-color: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          overflow: hidden;
          height: 42px;
          padding: 0 var(--space-1);
        }
        .fullscreen-search-form:focus-within {
          border-color: #1c62b9;
        }
        .fullscreen-search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: var(--text-base);
          padding: 0 var(--space-3);
          min-width: 0;
        }
        .fullscreen-search-clear {
          padding: 0 var(--space-2);
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .fullscreen-search-clear:hover {
          color: var(--text-primary);
        }
        .fullscreen-search-submit {
          padding: 0 var(--space-3);
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          border-left: 1px solid var(--border);
        }
        .fullscreen-search-content {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: var(--space-2) 0;
        }
        .fullscreen-search-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--space-8) var(--space-4);
          gap: var(--space-2);
          color: var(--text-muted);
        }

        /* Mobile Drawer & Backdrop */
        .navbar-mobile-backdrop {
          position: fixed;
          inset: 0;
          z-index: 99;
          background-color: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          animation: fadeIn var(--transition-fast);
        }
        .navbar-mobile-drawer {
          position: absolute;
          top: var(--nav-height);
          left: 0;
          right: 0;
          max-height: calc(100dvh - var(--nav-height));
          overflow-y: auto;
          background-color: var(--bg-secondary);
          border-bottom: 1px solid var(--border);
          box-shadow: var(--shadow-lg);
          padding: var(--space-3) max(var(--space-4), var(--safe-right)) max(var(--space-5), var(--safe-bottom)) max(var(--space-4), var(--safe-left));
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          animation: drawerSlideDown 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes drawerSlideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: var(--space-2);
          border-bottom: 1px solid var(--border-subtle);
        }
        .drawer-title {
          font-size: var(--text-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
        }
        .navbar-mobile-link {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: var(--text-sm);
          font-weight: 500;
          min-height: 48px;
        }
        .navbar-mobile-link.active {
          background-color: var(--bg-tertiary);
        }
        .navbar-mobile-auth {
          padding-top: var(--space-2);
          border-top: 1px solid var(--border-subtle);
        }
        .navbar-mobile-user {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .navbar-mobile-user-info {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }
        .navbar-mobile-user-name {
          font-size: var(--text-sm);
          color: var(--text-primary);
          font-weight: 500;
        }

        @media (max-width: 720px) {
          .navbar-search-container {
            display: none;
          }
          .navbar-saved-btn {
            display: none;
          }
          .navbar-signin-btn, .navbar-user-menu {
            display: none;
          }
          .navbar-mobile-search { display: flex; }
          .navbar-mobile-menu   { display: flex; }
          .navbar-logo-text { font-size: var(--text-base); }
        }

        @media (pointer: coarse) {
          .navbar-mobile-search,
          .navbar-mobile-menu,
          .navbar-search-btn {
            min-width: 44px;
            min-height: 44px;
          }
        }
      `}</style>
    </>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

function CloseIconSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

