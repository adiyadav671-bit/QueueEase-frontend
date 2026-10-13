import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { serviceApi, tokenApi } from '../services/api';

const CustomerDashboard = () => {
  const { user } = useAuth();

  // State
  const [services, setServices] = useState([]);
  const [tokenHistory, setTokenHistory] = useState([]);
  const [activeToken, setActiveToken] = useState(null);
  const [tokenPosition, setTokenPosition] = useState(null);

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [cancellingToken, setCancellingToken] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Fetch available services
  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const res = await serviceApi.getAll(true);
      setServices(res.data);
    } catch (err) {
      console.error('Failed to load services:', err);
      setErrorMessage('Failed to load available services.');
    } finally {
      setLoadingServices(false);
    }
  };

  // 2. Fetch customer token history and find active token
  const fetchTokenHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingHistory(true);
      const res = await tokenApi.getUserTokens(user.id);
      const tokens = res.data;
      setTokenHistory(tokens);

      // Find first WAITING or SERVING token
      const currentActive = tokens.find(
        (t) => t.status === 'WAITING' || t.status === 'SERVING'
      );
      setActiveToken(currentActive || null);

      if (currentActive) {
        fetchPosition(currentActive.id);
      } else {
        setTokenPosition(null);
      }
    } catch (err) {
      console.error('Failed to load token history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [user?.id]);

  // 3. Fetch real-time position for active token
  const fetchPosition = async (tokenId) => {
    try {
      const res = await tokenApi.getPosition(tokenId);
      setTokenPosition(res.data);
    } catch (err) {
      console.error('Failed to fetch position:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchServices();
    fetchTokenHistory();
  }, [fetchTokenHistory]);

  // Periodic refresh every 10 seconds for real-time queue position
  useEffect(() => {
    if (!activeToken) return;
    const interval = setInterval(() => {
      fetchPosition(activeToken.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [activeToken]);

  // 4. Handle Token Generation
  const handleTakeToken = async (serviceId, serviceName) => {
    setErrorMessage('');
    setSuccessMessage('');
    setGeneratingToken(true);

    try {
      const res = await tokenApi.generate({
        userId: user.id,
        serviceId: serviceId,
      });

      setSuccessMessage(
        `Token #${res.data.tokenNumber} generated successfully for ${serviceName}!`
      );
      // Refresh history and active token
      await fetchTokenHistory();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Could not generate token. Please try again.';
      setErrorMessage(msg);
    } finally {
      setGeneratingToken(false);
    }
  };

  // 5. Handle Token Cancellation
  const handleCancelToken = async () => {
    if (!activeToken) return;

    const confirmCancel = window.confirm(
      `Are you sure you want to cancel Token #${activeToken.tokenNumber}?`
    );
    if (!confirmCancel) return;

    setErrorMessage('');
    setSuccessMessage('');
    setCancellingToken(true);

    try {
      await tokenApi.cancel(activeToken.id, user.id);
      setSuccessMessage(`Token #${activeToken.tokenNumber} was cancelled successfully.`);
      setActiveToken(null);
      setTokenPosition(null);
      await fetchTokenHistory();
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Failed to cancel token. Please try again.';
      setErrorMessage(msg);
    } finally {
      setCancellingToken(false);
    }
  };

  // Helper for status badge styling
  const getStatusBadge = (status) => {
    const s = status ? status.toUpperCase() : 'UNKNOWN';
    switch (s) {
      case 'WAITING':
        return <span className="status-badge status-waiting">WAITING</span>;
      case 'SERVING':
        return <span className="status-badge status-serving">SERVING NOW</span>;
      case 'COMPLETED':
        return <span className="status-badge status-completed">COMPLETED</span>;
      case 'SKIPPED':
        return <span className="status-badge status-skipped">SKIPPED</span>;
      case 'CANCELLED':
        return <span className="status-badge status-cancelled">CANCELLED</span>;
      default:
        return <span className="status-badge">{s}</span>;
    }
  };

  return (
    <div className="customer-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Customer Portal</h1>
          <p className="welcome-text">
            Welcome, <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>
        <button
          className="btn btn-outline btn-sm refresh-btn"
          onClick={() => {
            fetchServices();
            fetchTokenHistory();
          }}
          title="Refresh Queue Information"
        >
          🔄 Refresh Status
        </button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="alert alert-danger" role="alert">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: MY CURRENT TOKEN (LIVE QUEUE CARD)            */}
      {/* ======================================================== */}
      <div className="section-block">
        <h2 className="section-title">My Active Queue Token</h2>

        {activeToken ? (
          <div className="live-token-card">
            <div className="token-card-top">
              <div className="token-main-badge">
                <span className="token-label">YOUR TOKEN</span>
                <span className="token-number-hero">
                  #{activeToken.tokenNumber}
                </span>
                <div className="token-service-tag">
                  {activeToken.serviceName}
                </div>
              </div>

              <div className="token-status-pill">
                {getStatusBadge(tokenPosition?.queueStatus || activeToken.status)}
              </div>
            </div>

            <div className="token-stats-grid">
              <div className="stat-box">
                <div className="stat-label">Currently Serving</div>
                <div className="stat-value highlight">
                  {tokenPosition?.currentlyServingToken || 'None'}
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-label">People Ahead</div>
                <div className="stat-value">
                  {tokenPosition ? (
                    tokenPosition.queueStatus === 'SERVING' ? (
                      <span className="text-success font-bold">It's your turn!</span>
                    ) : tokenPosition.peopleAhead === 0 ? (
                      <span className="text-primary font-bold">You are next!</span>
                    ) : (
                      <span>{tokenPosition.peopleAhead} ahead</span>
                    )
                  ) : (
                    'Calculating...'
                  )}
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Assigned Desk</div>
                <div className="stat-value">
                  {activeToken.counterName && activeToken.counterName !== 'Unassigned'
                    ? activeToken.counterName
                    : 'Awaiting Call'}
                </div>
              </div>
            </div>

            {/* Serving Alert Banner */}
            {activeToken.status === 'SERVING' && (
              <div className="serving-alert">
                🔔 <strong>YOUR TOKEN IS BEING CALLED!</strong> Please proceed to{' '}
                <strong>{activeToken.counterName || 'the assigned counter'}</strong>.
              </div>
            )}

            {/* Cancel Action (Only for WAITING status) */}
            {activeToken.status === 'WAITING' && (
              <div className="token-card-actions">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleCancelToken}
                  disabled={cancellingToken}
                >
                  {cancellingToken ? 'Cancelling...' : 'Cancel Token'}
                </button>
                <span className="cancel-note">
                  (You can cancel if you no longer wish to wait)
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state-card">
            <span className="empty-icon">🎟️</span>
            <h3>No Active Token</h3>
            <p>You do not currently have a token waiting in line.</p>
            <p className="empty-sub">
              Choose a service below to generate a new queue token.
            </p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: AVAILABLE SERVICES (TAKE TOKEN)              */}
      {/* ======================================================== */}
      <div className="section-block">
        <h2 className="section-title">Available Services</h2>

        {loadingServices ? (
          <p className="loading-text">Loading available services...</p>
        ) : services.length === 0 ? (
          <div className="alert alert-info">No active services currently available.</div>
        ) : (
          <div className="services-grid">
            {services.map((svc) => {
              const isServiceActiveForUser =
                activeToken && activeToken.serviceId === svc.id;

              return (
                <div key={svc.id} className="service-card">
                  <div className="service-card-body">
                    <h3 className="service-name">{svc.name}</h3>
                    <p className="service-desc">{svc.description || 'General Inquiry'}</p>
                  </div>

                  <div className="service-card-footer">
                    <button
                      className="btn btn-primary btn-block"
                      onClick={() => handleTakeToken(svc.id, svc.name)}
                      disabled={generatingToken || isServiceActiveForUser}
                    >
                      {isServiceActiveForUser ? 'Token Active' : 'Take Token'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: TOKEN HISTORY                                 */}
      {/* ======================================================== */}
      <div className="section-block">
        <h2 className="section-title">My Token History</h2>

        {loadingHistory ? (
          <p className="loading-text">Loading token history...</p>
        ) : tokenHistory.length === 0 ? (
          <div className="empty-state-card empty-history">
            <p>You have not generated any queue tokens yet.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Token #</th>
                  <th>Service</th>
                  <th>Counter Desk</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {tokenHistory.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="history-token-pill">#{item.tokenNumber}</span>
                    </td>
                    <td>
                      <strong>{item.serviceName}</strong>
                    </td>
                    <td>{item.counterName || 'Unassigned'}</td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td className="time-cell">
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
