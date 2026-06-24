import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createApplicant, getApplicant, getZones, updateApplicant } from '../../services/applicantApi'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError, saveApplicantId, getSavedApplicantId } from './applicantUx'
import { useAuth } from '../../context/AuthContext'
import './applicantPortal.css'

const applicantTypes = [
  { value: 'citizen', label: 'Citizen' },
  { value: 'lawyer', label: 'Lawyer' },
  { value: 'company', label: 'Company' },
  { value: 'surveyor', label: 'Surveyor' },
  { value: 'authorized_representative', label: 'Authorized Representative' },
]

const languages = [
  { value: 'ar', label: 'Arabic' },
  { value: 'en', label: 'English' },
]

const steps = ['Identity', 'Contact', 'Address', 'Review']

const initialForm = {
  full_name: '',
  applicant_type: 'citizen',
  national_id: '',
  registration_number: '',
  license_number: '',
  email: '',
  phone: '',
  preferred_language: 'ar',
  city: '',
  neighborhood: '',
  zone_id: '',
}

function formatApplicantType(value) {
  return applicantTypes.find(type => type.value === value)?.label || value
}

function formatLanguage(value) {
  return languages.find(language => language.value === value)?.label || value
}

function identityFieldConfig(applicantType) {
  if (applicantType === 'citizen') {
    return {
      field: 'national_id',
      label: 'National ID',
      placeholder: 'Enter national ID',
      helper: '6 to 20 digits',
    }
  }

  if (applicantType === 'lawyer' || applicantType === 'surveyor') {
    return {
      field: 'license_number',
      label: 'License Number',
      placeholder: 'Enter professional license number',
      helper: 'Letters, numbers, hyphen, or slash',
    }
  }

  return {
    field: 'registration_number',
    label: 'Registration Number',
    placeholder: 'Enter registration number',
    helper: 'Letters, numbers, hyphen, or slash',
  }
}

function errorMessage(err) {
  if (err.response?.status === 409) {
    return 'An applicant with this identity already exists. Please check the information or log in to your existing profile.'
  }
  return friendlyApplicantError(err, 'We could not create your profile. Please review the highlighted fields and try again.')
}

