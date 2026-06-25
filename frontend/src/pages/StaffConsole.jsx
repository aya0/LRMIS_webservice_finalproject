import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listApplications, transitionApplication, rejectApplication, issueCertificate } from '../api/client';
import StatusBadge from '../context/StatusBadge';

const WATCH = ['submitted','pre_checked','survey_required','legal_review','missing_documents','under_objection'];

export default function StaffConsole() {
  const [searchParams] = useSearchParams();
  const [allItems, setAllItems]       = useState([]);
  const [stats, setStats]             = useState({});
  const [activeFilters, setActiveFilters] = useState(() => {
    const f = searchParams.get('filter');
    return f ? new Set([f]) : new Set();
  });
  const [loading, setLoading]         = useState(false);
  const [msg, setMsg]                 = useState('');
  const [err, setErr]                 = useState('');

  const load = () => {
    setLoading(true);
    listApplications({ page: 1, page_size: 100, sort_by: 'timestamps.submitted_at', sort_order: -1 })
      .then(r => setAllItems(r.data.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
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

  const toggleFilter = (s) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const visibleItems = activeFilters.size === 0
    ? allItems
    : allItems.filter(app => activeFilters.has(app.status));

  const quickTransition = async (appId, targetState) => {
    try {
      await transitionApplication(appId, { target_state: targetState, actor_id: 'registrar_console', actor_type: 'registrar' });
      flash(`${appId} moved to ${targetState}.`); load();
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
      flash(`Certificate issued for ${appId}.`); load();
    } catch (e) { flash(e.response?.data?.detail || 'Certificate failed.', true); }
  };

  const filterLabel = activeFilters.size === 0
    ? '(Active)'
    : `— ${[...activeFilters].map(s => s.replace(/_/g,' ')).join(', ')}`;

  return (
    <>
      <section className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Staff Console</h1>
            <p className="text-slate-500 text-sm">Review applications, approve transitions, issue certificates, and handle registrar tasks.</p>
          </div>
          <div className="flex gap-2">
            <a className="btn btn-primary" href="/applications">Applications</a>
            <a className="btn btn-outline" href="/certificates">Certificates</a>
            <a className="btn btn-outline" href="/parcels">Parcels</a>
          </div>
        </div>

        <div className="grid grid-cols-6 gap-4 mt-6">
          {WATCH.map(s => {
            const active = activeFilters.has(s);
            return (
              <button
                key={s}
                onClick={() => toggleFilter(s)}
                className={`col-span-1 border rounded-xl px-3 py-3 text-left transition-colors ${
                  active
                    ? 'bg-slate-800 border-slate-800 text-white shadow'
                    : 'bg-white border-slate-200 text-slate-700 hover:shadow'
                }`}
              >
                <div className={`text-xs ${active ? 'text-slate-300' : 'text-slate-400'}`}>{s.replace(/_/g,' ')}</div>
                <div className="text-lg font-semibold">{stats[s] ?? 0}</div>
              </button>
            );
          })}
        </div>

        {activeFilters.size > 0 && (
          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm text-slate-500">
              Filtering by: {[...activeFilters].map(s => (
                <span key={s} className="inline-block bg-slate-100 text-slate-700 rounded px-2 py-0.5 text-xs mr-1">{s.replace(/_/g,' ')}</span>
              ))}
            </span>
            <button className="btn btn-outline btn-sm" onClick={() => setActiveFilters(new Set())}>Clear</button>
          </div>
        )}
      </section>

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold">Applications {filterLabel}</div>
          <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
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
                {visibleItems.length === 0
                  ? <tr><td colSpan={7} className="empty">No applications in this category.</td></tr>
                  : visibleItems.map(app => (
                    <tr key={app.id}>
                      <td><Link to={`/applications/${app.application_id}`} className="text-blue-600 font-semibold">{app.application_id}</Link></td>
                      <td className="text-sm">{app.application_type?.replace(/_/g,' ')}</td>
                      <td>{app.parcel_ref?.zone_id}</td>
                      <td><span className={`font-semibold text-sm ${app.priority === 'urgent' ? 'text-red-600' : app.priority === 'high' ? 'text-yellow-600' : ''}`}>{app.priority}</span></td>
                      <td><StatusBadge status={app.status} /></td>
                      <td className="text-sm">{app.timestamps?.submitted_at ? new Date(app.timestamps.submitted_at).toLocaleDateString() : '-'}</td>
                      <td>
                        <div style={{ display: 'grid', gridTemplateColumns: '96px 64px 56px', gap: '6px', alignItems: 'center' }}>
                          {/* Col 1: primary action */}
                          {app.status === 'submitted'    ? <button className="btn btn-primary btn-sm" onClick={() => quickTransition(app.application_id, 'pre_checked')}>Pre-check</button>
                          : app.status === 'pre_checked' ? <button className="btn btn-primary btn-sm" onClick={() => quickTransition(app.application_id, 'survey_required')}>Survey</button>
                          : app.status === 'surveyed'    ? <button className="btn btn-primary btn-sm" onClick={() => quickTransition(app.application_id, 'legal_review')}>Legal</button>
                          : app.status === 'legal_review'? <button className="btn btn-success btn-sm" onClick={() => quickTransition(app.application_id, 'approved')}>Approve</button>
                          : app.status === 'approved'    ? <button className="btn btn-success btn-sm" onClick={() => quickCertificate(app.application_id)}>Certify</button>
                          : <span />}
                          {/* Col 2: reject */}
                          {!['rejected','closed','certificate_issued'].includes(app.status)
                            ? <button className="btn btn-danger btn-sm" onClick={() => quickReject(app.application_id)}>Reject</button>
                            : <span />}
                          {/* Col 3: view */}
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
