import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.svg'

const WORKFLOW_STEPS = [
  { label: 'Submitted',       color: 'bg-slate-400' },
  { label: 'Pre-checked',     color: 'bg-blue-400' },
  { label: 'Survey',          color: 'bg-amber-400' },
  { label: 'Surveyed',        color: 'bg-orange-400' },
  { label: 'Legal Review',    color: 'bg-purple-400' },
  { label: 'Approved',        color: 'bg-emerald-400' },
  { label: 'Certificate',     color: 'bg-teal-500' },
]

const HIGHLIGHTS = [
  {
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>,
    label: 'Geospatial parcels with GeoJSON boundaries',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    label: 'Auto surveyor assignment by zone and workload',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    label: 'Analytics dashboard with PDF and CSV export',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
    label: 'Official certificate issuance with verification',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f7fa] to-[#eef4fb]">
      <div className="relative w-full max-w-4xl p-8">

        {/* Animated background shapes */}
        <div className="absolute -left-24 -top-16 w-72 h-72 bg-gradient-to-r from-[#2c4a6e] to-[#6b4c7a] rounded-full opacity-20 animate-blob" />
        <div className="absolute right-0 -bottom-20 w-96 h-96 bg-gradient-to-r from-[#059669] to-[#d97706] rounded-full opacity-12 animate-blob animation-delay-2000" />

        {/* Main card */}
        <div className="relative bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100 shadow-lg p-12 text-center">

          {/* Logo + badge */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={logo} alt="LRMIS" className="w-12 h-12 rounded-2xl shadow-md" />
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">COMP4382 · 2025/2026</p>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-bold tracking-tight text-[#0f2044]" style={{ fontFamily: 'Source Serif 4, Georgia, serif' }}>
            Land Registration Management Information System
          </h1>
          <p className="mt-5 text-slate-500 text-lg max-w-2xl mx-auto">
            A secure, geo-enabled platform for land registration, parcel management, field surveys, and certificate issuance.
          </p>

          {/* Workflow strip */}
          <div className="mt-8 flex items-center justify-center gap-0 flex-wrap">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full ${step.color}`} />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium whitespace-nowrap">{step.label}</p>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div className="w-6 h-px bg-slate-200 mx-1 mb-3.5" />
                )}
              </div>
            ))}
          </div>

          {/* Highlights */}
          <div className="mt-8 grid grid-cols-2 gap-3 text-left max-w-xl mx-auto">
            {HIGHLIGHTS.map(h => (
              <div key={h.label} className="flex items-start gap-2.5 bg-slate-50 rounded-xl px-4 py-3">
                <span className="text-[#0f2044] mt-0.5 shrink-0">{h.icon}</span>
                <p className="text-xs text-slate-600 leading-relaxed">{h.label}</p>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="mt-10 flex items-center justify-center gap-4">
            <button onClick={() => navigate('/applicant/register')} className="btn-primary px-6 py-3 text-base">
              Get started
            </button>
            <button onClick={() => navigate('/login')} className="btn-outline px-6 py-3 text-base">
              Staff login
            </button>
          </div>

          <p className="mt-6 text-xs text-slate-300">Computer Science Department · Built with FastAPI, MongoDB, and React</p>
        </div>
      </div>
    </div>
  )
}
