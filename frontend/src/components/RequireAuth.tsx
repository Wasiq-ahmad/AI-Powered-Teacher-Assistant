import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/auth'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

