import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'

export type Role = 'admin' | 'editor'

export interface SessionUser {
  id: number
  email: string
  name: string
  role: Role
  mustChange: boolean
}

/** Areas que puede tocar cada rol. Es un ESPEJO de lo que valida el servidor:
 *  sirve para no enseñar botones inutiles, nunca como proteccion. */
const PERMISSIONS: Record<Role, string[]> = {
  admin: ['*'],
  editor: ['products', 'categories', 'promotions', 'home', 'orders', 'tradeins', 'customers', 'media'],
}

interface AuthValue {
  user: SessionUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<SessionUser>
  logout: () => Promise<void>
  changePassword: (current: string, next: string) => Promise<void>
  refresh: () => Promise<void>
  can: (area: string) => boolean
  isAdmin: boolean
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { user: u } = await api.get<{ user: SessionUser | null }>('/auth/me')
      setUser(u)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      isAdmin: user?.role === 'admin',
      can: (area) => {
        if (!user) return false
        const list = PERMISSIONS[user.role] ?? []
        return list.includes('*') || list.includes(area)
      },
      login: async (email, password) => {
        const { user: u } = await api.post<{ user: SessionUser }>('/auth/login', { email, password })
        setUser(u)
        return u
      },
      logout: async () => {
        await api.post('/auth/logout')
        setUser(null)
      },
      changePassword: async (current, next) => {
        await api.post('/auth/password', { current, next })
        setUser((u) => (u ? { ...u, mustChange: false } : u))
      },
      refresh,
    }),
    [user, loading, refresh]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
