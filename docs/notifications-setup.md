# Correos y notificaciones de Brasa

Brasa mantiene tres canales para los eventos importantes:

1. Notificación interna persistente en Supabase.
2. Web Push gratuito mediante VAPID.
3. Correo transaccional mediante Resend como respaldo.

## Variables de Vercel

Configura estas variables en Production, Preview y Development:

```text
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Brasa <notificaciones@brasa.reparotufuga.cl>
RESEND_TEMPLATE_ID=f821d971-0c25-4231-bb0d-bfedc2150cae
NEXT_PUBLIC_SITE_URL=https://brasa-eventos.vercel.app
CRON_SECRET=una-cadena-aleatoria-larga
```

`RESEND_FROM_EMAIL` debe usar un dominio validado en Resend. Las claves VAPID
existentes (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`) se mantienen.

Se recomienda crear una clave API exclusiva llamada `Brasa Production`, aunque
esté dentro de la misma cuenta de Resend usada por Reparo tu Fuga. Así una
rotación o incidente en una aplicación no afecta a la otra.

La plantilla se mantiene en `emails/brasa-notification.html`. Para actualizarla
y publicar una nueva versión en Resend ejecuta `npm run email:sync-template`.
Para enviar una prueba desde el proyecto local ejecuta
`npm run email:test -- tu-correo@ejemplo.com`.

## Comportamiento

- El pago no se revierte si falla un canal de aviso.
- Los correos de confirmación se envían al cliente y a cada prestador incluido.
- Una solicitud nueva avisa al prestador; aceptar, rechazar, cancelar o expirar
  avisa a las partes correspondientes por notificación interna, push y correo.
- El pago genera un comprobante detallado para el cliente y cada prestador. El
  prestador ve solo sus servicios y el monto neto después de la comisión.
- La clave de idempotencia evita duplicados cuando Webpay repite el callback.
- Los errores temporales de correo y push se reintentan hasta tres veces.
- GitHub Actions ejecuta `/api/cron/notifications` cada cinco minutos para
  despachar eventos creados por la base de datos, incluidas las solicitudes
  expiradas. Agrega el secreto `BRASA_CRON_SECRET` al repositorio con el mismo
  valor de `CRON_SECRET` configurado en Vercel.
- Si el usuario bloquea el push o iOS suspende la aplicación, la notificación
  interna y el correo siguen disponibles.
