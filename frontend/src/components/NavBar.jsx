import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function NavBar() {
  const { auth, logout } = useAuth()
  const applicant = auth?.applicant
  const staff = auth?.staff
  const location = useLocation()
  const onLanding = location?.pathname === '/'
  const hideMap = onLanding || location?.pathname?.startsWith('/applicant') || location?.pathname?.startsWith('/about')

  return (
    <header className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
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

      <div className="flex items-center gap-3">
        {applicant ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">{applicant.full_name}</span>
            <button onClick={logout} className="text-sm text-red-500">Sign out</button>
          </div>
        ) : staff ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700">{staff.name}</span>
            <button onClick={logout} className="text-sm text-red-500">Sign out</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/applicant/register" className="text-sm bg-emerald-600 text-white px-3 py-1 rounded-md">Register</Link>
            <Link to="/applicant/login" className="text-sm bg-white border border-slate-200 px-3 py-1 rounded-md">Applicant Login</Link>
            <Link to="/login" className="text-sm bg-[#0f2044] text-white px-3 py-1 rounded-md">Staff Login</Link>
          </div>
        )}
      </div>
    </header>
  )
}
