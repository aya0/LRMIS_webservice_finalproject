/**
 * My Survey Tasks — Spec: Student 3 UI / Surveyor screen
 * Shows: assigned tasks list, parcel number, zone, priority, scheduled visit date, current milestone
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listSurveyorTasks } from '../api/api'

const MILESTONE_LABELS = {
  assigned:           'Assigned',
  visit_scheduled:    'Visit Scheduled',
  arrived_on_site:    'Arrived On Site',
  survey_started:     'Survey Started',
  survey_completed:   'Survey Completed',
  report_uploaded:    'Report Uploaded',
  registrar_reviewed: 'Registrar Reviewed',
}

const MILESTONE_COLOR = {
  assigned:           'bg-gray-200 text-gray-700',
  visit_scheduled:    'bg-yellow-100 text-yellow-800',
  arrived_on_site:    'bg-orange-100 text-orange-800',
  survey_started:     'bg-blue-100 text-blue-800',
  survey_completed:   'bg-indigo-100 text-indigo-800',
  report_uploaded:    'bg-purple-100 text-purple-800',
  registrar_reviewed: 'bg-green-100 text-green-800',
}

const PRIORITY_COLOR = {
  urgent: 'text-red-600 font-bold',
  high:   'text-orange-600 font-semibold',
  normal: 'text-gray-700',
  low:    'text-gray-400',
}

// PLACEHOLDER: Replace with real surveyor_id from auth context (Student 2 / auth module)
const DEMO_SURVEYOR_ID = 'PLACEHOLDER_SURVEYOR_ID'

export default function SurveyorTasks() {
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [filter,  setFilter]  = useState('')   // milestone filter
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    listSurveyorTasks(DEMO_SURVEYOR_ID, filter || undefined)
      .then(res => setTasks(res.data))
      .catch(() => setError('Could not load tasks. Is the backend running?'))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">My Survey Tasks</h1>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1 text-sm"
        >
          <option value="">All Milestones</option>
          {Object.entries(MILESTONE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-500">Loading tasks…</p>}
      {error   && <p className="text-red-500">{error}</p>}

      {!loading && !error && tasks.length === 0 && (
        <p className="text-gray-500">No tasks found.</p>
      )}

      <div className="grid gap-4">
        {tasks.map(task => {
          // PLACEHOLDER: parcel_number, zone, priority, scheduled_date come from
          // land_applications (Student 1) and parcels (Student 1).
          // Until Student 1 is ready, these fall back to what's stored on the task.
          const parcelNumber    = task.parcel_number   ?? '—'
          const zone            = task.zone_id         ?? '—'
          const priority        = task.priority        ?? 'normal'
          const scheduledDate   = task.milestones?.find(m => m.type === 'visit_scheduled')
                                    ?.meta?.scheduled_date ?? '—'

          return (
            <div
              key={task.id}
              className="bg-white rounded-xl shadow p-5 flex flex-col gap-3 border border-gray-100 hover:shadow-md transition cursor-pointer"
              onClick={() => navigate(`/tasks/${task.id}`)}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-blue-700">{task.task_id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${MILESTONE_COLOR[task.status] ?? 'bg-gray-100'}`}>
                  {MILESTONE_LABELS[task.status] ?? task.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>
                  <span className="font-medium text-gray-500">Parcel No.</span>
                  <p className="text-gray-800">{parcelNumber}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Zone</span>
                  <p className="text-gray-800">{zone}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Priority</span>
                  <p className={PRIORITY_COLOR[priority] ?? ''}>{priority.toUpperCase()}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Scheduled Visit</span>
                  <p className="text-gray-800">{scheduledDate}</p>
                </div>
              </div>

              <p className="text-xs text-blue-600 mt-1">Click to open task →</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
