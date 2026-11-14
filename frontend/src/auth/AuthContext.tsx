import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { apiGet, apiPost, type User } from '../api'
import { AuthContext } from './context'
import { mergeGuestCartIntoAccount } from '../cart/storage'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiGet<{ data: User }>('/user')
      .then(({ data }) => { if (active) setUser(data) })
      .catch(() => { if (active) setUser(null) })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiPost<{ data: User }>('/login', { email, password })
    mergeGuestCartIntoAccount(response.data.id)
    setUser(response.data)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string, passwordConfirmation: string) => {
    const response = await apiPost<{ data: User }>('/register', {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    })
    mergeGuestCartIntoAccount(response.data.id)
    setUser(response.data)
  }, [])

  const logout = useCallback(async () => {
    await apiPost('/logout')
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
