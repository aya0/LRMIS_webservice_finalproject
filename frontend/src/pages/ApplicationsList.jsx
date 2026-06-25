import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listApplications } from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../context/StatusBadge';

const STATUSES = ['','submitted','pre_checked','survey_required','surveyed','legal_review','approved','certificate_issued','closed','rejected','on_hold','missing_documents','under_objection'];
const TYPES = ['','first_registration','ownership_transfer','parcel_subdivision','parcel_merge','boundary_correction','certificate_request'];

export default function ApplicationsList() {
  const { auth } = useAuth();
  const staff = auth?.staff;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ status: '', application_type: '', zone_id: '', priority: '' });
  const [loading, setLoading] = useState(false);

  const load = (p = 1) => {
    setLoading(true);
    const params = { page: p, page_size: 15, sort_by: 'timestamps.submitted_at', sort_order: -1 };
    if (filters.status) params.status = filters.status;
    if (filters.application_type) params.application_type = filters.application_type;
    if (filters.zone_id) params.zone_id = filters.zone_id;
    if (filters.priority) params.priority = filters.priority;
    if (staff?.id) {
      params.assigned_staff_id = staff.id;
      params.assigned_staff_role = staff.role;
    }
    listApplications(params).then(res => {
      setItems(res.data.items || []);
      setTotal(res.data.total);
      setPages(res.data.pages);
      setPage(p);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, [filters]);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  return (
    <div className="module1-shell">
      <section className="module1-hero">
        <span className="module1-kicker">Module 1 · Land Applications</span>
        <h1 className="module1-title">My assigned applications</h1>
        <p className="module1-subtitle">
          Review the applications assigned to your staff account and track them through the workflow.
        </p>

        <div className="module1-stats" style={{ marginTop: 22 }}>
          <div className="module1-stat">
            <div className="module1-stat-label">Total</div>
            <div className="module1-stat-value">{total}</div>
          </div>
          <div className="module1-stat">
            <div className="module1-stat-label">Page</div>
            <div className="module1-stat-value">{page}/{pages}</div>
          </div>
          <div className="module1-stat">
            <div className="module1-stat-label">Visible</div>
            <div className="module1-stat-value">{items.length}</div>
          </div>
          <div className="module1-stat">
            <div className="module1-stat-label">Pages</div>
            <div className="module1-stat-value">{pages}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <Link to="/submit" className="btn btn-primary">+ New Application</Link>
          <Link to="/parcels" className="btn btn-outline">Open Parcels</Link>
          <Link to="/certificates" className="btn btn-outline">Open Certificates</Link>
        </div>
      </section>

      {/* Filters */}
      <div className="module1-card module1-card-accent">
        <div className="module1-toolbar">
          <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
            <label>Status</label>
            <select value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s || 'All'}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
            <label>Type</label>
            <select value={filters.application_type} onChange={e => setFilter('application_type', e.target.value)}>
              {TYPES.map(t => <option key={t} value={t}>{t ? t.replace(/_/g,' ') : 'All'}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
            <label>Zone</label>
            <input value={filters.zone_id} onChange={e => setFilter('zone_id', e.target.value)} placeholder="e.g. ZONE-RM-01" />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 120 }}>
            <label>Priority</label>
            <select value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
              <option value="">All</option>
              {['urgent','high','normal','low'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setFilters({ status:'',application_type:'',zone_id:'',priority:'' })}>
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="module1-card">
        {loading ? <div className="loading">Loading…</div> : (
          <div className="table-wrap">
            <table className="module1-table">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Type</th>
                  <th>Zone</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={7} className="empty">No applications found.</td></tr>
                ) : items.map(app => (
                  <tr key={app.id}>
                    <td><strong>{app.application_id}</strong></td>
                    <td>{app.application_type?.replace(/_/g,' ')}</td>
                    <td>{app.parcel_ref?.zone_id}</td>
                    <td><span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{app.priority}</span></td>
                    <td><StatusBadge status={app.status} /></td>
                    <td>{app.timestamps?.submitted_at ? new Date(app.timestamps.submitted_at).toLocaleDateString() : '-'}</td>
                    <td>
                      <Link to={`/applications/${app.application_id}`} className="btn btn-outline btn-sm">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => load(page - 1)}>‹ Prev</button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} className={page === p ? 'active' : ''} onClick={() => load(p)}>{p}</button>
            ))}
            <button disabled={page >= pages} onClick={() => load(page + 1)}>Next ›</button>
          </div>
        )}
      </div>
    </div>
  );
}
