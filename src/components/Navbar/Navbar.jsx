import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Library, ChevronDown, ShieldCheck, LogOut, User, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import './Navbar.css';

export default function Navbar() {
  const { isAuthenticated, profile, signOut } = useAuth();
  const { memberships, adminLibraries, activeLibrary, setActiveLibrary } = useLibrary();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <Library size={22} />
          <span>OpenShelf</span>
        </Link>

        <nav className="navbar-links">
          <NavLink to="/browse" className="navbar-link">Browse</NavLink>
          <NavLink to="/search" className="navbar-link">Search</NavLink>
          <NavLink to="/libraries" className="navbar-link">Find a Library</NavLink>
          <NavLink to="/about" className="navbar-link">About</NavLink>
        </nav>

        <div className="navbar-right">
          {isAuthenticated && memberships.length > 0 && (
            <div className="library-switcher">
              <button className="library-switcher-btn" onClick={() => setSwitcherOpen((o) => !o)}>
                <span className="library-switcher-current">
                  {activeLibrary ? activeLibrary.name : 'Choose a library'}
                </span>
                <ChevronDown size={16} />
              </button>
              {switcherOpen && (
                <div className="library-switcher-menu" onMouseLeave={() => setSwitcherOpen(false)}>
                  {memberships.map((m) => (
                    <button
                      key={m.id}
                      className={`library-switcher-item ${m.library.id === activeLibrary?.id ? 'library-switcher-item--active' : ''}`}
                      onClick={() => {
                        setActiveLibrary(m.library.id);
                        setSwitcherOpen(false);
                      }}
                    >
                      {m.library.logo_url ? (
                        <img src={m.library.logo_url} alt="" className="library-switcher-logo" />
                      ) : (
                        <div className="library-switcher-logo library-switcher-logo--placeholder">
                          {m.library.name?.[0]}
                        </div>
                      )}
                      <span>{m.library.name}</span>
                      {m.status !== 'active' && <span className="library-switcher-pending">Pending</span>}
                    </button>
                  ))}
                  <Link to="/libraries" className="library-switcher-item library-switcher-item--add" onClick={() => setSwitcherOpen(false)}>
                    + Join another library
                  </Link>
                </div>
              )}
            </div>
          )}

          {isAuthenticated ? (
            <div className="navbar-user">
              {adminLibraries.length > 0 && (
                <Link to="/admin" className="navbar-admin-link" title="Library admin dashboard">
                  <ShieldCheck size={18} />
                </Link>
              )}
              <Link to="/loans" className="navbar-user-link" title="Your loans and holds">
                <Clock size={18} />
                <span>Loans</span>
              </Link>
              <Link to="/dashboard" className="navbar-user-link">
                <User size={18} />
                <span>{profile?.display_name || 'Account'}</span>
              </Link>
              <button className="navbar-signout" onClick={handleSignOut} aria-label="Sign out">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="navbar-auth-links">
              <Link to="/login" className="navbar-link">Log in</Link>
              <Link to="/signup" className="navbar-signup-btn">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
