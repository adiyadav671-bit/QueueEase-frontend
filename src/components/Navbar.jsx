import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'STAFF') return '/staff';
    return '/customer';
  };

  const getRoleIcon = () => {
    if (!user) return '';
    if (user.role === 'ADMIN') return '👑';
    if (user.role === 'STAFF') return '👷';
    return '👤';
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to={getDashboardPath()} className="nav-brand">
          <span className="brand-icon">🎟️</span>
          <span className="brand-text">QueueEase</span>
        </Link>

        <div className="nav-links">
          {isAuthenticated ? (
            <>
              <Link to={getDashboardPath()} className="nav-link">
                Dashboard
              </Link>
              <div className="user-badge-container">
                <span className="user-name">
                  {getRoleIcon()} {user.name}
                </span>
                <span className={`role-badge role-${user.role.toLowerCase()}`}>
                  {user.role}
                </span>
              </div>
              <button onClick={handleLogout} className="btn btn-outline btn-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
