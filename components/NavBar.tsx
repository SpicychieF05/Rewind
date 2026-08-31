'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (navQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(navQuery.trim())}`);
      setSearchOpen(false);
    }
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

          {/* Centre: Search bar (hidden on mobile by default) */}
          <form
            className={`navbar-search-form ${searchOpen ? 'search-open' : ''}`}
            onSubmit={handleNavSearch}
            role="search"
            aria-label="Search videos"
          >
            <div className="navbar-search-box" suppressHydrationWarning>
              <input
                ref={inputRef}
                id="nav-search-input"
                type="search"
                className="navbar-search-input"
                placeholder="Search a channel's videos…"
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                aria-label="Search query"
              />
              <button
                type="submit"
                className="navbar-search-btn"
                aria-label="Submit search"
              >
                <SearchIcon />
              </button>
            </div>
          </form>

          {/* Right: actions */}
          <div className="navbar-actions" suppressHydrationWarning>
            {/* Mobile: search icon */}
            <button
              id="nav-search-toggle"
              className="btn-icon navbar-mobile-search"
              onClick={() => setSearchOpen((v) => !v)}
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

        {/* Mobile: expanded search row */}
        {searchOpen && (
          <div className="navbar-mobile-searchrow">
            <form onSubmit={handleNavSearch} className="w-full flex gap-2">
              <input
                type="search"
                className="input"
                placeholder="Search a channel's videos…"
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                autoFocus
                aria-label="Mobile search query"
              />
              <button type="submit" className="btn btn-primary" aria-label="Search">
                <SearchIcon />
              </button>
            </form>
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
        .navbar-search-form {
          flex: 1;
          max-width: 640px;
          margin: 0 auto;
        }
        .navbar-search-box {
          display: flex;
          border: 1px solid var(--border);
          border-radius: var(--radius-full);
          overflow: hidden;
          background-color: var(--bg-primary);
        }
        .navbar-search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: var(--space-2) var(--space-4);
          color: var(--text-primary);
          font-size: var(--text-base);
        }
        .navbar-search-input::placeholder {
          color: var(--text-muted);
        }
        .navbar-search-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 var(--space-4);
          background-color: var(--bg-secondary);
          border-left: 1px solid var(--border);
          color: var(--text-primary);
          cursor: pointer;
          transition: background-color var(--transition-fast);
        }
        .navbar-search-btn:hover {
          background-color: var(--bg-hover);
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
        .navbar-mobile-searchrow {
          padding: var(--space-2) var(--space-4) var(--space-3);
          background-color: var(--bg-primary);
          border-top: 1px solid var(--border-subtle);
        }

        @media (max-width: 640px) {
          .navbar {
            height: auto;
          }
          .navbar-search-form {
            display: none;
          }
          .navbar-search-form.search-open {
            display: none; /* handled by mobile row */
          }
          .navbar-mobile-search { display: flex; }
          .navbar-mobile-menu   { display: flex; }
          .navbar-logo-text { font-size: var(--text-base); }
        }
      `}</style>
    </>
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
