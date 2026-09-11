import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Library, ChevronDown, ShieldCheck, LogOut, User, Clock, PlusCircle, DoorOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import './Navbar.css';

export default function Navbar() {
  const { isAuthenticated, profile, signOut } = useAuth();
  const { memberships, adminLibraries, activeLibrary, setActiveLibrary } = useLibrary();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOutOfOpenShelf = async () => {
    setAccountOpen(false);
    await signOut();
    navigate('/');
  };

  const handleLogOutOfLibrary = () => {
    setAccountOpen(false);
    setActiveLibrary(null);
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
          <NavLink to="/search" className="navbar-link">Search this library</NavLink>
          <NavLink to="/about" className="navbar-link">About</NavLink>
          {/* Once someone has at least one card, joining more libraries moves
              into the switcher dropdown below to keep this bar short — this
              stays here as the entry point until then, and for signed-out
              visitors. */}
          {(!isAuthenticated || memberships.length === 0) && (
            <NavLink to="/libraries" className="navbar-link">Find a Library</NavLink>
          )}
        </nav>

        <div className="navbar-right">
          {isAuthenticated && memberships.length > 0 && (
            <div className="library-switcher">
              <button className="library-switcher-btn" onClick={() => setSwitcherOpen((o) => !o)}>
                {activeLibrary?.logo_url ? (
                  <img src={activeLibrary.logo_url} alt="" className="library-switcher-current-logo" />
                ) : null}
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
                  <div className="library-switcher-divider" />
                  <Link to="/libraries" className="library-switcher-item library-switcher-item--add" onClick={() => setSwitcherOpen(false)}>
                    <PlusCircle size={15} /> Join another library
                  </Link>
                  <Link to="/admin/create-library" className="library-switcher-item library-switcher-item--add" onClick={() => setSwitcherOpen(false)}>
                    <PlusCircle size={15} /> Start your own library
                  </Link>
                </div>
              )}
            </div>
          )}

          {isAuthenticated ? (
            <div className="account-menu">
              <button className="account-menu-btn" onClick={() => setAccountOpen((o) => !o)}>
                <User size={16} />
                <span>{profile?.display_name || 'Account'}</span>
                <ChevronDown size={14} />
              </button>
              {accountOpen && (
                <div className="account-menu-dropdown" onMouseLeave={() => setAccountOpen(false)}>
                  <Link to="/dashboard" className="account-menu-item" onClick={() => setAccountOpen(false)}>
                    <User size={15} /> Dashboard
                  </Link>
                  <Link to="/loans" className="account-menu-item" onClick={() => setAccountOpen(false)}>
                    <Clock size={15} /> Loans &amp; holds
                  </Link>
                  {adminLibraries.length > 0 && (
                    <Link to="/admin" className="account-menu-item" onClick={() => setAccountOpen(false)}>
                      <ShieldCheck size={15} /> Library admin
                    </Link>
                  )}
                  <div className="account-menu-divider" />
                  {activeLibrary && (
                    <button className="account-menu-item" onClick={handleLogOutOfLibrary}>
                      <DoorOpen size={15} /> Log out of {activeLibrary.name}
                    </button>
                  )}
                  <button className="account-menu-item account-menu-item--danger" onClick={handleSignOutOfOpenShelf}>
                    <LogOut size={15} /> Log out of OpenShelf
                  </button>
                </div>
              )}
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
