# Brasa v5 · Auth + Roles corregidos

Esta versión corrige el problema donde Supabase creaba usuarios pero Brasa volvía al login o un prestador quedaba como `cliente`.

## 1. IMPORTANTE: tu proyecto Supabase YA existe

No vuelvas a ejecutar `001_brasa_core.sql` sobre la base que ya tiene las tablas.

En Supabase abre:

**SQL Editor → New query**

Copia TODO el archivo:

`SUPABASE-FIX-AHORA.sql`

y presiona **Run**.

Debe terminar sin errores. Este parche:

- agrega los GRANT faltantes para Data API;
- conserva RLS;
- repara perfiles existentes;
- corrige cuentas creadas como Prestador que hayan quedado como Cliente;
- crea `ensure_my_profile()` para autocorregir perfiles al iniciar sesión;
- nunca permite autoasignarse Administrador.

## 2. Variables de entorno

En `.env.local` usa:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
```

También se mantiene compatibilidad con:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

No necesitas poner ambas.

Después de cambiar `.env.local`, reinicia Next.

## 3. Instalar y ejecutar

```powershell
npm install
npm run dev
```

## 4. Prueba de Auth

1. Abre `/registro`.
2. Crea un Cliente.
3. Cierra sesión.
4. Crea un Prestador.
5. El Prestador debe ir a `/prestador/onboarding`.
6. Crea su perfil profesional y un servicio.
7. El Cliente debe entrar a `/cliente/dashboard`.

El login fuerza una recarga completa después de autenticarse para que los Server Components reciban las cookies de Supabase.

## 5. Crear el primer Administrador

Registra primero una cuenta normal y luego ejecuta UNA vez en SQL Editor:

```sql
update public.profiles
set role = 'administrador'
where email = 'TU_CORREO';
```

Al volver a entrar, `/cuenta` lo redirige a `/admin/dashboard`.

## 6. Verificación rápida de sesión

Con una sesión iniciada abre:

`http://localhost:3000/api/auth/me`

Debe responder algo como:

```json
{
  "authenticated": true,
  "profile": {
    "role": "cliente"
  }
}
```

Para un prestador debe indicar `"role": "prestador"`.

## 7. Flujo real disponible

### Cliente

Registro/login → Dashboard Cliente → Marketplace → elegir servicios → Checkout → reserva Supabase → Mis reservas → Mensajes/Notificaciones.

### Prestador

Registro como Prestador → Onboarding → Dashboard Prestador → crear servicios → disponibilidad → recibir solicitudes → aceptar/rechazar.

### Administrador

Login Admin → Dashboard Admin → Usuarios → Prestadores → verificar/destacar/desactivar prestadores → métricas generales.

## 8. Nota sobre confirmación por correo

Para desarrollo rápido puedes desactivar temporalmente la confirmación de email en Supabase Auth. Si la mantienes activada, Brasa incluye `/auth/callback` para completar la sesión al confirmar el correo.