export default function CreateApplicantProfile() {
  const [form, setForm] = useState(initialForm)
  const [activeStep, setActiveStep] = useState(0)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [zones, setZones] = useState([])
  const [zonesLoading, setZonesLoading] = useState(true)
  const [zonesError, setZonesError] = useState('')
  const navigate = useNavigate()
  const { auth, loginApplicant } = useAuth()

  useEffect(() => {
    let active = true

    async function loadZones() {
      setZonesLoading(true)
      setZonesError('')
      try {
        const res = await getZones()
        const items = Array.isArray(res.data) ? res.data : []
        if (active) setZones(items.filter(item => item?.zone_id))
      } catch {
        if (active) setZonesError('Unable to load zones. Please try again.')
      } finally {
        if (active) setZonesLoading(false)
      }
    }

    loadZones()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const savedId = getSavedApplicantId()
    if (savedId) {
      setEditMode(true)
      getApplicant(savedId)
        .then(res => {
          const data = res.data
          const isLawyerOrSurveyor = data.applicant_type === 'lawyer' || data.applicant_type === 'surveyor'
          setForm({
            full_name: data.full_name || '',
            applicant_type: data.applicant_type || 'citizen',
            national_id: data.national_id || '',
            registration_number: !isLawyerOrSurveyor ? (data.registration_number || '') : '',
            license_number: isLawyerOrSurveyor ? (data.registration_number || '') : '',
            email: data.contact?.email || '',
            phone: data.contact?.phone || '',
            preferred_language: data.preferred_language || 'ar',
            city: data.address?.city || '',
            neighborhood: data.address?.neighborhood || '',
            zone_id: data.address?.zone_id || '',
          })
        })
        .catch(() => {
          setEditMode(false)
        })
        .finally(() => {
          setPageLoading(false)
        })
    } else {
      setPageLoading(false)
    }
  }, [])

  const isCitizen = form.applicant_type === 'citizen'
  const isLawyerOrSurveyor = form.applicant_type === 'lawyer' || form.applicant_type === 'surveyor'
  const identityConfig = identityFieldConfig(form.applicant_type)

  const visibleFieldsByStep = useMemo(() => ({
    0: isCitizen
      ? ['full_name', 'applicant_type', 'national_id']
      : (isLawyerOrSurveyor
          ? ['full_name', 'applicant_type', 'license_number']
          : ['full_name', 'applicant_type', 'registration_number']),
    1: ['email', 'phone', 'preferred_language'],
    2: ['city', 'neighborhood', 'zone_id'],
    3: [],
  }), [isCitizen])

  function getFieldError(name, value = form[name], applicantType = form.applicant_type, log = false) {
    const normalized = typeof value === 'string' ? value.trim() : value

    const check = () => {
      switch (name) {
        case 'full_name':
          if (!normalized) return 'Full Name is required'
          if (!/^[A-Za-z\u0600-\u06FF\s\-']+$/.test(normalized)) return 'Full name should contain letters only.'
          return ''
        case 'national_id':
          if (applicantType === 'citizen' && !normalized) return 'National ID is required'
          if (normalized && !/^\d{6,20}$/.test(normalized)) return 'National ID should be 6 to 20 digits.'
          return ''
        case 'registration_number':
        case 'license_number':
          if (applicantType !== 'citizen' && !normalized) return `${identityFieldConfig(applicantType).label} is required`
          if (normalized && !/^[A-Za-z0-9\-/]+$/.test(normalized)) return `${identityFieldConfig(applicantType).label} can contain letters, numbers, hyphen, or slash only.`
          if (normalized && normalized.length > 30) return `${identityFieldConfig(applicantType).label} cannot exceed 30 characters.`
          return ''
        case 'email':
          if (!normalized) return 'Email is required'
          if (!/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(normalized)) return 'Please enter a valid email address.'
          return ''
        case 'phone':
          if (!normalized) return 'Phone Number is required'
          if (!/^\+?[0-9]{8,15}$/.test(normalized)) return 'Phone number format is incorrect. Example: +970599111111.'
          return ''
        case 'city':
          if (!normalized) return 'City is required'
          if (!/^[A-Za-z\u0600-\u06FF\s\-]+$/.test(normalized)) return 'City or town should contain letters only.'
          return ''
        case 'neighborhood':
          if (!normalized) return 'Neighborhood is required'
          if (!/^[A-Za-z0-9\u0600-\u06FF\s\-]+$/.test(normalized)) return 'Neighborhood contains unsupported characters.'
          return ''
        case 'zone_id':
          if (!normalized) return 'Please select a Zone / Area Code.'
          if (!/^[A-Za-z0-9\-_]+$/.test(normalized)) return 'Zone / Area Code can contain letters, numbers, hyphens, or underscores only.'
          return ''
        case 'preferred_language':
          if (!normalized) return 'Preferred Language is required'
          return ''
        default:
          return ''
      }
    }

    const err = check()
    if (log && err) {
      console.warn(`[Validation] Field failed: ${name}, Value: "${value}", Error: "${err}"`)
    }
    return err
  }

  function validateFields(fieldNames, log = false) {
    const nextErrors = {}
    fieldNames.forEach(field => {
      const err = getFieldError(field, undefined, undefined, log)
      if (err) nextErrors[field] = err
    })
    return nextErrors
  }

  function validateStep(stepIndex = activeStep) {
    const stepErrors = validateFields(visibleFieldsByStep[stepIndex] || [], true)
    setErrors(current => ({ ...current, ...stepErrors }))
    setTouched(current => ({
      ...current,
      ...Object.fromEntries((visibleFieldsByStep[stepIndex] || []).map(field => [field, true])),
    }))
    return Object.keys(stepErrors).length === 0
  }

  function allValidationErrors() {
    return validateFields([0, 1, 2].flatMap(step => visibleFieldsByStep[step]), true)
  }

  function isStepValid(stepIndex) {
    const fields = visibleFieldsByStep[stepIndex] || []
    return fields.every(field => !getFieldError(field))
  }

  function cleanInput(name, value) {
    if (name === 'full_name') return value.replace(/[^\p{L}\s\-']/gu, '')
    if (name === 'national_id') return value.replace(/[^0-9]/g, '').slice(0, 20)
    if (name === 'phone') {
      let next = value.replace(/[^\d+]/g, '')
      if (next.indexOf('+') > 0) next = next.replace(/\+/g, (match, offset) => offset === 0 ? '+' : '')
      return next.slice(0, 16)
    }
    if (name === 'city') return value.replace(/[^\p{L}\s\-]/gu, '')
    if (name === 'neighborhood') return value.replace(/[^\p{L}0-9\s\-]/gu, '')
    if (name === 'zone_id') return value.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 30)
    if (name === 'registration_number' || name === 'license_number') return value.replace(/[^a-zA-Z0-9\-\/]/g, '').slice(0, 30)
    return value
  }

  function updateField(name, value) {
    const nextValue = typeof value === 'string' ? cleanInput(name, value) : value
    setForm(current => {
      const next = { ...current, [name]: nextValue }
      if (name === 'applicant_type') {
        next.national_id = value === 'citizen' ? current.national_id : ''
        next.registration_number = (value === 'company' || value === 'authorized_representative') ? current.registration_number : ''
        next.license_number = (value === 'lawyer' || value === 'surveyor') ? current.license_number : ''
      }
      return next
    })

    if (touched[name]) {
      const err = getFieldError(name, nextValue, name === 'applicant_type' ? nextValue : form.applicant_type)
      setErrors(current => ({ ...current, [name]: err }))
    }

    if (name === 'applicant_type') {
      setErrors(current => ({ ...current, national_id: '', registration_number: '', license_number: '' }))
    }
  }

  function handleBlur(name) {
    setTouched(current => ({ ...current, [name]: true }))
    setErrors(current => ({ ...current, [name]: getFieldError(name) }))
  }

  function goNext() {
    if (!validateStep(activeStep)) return
    setError('')
    setActiveStep(step => Math.min(step + 1, steps.length - 1))
  }

  function goBack() {
    setError('')
    setActiveStep(step => Math.max(step - 1, 0))
  }

  function resetForm() {
    setForm(initialForm)
    setActiveStep(0)
    setErrors({})
    setTouched({})
    setError('')
    setResult(null)
    setCopied(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const nextErrors = allValidationErrors()
    setErrors(nextErrors)
    setTouched(Object.fromEntries(Object.keys(nextErrors).map(field => [field, true])))

    if (Object.keys(nextErrors).length > 0) {
      const missingField = Object.keys(nextErrors)[0]
      console.log("Submit validation failed:", missingField)
      const firstInvalidStep = [0, 1, 2].find(step =>
        visibleFieldsByStep[step].some(field => nextErrors[field])
      )
      setActiveStep(firstInvalidStep ?? 0)
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setCopied(false)

    const profilePayload = {
      full_name: form.full_name.trim(),
      national_id: isCitizen ? form.national_id.trim() : null,
      registration_number: isCitizen ? null : (isLawyerOrSurveyor ? form.license_number.trim() : form.registration_number.trim()),
      contact: {
        email: form.email.trim(),
        phone: form.phone.trim(),
      },
      address: {
        city: form.city.trim(),
        neighborhood: form.neighborhood.trim(),
        zone_id: form.zone_id.trim(),
      },
      applicant_type: form.applicant_type,
      preferred_language: form.preferred_language,
      notification_preferences: {
        email: true,
        sms: false,
      },
      linked_applications: [],
      privacy_settings: {
        share_contact_with_staff: false,
        allow_status_notifications: true,
      },
    }

    try {
      console.log("Applicant profile payload:", profilePayload)
      const savedId = getSavedApplicantId()
      const res = editMode && savedId
        ? await updateApplicant(savedId, profilePayload)
        : await createApplicant({
            ...profilePayload,
            verification_state: 'unverified',
            linked_applications: [],
          })
      const fresh = editMode && savedId ? await getApplicant(savedId) : res
      setResult(fresh.data)
      saveApplicantId(fresh.data.id)
      loginApplicant(fresh.data, auth?.token || null)
      setActiveStep(3)
      if (editMode) navigate('/applicant/profile')
    } catch (err) {
      console.log("Create profile backend error:", err.response?.data || err)
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function copyApplicantId() {
    if (!result?.id) return
    await navigator.clipboard.writeText(result.id)
    setCopied(true)
  }

  return (
    <ApplicantLayout>
      {pageLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      ) : (
      <form onSubmit={handleSubmit} noValidate className="applicant-create-shell">
        <h2 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>
          {editMode ? 'Edit Profile' : 'Create Profile'}
        </h2>
        <HorizontalStepper activeStep={activeStep} result={result} onStepClick={index => {
          if (index <= activeStep || validateStep(activeStep)) setActiveStep(index)
        }} isStepValid={isStepValid} />

        <section className="applicant-card applicant-wizard-card">
          {error && <div className="applicant-error applicant-soft-alert">{error}</div>}

          {activeStep === 0 && (
            <WizardStep title="Identity" description="Tell us who is creating this applicant profile.">
              <Select
                label="Applicant Type"
                value={form.applicant_type}
                onChange={value => updateField('applicant_type', value)}
                options={applicantTypes}
              />
              <Field
                label="Full Name (Legal)"
                required
                value={form.full_name}
                error={touched.full_name ? errors.full_name : ''}
                success={touched.full_name && !errors.full_name && form.full_name}
                onChange={value => updateField('full_name', value)}
                onBlur={() => handleBlur('full_name')}
                placeholder="Full legal name"
              />
              <Field
                label={identityConfig.label}
                required
                value={form[identityConfig.field]}
                error={touched[identityConfig.field] ? errors[identityConfig.field] : ''}
                success={touched[identityConfig.field] && !errors[identityConfig.field] && form[identityConfig.field]}
                onChange={value => updateField(identityConfig.field, value)}
                onBlur={() => handleBlur(identityConfig.field)}
                placeholder={identityConfig.placeholder}
                helper={identityConfig.helper}
                inputMode={identityConfig.field === 'national_id' ? 'numeric' : undefined}
              />
            </WizardStep>
          )}

          {activeStep === 1 && (
            <WizardStep title="Contact" description="Use contact details that staff can use for application updates.">
              <Field
                label="Email"
                required
                type="email"
                value={form.email}
                error={touched.email ? errors.email : ''}
                success={touched.email && !errors.email && form.email}
                onChange={value => updateField('email', value)}
                onBlur={() => handleBlur('email')}
                placeholder="name@example.com"
              />
              <Field
                label="Phone Number"
                required
                type="tel"
                value={form.phone}
                error={touched.phone ? errors.phone : ''}
                success={touched.phone && !errors.phone && form.phone}
                onChange={value => updateField('phone', value)}
                onBlur={() => handleBlur('phone')}
                placeholder="+970599111111"
              />
              <Select
                label="Preferred Language"
                value={form.preferred_language}
                onChange={value => updateField('preferred_language', value)}
                options={languages}
                helper="Used for applicant-facing messages where supported."
              />
            </WizardStep>
          )}

          {activeStep === 2 && (
            <WizardStep title="Address" description="Enter the location details for your applicant profile.">
              <Field
                label="City"
                required
                value={form.city}
                error={touched.city ? errors.city : ''}
                success={touched.city && !errors.city && form.city}
                onChange={value => updateField('city', value)}
                onBlur={() => handleBlur('city')}
                placeholder="e.g. Ramallah"
              />
              <Field
                label="Neighborhood"
                required
                value={form.neighborhood}
                error={touched.neighborhood ? errors.neighborhood : ''}
                success={touched.neighborhood && !errors.neighborhood && form.neighborhood}
                onChange={value => updateField('neighborhood', value)}
                onBlur={() => handleBlur('neighborhood')}
                placeholder="e.g. Al-Masyoun"
              />
              <Select
                label="Zone / Area Code"
                required
                value={form.zone_id}
                options={[
                  { value: '', label: zonesLoading ? 'Loading zones...' : 'Select Zone / Area Code', disabled: true },
                  ...zones.map(zone => ({ value: zone.zone_id, label: zone.label || zone.zone_id })),
                ]}
                disabled={zonesLoading || Boolean(zonesError) || zones.length === 0}
                error={touched.zone_id ? errors.zone_id : ''}
                success={touched.zone_id && !errors.zone_id && form.zone_id}
                onChange={value => updateField('zone_id', value)}
                onBlur={() => handleBlur('zone_id')}
                helper={zonesError || (!zonesLoading && zones.length === 0 ? 'No zones found in database.' : 'Select the area code from the shared database.')}
              />
            </WizardStep>
          )}

          {activeStep === 3 && (
            <WizardStep title="Review" description="Check your profile details before submitting.">
              {result ? (
                <section className="applicant-success applicant-created-panel">
                  <div>
                    <h2>Profile created successfully</h2>
                    <p>Your Applicant ID has been saved in this browser.</p>
                  </div>
                  <div className="applicant-id-row">
                    <span className="applicant-badge">{result.id}</span>
                    <button type="button" onClick={copyApplicantId} className="applicant-button-copy">
                      {copied ? 'Copied' : 'Copy ID'}
                    </button>
                  </div>
                  <div className="applicant-created-actions">
                    <Link to="/applicant/applications" className="applicant-button">My Applications</Link>
                    <Link to="/applicant/settings" className="applicant-button-secondary">Settings</Link>
                  </div>
                </section>
              ) : (
                <ReviewSummary form={form} />
              )}
            </WizardStep>
          )}

          <div className="applicant-wizard-actions">
            <button type="button" className="applicant-button-secondary" onClick={activeStep === 0 ? resetForm : goBack}>
              {activeStep === 0 ? 'Cancel' : 'Back'}
            </button>
            {activeStep < 3 ? (
              <button type="button" className="applicant-button" onClick={goNext}>
                Next
              </button>
            ) : (
              <button type="submit" disabled={loading || Boolean(result)} className="applicant-button">
                {loading ? 'Saving...' : result ? 'Saved Successfully' : editMode ? 'Save Changes' : 'Create Profile'}
              </button>
            )}
          </div>
        </section>

      </form>
      )}
    </ApplicantLayout>
  )
}

function HorizontalStepper({ activeStep, result, onStepClick, isStepValid }) {
  return (
    <nav className="applicant-horizontal-stepper" aria-label="Profile creation progress">
      {steps.map((step, index) => {
        const done = index === 3 ? Boolean(result) : (isStepValid ? isStepValid(index) : index < activeStep)
        const active = index === activeStep
        return (
          <button
            key={step}
            type="button"
            className={`${active ? 'active' : ''}${done ? ' done' : ''}`}
            onClick={() => onStepClick(index)}
          >
            <span>{done ? '✓' : index + 1}</span>
            <strong>{step}</strong>
          </button>
        )
      })}
    </nav>
  )
}

function WizardStep({ title, description, children }) {
  return (
    <div className="applicant-wizard-step-panel">
      <div className="applicant-wizard-head">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="applicant-wizard-fields">
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  required = false,
  placeholder = '',
  helper = '',
  error = '',
  success = false,
  inputMode,
}) {
  return (
    <label className="applicant-field applicant-clean-field">
      <span>{label}{required && <b>*</b>}</span>
      <input
        type={type}
        aria-required={required}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        className={error ? 'applicant-input-error' : success ? 'applicant-input-valid' : ''}
      />
      <div className="applicant-field-msg-wrap">
        {error && <small className="applicant-field-error">{error}</small>}
        {success && <small className="applicant-field-success">Looks good</small>}
        {helper && !error && !success && <small className="applicant-field-helper">{helper}</small>}
      </div>
    </label>
  )
}

function Select({
  label,
  value,
  onChange,
  onBlur,
  options,
  required = false,
  helper = '',
  error = '',
  success = false,
  disabled = false,
}) {
  return (
    <label className="applicant-field applicant-clean-field">
      <span>{label}{required && <b>*</b>}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        aria-required={required}
        disabled={disabled}
        className={error ? 'applicant-input-error' : success ? 'applicant-input-valid' : ''}
      >
        {options.map(option => (
          <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>
        ))}
      </select>
      <div className="applicant-field-msg-wrap">
        {error && <small className="applicant-field-error">{error}</small>}
        {success && <small className="applicant-field-success">Looks good</small>}
        {helper && !error && !success && <small className="applicant-field-helper">{helper}</small>}
      </div>
    </label>
  )
}

function ReviewSummary({ form }) {
  const identityConfig = identityFieldConfig(form.applicant_type)
  const identityValue = form[identityConfig.field]

  return (
    <div className="applicant-review-sections">
      <ReviewSection title="Identity Information" rows={[
        ['Full Name', form.full_name],
        ['Applicant Type', formatApplicantType(form.applicant_type)],
        [identityConfig.label, identityValue],
      ]} />
      <ReviewSection title="Contact Information" rows={[
        ['Email', form.email],
        ['Phone', form.phone],
        ['Preferred Language', formatLanguage(form.preferred_language)],
      ]} />
      <ReviewSection title="Address Information" rows={[
        ['City', form.city],
        ['Neighborhood', form.neighborhood],
        ['Zone / Area Code', form.zone_id],
      ]} />
    </div>
  )
}


function ReviewSection({ title, rows }) {
  return (
    <article className="applicant-review-section">
      <h3>{title}</h3>
      <dl className="applicant-review-dl">
        {rows.map(([label, value]) => (
          <div key={label} className="applicant-review-row">
            <dt>{label}</dt>
            <dd>{value || 'Not provided'}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}
