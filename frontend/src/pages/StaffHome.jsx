import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const REGISTRAR_ACTIONS = [
  { to: '/staff',        label: 'Staff Console',  description: 'Review applications, approve transitions, issue certificates.' },
  { to: '/applications', label: 'Applications',   description: 'Browse and filter all land registration applications.' },
  { to: '/parcels',      label: 'Parcels',         description: 'Open parcel records and geometry details.' },
  { to: '/certificates', label: 'Certificates',   description: 'View issued certificates and records.' },
  { to: '/map',          label: 'Live Map',        description: 'Inspect parcel boundaries and clustered markers.' },
  { to: '/analytics',    label: 'Analytics',       description: 'Review KPIs, workload charts, and trends.' },
]

const SURVEYOR_ACTIONS = [
  { to: '/tasks',     label: 'My Tasks',    description: 'View and manage your assigned field survey tasks.' },
  { to: '/map',       label: 'Live Map',    description: 'Inspect parcel boundaries, survey zones, and disputed parcels.' },
  { to: '/analytics', label: 'Analytics',  description: 'Review surveyor workload and processing stats.' },
]

export default function StaffHome() {
  const { auth } = useAuth()
  const staff = auth?.staff
  const isSurveyor = staff?.role === 'surveyor'
  const actions = isSurveyor ? SURVEYOR_ACTIONS : REGISTRAR_ACTIONS

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">
              {isSurveyor ? 'Surveyor Portal' : 'Registrar Portal'}
            </p>
            <h1 className="text-2xl font-bold mt-1">
              Welcome{staff?.name ? `, ${staff.name}` : ''}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {isSurveyor
                ? 'Use the sidebar or quick links below to manage your survey tasks.'
                : 'Use the sidebar or quick links below to manage applications and staff.'}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-xl text-sm font-semibold ${
            isSurveyor ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'
          }`}>
            {staff?.role?.charAt(0).toUpperCase() + staff?.role?.slice(1)} · {staff?.staff_code}
          </div>
        </div>
      </div>

      {/* Quick action cards */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Quick Access</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {actions.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800">{item.label}</h2>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{item.description}</p>
                </div>
                <span className="w-10 h-10 rounded-xl bg-[#0f2044] text-white flex items-center justify-center font-bold shrink-0 text-lg">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Surveyor-specific hint */}
      {isSurveyor && (
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600 mb-3">How it works</p>
          <ul className="space-y-2 text-sm text-teal-800">
            <li>1. Go to <strong>My Tasks</strong> to see applications assigned to you for field survey.</li>
            <li>2. Click a task to open <strong>Task Execution</strong> — step through milestones as you progress on site.</li>
            <li>3. Upload your survey report once the field work is done.</li>
            <li>4. Use <strong>Live Map</strong> to see parcel locations and boundaries before visiting.</li>
          </ul>
        </div>
      )}
    </div>
  )
}
