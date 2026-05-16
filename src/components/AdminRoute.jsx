import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function AdminRoute() {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/signin" replace />

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  if (!adminEmails.includes(user.email?.toLowerCase())) {
    return (
      <div style={page}>
        <div style={box}>
          <p style={heading}>Access restricted.</p>
          <p style={sub}>This page is for SPARK administrators.</p>
        </div>
      </div>
    )
  }

  return <Outlet />
}

const page = {
  minHeight: '100vh',
  background: '#f5f5f3',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
}

const box = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 12,
  padding: '2.5rem 2rem',
  textAlign: 'center',
  maxWidth: 360,
  width: '100%',
}

const heading = {
  fontSize: 18,
  fontWeight: 600,
  color: '#1a1a18',
  margin: '0 0 0.5rem',
}

const sub = {
  fontSize: 14,
  color: '#5f5e5a',
  margin: 0,
}
