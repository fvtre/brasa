import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json(
      { authenticated: false, userError: userError?.message || null },
      { status: 401 }
    )
  }

  const { error: ensureError } = await supabase.rpc('ensure_my_profile')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,full_name,email,phone,role,active')
    .eq('id', user.id)
    .maybeSingle()

  return NextResponse.json({
    authenticated: true,
    user: { id: user.id, email: user.email, metadata: user.user_metadata },
    profile,
    ensureError: ensureError?.message || null,
    profileError: profileError?.message || null,
  })
}
