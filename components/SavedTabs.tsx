'use client';

export type SavedTab = 'channels' | 'videos' | 'playlists';

interface Props {
  activeTab: SavedTab;
  onTabChange: (tab: SavedTab) => void;
}

const TABS: { id: SavedTab; label: string }[] = [
  { id: 'channels',  label: 'Channels'  },
  { id: 'videos',    label: 'Videos'    },
  { id: 'playlists', label: 'Playlists' },
];

export default function SavedTabs({ activeTab, onTabChange }: Props) {
  return (
    <nav
      className="tabs"
      role="tablist"
      aria-label="Saved library sections"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          id={`tab-${tab.id}`}
          role="tab"
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
