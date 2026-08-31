import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de privacidad | Brasa',
  description: 'Información sobre el tratamiento de datos personales en Brasa.',
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold text-primary">Brasa</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Política de privacidad</h1>
      <p className="mt-3 text-sm text-muted-foreground">Última actualización: 31 de agosto de 2026</p>

      <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-lg font-bold text-foreground">1. Información que recopilamos</h2>
          <p className="mt-2">
            Brasa puede recopilar datos de identificación y contacto, información del perfil,
            datos necesarios para organizar y prestar servicios de eventos, antecedentes de
            reservas y pagos, comunicaciones con la plataforma e información técnica básica
            necesaria para seguridad y funcionamiento.
          </p>
          <p className="mt-2">
            Si utilizas Google o Facebook para ingresar, recibimos únicamente la información
            autorizada por ti y necesaria para crear o identificar tu cuenta, como nombre,
            correo electrónico, identificador del proveedor y fotografía de perfil cuando esté
            disponible.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">2. Cómo usamos la información</h2>
          <p className="mt-2">
            Usamos estos datos para administrar cuentas, conectar clientes con prestadores,
            procesar solicitudes y reservas, facilitar pagos, prevenir fraude, prestar soporte,
            mejorar Brasa y cumplir obligaciones legales. No vendemos datos personales.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">3. Proveedores y comunicación de datos</h2>
          <p className="mt-2">
            Podemos utilizar proveedores de infraestructura, autenticación, almacenamiento,
            pagos, analítica y soporte que tratan información solo para prestar sus servicios.
            También compartimos los datos necesarios entre clientes y prestadores cuando existe
            una solicitud o reserva, por ejemplo los datos del evento y de contacto.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">4. Conservación y seguridad</h2>
          <p className="mt-2">
            Conservamos la información mientras la cuenta esté activa y durante el plazo
            necesario para atender reservas, reclamos, prevención de fraude y obligaciones
            contables o legales. Aplicamos medidas razonables para proteger la información,
            aunque ningún sistema conectado a internet ofrece seguridad absoluta.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">5. Tus derechos y eliminación</h2>
          <p className="mt-2">
            Puedes solicitar acceso, corrección o eliminación de tus datos. Las instrucciones
            para eliminar una cuenta están disponibles en la página de eliminación de datos.
            Cierta información puede conservarse cuando sea necesaria para cumplir obligaciones
            legales o resolver operaciones pendientes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">6. Contacto</h2>
          <p className="mt-2">
            Para consultas sobre privacidad, escribe a{' '}
            <a className="font-medium text-primary hover:underline" href="mailto:adrianoduque3@gmail.com">
              adrianoduque3@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
