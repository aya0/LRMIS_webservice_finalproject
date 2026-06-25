/**
 * Analytics Dashboard — Spec: Student 3 UI
 * Shows: applications over time, pending by zone, avg processing time,
 *        surveyor workload, applications under objection, certs per month
 * PLACEHOLDER: data from Group module analytics endpoints
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  getKPIs, getApplicationsByStatus, getApplicationsByType, getApplicationsByZone,
  getProcessingTime, getSurveyorAnalytics, getRegistrarAnalytics, getCertificatesPerMonth,
  getObjectionStats, getDelayedApplications, getHotspotZones,
  downloadManagementReport, getApplicationsOverTime, getProcessingTimeBuckets
} from '../api/api'

function KPICard({ label, value, icon, accent = '#2563eb', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-5 flex items-start gap-4 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-200 transition-all' : ''}`}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ backgroundColor: accent + '15' }}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value ?? '—'}</p>
        {onClick && <p className="text-xs text-blue-500 mt-1">View all</p>}
      </div>
    </div>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="mb-5">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function PlaceholderChart({ title, subtitle }) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="h-52 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-dashed border-slate-200">
        <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-xs text-slate-400 font-medium">Awaiting analytics endpoint</p>
        <p className="text-xs text-slate-300 mt-0.5">Group module — GET /analytics/*</p>
      </div>
    </ChartCard>
  )
}

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const STATUS_FILTER_MAP = {
  total_applications:          null,
  pending_applications:        'submitted',
  approved_applications:       'approved',
  rejected_applications:       'rejected',
  applications_under_objection:'under_objection',
  delayed_applications:        'submitted',
}

export default function Analytics() {
  const navigate = useNavigate()
  const [kpis,       setKpis]       = useState({})
  const [byStatus,   setByStatus]   = useState([])
  const [byType,     setByType]     = useState([])
  const [byZone,     setByZone]     = useState([])
  const [procTime,   setProcTime]   = useState([])
  const [surveyors,  setSurveyors]  = useState([])
  const [registrars, setRegistrars] = useState([])
  const [certsMonth, setCertsMonth] = useState([])
  const [objStats,   setObjStats]   = useState([])
  const [delayed,    setDelayed]    = useState({ count: 0, items: [] })
  const [hotspots,   setHotspots]   = useState([])
  const [appsOverTime, setAppsOverTime] = useState([])
  const [procBuckets,  setProcBuckets]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [dlErr,      setDlErr]      = useState('')

  function goToApplications(statusFilter) {
    // Navigate to staff console — Student 3's page — pre-filtered
    navigate(statusFilter ? `/staff?filter=${statusFilter}` : '/staff')
  }

  async function downloadReport(format) {
    setDlErr('')
    try {
      const response = await downloadManagementReport(format)
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `lrmis-management-report.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      setDlErr('Download failed. Make sure the backend is running.')
    }
  }

  useEffect(() => {
    Promise.all([
      getKPIs(),
      getApplicationsByStatus(),
      getApplicationsByType(),
      getApplicationsByZone(),
      getProcessingTime(),
      getSurveyorAnalytics(),
      getRegistrarAnalytics(),
      getCertificatesPerMonth().catch(() => ({ data: [] })),
      getObjectionStats().catch(() => ({ data: [] })),
      getDelayedApplications().catch(() => ({ data: { count: 0, items: [] } })),
      getHotspotZones().catch(() => ({ data: [] })),
      getApplicationsOverTime(),
      getProcessingTimeBuckets(),
    ]).then(([k, s, t, z, p, sv, rg, cm, ob, dl, hs, aot, pb]) => {
      setKpis(k.data ?? {})
      setByStatus(Array.isArray(s.data) ? s.data : [])
      setByType(Array.isArray(t.data) ? t.data : [])
      setByZone(Array.isArray(z.data) ? z.data : [])
      setProcTime(Array.isArray(p.data) ? p.data : [])
      setSurveyors(Array.isArray(sv.data) ? sv.data : [])
      setRegistrars(Array.isArray(rg.data) ? rg.data : [])
      setCertsMonth(Array.isArray(cm.data) ? cm.data : [])
      setObjStats(Array.isArray(ob.data) ? ob.data : [])
      setDelayed(dl.data ?? { count: 0, items: [] })
      setHotspots(Array.isArray(hs.data) ? hs.data : [])
      setAppsOverTime(Array.isArray(aot.data) ? aot.data : [])
      setProcBuckets(Array.isArray(pb.data) ? pb.data : [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Reporting</p>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Analytics Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">System-wide KPIs and operational metrics</p>
        <div className="flex gap-3 mt-5 flex-wrap items-center">
          <button onClick={() => downloadReport('csv')} className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            Download CSV Report
          </button>
          <button onClick={() => downloadReport('pdf')} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            Download PDF Report
          </button>
          {dlErr && <span className="text-xs text-red-500">{dlErr}</span>}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard label="Total Applications"    value={kpis.total_applications}          accent="#2563eb"
          onClick={() => goToApplications(null)}
          icon={<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>} />
        <KPICard label="Pending"               value={kpis.pending_applications}         accent="#f59e0b"
          onClick={() => goToApplications('submitted')}
          icon={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} />
        <KPICard label="Approved"              value={kpis.approved_applications}        accent="#10b981"
          onClick={() => goToApplications('approved')}
          icon={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>} />
        <KPICard label="Rejected"              value={kpis.rejected_applications}        accent="#ef4444"
          onClick={() => goToApplications('rejected')}
          icon={<><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>} />
        <KPICard label="Under Objection"       value={kpis.applications_under_objection} accent="#f59e0b"
          onClick={() => goToApplications('under_objection')}
          icon={<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />
        <KPICard label="Certificates Issued"   value={kpis.certificates_issued}          accent="#10b981"
          onClick={() => navigate('/certificates')}
          icon={<><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></>} />
        <KPICard label="Avg Processing Time"   value={kpis.avg_processing_days ? `${kpis.avg_processing_days}d` : null} accent="#8b5cf6"
          icon={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><line x1="2" y1="2" x2="22" y2="22"/></>} />
        <KPICard label="Surveyor Active Tasks" value={kpis.surveyor_active_tasks}        accent="#2563eb"
          icon={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>} />
        <KPICard label="Delayed Applications"  value={kpis.delayed_applications}         accent="#dc2626"
          onClick={() => goToApplications('submitted')}
          icon={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pie chart — Status distribution */}
        {byStatus.length > 0 && (
          <ChartCard title="Status Distribution" subtitle="Share of applications across workflow states">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ status, percent }) => `${status?.replace(/_/g,' ')} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [val, name?.replace(/_/g,' ')]} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Applications by status */}
        {byStatus.length > 0 ? (
          <ChartCard title="Applications by Status" subtitle="Current distribution across workflow states">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byStatus} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}

        {appsOverTime.length > 0 ? (
          <ChartCard title="Applications over Time" subtitle="Monthly submissions trend">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={appsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}

        {procBuckets.length > 0 ? (
          <ChartCard title="Processing Time Distribution" subtitle="Auto-bucketed ranges (days to approval)">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={procBuckets} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}

        {byType.length > 0 ? (
          <ChartCard title="Applications by Type" subtitle="Current distribution across application categories">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byType} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="application_type" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}

        {/* Pending by zone */}
        {byZone.length > 0 ? (
          <ChartCard title="Pending Applications by Zone" subtitle="Geographic distribution of backlog">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byZone} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="zone_id" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} width={90} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <PlaceholderChart title="Pending Applications by Zone" subtitle="Group module endpoint required" />
        )}

        {/* Processing time */}
        {procTime.length > 0 ? (
          <ChartCard title="Average Processing Time" subtitle="Days by application type">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={procTime} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="application_type" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis unit="d" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="avg_days" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <PlaceholderChart title="Average Processing Time by Type" subtitle="Group module endpoint required" />
        )}

        {/* Surveyor workload */}
        {surveyors.length > 0 ? (
          <ChartCard title="Surveyor Workload" subtitle="Active vs completed tasks per surveyor">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={surveyors} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="active_tasks"    name="Active"    fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed_tasks" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <PlaceholderChart title="Surveyor Workload" subtitle="Group module endpoint required" />
        )}

        {registrars.length > 0 ? (
          <ChartCard title="Registrar Workload" subtitle="Review throughput and backlog per registrar">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={registrars} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="review_count" name="Reviews" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inbox_backlog" name="Backlog" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : null}

        {/* Applications under objection over time */}
        {objStats.length > 0 ? (
          <ChartCard title="Applications under Objection" subtitle="Count over time">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={objStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <PlaceholderChart title="Applications under Objection over Time" subtitle="Group module — GET /analytics/objection-stats" />
        )}

        {/* Certificates issued per month */}
        {certsMonth.length > 0 ? (
          <ChartCard title="Certificates Issued per Month" subtitle="Monthly issuance trend">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={certsMonth} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <PlaceholderChart title="Certificates Issued per Month" subtitle="Group module — GET /analytics/certificates-per-month" />
        )}

        <ChartCard title="Delayed Applications" subtitle={`Older than ${kpis.delayed_applications ?? 0 ? '30' : '30'} days and still pending`}>
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Delayed Count</p>
                <p className="text-3xl font-bold text-slate-800">{delayed.count ?? 0}</p>
              </div>
              <div className="text-xs text-slate-400">Open backlog over 30 days</div>
            </div>
            <div className="space-y-2 max-h-40 overflow-auto pr-1">
              {(delayed.items ?? []).slice(0, 5).map(item => (
                <div key={item.application_id} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium text-slate-800">{item.application_id}</div>
                    <div className="text-xs text-slate-400">{item.application_type} · {item.zone_id || 'Unknown zone'}</div>
                  </div>
                  <div className="text-sm font-semibold text-rose-600">{item.delay_days}d</div>
                </div>
              ))}
              {(delayed.items ?? []).length === 0 && <p className="text-sm text-slate-400">No delayed applications found.</p>}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Hotspot Zones" subtitle="Zones with the highest application volume">
          <div className="space-y-2">
            {hotspots.length > 0 ? hotspots.map(zone => (
              <div key={zone.zone_id} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                <span className="text-sm font-medium text-slate-800">{zone.zone_id}</span>
                <span className="text-sm font-semibold text-blue-600">{zone.count}</span>
              </div>
            )) : <p className="text-sm text-slate-400">No hotspot data yet.</p>}
          </div>
        </ChartCard>

      </div>
    </div>
  )
}
