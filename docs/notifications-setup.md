# Correos y notificaciones de Brasa

Brasa mantiene tres canales para los eventos importantes:

1. Notificación interna persistente en Supabase.
2. Web Push gratuito mediante VAPID.
3. Correo transaccional mediante Resend como respaldo.

## Variables de Vercel

Configura estas variables en Production, Preview y Development:

```text
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Brasa <reservas@tu-dominio.cl>
NEXT_PUBLIC_SITE_URL=https://tu-dominio.cl
```

`RESEND_FROM_EMAIL` debe usar un dominio validado en Resend. Las claves VAPID
existentes (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`) se mantienen.

## Comportamiento

- El pago no se revierte si falla un canal de aviso.
- Los correos de confirmación se envían al cliente y a cada prestador incluido.
- La clave de idempotencia evita duplicados cuando Webpay repite el callback.
- Los errores temporales de correo y push se reintentan hasta tres veces.
- Si el usuario bloquea el push o iOS suspende la aplicación, la notificación
  interna y el correo siguen disponibles.
