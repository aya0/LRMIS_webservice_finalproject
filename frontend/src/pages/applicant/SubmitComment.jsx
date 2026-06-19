import { useState } from 'react'
import { addComment } from '../../services/applicantApi'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError, getSavedApplicantId } from './applicantUx'
import './applicantPortal.css'

function errorMessage(err) {
  return friendlyApplicantError(err, 'Unable to submit comment. Check the application and applicant IDs.')
}

export default function SubmitComment() {
  const [applicationId, setApplicationId] = useState('')
  const [applicantId, setApplicantId] = useState(() => getSavedApplicantId())
  const [comment, setComment] = useState('')
  const [commentId, setCommentId] = useState(null)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  function validateField(name, value) {
    value = typeof value === 'string' ? value.trim() : value
    switch(name) {
      case 'application_id':
        if (!value) return 'Application ID is required.'
        if (!/^[A-Za-z0-9\-]+$/.test(value)) return 'Application ID can contain letters, numbers, and hyphens only.'
        break
      case 'applicant_id':
        if (!value) return 'Applicant ID is required.'
        if (!/^[a-fA-F0-9]{24}$/.test(value)) return 'Applicant ID must be a valid 24-character ID.'
        break
      case 'comment':
        if (!value || value.length < 5) return 'Comment must be at least 5 characters.'
        if (value.length > 1000) return 'Comment cannot exceed 1000 characters.'
        break
    }
    return ''
  }

  function updateField(name, value) {
    if (name === 'application_id') setApplicationId(value)
    else if (name === 'applicant_id') setApplicantId(value)
    else if (name === 'comment') setComment(value)

    if (errors[name]) {
      const err = validateField(name, value)
      if (!err) setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  function handleBlur(name, value) {
    const err = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: err || '' }))
  }

  function validateForm() {
    const newErrors = {}
    const fields = { application_id: applicationId, applicant_id: applicantId, comment }
    Object.keys(fields).forEach(field => {
      const err = validateField(field, fields[field])
      if (err) newErrors[field] = err
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setCommentId(null)
    setError(null)
    setCopied(false)
    try {
      const res = await addComment(applicationId.trim(), {
        applicant_id: applicantId.trim(),
        comment: comment.trim(),
      })
      setCommentId(res.data.id)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function copyCommentId() {
    if (!commentId) return
    await navigator.clipboard.writeText(commentId)
    setCopied(true)
  }

  const canSubmit = applicationId.trim() && applicantId.trim() && comment.trim().length >= 5

  return (
    <ApplicantLayout>
        <p className="applicant-page-label">ADD COMMENT</p>
        <h1 className="applicant-page-title">Add Comment</h1>
        <p className="applicant-page-subtitle">
          Respond to staff notes or provide additional information.
        </p>

        <div className="applicant-track-layout">
          <form onSubmit={handleSubmit} className="applicant-card applicant-section applicant-form applicant-message-form" style={{ marginTop: 0 }}>
            <div className="applicant-message-info" style={{ marginTop: 0, marginBottom: '20px' }}>
              <div className="applicant-message-avatar">CM</div>
              <div>
                <p className="applicant-muted-label">Communication</p>
                <p>Send a direct message to the assigned staff.</p>
              </div>
            </div>

            {commentId && (
              <section className="applicant-success" style={{ padding: '12px 16px', margin: '0 0 20px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <p className="applicant-success-title" style={{ margin: 0, fontSize: '13px' }}>Comment submitted successfully</p>
                  <div className="applicant-id-row" style={{ marginTop: 0 }}>
                    <span className="applicant-badge">{commentId}</span>
                    <button type="button" onClick={copyCommentId} className="applicant-button-copy" style={{ padding: '4px 8px', minHeight: 'auto', fontSize: '11px' }}>
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </section>
            )}
            {error && <div className="applicant-error" style={{ marginBottom: '20px' }}>{error}</div>}

            <div className="applicant-form-grid" style={{ gap: '16px' }}>
              <Field
                label="Application ID"
                required
                value={applicationId}
                error={errors.application_id}
                onChange={v => updateField('application_id', v)}
                onBlur={v => handleBlur('application_id', v)}
                placeholder="e.g. LRMIS-2026-0001"
              />
              <Field
                label="Applicant ID"
                required
                value={applicantId}
                error={errors.applicant_id}
                onChange={v => updateField('applicant_id', v)}
                onBlur={v => handleBlur('applicant_id', v)}
                placeholder="Paste copied applicant id"
              />
            </div>

            <label className="applicant-field applicant-field-full" style={{ marginTop: '16px', marginBottom: 0 }}>
              <span>Comment / Response<span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span></span>
              <textarea
                required
                value={comment}
                onChange={e => updateField('comment', e.target.value)}
                onBlur={e => handleBlur('comment', e.target.value)}
                placeholder="Write your response here..."
                style={{ minHeight: '120px' }}
                className={errors.comment ? 'applicant-input-error' : ''}
              />
              {errors.comment && <span className="applicant-field-error">{errors.comment}</span>}
            </label>

            <div className="applicant-actions" style={{ justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="applicant-button-secondary" onClick={() => { setComment(''); }}>Cancel</button>
              <button disabled={loading || !canSubmit} className="applicant-button">
                {loading ? 'Saving...' : 'Submit Comment'}
              </button>
            </div>
          </form>

          <aside className="applicant-card applicant-section applicant-thread-panel" style={{ marginTop: 0 }}>
            <p className="applicant-muted-label">Previous Comments</p>
            <h2>Backend conversation</h2>
            <div className="applicant-comment-thread">
              <div className="applicant-empty-panel">
                <div className="applicant-empty-icon">CM</div>
                <p>No previous comments returned by the backend.</p>
                <small>Submitted comment IDs appear in the success confirmation.</small>
              </div>
            </div>
          </aside>
        </div>
    </ApplicantLayout>
  )
}

function Field({ label, value, onChange, onBlur, required = false, placeholder = '', error = '' }) {
  return (
    <label className="applicant-field">
      <span>{label}{required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}</span>
      <input
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onBlur={e => onBlur && onBlur(e.target.value)}
        className={error ? 'applicant-input-error' : ''}
      />
      {error && <span className="applicant-field-error">{error}</span>}
    </label>
  )
}
