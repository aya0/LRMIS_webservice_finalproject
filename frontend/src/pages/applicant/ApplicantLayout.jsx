import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { APPLICANT_ID_STORAGE_KEY } from './applicantUx'
import { useAuth } from '../../context/AuthContext'
import './applicantPortal.css'

const PRIMARY_NAV_ITEMS = [
  { to: '/applicant', label: 'Dashboard', icon: 'DB', end: true },
  { to: '/applicant/create-profile', label: 'Create Profile', icon: 'CP' },
  { to: '/submit', label: 'Submit Application', icon: 'SA' },
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

const PAGE_TITLES = [
  { match: '/applicant/home', title: 'Applicant Portal' },
  { match: '/applicant/dashboard', title: 'Applicant Portal' },
  { match: '/applicant/create-profile', title: 'Create / Edit Profile' },
  { match: '/submit', title: 'Submit Application' },
  { match: '/applicant/applications', title: 'My Applications' },
  { match: '/applicant/upload-document', title: 'Upload Document' },
  { match: '/applicant/comment', title: 'Add Comment' },
  { match: '/applicant/objection', title: 'Submit Objection' },
  { match: '/applicant/timeline', title: 'Application Timeline' },
  { match: '/applicant/profile', title: 'My Profile' },
  { match: '/applicant/settings', title: 'Settings' },
]

export default function ApplicantLayout({ children, narrow = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { auth, logout } = useAuth()
  const applicantName = auth?.applicant?.full_name || auth?.applicant?.name || 'Applicant User'
  const pageTitle = PAGE_TITLES.find(item => location.pathname.startsWith(item.match))?.title || 'Applicant Portal'

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

        <nav className="applicant-sidebar-nav">
          {PRIMARY_NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => {
                const dashboardActive = item.to === '/applicant'
                  && ['/applicant', '/applicant/home', '/applicant/dashboard'].includes(location.pathname)
                return `applicant-sidebar-link${isActive || dashboardActive ? ' applicant-sidebar-link-active' : ''}`
              }}
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
            Logout
          </button>
        </nav>
      </aside>

      <div className="applicant-main">
        <header className="applicant-header">
          <div className="applicant-header-center">
            <p className="applicant-header-title">{pageTitle}</p>
          </div>
          <div className="applicant-user-area">
            <span className="applicant-bell" aria-label="Notifications">NT</span>
            <div className="applicant-user-avatar">{applicantName.slice(0, 1).toUpperCase()}</div>
            <div className="applicant-user-copy">
              <strong>{applicantName}</strong>
              <span>Applicant</span>
            </div>
            <span className="applicant-user-chevron">v</span>
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
