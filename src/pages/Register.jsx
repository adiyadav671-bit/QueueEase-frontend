import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [errorMessage, setErrorMessage] = useState('');
  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!name || !email || !password) {
      setErrorMessage('Please fill in all fields.');
      return;
    }
    if (password.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }
    const result = await register(name, email, password, role);
    if (result.success) {
      if (result.user.role === 'STAFF') navigate('/staff');
      else navigate('/customer');
    } else {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">🎟️</span>
          <h2>Create Account</h2>
          <p>Register to access the Queue Management System</p>
        </div>

        {errorMessage && (
          <div className="alert alert-danger">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Role Selector */}
          <div className="role-selector">
            <div
              className={`role-option ${role === 'CUSTOMER' ? 'active' : ''}`}
              onClick={() => setRole('CUSTOMER')}
            >
              <span className="role-option-icon">👤</span>
              <span className="role-option-label">Customer</span>
              <span className="role-option-desc">Get queue tokens</span>
            </div>
            <div
              className={`role-option ${role === 'STAFF' ? 'active' : ''}`}
              onClick={() => setRole('STAFF')}
            >
              <span className="role-option-icon">👷</span>
              <span className="role-option-label">Staff</span>
              <span className="role-option-desc">Manage queue</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              className="form-control"
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="e.g. rahul@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="At least 4 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
          >
            {loading
              ? '⏳ Creating Account...'
              : `Register as ${role === 'STAFF' ? '👷 Staff' : '👤 Customer'} →`}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in here →</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
