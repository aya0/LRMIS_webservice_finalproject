import { useState } from 'react'
import { Link } from 'react-router-dom'
import { submitObjection } from '../../services/applicantApi'
import {
  ApplicantApplicationSelect,
  useApplicantApplications,
} from './ApplicantApplicationSelect'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError } from './applicantUx'
import './applicantPortal.css'

function errorMessage(err) {
  return friendlyApplicantError(err, 'Unable to submit objection. Check the selected application and objection details.')
}

export default function SubmitObjection() {
  const { applicantId, applications, loading: loadingApplications, error: applicationsError } = useApplicantApplications()
  const [form, setForm] = useState({
    application_id: '',
    reason_category: '',
    reason: '',
    supporting_documents: '',
  })
  const [successRes, setSuccessRes] = useState(null)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function validateField(name, value) {
    value = typeof value === 'string' ? value.trim() : value
    switch(name) {
      case 'application_id':
        if (!value) return 'Choose one of your linked applications.'
        break
      case 'applicant':
        if (!applicantId) return 'No saved applicant profile was found. Create or log in to a profile first.'
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
    setForm(current => ({ ...current, [name]: value }))
    if (errors[name]) {
      const err = validateField(name, value)
      if (!err) setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  function validateForm() {
    const newErrors = {}
    ;['application_id', 'applicant', 'reason_category', 'reason', 'supporting_documents'].forEach(field => {
      const err = validateField(field, field === 'applicant' ? applicantId : form[field])
      if (err) newErrors[field] = err
    })
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true)
    setSuccessRes(null)
    setError(null)

    const supportingDocuments = form.supporting_documents
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)

    try {
      const res = await submitObjection(form.application_id, {
        applicant_id: applicantId,
        reason: `${form.reason_category}: ${form.reason.trim()}`,
        supporting_documents: supportingDocuments.length ? supportingDocuments : null,
        status: 'submitted',
      })
      setSuccessRes(res.data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = Boolean(
    applicantId &&
    form.application_id &&
    form.reason_category.trim() &&
    form.reason.trim().length >= 10 &&
    applications.length > 0
  )

  return (
    <ApplicantLayout>
      <p className="applicant-page-label">SUBMIT OBJECTION</p>
      <h1 className="applicant-page-title">Submit Objection</h1>
      <p className="applicant-page-subtitle">
        Select a linked application and submit an objection when parcel or ownership information is disputed.
      </p>

      <section className="applicant-card applicant-objection-warning" style={{ marginBottom: '24px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '12px 16px', borderRadius: '8px' }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>
          Submitting an objection will request review and may move the selected application to under_objection.
        </p>
      </section>

      <div className="applicant-track-layout">
        <form onSubmit={handleSubmit} className="applicant-card applicant-section applicant-form" style={{ marginTop: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {applicationsError && <div className="applicant-error">{applicationsError}</div>}
          {errors.applicant && <div className="applicant-error">{errors.applicant}</div>}
          {successRes && (
            <section className="applicant-success" style={{ padding: '20px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '20px' }}>✅</span>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Objection submitted successfully</p>
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.5' }}>
                Your objection has been received and sent for review.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #dcfce7', marginBottom: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#166534', textTransform: 'uppercase', fontWeight: 'bold' }}>Application</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{form.application_id}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#166534', textTransform: 'uppercase', fontWeight: 'bold' }}>Current Status</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>UNDER OBJECTION</p>
                </div>
                {(successRes.objection_reference_number || successRes.reference_number) && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#166534', textTransform: 'uppercase', fontWeight: 'bold' }}>Reference</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{successRes.objection_reference_number || successRes.reference_number}</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Link to="/applicant/timeline" className="applicant-button" style={{ background: '#16a34a', borderColor: '#15803d', color: '#fff', textDecoration: 'none' }}>View Timeline</Link>
              </div>
            </section>
          )}
          {error && <div className="applicant-error">{error}</div>}

          <ApplicantApplicationSelect
            applications={applications}
            value={form.application_id}
            onChange={value => updateField('application_id', value)}
            error={errors.application_id}
            loading={loadingApplications}
            label="Linked Application"
          />

          <label className="applicant-field applicant-field-full" style={{ marginBottom: 0 }}>
            <span>Objection Reason Category<span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span></span>
            <select
              required
              value={form.reason_category}
              onChange={e => updateField('reason_category', e.target.value)}
              className={errors.reason_category ? 'applicant-input-error' : ''}
            >
              <option value="" disabled>-- Select --</option>
              <option value="boundary_dispute">Boundary dispute</option>
              <option value="ownership_dispute">Ownership dispute</option>
              <option value="document_dispute">Document dispute</option>
              <option value="other">Other</option>
            </select>
            {errors.reason_category && <span className="applicant-field-error">{errors.reason_category}</span>}
          </label>

          <label className="applicant-field applicant-field-full" style={{ marginBottom: 0 }}>
            <span>Reason for Objection<span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span></span>
            <textarea
              required
              value={form.reason}
              onChange={e => updateField('reason', e.target.value)}
              placeholder="Describe the nature of your objection or dispute in detail..."
              style={{ minHeight: '140px' }}
              className={errors.reason ? 'applicant-input-error' : ''}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '4px' }}>
              <span style={{ color: form.reason.trim().length === 0 ? '#dc2626' : (form.reason.trim().length < 10 ? '#ea580c' : 'transparent') }}>
                {form.reason.trim().length === 0 ? "Reason for objection is required." : (form.reason.trim().length < 10 ? "Reason must be at least 10 characters." : "")}
              </span>
              <span style={{ color: form.reason.trim().length < 10 ? '#64748b' : '#16a34a' }}>
                {form.reason.trim().length} / 10 minimum
              </span>
            </div>
            {errors.reason && <span className="applicant-field-error">{errors.reason}</span>}
          </label>

          <Field
            label="Supporting Document Links (optional)"
            value={form.supporting_documents}
            error={errors.supporting_documents}
            onChange={v => updateField('supporting_documents', v)}
            placeholder="https://link1.com, https://link2.com"
            type="text"
            helper="Paste one or more document links, separated by commas."
          />

          <div className="applicant-actions" style={{ justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="button" className="applicant-button-secondary" onClick={() => setForm(current => ({ ...current, reason_category: '', reason: '', supporting_documents: '' }))}>Cancel</button>
            <button disabled={loading || loadingApplications || !canSubmit} className="applicant-button applicant-button-danger">
              {loading ? 'Submitting...' : 'Submit Objection'}
            </button>
          </div>
        </form>

        <aside className="applicant-card" style={{ padding: '24px', background: '#ffffff', alignSelf: 'start' }}>
          <p className="applicant-muted-label">Guidance</p>
          <h2 style={{ fontSize: '14px', margin: '8px 0 16px', color: '#071b3a' }}>Important</h2>
          <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6', margin: 0 }}>
            Application status is displayed from the database and is never typed manually by the applicant.
          </p>
        </aside>
      </div>
    </ApplicantLayout>
  )
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '', error = '', helper = '' }) {
  return (
    <label className="applicant-field applicant-field-full" style={{ marginBottom: '16px' }}>
      <span>{label}{required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}</span>
      <input
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={error ? 'applicant-input-error' : ''}
      />
      {helper && !error && <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>{helper}</span>}
      {error && <span className="applicant-field-error">{error}</span>}
    </label>
  )
}
