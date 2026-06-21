import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/staff', label: 'Staff Console' },
  { to: '/home', label: 'Overview' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/applications', label: 'Applications' },
  { to: '/parcels', label: 'Parcels' },
  { to: '/certificates', label: 'Certificates' },
  { to: '/map', label: 'Live Map' },
  { to: '/analytics', label: 'Analytics' },
];

export default function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="w-64 bg-[#0f2044] text-white flex flex-col fixed top-0 left-0 h-full z-10 shadow-2xl">
      <div className="px-6 py-7 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-wide">LRMIS</p>
            <p className="text-blue-300 text-xs font-light">Land Registry</p>
          </div>
        </div>
      </div>

      <div className="px-6 pt-7 pb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Navigation</p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
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

      <div className="px-5 py-5 border-t border-white/10">
        <button
          type="button"
          onClick={() => { logout(); navigate('/') }}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
