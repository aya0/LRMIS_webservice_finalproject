import { Link } from 'react-router-dom'
import {
  getApplicationId,
  getParcelField,
  getParcelNumber,
  statusClass,
  useApplicantApplications,
} from './ApplicantApplicationSelect'
import ApplicantLayout from './ApplicantLayout'
import './applicantPortal.css'
import { useState } from 'react'

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

function displayValue(value) {
  if (value === null || value === undefined || value === '') return 'Not provided'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function ApplicantApplications() {
  const { applicantId, applications, loading, error } = useApplicantApplications()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filteredApplications = Array.isArray(applications)
    ? applications.filter(app => {
        const query = search.trim().toLowerCase()
        const applicationId = displayValue(getApplicationId(app)).toLowerCase()
        const parcelNumber = displayValue(getParcelNumber(app)).toLowerCase()
        const blockNumber = displayValue(getParcelField(app, 'block_number')).toLowerCase()
        const basinNumber = displayValue(getParcelField(app, 'basin_number')).toLowerCase()
        const zoneId = displayValue(getParcelField(app, 'zone_id')).toLowerCase()
        const type = displayValue(app.application_type).toLowerCase()
        const matchesSearch = !query
          || applicationId.includes(query)
          || parcelNumber.includes(query)
          || blockNumber.includes(query)
          || basinNumber.includes(query)
          || zoneId.includes(query)
          || type.includes(query)
        const matchesStatus = !statusFilter || app.status === statusFilter
        return matchesSearch && matchesStatus
      })
    : []

  return (
    <ApplicantLayout>
      <p className="applicant-page-label">TRACK APPLICATIONS</p>
      <h1 className="applicant-page-title">My Applications</h1>
      <p className="applicant-page-subtitle">
        Applications are loaded from your saved applicant profile and linked backend records.
      </p>

      <section className="applicant-card applicant-search-card" style={{ marginBottom: '24px' }}>
        <div className="applicant-search-head" style={{ marginBottom: '16px' }}>
          <div>
            <p className="applicant-muted-label">Applicant profile</p>
            <h2 style={{ fontSize: '15px', color: '#071b3a', margin: '4px 0 0' }}>
              {applicantId ? 'Saved applicant loaded' : 'No applicant profile saved'}
            </h2>
          </div>
          <span className="applicant-status">{applications.length} linked</span>
        </div>
        <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
          Applicant ID is read from localStorage and is not typed manually on this page.
        </p>
      </section>

      <section className="applicant-track-layout">
        <section className="applicant-card applicant-section" style={{ marginTop: 0 }}>
          <div className="applicant-table-toolbar">
            <h2 style={{ fontSize: '18px', color: '#071b3a', margin: 0 }}>My Applications</h2>
            <div className="applicant-table-filters">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by application, type, parcel, block, basin, or zone..."
              />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
          {loading && <div className="applicant-empty">Loading linked applications...</div>}
          {error && <div className="applicant-error">{error}</div>}

          {!loading && !error && applications.length === 0 && (
            <div className="applicant-empty-rich" style={{ textAlign: 'center', padding: '40px 20px 60px' }}>
              <div className="applicant-empty-icon" style={{ margin: '0 auto 16px' }}>TR</div>
              <h3 style={{ fontSize: '16px', color: '#071b3a', marginBottom: '8px' }}>No linked applications found</h3>
              <p style={{ color: '#475569', fontSize: '13px', maxWidth: '400px', margin: '0 auto' }}>This applicant currently has no linked land applications.</p>
              <small style={{ display: 'block', marginTop: '16px', color: '#64748b', fontSize: '12px' }}>Once staff create or link applications to this applicant, they will appear here.</small>
            </div>
          )}

          {applications.length > 0 && filteredApplications.length === 0 && (
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
                    <th>Block</th>
                    <th>Basin</th>
                    <th>Zone</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app, index) => (
                    <tr key={getApplicationId(app) || index}>
                      <td className="applicant-mono">{displayValue(getApplicationId(app))}</td>
                      <td>{displayValue(app.application_type)}</td>
                      <td>{displayValue(getParcelNumber(app))}</td>
                      <td>{displayValue(getParcelField(app, 'block_number'))}</td>
                      <td>{displayValue(getParcelField(app, 'basin_number'))}</td>
                      <td>{displayValue(getParcelField(app, 'zone_id'))}</td>
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
            <Link to="/applicant/comment" className="applicant-button-secondary" style={{ width: '100%', textAlign: 'center' }}>Add Comment</Link>
            <Link to="/applicant/timeline" className="applicant-button-secondary" style={{ width: '100%', textAlign: 'center' }}>View Timeline</Link>
          </div>
          <p style={{ display: 'block', marginTop: '20px', color: '#64748b', fontSize: '12px', lineHeight: '1.5' }}>
            Each action page will use a dropdown populated from these linked applications.
          </p>
        </aside>
      </section>
    </ApplicantLayout>
  )
}
