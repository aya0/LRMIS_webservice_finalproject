/**
 * My Survey Tasks — Spec: Student 3 UI
 * Shows: assigned tasks list, parcel number, zone, priority, scheduled visit date, current milestone
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listSurveyorTasks } from '../api/api'
import { useAuth } from '../context/AuthContext'

const MILESTONE_LABELS = {
  assigned:           'Assigned',
  visit_scheduled:    'Visit Scheduled',
  arrived_on_site:    'Arrived On Site',
  survey_started:     'Survey Started',
  survey_completed:   'Survey Completed',
  report_uploaded:    'Report Uploaded',
  registrar_reviewed: 'Registrar Reviewed',
}

const MILESTONE_STYLE = {
  assigned:           'bg-slate-100 text-slate-600 border-slate-200',
  visit_scheduled:    'bg-amber-50 text-amber-700 border-amber-200',
  arrived_on_site:    'bg-orange-50 text-orange-700 border-orange-200',
  survey_started:     'bg-blue-50 text-blue-700 border-blue-200',
  survey_completed:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  report_uploaded:    'bg-purple-50 text-purple-700 border-purple-200',
  registrar_reviewed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const PRIORITY_STYLE = {
  urgent: 'text-red-600 font-semibold',
  high:   'text-orange-500 font-semibold',
  normal: 'text-slate-600',
  low:    'text-slate-400',
}

const PRIORITY_DOT = {
  urgent: 'bg-red-500',
  high:   'bg-orange-400',
  normal: 'bg-blue-400',
  low:    'bg-slate-300',
}

export default function SurveyorTasks() {
  const { staff }                       = useAuth()
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [filter,  setFilter]  = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!staff?.id) return
    setLoading(true)
    listSurveyorTasks(staff.id, filter || undefined)
      .then(res => setTasks(res.data))
      .catch(() => setError('Could not load tasks. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [filter, staff])

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">Survey Management</p>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">My Survey Tasks</h1>
          <p className="text-slate-400 text-sm mt-1">Track and manage your assigned field survey tasks</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 font-medium">Filter by milestone</label>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="">All Milestones</option>
            {Object.entries(MILESTONE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Tasks',   value: tasks.length },
          { label: 'In Progress',   value: tasks.filter(t => !['registrar_reviewed', 'report_uploaded'].includes(t.status)).length },
          { label: 'Completed',     value: tasks.filter(t => t.status === 'registrar_reviewed').length },
          { label: 'Pending Visit', value: tasks.filter(t => t.status === 'assigned').length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1 text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 text-slate-400 py-12 justify-center">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Loading tasks…
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-5 py-4 text-sm">{error}</div>
      )}

      {/* Empty */}
      {!loading && !error && tasks.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No tasks assigned yet</p>
          <p className="text-slate-400 text-sm mt-1">Tasks will appear once survey assignments are created</p>
        </div>
      )}

      {/* Task cards */}
      <div className="grid gap-4">
        {tasks.map(task => {
          const parcelNumber  = task.parcel_number ?? '—'
          const zone          = task.zone_id ?? '—'
          const priority      = task.priority ?? 'normal'
          const scheduledDate = task.milestones?.find(m => m.type === 'visit_scheduled')
                                  ?.meta?.scheduled_date ?? '—'
          return (
            <div
              key={task.id}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5 cursor-pointer card-hover group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                      {task.task_id}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${MILESTONE_STYLE[task.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {MILESTONE_LABELS[task.status] ?? task.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-6">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Parcel No.</p>
                      <p className="text-sm font-semibold text-slate-700">{parcelNumber}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Zone</p>
                      <p className="text-sm font-semibold text-slate-700">{zone}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Priority</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[priority] ?? 'bg-slate-300'}`} />
                        <p className={`text-sm ${PRIORITY_STYLE[priority]}`}>{priority.toUpperCase()}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Scheduled Visit</p>
                      <p className="text-sm font-semibold text-slate-700">{scheduledDate}</p>
                    </div>
                  </div>
                </div>

                <div className="text-slate-300 group-hover:text-blue-400 transition-colors mt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
