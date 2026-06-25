import { Routes, Route, NavLink, Navigate, useNavigate  , BrowserRouter } from 'react-router-dom'
import logo from './assets/logo.svg'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login         from './pages/Login'
import Home          from './pages/Home'
import StaffHome     from './pages/StaffHome'
import SurveyorTasks from './pages/SurveyorTasks'
import TaskExecution  from './pages/TaskExecution'
import LiveMap        from './pages/LiveMap'
import Analytics      from './pages/Analytics'
import ApplicantDashboard from './pages/applicant/ApplicantDashboard'
import ApplicantHome from './pages/applicant/ApplicantHome'
import CreateApplicantProfile from './pages/applicant/CreateApplicantProfile'
import ApplicantApplications from './pages/applicant/ApplicantApplications'
import UploadDocument from './pages/applicant/UploadDocument'
import SubmitComment from './pages/applicant/SubmitComment'
import SubmitObjection from './pages/applicant/SubmitObjection'
import ApplicationTimeline from './pages/applicant/ApplicationTimeline'
import ApplicantProfile from './pages/applicant/ApplicantProfile'
import ApplicantSettings from './pages/applicant/ApplicantSettings'

import Sidebar from './context/Sidebar';
import StaffShell from './components/StaffShell'
import Dashboard from './pages/Dashboard';
import SubmitApplication from './pages/SubmitApplication';
import ApplicationsList from './pages/ApplicationsList';
import ApplicationDetail from './pages/ApplicationDetail';
import Parcels from './pages/Parcels';
import StaffConsole from './pages/StaffConsole';
import Certificates from './pages/Certificates';
import './global.css';
import NavBar from './components/NavBar'
import { useLocation } from 'react-router-dom'
import RegisterApplicant from './pages/Auth/RegisterApplicant'
import LoginApplicant from './pages/Auth/LoginApplicant'
import ApplicantLayout from './pages/applicant/ApplicantLayout'
import About from './pages/About'
import RequireStaff from './components/RequireStaff'


/*
  This is a comment
  inside JavaScript code
*/
const NAV = [
  {
    to: '/home',
    label: 'Overview',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    to: '/',
    label: 'My Tasks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    to: '/map',
    label: 'Live Map',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

function Shell() {
  const { auth, logout } = useAuth()
  const staff = auth?.staff
  const navigate          = useNavigate()

  if (!staff) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside className="w-64 bg-[#0f2044] flex flex-col fixed top-0 left-0 h-full z-10 shadow-2xl">

        {/* Logo */}
        <div className="px-6 py-7 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={logo} alt="LRMIS" className="w-9 h-9 rounded-xl shadow-lg" />
            <div>
              <p className="text-white font-bold text-sm tracking-wide">LRMIS</p>
              <p className="text-blue-300 text-xs font-light">Land Registry</p>
            </div>
          </div>
        </div>

        {/* Section label */}
        <div className="px-6 pt-7 pb-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Navigation
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                    : 'text-slate-400 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logged-in staff card */}
        <div className="px-5 py-5 border-t border-white/10 space-y-2">
          <div className="bg-white/5 rounded-xl px-4 py-3">
            <p className="text-[11px] text-slate-400 truncate">{staff.name}</p>
            <p className="text-[11px] text-blue-300 font-medium mt-0.5 capitalize">{staff.role} · {staff.staff_code}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="w-full text-[11px] text-slate-500 hover:text-red-400 transition-colors py-1"
          >
            Switch account
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────── */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">

        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 px-10 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <p className="text-base font-semibold text-slate-800 tracking-tight">
              Land Registration Management Information System
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-light">COMP4382 · 2025–2026</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-700 font-medium">System Online</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-10 py-8">
          <Routes>
            <Route path="/home"          element={<StaffHome />} />
            <Route path="/"              element={<SurveyorTasks />} />
            <Route path="/tasks/:taskId" element={<TaskExecution />} />
            <Route path="/analytics"     element={<Analytics />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const hideNav = (
    // hide global NavBar on login/applicant auth pages
    location?.pathname?.startsWith('/login') ||
    location?.pathname?.startsWith('/applicant/login') ||
    location?.pathname?.startsWith('/applicant/register') ||
    location?.pathname?.startsWith('/applicant') ||
    // Hide global NavBar on staff pages which render their own header/sidebar
    location?.pathname?.startsWith('/staff') ||
    location?.pathname?.startsWith('/applications') ||
    location?.pathname?.startsWith('/parcels') ||
    location?.pathname?.startsWith('/certificates') ||
    location?.pathname?.startsWith('/home') ||
    location?.pathname?.startsWith('/tasks') ||
    location?.pathname?.startsWith('/map') ||
    location?.pathname?.startsWith('/analytics') ||
    location?.pathname?.startsWith('/dashboard') ||
    location?.pathname?.startsWith('/submit')
  )

  return (
    <AuthProvider>
      {!hideNav && <NavBar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/applicant/register" element={<RegisterApplicant />} />
        <Route path="/applicant/login" element={<LoginApplicant />} />
        <Route path="/dashboard" element={<RequireStaff><StaffShell><Dashboard /></StaffShell></RequireStaff>} />
        <Route path="/home" element={<RequireStaff><StaffShell><StaffHome /></StaffShell></RequireStaff>} />
        <Route path="/tasks" element={<RequireStaff><StaffShell><SurveyorTasks /></StaffShell></RequireStaff>} />
        <Route path="/tasks/:taskId" element={<RequireStaff><StaffShell><TaskExecution /></StaffShell></RequireStaff>} />
        <Route path="/applicant" element={<ApplicantHome />} />
        <Route path="/applicant/home" element={<ApplicantHome />} />
        <Route path="/applicant/dashboard" element={<ApplicantDashboard />} />
        <Route path="/applicant/create-profile" element={<CreateApplicantProfile />} />
        <Route path="/applicant/applications" element={<ApplicantApplications />} />
        <Route path="/applicant/upload-document" element={<UploadDocument />} />
        <Route path="/applicant/comment" element={<SubmitComment />} />
        <Route path="/applicant/objection" element={<SubmitObjection />} />
        <Route path="/applicant/timeline" element={<ApplicationTimeline />} />
        <Route path="/applicant/profile" element={<ApplicantProfile />} />
        <Route path="/applicant/settings" element={<ApplicantSettings />} />
        <Route path="/submit" element={<ApplicantLayout><SubmitApplication /></ApplicantLayout>} />
        <Route path="/applications" element={<RequireStaff><StaffShell><ApplicationsList /></StaffShell></RequireStaff>} />
        <Route path="/applications/:id" element={<RequireStaff><StaffShell><ApplicationDetail /></StaffShell></RequireStaff>} />
        <Route path="/parcels" element={<RequireStaff><StaffShell><Parcels /></StaffShell></RequireStaff>} />
        <Route path="/staff" element={<RequireStaff><StaffShell><StaffConsole /></StaffShell></RequireStaff>} />
        <Route path="/certificates" element={<RequireStaff><StaffShell><Certificates /></StaffShell></RequireStaff>} />
        <Route path="/analytics" element={<RequireStaff><StaffShell><Analytics /></StaffShell></RequireStaff>} />
        <Route path="/map" element={<RequireStaff><StaffShell><LiveMap /></StaffShell></RequireStaff>} />
        <Route path="/*" element={<Shell />} />
        

      </Routes>
    </AuthProvider>
  )
}
