import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: '🏠 Dashboard', end: true },
  { to: '/submit', label: '📝 Submit Application' },
  { to: '/applications', label: '📋 My Applications' },
  { to: '/parcels', label: '🗺️ Parcels' },
  { to: '/staff', label: '🏛️ Staff Console' },
  { to: '/certificates', label: '📜 Certificates' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>LRMIS</span> Portal
        <div style={{ fontSize: '0.72rem', opacity: 0.6, marginTop: 2 }}>Module 1 — Applications</div>
      </div>
      <nav>
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end={l.end}
            className={({ isActive }) => isActive ? 'active' : ''}>
            {l.label}
          </NavLink>
        ))}
      </nav> 
    </aside>
  );
}
