/**
 * Survey Task Execution — Spec: Student 3 UI
 * Shows: milestone buttons, field notes, survey report metadata upload
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSurveyTask, addMilestone, uploadSurveyReport, addFieldNote } from '../api/api'
import { useAuth } from '../context/AuthContext'

const MILESTONE_ORDER = [
  'assigned',
  'visit_scheduled',
  'arrived_on_site',
  'survey_started',
  'survey_completed',
  'report_uploaded',
  'registrar_reviewed',
]

const MILESTONE_LABELS = {
  assigned:           'Assigned',
  visit_scheduled:    'Mark Visit Scheduled',
  arrived_on_site:    'Mark Arrived On Site',
  survey_started:     'Mark Survey Started',
  survey_completed:   'Mark Survey Completed',
  report_uploaded:    'Upload Report',
  registrar_reviewed: 'Registrar Reviewed',
}

export default function TaskExecution() {
  const { taskId }  = useParams()
  const navigate    = useNavigate()
  const { auth }    = useAuth()
  const staff       = auth?.staff
  const ACTOR_ID    = staff?.id ?? 'unknown'

  const [task,         setTask]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [submitting,   setSubmitting]   = useState(false)

  // Report upload form state
  const [reportForm, setReportForm] = useState({
    report_title:        '',
    file_url:            '',
    file_name:           '',
    observations:        '',
    boundary_confirmed:  false,
    area_sqm:            '',
  })

  // Field note state
  const [noteText, setNoteText] = useState('')

  // Scheduled date for visit_scheduled milestone
  const [scheduledDate, setScheduledDate] = useState('')

  useEffect(() => {
    loadTask()
  }, [taskId])

  function loadTask() {
    setLoading(true)
    fetch(`/api/survey-tasks/${taskId}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => { setTask(data); setLoading(false) })
      .catch(() => { setError('Could not load task. Is the backend running?'); setLoading(false) })
  }

  async function handleMilestone(milestone) {
    if (!task) return
    setSubmitting(true)
    try {
      const body = {
        milestone,
        by:   ACTOR_ID,
        meta: {},
      }
      if (milestone === 'visit_scheduled' && scheduledDate) {
        body.scheduled_date = scheduledDate
        body.meta.scheduled_date = scheduledDate
      }
      await addMilestone(task.application_id, body)
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail ?? 'Error advancing milestone.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReportUpload(e) {
    e.preventDefault()
    if (!task) return
    setSubmitting(true)
    try {
      await uploadSurveyReport(task.application_id, {
        ...reportForm,
        application_id: task.application_id,
        task_id:        taskId,
        surveyor_id:    ACTOR_ID,
        area_sqm:       reportForm.area_sqm ? parseFloat(reportForm.area_sqm) : null,
      })
      alert('Report uploaded successfully.')
      loadTask()
    } catch (e) {
      alert(e.response?.data?.detail ?? 'Error uploading report.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAddNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setSubmitting(true)
    try {
      await addFieldNote(taskId, { note: noteText, added_by: ACTOR_ID })
      setNoteText('')
      loadTask()
    } catch (e) {
      alert('Error adding note.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-gray-500">Loading task…</p>
  if (error)   return <p className="text-red-500">{error}</p>
  if (!task)   return null

  const currentIdx  = MILESTONE_ORDER.indexOf(task.status)
  const nextMilestone = currentIdx < MILESTONE_ORDER.length - 1
    ? MILESTONE_ORDER[currentIdx + 1]
    : null

  const canUploadReport = task.status === 'survey_completed'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate('/')} className="text-blue-600 text-sm hover:underline">
        ← Back to My Tasks
      </button>

      {/* Task header */}
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800 mb-1">{task.task_id}</h1>
        <p className="text-sm text-gray-500 mb-4">Application: {task.application_id}</p>

        {/* Milestone progress */}
        <div className="flex items-center gap-1 flex-wrap mb-6">
          {MILESTONE_ORDER.map((m, i) => (
            <div key={m} className="flex items-center gap-1">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  i < currentIdx  ? 'bg-green-100 border-green-400 text-green-700' :
                  i === currentIdx ? 'bg-blue-600 border-blue-600 text-white' :
                  'bg-gray-100 border-gray-300 text-gray-400'
                }`}
              >
                {m.replace(/_/g, ' ')}
              </span>
              {i < MILESTONE_ORDER.length - 1 && <span className="text-gray-300">›</span>}
            </div>
          ))}
        </div>

        {/* Next milestone button */}
        {nextMilestone && nextMilestone !== 'report_uploaded' && nextMilestone !== 'registrar_reviewed' && (
          <div className="space-y-2">
            {nextMilestone === 'visit_scheduled' && (
              <input
                type="date"
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              />
            )}
            <button
              onClick={() => handleMilestone(nextMilestone)}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {MILESTONE_LABELS[nextMilestone]}
            </button>
          </div>
        )}

        {task.status === 'registrar_reviewed' && (
          <p className="text-green-600 font-medium">✓ All milestones complete</p>
        )}
      </div>

      {/* Survey report upload — shown when survey_completed */}
      {(canUploadReport || task.status === 'report_uploaded' || task.status === 'registrar_reviewed') && (
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Survey Report</h2>
          {task.report_uploaded ? (
            <p className="text-green-600 text-sm">✓ Report already uploaded</p>
          ) : (
            <form onSubmit={handleReportUpload} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Title *</label>
                <input
                  required
                  value={reportForm.report_title}
                  onChange={e => setReportForm(f => ({ ...f, report_title: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  placeholder="e.g. Boundary Survey Report — Parcel 145"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File URL</label>
                  <input
                    value={reportForm.file_url}
                    onChange={e => setReportForm(f => ({ ...f, file_url: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File Name</label>
                  <input
                    value={reportForm.file_name}
                    onChange={e => setReportForm(f => ({ ...f, file_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="report.pdf"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observations</label>
                <textarea
                  value={reportForm.observations}
                  onChange={e => setReportForm(f => ({ ...f, observations: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area (sqm)</label>
                  <input
                    type="number"
                    value={reportForm.area_sqm}
                    onChange={e => setReportForm(f => ({ ...f, area_sqm: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 mt-5">
                  <input
                    type="checkbox"
                    id="boundary"
                    checked={reportForm.boundary_confirmed}
                    onChange={e => setReportForm(f => ({ ...f, boundary_confirmed: e.target.checked }))}
                  />
                  <label htmlFor="boundary" className="text-sm text-gray-700">Boundary Confirmed</label>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Upload Survey Report Metadata
              </button>
            </form>
          )}
        </div>
      )}

      {/* Field notes */}
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
        <h2 className="text-lg font-semibold mb-3">Field Notes</h2>

        {task.field_notes?.length > 0 ? (
          <ul className="space-y-2 mb-4">
            {task.field_notes.map((n, i) => (
              <li key={i} className="bg-gray-50 rounded p-3 text-sm">
                <p className="text-gray-800">{n.note}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {n.added_by} · {new Date(n.added_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm mb-4">No field notes yet.</p>
        )}

        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="Add a field note…"
          />
          <button
            type="submit"
            disabled={submitting || !noteText.trim()}
            className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Add Note
          </button>
        </form>
      </div>
    </div>
  )
}
