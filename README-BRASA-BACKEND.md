# Brasa v5 — Backend Supabase + Auth por roles

Backend base para Marketplace de Eventos con tres roles:

- `cliente`
- `prestador`
- `administrador`

## Si ya ejecutaste 001_brasa_core.sql

Ejecuta **solo** `SUPABASE-FIX-AHORA.sql` en Supabase SQL Editor.

Este parche es necesario especialmente si al crear el proyecto desactivaste **Automatically expose new tables**, porque RLS por sí solo no entrega privilegios Data API. El parche agrega los `GRANT` correctos sin desactivar RLS.

También repara perfiles ya creados y sincroniza `cliente/prestador` desde los metadatos de Supabase Auth.

## Si partes con un proyecto Supabase nuevo

Ejecuta `supabase/migrations/001_brasa_core.sql`. La versión incluida en este ZIP ya trae el hardening de Auth y los grants.

## Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

También se soporta `NEXT_PUBLIC_SUPABASE_ANON_KEY` por compatibilidad.

## Flujo por rol

### Cliente
`/registro` → `/cuenta` → `/cliente/dashboard` → marketplace → `/checkout` → reserva real en Supabase → `/mis-reservas`.

### Prestador
`/registro` seleccionando Prestador → `/cuenta` → `/prestador/dashboard` → si no tiene perfil profesional, `/prestador/onboarding` → servicios → disponibilidad → solicitudes → aceptar/rechazar.

### Administrador
Registra una cuenta y cambia su rol una vez desde SQL:

```sql
update public.profiles set role='administrador' where email='TU_CORREO';
```

Luego `/cuenta` → `/admin/dashboard`.

## Diagnóstico Auth

Con sesión iniciada abre `/api/auth/me`.

Debe mostrar `authenticated: true` y el perfil con su rol.
