import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireStaff({ children }) {
  const { auth } = useAuth()
  const staff = auth?.staff
  if (!staff) return <Navigate to="/login" replace />
  return children
}
