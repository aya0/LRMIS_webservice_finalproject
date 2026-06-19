import { useState } from 'react'
import { getApplicantApplications, getTimeline } from '../../services/applicantApi'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError, getSavedApplicantId } from './applicantUx'
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
  if (type === 'document_uploaded') return 'Your document was uploaded successfully.'
  if (type === 'comment_submitted') return 'You submitted a comment.'
  if (type === 'objection_submitted') return 'You submitted an objection.'
  return 'Your application timeline was updated.'
}

function eventStatus(event) {
  const type = eventType(event)
  if (type === 'document_uploaded') return event.meta?.status || 'uploaded'
  if (type === 'comment_submitted') return 'submitted'
  if (type === 'objection_submitted') return event.meta?.status || 'submitted'
  return event.status || 'recorded'
}

export default function ApplicationTimeline() {
  const [applicationId, setApplicationId] = useState('')
  const [events, setEvents] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldError, setFieldError] = useState('')
  const [overview, setOverview] = useState(null)

  function validate() {
    const id = applicationId.trim()
    if (!id) {
      setFieldError('Application ID is required.')
      return false
    }
    if (!/^[A-Za-z0-9\-]+$/.test(id)) {
      setFieldError('Application ID can contain letters, numbers, and hyphens only.')
      return false
    }
    setFieldError('')
    return true
  }

  async function loadTimeline() {
    if (!validate()) return
    setLoading(true)
    setError(null)
    setEvents(null)
    setOverview(null)
    try {
      const res = await getTimeline(applicationId.trim())
      setEvents(res.data)
      const applicantId = getSavedApplicantId()
      if (applicantId) {
        try {
          const apps = await getApplicantApplications(applicantId)
          setOverview(apps.data.find(app => app.application_id === applicationId.trim() || app.id === applicationId.trim()) || null)
        } catch {
          setOverview(null)
        }
      }
    } catch (err) {
      setError(friendlyApplicantError(err, 'Unable to fetch timeline. Check the Application ID and try again.'))
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
          View the activity timeline for your application.
        </p>

        <section className="applicant-card applicant-search-card" style={{ marginBottom: '24px' }}>
          <form onSubmit={fetchTimeline} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', width: '100%', flexWrap: 'wrap' }}>
            <label className="applicant-field" style={{ flex: '1 1 300px', margin: 0 }}>
              <span>Application ID</span>
              <input
                required
                value={applicationId}
                onChange={e => {
                  setApplicationId(e.target.value)
                  if (fieldError) {
                    if (/^[A-Za-z0-9\-]+$/.test(e.target.value.trim())) setFieldError('')
                  }
                }}
                onBlur={() => {
                  const id = applicationId.trim()
                  if (!id) setFieldError('Application ID is required.')
                  else if (!/^[A-Za-z0-9\-]+$/.test(id)) setFieldError('Application ID can contain letters, numbers, and hyphens only.')
                  else setFieldError('')
                }}
                placeholder="e.g. LRMIS-2026-0001"
                className={fieldError ? 'applicant-input-error' : ''}
              />
              {fieldError && <span className="applicant-field-error">{fieldError}</span>}
            </label>
            <div className="applicant-inline-actions" style={{ display: 'flex', gap: '8px' }}>
              <button disabled={loading} className="applicant-button">
                {loading ? 'Loading...' : 'View Timeline'}
              </button>
              <button type="button" disabled={loading || !applicationId.trim()} onClick={loadTimeline} className="applicant-button-secondary">
                Refresh
              </button>
            </div>
          </form>
        </section>

        {error && <div className="applicant-error" style={{ marginBottom: '24px' }}>{error}</div>}

        <div className="applicant-track-layout">
          <section className="applicant-card applicant-section" style={{ marginTop: 0 }}>
            <h2 style={{ fontSize: '18px', color: '#071b3a', marginBottom: '24px' }}>Timeline Results</h2>

            {events && events.length === 0 && (
              <div className="applicant-empty-rich" style={{ textAlign: 'center', padding: '40px 20px 60px' }}>
                <div className="applicant-empty-icon" style={{ background: '#f8fafc', color: '#64748b', margin: '0 auto 16px', border: '1px solid #e2e8f0', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '16px', fontWeight: 'bold' }}>TL</div>
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
                          <h3 className="applicant-card-title">
                            {eventTitle(event)}
                          </h3>
                          <p className="applicant-event-description">{eventDescription(event)}</p>
                        </div>
                        <div className="applicant-timeline-meta">
                          <span className="applicant-timeline-time" style={{ alignSelf: 'flex-start', flexShrink: 0 }}>
                            <strong>{when.date}</strong>
                            <small>{when.time}</small>
                          </span>
                          <span className={`applicant-status applicant-status-${String(eventStatus(event)).replaceAll('_', '-')}`}>
                            {eventStatus(event)}
                          </span>
                        </div>
                      </div>
                    </article>
                  </li>
                )})}
              </ol>
            )}

            {events && events.length > 0 && (
              <details className="applicant-details applicant-timeline-debug">
                <summary>Technical Details</summary>
                <pre>{JSON.stringify(events, null, 2)}</pre>
              </details>
            )}
          </section>
          
          <aside className="applicant-card" style={{ padding: '24px', background: '#ffffff', alignSelf: 'start' }}>
            <p className="applicant-muted-label">Overview</p>
            <h2 style={{ fontSize: '14px', margin: '8px 0 16px', color: '#071b3a' }}>Application Details</h2>
            {overview ? (
              <dl className="applicant-kv" style={{ gridTemplateColumns: '1fr', rowGap: '10px' }}>
                <div className="applicant-detail">
                  <dt>Status</dt>
                  <dd><span className={`applicant-status applicant-status-${String(overview.status || '').replaceAll('_', '-')}`}>{overview.status || 'Not provided'}</span></dd>
                </div>
                <div className="applicant-detail">
                  <dt>Application Type</dt>
                  <dd>{overview.application_type || 'Not provided'}</dd>
                </div>
                <div className="applicant-detail">
                  <dt>Parcel Number</dt>
                  <dd>{overview.parcel_ref?.parcel_number || 'Not provided'}</dd>
                </div>
                <div className="applicant-detail">
                  <dt>Zone ID</dt>
                  <dd>{overview.parcel_ref?.zone_id || 'Not provided'}</dd>
                </div>
                <div className="applicant-detail">
                  <dt>Submitted Date</dt>
                  <dd>{overview.timestamps?.submitted_at || 'Not provided'}</dd>
                </div>
              </dl>
            ) : (
              <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5', margin: 0 }}>
                Enter an application ID to view timeline events. Overview details appear when the application is linked to the saved applicant profile.
              </p>
            )}
          </aside>
        </div>
    </ApplicantLayout>
  )
}
