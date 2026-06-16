/**
 * Analytics Dashboard — Spec: Student 3 UI
 * Shows:
 *   - Applications over time
 *   - Pending applications by zone
 *   - Average processing time
 *   - Surveyor workload
 *   - Applications under objection
 *   - Certificates issued per month
 *
 * Data comes from Group module analytics endpoints (GET /analytics/*).
 * PLACEHOLDER notices shown until those endpoints are live.
 */
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  getKPIs, getApplicationsByStatus, getApplicationsByZone,
  getProcessingTime, getSurveyorAnalytics
} from '../api/api'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

function KPICard({ label, value, sub, color = 'blue' }) {
  const bg = {
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  }
  return (
    <div className={`rounded-xl border p-5 ${bg[color] ?? bg.blue}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

function PlaceholderChart({ title }) {
  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="h-48 bg-gray-50 rounded flex items-center justify-center text-sm text-gray-400 border border-dashed border-gray-300">
        PLACEHOLDER — awaiting Group module analytics endpoint
      </div>
    </div>
  )
}

export default function Analytics() {
  const [kpis,        setKpis]        = useState({})
  const [byStatus,    setByStatus]    = useState([])
  const [byZone,      setByZone]      = useState([])
  const [procTime,    setProcTime]    = useState([])
  const [surveyors,   setSurveyors]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [placeholder, setPlaceholder] = useState(false)

  useEffect(() => {
    Promise.all([
      getKPIs(),
      getApplicationsByStatus(),
      getApplicationsByZone(),
      getProcessingTime(),
      getSurveyorAnalytics(),
    ]).then(([k, s, z, p, sv]) => {
      setKpis(k.data ?? {})
      setByStatus(Array.isArray(s.data) ? s.data : [])
      setByZone(Array.isArray(z.data) ? z.data : [])
      setProcTime(Array.isArray(p.data) ? p.data : [])
      setSurveyors(Array.isArray(sv.data) ? sv.data : [])

      // If all empty, show placeholder notice
      const allEmpty = !k.data?.total_applications && !s.data?.length
      setPlaceholder(allEmpty)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-500">Loading analytics…</p>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>

      {placeholder && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-4 py-3 text-sm">
          ⚠ PLACEHOLDER: Group module analytics endpoints not yet available.
          KPI cards and charts will populate once GET /analytics/* endpoints are implemented.
        </div>
      )}

      {/* KPI cards — spec: total apps, by status, pending, approved, rejected, objection, avg processing, surveyor workload, certs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <KPICard label="Total Applications"       value={kpis.total_applications}         color="blue"   />
        <KPICard label="Pending"                  value={kpis.pending_applications}        color="orange" />
        <KPICard label="Approved"                 value={kpis.approved_applications}       color="green"  />
        <KPICard label="Rejected"                 value={kpis.rejected_applications}       color="red"    />
        <KPICard label="Under Objection"          value={kpis.applications_under_objection} color="red"   />
        <KPICard label="Certificates Issued"      value={kpis.certificates_issued}         color="green"  />
        <KPICard label="Avg Processing Time"      value={kpis.avg_processing_days ? `${kpis.avg_processing_days} days` : '—'} color="purple" />
        <KPICard label="Surveyor Active Tasks"    value={kpis.surveyor_active_tasks}       color="blue"   />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Applications over time — spec requirement */}
        {byStatus.length > 0 ? (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Applications by Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <PlaceholderChart title="Applications over time / by Status" />
        )}

        {/* Pending by zone — spec requirement */}
        {byZone.length > 0 ? (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Pending Applications by Zone</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byZone} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="zone_id" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <PlaceholderChart title="Pending Applications by Zone" />
        )}

        {/* Average processing time — spec requirement */}
        {procTime.length > 0 ? (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Average Processing Time by Type</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={procTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="application_type" tick={{ fontSize: 10 }} />
                <YAxis unit=" d" />
                <Tooltip />
                <Bar dataKey="avg_days" fill="#8b5cf6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <PlaceholderChart title="Average Processing Time by Application Type" />
        )}

        {/* Surveyor workload — spec requirement */}
        {surveyors.length > 0 ? (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Surveyor Workload</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={surveyors}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="active_tasks"    fill="#3b82f6" name="Active"    radius={[4,4,0,0]} />
                <Bar dataKey="completed_tasks" fill="#10b981" name="Completed" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <PlaceholderChart title="Surveyor Workload" />
        )}

        {/* Applications under objection — spec requirement */}
        <PlaceholderChart title="Applications under Objection over Time" />

        {/* Certificates issued per month — spec requirement */}
        <PlaceholderChart title="Certificates Issued per Month" />

      </div>
    </div>
  )
}
