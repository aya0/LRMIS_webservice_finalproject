import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listApplications } from '../api/client';
import StatusBadge from '../context/StatusBadge';

const STATUS_LIST = [
  'submitted','pre_checked','survey_required','surveyed','legal_review',
  'approved','certificate_issued','closed','rejected','on_hold',
  'missing_documents','under_objection'
];

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listApplications({ page: 1, page_size: 5, sort_by: 'timestamps.submitted_at', sort_order: -1 }),
      ...STATUS_LIST.map(s => listApplications({ status: s, page: 1, page_size: 1 }))
    ]).then(([recentRes, ...statusRes]) => {
      setRecent(recentRes.data.items || []);
      const s = {};
      STATUS_LIST.forEach((status, i) => {
        s[status] = statusRes[i].data.total;
      });
      setStats(s);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard…</div>;

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="page-title"> Dashboard</div>

      {/* KPI Row */}
      <div className="grid-4 mb-16">
        <div className="stat-card"><div className="label">Total Applications</div><div className="value blue">{total}</div></div>
        <div className="stat-card"><div className="label">Approved</div><div className="value green">{(stats.approved||0)+(stats.certificate_issued||0)+(stats.closed||0)}</div></div>
        <div className="stat-card"><div className="label">Pending Review</div><div className="value orange">{(stats.submitted||0)+(stats.pre_checked||0)+(stats.legal_review||0)}</div></div>
        <div className="stat-card"><div className="label">Rejected</div><div className="value red">{stats.rejected||0}</div></div>
      </div>

      <div className="grid-2">
        {/* Status breakdown */}
        <div className="card">
          <div className="card-title">Applications by Status</div>
          {STATUS_LIST.map(s => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              <StatusBadge status={s} />
              <strong>{stats[s] || 0}</strong>
            </div>
          ))}
        </div>

        {/* Recent applications */}
        <div className="card">
          <div className="flex-between mb-16">
            <div className="card-title" style={{marginBottom:0}}>Recent Applications</div>
            <Link to="/applications" className="btn btn-outline btn-sm">View All</Link>
          </div>
          {recent.length === 0 ? (
            <p className="empty">No applications yet. <Link to="/submit">Submit one →</Link></p>
          ) : recent.map(app => (
            <div key={app.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="flex-between">
                <div>
                  <Link to={`/applications/${app.application_id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                    {app.application_id}
                  </Link>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {app.application_type?.replace(/_/g,' ')} · Zone {app.parcel_ref?.zone_id}
                  </div>
                </div>
                <StatusBadge status={app.status} />
              </div>
            </div>
          ))}
          <div className="mt-16">
            <Link to="/submit" className="btn btn-primary">+ New Application</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
