import { useState } from 'react'
import { Link } from 'react-router-dom'
import { submitObjection } from '../../services/applicantApi'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError, getSavedApplicantId } from './applicantUx'
import './applicantPortal.css'

function errorMessage(err) {
  return friendlyApplicantError(err, 'Unable to submit objection. Check the IDs and objection details.')
}

export default function SubmitObjection() {
  const [form, setForm] = useState({
    application_id: '',
    applicant_id: getSavedApplicantId(),
    reason_category: '',
    reason: '',
    supporting_documents: '',
    status: 'submitted',
  })
  const [objectionId, setObjectionId] = useState(null)
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
      case 'reason':
        if (!value || value.length < 10) return 'Reason must be at least 10 characters.'
        if (value.length > 1500) return 'Reason cannot exceed 1500 characters.'
        break
      case 'reason_category':
        if (!value) return 'Reason category is required.'
        break
      case 'supporting_documents':
        if (value) {
          const urls = value.split(',').map(u => u.trim()).filter(Boolean)
          const invalidUrl = urls.find(u => !/^https?:\/\/.+/.test(u))
          if (invalidUrl) return 'Supporting documents must be valid URLs separated by commas.'
        }
        break
    }
    return ''
  }

  function updateField(name, value) {
    setForm(current => {
      const newForm = { ...current, [name]: value }
      if (errors[name]) {
        const err = validateField(name, value)
        if (!err) setErrors(prev => ({ ...prev, [name]: '' }))
      }
      return newForm
    })
  }

  function handleBlur(name, value) {
    const err = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: err || '' }))
  }

  function validateForm() {
    const newErrors = {}
    const fieldsToValidate = ['application_id', 'applicant_id', 'reason_category', 'reason', 'supporting_documents']
    fieldsToValidate.forEach(field => {
      const err = validateField(field, form[field])
      if (err) newErrors[field] = err
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setObjectionId(null)
    setError(null)
    setCopied(false)

    const supportingDocuments = form.supporting_documents
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)

    try {
      const res = await submitObjection(form.application_id.trim(), {
        applicant_id: form.applicant_id.trim(),
        reason: `${form.reason_category}: ${form.reason.trim()}`,
        supporting_documents: supportingDocuments.length ? supportingDocuments : null,
        status: form.status,
      })
      setObjectionId(res.data.id)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function copyObjectionId() {
    if (!objectionId) return
    await navigator.clipboard.writeText(objectionId)
    setCopied(true)
  }

  const canSubmit = form.application_id.trim()
    && form.applicant_id.trim()
    && form.reason_category.trim()
    && form.reason.trim().length >= 10

  return (
    <ApplicantLayout>
        <p className="applicant-page-label">SUBMIT OBJECTION</p>
        <h1 className="applicant-page-title">Submit Objection</h1>
        <p className="applicant-page-subtitle">
          Submit an objection when there is a dispute or incorrect parcel information.
        </p>

        <section className="applicant-card applicant-objection-warning" style={{ marginBottom: '24px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '12px 16px', borderRadius: '8px' }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>
            Submit an objection only when there is a dispute or incorrect parcel information. The linked application will move to under_objection.
          </p>
        </section>

        <div className="applicant-track-layout">
          <form onSubmit={handleSubmit} className="applicant-card applicant-section applicant-form" style={{ marginTop: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {objectionId && (
              <section className="applicant-success" style={{ padding: '12px 16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <p className="applicant-success-title" style={{ margin: 0, fontSize: '13px' }}>Objection submitted successfully</p>
                  <div className="applicant-id-row" style={{ marginTop: 0 }}>
                    <span className="applicant-badge">{objectionId}</span>
                    <button type="button" onClick={copyObjectionId} className="applicant-button-copy" style={{ padding: '4px 8px', minHeight: 'auto', fontSize: '11px' }}>
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <Link to="/applicant/timeline" className="applicant-button-secondary" style={{ padding: '4px 8px', minHeight: 'auto', fontSize: '11px' }}>View Timeline</Link>
                  </div>
                </div>
              </section>
            )}
            {error && <div className="applicant-error">{error}</div>}

            <div>
              <div className="applicant-form-grid" style={{ gap: '16px' }}>
                <Field
                  label="Application ID"
                  required
                  value={form.application_id}
                  error={errors.application_id}
                  onChange={v => updateField('application_id', v)}
                  onBlur={v => handleBlur('application_id', v)}
                  placeholder="e.g. LRMIS-2026-0001"
                />
                <Field
                  label="Applicant ID"
                  required
                  value={form.applicant_id}
                  error={errors.applicant_id}
                  onChange={v => updateField('applicant_id', v)}
                  onBlur={v => handleBlur('applicant_id', v)}
                  placeholder="Paste copied applicant id"
                />
              </div>

              <label className="applicant-field applicant-field-full" style={{ marginTop: '16px', marginBottom: 0 }}>
                <span>Objection Reason Category<span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span></span>
                <select
                  required
                  value={form.reason_category}
                  onChange={e => updateField('reason_category', e.target.value)}
                  onBlur={e => handleBlur('reason_category', e.target.value)}
                  className={errors.reason_category ? 'applicant-input-error' : ''}
                >
                  <option value="" disabled>-- Select --</option>
                  <option value="boundary_dispute">boundary_dispute</option>
                  <option value="ownership_dispute">ownership_dispute</option>
                  <option value="document_dispute">document_dispute</option>
                  <option value="other">other</option>
                </select>
                {errors.reason_category && <span className="applicant-field-error">{errors.reason_category}</span>}
              </label>

              <label className="applicant-field applicant-field-full" style={{ marginTop: '16px', marginBottom: 0 }}>
                <span>Reason for Objection<span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span></span>
                <textarea
                  required
                  value={form.reason}
                  onChange={e => updateField('reason', e.target.value)}
                  onBlur={e => handleBlur('reason', e.target.value)}
                  placeholder="Describe the nature of your objection or dispute in detail..."
                  style={{ minHeight: '140px' }}
                  className={errors.reason ? 'applicant-input-error' : ''}
                />
                {errors.reason && <span className="applicant-field-error">{errors.reason}</span>}
              </label>

              <Field
                label="Supporting Documents (URLs)"
                value={form.supporting_documents}
                error={errors.supporting_documents}
                onChange={v => updateField('supporting_documents', v)}
                onBlur={v => handleBlur('supporting_documents', v)}
                placeholder="https://link1.com, https://link2.com"
                type="text"
              />
            </div>

            <div className="applicant-actions" style={{ justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="applicant-button-secondary" onClick={() => setForm(current => ({ ...current, reason_category: '', reason: '', supporting_documents: '' }))}>Cancel</button>
              <button disabled={loading || !canSubmit} className="applicant-button applicant-button-danger">
                {loading ? 'Submitting...' : 'Submit Objection'}
              </button>
            </div>
          </form>

          <aside className="applicant-card" style={{ padding: '24px', background: '#ffffff', alignSelf: 'start' }}>
            <p className="applicant-muted-label">Guidance</p>
            <h2 style={{ fontSize: '14px', margin: '8px 0 16px', color: '#071b3a' }}>Important</h2>
            <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
              Submitting an objection will change the application status to <span className="applicant-status applicant-status-red">under_objection</span>.
            </p>
          </aside>
        </div>
    </ApplicantLayout>
  )
}

function Field({ label, value, onChange, onBlur, type = 'text', required = false, placeholder = '', error = '' }) {
  return (
    <label className="applicant-field applicant-field-full" style={{ marginBottom: '16px' }}>
      <span>{label}{required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}</span>
      <input
        type={type}
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
