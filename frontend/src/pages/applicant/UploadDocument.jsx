import { useRef, useState } from 'react'
import { addDocument } from '../../services/applicantApi'
import ApplicantLayout from './ApplicantLayout'
import { friendlyApplicantError, getSavedApplicantId } from './applicantUx'
import './applicantPortal.css'

function errorMessage(err) {
  return friendlyApplicantError(err, 'Unable to save document metadata. Check the IDs and document fields.')
}

export default function UploadDocument() {
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    application_id: '',
    applicant_id: getSavedApplicantId(),
    document_type: '',
    description: '',
    file_name: '',
    file_url: '',
    file_size: '',
    file_extension: '',
    status: 'pending_review',
  })
  const [documentId, setDocumentId] = useState(null)
  const [error, setError] = useState(null)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [recentDocuments, setRecentDocuments] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const metadataHasErrors = ['file_name', 'file_url', 'file_size', 'file_extension'].some(field => Boolean(errors[field]))
  const metadataOpen = !selectedFile || metadataHasErrors

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
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragActive(false)
    }
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
    const fieldsToValidate = ['application_id', 'applicant_id', 'document_type', 'file_name', 'file_url', 'file_size', 'file_extension']
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
    setDocumentId(null)
    setError(null)
    setCopied(false)
    const payload = {
      applicant_id: form.applicant_id.trim(),
      document_type: form.document_type.trim(),
      file_name: form.file_name.trim(),
      file_url: form.file_url.trim(),
      file_size: form.file_size ? Number(form.file_size) : null,
      file_extension: form.file_extension.trim() || null,
      status: form.status,
    }
    try {
      const res = await addDocument(form.application_id.trim(), payload)
      setDocumentId(res.data.id)
      setRecentDocuments(current => [res.data, ...current].slice(0, 5))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function copyDocumentId() {
    if (!documentId) return
    await navigator.clipboard.writeText(documentId)
    setCopied(true)
  }

  const canSubmit = ['application_id', 'applicant_id', 'document_type', 'file_name', 'file_url', 'file_extension']
    .every(field => Boolean(String(form[field] || '').trim()))

  return (
    <ApplicantLayout>
      <div className="applicant-upload-page">
        <header className="applicant-upload-page-head">
          <h1>Upload Document</h1>
          <p>Upload supporting documents for your application.</p>
        </header>

        {documentId && (
          <section className="applicant-success applicant-upload-alert">
            <p className="applicant-success-title">Document saved successfully</p>
            <div className="applicant-id-row">
              <span className="applicant-badge">{documentId}</span>
              <button type="button" onClick={copyDocumentId} className="applicant-button-copy">
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </section>
        )}
        {error && <div className="applicant-error applicant-upload-alert">{error}</div>}

        <div className="applicant-document-layout applicant-upload-layout">
          <form onSubmit={handleSubmit} noValidate className="applicant-card applicant-section applicant-upload-form-card">
            <h2>Upload Document</h2>
            <div className="applicant-upload-id-row">
              <Field label="Application ID" required value={form.application_id} error={errors.application_id} onChange={v => updateField('application_id', v)} onBlur={v => handleBlur('application_id', v)} placeholder="e.g. LRMIS-2026-0001" />
              <Field label="Applicant ID" required value={form.applicant_id} error={errors.applicant_id} onChange={v => updateField('applicant_id', v)} onBlur={v => handleBlur('applicant_id', v)} placeholder="24-character ID" />
            </div>

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
              Selecting a file saves its metadata. The file itself is not uploaded to the server.
            </p>

            <div className="applicant-upload-basic-grid">
              <Select
                label="Document Type"
                required
                value={form.document_type}
                error={errors.document_type}
                onChange={v => updateField('document_type', v)}
                onBlur={v => handleBlur('document_type', v)}
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
                <Field label="File Name" required value={form.file_name} error={errors.file_name} onChange={v => updateField('file_name', v)} onBlur={v => handleBlur('file_name', v)} placeholder="id-card.pdf" />
                <Field label="File URL" required value={form.file_url} error={errors.file_url} onChange={v => updateField('file_url', v)} onBlur={v => handleBlur('file_url', v)} placeholder="local://filename.pdf" />
                <Field label="File Size (bytes)" value={form.file_size} error={errors.file_size} onChange={v => updateField('file_size', v)} onBlur={v => handleBlur('file_size', v)} placeholder="1024" type="text" />
                <Field label="File Extension" required value={form.file_extension} error={errors.file_extension} onChange={v => updateField('file_extension', v)} onBlur={v => handleBlur('file_extension', v)} placeholder="pdf" />
                <Select
                  label="Status"
                  value={form.status}
                  onChange={v => updateField('status', v)}
                  options={['pending_review', 'approved', 'rejected']}
                />
              </div>
            </details>

            {loading && (
              <div className="applicant-progress" aria-label="Upload progress">
                <span />
              </div>
            )}

            <div className="applicant-actions applicant-upload-actions">
              <button type="button" className="applicant-button-secondary" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setForm(current => ({ ...current, document_type: '', description: '', file_name: '', file_url: '', file_size: '', file_extension: '', status: 'pending_review' })); setErrors({}); }}>Cancel</button>
              <button disabled={loading || !canSubmit} className="applicant-button">
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
              </div>
            )}
          </aside>
        </div>
      </div>
    </ApplicantLayout>
  )
}

function Field({ label, value, onChange, onBlur, type = 'text', required = false, placeholder = '', error = '' }) {
  return (
    <label className="applicant-field">
      <span>{label}{required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}</span>
      <input
        type={type}
        aria-required={required}
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

function Select({ label, value, onChange, onBlur, options, required = false, error = '' }) {
  return (
    <label className="applicant-field">
      <span>{label}{required && <span style={{ color: '#dc2626', marginLeft: '4px' }}>*</span>}</span>
      <select aria-required={required} value={value} onChange={e => onChange(e.target.value)} onBlur={e => onBlur && onBlur(e.target.value)} className={error ? 'applicant-input-error' : ''}>
        {options.map(option => <option key={option} value={option} disabled={!option}>{option || '-- Select --'}</option>)}
      </select>
      {error && <span className="applicant-field-error">{error}</span>}
    </label>
  )
}
