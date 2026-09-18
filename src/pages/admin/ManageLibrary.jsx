import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, Users, Settings as SettingsIcon, Lock } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import CatalogPanel from '../../components/admin/CatalogPanel';
import PeoplePanel from '../../components/admin/PeoplePanel';
import SettingsPanel from '../../components/admin/SettingsPanel';
import LibraryReauthModal from '../../components/Navbar/LibraryReauthModal';
import '../pages.css';

const TABS = [
  { id: 'catalog', label: 'Catalog', icon: BookOpen },
  { id: 'people', label: 'People', icon: Users },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function ManageLibrary() {
  const { libraryId } = useParams();
  const { adminLibraries, refresh, isLibraryLocked } = useLibrary();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showReauth, setShowReauth] = useState(false);

  const activeTab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'catalog';
  const setActiveTab = (tabId) => setSearchParams(tabId === 'catalog' ? {} : { tab: tabId });

  const adminEntry = adminLibraries.find((a) => a.library.id === libraryId);

  if (!adminEntry) {
    return (
      <div className="page">
        <div className="empty-state"><p>You don't administer this library.</p></div>
      </div>
    );
  }

  // Logging out of a library locks it — admin access is no exception. A
  // direct URL to /admin/:libraryId must not bypass that; re-entering
  // requires the same card + PIN re-auth as browsing/borrowing does.
  if (isLibraryLocked(libraryId)) {
    return (
      <div className="page">
        <div className="empty-state">
          <Lock size={28} style={{ marginBottom: 10, color: '#9aa0ab' }} />
          <h2>You're logged out of {adminEntry.library.name}</h2>
          <p>Log back in with its card number and PIN to manage it.</p>
          <button className="form-submit" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => setShowReauth(true)}>
            Log back in
          </button>
        </div>
        {showReauth && (
          <LibraryReauthModal
            library={adminEntry.library}
            onClose={() => setShowReauth(false)}
            onUnlocked={() => setShowReauth(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {adminEntry.library.logo_url ? (
          <img src={adminEntry.library.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg,#5b6df5,#8c5bf5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
            {adminEntry.library.name?.[0]}
          </div>
        )}
        <div>
          <h1 style={{ margin: 0 }}>Manage {adminEntry.library.name}</h1>
          <p style={{ margin: '2px 0 0' }}>Catalog, membership, and settings — all in one place.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #eef0f3', marginBottom: 24 }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #5b6df5' : '2px solid transparent',
                color: isActive ? '#5b6df5' : '#6b7280',
                fontWeight: isActive ? 700 : 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'catalog' && <CatalogPanel libraryId={libraryId} />}
      {activeTab === 'people' && <PeoplePanel libraryId={libraryId} />}
      {activeTab === 'settings' && (
        <SettingsPanel libraryId={libraryId} library={adminEntry.library} onSaved={refresh} />
      )}
    </div>
  );
}
