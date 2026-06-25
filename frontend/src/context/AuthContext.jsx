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
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem('lrmis_auth')
      return saved ? JSON.parse(saved) : { staff: null, applicant: null, token: null }
    } catch {
      return { staff: null, applicant: null, token: null }
    }
  })

  // Backwards-compatible staff login (existing pages call `login`)
  function login(staffMember, token) {
    const payload = { staff: staffMember, applicant: null, token }
    localStorage.setItem('lrmis_auth', JSON.stringify(payload))
    setAuth(payload)
  }

  function loginStaff(staffMember, token) {
    return login(staffMember, token)
  }

  function loginApplicant(applicant, token = null) {
    const payload = { staff: null, applicant, token }
    localStorage.setItem('lrmis_auth', JSON.stringify(payload))
    setAuth(payload)
  }

  function logout() {
    localStorage.removeItem('lrmis_auth')
    setAuth({ staff: null, applicant: null, token: null })
  }

  return (
    <AuthContext.Provider value={{ auth, login, loginStaff, loginApplicant, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
