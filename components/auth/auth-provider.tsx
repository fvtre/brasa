'use client'

import * as React from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { AppRole } from '@/lib/auth'

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  role: AppRole
  avatar_url: string | null
  comuna: string | null
  active?: boolean
}

type AuthValue = {
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )

  const supabase = React.useMemo(() => (configured ? createClient() : null), [configured])
  const [user, setUser] = React.useState<User | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    if (!supabase) {
      setUser(null)
      setProfile(null)
      setLoading(false)
      return
    }

    const {
      data: { user: current },
    } = await supabase.auth.getUser()

    setUser(current)

    if (!current) {
      setProfile(null)
      setLoading(false)
      return
    }

    await supabase.rpc('ensure_my_profile')

    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,email,phone,role,avatar_url,comuna,active')
      .eq('id', current.id)
      .maybeSingle()

    if (error) console.error('AuthProvider profiles:', error.message)
    setProfile((data as Profile | null) ?? null)
    setLoading(false)
  }, [supabase])

  React.useEffect(() => {
    load()
    if (!supabase) return

    const { data } = supabase.auth.onAuthStateChange(() => {
      // Evita hacer llamadas pesadas dentro del callback interno de Supabase.
      window.setTimeout(() => void load(), 0)
    })

    return () => data.subscription.unsubscribe()
  }, [load, supabase])

  const signOut = React.useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    window.location.assign('/')
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile: load, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = React.useContext(AuthContext)
  if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return value
}
