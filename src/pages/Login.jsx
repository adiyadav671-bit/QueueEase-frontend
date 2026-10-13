import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    const result = await login(email, password);
    if (result.success) {
      if (result.user.role === 'ADMIN') navigate('/admin');
      else if (result.user.role === 'STAFF') navigate('/staff');
      else navigate('/customer');
    } else {
      setErrorMessage(result.error);
    }
  };

  const fillCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMessage('');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo">🎟️</span>
          <h2>Welcome Back</h2>
          <p>Sign in to access your queue dashboard</p>
        </div>

        {errorMessage && (
          <div className="alert alert-danger">
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="Enter your email"
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
              placeholder="Enter your password"
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
            {loading ? '⏳ Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div className="demo-credentials">
          <div className="demo-title">⚡ Quick Demo Login</div>
          <div className="demo-buttons">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => fillCredentials('aditya@gmail.com', '123456')}
            >
              👑 Admin
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => fillCredentials('staff@qms.com', 'staff123')}
            >
              👷 Staff
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => fillCredentials('rahul@gmail.com', 'user123')}
            >
              👤 Customer
            </button>
          </div>
        </div>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/register">Create one here →</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
