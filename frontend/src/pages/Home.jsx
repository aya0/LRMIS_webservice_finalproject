import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.svg'

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
