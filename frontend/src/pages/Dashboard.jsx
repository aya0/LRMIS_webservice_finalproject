import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../context/StatusBadge';
import { getStaff, listApplications, listParcels, listSurveyorTasks } from '../api/api';

const STATUS_LIST = [
  'submitted',
  'pre_checked',
  'survey_required',
  'surveyed',
  'legal_review',
  'approved',
  'certificate_issued',
  'closed',
  'rejected',
  'on_hold',
  'missing_documents',
  'under_objection',
];

const OPEN_STATUSES = ['submitted', 'pre_checked', 'survey_required', 'surveyed', 'legal_review', 'on_hold', 'missing_documents', 'under_objection'];
const RESOLVED_STATUSES = ['approved', 'certificate_issued', 'closed'];

function StatCard({ label, value, tone = 'blue', hint }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className={`value ${tone}`}>{value}</div>
      {hint && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { auth } = useAuth();
  const staff = auth?.staff;
  const [staffSummary, setStaffSummary] = useState(null);
  const [statusCounts, setStatusCounts] = useState({});
  const [recentApplications, setRecentApplications] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [visibleParcels, setVisibleParcels] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isSurveyor = staff?.role === 'surveyor';
  const isRegistrar = staff?.role === 'registrar';

  useEffect(() => {
    if (!staff?.id) return;

    let cancelled = false;
    const params = { assigned_staff_id: staff.id, assigned_staff_role: staff.role };

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [profileRes, recentRes, parcelRes, ...statusRes] = await Promise.all([
          getStaff(staff.id),
          listApplications({ ...params, page: 1, page_size: 6, sort_by: 'timestamps.submitted_at', sort_order: -1 }),
          listParcels({ ...params, page: 1, page_size: 1 }),
          ...STATUS_LIST.map(status => listApplications({ ...params, status, page: 1, page_size: 1 })),
        ]);

        if (cancelled) return;

        setStaffSummary(profileRes.data);
        setRecentApplications(recentRes.data.items || []);
        setVisibleParcels(parcelRes.data.total || 0);

        const nextCounts = {};
        STATUS_LIST.forEach((status, index) => {
          nextCounts[status] = statusRes[index]?.data?.total || 0;
        });
        setStatusCounts(nextCounts);

        if (isSurveyor) {
          const tasksRes = await listSurveyorTasks(staff.id);
          if (!cancelled) {
            setRecentTasks((tasksRes.data || []).slice(0, 5));
          }
        } else {
          setRecentTasks([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || 'Failed to load dashboard data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [staff?.id, staff?.role, isSurveyor]);

  const totalApplications = useMemo(() => Object.values(statusCounts).reduce((sum, count) => sum + count, 0), [statusCounts]);
  const openApplications = useMemo(
    () => OPEN_STATUSES.reduce((sum, status) => sum + (statusCounts[status] || 0), 0),
    [statusCounts]
  );
  const resolvedApplications = useMemo(
    () => RESOLVED_STATUSES.reduce((sum, status) => sum + (statusCounts[status] || 0), 0),
    [statusCounts]
  );
  const activeTasks = staffSummary?.performance_summary?.active_tasks ?? (isSurveyor ? recentTasks.filter(t => !['survey_completed', 'report_uploaded', 'registrar_reviewed'].includes(t.status)).length : 0);
  const completedTasks = staffSummary?.performance_summary?.completed_tasks ?? 0;
  const maxTasks = staffSummary?.performance_summary?.max_tasks ?? staff?.workload?.max_tasks ?? 10;
  const capacityUsed = Math.min(100, Math.round((activeTasks / Math.max(1, maxTasks)) * 100));

  if (loading) return <div className="loading">Loading dashboard…</div>;

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Staff Dashboard</p>
            <h1 className="text-2xl font-bold mt-1">Welcome{staff?.name ? `, ${staff.name}` : ''}</h1>
            <p className="text-sm text-slate-400 mt-1">
              {isSurveyor
                ? 'Your dashboard shows survey workload, assigned applications, and visible parcels.'
                : 'Your dashboard shows assigned applications, visible parcels, and registrar activity.'}
            </p>
          </div>
          <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-700">
            <div className="font-semibold capitalize">{staff?.role || 'staff'}</div>
            <div className="text-slate-500">{staff?.staff_code}</div>
          </div>
        </div>
        {error && <div className="alert alert-error mt-4">{error}</div>}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Assigned Applications" value={totalApplications} tone="blue" hint="Across all current application states" />
        <StatCard label="Open Cases" value={openApplications} tone="orange" hint="Needs action, review, or follow-up" />
        <StatCard label="Resolved Cases" value={resolvedApplications} tone="green" hint="Approved, issued, or closed" />
        <StatCard label="Visible Parcels" value={visibleParcels} tone="blue" hint="Parcels tied to your assigned applications" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Tasks" value={activeTasks} tone="orange" hint={isSurveyor ? `Capacity used ${capacityUsed}%` : 'Based on your current workload'} />
        <StatCard label="Completed Tasks" value={completedTasks} tone="green" hint={isSurveyor ? 'Survey tasks completed or reviewed' : 'Tracked from your staff summary'} />
        <StatCard label="Workload Limit" value={maxTasks} tone="blue" hint="Maximum active tasks allowed" />
        <StatCard label="Coverage Zones" value={staff?.coverage?.zone_ids?.length || 0} tone="blue" hint="Zones mapped to your account" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="flex-between mb-16">
            <div className="card-title" style={{ marginBottom: 0 }}>Applications by Status</div>
            <Link to="/applications" className="btn btn-outline btn-sm">View All</Link>
          </div>
          <div className="space-y-1">
            {STATUS_LIST.map(status => (
              <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <StatusBadge status={status} />
                <strong>{statusCounts[status] || 0}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex-between mb-16">
            <div className="card-title" style={{ marginBottom: 0 }}>
              {isSurveyor ? 'Recent Survey Tasks' : 'Recent Assigned Applications'}
            </div>
            <Link to={isSurveyor ? '/tasks' : '/applications'} className="btn btn-outline btn-sm">
              View All
            </Link>
          </div>

          {isSurveyor ? (
            recentTasks.length === 0 ? (
              <p className="empty">No survey tasks assigned yet.</p>
            ) : recentTasks.map(task => (
              <div key={task.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="flex-between">
                  <div>
                    <Link to={`/tasks/${task.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                      {task.task_code || task.application_id || task.id}
                    </Link>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {task.application_id ? `Application ${task.application_id}` : 'Survey task'} · Zone {task.zone_id || task.parcel_ref?.zone_id || '—'}
                    </div>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))
          ) : recentApplications.length === 0 ? (
            <p className="empty">No assigned applications found.</p>
          ) : recentApplications.map(app => (
            <div key={app.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="flex-between">
                <div>
                  <Link to={`/applications/${app.application_id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                    {app.application_id}
                  </Link>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {app.application_type?.replace(/_/g, ' ')} · Zone {app.parcel_ref?.zone_id || '—'} · Parcel {app.parcel_ref?.parcel_number || '—'}
                  </div>
                </div>
                <StatusBadge status={app.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link to="/map" className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5">
          <h2 className="text-base font-bold text-slate-800">Open Live Map</h2>
          <p className="text-sm text-slate-500 mt-2">Jump to the parcels and zones you can see on the map.</p>
        </Link>
        <Link to="/parcels" className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5">
          <h2 className="text-base font-bold text-slate-800">Open Parcels</h2>
          <p className="text-sm text-slate-500 mt-2">Review the parcels linked to your assigned applications.</p>
        </Link>
        <Link to="/applications" className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5">
          <h2 className="text-base font-bold text-slate-800">Open Applications</h2>
          <p className="text-sm text-slate-500 mt-2">Filter all records that belong to your role and workload.</p>
        </Link>
      </div>
    </div>
  );
}
