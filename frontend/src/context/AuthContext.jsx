/**
 * Auth context — stores the currently selected staff member.
 * Satisfies spec: "Login or simple user selection page" (Suggested Page 35)
 * and "basic access control for staff-only endpoints".
 *
 * Selected staff is persisted in localStorage so the session survives refresh.
 * The api.js interceptor reads staff.id and sends it as X-Staff-Id header.
 */
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(() => {
    try {
      const saved = localStorage.getItem('lrmis_staff')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  function login(staffMember) {
    localStorage.setItem('lrmis_staff', JSON.stringify(staffMember))
    setStaff(staffMember)
  }

  function logout() {
    localStorage.removeItem('lrmis_staff')
    setStaff(null)
  }

  return (
    <AuthContext.Provider value={{ staff, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
