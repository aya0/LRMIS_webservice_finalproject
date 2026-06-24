import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getApplicant } from '../../services/applicantApi'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError, getSavedApplicantId } from './applicantUx'
import './applicantPortal.css'

function valueOrEmpty(value) {
  if (value === null || value === undefined || value === '') return 'Not provided'
  return String(value).replaceAll('_', ' ')
}

function enabled(value) {
  return value ? 'Enabled' : 'Disabled'
}

export default function ApplicantProfile() {
  const [applicantId, setApplicantId] = useState(getSavedApplicantId())
  const [applicant, setApplicant] = useState(null)
  const [loading, setLoading] = useState(Boolean(applicantId))
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadProfile() {
      if (!applicantId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const res = await getApplicant(applicantId)
        if (active) setApplicant(res.data)
      } catch (err) {
        if (!active) return
        if (err.response?.status === 404) {
          localStorage.removeItem('lrmis_applicant_id')
          setApplicantId('')
        } else {
          setError(friendlyApplicantError(err, 'Unable to load applicant profile.'))
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProfile()
    return () => {
      active = false
    }
  }, [applicantId])

  return (
    <ApplicantLayout>
      <p className="applicant-page-label">MY PROFILE</p>
      <h1 className="applicant-page-title">My Profile</h1>
      <p className="applicant-page-subtitle">View your applicant profile information from the backend record.</p>

      {!applicantId && !loading && (
        <section className="applicant-card applicant-section applicant-empty-state">
          <h2>No applicant profile found. Please create your profile first.</h2>
          <p>Create an applicant profile first so this page can load your backend profile.</p>
          <Link to="/applicant/create-profile" className="applicant-button">Create Profile</Link>
        </section>
      )}

      {loading && <section className="applicant-card applicant-section">Loading profile...</section>}
      {error && <div className="applicant-error">{error}</div>}

      {applicant && (
        <section className="applicant-card applicant-section applicant-profile-view">
          <div className="applicant-section-header">
            <div>
              <p className="applicant-muted-label">Applicant</p>
              <h2>{valueOrEmpty(applicant.full_name)}</h2>
            </div>
            <Link to="/applicant/create-profile" className="applicant-button-secondary">Edit Profile</Link>
          </div>

          <div className="applicant-profile-cards">
            <article className="applicant-profile-card">
              <p className="applicant-muted-label">Identity</p>
              <dl>
                <ProfileRow label="Full Name" value={valueOrEmpty(applicant.full_name)} />
                <ProfileRow label="Applicant Type" value={valueOrEmpty(applicant.applicant_type)} />
                <ProfileRow label="National ID" value={valueOrEmpty(applicant.national_id)} />
                <ProfileRow label="Registration Number" value={valueOrEmpty(applicant.registration_number)} />
                <ProfileRow label="Verification" value={valueOrEmpty(applicant.verification_state)} />
              </dl>
            </article>
            <article className="applicant-profile-card">
              <p className="applicant-muted-label">Contact</p>
              <dl>
                <ProfileRow label="Email" value={valueOrEmpty(applicant.contact?.email)} />
                <ProfileRow label="Phone" value={valueOrEmpty(applicant.contact?.phone)} />
                <ProfileRow label="Address" value={[
                  applicant.address?.city,
                  applicant.address?.neighborhood,
                  applicant.address?.street,
                  applicant.address?.zone_id,
                ].filter(Boolean).join(', ') || 'Not provided'} />
              </dl>
            </article>
            <article className="applicant-profile-card">
              <p className="applicant-muted-label">Preferences</p>
              <dl>
                <ProfileRow label="Language" value={valueOrEmpty(applicant.preferred_language)} />
                <ProfileRow label="Email Notifications" value={enabled(applicant.notification_preferences?.email)} />
                <ProfileRow label="SMS Notifications" value={enabled(applicant.notification_preferences?.sms)} />
                <ProfileRow label="Share With Authorities" value={enabled(applicant.privacy_settings?.share_contact_with_staff)} />
                <ProfileRow label="Status Tracking" value={enabled(applicant.privacy_settings?.allow_status_notifications)} />
              </dl>
            </article>
            <article className="applicant-profile-card">
              <p className="applicant-muted-label">Statistics</p>
              <dl>
                <ProfileRow label="Linked Applications" value={Array.isArray(applicant.linked_applications) ? String(applicant.linked_applications.length) : '0'} />
                <ProfileRow label="Profile ID" value={valueOrEmpty(applicant.id || applicant._id)} />
                <ProfileRow label="Created" value={valueOrEmpty(applicant.created_at)} />
                <ProfileRow label="Updated" value={valueOrEmpty(applicant.updated_at)} />
              </dl>
            </article>
          </div>
        </section>
      )}
    </ApplicantLayout>
  )
}

function ProfileRow({ label, value }) {
  return (
    <div className="applicant-profile-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
