import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listApplications, transitionApplication, rejectApplication, issueCertificate } from '../api/client';
import StatusBadge from '../context/StatusBadge';

const ACTION_STATES = ['pre_checked','legal_review','approved','rejected','missing_documents','on_hold','under_objection'];

export default function StaffConsole() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const WATCH = ['submitted','pre_checked','survey_required','legal_review','missing_documents','under_objection'];

  const load = (status = activeFilter) => {
    setLoading(true);
    const params = { page: 1, page_size: 30, sort_by: 'timestamps.submitted_at', sort_order: -1 };
    if (status) params.status = status;
    listApplications(params)
      .then(r => setItems(r.data.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Load stats
    Promise.all(WATCH.map(s => listApplications({ status: s, page: 1, page_size: 1 })))
      .then(results => {
        const s = {};
        WATCH.forEach((status, i) => { s[status] = results[i].data.total; });
        setStats(s);
      });
  }, []);

  const flash = (m, isErr = false) => {
    if (isErr) setErr(m); else setMsg(m);
    setTimeout(() => { setErr(''); setMsg(''); }, 4000);
  };

  const quickTransition = async (appId, targetState) => {
    try {
      await transitionApplication(appId, { target_state: targetState, actor_id: 'registrar_console', actor_type: 'registrar' });
      flash(`✅ ${appId} → ${targetState}`); load();
    } catch (e) { flash(e.response?.data?.detail || 'Transition failed.', true); }
  };

  const quickReject = async (appId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await rejectApplication(appId, { reason, actor_id: 'registrar_console' });
      flash(`Application ${appId} rejected.`); load();
    } catch (e) { flash(e.response?.data?.detail || 'Reject failed.', true); }
  };

  const quickCertificate = async (appId) => {
    try {
      await issueCertificate(appId, 'registrar_console');
      flash(`✅ Certificate issued for ${appId}`); load();
    } catch (e) { flash(e.response?.data?.detail || 'Certificate failed.', true); }
  };

  const setFilter = (s) => { setActiveFilter(s); load(s); };

  return (
    <div>
      <div className="page-title">🏛️ Staff Console</div>
      <p className="page-sub">Registrar and staff management view</p>

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      {/* Quick stats */}
      <div className="grid-3 mb-16">
        {WATCH.map(s => (
          <div key={s} className="stat-card" style={{ cursor: 'pointer', border: activeFilter === s ? '2px solid var(--primary)' : undefined }}
            onClick={() => setFilter(activeFilter === s ? '' : s)}>
            <div className="label">{s.replace(/_/g,' ')}</div>
            <div className="value blue">{stats[s] || 0}</div>
          </div>
        ))}
      </div>

      {/* Active filter indicator */}
      {activeFilter && (
        <div className="flex-gap mb-16">
          <span>Filtering: <StatusBadge status={activeFilter} /></span>
          <button className="btn btn-outline btn-sm" onClick={() => setFilter('')}>Clear filter</button>
        </div>
      )}

      {/* Applications table */}
      <div className="card">
        <div className="flex-between mb-16">
          <div className="card-title" style={{marginBottom:0}}>Applications {activeFilter ? `— ${activeFilter}` : '(Active)'}</div>
          <button className="btn btn-outline btn-sm" onClick={() => load()}>↻ Refresh</button>
        </div>
        {loading ? <div className="loading">Loading…</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Zone</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0
                  ? <tr><td colSpan={7} className="empty">No applications in this category.</td></tr>
                  : items.map(app => (
                    <tr key={app.id}>
                      <td><Link to={`/applications/${app.application_id}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{app.application_id}</Link></td>
                      <td style={{ fontSize: '0.82rem' }}>{app.application_type?.replace(/_/g,' ')}</td>
                      <td>{app.parcel_ref?.zone_id}</td>
                      <td><span style={{ fontWeight: 600, fontSize: '0.82rem', color: app.priority === 'urgent' ? 'var(--danger)' : app.priority === 'high' ? 'var(--warning)' : 'inherit' }}>{app.priority}</span></td>
                      <td><StatusBadge status={app.status} /></td>
                      <td style={{ fontSize: '0.82rem' }}>{app.timestamps?.submitted_at ? new Date(app.timestamps.submitted_at).toLocaleDateString() : '-'}</td>
                      <td>
                        <div className="flex-gap">
                          {/* Show relevant actions per status */}
                          {app.status === 'submitted' && (
                            <button className="btn btn-primary btn-sm" onClick={() => quickTransition(app.application_id, 'pre_checked')}>Pre-check ✓</button>
                          )}
                          {app.status === 'pre_checked' && (
                            <button className="btn btn-primary btn-sm" onClick={() => quickTransition(app.application_id, 'survey_required')}>→ Survey</button>
                          )}
                          {app.status === 'surveyed' && (
                            <button className="btn btn-primary btn-sm" onClick={() => quickTransition(app.application_id, 'legal_review')}>→ Legal</button>
                          )}
                          {app.status === 'legal_review' && (
                            <button className="btn btn-success btn-sm" onClick={() => quickTransition(app.application_id, 'approved')}>Approve ✓</button>
                          )}
                          {app.status === 'approved' && (
                            <button className="btn btn-success btn-sm" onClick={() => quickCertificate(app.application_id)}>📜 Certify</button>
                          )}
                          {!['rejected','closed','certificate_issued'].includes(app.status) && (
                            <button className="btn btn-danger btn-sm" onClick={() => quickReject(app.application_id)}>✖</button>
                          )}
                          <Link to={`/applications/${app.application_id}`} className="btn btn-outline btn-sm">View</Link>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
