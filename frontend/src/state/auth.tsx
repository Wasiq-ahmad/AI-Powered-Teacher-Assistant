import React, { createContext, useContext, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'

type AuthState = {
  token: string | null
  setToken: (t: string | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

const TOKEN_KEY = 'teacher_assistant_token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))

  const setToken = (t: string | null) => {
    setTokenState(t)
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  }

  const value = useMemo<AuthState>(
    () => ({
      token,
      setToken,
      async login(email, password) {
        const res = await apiFetch<{ access_token: string; token_type: string }>('/auth/token', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        setToken(res.access_token)
      },
      async register(name, email, password) {
        await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        })
        // Preserve user flow: after register, user still needs to login
      },
      logout() {
        setToken(null)
      },
    }),
    [token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

