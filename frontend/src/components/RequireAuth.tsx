import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { LoadingState } from './PageStates'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-20"><LoadingState label="Checking your account" /></div>
  if (!user) {
    const destination = `${location.pathname}${location.search}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(destination)}`} replace />
  }

  return children
}
