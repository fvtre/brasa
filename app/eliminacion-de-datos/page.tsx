import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Derechos sobre tus datos | Brasa',
  description: 'Solicita acceso, rectificación, portabilidad o eliminación de datos personales en Brasa.',
}

const contactEmail = 'privacidad@brasa.reparotufuga.cl'

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold text-primary">Privacidad</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Gestiona tus datos personales</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        Puedes solicitar acceso, rectificación, portabilidad, oposición, bloqueo o eliminación de
        los datos asociados a tu cuenta, incluso si ingresaste mediante Google o Facebook.
      </p>

      <div className="mt-8 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-bold">Cómo presentar una solicitud</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
          <li>Escribe desde el correo asociado a tu cuenta a{' '}
            <a className="font-medium text-primary hover:underline" href={`mailto:${contactEmail}?subject=Solicitud%20de%20derechos%20de%20datos%20Brasa`}>
              {contactEmail}
            </a>.
          </li>
          <li>Indica el derecho que deseas ejercer y si tu cuenta es de cliente o prestador.</li>
          <li>No envíes contraseñas, códigos bancarios ni fotografías de tarjetas.</li>
          <li>Brasa confirmará la recepción y podrá solicitar una verificación razonable de identidad.</li>
          <li>Recibirás una respuesta y, cuando corresponda, evidencia de la acción realizada.</li>
        </ol>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border p-5">
          <h2 className="font-bold">Eliminación</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Eliminaremos o anonimizaremos los datos que ya no sean necesarios. Ciertos antecedentes
            de pagos, reservas, fraude o reclamos pueden conservarse por obligación legal.
          </p>
        </div>
        <div className="rounded-2xl border p-5">
          <h2 className="font-bold">Portabilidad</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Cuando corresponda, entregaremos los datos proporcionados directamente por ti en un
            formato estructurado y de uso común.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 text-sm leading-6 text-muted-foreground">
        Revocar el acceso desde Google o Facebook desconecta ese proveedor, pero no elimina por sí
        solo la cuenta almacenada en Brasa. Para eliminarla debes presentar la solicitud anterior.
      </div>
    </main>
  )
}
