import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de privacidad | Brasa',
  description: 'Cómo Brasa recopila, utiliza, protege y elimina datos personales.',
}

const contactEmail = 'privacidad@brasa.cl'

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold text-primary">Privacidad y protección de datos</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Política de privacidad de Brasa</h1>
      <p className="mt-3 text-sm text-muted-foreground">Versión 2.0 · Última actualización: 5 de octubre de 2026</p>

      <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-6">
        Brasa trata únicamente los datos necesarios para conectar clientes y prestadores,
        gestionar reservas, pagos, comunicaciones y seguridad. No vendemos datos personales.
      </div>

      <div className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-lg font-bold text-foreground">1. Responsable y contacto</h2>
          <p className="mt-2">
            Brasa es responsable del tratamiento realizado dentro de la plataforma. Para consultas,
            ejercicio de derechos o reportes de privacidad puedes escribir a{' '}
            <a className="font-medium text-primary hover:underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">2. Datos que tratamos</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Identificación y contacto: nombre, correo, teléfono, fotografía y comuna.</li>
            <li>Datos de clientes: dirección del evento, fecha, invitados, presupuesto y solicitudes.</li>
            <li>Datos de prestadores: perfil comercial, servicios, cobertura, agenda y cuenta para liquidaciones.</li>
            <li>Datos operacionales: reservas, pagos, comprobantes, mensajes, notificaciones y soporte.</li>
            <li>Datos técnicos: sesión, dispositivo, registros de seguridad y datos necesarios para prevenir fraude.</li>
          </ul>
          <p className="mt-2">Brasa no almacena números completos de tarjetas; el pago es procesado por Webpay/Transbank.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">3. Finalidades y fundamento</h2>
          <p className="mt-2">
            Utilizamos la información para crear y proteger cuentas, ejecutar reservas y pagos,
            conectar a las partes, habilitar mensajería, liquidar a prestadores, prevenir fraude,
            responder solicitudes y cumplir obligaciones legales. El tratamiento se basa, según
            corresponda, en la ejecución del servicio solicitado, el consentimiento, obligaciones
            legales y el interés legítimo de mantener la plataforma segura.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">4. Destinatarios y servicios externos</h2>
          <p className="mt-2">
            Compartimos solo los datos necesarios entre cliente y prestador cuando existe una reserva.
            También utilizamos proveedores de infraestructura, autenticación, alojamiento, correo,
            notificaciones, analítica y pagos, incluyendo Supabase, Vercel, Resend, Google, Meta y
            Transbank. Algunos pueden tratar datos fuera de Chile bajo sus términos y medidas contractuales.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">5. Conservación</h2>
          <p className="mt-2">
            Conservamos los datos de cuenta mientras permanezca activa. Reservas, pagos, liquidaciones
            y comprobantes se mantienen durante el plazo necesario para cumplir obligaciones legales,
            contables, tributarias, prevenir fraude y atender reclamos. Mensajes y registros técnicos
            se conservan solo mientras sean necesarios para la operación, seguridad o resolución de
            controversias. Cumplido el propósito, los datos se eliminan o anonimizan de forma segura.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">6. Tus derechos</h2>
          <p className="mt-2">
            Puedes solicitar información y acceso a tus datos, rectificación, supresión, oposición,
            bloqueo y portabilidad cuando corresponda. También puedes retirar un consentimiento sin
            afectar tratamientos previos lícitos. Verificaremos razonablemente tu identidad antes de responder.
          </p>
          <Link className="mt-3 inline-flex font-semibold text-primary hover:underline" href="/eliminacion-de-datos">
            Solicitar acceso, portabilidad o eliminación →
          </Link>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">7. Seguridad e incidentes</h2>
          <p className="mt-2">
            Aplicamos control de acceso por roles, cifrado en tránsito, aislamiento de información,
            registro de eventos, copias de seguridad administradas y revisión de vulnerabilidades.
            Si ocurre un incidente que pueda afectar tus derechos, aplicaremos el procedimiento de
            contención, evaluación y comunicación exigido por la normativa aplicable.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">8. Cambios a esta política</h2>
          <p className="mt-2">
            Publicaremos la versión vigente y su fecha. Cuando un cambio sea sustancial, lo comunicaremos
            dentro de Brasa o por los datos de contacto registrados.
          </p>
        </section>
      </div>
    </main>
  )
}
