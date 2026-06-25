import { useState } from 'react'
import { getTimeline } from '../../services/applicantApi'
import {
  ApplicantApplicationSelect,
  ApplicationSummaryCard,
  getApplicationId,
  statusClass,
  useApplicantApplications,
} from './ApplicantApplicationSelect'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError } from './applicantUx'
import './applicantPortal.css'

function eventTitle(event) {
  const labels = {
    document_uploaded: 'Document Uploaded',
    comment_submitted: 'Comment Submitted',
    objection_submitted: 'Objection Submitted',
  }
  const type = event.type || event.status || event.action
  return labels[type] || type || 'Timeline event'
}

function eventType(event) {
  return event.type || event.status || event.action || ''
}

function eventTime(event) {
  return event.at || event.created_at || event.updated_at || 'Time not recorded'
}

function eventIcon(type) {
  const icons = {
    document_uploaded: 'D',
    comment_submitted: 'C',
    objection_submitted: 'O',
  }
  return icons[type] || 'E'
}

function eventClass(type) {
  return `applicant-timeline-dot applicant-event-${String(type || 'event').replaceAll('_', '-')}`
}

function eventDateParts(value) {
  if (!value || value === 'Time not recorded') {
    return { date: 'Date not recorded', time: 'Time not recorded' }
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return { date: value, time: '' }
  return {
    date: parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }),
    time: parsed.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  }
}

function eventDescription(event) {
  const type = eventType(event)
  if (type === 'document_uploaded') return 'A document was uploaded for this application.'
  if (type === 'comment_submitted') return 'An applicant comment was submitted.'
  if (type === 'objection_submitted') return 'An applicant objection was submitted.'
  return 'The application timeline was updated.'
}

function eventStatus(event) {
  const type = eventType(event)
  if (type === 'document_uploaded') return event.meta?.status || 'uploaded'
  if (type === 'comment_submitted') return 'submitted'
  if (type === 'objection_submitted') return event.meta?.status || 'submitted'
  return event.status || 'recorded'
}

export default function ApplicationTimeline() {
  const { applications, loading: loadingApplications, error: applicationsError } = useApplicantApplications()
  const [applicationId, setApplicationId] = useState('')
  const [events, setEvents] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldError, setFieldError] = useState('')

  const selectedApplication = applications.find(app => getApplicationId(app) === applicationId) || null

  async function loadTimeline() {
    if (!applicationId) {
      setFieldError('Choose one of your linked applications.')
      return
    }
    setLoading(true)
    setError(null)
    setEvents(null)
    try {
      const res = await getTimeline(applicationId)
      setEvents(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(friendlyApplicantError(err, 'Unable to fetch timeline for the selected application.'))
    } finally {
      setLoading(false)
    }
  }

  function fetchTimeline(e) {
    e.preventDefault()
    loadTimeline()
  }

  return (
    <ApplicantLayout>
      <p className="applicant-page-label">APPLICATION TIMELINE</p>
      <h1 className="applicant-page-title">Application Timeline</h1>
      <p className="applicant-page-subtitle">
        Select a linked application to view events recorded from performance logs.
      </p>

      <section className="applicant-card applicant-search-card" style={{ marginBottom: '24px' }}>
        <form onSubmit={fetchTimeline} style={{ display: 'grid', gap: '16px' }}>
          {applicationsError && <div className="applicant-error">{applicationsError}</div>}
          <ApplicantApplicationSelect
            applications={applications}
            value={applicationId}
            onChange={value => {
              setApplicationId(value)
              setFieldError('')
              setEvents(null)
            }}
            error={fieldError}
            loading={loadingApplications}
            label="Linked Application"
          />
          <div className="applicant-inline-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button disabled={loading || loadingApplications || applications.length === 0 || !applicationId} className="applicant-button">
              {loading ? 'Loading...' : 'View Timeline'}
            </button>
            <button type="button" disabled={loading || !applicationId} onClick={loadTimeline} className="applicant-button-secondary">
              Refresh
            </button>
          </div>
        </form>
      </section>

      {error && <div className="applicant-error" style={{ marginBottom: '24px' }}>{error}</div>}

      <div className="applicant-track-layout">
        <section className="applicant-card applicant-section" style={{ marginTop: 0 }}>
          <h2 style={{ fontSize: '18px', color: '#071b3a', marginBottom: '24px' }}>Timeline Results</h2>

          {!events && (
            <div className="applicant-empty-rich" style={{ textAlign: 'center', padding: '40px 20px 60px' }}>
              <div className="applicant-empty-icon" style={{ margin: '0 auto 16px' }}>TL</div>
              <h3 style={{ fontSize: '16px', color: '#071b3a', marginBottom: '8px' }}>Select an application</h3>
              <p style={{ color: '#475569', fontSize: '13px', maxWidth: '400px', margin: '0 auto' }}>Timeline events appear after you choose a linked application.</p>
            </div>
          )}

          {events && events.length === 0 && (
            <div className="applicant-empty-rich" style={{ textAlign: 'center', padding: '40px 20px 60px' }}>
              <div className="applicant-empty-icon" style={{ margin: '0 auto 16px' }}>TL</div>
              <h3 style={{ fontSize: '16px', color: '#071b3a', marginBottom: '8px' }}>No timeline events yet</h3>
              <p style={{ color: '#475569', fontSize: '13px', maxWidth: '400px', margin: '0 auto' }}>Timeline events will appear here after documents, comments, objections, or status changes are recorded.</p>
            </div>
          )}

          {events && events.length > 0 && (
            <ol className="applicant-timeline" style={{ marginTop: 0 }}>
              {events.map((event, index) => {
                const type = eventType(event)
                const when = eventDateParts(eventTime(event))
                return (
                  <li key={`${eventTitle(event)}-${index}`} className="applicant-timeline-item">
                    <span className={eventClass(type)}>{eventIcon(type)}</span>
                    <article className="applicant-card applicant-timeline-card" style={{ background: '#ffffff', padding: '16px 20px' }}>
                      <div className="applicant-result-head">
                        <div>
                          <p className="applicant-muted-label">Event type</p>
                          <h3 className="applicant-card-title">{eventTitle(event)}</h3>
                          <p className="applicant-event-description">{eventDescription(event)}</p>
                        </div>
                        <div className="applicant-timeline-meta">
                          <span className="applicant-timeline-time" style={{ alignSelf: 'flex-start', flexShrink: 0 }}>
                            <strong>{when.date}</strong>
                            <small>{when.time}</small>
                          </span>
                          <span className={statusClass(eventStatus(event))}>{eventStatus(event)}</span>
                        </div>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
        
        <aside className="applicant-card" style={{ padding: '24px', background: '#ffffff', alignSelf: 'start' }}>
          <p className="applicant-muted-label">Overview</p>
          <h2 style={{ fontSize: '14px', margin: '8px 0 16px', color: '#071b3a' }}>Application Details</h2>
          {selectedApplication ? (
            <ApplicationSummaryCard application={selectedApplication} />
          ) : (
            <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', margin: 0 }}>
              Choose an application from the dropdown to view parcel, type, and status from the database.
            </p>
          )}
        </aside>
      </div>
    </ApplicantLayout>
  )
}
