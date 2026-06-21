import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { saveApplicantId } from '../applicant/applicantUx'

export default function RegisterApplicant() {
  const navigate = useNavigate()
  const { loginApplicant } = useAuth()
  const [fullName, setFullName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({ fullName: '', nationalId: '', password: '', confirm: '' })

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    // client-side validation
    setFieldErrors({ fullName: '', nationalId: '', password: '', confirm: '' })
    const ok = validate()
    if (!ok) {
      setLoading(false)
      return
    }
    try {
      if (password && password !== confirm) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
      const payload = { full_name: fullName, national_id: nationalId, password }
      // call new register endpoint that supports password
      const res = await api.post('/applicants/register', payload)
      const applicant = res.data
      // Persist applicant id for portal pages
      try { saveApplicantId(applicant.id) } catch {}

      // If user provided a password, attempt to log them in immediately to obtain a token.
      if (password) {
        try {
          const loginRes = await api.post('/applicants/login', { national_id: nationalId, password })
          const token = loginRes.data?.access_token
          const applicantPublic = loginRes.data?.applicant || applicant
          loginApplicant(applicantPublic, token)
          navigate('/applicant/home')
          return
        } catch (loginErr) {
          // Registration succeeded but auto-login failed — fall through to navigate and show message
          console.warn('Auto-login failed after registration', loginErr)
        }
      }

      // No password provided or auto-login failed: store lightweight applicant context and send user to login.
      loginApplicant(applicant)
      navigate('/applicant/login')
    } catch (err) {
      // Parse backend validation errors (pydantic) and friendly messages
      const detail = err.response?.data?.detail
      if (!detail) {
        setError('Registration failed — could not reach server.')
      } else if (typeof detail === 'string') {
        setError(detail)
      } else if (Array.isArray(detail)) {
        // pydantic returns array of errors
        const msgs = detail.map(d => d?.msg || d?.message || JSON.stringify(d)).join(' — ')
        setError(msgs)
      } else if (typeof detail === 'object') {
        setError(detail.message || detail.detail || JSON.stringify(detail))
      } else {
        setError('Registration failed. Please check your input and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  function validate() {
    const errs = { fullName: '', nationalId: '', password: '', confirm: '' }
    const name = (fullName || '').trim()
    if (name.length < 2) errs.fullName = 'Full name must be at least 2 characters.'
    else {
      // basic unicode letters, spaces, hyphen and apostrophe
      const nameRe = /^[A-Za-z\u0600-\u06FF\s\-']{2,}$/u
      if (!nameRe.test(name)) errs.fullName = 'Full name contains invalid characters.'
    }

    const nid = (nationalId || '').trim()
    if (nid && !/^\d{6,20}$/.test(nid)) errs.nationalId = 'National ID must be 6–20 digits.'

    if (password) {
      if (password.length < 6) errs.password = 'Password must be at least 6 characters.'
      if (password !== confirm) errs.confirm = 'Passwords do not match.'
    }

    setFieldErrors(errs)
    return !errs.fullName && !errs.nationalId && !errs.password && !errs.confirm
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <h2 className="text-2xl font-bold mb-2">Create Applicant Profile</h2>
          <p className="text-sm text-slate-500 mb-6">Register as a citizen, company or lawyer to submit applications and track progress.</p>

          {error && <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full border rounded-xl px-4 py-2" />
              {fieldErrors.fullName && <p className="text-xs text-red-500 mt-1">{fieldErrors.fullName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">National ID</label>
              <input value={nationalId} onChange={e => setNationalId(e.target.value)} required className="w-full border rounded-xl px-4 py-2" />
              {fieldErrors.nationalId && <p className="text-xs text-red-500 mt-1">{fieldErrors.nationalId}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Password (optional)</label>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full border rounded-xl px-4 py-2" />
              {fieldErrors.password && <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Confirm password</label>
              <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" className="w-full border rounded-xl px-4 py-2" />
              {fieldErrors.confirm && <p className="text-xs text-red-500 mt-1">{fieldErrors.confirm}</p>}
            </div>

            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-2 rounded-xl">{loading ? 'Creating…' : 'Create account'}</button>
          </form>

          <p className="text-xs text-slate-400 mt-4">After registering you'll be taken to your applicant dashboard where you can submit applications and upload documents.</p>
        </div>
      </div>
    </div>
  )
}
