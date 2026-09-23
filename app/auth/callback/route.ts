import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const { searchParams, origin } = requestUrl
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const appOrigin = process.env.NODE_ENV !== 'development' && forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : origin

  const code = searchParams.get('code')
  const oauthError = searchParams.get('error_description') || searchParams.get('error')
  const requestedNext = searchParams.get('next') || '/cuenta'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/cuenta'
  const requestedRole = searchParams.get('role')
  const role = requestedRole === 'prestador' || requestedRole === 'cliente'
    ? requestedRole
    : null

  if (oauthError) {
    return NextResponse.redirect(
      `${appOrigin}/login?error=${encodeURIComponent(oauthError)}`
    )
  }

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (role) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { role },
        })

        if (metadataError) {
          return NextResponse.redirect(
            `${appOrigin}/login?error=${encodeURIComponent('No se pudo asignar el tipo de cuenta')}`
          )
        }
      }

      const { error: ensureError } = await supabase.rpc('ensure_my_profile')
      if (ensureError) {
        return NextResponse.redirect(
          `${appOrigin}/login?error=${encodeURIComponent('No se pudo preparar tu perfil de Brasa')}`
        )
      }

      // Google no entrega el rol de Brasa. Para iniciar sesión usamos el perfil
      // persistido; el parámetro `role` solo se aplica durante el registro.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError || !profile) {
        return NextResponse.redirect(
          `${appOrigin}/auth/seleccionar-rol?next=${encodeURIComponent(next)}`
        )
      }

      return NextResponse.redirect(`${appOrigin}${next}`)
    }
  }

  return NextResponse.redirect(
    `${appOrigin}/login?error=${encodeURIComponent('No se pudo confirmar la sesión')}`
  )
}
