import { useRef, useState } from 'react'
import { addDocument } from '../../services/applicantApi'
import {
  ApplicantApplicationSelect,
  useApplicantApplications,
} from './ApplicantApplicationSelect'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError } from './applicantUx'
import './applicantPortal.css'

function errorMessage(err) {
  return friendlyApplicantError(err, 'Unable to save document metadata. Check the selected application and document fields.')
}

export default function UploadDocument() {
  const fileInputRef = useRef(null)
  const { applicantId, applications, loading: loadingApplications, error: applicationsError } = useApplicantApplications()
  const [form, setForm] = useState({
    application_id: '',
    document_type: '',
    description: '',
    file_name: '',
    file_url: '',
    file_size: '',
    file_extension: '',
    status: 'pending_review',
  })
  const [successRes, setSuccessRes] = useState(null)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [recentDocuments, setRecentDocuments] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const metadataHasErrors = ['file_name', 'file_url', 'file_size', 'file_extension'].some(field => Boolean(errors[field]))
  const metadataOpen = !selectedFile || metadataHasErrors

  function validateField(name, value) {
    value = typeof value === 'string' ? value.trim() : value
    switch(name) {
      case 'application_id':
        if (!value) return 'Choose one of your linked applications.'
        break
      case 'applicant':
        if (!applicantId) return 'No saved applicant profile was found. Create or log in to a profile first.'
        break
      case 'document_type':
        if (!value) return 'Document type is required.'
        break
      case 'file_name':
        if (!value) return 'File name is required.'
        if (!/^[A-Za-z0-9\s\-_\.]+\.[A-Za-z0-9]+$/.test(value)) return 'File name should include a valid extension, like id-card.pdf.'
        break
      case 'file_url':
        if (!value) return 'File URL is required.'
        if (!/^(https?:\/\/|local:\/\/).+/.test(value)) return 'File URL must start with http://, https://, or local://.'
        break
      case 'file_size':
        if (value && !/^\d+$/.test(value)) return 'File size must be a positive number.'
        break
      case 'file_extension':
        if (!value) return 'File extension is required.'
        if (!/^[A-Za-z0-9]+$/.test(value)) return 'File extension should contain letters only, like pdf.'
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

  function extensionFromName(fileName) {
    const parts = fileName.split('.')
    return parts.length > 1 ? parts.pop().toLowerCase() : ''
  }

  function localFileUrl(fileName) {
    return `local://${fileName}`
  }

  function handleSelectedFile(file) {
    if (!file) return
    const extension = extensionFromName(file.name)
    const generatedUrl = localFileUrl(file.name)
    setSelectedFile(file)
    setForm(current => ({
      ...current,
      file_name: file.name,
      file_url: generatedUrl,
      file_size: String(file.size),
      file_extension: extension,
    }))
    setErrors(current => ({
      ...current,
      file_name: '',
      file_url: '',
      file_size: '',
      file_extension: '',
    }))
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function handleFileInputChange(e) {
    handleSelectedFile(e.target.files?.[0])
  }

  function handleDragEnter(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!e.currentTarget.contains(e.relatedTarget)) setDragActive(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleSelectedFile(e.dataTransfer.files?.[0])
  }

  function clearSelectedFile(e) {
    e.stopPropagation()
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setForm(current => ({
      ...current,
      file_name: '',
      file_url: '',
      file_size: '',
      file_extension: '',
    }))
    setErrors(current => ({
      ...current,
      file_name: '',
      file_url: '',
      file_size: '',
      file_extension: '',
    }))
  }

  function formatFileSize(bytes) {
    if (!Number.isFinite(bytes)) return 'Size not available'
    if (bytes < 1024) return `${bytes} bytes`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function validateForm() {
    const newErrors = {}
    ;['application_id', 'applicant', 'document_type', 'file_name', 'file_url', 'file_size', 'file_extension'].forEach(field => {
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
    const payload = {
      applicant_id: applicantId,
      document_type: form.document_type.trim(),
      file_name: form.file_name.trim(),
      file_url: form.file_url.trim(),
      file_size: form.file_size ? Number(form.file_size) : null,
      file_extension: form.file_extension.trim() || null,
      status: 'uploaded',
    }
    try {
      const res = await addDocument(form.application_id, payload)
      setSuccessRes(res.data)
      setForm(f => ({ ...f, file_url: '', file_name: '', file_size: '', file_extension: '' }))
      setRecentDocuments(current => [res.data, ...current].slice(0, 5))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = Boolean(
    applicantId &&
    form.application_id &&
    form.document_type.trim() &&
    form.file_name.trim() &&
    form.file_url.trim() &&
    form.file_extension.trim() &&
    applications.length > 0
  )

  return (
    <ApplicantLayout>
      <div className="applicant-upload-page">
        <header className="applicant-upload-page-head">
          <h1>Upload Document</h1>
          <p>Select a linked application and save supporting document metadata.</p>
        </header>

        {successRes && (
            <section className="applicant-success" style={{ padding: '20px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '20px' }}>✅</span>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Document uploaded successfully</p>
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.5' }}>
                Your document metadata has been saved to the application history.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #dcfce7', marginBottom: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#166534', textTransform: 'uppercase', fontWeight: 'bold' }}>Application</p>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{form.application_id}</p>
                </div>
                {(successRes.document_reference_number || successRes.reference_number) && (
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#166534', textTransform: 'uppercase', fontWeight: 'bold' }}>Reference</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>{successRes.document_reference_number || successRes.reference_number}</p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Link to="/applicant/timeline" className="applicant-button" style={{ background: '#16a34a', borderColor: '#15803d', color: '#fff', textDecoration: 'none' }}>View Timeline</Link>
              </div>
            </section>
        )}
        {applicationsError && <div className="applicant-error applicant-upload-alert">{applicationsError}</div>}
        {errors.applicant && <div className="applicant-error applicant-upload-alert">{errors.applicant}</div>}
        {error && <div className="applicant-error applicant-upload-alert">{error}</div>}

        <div className="applicant-document-layout applicant-upload-layout">
          <form onSubmit={handleSubmit} noValidate className="applicant-card applicant-section applicant-upload-form-card">
            <h2>Upload Document</h2>

            <ApplicantApplicationSelect
              applications={applications}
              value={form.application_id}
              onChange={value => updateField('application_id', value)}
              error={errors.application_id}
              loading={loadingApplications}
              label="Linked Application"
            />

            <div
              className={`applicant-upload-drop${dragActive ? ' applicant-upload-drop-active' : ''}`}
              onClick={openFilePicker}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openFilePicker()
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="applicant-file-input"
                onChange={handleFileInputChange}
                tabIndex={-1}
              />
              {selectedFile ? (
                <div className="applicant-selected-file">
                  <div className="applicant-upload-icon">OK</div>
                  <p>{selectedFile.name}</p>
                  <small>{formatFileSize(selectedFile.size)} | {extensionFromName(selectedFile.name) || 'no extension'}</small>
                  <button type="button" className="applicant-button-secondary applicant-file-clear" onClick={clearSelectedFile}>
                    Remove File
                  </button>
                </div>
              ) : (
                <>
                  <div className="applicant-upload-icon">UP</div>
                  <p>Drag and drop your file here</p>
                  <span>or</span>
                  <button type="button" className="applicant-button-secondary" onClick={e => { e.stopPropagation(); openFilePicker() }}>Choose File</button>
                </>
              )}
            </div>
            <p className="applicant-upload-helper">
              Selecting a file saves metadata only. The file content is not uploaded to the backend.
            </p>

            <div className="applicant-upload-basic-grid">
              <Select
                label="Document Type"
                required
                value={form.document_type}
                error={errors.document_type}
                onChange={v => updateField('document_type', v)}
                options={['', 'identity_card', 'ownership_deed', 'sale_contract', 'parcel_map', 'power_of_attorney', 'other']}
              />
              <Field
                label="Description (optional)"
                value={form.description}
                onChange={v => updateField('description', v)}
                placeholder="Brief document note"
              />
            </div>

            <details className="applicant-document-metadata" open={metadataOpen}>
              <summary>Advanced document metadata</summary>
              <div className="applicant-upload-basic-grid">
                <Field label="File Name" required value={form.file_name} error={errors.file_name} onChange={v => updateField('file_name', v)} placeholder="id-card.pdf" />
                <Field label="File URL" required value={form.file_url} error={errors.file_url} onChange={v => updateField('file_url', v)} placeholder="local://filename.pdf" />
                <Field label="File Size (bytes)" value={form.file_size} error={errors.file_size} onChange={v => updateField('file_size', v)} placeholder="1024" type="text" />
                <Field label="File Extension" required value={form.file_extension} error={errors.file_extension} onChange={v => updateField('file_extension', v)} placeholder="pdf" />
                <div className="applicant-readonly-status">
                  <span>Document Metadata Status</span>
                  <strong className="applicant-status applicant-status-pending-review">{form.status}</strong>
                  <small>Status is assigned automatically when metadata is submitted.</small>
                </div>
              </div>
            </details>

            {loading && (
              <div className="applicant-progress" aria-label="Upload progress">
                <span />
              </div>
            )}

            <div className="applicant-actions applicant-upload-actions">
              <button type="button" className="applicant-button-secondary" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setForm(current => ({ ...current, document_type: '', description: '', file_name: '', file_url: '', file_size: '', file_extension: '', status: 'pending_review' })); setErrors({}); }}>Cancel</button>
              <button disabled={loading || loadingApplications || !canSubmit} className="applicant-button">
                {loading ? 'Saving...' : 'Upload'}
              </button>
            </div>
          </form>

          <aside className="applicant-card applicant-section applicant-side-panel applicant-recent-panel">
            <h2>Recent Documents</h2>
            {recentDocuments.length > 0 ? (
              <div className="applicant-recent-list">
                {recentDocuments.map(doc => (
                  <article key={doc.id} className="applicant-recent-item">
                    <strong>{doc.document_type || 'Document'}</strong>
                    <span>{doc.file_name || doc.id}</span>
                    <small>{doc.status || 'pending_review'}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="applicant-empty-panel">
                <div className="applicant-empty-icon">RD</div>
                <p>No recent documents yet.</p>
                <small>Submitted document IDs appear after metadata is saved.</small>
              </div>
            )}
          </aside>
        </div>
      </div>
    </ApplicantLayout>
  )
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '', error = '' }) {
  return (
    <label className="applicant-field">
      <span>{label}{required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}</span>
      <input
        type={type}
        aria-required={required}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className={error ? 'applicant-input-error' : ''}
      />
      {error && <span className="applicant-field-error">{error}</span>}
    </label>
  )
}

function Select({ label, value, onChange, options, required = false, error = '' }) {
  return (
    <label className="applicant-field">
      <span>{label}{required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}</span>
      <select aria-required={required} value={value} onChange={e => onChange(e.target.value)} className={error ? 'applicant-input-error' : ''}>
        {options.map(option => <option key={option} value={option} disabled={!option}>{option || '-- Select --'}</option>)}
      </select>
      {error && <span className="applicant-field-error">{error}</span>}
    </label>
  )
}
