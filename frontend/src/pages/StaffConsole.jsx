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
    <>
      <section className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Staff Console</h1>
            <p className="text-slate-500 text-sm">Review applications, approve transitions, issue certificates, and handle registrar tasks.</p>
          </div>
          <div className="flex gap-2">
            <a className="btn btn-primary" href="/applications">Open Applications</a>
            <a className="btn btn-outline" href="/certificates">Open Certificates</a>
            <a className="btn btn-outline" href="/parcels">Open Parcels</a>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4 mt-6">
          {WATCH.map(s => (
            <button key={s} onClick={() => setFilter(activeFilter === s ? '' : s)} className="col-span-1 bg-white border rounded-xl px-3 py-3 text-left hover:shadow">
              <div className="text-xs text-slate-400">{s.replace(/_/g,' ')}</div>
              <div className="text-lg font-semibold">{stats[s] || 0}</div>
            </button>
          ))}
        </div>
      </section>

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      {activeFilter && (
        <div className="flex items-center gap-4 mb-6">
          <span>Filtering: <StatusBadge status={activeFilter} /></span>
          <button className="btn btn-outline btn-sm" onClick={() => setFilter('')}>Clear filter</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">Applications {activeFilter ? `— ${activeFilter}` : '(Active)'}</div>
          <button className="btn btn-outline btn-sm" onClick={() => load()}>↻ Refresh</button>
        </div>

        {loading ? <div className="loading">Loading…</div> : (
          <div className="table-wrap">
            <table className="module1-table w-full">
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
                      <td><Link to={`/applications/${app.application_id}`} className="text-blue-600 font-semibold">{app.application_id}</Link></td>
                      <td className="text-sm">{app.application_type?.replace(/_/g,' ')}</td>
                      <td>{app.parcel_ref?.zone_id}</td>
                      <td><span className={`font-semibold text-sm ${app.priority === 'urgent' ? 'text-red-600' : app.priority === 'high' ? 'text-yellow-600' : ''}`}>{app.priority}</span></td>
                      <td><StatusBadge status={app.status} /></td>
                      <td className="text-sm">{app.timestamps?.submitted_at ? new Date(app.timestamps.submitted_at).toLocaleDateString() : '-'}</td>
                      <td>
                        <div className="flex gap-2">
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
    </>
  );
}
