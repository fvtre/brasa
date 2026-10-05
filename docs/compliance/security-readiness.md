# Programa de seguridad y privacidad de Brasa

Versión: 1.0

Fecha: 5 de octubre de 2026
Propietario: Equipo Brasa

## Alcance

El programa cubre la aplicación web y APK Brasa, la base de datos y autenticación
en Supabase, el despliegue en Vercel, pagos Webpay/Transbank, correos Resend,
notificaciones push, repositorio y procesos administrativos asociados.

## Objetivos

1. Proteger confidencialidad, integridad y disponibilidad de datos de clientes y prestadores.
2. Reducir fraude, acceso indebido, pérdida de información e interrupciones.
3. Preparar evidencia para ISO/IEC 27001:2022 y Ley chilena 21.719.
4. Incorporar seguridad y privacidad en cambios de producto.

## Controles operativos

- Acceso por roles y mínimo privilegio mediante Supabase RLS.
- Secretos fuera del repositorio y rotación ante exposición.
- HTTPS, encabezados defensivos y OAuth con URL de retorno controlada.
- Pagos confirmados exclusivamente desde el servidor.
- Registro idempotente de pagos, mensajes y notificaciones.
- Revisión de dependencias y asesor de seguridad de Supabase antes de releases.
- Verificación automática de tipos, compilación y dependencias de producción en cada push a `main` y pull request.
- Revisión semanal automatizada de nuevas versiones de dependencias mediante Dependabot.
- Revisión de accesos administrativos trimestral.
- Prueba semestral de restauración y continuidad.
- Registro, clasificación y tratamiento de incidentes.

## Evidencia mínima por release

- Pull request o commit identificable.
- `npm run typecheck` y `npm run build` exitosos.
- Resultado de `npm audit --omit=dev` revisado.
- Resultado de Supabase Security Advisor revisado cuando cambia la base.
- Migración versionada y plan de reversión cuando corresponda.
- Verificación funcional de autenticación, reserva y pago.

## Revisión

Este documento y los riesgos se revisan trimestralmente, después de un incidente
relevante o cuando cambia un proveedor crítico.
