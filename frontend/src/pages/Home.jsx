/**
 * Home / Landing Page
 * System overview with module cards and quick stats
 */
import { useNavigate } from 'react-router-dom'

const MODULES = [
  {
    number: '01',
    title: 'Land Application Management',
    owner: 'Student 1',
    description: 'Submit and manage land registration applications through a strict workflow with full validation and state machine.',
    features: ['Application CRUD', 'Workflow state machine', 'Certificate issuance', 'Parcel management'],
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    available: false,
    path: null,
  },
  {
    number: '02',
    title: 'Applicant Portal',
    owner: 'Student 2',
    description: 'Citizens, lawyers, and companies submit applications, upload documents, track status, and submit objections.',
    features: ['Applicant profiles', 'Document upload', 'Status tracking', 'Objections'],
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    available: false,
    path: null,
  },
  {
    number: '03',
    title: 'Surveyors, Registrar & Assignment',
    owner: 'Tala — 1220536',
    description: 'Manage field surveyors, auto-assign based on zone and workload, track survey milestones, record registrar decisions, and view live parcel map + analytics dashboard.',
    features: ['Auto-assignment engine', 'Survey milestones', 'Registrar review', 'Live parcel map', 'Analytics dashboard'],
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    available: true,
    path: '/',
  },
  {
    number: '04',
    title: 'Group Module',
    owner: 'Team',
    description: 'Shared backend analytics endpoints, geospatial data feeds, and any cross-module group deliverables required by the project specification.',
    features: ['Analytics endpoints', 'Parcel GeoJSON feed', 'Heatmap data', 'Group deliverables'],
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    available: false,
    path: null,
  },
]

const WORKFLOW = [
  { state: 'Submitted',         color: '#94a3b8' },
  { state: 'Pre Checked',       color: '#60a5fa' },
  { state: 'Survey Required',   color: '#f59e0b' },
  { state: 'Surveyed',          color: '#a78bfa' },
  { state: 'Legal Review',      color: '#f97316' },
  { state: 'Approved',          color: '#34d399' },
  { state: 'Certificate Issued',color: '#10b981' },
  { state: 'Closed',            color: '#6b7280' },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div>
      {/* Hero */}
      <div className="mb-10">
        <div className="bg-[#0f2044] rounded-3xl px-10 py-10 text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-blue-400/5 rounded-full translate-y-1/2" />

          <div className="relative z-10">
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-widest">COMP4382 · 2025–2026</span>
            <h1 className="text-4xl font-bold mt-2 mb-3 tracking-tight leading-tight">
              Land Registration<br />Management Information System
            </h1>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              A secure, geo-enabled platform for managing land registration services, property ownership records,
              parcel applications, field surveys, and official certificate issuance.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => navigate('/')}
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-900/30"
              >
                Open Module 3 →
              </button>
              <button
                onClick={() => navigate('/map')}
                className="bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                Live Map
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow strip */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5 mb-8">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Application Workflow</p>
        <div className="flex items-center gap-1 flex-wrap">
          {WORKFLOW.map(({ state, color }, i) => (
            <div key={state} className="flex items-center gap-1">
              <span
                className="text-xs font-medium px-3 py-1.5 rounded-full text-white"
                style={{ backgroundColor: color }}
              >
                {state}
              </span>
              {i < WORKFLOW.length - 1 && (
                <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Module cards */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">System Modules</p>
        <div className="grid grid-cols-2 gap-5">
          {MODULES.map(mod => (
            <div
              key={mod.number}
              onClick={() => mod.available && mod.path && navigate(mod.path)}
              className={`rounded-2xl border p-6 transition-all duration-200 ${
                mod.available
                  ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'
                  : 'opacity-70 cursor-default'
              }`}
              style={{ backgroundColor: mod.bg, borderColor: mod.border }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-bold tracking-widest" style={{ color: mod.color }}>
                    MODULE {mod.number}
                  </span>
                  <h3 className="text-base font-bold text-slate-800 mt-1">{mod.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Owner: {mod.owner}</p>
                </div>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: mod.color }}
                >
                  {mod.number}
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed mb-4">{mod.description}</p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {mod.features.map(f => (
                  <span
                    key={f}
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: mod.color + '15', color: mod.color }}
                  >
                    {f}
                  </span>
                ))}
              </div>

              {mod.available ? (
                <div className="flex items-center gap-1.5" style={{ color: mod.color }}>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold">Available — click to open</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="text-xs font-semibold">In development</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
