import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import { saveApplicantId } from '../applicant/applicantUx'
import logo from '../../assets/logo.svg'

export default function LoginApplicant() {
  const navigate = useNavigate()
  const { loginApplicant } = useAuth()
  const [nationalId, setNationalId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Call new applicant login endpoint with password
      const res = await api.post('/applicants/login', { national_id: nationalId, password })
      const token = res.data?.access_token
      const applicant = res.data?.applicant
      if (!token || !applicant) {
        setError('Login failed. Please check credentials.')
      } else {
        loginApplicant(applicant, token)
        try { saveApplicantId(applicant.id) } catch {}
        navigate('/applicant/home')
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. If you are a new user please register.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="LRMIS" className="w-9 h-9 rounded-xl shadow-md" />
            <div>
              <p className="text-sm font-bold text-slate-800 leading-tight">LRMIS</p>
              <p className="text-xs text-slate-400">Land Registry</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-3 text-sm">
            <Link to="/" className="text-slate-600 hover:text-slate-900">Home</Link>
            <Link to="/about" className="text-slate-600 hover:text-slate-900">About</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-700 font-medium">System Online</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <h2 className="text-2xl font-bold mb-2">Applicant Login</h2>
            <p className="text-sm text-slate-500 mb-6">Enter your National ID to access your applicant dashboard.</p>

            {error && <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">National ID</label>
                <input value={nationalId} onChange={e => setNationalId(e.target.value)} required className="w-full border rounded-xl px-4 py-2" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Password</label>
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" required className="w-full border rounded-xl px-4 py-2" />
              </div>

              <button type="submit" disabled={loading} className="w-full bg-[#0f2044] text-white py-2 rounded-xl">{loading ? 'Signing in…' : 'Sign in'}</button>
            </form>

            <p className="text-xs text-slate-400 mt-4">If you don't have an account yet, create one using Register →</p>
          </div>
        </div>
      </div>
    </div>
  )
}
