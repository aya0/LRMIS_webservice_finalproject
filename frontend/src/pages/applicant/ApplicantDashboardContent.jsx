import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApplicant, getTimeline } from '../../services/applicantApi'
import {
  getApplicationId,
  getParcelField,
  getParcelNumber,
  statusClass,
  useApplicantApplications,
} from './ApplicantApplicationSelect'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError, getSavedApplicantId } from './applicantUx'
import './applicantPortal.css'

function displayValue(value, fallback = 'Not provided') {
  if (value === null || value === undefined || value === '') return fallback
  return String(value)
}

function titleCase(value) {
  return displayValue(value).replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function formatDate(value) {
  if (!value) return 'Not recorded'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
}

function formatTime(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function eventType(event) {
  return event?.type || event?.status || event?.action || 'activity_recorded'
}

function eventTitle(event) {
  const labels = {
    document_uploaded: 'Document uploaded',
    comment_submitted: 'Comment submitted',
    objection_submitted: 'Objection submitted',
    status_changed: 'Status changed',
    application_submitted: 'Application submitted',
  }
  return labels[eventType(event)] || titleCase(eventType(event))
}

function eventTime(event) {
  return event?.at || event?.created_at || event?.updated_at || event?.timestamp || ''
}

function calculateProfileCompletion(applicant) {
  if (!applicant) return 0
  const items = profileChecklist(applicant)
  const complete = items.filter(item => item.complete).length
  return Math.round((complete / items.length) * 100)
}

function profileChecklist(applicant) {
  const checks = [
    {
      label: 'Identity',
      helper: 'Name, applicant type, and identity number',
      complete: Boolean(applicant?.full_name && applicant?.applicant_type && (applicant?.national_id || applicant?.registration_number)),
    },
    {
      label: 'Contact Information',
      helper: 'Email and phone number',
      complete: Boolean(applicant?.contact?.email && applicant?.contact?.phone),
    },
    {
      label: 'Address',
      helper: 'City or town and neighborhood',
      complete: Boolean((applicant?.address?.city || applicant?.address?.district) && applicant?.address?.neighborhood),
    },
    {
      label: 'Preferences',
      helper: 'Review notification and privacy settings',
      complete: Boolean(applicant?.preferred_language && applicant?.notification_preferences && applicant?.privacy_settings),
    },
  ]
  return checks
}

function isPending(status) {
  return ['submitted', 'survey_required', 'missing_documents', 'pending_review', 'under_review', 'legal_review'].includes(status)
}

export default function ApplicantDashboardContent() {
  const savedApplicantId = getSavedApplicantId()
  const { applications, loading: loadingApplications, error: applicationsError } = useApplicantApplications()
  const [applicant, setApplicant] = useState(null)
  const [profileLoading, setProfileLoading] = useState(Boolean(savedApplicantId))
  const [profileError, setProfileError] = useState('')
  const [activity, setActivity] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function loadApplicant() {
      if (!savedApplicantId) {
        setProfileLoading(false)
        return
      }

      setProfileLoading(true)
      setProfileError('')
      try {
        const res = await getApplicant(savedApplicantId)
        if (active) setApplicant(res.data)
      } catch (err) {
        if (active) setProfileError(friendlyApplicantError(err, 'We could not load your profile.'))
      } finally {
        if (active) setProfileLoading(false)
      }
    }

    loadApplicant()
    return () => {
      active = false
    }
  }, [savedApplicantId])

  useEffect(() => {
    let active = true

    async function loadActivity() {
      if (!applications.length) {
        setActivity([])
        return
      }

      setActivityLoading(true)
      try {
        const results = await Promise.allSettled(
          applications.slice(0, 5).map(app =>
            getTimeline(getApplicationId(app)).then(res => ({
              application: app,
              events: Array.isArray(res.data) ? res.data : [],
            }))
          )
        )
        if (!active) return
        const rows = results
          .filter(result => result.status === 'fulfilled')
          .flatMap(result =>
            result.value.events.map(event => ({
              ...event,
              application_id: getApplicationId(result.value.application),
            }))
          )
          .sort((a, b) => new Date(eventTime(b) || 0) - new Date(eventTime(a) || 0))
        setActivity(rows.slice(0, 6))
      } finally {
        if (active) setActivityLoading(false)
      }
    }

    loadActivity()
    return () => {
      active = false
    }
  }, [applications])

  const metrics = useMemo(() => {
    const pending = applications.filter(app => isPending(app.status)).length
    const underObjection = applications.filter(app => app.status === 'under_objection').length
    const uploadedDocuments = activity.filter(event => eventType(event) === 'document_uploaded').length
    return {
      total: applications.length,
      pending,
      underObjection,
      uploadedDocuments,
    }
  }, [activity, applications])

  const profileCompletion = calculateProfileCompletion(applicant)
  const checklist = profileChecklist(applicant)
  const hasAnyMetric = Object.values(metrics).some(value => value > 0)
  const applicantName = applicant?.full_name || 'Applicant'
  const recentApplications = applications.slice(0, 5)
  const profileActionLabel = applicant ? 'Profile Information' : 'Create Profile'
  const hasProfile = Boolean(savedApplicantId && applicant)
  const isProfileIncomplete = hasProfile && profileCompletion < 100

  return (
    <ApplicantLayout>
      <section className="portal-dashboard-grid">
        <div className="portal-dashboard-main">
          <section className="portal-welcome-card">
            <div className="portal-welcome-copy">
              <p className="portal-kicker">Applicant Portal</p>
              <h1>{hasProfile ? `Welcome back, ${applicantName}` : 'Complete your applicant profile to start using the portal'}</h1>
              <p>{hasProfile ? 'Your applicant profile is saved and ready for portal services.' : 'Create your profile to access land registration services.'}</p>
              <span>
                {hasProfile
                  ? 'Manage land registration applications, uploaded documents, comments, objections, and profile details.'
                  : 'Create your profile once, then use the portal to access linked land registration services.'}
              </span>
              {!hasProfile && (
                <div className="portal-welcome-actions">
                  <Link to="/applicant/create-profile" className="portal-primary-button">Create Profile</Link>
                </div>
              )}
            </div>
            <div className="portal-completion-block" aria-label={`Profile ${profileCompletion}% complete`}>
              <div className="portal-progress-ring" style={{ '--progress': `${profileCompletion}%` }}>
                <strong>{profileCompletion}%</strong>
              </div>
              <div className="portal-checklist">
                <h2>Profile Checklist</h2>
                {checklist.map(item => (
                  <div key={item.label} className={`portal-check-item${item.complete ? ' portal-check-item-done' : ''}`}>
                    <span>{item.complete ? 'OK' : '!'}</span>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.complete ? 'Completed' : item.helper}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {!hasProfile && (
            <section className="portal-guidance-card">
              <strong>Please create your profile first</strong>
              <p>Your applicant profile is required before linked applications, documents, comments, objections, and timeline events can be loaded.</p>
              <Link to="/applicant/create-profile" className="portal-primary-button">Create Profile</Link>
            </section>
          )}

          {isProfileIncomplete && (
            <section className="portal-guidance-card portal-guidance-info">
              <strong>Finish your profile setup</strong>
              <p>Complete the pending checklist items to make your applicant record easier for staff to review.</p>
              <Link to="/applicant/create-profile" className="portal-primary-link">Update profile information</Link>
            </section>
          )}

          {profileError && (
            <GuidanceCard
              title="We could not load your profile"
              text="Your saved profile may be unavailable or the service may be offline. You can create a profile again or try refreshing the page."
              actionLabel="Create Profile"
              to="/applicant/create-profile"
            />
          )}
          {savedApplicantId && applicationsError && (
            <GuidanceCard
              title="We could not load your applications"
              text="Applications will appear here once the service is available and applications are linked to your profile."
              actionLabel="Try My Applications"
              to="/applicant/applications"
            />
          )}

          {hasAnyMetric && (
            <section className="portal-kpi-grid">
              <KpiCard label="Total Applications" value={metrics.total} tone="blue" caption="All linked applications" />
              <KpiCard label="Pending" value={metrics.pending} tone="amber" caption="Awaiting review" />
              <KpiCard label="Under Objection" value={metrics.underObjection} tone="rose" caption="Requires attention" />
              <KpiCard label="Documents Uploaded" value={metrics.uploadedDocuments} tone="green" caption="From recent activity" />
            </section>
          )}

          <section className="portal-card">
            <div className="portal-section-head">
              <div>
                <h2>Recent Applications</h2>
                <p>Applications are loaded from your applicant profile.</p>
              </div>
              <Link to="/applicant/applications" className="portal-link-button">View All</Link>
            </div>

            {loadingApplications ? (
              <div className="portal-skeleton-table" aria-label="Loading applications">
                <span /><span /><span /><span />
              </div>
            ) : recentApplications.length ? (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      <th>Application ID</th>
                      <th>Type</th>
                      <th>Parcel Number</th>
                      <th>Zone</th>
                      <th>Status</th>
                      <th>Submitted Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentApplications.map(app => (
                      <tr key={getApplicationId(app)}>
                        <td>{getApplicationId(app)}</td>
                        <td>{titleCase(app.application_type)}</td>
                        <td>{getParcelNumber(app)}</td>
                        <td>{getParcelField(app, 'zone_id')}</td>
                        <td><span className={statusClass(app.status)}>{app.status || 'unknown'}</span></td>
                        <td>{formatDate(app.created_at || app.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No linked applications yet"
                text={hasProfile ? 'Applications linked to your profile will appear here.' : 'Create your applicant profile first, then linked applications will appear here.'}
                actionLabel={hasProfile ? 'Go to My Applications' : 'Create Profile'}
                to={hasProfile ? '/applicant/applications' : '/applicant/create-profile'}
              />
            )}
          </section>
        </div>

        <aside className="portal-dashboard-side">
          <section className="portal-card">
            <h2>Quick Actions</h2>
            <div className="portal-action-grid">
              {!hasProfile ? (
                <QuickAction to="/applicant/create-profile" label="Create Profile" wide />
              ) : (
                <>
                  <QuickAction to="/applicant/profile" label={profileActionLabel} />
                  <QuickAction to="/applicant/applications" label="My Applications" />
                  <QuickAction to="/applicant/upload-document" label="Upload Document" />
                  <QuickAction to="/applicant/comment" label="Add Comment" />
                  <QuickAction to="/applicant/objection" label="Submit Objection" />
                  <QuickAction to="/applicant/timeline" label="View Timeline" />
                </>
              )}
            </div>
          </section>

          <section className="portal-card">
            <div className="portal-section-head compact">
              <h2>Recent Activity</h2>
              <Link to="/applicant/timeline" className="portal-link-button">Timeline</Link>
            </div>
            {activityLoading ? (
              <div className="portal-skeleton-list" aria-label="Loading recent activity">
                <span /><span /><span />
              </div>
            ) : activity.length ? (
              <div className="portal-activity-list">
                {activity.map((event, index) => (
                  <article key={`${eventTitle(event)}-${event.application_id}-${index}`} className="portal-activity-item">
                    <span className={`portal-activity-dot ${eventType(event).replaceAll('_', '-')}`}>{eventType(event).slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{eventTitle(event)}</strong>
                      <p>{event.application_id}</p>
                      <small>{formatDate(eventTime(event))} {formatTime(eventTime(event))}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                title="No activity yet"
                text={hasProfile ? 'Document uploads, comments, objections, and status changes will appear here.' : 'Create your profile to start tracking portal activity.'}
                actionLabel={hasProfile ? 'View Timeline' : 'Create Profile'}
                to={hasProfile ? '/applicant/timeline' : '/applicant/create-profile'}
              />
            )}
          </section>

          <section className="portal-card">
            <h2>Profile Summary</h2>
            {profileLoading ? (
              <div className="portal-skeleton-list" aria-label="Loading profile">
                <span /><span /><span />
              </div>
            ) : applicant ? (
              <dl className="portal-profile-summary">
                <div><dt>Full Name</dt><dd>{displayValue(applicant?.full_name)}</dd></div>
                <div><dt>Applicant Type</dt><dd>{titleCase(applicant?.applicant_type)}</dd></div>
                <div><dt>Phone</dt><dd>{displayValue(applicant?.contact?.phone)}</dd></div>
                <div><dt>Email</dt><dd>{displayValue(applicant?.contact?.email)}</dd></div>
              </dl>
            ) : (
              <EmptyState
                compact
                title="No profile information"
                text="Create your applicant profile to show your identity and contact summary here."
                actionLabel="Create Profile"
                to="/applicant/create-profile"
              />
            )}
            {applicant && <Link to="/applicant/profile" className="portal-profile-link">View Full Profile</Link>}
          </section>
        </aside>
      </section>
    </ApplicantLayout>
  )
}

function KpiCard({ label, value, tone, caption }) {
  return (
    <article className={`portal-kpi-card portal-kpi-${tone}`}>
      <span>{label.slice(0, 2).toUpperCase()}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        <small>{caption}</small>
      </div>
    </article>
  )
}

function QuickAction({ to, label, wide = false }) {
  return (
    <Link to={to} className={`portal-action-button${wide ? ' portal-action-button-wide' : ''}`}>
      <span>{label.slice(0, 2).toUpperCase()}</span>
      {label}
    </Link>
  )
}

function EmptyState({ title, text, actionLabel, to, compact = false }) {
  return (
    <div className={`portal-empty-state portal-empty-rich${compact ? ' small' : ''}`}>
      <strong>{title}</strong>
      <p>{text}</p>
      {to && actionLabel && <Link to={to}>{actionLabel}</Link>}
    </div>
  )
}

function GuidanceCard({ title, text, actionLabel, to }) {
  return (
    <section className="portal-guidance-card">
      <strong>{title}</strong>
      <p>{text}</p>
      {to && <Link to={to} className="portal-primary-link">{actionLabel}</Link>}
    </section>
  )
}
