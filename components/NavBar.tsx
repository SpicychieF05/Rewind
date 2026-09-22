'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bookmark, Library, LogOut, ArrowLeft, X } from 'lucide-react';
import { authClient } from '@/lib/auth/client';
import type { VideoResult } from '@/lib/youtube';
import Icon from '@/components/ui/Icon';
import IconButton from '@/components/ui/IconButton';

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  // Search states
  const [navQuery, setNavQuery] = useState('');
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [results, setResults] = useState<VideoResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Avatar menu popover
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const avatarBtnRef = useRef<HTMLButtonElement>(null);

  // Focus overlay input when opened
  useEffect(() => {
    if (searchOverlayOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => overlayInputRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
  }, [searchOverlayOpen]);

  // Click outside to close desktop dropdown and avatar menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(target) &&
        avatarBtnRef.current &&
        !avatarBtnRef.current.contains(target)
      ) {
        setAvatarMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setSearchOverlayOpen(false);
        setAvatarMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Debounced search for saved videos
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

    if (!isAuthenticated) {
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
  }, [navQuery, isAuthenticated]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = navQuery.trim();
    if (query) {
      setDropdownOpen(false);
      setSearchOverlayOpen(false);
      router.push(`/saved?q=${encodeURIComponent(query)}`);
    }
  };

  const handleGoToChannelSearch = () => {
    const query = navQuery.trim();
    setDropdownOpen(false);
    setSearchOverlayOpen(false);
    if (query) {
      router.push(`/?q=${encodeURIComponent(query)}`);
    } else {
      router.push('/');
    }
  };

  const renderDropdownContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="nav-dropdown-empty" role="status">
          <div className="empty-icon-circle">
            <Icon as={Bookmark} size={22} />
          </div>
          <p className="empty-title">Sign in to search saved videos</p>
          <p className="empty-desc">
            Your saved library and playlists are private. Sign in to view and search saved videos.
          </p>
          <div className="empty-actions">
            <Link
              href="/auth/sign-in"
              className="btn btn-primary"
              style={{ height: '34px', fontSize: 'var(--text-xs)' }}
              onClick={() => {
                setDropdownOpen(false);
                setSearchOverlayOpen(false);
              }}
            >
              Sign In
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ height: '34px', fontSize: 'var(--text-xs)' }}
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
          <div className="empty-icon-circle">
            <Icon as={Bookmark} size={22} />
          </div>
          <p className="empty-title">No saved videos found</p>
          <p className="empty-desc">
            No saved videos match <strong style={{ color: 'var(--text-primary)' }}>&ldquo;{navQuery.trim()}&rdquo;</strong>.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ height: '34px', fontSize: 'var(--text-xs)' }}
            onClick={handleGoToChannelSearch}
          >
            <Icon as={Search} size={14} />
            <span>Search Channel Videos on Home</span>
          </button>
        </div>
      );
    }

    if (results.length > 0) {
      return (
        <div className="nav-dropdown-results">
          <div className="dropdown-header">
            <span>Saved Videos ({results.length})</span>
            <Link
              href={`/saved?q=${encodeURIComponent(navQuery.trim())}`}
              onClick={() => {
                setDropdownOpen(false);
                setSearchOverlayOpen(false);
              }}
              className="dropdown-view-all"
            >
              View in Saved
            </Link>
          </div>

          <ul id="nav-dropdown-results-list" className="dropdown-list" role="listbox">
            {results.slice(0, 5).map((vid) => (
              <li key={vid.videoId} role="option" aria-selected="false">
                <Link
                  href={`/saved?q=${encodeURIComponent(navQuery.trim())}`}
                  className="dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    setSearchOverlayOpen(false);
                  }}
                >
                  <div className="dropdown-thumb-box">
                    {vid.thumbnail ? (
                      <img src={vid.thumbnail} alt="" className="dropdown-thumb" width={64} height={36} />
                    ) : (
                      <div className="dropdown-thumb-fallback">▶</div>
                    )}
                  </div>
                  <div className="dropdown-item-info">
                    <span className="dropdown-item-title line-clamp-2">{vid.title}</span>
                    <span className="dropdown-item-channel">{vid.channelName}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {results.length > 5 && (
            <div className="dropdown-footer">
              <Link
                href={`/saved?q=${encodeURIComponent(navQuery.trim())}`}
                onClick={() => {
                  setDropdownOpen(false);
                  setSearchOverlayOpen(false);
                }}
                className="dropdown-footer-link"
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
      <header className="navbar-root" role="banner">
        <div className="navbar-container">
          {/* 1. Left: Rewind Brand Logo (Badge left of wordmark) */}
          <Link href="/" className="navbar-logo" aria-label="Rewind home">
            <svg
              className="navbar-logo-badge"
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

          {/* 2. Center: Search Pill (Wide & Medium containers) */}
          {/* On homepage, pill is visually de-emphasized so the main search form stays primary */}
          <div ref={desktopSearchRef} className={`navbar-search-pill-wrap ${pathname === '/' ? 'pill-home' : ''}`}>
            <form onSubmit={handleSearchSubmit} className="search-pill-form" role="search" aria-label="Search saved videos">
              <div className="search-pill">
                <input
                  ref={desktopInputRef}
                  id="nav-search-input"
                  type="search"
                  className="search-pill-input"
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
                  role="combobox"
                  aria-expanded={dropdownOpen && !!navQuery.trim()}
                  aria-autocomplete="list"
                  aria-controls="nav-dropdown-results-list"
                />
                {navQuery && (
                  <button
                    type="button"
                    className="search-pill-clear"
                    onClick={() => {
                      setNavQuery('');
                      setDropdownOpen(false);
                      desktopInputRef.current?.focus();
                    }}
                    aria-label="Clear search input"
                  >
                    <Icon as={X} size={14} />
                  </button>
                )}
                <div className="search-pill-divider" aria-hidden="true" />
                <button
                  type="submit"
                  className="search-pill-submit"
                  aria-label="Search saved videos"
                  title="Search saved videos"
                >
                  <Icon as={Search} size={16} anim="wiggle" />
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

          {/* 3. Right Actions: Saved Pill, Search Toggle, Auth/Avatar */}
          <div className="navbar-actions">
            {/* Narrow search button trigger */}
            <button
              type="button"
              id="nav-search-toggle"
              className="navbar-search-toggle-btn"
              onClick={() => {
                setSearchOverlayOpen(true);
              }}
              aria-label="Open search"
              aria-expanded={searchOverlayOpen}
            >
              <Icon as={Search} size={18} anim="wiggle" />
            </button>

            {/* Saved Library Pill (Hidden when logged out, per finding #7) */}
            {isAuthenticated && (
              <Link
                href="/saved"
                id="nav-saved-btn"
                className={`navbar-saved-pill ${pathname === '/saved' ? 'active' : ''}`}
                aria-current={pathname === '/saved' ? 'page' : undefined}
                aria-label="Saved Library"
              >
                <Icon as={Bookmark} size={16} anim="pop" />
                <span className="saved-pill-label">Saved</span>
              </Link>
            )}

            {/* Auth Session State */}
            {isAuthPending ? (
              <div className="navbar-auth-skeleton" aria-hidden="true" />
            ) : !isAuthenticated ? (
              <Link
                href="/auth/sign-in"
                id="nav-signin-btn"
                className="btn btn-secondary nav-signin-btn"
              >
                Sign In
              </Link>
            ) : (
              <div className="navbar-user-wrap">
                <button
                  ref={avatarBtnRef}
                  type="button"
                  id="nav-user-avatar-btn"
                  className="navbar-avatar-btn"
                  onClick={() => setAvatarMenuOpen((prev) => !prev)}
                  aria-label="Account menu"
                  aria-expanded={avatarMenuOpen}
                  aria-haspopup="menu"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User avatar'}
                      className="avatar-img"
                      width={36}
                      height={36}
                    />
                  ) : (
                    <span className="avatar-initial">
                      {((session.user.name || session.user.email || 'U')[0]).toUpperCase()}
                    </span>
                  )}
                </button>

                {/* Avatar Menu Popover */}
                {avatarMenuOpen && (
                  <div
                    ref={avatarMenuRef}
                    className="avatar-menu-popover"
                    role="menu"
                    aria-label="Account options"
                  >
                    <div className="avatar-menu-header">
                      <div className="menu-avatar-circle">
                        {session.user.image ? (
                          <img src={session.user.image} alt="" className="avatar-img" />
                        ) : (
                          <span>{((session.user.name || session.user.email || 'U')[0]).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="menu-user-details">
                        <span className="menu-user-name truncate">{session.user.name || 'User'}</span>
                        <span className="menu-user-email truncate">{session.user.email}</span>
                      </div>
                    </div>

                    <div className="avatar-menu-divider" />

                    {/* Saved Library menu item */}
                    <Link
                      href="/saved"
                      className={`avatar-menu-item ${pathname === '/saved' ? 'active' : ''}`}
                      role="menuitem"
                      onClick={() => setAvatarMenuOpen(false)}
                    >
                      <span className="menu-item-icon">
                        <Icon as={Library} size={16} anim="tick" />
                      </span>
                      <span className="menu-item-label">Saved Library</span>
                    </Link>

                    {/* Sign out item */}
                    <button
                      type="button"
                      className="avatar-menu-item signout-item"
                      role="menuitem"
                      onClick={async () => {
                        setAvatarMenuOpen(false);
                        await authClient.signOut();
                        router.refresh();
                      }}
                    >
                      <span className="menu-item-icon">
                        <Icon as={LogOut} size={16} anim="nudge-x" />
                      </span>
                      <span className="menu-item-label">Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Narrow Screen Search Overlay */}
      {searchOverlayOpen && (
        <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search saved videos">
          <div className="search-overlay-bar">
            <IconButton
              aria-label="Close search"
              onClick={() => {
                setSearchOverlayOpen(false);
                setDropdownOpen(false);
              }}
            >
              <Icon as={ArrowLeft} size={20} anim="nudge-x" />
            </IconButton>

            <form onSubmit={handleSearchSubmit} className="search-overlay-form" role="search">
              <input
                ref={overlayInputRef}
                type="search"
                className="search-overlay-input"
                placeholder="Search saved videos by title…"
                value={navQuery}
                onChange={(e) => {
                  setNavQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                aria-label="Search saved videos"
              />
              {navQuery && (
                <IconButton
                  aria-label="Clear input"
                  size="sm"
                  onClick={() => {
                    setNavQuery('');
                    setDropdownOpen(false);
                    overlayInputRef.current?.focus();
                  }}
                >
                  <Icon as={X} size={16} />
                </IconButton>
              )}
            </form>
          </div>

          <div className="search-overlay-content">
            {navQuery.trim() ? (
              renderDropdownContent()
            ) : (
              <div className="search-overlay-hint">
                <Icon as={Bookmark} size={36} />
                <p className="hint-title">Search Saved Videos</p>
                <p className="hint-desc">Type keywords from video titles to search and jump to videos in your library.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ height: '36px', fontSize: 'var(--text-xs)' }}
                  onClick={handleGoToChannelSearch}
                >
                  Search Channel Videos on Home
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .navbar-root {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: calc(var(--nav-height) + var(--safe-top));
          padding-top: var(--safe-top);
          background-color: rgba(15, 15, 15, 0.84);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-subtle);
          z-index: var(--z-nav);
        }

        @supports not (backdrop-filter: blur(1px)) {
          .navbar-root {
            background-color: #0f0f0f;
          }
        }

        .navbar-container {
          container-type: inline-size;
          container-name: nav-container;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          max-width: var(--content-max-width);
          margin: 0 auto;
          padding: 0 max(var(--space-4), var(--safe-left)) 0 max(var(--space-4), var(--safe-right));
          gap: var(--space-4);
        }

        /* 1. Logo Row: badge left of wordmark, horizontal row */
        :global(.navbar-logo) {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          user-select: none;
          text-decoration: none;
        }
        :global(.navbar-logo-badge) {
          flex-shrink: 0;
          display: block;
          transition: transform 220ms var(--ease-spring), filter 220ms ease;
        }
        .navbar-logo:hover :global(.navbar-logo-badge) {
          transform: scale(1.05);
          filter: drop-shadow(0 2px 8px rgba(255, 30, 64, 0.45));
        }
        .navbar-logo-text {
          font-size: clamp(1.1rem, 0.95rem + 0.4vw, 1.25rem);
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.4px;
          line-height: 1;
        }

        /* 2. Search Pill */
        .navbar-search-pill-wrap {
          position: relative;
          flex: 1;
          max-width: 640px;
          margin: 0 auto;
        }
        /* Homepage: de-emphasize the saved-video search pill so the main
           channel-search form on the page is the clear primary entry point */
        .navbar-search-pill-wrap.pill-home {
          max-width: 320px;
          opacity: 0.7;
          transition: opacity var(--transition-fast), max-width var(--transition-fast);
        }
        .navbar-search-pill-wrap.pill-home:focus-within {
          opacity: 1;
          max-width: 440px;
        }
        .search-pill-form {
          width: 100%;
        }
        .search-pill {
          display: flex;
          align-items: center;
          background-color: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          height: var(--control-h);
          overflow: hidden;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .search-pill:focus-within {
          border-color: var(--text-secondary);
          box-shadow: 0 0 0 3px var(--accent-subtle);
        }
        .search-pill-input {
          flex: 1;
          height: 100%;
          background: transparent;
          border: none;
          outline: none;
          padding: 0 var(--space-3) 0 var(--space-4);
          color: var(--text-primary);
          font-size: var(--text-sm);
          min-width: 0;
        }
        .search-pill-input::placeholder {
          color: var(--text-muted);
        }
        .search-pill-clear {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 var(--space-2);
          color: var(--text-muted);
          transition: color var(--transition-fast);
        }
        .search-pill-clear:hover {
          color: var(--text-primary);
        }
        .search-pill-divider {
          width: 1px;
          height: 22px;
          background-color: var(--border);
          flex-shrink: 0;
        }
        .search-pill-submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 var(--space-4);
          height: 100%;
          background-color: var(--surface-3);
          color: var(--text-secondary);
          transition: background-color var(--transition-fast), color var(--transition-fast);
          flex-shrink: 0;
        }
        .search-pill-submit:hover {
          background-color: var(--surface-4);
          color: var(--text-primary);
        }

        /* 3. Actions */
        .navbar-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-shrink: 0;
        }

        .navbar-search-toggle-btn {
          display: none;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          color: var(--text-primary);
          background: transparent;
          transition: background-color var(--transition-fast);
        }
        .navbar-search-toggle-btn:hover {
          background-color: var(--surface-2);
        }

        :global(.navbar-saved-pill) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          height: var(--control-h);
          padding: 0 var(--space-4);
          border-radius: var(--radius-full);
          background-color: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text-primary);
          font-size: var(--text-sm);
          font-weight: 500;
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
          user-select: none;
          box-shadow: var(--surface-highlight);
          transition: background-color var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast), color var(--transition-fast);
        }
        :global(.navbar-saved-pill:hover) {
          background-color: var(--surface-3);
          border-color: var(--border-strong);
          color: #fff;
        }
        :global(.navbar-saved-pill:active) {
          transform: scale(0.98);
        }
        :global(.navbar-saved-pill.active) {
          background-color: var(--surface-3);
          border-color: var(--accent);
          color: #fff;
          box-shadow: 0 0 10px var(--accent-ring);
        }
        :global(.navbar-saved-pill .saved-pill-label) {
          display: inline-block;
          line-height: 1;
        }

        .nav-signin-btn {
          height: var(--control-h);
          border-radius: var(--radius-full);
          padding: 0 var(--space-4);
          /* btn-secondary already provides the dark surface + border;
             no overrides needed beyond geometry */
        }

        .navbar-auth-skeleton {
          width: 76px;
          height: var(--control-h);
          border-radius: var(--radius-full);
          background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
          background-size: 200% 100%;
          animation: shimmer-rewind 1.4s infinite;
        }

        /* User Avatar Button */
        .navbar-user-wrap {
          position: relative;
        }
        .navbar-avatar-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: var(--accent);
          color: #fff;
          font-weight: 700;
          font-size: var(--text-sm);
          overflow: hidden;
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }
        .navbar-avatar-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 0 2px var(--accent-ring);
        }
        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar-initial {
          line-height: 1;
        }

        /* Avatar Menu Popover */
        .avatar-menu-popover {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 240px;
          max-width: min(320px, calc(100vw - 24px));
          background-color: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg), var(--surface-highlight);
          padding: var(--space-2);
          z-index: var(--z-popover);
          animation: fadeIn 150ms var(--ease-standard);
        }
        .avatar-menu-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2);
        }
        .menu-avatar-circle {
          width: 36px;
          height: 36px;
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
        }
        .menu-user-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .menu-user-name {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
        }
        .menu-user-email {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .avatar-menu-divider {
          height: 1px;
          background-color: var(--border-subtle);
          margin: var(--space-1) 0;
        }
        :global(.avatar-menu-item) {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          width: 100%;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--text-primary);
          text-decoration: none;
          background: transparent;
          border: none;
          cursor: pointer;
          box-sizing: border-box;
          min-height: 40px;
          text-align: left;
          line-height: 1;
          transition: background-color var(--transition-fast), color var(--transition-fast);
        }
        :global(.avatar-menu-item:hover) {
          background-color: var(--surface-3);
          color: #fff;
        }
        :global(.avatar-menu-item:active) {
          background-color: var(--surface-4);
        }
        :global(.avatar-menu-item.active) {
          background-color: var(--surface-2);
          color: var(--text-primary);
          font-weight: 600;
        }
        :global(.avatar-menu-item.signout-item) {
          color: var(--text-secondary);
        }
        :global(.avatar-menu-item.signout-item:hover) {
          color: var(--error);
          background-color: rgba(239, 68, 68, 0.12);
        }
        :global(.avatar-menu-item .menu-item-icon) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          color: inherit;
        }
        :global(.avatar-menu-item .menu-item-label) {
          flex: 1;
          line-height: 1.2;
        }

        /* Dropdown autocomplete */
        .nav-dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background-color: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg), var(--surface-highlight);
          z-index: var(--z-popover);
          overflow: hidden;
          animation: slideUp 160ms var(--ease-standard);
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
        .empty-icon-circle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: var(--accent-subtle);
          color: var(--accent);
          margin-bottom: var(--space-1);
        }
        .empty-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
        }
        .empty-desc {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          max-width: 320px;
          line-height: 1.4;
        }
        .empty-actions {
          display: flex;
          gap: var(--space-2);
          margin-top: var(--space-2);
          flex-wrap: wrap;
          justify-content: center;
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
          background-color: var(--surface-2);
          border-bottom: 1px solid var(--border-subtle);
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        :global(.dropdown-view-all) {
          color: var(--accent);
          font-weight: 500;
          text-transform: none;
          text-decoration: none;
        }
        :global(.dropdown-view-all:hover) {
          text-decoration: underline;
        }
        .dropdown-list {
          display: flex;
          flex-direction: column;
          max-height: 320px;
          overflow-y: auto;
        }
        :global(.dropdown-item) {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2) var(--space-4);
          border-bottom: 1px solid var(--border-subtle);
          transition: background-color var(--transition-fast);
          text-decoration: none;
          color: inherit;
        }
        :global(.dropdown-item:hover) {
          background-color: var(--surface-2);
        }
        .dropdown-thumb-box {
          width: 64px;
          aspect-ratio: 16 / 9;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background-color: var(--surface-2);
          flex-shrink: 0;
        }
        .dropdown-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .dropdown-thumb-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 10px;
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
          color: var(--text-primary);
          line-height: 1.3;
        }
        .dropdown-item-channel {
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        .dropdown-footer {
          padding: var(--space-2) var(--space-4);
          background-color: var(--surface-2);
          border-top: 1px solid var(--border-subtle);
          text-align: center;
        }
        :global(.dropdown-footer-link) {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          font-weight: 500;
          text-decoration: none;
        }
        :global(.dropdown-footer-link:hover) {
          color: var(--text-primary);
        }

        /* ── Fullscreen Search Overlay for Compact Devices ── */
        .search-overlay {
          position: fixed;
          inset: 0;
          z-index: var(--z-overlay);
          background-color: var(--bg-primary);
          display: flex;
          flex-direction: column;
          padding-top: max(var(--space-2), var(--safe-top));
          padding-bottom: max(var(--space-3), var(--safe-bottom));
          padding-left: max(var(--space-3), var(--safe-left));
          padding-right: max(var(--space-3), var(--safe-right));
          animation: fadeIn 150ms var(--ease-standard);
        }
        .search-overlay-bar {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          height: 52px;
          border-bottom: 1px solid var(--border-subtle);
          padding: 0 var(--space-2);
          flex-shrink: 0;
        }
        .search-overlay-form {
          flex: 1;
          display: flex;
          align-items: center;
          background-color: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          height: var(--control-h);
          padding: 0 var(--space-3);
        }
        .search-overlay-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: var(--text-base);
          min-width: 0;
        }
        .search-overlay-content {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: var(--space-3) 0;
        }
        .search-overlay-hint {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: var(--space-8) var(--space-4);
          gap: var(--space-2);
          color: var(--text-muted);
        }
        .hint-title {
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--text-primary);
        }
        .hint-desc {
          font-size: var(--text-xs);
          color: var(--text-secondary);
          max-width: 320px;
          margin-bottom: var(--space-2);
        }

        /* ── Container Queries on .navbar-container ── */
        @container nav-container (max-width: 899px) {
          .navbar-search-pill-wrap {
            max-width: 360px;
          }
          :global(.navbar-saved-pill .saved-pill-label) {
            display: none;
          }
          :global(.navbar-saved-pill) {
            padding: 0 var(--space-3);
          }
        }

        @container nav-container (max-width: 599px) {
          .navbar-search-pill-wrap {
            display: none;
          }
          :global(.navbar-saved-pill) {
            display: none;
          }
          .navbar-search-toggle-btn {
            display: inline-flex;
          }
        }

        @container nav-container (max-width: 339px) {
          .navbar-logo-text {
            display: none;
          }
        }

        @media (pointer: coarse) {
          .navbar-search-toggle-btn {
            min-width: 44px;
            min-height: 44px;
          }
          .navbar-avatar-btn {
            min-width: 40px;
            min-height: 40px;
          }
        }
      `}</style>
    </>
  );
}
