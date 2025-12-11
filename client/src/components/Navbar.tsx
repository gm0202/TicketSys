import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const showAuthButtons = !user.isAuthenticated && (location.pathname === '/login' || location.pathname === '/signup');

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">MB</span>
          <span>Modex Booking</span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Shows
          </NavLink>

          {user.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              Dashboard
            </NavLink>
          )}

          {showAuthButtons && (
            <>
              <NavLink to="/signup" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                Sign up
              </NavLink>
              <NavLink to="/login" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                Login
              </NavLink>
            </>
          )}
          {user.isAuthenticated ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge">Role: {user.role}</span>
              <span className="muted">Hi, {user.name}</span>
              <button className="btn ghost" onClick={logout}>
                Logout
              </button>
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

