import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Polygon, useMapEvents } from 'react-leaflet'
import * as areaModule from '@turf/area'
import { createApplication, getZones } from '../api/client'
import { getApplicant } from '../services/applicantApi'
import { getSavedApplicantId } from './applicant/applicantUx'
import 'leaflet/dist/leaflet.css'
import './applicant/applicantPortal.css'

const STEPS = [
  'Application Information',
  'Applicant Information',
  'Parcel Details',
  'Documents',
  'Review & Submit',
]

const APP_TYPES = [
  'first_registration',
  'ownership_transfer',
  'parcel_subdivision',
  'parcel_merge',
  'boundary_correction',
  'certificate_request',
]

const PRIORITIES = ['normal', 'high', 'urgent', 'low']

const DOC_TYPES = [
  'ownership_deed',
  'id_copy',
  'sale_contract',
  'title_deed',
  'other_documents',
]

const MAP_CENTER = [31.905, 35.206]

function label(value) {
  return String(value || '').replaceAll('_', ' ')
}

function normalizeApplicationId(data) {
  const app = data?.application || data || {}
  const raw = app.application_id || ''
  if (raw) return raw
  const id = app.id || app._id || ''
  if (/^[a-f\d]{24}$/i.test(id)) {
    return `LRMIS-${new Date().getFullYear()}-${id.slice(-4).toUpperCase()}`
  }
  return id || 'LRMIS-PENDING'
}

function friendlyError(err) {
  const detail = err.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map(item => item.msg || item.message).filter(Boolean).join(' ')
  return 'We could not submit your application. Please review the highlighted information and try again.'
}

