import { NavLink, useNavigate } from 'react-router-dom'
import { APPLICANT_ID_STORAGE_KEY } from './applicantUx'
import { useAuth } from '../../context/AuthContext'
import './applicantPortal.css'

const PRIMARY_NAV_ITEMS = [
  { to: '/applicant/home', label: 'Home', icon: 'HM' },
  { to: '/applicant/create-profile', label: 'Create Profile', icon: 'CP' },
  { to: '/applicant/applications', label: 'My Applications', icon: 'MA' },
  { to: '/applicant/upload-document', label: 'Upload Document', icon: 'DO' },
  { to: '/applicant/comment', label: 'Add Comment', icon: 'AC' },
  { to: '/applicant/objection', label: 'Submit Objection', icon: 'OB' },
  { to: '/applicant/timeline', label: 'Timeline', icon: 'TL' },
]

const SECONDARY_NAV_ITEMS = [
  { to: '/applicant/profile', label: 'My Profile', icon: 'MP' },
  { to: '/applicant/settings', label: 'Settings', icon: 'ST' },
]

export default function ApplicantLayout({ children, narrow = false }) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  function handleLogout() {
    try {
      localStorage.removeItem(APPLICANT_ID_STORAGE_KEY)
    } catch {
      // Local storage may be unavailable in private contexts.
    }
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="applicant-page">
      <aside className="applicant-sidebar">
        <div className="applicant-sidebar-brand">
          <div className="applicant-logo">LR</div>
          <div>
            <p>LRMIS</p>
            <span>Land Registry</span>
          </div>
        </div>

        <div className="applicant-sidebar-section">Applicant Portal</div>

        <nav className="applicant-sidebar-nav">
          {PRIMARY_NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/applicant/home'}
              className={({ isActive }) =>
                `applicant-sidebar-link${isActive ? ' applicant-sidebar-link-active' : ''}`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="applicant-sidebar-divider" />

          {SECONDARY_NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `applicant-sidebar-link${isActive ? ' applicant-sidebar-link-active' : ''}`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <button type="button" className="applicant-sidebar-link applicant-sidebar-logout" onClick={handleLogout}>
            <span>LO</span>
            Sign out
          </button>
        </nav>
      </aside>

      <div className="applicant-main">
        <header className="applicant-header">
          <div className="applicant-header-center">
            <p className="applicant-header-title">Student 2 - Applicant Portal</p>
            <p className="applicant-header-meta">Professional &bull; Simple &bull; Clear &bull; Contract Compliant</p>
          </div>
          <div className="applicant-online">
            <span />
            Applicant
          </div>
        </header>

        <main className="applicant-content">
          <div className={narrow ? 'applicant-shell-narrow' : 'applicant-shell'}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
