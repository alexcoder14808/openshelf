import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import '../pages.css';

export default function AdminDashboard() {
  const { adminLibraries } = useLibrary();

  return (
    <div className="page">
      <div className="page-header">
        <h1>Library Admin</h1>
        <p>Manage the libraries you own or help administer.</p>
      </div>

      {adminLibraries.length === 0 ? (
        <div className="empty-state">
          <p>You don't administer any libraries yet.</p>
          <Link to="/admin/create-library">Start a library</Link>
        </div>
      ) : (
        <div className="library-grid">
          {adminLibraries.map((a) => (
            <div className="library-card" key={a.id}>
              {a.library.logo_url ? (
                <img className="library-card-logo" src={a.library.logo_url} alt="" />
              ) : (
                <div className="library-card-logo">{a.library.name?.[0]}</div>
              )}
              <h3>{a.library.name}</h3>
              <p>{a.role === 'owner' ? 'Owner' : 'Admin'}</p>
              <Link to={`/admin/${a.library.id}`} className="library-card-join">
                Manage catalog
              </Link>
            </div>
          ))}
          <Link to="/admin/create-library" className="library-card" style={{ alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#5b6df5' }}>
            <PlusCircle size={28} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Start another library</span>
          </Link>
        </div>
      )}
    </div>
  );
}
