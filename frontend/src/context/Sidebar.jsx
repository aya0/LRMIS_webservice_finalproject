import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.svg'

const REGISTRAR_LINKS = [
  { to: '/home',         label: 'Overview' },
  { to: '/staff',        label: 'Staff Console' },
  { to: '/applications', label: 'Applications' },
  { to: '/parcels',      label: 'Parcels' },
  { to: '/certificates', label: 'Certificates' },
  { to: '/map',          label: 'Live Map' },
  { to: '/analytics',    label: 'Analytics' },
];

const SURVEYOR_LINKS = [
  { to: '/home',     label: 'Overview' },
  { to: '/tasks',    label: 'My Tasks',  end: false },
  { to: '/map',      label: 'Live Map' },
  { to: '/analytics',label: 'Analytics' },
];

export default function Sidebar() {
  const { auth, logout } = useAuth()
  const navigate = useNavigate()
  const staff = auth?.staff
  const isSurveyor = staff?.role === 'surveyor'
  const links = isSurveyor ? SURVEYOR_LINKS : REGISTRAR_LINKS

  return (
    <aside className="w-64 bg-[#0f2044] text-white flex flex-col fixed top-0 left-0 h-full z-10 shadow-2xl">
      {/* Logo */}
      <div className="px-6 py-7 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src={logo} alt="LRMIS Logo" className="w-10 h-10 rounded-xl shadow-lg" />
          <div>
            <p className="text-white font-bold text-sm tracking-wide">LRMIS</p>
            <p className="text-blue-300 text-xs font-light">Land Registry</p>
          </div>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-6 pt-5 pb-2">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
          isSurveyor
            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isSurveyor ? 'bg-teal-400' : 'bg-blue-400'}`} />
          {isSurveyor ? 'Surveyor' : 'Registrar'}
        </div>
      </div>

      <div className="px-6 pt-3 pb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Navigation</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 space-y-1">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end !== false}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-slate-400 hover:bg-white/8 hover:text-white'
              }`}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      {/* Staff info card */}
      {staff && (
        <div className="px-5 py-5 border-t border-white/10">
          <div className="bg-white/5 rounded-xl px-4 py-3 mb-2">
            <p className="text-[11px] text-white font-medium truncate">{staff.name}</p>
            <p className="text-[11px] text-blue-300 mt-0.5">{staff.staff_code}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
