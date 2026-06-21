import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const QUICK_ACTIONS = [
  { to: '/map', label: 'Live Map', description: 'Inspect parcel boundaries and clustered markers.' },
  { to: '/analytics', label: 'Analytics', description: 'Review KPIs, workload charts, and trends.' },
  { to: '/applications', label: 'Applications', description: 'Browse all land applications and statuses.' },
  { to: '/parcels', label: 'Parcels', description: 'Open parcel records and geometry details.' },
  { to: '/staff', label: 'Staff Console', description: 'Manage staff members and assignments.' },
  { to: '/certificates', label: 'Certificates', description: 'View issued certificates and records.' },
]

const MODULE_1_ACTIONS = [
  { to: '/applications', label: 'Applications', description: 'Create, replace, update, delete, and review applications.' },
  { to: '/parcels', label: 'Parcels', description: 'Create, update, list, and delete parcel records.' },
  { to: '/certificates', label: 'Certificates', description: 'Inspect issued certificates and verification info.' },
]

export default function StaffHome() {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const staff = auth?.staff

  return (
    <div className="space-y-8">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-semibold">Staff Home</p>
              <h1 className="text-2xl font-bold mt-1">Welcome{staff?.name ? `, ${staff.name}` : ''}</h1>
            </div>
            <div className="text-sm text-slate-500">
              <div>{staff?.role} · {staff?.staff_code}</div>
            </div>
          </div>
        </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {QUICK_ACTIONS.map(item => (
          <Link
            key={item.to + item.label}
            to={item.to}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">{item.label}</h2>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">{item.description}</p>
              </div>
              <span className="w-10 h-10 rounded-xl bg-[#0f2044] text-white flex items-center justify-center font-bold shrink-0">
                →
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Module 1 shortcuts</p>
            <h2 className="text-xl font-bold text-slate-800 mt-1">Land Application Management</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl">
              Direct links for the core land administration pages: applications, parcels, and certificates.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {MODULE_1_ACTIONS.map(item => (
            <Link
              key={item.to + item.label}
              to={item.to}
              className="rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors p-4"
            >
              <h3 className="font-semibold text-slate-800">{item.label}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">How to use</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-600 leading-relaxed">
            <li>• Surveyors should start with <strong>My Tasks</strong> or <strong>Task Execution</strong>.</li>
            <li>• Use <strong>Live Map</strong> to inspect parcel boundaries and pending work.</li>
            <li>• Use <strong>Analytics</strong> to review workload and progress.</li>
            <li>• Use <strong>Staff Console</strong> and <strong>Certificates</strong> for administration and records.</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Role shortcuts</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link to="/" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              Open My Tasks
            </Link>
            <Link to="/map" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              Open Live Map
            </Link>
            <Link to="/analytics" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              Open Analytics
            </Link>
            <Link to="/applications" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 transition-colors">
              Open Applications
            </Link>
          </div>
        </div>
      </section>
    </div>
  
  )
}