export default function SubmitApplication() {
  const navigate = useNavigate()
  const applicantId = getSavedApplicantId()

  const [currentStep, setCurrentStep] = useState(1)
  const [form, setForm] = useState({
    application_type: 'first_registration',
    priority: 'normal',
    parcel_number: '',
    block_number: '',
    basin_number: '',
    zone_id: '',
    description: '',
    documents: [],
  })
  const [applicant, setApplicant] = useState(null)
  const [profileLoading, setProfileLoading] = useState(Boolean(applicantId))
  const [profileError, setProfileError] = useState('')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [drawnArea, setDrawnArea] = useState(0)
  const [mapGeoJSON, setMapGeoJSON] = useState(null)
  const [drawPoints, setDrawPoints] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [zones, setZones] = useState([])
  const [zonesLoading, setZonesLoading] = useState(true)
  const [zonesError, setZonesError] = useState('')

  useEffect(() => {
    let active = true

    async function loadApplicant() {
      if (!applicantId) {
        setProfileLoading(false)
        return
      }
      setProfileLoading(true)
      setProfileError('')
      try {
        const res = await getApplicant(applicantId)
        if (active) setApplicant(res.data)
      } catch {
        if (active) setProfileError('Please create your applicant profile first.')
      } finally {
        if (active) setProfileLoading(false)
      }
    }

    loadApplicant()
    return () => {
      active = false
    }
  }, [applicantId])

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

  function updateField(name, value) {
    setForm(current => ({ ...current, [name]: value }))
    if (errors[name]) setErrors(current => ({ ...current, [name]: '' }))
  }

  function toggleDoc(type) {
    setForm(current => {
      const exists = current.documents.some(doc => doc.document_type === type)
      return {
        ...current,
        documents: exists
          ? current.documents.filter(doc => doc.document_type !== type)
          : [...current.documents, { document_type: type, required: true, status: 'pending_review' }],
      }
    })
  }

  function calculateArea(geojson) {
    try {
      const turfArea = areaModule.default || areaModule.area || areaModule
      const value = typeof turfArea === 'function' ? turfArea(geojson) : 0
      setDrawnArea(value)
    } catch {
      setDrawnArea(0)
    }
  }

  function buildPolygonFeature(points) {
    const coordinates = points.map(([lat, lng]) => [lng, lat])
    coordinates.push(coordinates[0])
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [coordinates],
      },
    }
  }

  function isNearFirstPoint(point, points) {
    const [firstLat, firstLng] = points[0]
    const [lat, lng] = point
    return Math.abs(firstLat - lat) < 0.00025 && Math.abs(firstLng - lng) < 0.00025
  }

  function finishDrawing(points) {
    if (points.length < 3) return
    const geojson = buildPolygonFeature(points)
    setMapGeoJSON(geojson)
    setDrawPoints(points)
    calculateArea(geojson)
    setIsDrawing(false)
  }

  function handleMapPoint(point, finishRequested = false) {
    if (!isDrawing) return
    if (drawPoints.length >= 3 && isNearFirstPoint(point, drawPoints)) {
      finishDrawing(drawPoints)
      return
    }

    const nextPoints = [...drawPoints, point]
    if (finishRequested && nextPoints.length >= 3) {
      finishDrawing(nextPoints)
      return
    }
    setDrawPoints(nextPoints)
  }

  function handleStartDrawing() {
    setMapGeoJSON(null)
    setDrawnArea(0)
    setDrawPoints([])
    setIsDrawing(true)
  }

  function handleEditBoundary() {
    const points = polygonPositions(mapGeoJSON)
    setMapGeoJSON(null)
    setDrawnArea(0)
    setDrawPoints(points)
    setIsDrawing(true)
  }

  function handleClearBoundary() {
    setMapGeoJSON(null)
    setDrawnArea(0)
    setDrawPoints([])
    setIsDrawing(false)
  }

  function handleCancelDrawing() {
    setDrawPoints([])
    setIsDrawing(false)
  }

  function validateStep(step = currentStep) {
    const nextErrors = {}
    if (step === 1) {
      if (!form.application_type) nextErrors.application_type = 'Please select an application type.'
    }
    if (step === 2) {
      if (!applicantId || !applicant) nextErrors.applicant = 'Please create your applicant profile first.'
    }
    if (step === 3) {
      if (!form.parcel_number.trim()) nextErrors.parcel_number = 'Please enter the parcel number.'
      if (!form.block_number.trim()) nextErrors.block_number = 'Please enter the block number.'
      if (!form.basin_number.trim()) nextErrors.basin_number = 'Please enter the basin number.'
      if (!form.zone_id.trim()) nextErrors.zone_id = 'Please select a Zone / Area Code.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleNext() {
    setError('')
    if (!validateStep()) return
    setCurrentStep(step => Math.min(step + 1, STEPS.length))
  }

  function handleBack() {
    setError('')
    setErrors({})
    setCurrentStep(step => Math.max(step - 1, 1))
  }

  async function handleSubmit() {
    setError('')
    if (![1, 2, 3].every(step => validateStep(step))) {
      setError('Please complete the highlighted information before submitting.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        application_type: form.application_type,
        priority: form.priority,
        applicant_ref: {
          applicant_id: applicantId,
          applicant_type: applicant?.applicant_type || 'citizen',
          submitted_by_representative: false,
        },
        parcel_ref: {
          parcel_number: form.parcel_number.trim(),
          block_number: form.block_number.trim(),
          basin_number: form.basin_number.trim(),
          zone_id: form.zone_id.trim(),
        },
        description: form.description.trim() || null,
        required_documents: form.documents,
        tags: [form.application_type],
      }
      const res = await createApplication(payload)
      setSuccess(res.data.application || res.data)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    const applicationId = normalizeApplicationId(success)
    return (
      <section className="submit-application-page">
        <div className="submit-success-card">
          <div className="submit-success-icon">OK</div>
          <h1>Application submitted successfully.</h1>
          <p>Your land registration application has been received and is ready for staff review.</p>
          <div className="submit-success-grid">
            <SummaryItem label="Application ID" value={applicationId} />
            <SummaryItem label="Status" value="SUBMITTED" />
          </div>
          <button type="button" className="submit-primary-button" onClick={() => navigate('/applicant/applications')}>
            Go to My Applications
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="submit-application-page">
      <header className="submit-page-head">
        <div>
          <p>Applicant Portal</p>
          <h1>Submit Application</h1>
        </div>
        <span>5 step application wizard</span>
      </header>

      <WizardStepper currentStep={currentStep} />

      {error && <div className="submit-alert">{error}</div>}

      <div className="submit-card">
        {currentStep === 1 && (
          <StepSection title="Application Information" description="Select the service type and priority for this land registration request.">
            <Field label="Application Type" error={errors.application_type} required>
              <select value={form.application_type} onChange={e => updateField('application_type', e.target.value)}>
                {APP_TYPES.map(type => <option key={type} value={type}>{label(type)}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={e => updateField('priority', e.target.value)}>
                {PRIORITIES.map(priority => <option key={priority} value={priority}>{label(priority)}</option>)}
              </select>
            </Field>
            <Field label="Description" full>
              <textarea value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Briefly describe the request or any context staff should know." />
            </Field>
          </StepSection>
        )}

        {currentStep === 2 && (
          <StepSection title="Applicant Information" description="Applicant information is loaded from your saved applicant profile.">
            {!applicantId || profileError ? (
              <div className="submit-profile-missing">
                <h2>Please create your applicant profile first.</h2>
                <p>A saved applicant profile is required before this application can be submitted.</p>
                <Link to="/applicant/create-profile" className="submit-primary-link">Create Profile</Link>
                {errors.applicant && <small>{errors.applicant}</small>}
              </div>
            ) : profileLoading ? (
              <div className="submit-empty-state">Loading applicant profile...</div>
            ) : (
              <div className="submit-readonly-grid">
                <ReadonlyField label="Applicant Reference" value="Saved applicant profile" />
                <ReadonlyField label="Full Name" value={applicant?.full_name} />
                <ReadonlyField label="Email" value={applicant?.contact?.email} />
                <ReadonlyField label="Phone" value={applicant?.contact?.phone} />
                <ReadonlyField label="Applicant Type" value={label(applicant?.applicant_type)} />
              </div>
            )}
          </StepSection>
        )}

        {currentStep === 3 && (
          <div className="submit-parcel-layout">
            <StepSection title="Parcel Details" description="Enter the parcel reference details. Drawing a map boundary is optional.">
              <Field label="Parcel Number" error={errors.parcel_number} required>
                <input value={form.parcel_number} onChange={e => updateField('parcel_number', e.target.value)} placeholder="e.g. 145" />
              </Field>
              <Field label="Block Number" error={errors.block_number} required>
                <input value={form.block_number} onChange={e => updateField('block_number', e.target.value)} placeholder="e.g. 12" />
              </Field>
              <Field label="Basin Number" error={errors.basin_number} required>
                <input value={form.basin_number} onChange={e => updateField('basin_number', e.target.value)} placeholder="e.g. 5" />
              </Field>
              <Field label="Zone / Area Code" error={errors.zone_id} required>
                <select
                  value={form.zone_id}
                  onChange={e => updateField('zone_id', e.target.value)}
                  disabled={zonesLoading || Boolean(zonesError) || zones.length === 0}
                >
                  <option value="" disabled>{zonesLoading ? 'Loading zones...' : 'Select Zone / Area Code'}</option>
                  {zones.map(zone => (
                    <option key={zone.zone_id} value={zone.zone_id}>{zone.label || zone.zone_id}</option>
                  ))}
                </select>
                {zonesError && <small>{zonesError}</small>}
                {!zonesLoading && !zonesError && zones.length === 0 && <small>No zones found in database.</small>}
              </Field>
            </StepSection>

            <MapPanel
              drawnArea={drawnArea}
              drawPoints={drawPoints}
              handleCancelDrawing={handleCancelDrawing}
              handleClearBoundary={handleClearBoundary}
              handleEditBoundary={handleEditBoundary}
              handleMapPoint={handleMapPoint}
              handleStartDrawing={handleStartDrawing}
              isDrawing={isDrawing}
              mapGeoJSON={mapGeoJSON}
            />
          </div>
        )}

        {currentStep === 4 && (
          <StepSection title="Documents" description="Select the supporting documents you intend to provide. This records metadata only.">
            <div className="submit-doc-grid">
              {DOC_TYPES.map(type => {
                const checked = form.documents.some(doc => doc.document_type === type)
                return (
                  <button key={type} type="button" className={`submit-doc-card${checked ? ' selected' : ''}`} onClick={() => toggleDoc(type)}>
                    <span>{checked ? 'OK' : ''}</span>
                    <strong>{label(type)}</strong>
                    <small>{checked ? 'Selected' : 'Click to select'}</small>
                  </button>
                )
              })}
            </div>
          </StepSection>
        )}

        {currentStep === 5 && (
          <StepSection title="Review & Submit" description="Review the application information before submitting.">
            <div className="submit-review-grid">
              <ReviewCard title="Application Summary" rows={[
                ['Type', label(form.application_type)],
                ['Priority', label(form.priority)],
                ['Description', form.description || 'Not provided'],
              ]} />
              <ReviewCard title="Applicant Summary" rows={[
                ['Applicant Reference', 'Saved applicant profile'],
                ['Full Name', applicant?.full_name || 'Not loaded'],
                ['Email', applicant?.contact?.email || 'Not loaded'],
                ['Phone', applicant?.contact?.phone || 'Not loaded'],
                ['Applicant Type', label(applicant?.applicant_type || 'citizen')],
              ]} />
              <ReviewCard title="Parcel Summary" rows={[
                ['Parcel Number', form.parcel_number],
                ['Block Number', form.block_number],
                ['Basin Number', form.basin_number],
                ['Zone / Area Code', form.zone_id],
              ]} />
              <ReviewCard title="Documents Summary" rows={[
                ['Selected Documents', form.documents.length ? form.documents.map(doc => label(doc.document_type)).join(', ') : 'No documents selected'],
              ]} />
              <div className="submit-map-summary">
                <h3>Map Preview / Boundary Summary</h3>
                {mapGeoJSON ? (
                  <>
                    <p>Boundary drawn successfully. Calculated Area: {drawnArea.toLocaleString(undefined, { maximumFractionDigits: 2 })} m2</p>
                    <div className="submit-map-preview">
                      <MapContainer center={MAP_CENTER} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                        <Polygon positions={mapGeoJSON.geometry.coordinates[0].map(coord => [coord[1], coord[0]])} pathOptions={{ color: '#16A34A', fillColor: '#16A34A', fillOpacity: 0.35, weight: 2 }} />
                      </MapContainer>
                    </div>
                  </>
                ) : (
                  <p>No boundary drawn. This optional visual aid will not block submission.</p>
                )}
                <small>Map geometry is visual-only and is not submitted to the backend.</small>
              </div>
            </div>
          </StepSection>
        )}
      </div>

      <div className="submit-actions">
        <button type="button" className="submit-secondary-button" onClick={handleBack} disabled={currentStep === 1 || loading}>
          Back
        </button>
        {currentStep < STEPS.length ? (
          <button type="button" className="submit-primary-button" onClick={handleNext}>
            Next
          </button>
        ) : (
          <button type="button" className="submit-primary-button" onClick={handleSubmit} disabled={loading || !applicant}>
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        )}
      </div>
    </section>
  )
}

function WizardStepper({ currentStep }) {
  return (
    <nav className="submit-stepper" aria-label="Submit application steps">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1
        const completed = stepNumber < currentStep
        const active = stepNumber === currentStep
        return (
          <div key={step} className={`submit-step${active ? ' active' : ''}${completed ? ' completed' : ''}`}>
            <span>{completed ? 'OK' : stepNumber}</span>
            <strong>{step}</strong>
          </div>
        )
      })}
    </nav>
  )
}

function StepSection({ title, description, children }) {
  return (
    <section className="submit-step-section">
      <header>
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="submit-field-grid">{children}</div>
    </section>
  )
}

function Field({ label: fieldLabel, required = false, error = '', full = false, children }) {
  return (
    <label className={`submit-field${full ? ' full' : ''}`}>
      <span>{fieldLabel}{required && <b>*</b>}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  )
}

function ReadonlyField({ label: fieldLabel, value }) {
  return (
    <div className="submit-readonly-field">
      <span>{fieldLabel}</span>
      <strong>{value || 'Not available'}</strong>
    </div>
  )
}

function ReviewCard({ title, rows }) {
  return (
    <article className="submit-review-card">
      <h3>{title}</h3>
      <dl>
        {rows.map(([key, value]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd>{value || 'Not provided'}</dd>
          </div>
        ))}
      </dl>
    </article>
  )
}

function SummaryItem({ label: itemLabel, value }) {
  return (
    <div>
      <span>{itemLabel}</span>
      <strong>{value}</strong>
    </div>
  )
}

function polygonPositions(geojson) {
  return geojson?.geometry?.coordinates?.[0]?.slice(0, -1).map(coord => [coord[1], coord[0]]) || []
}

function DrawingEvents({ active, onPoint }) {
  useMapEvents({
    click(event) {
      if (!active) return
      onPoint([event.latlng.lat, event.latlng.lng])
    },
    dblclick(event) {
      if (!active) return
      onPoint([event.latlng.lat, event.latlng.lng], true)
    },
  })

  return null
}

function MapPanel({
  drawnArea,
  drawPoints,
  handleCancelDrawing,
  handleClearBoundary,
  handleEditBoundary,
  handleMapPoint,
  handleStartDrawing,
  isDrawing,
  mapGeoJSON,
}) {
  const finalPositions = polygonPositions(mapGeoJSON)

  return (
    <section className="submit-map-card">
      <header>
        <h2>Interactive Map</h2>
        <p>Draw the approximate parcel boundary on the map. This is optional and helps staff locate the parcel.</p>
        <small className="submit-map-toolbar-hint">Use the button below, then click points around the parcel. Click near the first point or double-click to close the shape.</small>
      </header>
      <div className="submit-map-box">
        <MapContainer center={MAP_CENTER} zoom={16} scrollWheelZoom doubleClickZoom={!isDrawing} style={{ height: '100%', width: '100%', zIndex: 0 }}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          <DrawingEvents active={isDrawing} onPoint={handleMapPoint} />
          {isDrawing && drawPoints.length > 0 && (
            <Polygon
              positions={drawPoints}
              pathOptions={{ color: '#16A34A', dashArray: '6 6', fillColor: '#16A34A', fillOpacity: 0.18, weight: 3 }}
            />
          )}
          {mapGeoJSON && finalPositions.length > 0 && (
            <Polygon
              positions={finalPositions}
              pathOptions={{ color: '#16A34A', fillColor: '#16A34A', fillOpacity: 0.35, weight: 3 }}
            />
          )}
        </MapContainer>
      </div>
      <div className="submit-map-controls">
        {!mapGeoJSON && !isDrawing && (
          <>
            <p>Boundary drawing is optional. Start drawing only if you want to help staff locate the parcel faster.</p>
            <small>Click points around the parcel, then click the first point to close the shape.</small>
            <button type="button" className="submit-primary-button" onClick={handleStartDrawing}>Start Drawing Boundary</button>
          </>
        )}
        {isDrawing && (
          <>
            <p>Click points around the parcel, then click the first point to close the shape.</p>
            <small>{drawPoints.length} point{drawPoints.length === 1 ? '' : 's'} selected. A boundary needs at least 3 points.</small>
            <button type="button" className="submit-secondary-button" onClick={handleCancelDrawing}>Cancel Drawing</button>
          </>
        )}
        {mapGeoJSON && !isDrawing && (
          <div className="submit-boundary-success">
            <div>
              <strong>Boundary drawn successfully</strong>
              <span>Calculated Area: {drawnArea.toLocaleString(undefined, { maximumFractionDigits: 2 })} m2</span>
            </div>
            <div>
              <button type="button" className="submit-secondary-button" onClick={handleEditBoundary}>Edit Boundary</button>
              <button type="button" className="submit-danger-button" onClick={handleClearBoundary}>Clear Boundary</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
