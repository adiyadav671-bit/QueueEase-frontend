import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { serviceApi, counterApi, userApi, queueApi } from '../services/api';

const AdminDashboard = () => {
  const { user } = useAuth();

  // Active Tab state: 'services' | 'counters' | 'users' | 'queues'
  const [activeTab, setActiveTab] = useState('services');

  // Data states
  const [services, setServices] = useState([]);
  const [counters, setCounters] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedQueueServiceId, setSelectedQueueServiceId] = useState('');
  const [queueStatus, setQueueStatus] = useState(null);

  // Loading & Message states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Form states for Service CRUD
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '', active: true });

  // Form states for Counter CRUD
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [editingCounterId, setEditingCounterId] = useState(null);
  const [counterForm, setCounterForm] = useState({ name: '', serviceId: '', active: true });

  // User search/filter
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // 1. Load Services
  const fetchServices = useCallback(async () => {
    try {
      const res = await serviceApi.getAll(false); // get all including inactive
      setServices(res.data || []);
      if (!selectedQueueServiceId && res.data?.length > 0) {
        setSelectedQueueServiceId(String(res.data[0].id));
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  }, [selectedQueueServiceId]);

  // 2. Load Counters
  const fetchCounters = useCallback(async () => {
    try {
      const res = await counterApi.getAll();
      setCounters(res.data || []);
    } catch (err) {
      console.error('Failed to load counters:', err);
    }
  }, []);

  // 3. Load Users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await userApi.getAll();
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }, []);

  // 4. Load Queue status for selected service
  const fetchQueueStatus = useCallback(async (serviceId) => {
    if (!serviceId) return;
    try {
      const res = await queueApi.getServiceQueue(serviceId);
      setQueueStatus(res.data);
    } catch (err) {
      console.error('Failed to load queue status:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchServices(), fetchCounters(), fetchUsers()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchServices, fetchCounters, fetchUsers]);

  // Queue status update when selected service changes
  useEffect(() => {
    if (activeTab === 'queues' && selectedQueueServiceId) {
      fetchQueueStatus(selectedQueueServiceId);
    }
  }, [activeTab, selectedQueueServiceId, fetchQueueStatus]);

  // ==================== SERVICE CRUD ACTIONS ====================

  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setServiceForm({ name: '', description: '', active: true });
    setShowServiceForm(true);
  };

  const handleOpenEditService = (service) => {
    setEditingServiceId(service.id);
    setServiceForm({
      name: service.name || '',
      description: service.description || '',
      active: service.active ?? true,
    });
    setShowServiceForm(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) {
      setMessage({ type: 'error', text: 'Service name cannot be empty.' });
      return;
    }

    try {
      if (editingServiceId) {
        await serviceApi.update(editingServiceId, serviceForm);
        setMessage({ type: 'success', text: `Service '${serviceForm.name}' updated successfully.` });
      } else {
        await serviceApi.create(serviceForm);
        setMessage({ type: 'success', text: `New service '${serviceForm.name}' created successfully.` });
      }
      setShowServiceForm(false);
      setEditingServiceId(null);
      await fetchServices();
    } catch (err) {
      console.error('Save service error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save service.',
      });
    }
  };

  const handleDeleteService = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete service '${name}'?`)) return;

    try {
      await serviceApi.delete(id);
      setMessage({ type: 'success', text: `Service '${name}' deleted successfully.` });
      await fetchServices();
    } catch (err) {
      console.error('Delete service error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to delete service. Counters or tokens may be linked.',
      });
    }
  };

  // ==================== COUNTER CRUD ACTIONS ====================

  const handleOpenAddCounter = () => {
    setEditingCounterId(null);
    setCounterForm({
      name: '',
      serviceId: services.length > 0 ? String(services[0].id) : '',
      active: true,
    });
    setShowCounterForm(true);
  };

  const handleOpenEditCounter = (counter) => {
    setEditingCounterId(counter.id);
    setCounterForm({
      name: counter.name || '',
      serviceId: counter.serviceId ? String(counter.serviceId) : (services.length > 0 ? String(services[0].id) : ''),
      active: counter.active ?? true,
    });
    setShowCounterForm(true);
  };

  const handleSaveCounter = async (e) => {
    e.preventDefault();
    if (!counterForm.name.trim() || !counterForm.serviceId) {
      setMessage({ type: 'error', text: 'Counter name and service are required.' });
      return;
    }

    try {
      const payload = {
        name: counterForm.name.trim(),
        serviceId: Number(counterForm.serviceId),
        active: Boolean(counterForm.active),
      };

      if (editingCounterId) {
        await counterApi.update(editingCounterId, payload);
        setMessage({ type: 'success', text: `Counter '${counterForm.name}' updated successfully.` });
      } else {
        await counterApi.create(payload);
        setMessage({ type: 'success', text: `New counter '${counterForm.name}' created successfully.` });
      }
      setShowCounterForm(false);
      setEditingCounterId(null);
      await fetchCounters();
    } catch (err) {
      console.error('Save counter error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save counter desk.',
      });
    }
  };

  const handleDeleteCounter = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete counter '${name}'?`)) return;

    try {
      await counterApi.delete(id);
      setMessage({ type: 'success', text: `Counter '${name}' deleted successfully.` });
      await fetchCounters();
    } catch (err) {
      console.error('Delete counter error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to delete counter desk.',
      });
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (userRoleFilter === 'ALL') return true;
    return u.role?.toUpperCase() === userRoleFilter;
  });

  return (
    <div className="dashboard-container admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>Administrator Management Console</h1>
          <p className="welcome-text">
            Admin: <strong>{user?.name}</strong> ({user?.email})
          </p>
        </div>
        <div className="admin-status-pill">
          <span className="desk-indicator-dot"></span>
          <span>ADMIN ACCESS GRANTED</span>
        </div>
      </div>

      {/* Global Alerts */}
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
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Admin Tab Navigation */}
      <div className="admin-tabs-bar">
        <button
          className={`admin-tab-btn ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => { setActiveTab('services'); setMessage(null); }}
          id="tab-services"
        >
          🏢 Services ({services.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'counters' ? 'active' : ''}`}
          onClick={() => { setActiveTab('counters'); setMessage(null); }}
          id="tab-counters"
        >
          🖥️ Counters ({counters.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => { setActiveTab('users'); setMessage(null); }}
          id="tab-users"
        >
          👥 Users ({users.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'queues' ? 'active' : ''}`}
          onClick={() => { setActiveTab('queues'); setMessage(null); }}
          id="tab-queues"
        >
          📊 Queue Status
        </button>
      </div>

      {/* ==============================================================
          TAB 1: SERVICES MANAGEMENT (Add, Edit, Delete, View)
          ============================================================== */}
      {activeTab === 'services' && (
        <div className="admin-tab-content">
          <div className="tab-action-header">
            <div>
              <h3>Service Departments</h3>
              <p className="tab-subtext">Manage official campus departments and available queue services.</p>
            </div>
            {!showServiceForm && (
              <button
                className="btn btn-primary"
                onClick={handleOpenAddService}
                id="btn-add-service"
              >
                + Add New Service
              </button>
            )}
          </div>

          {/* Add / Edit Service Form */}
          {showServiceForm && (
            <div className="card admin-form-card">
              <div className="card-header">
                <h4>{editingServiceId ? 'Edit Service' : 'Create New Service'}</h4>
              </div>
              <form onSubmit={handleSaveService} className="admin-form">
                <div className="form-group">
                  <label htmlFor="service-name">Service Name *</label>
                  <input
                    id="service-name"
                    type="text"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="e.g. Examinations & Records"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="service-desc">Description</label>
                  <textarea
                    id="service-desc"
                    rows="2"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    placeholder="Brief description of service requirements and queries handled..."
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={serviceForm.active}
                      onChange={(e) => setServiceForm({ ...serviceForm, active: e.target.checked })}
                    />
                    <span> Active & Accepting Tokens</span>
                  </label>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" id="btn-save-service">
                    {editingServiceId ? 'Update Service' : 'Create Service'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowServiceForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Services Table */}
          <div className="table-responsive">
            <table className="custom-table admin-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Service Name</th>
                  <th>Description</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '160px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-table-cell">No services found. Click [+ Add New Service] to create one.</td>
                  </tr>
                ) : (
                  services.map((svc) => (
                    <tr key={svc.id}>
                      <td><strong>#{svc.id}</strong></td>
                      <td>
                        <strong>{svc.name}</strong>
                      </td>
                      <td className="desc-cell">{svc.description || '—'}</td>
                      <td>
                        <span className={`status-badge ${svc.active ? 'status-serving' : 'status-completed'}`}>
                          {svc.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="table-action-buttons">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenEditService(svc)}
                            title="Edit Service"
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteService(svc.id, svc.name)}
                            title="Delete Service"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 2: COUNTERS MANAGEMENT (Add, Edit, Delete, View)
          ============================================================== */}
      {activeTab === 'counters' && (
        <div className="admin-tab-content">
          <div className="tab-action-header">
            <div>
              <h3>Counter Desks</h3>
              <p className="tab-subtext">Manage service desks and their assigned department services.</p>
            </div>
            {!showCounterForm && (
              <button
                className="btn btn-primary"
                onClick={handleOpenAddCounter}
                id="btn-add-counter"
              >
                + Add New Counter
              </button>
            )}
          </div>

          {/* Add / Edit Counter Form */}
          {showCounterForm && (
            <div className="card admin-form-card">
              <div className="card-header">
                <h4>{editingCounterId ? 'Edit Counter' : 'Create New Counter'}</h4>
              </div>
              <form onSubmit={handleSaveCounter} className="admin-form">
                <div className="form-group">
                  <label htmlFor="counter-name">Counter Name *</label>
                  <input
                    id="counter-name"
                    type="text"
                    value={counterForm.name}
                    onChange={(e) => setCounterForm({ ...counterForm, name: e.target.value })}
                    placeholder="e.g. Counter 3 - Fees"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="counter-service">Assigned Service Department *</label>
                  <select
                    id="counter-service"
                    value={counterForm.serviceId}
                    onChange={(e) => setCounterForm({ ...counterForm, serviceId: e.target.value })}
                    required
                  >
                    <option value="">Select Service...</option>
                    {services.map((svc) => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={counterForm.active}
                      onChange={(e) => setCounterForm({ ...counterForm, active: e.target.checked })}
                    />
                    <span> Active Counter</span>
                  </label>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" id="btn-save-counter">
                    {editingCounterId ? 'Update Counter' : 'Create Counter'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowCounterForm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Counters Table */}
          <div className="table-responsive">
            <table className="custom-table admin-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Counter Desk</th>
                  <th>Assigned Service</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '160px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {counters.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-table-cell">No counter desks configured yet.</td>
                  </tr>
                ) : (
                  counters.map((cnt) => (
                    <tr key={cnt.id}>
                      <td><strong>#{cnt.id}</strong></td>
                      <td>
                        <strong>{cnt.name}</strong>
                      </td>
                      <td>
                        <span className="service-tag-pill">{cnt.serviceName || 'Unassigned'}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${cnt.active ? 'status-serving' : 'status-completed'}`}>
                          {cnt.active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="table-action-buttons">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenEditCounter(cnt)}
                            title="Edit Counter"
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteCounter(cnt.id, cnt.name)}
                            title="Delete Counter"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 3: USERS (View, Filter)
          ============================================================== */}
      {activeTab === 'users' && (
        <div className="admin-tab-content">
          <div className="tab-action-header">
            <div>
              <h3>System Users Directory</h3>
              <p className="tab-subtext">View registered college users, role privileges, and credentials status.</p>
            </div>
            <div className="user-filter-bar">
              <label>Filter Role: </label>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={{ width: '140px' }}
              >
                <option value="ALL">All Roles ({users.length})</option>
                <option value="CUSTOMER">Customers</option>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Administrators</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table admin-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th style={{ width: '130px' }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-table-cell">No users found matching filter.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td><strong>{u.name}</strong></td>
                      <td>{u.email}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            u.role === 'ADMIN'
                              ? 'status-serving'
                              : u.role === 'STAFF'
                              ? 'status-waiting'
                              : 'status-completed'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 4: QUEUE INFORMATION (View Services, Waiting Tokens, Status)
          ============================================================== */}
      {activeTab === 'queues' && (
        <div className="admin-tab-content">
          <div className="tab-action-header">
            <div>
              <h3>Live Queue Overview</h3>
              <p className="tab-subtext">Inspect real-time token queues, waiting lines, and counter service status.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
              <select
                value={selectedQueueServiceId}
                onChange={(e) => {
                  setSelectedQueueServiceId(e.target.value);
                  fetchQueueStatus(e.target.value);
                }}
                style={{ width: '240px' }}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => fetchQueueStatus(selectedQueueServiceId)}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Queue Snapshot Cards */}
          <div className="staff-metrics-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="metric-box">
              <div className="metric-label">Total Waiting Tokens</div>
              <div className="metric-value font-bold text-primary">
                {queueStatus?.totalWaiting ?? 0}
              </div>
              <div className="metric-sub">In queue for {queueStatus?.serviceName || 'service'}</div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Currently Serving</div>
              <div className="metric-value font-bold text-success">
                {queueStatus?.currentlyServingTokens || 'None'}
              </div>
              <div className="metric-sub">Active counter service</div>
            </div>

            <div className="metric-box">
              <div className="metric-label">Department</div>
              <div className="metric-value font-bold" style={{ fontSize: '1.3rem' }}>
                {queueStatus?.serviceName || '—'}
              </div>
              <div className="metric-sub">Selected Queue</div>
            </div>
          </div>

          {/* Waiting Tokens Detail Table */}
          <div className="card">
            <div className="card-header">
              <h4>Waiting Tokens Line ({queueStatus?.waitingList?.length || 0})</h4>
            </div>
            <div className="card-body" style={{ padding: '0' }}>
              {(!queueStatus?.waitingList || queueStatus.waitingList.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '2rem' }}>☕</div>
                  <p style={{ marginTop: '0.5rem', color: '#64748b' }}>
                    No waiting tokens in this department queue right now.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>Token #</th>
                        <th>Customer</th>
                        <th>Arrival Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queueStatus.waitingList.map((tok, idx) => (
                        <tr key={tok.id}>
                          <td><strong>#{idx + 1}</strong></td>
                          <td><span className="history-token-pill">{tok.tokenNumber}</span></td>
                          <td>
                            <div style={{ fontWeight: '600' }}>{tok.customerName}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{tok.customerEmail}</div>
                          </td>
                          <td className="time-cell">
                            {new Date(tok.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td><span className="status-badge status-waiting">WAITING</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
