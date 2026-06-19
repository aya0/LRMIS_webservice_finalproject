import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getApplicantApplications } from '../../services/applicantApi'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError, getSavedApplicantId } from './applicantUx'
import './applicantPortal.css'

const STATUS_OPTIONS = [
  'submitted',
  'pre_checked',
  'survey_required',
  'surveyed',
  'legal_review',
  'approved',
  'certificate_issued',
  'closed',
  'rejected',
  'on_hold',
  'missing_documents',
  'under_objection',
]

function errorMessage(err) {
  return friendlyApplicantError(err, 'Unable to fetch applications. Check the Applicant ID and try again.')
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return 'Not provided'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function statusClass(status) {
  const token = String(status || 'unknown').replaceAll('_', '-')
  return `applicant-status applicant-status-${token}`
}

export default function ApplicantApplications() {
  const [applicantId, setApplicantId] = useState(() => getSavedApplicantId())
  const [applications, setApplications] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldError, setFieldError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  function validate() {
    const id = applicantId.trim()
    if (!id) {
      setFieldError('Applicant ID is required.')
      return false
    }
    if (!/^[a-fA-F0-9]{24}$/.test(id)) {
      setFieldError('Applicant ID must be a valid 24-character ID.')
      return false
    }
    setFieldError('')
    return true
  }

  async function fetchApplications(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError(null)
    setApplications(null)
    try {
      const res = await getApplicantApplications(applicantId.trim())
      setApplications(res.data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const filteredApplications = Array.isArray(applications)
    ? applications.filter(app => {
        const query = search.trim().toLowerCase()
        const applicationId = displayValue(app.application_id).toLowerCase()
        const parcelNumber = displayValue(app.parcel_ref?.parcel_number).toLowerCase()
        const matchesSearch = !query || applicationId.includes(query) || parcelNumber.includes(query)
        const matchesStatus = !statusFilter || app.status === statusFilter
        return matchesSearch && matchesStatus
      })
    : []

  return (
    <ApplicantLayout>
        <p className="applicant-page-label">TRACK APPLICATIONS</p>
        <h1 className="applicant-page-title">My Applications</h1>
        <p className="applicant-page-subtitle">
          Enter your Applicant ID to view linked land applications.
        </p>

        <section className="applicant-card applicant-search-card" style={{ marginBottom: '24px' }}>
          <div className="applicant-search-head" style={{ marginBottom: '16px' }}>
            <div>
              <p className="applicant-muted-label">Applicant lookup</p>
              <h2 style={{ fontSize: '15px', color: '#071b3a', margin: '4px 0 0' }}>Find linked applications</h2>
            </div>
            <span className="applicant-status">Uses Applicant ID</span>
          </div>
          <form onSubmit={fetchApplications} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', width: '100%', flexWrap: 'wrap' }}>
            <label className="applicant-field" style={{ flex: '1 1 300px', margin: 0 }}>
              <span>Applicant ID</span>
              <input
                required
                value={applicantId}
                onChange={e => {
                  setApplicantId(e.target.value)
                  if (fieldError) {
                    if (/^[a-fA-F0-9]{24}$/.test(e.target.value.trim())) setFieldError('')
                  }
                }}
                onBlur={() => {
                  const id = applicantId.trim()
                  if (!id) setFieldError('Applicant ID is required.')
                  else if (!/^[a-fA-F0-9]{24}$/.test(id)) setFieldError('Applicant ID must be a valid 24-character ID.')
                  else setFieldError('')
                }}
                placeholder="Paste copied applicant id"
                className={fieldError ? 'applicant-input-error' : ''}
              />
              {fieldError && <span className="applicant-field-error">{fieldError}</span>}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button disabled={loading} className="applicant-button">
                {loading ? 'Loading...' : 'Search'}
              </button>
              <button type="button" className="applicant-button-secondary" onClick={() => { setApplicantId(''); setApplications(null); setError(null); }}>
                Clear
              </button>
            </div>
          </form>
        </section>

        <section className="applicant-track-layout">
          <section className="applicant-card applicant-section" style={{ marginTop: 0 }}>
            <div className="applicant-table-toolbar">
              <h2 style={{ fontSize: '18px', color: '#071b3a', margin: 0 }}>My Applications</h2>
              <div className="applicant-table-filters">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by Application ID or Parcel Number..."
                />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <div className="applicant-error">{error}</div>}

            {applications && applications.length === 0 && (
              <div className="applicant-empty-rich" style={{ textAlign: 'center', padding: '40px 20px 60px' }}>
                <div className="applicant-empty-icon" style={{ background: '#f8fafc', color: '#64748b', margin: '0 auto 16px', border: '1px solid #e2e8f0', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '16px', fontWeight: 'bold' }}>TR</div>
                <h3 style={{ fontSize: '16px', color: '#071b3a', marginBottom: '8px' }}>No applications found yet</h3>
                <p style={{ color: '#475569', fontSize: '13px', maxWidth: '400px', margin: '0 auto' }}>This applicant currently has no linked land applications.</p>
                <small style={{ display: 'block', marginTop: '16px', color: '#64748b', fontSize: '12px' }}>Once Student 1 creates or links applications to this applicant, they will appear here.</small>
              </div>
            )}

            {applications && applications.length > 0 && filteredApplications.length === 0 && (
              <div className="applicant-empty-rich">
                <h3>No applications match the current filters</h3>
              </div>
            )}

            {filteredApplications.length > 0 && (
              <div className="applicant-table-wrap">
                <table className="applicant-table">
                  <thead>
                    <tr>
                      <th>Application ID</th>
                      <th>Application Type</th>
                      <th>Parcel Number</th>
                      <th>Status</th>
                      <th>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((app, index) => (
                      <tr key={app.id || app.application_id || index}>
                        <td className="applicant-mono">{displayValue(app.application_id)}</td>
                        <td>{displayValue(app.application_type)}</td>
                        <td>{displayValue(app.parcel_ref?.parcel_number)}</td>
                        <td><span className={statusClass(app.status)}>{displayValue(app.status)}</span></td>
                        <td>{displayValue(app.timestamps?.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <aside className="applicant-card" style={{ padding: '24px', background: '#ffffff', alignSelf: 'start' }}>
            <p className="applicant-muted-label">Quick Actions</p>
            <h2 style={{ fontSize: '14px', margin: '8px 0 16px', color: '#071b3a' }}>Ready to add more information?</h2>
            <div className="applicant-actions" style={{ flexDirection: 'column', marginTop: '16px', gap: '12px' }}>
              <Link to="/applicant/upload-document" className="applicant-button-secondary" style={{ width: '100%', textAlign: 'center' }}>Upload Document</Link>
              <Link to="/applicant/timeline" className="applicant-button-secondary" style={{ width: '100%', textAlign: 'center' }}>View Timeline</Link>
            </div>
            <p style={{ display: 'block', marginTop: '20px', color: '#64748b', fontSize: '12px', lineHeight: '1.5' }}>Use these actions after you know the application ID.</p>
          </aside>
        </section>
    </ApplicantLayout>
  )
}
