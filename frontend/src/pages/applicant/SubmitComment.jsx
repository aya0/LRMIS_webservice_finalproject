import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addComment } from '../../services/applicantApi'
import {
  ApplicantApplicationSelect,
  useApplicantApplications,
} from './ApplicantApplicationSelect'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError } from './applicantUx'
import './applicantPortal.css'

function errorMessage(err) {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  return friendlyApplicantError(err, 'Unable to submit comment. Check the selected application and comment text.')
}

export default function SubmitComment() {
  const { applicantId, applications = [], loading: loadingApplications, error: applicationsError } = useApplicantApplications()
  const [applicationId, setApplicationId] = useState('')
  const [comment, setComment] = useState('')
  const [successRes, setSuccessRes] = useState(null)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function validateForm() {
    const nextErrors = {}
    if (!applicantId) nextErrors.applicant = 'Please create your applicant profile first.'
    if (!applicationId) nextErrors.application_id = 'Choose one of your linked applications.'
    if (!comment.trim() || comment.trim().length < 5) nextErrors.comment = 'Comment must be at least 5 characters.'
    if (comment.length > 1000) nextErrors.comment = 'Comment cannot exceed 1000 characters.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setSuccessRes(null)
    setError(null)
    try {
      const res = await addComment(applicationId, {
        applicant_id: applicantId,
        comment: comment.trim(),
      })
      setSuccessRes(res.data)
      setComment('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const linkedApplications = Array.isArray(applications) ? applications : []
  const canSubmit = Boolean(applicantId && applicationId && comment.trim().length >= 5 && linkedApplications.length > 0)

  return (
    <ApplicantLayout>
      <p className="applicant-page-label">ADD COMMENT</p>
      <h1 className="applicant-page-title">Add Comment</h1>
      <p className="applicant-page-subtitle">
        Choose one of your linked applications and send additional information to staff.
      </p>

      <div className="applicant-track-layout">
        <form onSubmit={handleSubmit} className="applicant-card applicant-section applicant-form applicant-message-form" style={{ marginTop: 0 }}>
          <div className="applicant-message-info" style={{ marginTop: 0, marginBottom: '20px' }}>
            <div className="applicant-message-avatar">CM</div>
            <div>
              <p className="applicant-muted-label">Communication</p>
              <p>Application and applicant details are loaded from your saved applicant profile.</p>
            </div>
          </div>

          {!applicantId && <div className="applicant-error">Please create your applicant profile first.</div>}
          {applicantId && applicationsError && <div className="applicant-error">{applicationsError}</div>}
          {errors.applicant && <div className="applicant-error">{errors.applicant}</div>}
          {successRes && (
            <section className="applicant-success" style={{ padding: '20px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '20px' }}>✅</span>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Comment submitted successfully</p>
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.5' }}>
                Your comment has been received and added to the application history.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #dcfce7', marginBottom: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#166534', textTransform: 'uppercase', fontWeight: 'bold' }}>Application</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{applicationId}</p>
                </div>
                {(successRes.comment_reference_number || successRes.reference_number) && (
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#166534', textTransform: 'uppercase', fontWeight: 'bold' }}>Reference</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{successRes.comment_reference_number || successRes.reference_number}</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Link to="/applicant/timeline" className="applicant-button" style={{ background: '#16a34a', borderColor: '#15803d', color: '#fff', textDecoration: 'none' }}>View Timeline</Link>
              </div>
            </section>
          )}
          {error && <div className="applicant-error" style={{ marginBottom: '20px' }}>{error}</div>}

          <ApplicantApplicationSelect
            applications={linkedApplications}
            value={applicationId}
            onChange={value => {
              setApplicationId(value)
              setErrors(current => ({ ...current, application_id: '' }))
            }}
            error={errors.application_id}
            loading={loadingApplications}
            label="Linked Application"
          />

          {applicantId && !loadingApplications && linkedApplications.length === 0 && (
            <div className="applicant-empty-inline">No linked applications found. Submit an application first.</div>
          )}

          <label className="applicant-field applicant-field-full" style={{ marginTop: '16px', marginBottom: 0 }}>
            <span>Comment / Response<span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span></span>
            <textarea
              required
              value={comment}
              onChange={e => {
                setComment(e.target.value)
                if (errors.comment) setErrors(current => ({ ...current, comment: '' }))
              }}
              placeholder="Write your response here..."
              style={{ minHeight: '120px' }}
              className={errors.comment ? 'applicant-input-error' : ''}
            />
            <small className={`applicant-counter${comment.length > 1000 ? ' applicant-counter-error' : ''}`}>
              {comment.length} / 1000 characters
            </small>
            {errors.comment && <span className="applicant-field-error">{errors.comment}</span>}
          </label>

          <div className="applicant-actions" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="applicant-button-secondary" onClick={() => setComment('')}>Cancel</button>
            <button disabled={loading || loadingApplications || !canSubmit} className="applicant-button">
              {loading ? 'Saving...' : 'Submit Comment'}
            </button>
          </div>
        </form>

        <aside className="applicant-card applicant-section applicant-thread-panel" style={{ marginTop: 0 }}>
          <p className="applicant-muted-label">Applicant ID</p>
          <h2>Current Profile</h2>
          <div className="applicant-empty-panel">
            <p>{applicantId || 'No applicant saved'}</p>
            <small>This value comes from localStorage and is submitted automatically.</small>
          </div>
        </aside>
      </div>
    </ApplicantLayout>
  )
}
