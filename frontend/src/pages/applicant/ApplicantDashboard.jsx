import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApplicant } from '../../services/applicantApi'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError, getSavedApplicantId } from './applicantUx'
import './applicantPortal.css'

function displayValue(value) {
  if (value === null || value === undefined || value === '') return 'Not provided'
  return String(value)
}

function formatLabel(value) {
  return displayValue(value).replaceAll('_', ' ')
}

function preferenceLabel(enabled) {
  return enabled ? 'Enabled' : 'Disabled'
}

export default function ApplicantDashboard() {
  const savedApplicantId = getSavedApplicantId()
  const [applicant, setApplicant] = useState(null)
  const [loading, setLoading] = useState(Boolean(savedApplicantId))
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true

    async function loadApplicant() {
      if (!savedApplicantId) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')
      try {
        const res = await getApplicant(savedApplicantId)
        if (active) setApplicant(res.data)
      } catch (err) {
        if (active) setError(friendlyApplicantError(err, 'Unable to load applicant profile.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadApplicant()
    return () => {
      active = false
    }
  }, [savedApplicantId])

  async function copyValue(value) {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
  }

  const linkedCount = Array.isArray(applicant?.linked_applications)
    ? applicant.linked_applications.length
    : 0

  return (
    <ApplicantLayout>
      <section className="applicant-card applicant-hero-split" style={{ marginBottom: '24px', padding: '32px' }}>
        <div style={{ flex: 1 }}>
          <p className="applicant-eyebrow" style={{ color: '#2563eb' }}>APPLICANT PORTAL</p>
          <h1 className="applicant-title" style={{ color: '#071b3a', marginTop: '4px' }}>Applicant Dashboard</h1>
          <p className="applicant-subtitle" style={{ color: '#405875', marginTop: '8px', maxWidth: '460px' }}>
            Manage your profile, linked applications, documents, comments, objections, and timeline.
          </p>
          <div className="applicant-hero-actions" style={{ marginTop: '24px', justifyContent: 'flex-start', gap: '14px' }}>
            <Link to="/applicant/create-profile" className="applicant-hero-button" style={{ height: '44px', padding: '0 20px', borderRadius: '8px' }}>+ Create Profile</Link>
            <Link to="/applicant/applications" className="applicant-hero-button-secondary" style={{ height: '44px', padding: '0 20px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', fontWeight: 800 }}>Track Applications</Link>
          </div>
        </div>
      </section>

      {!savedApplicantId && (
        <section className="applicant-card" style={{ padding: '28px', textAlign: 'center' }}>
          <p className="applicant-card-title">No Applicant ID yet</p>
          <p style={{ color: '#475569', fontSize: '14px', margin: '8px auto 20px', maxWidth: '460px' }}>
            Create your applicant profile first. Your Applicant ID will be saved locally so this dashboard can load your real profile.
          </p>
          <Link to="/applicant/create-profile" className="applicant-button" style={{ textDecoration: 'none', display: 'inline-flex' }}>Create Profile</Link>
        </section>
      )}

      {savedApplicantId && (
        <>
          {loading && <section className="applicant-card" style={{ padding: '24px' }}>Loading applicant profile...</section>}
          {error && (
            <section className="applicant-card" style={{ padding: '24px' }}>
              <div className="applicant-error" style={{ margin: 0 }}>{error}</div>
              <p style={{ color: '#475569', fontSize: '13px', marginTop: '14px' }}>
                Saved Applicant ID: <span className="applicant-badge">{savedApplicantId}</span>
              </p>
            </section>
          )}

          {applicant && (
            <div className="applicant-track-layout">
              <section className="applicant-card applicant-section" style={{ marginTop: 0 }}>
                <div className="applicant-result-head" style={{ marginBottom: '20px' }}>
                  <div>
                    <p className="applicant-muted-label">Applicant profile</p>
                    <h2 style={{ fontSize: '20px', color: '#071b3a', margin: '4px 0 0' }}>{displayValue(applicant.full_name)}</h2>
                  </div>
                  <span className="applicant-status">{formatLabel(applicant.verification_state)}</span>
                </div>

                <dl className="applicant-kv" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', rowGap: '12px', columnGap: '20px' }}>
                  <div className="applicant-detail">
                    <dt>Applicant ID</dt>
                    <dd style={{ wordBreak: 'break-all' }}>{applicant.id}</dd>
                  </div>
                  <div className="applicant-detail">
                    <dt>Applicant Type</dt>
                    <dd>{formatLabel(applicant.applicant_type)}</dd>
                  </div>
                  <div className="applicant-detail">
                    <dt>Email</dt>
                    <dd>{displayValue(applicant.contact?.email)}</dd>
                  </div>
                  <div className="applicant-detail">
                    <dt>Phone</dt>
                    <dd>{displayValue(applicant.contact?.phone)}</dd>
                  </div>
                  <div className="applicant-detail">
                    <dt>Preferred Language</dt>
                    <dd>{displayValue(applicant.preferred_language)}</dd>
                  </div>
                  <div className="applicant-detail">
                    <dt>Linked Applications</dt>
                    <dd>{linkedCount}</dd>
                  </div>
                </dl>

                <div className="applicant-actions" style={{ justifyContent: 'flex-start', marginTop: '24px' }}>
                  <button type="button" className="applicant-button-copy" onClick={() => copyValue(applicant.id)}>
                    {copied ? 'Copied!' : 'Copy Applicant ID'}
                  </button>
                  <Link to="/applicant/applications" className="applicant-button" style={{ textDecoration: 'none' }}>Track Applications</Link>
                </div>
              </section>

              <aside className="applicant-card" style={{ padding: '24px', background: '#ffffff', alignSelf: 'start' }}>
                <p className="applicant-muted-label">Notification stub</p>
                <h2 style={{ fontSize: '14px', margin: '8px 0 16px', color: '#071b3a' }}>Notification Preferences</h2>
                <dl className="applicant-kv" style={{ gridTemplateColumns: '1fr', rowGap: '10px' }}>
                  <div className="applicant-detail">
                    <dt>Email notifications</dt>
                    <dd>{preferenceLabel(applicant.notification_preferences?.email)}</dd>
                  </div>
                  <div className="applicant-detail">
                    <dt>SMS notifications</dt>
                    <dd>{preferenceLabel(applicant.notification_preferences?.sms)}</dd>
                  </div>
                </dl>
                <p style={{ display: 'block', marginTop: '16px', color: '#64748b', fontSize: '12px', lineHeight: '1.5' }}>
                  These fields are stored for notification stubs only. No email or SMS is sent from this module.
                </p>
              </aside>
            </div>
          )}
        </>
      )}
    </ApplicantLayout>
  )
}
