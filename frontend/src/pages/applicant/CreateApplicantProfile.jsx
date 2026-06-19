import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { createApplicant } from '../../services/applicantApi'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError, saveApplicantId } from './applicantUx'
import './applicantPortal.css'

const applicantTypes = ['citizen', 'lawyer', 'company', 'surveyor', 'authorized_representative']

function errorMessage(err) {
  return friendlyApplicantError(err, 'Request failed. Please check the highlighted information and try again.')
}

export default function CreateApplicantProfile() {
  const [form, setForm] = useState({
    full_name: '',
    national_id: '',
    registration_number: '',
    email: '',
    phone: '',
    city: '',
    neighborhood: '',
    zone_id: '',
    applicant_type: 'citizen',
    verification_state: 'unverified',
    preferred_language: 'ar',
    notify_email: true,
    notify_sms: false,
    share_contact_with_staff: false,
    allow_status_notifications: true,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})
  const [copied, setCopied] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [preferencesInteracted, setPreferencesInteracted] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [warningStep, setWarningStep] = useState(null)

  function getFieldError(name, value, applicantType) {
    value = typeof value === 'string' ? value.trim() : value
    switch (name) {
      case 'full_name':
        if (!value) return 'Full name is required.'
        if (!/^[A-Za-z\u0600-\u06FF\s\-']+$/.test(value)) return 'Full name should contain letters only.'
        break
      case 'national_id':
        if (applicantType === 'citizen' && !value) return 'National ID is required for citizens.'
        if (value && !/^\d{6,20}$/.test(value)) return 'National ID should be 6 to 20 digits.'
        break
      case 'registration_number':
        if (applicantType !== 'citizen' && !value) return 'Registration number is required for this applicant type.'
        if (value && !/^[A-Za-z0-9\-/]+$/.test(value)) return 'Registration number can contain letters, numbers, hyphen, or slash only.'
        if (value && value.length > 30) return 'Registration number cannot exceed 30 characters.'
        break
      case 'email':
        if (!value) return 'Email is required.'
        if (!/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(value)) return 'Please enter a valid email address.'
        break
      case 'phone':
        if (!value) return 'Phone is required.'
        if (!/^\+?[0-9]{8,15}$/.test(value)) return 'Phone number should be valid, for example +970599111111.'
        break
      case 'city':
        if (!value) return 'City is required.'
        if (!/^[A-Za-z\u0600-\u06FF\s]+$/.test(value)) return 'City should contain letters only.'
        break
      case 'neighborhood':
        if (!value) return 'Neighborhood is required.'
        if (!/^[A-Za-z0-9\u0600-\u06FF\s\-]+$/.test(value)) return 'Neighborhood contains invalid characters.'
        break
      case 'zone_id':
        if (!value) return 'Zone ID is required.'
        if (!/^[A-Za-z0-9\-]+$/.test(value)) return 'Zone ID can contain letters, numbers, and hyphens only.'
        break
    }
    return ''
  }

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target.id === 'personal-section') setActiveStep(0)
          else if (entry.target.id === 'contact-section') setActiveStep(1)
          else if (entry.target.id === 'address-section') setActiveStep(2)
          else if (entry.target.id === 'preferences-section') setActiveStep(3)
        }
      })
    }, { rootMargin: '-20% 0px -60% 0px' })

    const sections = ['personal-section', 'contact-section', 'address-section', 'preferences-section']
    sections.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  function updateField(name, value) {
    if (typeof value === 'string') {
      if (name === 'full_name') value = value.replace(/[^\p{L}\s\-']/gu, '')
      else if (name === 'national_id') value = value.replace(/[^0-9]/g, '').slice(0, 20)
      else if (name === 'phone') {
        value = value.replace(/[^\d+]/g, '')
        if (value.indexOf('+') > 0) value = value.replace(/\+/g, (match, offset) => offset === 0 ? '+' : '')
      }
      else if (name === 'city') value = value.replace(/[^\p{L}\s\-]/gu, '')
      else if (name === 'neighborhood') value = value.replace(/[^\p{L}0-9\s\-]/gu, '')
      else if (name === 'zone_id') value = value.replace(/[^a-zA-Z0-9\-]/g, '')
      else if (name === 'registration_number') value = value.replace(/[^a-zA-Z0-9\-\/]/g, '')
    }

    setForm(current => {
      const newForm = { ...current, [name]: value }
      
      // Clear error immediately if valid, but do NOT show error immediately on typing
      if (errors[name]) {
        const err = getFieldError(name, value, newForm.applicant_type)
        if (!err) setErrors(prev => ({ ...prev, [name]: '' }))
      }

      if (name === 'applicant_type') {
        if (value !== 'citizen') setErrors(prev => ({ ...prev, national_id: '' }))
        if (value === 'citizen') setErrors(prev => ({ ...prev, registration_number: '' }))
      }

      return newForm
    })
  }

  function handleBlur(name, value) {
    const err = getFieldError(name, value, form.applicant_type)
    setErrors(prev => ({ ...prev, [name]: err || '' }))
  }

  function buildValidationErrors() {
    const newErrors = {}
    const fieldsToValidate = ['full_name', 'national_id', 'registration_number', 'email', 'phone', 'city', 'neighborhood', 'zone_id']
    fieldsToValidate.forEach(field => {
      const err = getFieldError(field, form[field], form.applicant_type)
      if (err) newErrors[field] = err
    })
    return newErrors
  }

  function validateForm() {
    const newErrors = buildValidationErrors()
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function sectionForField(field) {
    const fieldToSection = {
      full_name: { id: 'personal-section', index: 0 },
      national_id: { id: 'personal-section', index: 0 },
      registration_number: { id: 'personal-section', index: 0 },
      email: { id: 'contact-section', index: 1 },
      phone: { id: 'contact-section', index: 1 },
      city: { id: 'address-section', index: 2 },
      neighborhood: { id: 'address-section', index: 2 },
      zone_id: { id: 'address-section', index: 2 },
    }
    return fieldToSection[field] || null
  }

  function scrollToStep(sectionId, stepIndex) {
    setActiveStep(stepIndex)
    setWarningStep(stepIndex)
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function firstIncompleteStep() {
    const currentSteps = [
      { id: 'personal-section', index: 0, isCompleted: isIdentityComplete() },
      { id: 'contact-section', index: 1, isCompleted: isContactComplete() },
      { id: 'address-section', index: 2, isCompleted: isAddressComplete() },
      { id: 'preferences-section', index: 3, isCompleted: isPreferencesComplete() },
    ]
    return currentSteps.find(step => !step.isCompleted) || null
  }

  function handleStepClick(item, index) {
    if (index === 4) {
      const incomplete = firstIncompleteStep()
      if (incomplete) {
        const newErrors = buildValidationErrors()
        setSubmitAttempted(true)
        setErrors(newErrors)
        scrollToStep(incomplete.id, incomplete.index)
        return
      }
    }
    setActiveStep(index)
    setWarningStep(null)
    document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitAttempted(true)
    
    // First run the full validation logic to get fresh errors
    const newErrors = buildValidationErrors()

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      const firstField = Object.keys(newErrors)[0]
      const section = sectionForField(firstField)
      if (section) {
        scrollToStep(section.id, section.index)
      }
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setCopied(false)

    const payload = {
      full_name: form.full_name.trim(),
      national_id: form.national_id.trim() || null,
      registration_number: form.registration_number.trim() || null,
      contact: {
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      },
      address: {
        city: form.city.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        zone_id: form.zone_id.trim() || null,
      },
      applicant_type: form.applicant_type,
      verification_state: form.verification_state,
      preferred_language: form.preferred_language,
      notification_preferences: {
        email: form.notify_email,
        sms: form.notify_sms,
      },
      linked_applications: [],
      privacy_settings: {
        share_contact_with_staff: form.share_contact_with_staff,
        allow_status_notifications: form.allow_status_notifications,
      },
    }

    try {
      const res = await createApplicant(payload)
      setResult(res.data)
      saveApplicantId(res.data.id)
    } catch (err) {
      if (err.response?.status === 409) {
        setError('This National ID or Registration Number already exists. Please use a unique value.')
      } else {
        setError(errorMessage(err))
      }
    } finally {
      setLoading(false)
    }
  }

  async function copyApplicantId() {
    if (!result?.id) return
    await navigator.clipboard.writeText(result.id)
    setCopied(true)
  }

  const isCitizen = form.applicant_type === 'citizen'

  let nationalIdHelper = 'Optional.'
  if (form.applicant_type === 'lawyer') nationalIdHelper = 'Optional for lawyers.'
  else if (form.applicant_type === 'company') nationalIdHelper = 'Optional for companies.'
  else if (form.applicant_type === 'authorized_representative') nationalIdHelper = 'Optional for representatives.'
  else if (form.applicant_type === 'surveyor') nationalIdHelper = 'Optional for surveyors.'

  let regNumHelper = ''
  if (form.applicant_type === 'lawyer') regNumHelper = 'Required for lawyers.'
  else if (form.applicant_type === 'company') regNumHelper = 'Required for companies.'
  else if (form.applicant_type === 'authorized_representative') regNumHelper = 'Required for representatives.'
  else if (form.applicant_type === 'surveyor') regNumHelper = 'Required for surveyors.'
  else if (form.applicant_type === 'citizen') regNumHelper = 'Optional for citizens.'

  function isIdentityComplete() {
    return !!(form.full_name
      && !getFieldError('full_name', form.full_name, form.applicant_type)
      && form.applicant_type
      && (form.applicant_type === 'citizen'
        ? (form.national_id && !getFieldError('national_id', form.national_id, form.applicant_type))
        : (form.registration_number && !getFieldError('registration_number', form.registration_number, form.applicant_type))))
  }

  function isContactComplete() {
    return !!(form.email
      && !getFieldError('email', form.email, form.applicant_type)
      && form.phone
      && !getFieldError('phone', form.phone, form.applicant_type))
  }

  function isAddressComplete() {
    return !!(form.city
      && !getFieldError('city', form.city, form.applicant_type)
      && form.neighborhood
      && !getFieldError('neighborhood', form.neighborhood, form.applicant_type)
      && form.zone_id
      && !getFieldError('zone_id', form.zone_id, form.applicant_type))
  }

  function isPreferencesComplete() {
    return Boolean(form.verification_state && form.preferred_language)
  }

  const steps = [
    { id: 'personal-section', label: 'Identity', isCompleted: isIdentityComplete() },
    { id: 'contact-section', label: 'Contact', isCompleted: isContactComplete() },
    { id: 'address-section', label: 'Address', isCompleted: isAddressComplete() },
    { id: 'preferences-section', label: 'Preferences', isCompleted: isPreferencesComplete() },
    { id: 'review-section', label: 'Review', isCompleted: !!result },
  ]

  return (
    <ApplicantLayout>
        <p className="applicant-page-label">CREATE PROFILE</p>
        <h1 className="applicant-page-title" style={{ fontSize: '28px', color: '#071b3a', marginTop: '4px' }}>Create Your Profile</h1>
        <p className="applicant-page-subtitle" style={{ fontSize: '14px', color: '#405875', marginTop: '8px', marginBottom: '12px' }}>
          Fill in your details to create your applicant profile.
        </p>

        <div className="applicant-profile-layout" style={{ marginTop: '20px' }}>
          <aside className="applicant-profile-rail" style={{ gridColumn: 1, padding: '12px' }}>
            {steps.map((item, index) => {
              const isActive = activeStep === index
              const isCompleted = item.isCompleted
              const needsAttention = submitAttempted && index < 4 && !isCompleted

              let stepClass = 'applicant-rail-step'
              if (isActive) stepClass += ' applicant-rail-step-active'
              if (isCompleted) stepClass += ' applicant-rail-step-completed'
              if (needsAttention) stepClass += ' applicant-rail-step-warning'
              if (warningStep === index && needsAttention) stepClass += ' applicant-rail-step-pulse'

              return (
                <button
                  key={`${item.id}-${index}`}
                  type="button"
                  onClick={() => handleStepClick(item, index)}
                  className={stepClass}
                >
                  <span className="applicant-rail-circle">
                    {isCompleted ? (
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="applicant-rail-label">{item.label}</span>
                  {needsAttention && <small>Needs attention</small>}
                </button>
              )
            })}
          </aside>

          <form onSubmit={handleSubmit} noValidate className="applicant-profile-form">
            <section className="applicant-card" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {submitAttempted && Object.keys(errors).length > 0 && (
                <div className="applicant-step-warning-banner">
                  Please complete the highlighted sections before creating your profile.
                </div>
              )}
              {error && <div className="applicant-error" style={{ margin: 0 }}>{error}</div>}

              {result && (
                <div className="applicant-success" style={{ padding: '12px 16px', margin: '0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <p className="applicant-success-title" style={{ margin: 0, fontSize: '14px' }}>Profile created successfully</p>
                    <div className="applicant-id-row" style={{ marginTop: 0 }}>
                      <span className="applicant-badge">{result.id}</span>
                      <button type="button" onClick={copyApplicantId} className="applicant-button-copy" style={{ padding: '4px 8px', minHeight: 'auto', fontSize: '11px' }}>
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <Link to="/applicant/applications" className="applicant-button" style={{ padding: '6px 12px', fontSize: '12px', minHeight: 'auto' }}>Track Applications</Link>
                    <Link to="/applicant/upload-document" className="applicant-button-secondary" style={{ padding: '6px 12px', fontSize: '12px', minHeight: 'auto' }}>Upload Document</Link>
                  </div>
                </div>
              )}

              <div id="personal-section" style={{ scrollMarginTop: '24px' }} onFocus={() => setActiveStep(0)}>
                <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 900, color: '#071b3a' }}>Personal Information</h2>
                {warningStep === 0 && submitAttempted && !isIdentityComplete() && (
                  <p className="applicant-section-warning">Complete this section before review.</p>
                )}
                <div className="applicant-form-grid">
                <Field
                  label="Full Name"
                  required
                  value={form.full_name}
                  error={errors.full_name}
                  onChange={v => updateField('full_name', v)}
                  onBlur={v => handleBlur('full_name', v)}
                  placeholder="Arabic or English name"
                />
                <Field
                  label="National ID"
                  required={isCitizen}
                  value={form.national_id}
                  error={errors.national_id}
                  onChange={v => updateField('national_id', v)}
                  onBlur={v => handleBlur('national_id', v)}
                  placeholder="9-digit ID number"
                  inputMode="numeric"
                  maxLength={20}
                  helper={!isCitizen ? nationalIdHelper : ''}
                />
                <Field
                  label="Registration Number"
                  required={!isCitizen}
                  value={form.registration_number}
                  error={errors.registration_number}
                  onChange={v => updateField('registration_number', v)}
                  onBlur={v => handleBlur('registration_number', v)}
                  placeholder="For companies or lawyers"
                  helper={regNumHelper}
                />
                <Select
                  label="Applicant Type"
                  value={form.applicant_type}
                  onChange={v => updateField('applicant_type', v)}
                  options={applicantTypes}
                />
              </div>
              </div>

              <div style={{ height: '1px', background: '#e2e8f0' }} />

              <div id="contact-section" style={{ scrollMarginTop: '24px' }} onFocus={() => setActiveStep(1)}>
                <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 900, color: '#071b3a' }}>Contact Details</h2>
                {warningStep === 1 && submitAttempted && !isContactComplete() && (
                  <p className="applicant-section-warning">Complete this section before review.</p>
                )}
                <div className="applicant-form-grid">
                <Field
                  label="Email Address"
                  required
                  type="email"
                  value={form.email}
                  error={errors.email}
                  onChange={v => updateField('email', v)}
                  onBlur={v => handleBlur('email', v)}
                  placeholder="name@example.com"
                />
                <Field
                  label="Phone Number"
                  required
                  type="tel"
                  value={form.phone}
                  error={errors.phone}
                  onChange={v => updateField('phone', v)}
                  onBlur={v => handleBlur('phone', v)}
                  placeholder="+970599111111"
                />
              </div>
              </div>

              <div style={{ height: '1px', background: '#e2e8f0' }} />

              <div id="address-section" style={{ scrollMarginTop: '24px' }} onFocus={() => setActiveStep(2)}>
                <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 900, color: '#071b3a' }}>Address</h2>
                {warningStep === 2 && submitAttempted && !isAddressComplete() && (
                  <p className="applicant-section-warning">Complete this section before review.</p>
                )}
                <div className="applicant-form-grid">
                <Field
                  label="City / Town"
                  required
                  value={form.city}
                  error={errors.city}
                  onChange={v => updateField('city', v)}
                  onBlur={v => handleBlur('city', v)}
                  placeholder="e.g. Ramallah"
                />
                <Field
                  label="Neighborhood"
                  required
                  value={form.neighborhood}
                  error={errors.neighborhood}
                  onChange={v => updateField('neighborhood', v)}
                  onBlur={v => handleBlur('neighborhood', v)}
                  placeholder="e.g. Al-Masyoun"
                />
                <Field
                  label="Zone ID"
                  required
                  value={form.zone_id}
                  error={errors.zone_id}
                  onChange={v => updateField('zone_id', v)}
                  onBlur={v => handleBlur('zone_id', v)}
                  placeholder="e.g. ZONE-RM-01"
                />
              </div>
              </div>

              <div style={{ height: '1px', background: '#e2e8f0' }} />

              <div id="preferences-section" style={{ scrollMarginTop: '24px' }} onFocus={() => setActiveStep(3)}>
                <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 900, color: '#071b3a' }}>Preferences</h2>
                {warningStep === 3 && submitAttempted && !isPreferencesComplete() && (
                  <p className="applicant-section-warning">Complete this section before review.</p>
                )}
                <div className="applicant-form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
                  <Select label="Verification State" required value={form.verification_state} onChange={v => { updateField('verification_state', v); setPreferencesInteracted(true); }} options={['unverified', 'verified', 'suspended']} />
                  <Select label="Preferred Language" required value={form.preferred_language} onChange={v => { updateField('preferred_language', v); setPreferencesInteracted(true); }} options={['ar', 'en']} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px', marginTop: '20px' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#475569', margin: '0 0 14px', textTransform: 'uppercase' }}>Notification Preferences</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <Checkbox label="Email notifications" checked={form.notify_email} onChange={v => { updateField('notify_email', v); setPreferencesInteracted(true); }} />
                      <Checkbox label="SMS notifications" checked={form.notify_sms} onChange={v => { updateField('notify_sms', v); setPreferencesInteracted(true); }} />
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#475569', margin: '0 0 14px', textTransform: 'uppercase' }}>Privacy Settings</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <Checkbox label="Share contact with staff" checked={form.share_contact_with_staff} onChange={v => { updateField('share_contact_with_staff', v); setPreferencesInteracted(true); }} />
                      <Checkbox label="Allow status notifications" checked={form.allow_status_notifications} onChange={v => { updateField('allow_status_notifications', v); setPreferencesInteracted(true); }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="applicant-actions" style={{ justifyContent: 'flex-end', marginTop: '8px' }}>
                <div id="review-section" style={{ scrollMarginTop: '24px' }} />
                <button type="button" className="applicant-button-secondary" onClick={() => setForm({
                  full_name: '', national_id: '', registration_number: '', email: '', phone: '', city: '', neighborhood: '', zone_id: '',
                  applicant_type: 'citizen', verification_state: 'unverified', preferred_language: 'ar', notify_email: true, notify_sms: false, share_contact_with_staff: false, allow_status_notifications: true
                })}>Cancel</button>
                <button type="submit" disabled={loading} className="applicant-button">
                  {loading ? 'Creating...' : 'Create Profile'}
                </button>
              </div>
            </section>
          </form>

          <aside className="applicant-card" style={{ padding: '24px', background: '#ffffff', alignSelf: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              <p className="applicant-card-title" style={{ fontSize: '14px', color: '#071b3a', margin: 0 }}>What happens next?</p>
            </div>
            <ol style={{ paddingLeft: '0', margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <li style={{ fontSize: '13px', color: '#475569' }}>1. Save your Applicant ID</li>
              <li style={{ fontSize: '13px', color: '#475569' }}>2. Track applications</li>
              <li style={{ fontSize: '13px', color: '#475569' }}>3. Upload required documents</li>
              <li style={{ fontSize: '13px', color: '#475569' }}>4. Respond to staff</li>
              <li style={{ fontSize: '13px', color: '#475569' }}>5. Submit objection if needed</li>
              <li style={{ fontSize: '13px', color: '#475569' }}>6. Follow timeline</li>
            </ol>
          </aside>
        </div>
    </ApplicantLayout>
  )
}

function Field({ label, value, onChange, onBlur, type = 'text', required = false, placeholder = '', helper = '', error = '', inputMode, maxLength }) {
  return (
    <label className="applicant-field">
      <span>{label}{required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}</span>
      <input
        type={type}
        aria-required={required}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
        onBlur={e => onBlur && onBlur(e.target.value)}
        className={error ? 'applicant-input-error' : ''}
      />
      {error && <span className="applicant-field-error">{error}</span>}
      {helper && !error && <small>{helper}</small>}
    </label>
  )
}

function Select({ label, value, onChange, onBlur, options, required = false, error = '' }) {
  return (
    <label className="applicant-field">
      <span>{label}{required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}</span>
      <select aria-required={required} value={value} onChange={e => onChange(e.target.value)} onBlur={e => onBlur && onBlur(e.target.value)} className={error ? 'applicant-input-error' : ''}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      {error && <span className="applicant-field-error">{error}</span>}
    </label>
  )
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="applicant-checkbox">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
