import { useEffect, useMemo, useState } from 'react'
import { getApplicantApplications } from '../../services/applicantApi'
import { friendlyApplicantError, getSavedApplicantId } from './applicantUx'

export function getApplicationId(app) {
  return app?.application_id || app?.id || app?._id || ''
}

export function getParcelNumber(app) {
  return app?.parcel_ref?.parcel_number || app?.parcel_number || 'No parcel'
}

export function getParcelField(app, fieldName) {
  return app?.parcel_ref?.[fieldName] || app?.[fieldName] || 'Not provided'
}

export function statusClass(status) {
  return `applicant-status applicant-status-${String(status || 'unknown').replaceAll('_', '-')}`
}

export function applicationLabel(app) {
  const id = getApplicationId(app) || 'Unknown application'
  const type = app?.application_type || 'type not set'
  const parcel = getParcelNumber(app)
  const status = app?.status || 'status not set'
  return `${id} | ${type} | Parcel ${parcel} | ${status}`
}

export function useApplicantApplications() {
  const applicantId = useMemo(() => getSavedApplicantId(), [])
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(Boolean(applicantId))
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadApplications() {
      if (!applicantId) {
        setLoading(false)
        setError('No applicant profile is saved in this browser. Create or log in to an applicant profile first.')
        return
      }

      setLoading(true)
      setError('')
      try {
        const res = await getApplicantApplications(applicantId)
        if (active) setApplications(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        if (active) setError(friendlyApplicantError(err, 'Unable to load linked applications.'))
      } finally {
        if (active) setLoading(false)
      }
    }

    loadApplications()
    return () => {
      active = false
    }
  }, [applicantId])

  return { applicantId, applications, loading, error }
}

export function ApplicantApplicationSelect({
  applications = [],
  value,
  onChange,
  error,
  loading = false,
  label = 'Application',
}) {
  const safeApplications = Array.isArray(applications) ? applications : []
  const selected = safeApplications.find(app => getApplicationId(app) === value)

  useEffect(() => {
    if (!loading && !value && safeApplications.length > 0) {
      onChange(getApplicationId(safeApplications[0]))
    }
  }, [safeApplications, loading, onChange, value])

  return (
    <div className="applicant-application-picker">
      <label className="applicant-field">
        <span>{label}<span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span></span>
        <select
          required
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={loading || safeApplications.length === 0}
          className={error ? 'applicant-input-error' : ''}
        >
          <option value="" disabled>
            {loading ? 'Loading applications...' : safeApplications.length ? 'Select linked application' : 'No linked applications found'}
          </option>
          {safeApplications.map(app => {
            const id = getApplicationId(app)
            return <option key={id} value={id}>{applicationLabel(app)}</option>
          })}
        </select>
        {error && <span className="applicant-field-error">{error}</span>}
      </label>

      {safeApplications.length === 0 && !loading && (
        <div className="applicant-empty-inline">No linked applications found. Submit an application first.</div>
      )}

      {selected && <ApplicationSummaryCard application={selected} compact />}
    </div>
  )
}

export function ApplicationSummaryCard({ application, compact = false }) {
  if (!application) return null

  return (
    <section className={`applicant-app-summary${compact ? ' applicant-app-summary-compact' : ''}`}>
      <div>
        <span>Application ID</span>
        <strong>{getApplicationId(application) || 'Not provided'}</strong>
      </div>
      <div>
        <span>Type</span>
        <strong>{application.application_type || 'Not provided'}</strong>
      </div>
      <div>
        <span>Parcel</span>
        <strong>{getParcelNumber(application)}</strong>
      </div>
      <div>
        <span>Block</span>
        <strong>{getParcelField(application, 'block_number')}</strong>
      </div>
      <div>
        <span>Basin</span>
        <strong>{getParcelField(application, 'basin_number')}</strong>
      </div>
      <div>
        <span>Zone</span>
        <strong>{getParcelField(application, 'zone_id')}</strong>
      </div>
      <div>
        <span>Status</span>
        <strong><span className={statusClass(application.status)}>{application.status || 'Not provided'}</span></strong>
      </div>
    </section>
  )
}
