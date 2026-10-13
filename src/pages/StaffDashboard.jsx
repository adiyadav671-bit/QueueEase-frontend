import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { serviceApi, counterApi, queueApi, staffApi } from '../services/api';

const StaffDashboard = () => {
  const { user } = useAuth();

  // State for services & counters selection
  const [services, setServices] = useState([]);
  const [counters, setCounters] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(() => {
    return localStorage.getItem('qms_staff_service') || '';
  });
  const [selectedCounterId, setSelectedCounterId] = useState(() => {
    return localStorage.getItem('qms_staff_counter') || '';
  });

  // State for queue data
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // 1. Fetch available Services and Counters
  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        const [servicesRes, countersRes] = await Promise.all([
          serviceApi.getAll(true),
          counterApi.getAll(),
        ]);

        const activeServices = servicesRes.data || [];
        const allCounters = countersRes.data || [];

        setServices(activeServices);
        setCounters(allCounters);

        // Auto-select initial service if not already chosen or invalid
        if (activeServices.length > 0) {
          setSelectedServiceId((prev) => {
            const exists = activeServices.some((s) => String(s.id) === String(prev));
            const validServiceId = exists ? prev : String(activeServices[0].id);
            localStorage.setItem('qms_staff_service', validServiceId);
            return validServiceId;
          });
        }

        // Auto-select initial counter if available
        if (allCounters.length > 0) {
          setSelectedCounterId((prev) => {
            const exists = allCounters.some((c) => String(c.id) === String(prev));
            const validCounterId = exists ? prev : String(allCounters[0].id);
            localStorage.setItem('qms_staff_counter', validCounterId);
            return validCounterId;
          });
        }
      } catch (err) {
        console.error('Failed to load services and counters:', err);
        setMessage({
          type: 'error',
          text: 'Failed to connect to backend server or fetch services/counters.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPrerequisites();
  }, []);

  // 2. Fetch current queue for the selected service
  const fetchQueue = useCallback(async (serviceId, silent = false) => {
    if (!serviceId) return;
    if (!silent) setLoading(true);

    try {
      const response = await queueApi.getServiceQueue(serviceId);
      setQueueData(response.data);
    } catch (err) {
      console.error('Error fetching service queue:', err);
      if (!silent) {
        setMessage({
          type: 'error',
          text: err.response?.data?.message || 'Failed to fetch queue data.',
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Trigger queue fetch when selected service changes
  useEffect(() => {
    if (selectedServiceId) {
      fetchQueue(selectedServiceId);
      localStorage.setItem('qms_staff_service', selectedServiceId);
    }
  }, [selectedServiceId, fetchQueue]);

  // Save counter selection to localStorage
  useEffect(() => {
    if (selectedCounterId) {
      localStorage.setItem('qms_staff_counter', selectedCounterId);
    }
  }, [selectedCounterId]);

  // Periodic polling for fresh queue status every 8 seconds
  useEffect(() => {
    if (!selectedServiceId) return;

    const intervalId = setInterval(() => {
      fetchQueue(selectedServiceId, true);
    }, 8000);

    return () => clearInterval(intervalId);
  }, [selectedServiceId, fetchQueue]);

  // 3. Queue Action Handlers

  // CALL NEXT token
  const handleCallNext = async () => {
    if (!selectedServiceId) {
      setMessage({ type: 'error', text: 'Please select a service first.' });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      const counterIdParam = selectedCounterId ? Number(selectedCounterId) : null;
      const res = await staffApi.callNext(selectedServiceId, counterIdParam);
      const calledToken = res.data;

      const deskName =
        counters.find((c) => String(c.id) === String(selectedCounterId))?.name || 'Counter Desk';

      setMessage({
        type: 'success',
        text: `Now Serving Token: ${calledToken.tokenNumber} (${calledToken.customerName}) at ${deskName}!`,
      });

      // Refresh queue immediately
      await fetchQueue(selectedServiceId, true);
    } catch (err) {
      console.error('Call next error:', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data ||
        'Failed to call next token. Queue may be empty.';
      setMessage({
        type: 'error',
        text: typeof errMsg === 'string' ? errMsg : 'No waiting customers in queue.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // COMPLETE token
  const handleComplete = async (tokenId, tokenNumber) => {
    if (!tokenId) return;

    setActionLoading(true);
    setMessage(null);

    try {
      await staffApi.completeToken(tokenId);
      setMessage({
        type: 'success',
        text: `Token ${tokenNumber || tokenId} marked as COMPLETED. Service transaction finalized!`,
      });

      // Refresh queue immediately
      await fetchQueue(selectedServiceId, true);
    } catch (err) {
      console.error('Complete token error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to complete token service.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // SKIP token (can skip serving token or waiting token)
  const handleSkip = async (tokenId, tokenNumber) => {
    if (!tokenId) return;

    setActionLoading(true);
    setMessage(null);

    try {
      await staffApi.skipToken(tokenId);
      setMessage({
        type: 'success',
        text: `Token ${tokenNumber || tokenId} marked as SKIPPED.`,
      });

      // Refresh queue immediately
      await fetchQueue(selectedServiceId, true);
    } catch (err) {
      console.error('Skip token error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to skip token.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Determine currently serving token for this staff counter/service
  const servingList = queueData?.servingList || [];
  const waitingList = queueData?.waitingList || [];
  const totalWaiting = queueData?.totalWaiting ?? waitingList.length;

  // Find token currently serving at this specific counter desk, or fallback to the latest serving token
  const myServingToken =
    servingList.find((t) => String(t.counterId) === String(selectedCounterId)) ||
    (servingList.length > 0 ? servingList[0] : null);

  const selectedServiceName =
    services.find((s) => String(s.id) === String(selectedServiceId))?.name || 'Selected Service';

  const selectedCounterName =
    counters.find((c) => String(c.id) === String(selectedCounterId))?.name || 'Counter Desk';

  return (
    <div className="dashboard-container staff-dashboard">
      {/* Top Header */}
      <div className="dashboard-header">
        <div>
          <h1>Staff Counter Console</h1>
          <p className="welcome-text">
            Staff Operator: <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>
        <button
          className="btn btn-secondary refresh-btn"
          onClick={() => fetchQueue(selectedServiceId)}
          disabled={loading || actionLoading}
          title="Refresh Queue"
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Queue'}
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Desk Assignment Selector Bar */}
      <div className="staff-desk-bar card">
        <div className="desk-bar-grid">
          <div className="form-group desk-select-group">
            <label htmlFor="service-select">Assigned Service</label>
            <select
              id="service-select"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              disabled={actionLoading}
            >
              {services.map((svc) => (
                <option key={svc.id} value={svc.id}>
                  {svc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group desk-select-group">
            <label htmlFor="counter-select">Counter Desk</label>
            <select
              id="counter-select"
              value={selectedCounterId}
              onChange={(e) => setSelectedCounterId(e.target.value)}
              disabled={actionLoading}
            >
              {counters.length === 0 && <option value="">No counters configured</option>}
              {counters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.serviceName ? `(${c.serviceName})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="desk-status-badge-container">
            <div className="desk-status-label">Active Station</div>
            <div className="desk-station-pill">
              <span className="desk-indicator-dot"></span>
              <strong>{selectedCounterName}</strong>
              <span className="desk-sep">•</span>
              <span>{selectedServiceName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="staff-metrics-grid">
        <div className="metric-box">
          <div className="metric-label">Queue Size (Waiting)</div>
          <div className="metric-value font-bold text-primary">{totalWaiting}</div>
          <div className="metric-sub">Customers waiting in line</div>
        </div>

        <div className="metric-box">
          <div className="metric-label">Currently Serving</div>
          <div className="metric-value font-bold text-success">
            {myServingToken ? myServingToken.tokenNumber : 'None'}
          </div>
          <div className="metric-sub">
            {myServingToken
              ? `${myServingToken.customerName}`
              : 'Counter is currently idle'}
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-label">Assigned Desk</div>
          <div className="metric-value font-bold">{selectedCounterName}</div>
          <div className="metric-sub">{selectedServiceName}</div>
        </div>
      </div>

      {/* Main Staff Work Area */}
      <div className="staff-work-grid">
        {/* Left Column: Currently Serving Token Card & Quick Actions */}
        <div className="staff-primary-column">
          {/* 1. MOST IMPORTANT ACTION: CALL NEXT BUTTON */}
          <div className="call-next-container card">
            <button
              className="btn btn-call-next"
              onClick={handleCallNext}
              disabled={actionLoading || totalWaiting === 0}
              id="btn-call-next-token"
            >
              <div className="call-next-content">
                <span className="call-next-icon">📢</span>
                <div className="call-next-text">
                  <span className="call-next-title">
                    {actionLoading ? 'Calling Customer...' : 'CALL NEXT CUSTOMER'}
                  </span>
                  <span className="call-next-subtitle">
                    {totalWaiting > 0
                      ? `Next: Token ${waitingList[0]?.tokenNumber} (${waitingList[0]?.customerName}) • ${totalWaiting} waiting`
                      : 'No waiting customers in queue'}
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* 2. CURRENTLY SERVING TOKEN CARD */}
          <div className="card serving-hero-card">
            <div className="card-header serving-header">
              <div className="serving-title-block">
                <span className="serving-label">CURRENTLY SERVING AT THIS COUNTER</span>
                <h3>Active Customer Ticket</h3>
              </div>
              <span
                className={`status-badge ${
                  myServingToken ? 'status-serving' : 'status-completed'
                }`}
              >
                {myServingToken ? 'IN PROGRESS (SERVING)' : 'DESK IDLE'}
              </span>
            </div>

            <div className="card-body">
              {myServingToken ? (
                <div className="active-token-view">
                  <div className="active-token-banner">
                    <div className="active-token-number">{myServingToken.tokenNumber}</div>
                    <div className="active-customer-info">
                      <div className="active-customer-name">{myServingToken.customerName}</div>
                      <div className="active-customer-email">{myServingToken.customerEmail}</div>
                      <div className="active-meta-tags">
                        <span className="active-tag">Service: {myServingToken.serviceName}</span>
                        <span className="active-tag">
                          Desk: {myServingToken.counterName || selectedCounterName}
                        </span>
                        <span className="active-tag">
                          Called: {new Date(myServingToken.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons for Current Serving Token */}
                  <div className="serving-action-buttons">
                    <button
                      className="btn btn-success btn-action-lg"
                      onClick={() =>
                        handleComplete(myServingToken.id, myServingToken.tokenNumber)
                      }
                      disabled={actionLoading}
                      id="btn-complete-service"
                    >
                      ✓ COMPLETE SERVICE
                    </button>
                    <button
                      className="btn btn-warning btn-action-lg"
                      onClick={() =>
                        handleSkip(myServingToken.id, myServingToken.tokenNumber)
                      }
                      disabled={actionLoading}
                      id="btn-skip-token"
                    >
                      ⏭ SKIP TOKEN
                    </button>
                  </div>
                </div>
              ) : (
                <div className="empty-serving-state">
                  <div className="empty-icon">☕</div>
                  <h4>No Customer Currently Being Served</h4>
                  <p>
                    {totalWaiting > 0
                      ? 'There are customers waiting in line. Click [CALL NEXT CUSTOMER] to call the next ticket.'
                      : 'The waiting queue is currently clear for this service.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Waiting Queue List */}
        <div className="staff-secondary-column">
          <div className="card queue-list-card">
            <div className="card-header queue-list-header">
              <div>
                <h4>Waiting Queue ({waitingList.length})</h4>
                <p className="card-subtitle">Customers in line for {selectedServiceName}</p>
              </div>
              <span className="badge badge-primary">{waitingList.length} in line</span>
            </div>

            <div className="card-body" style={{ padding: '0' }}>
              {waitingList.length === 0 ? (
                <div className="empty-queue-box">
                  <div className="empty-icon">🎉</div>
                  <p className="empty-title">Queue is empty!</p>
                  <p className="empty-desc">No customers currently waiting for this service.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table staff-queue-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Token</th>
                        <th>Customer</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitingList.map((token, index) => (
                        <tr key={token.id} className={index === 0 ? 'next-in-line-row' : ''}>
                          <td>
                            <span className="queue-pos-badge">#{index + 1}</span>
                          </td>
                          <td>
                            <span className="history-token-pill">{token.tokenNumber}</span>
                          </td>
                          <td>
                            <div className="table-user-name">{token.customerName}</div>
                            <div className="table-user-email">{token.customerEmail}</div>
                          </td>
                          <td>
                            <span className="status-badge status-waiting">WAITING</span>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleSkip(token.id, token.tokenNumber)}
                              disabled={actionLoading}
                              title="Skip customer (absent / no-show)"
                            >
                              Skip
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
