/**
 * Analytics Dashboard — Spec: Student 3 UI
 * Shows: applications over time, pending by zone, avg processing time,
 *        surveyor workload, applications under objection, certs per month
 * PLACEHOLDER: data from Group module analytics endpoints
 */
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import {
  getKPIs, getApplicationsByStatus, getApplicationsByType, getApplicationsByZone,
  getProcessingTime, getSurveyorAnalytics, getRegistrarAnalytics, getCertificatesPerMonth,
  getObjectionStats, getDelayedApplications, getHotspotZones,
  downloadManagementReport
} from '../api/api'

function KPICard({ label, value, icon, accent = '#2563eb' }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
           style={{ backgroundColor: accent + '15' }}>
        <span style={{ color: accent }} className="text-lg">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value ?? '—'}</p>
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

export default function Analytics() {
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
  const [loading,    setLoading]    = useState(true)

  async function downloadReport(format) {
    const response = await downloadManagementReport(format)
    const blob = response.data
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `lrmis-management-report.${format}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
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
    ]).then(([k, s, t, z, p, sv, rg, cm, ob, dl, hs]) => {
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
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Reporting</p>
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Analytics Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">System-wide KPIs and operational metrics</p>
        <div className="flex gap-3 mt-5 flex-wrap">
          <button onClick={() => downloadReport('csv')} className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            Download CSV Report
          </button>
          <button onClick={() => downloadReport('pdf')} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Placeholder notice */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-3 flex items-center gap-3 mb-8">
        <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-xs text-amber-700 font-medium">
          Analytics data will populate once the Group module implements <code className="bg-amber-100 px-1 rounded">GET /analytics/*</code> endpoints.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard label="Total Applications"    value={kpis.total_applications}          icon="📋" accent="#2563eb" />
        <KPICard label="Pending"               value={kpis.pending_applications}         icon="⏳" accent="#f59e0b" />
        <KPICard label="Approved"              value={kpis.approved_applications}        icon="✅" accent="#10b981" />
        <KPICard label="Rejected"              value={kpis.rejected_applications}        icon="❌" accent="#ef4444" />
        <KPICard label="Under Objection"       value={kpis.applications_under_objection} icon="⚠️" accent="#f59e0b" />
        <KPICard label="Certificates Issued"   value={kpis.certificates_issued}          icon="🏛️" accent="#10b981" />
        <KPICard label="Avg Processing Time"   value={kpis.avg_processing_days ? `${kpis.avg_processing_days}d` : null} icon="⏱️" accent="#8b5cf6" />
        <KPICard label="Surveyor Active Tasks" value={kpis.surveyor_active_tasks}        icon="🗺️" accent="#2563eb" />
        <KPICard label="Delayed Applications"  value={kpis.delayed_applications}         icon="🚨" accent="#dc2626" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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
        ) : (
          <PlaceholderChart title="Applications over Time / by Status" subtitle="Group module endpoint required" />
        )}

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
