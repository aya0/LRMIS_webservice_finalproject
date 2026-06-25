import React from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../context/Sidebar'
import { useAuth } from '../context/AuthContext'

export default function StaffShell({ children, title = 'Staff Console' }) {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-100 px-10 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <p className="text-base font-semibold text-slate-800 tracking-tight">Land Registration Management Information System</p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-light">{title}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-700 font-medium">System Online</span>
            </div>
            <button
              onClick={() => { logout(); navigate('/') }}
              className="text-xs font-medium text-red-500 hover:text-red-700 px-3 py-1.5 rounded-full border border-red-200 hover:bg-red-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 px-10 py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
