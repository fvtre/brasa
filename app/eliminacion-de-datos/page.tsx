import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Eliminación de datos | Brasa',
  description: 'Instrucciones para solicitar la eliminación de una cuenta y sus datos en Brasa.',
}

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm font-semibold text-primary">Privacidad</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Eliminación de datos de usuario</h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        Puedes solicitar la eliminación de tu cuenta de Brasa y de los datos personales asociados,
        incluso si te registraste mediante Facebook o Google.
      </p>

      <div className="mt-8 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-bold">Cómo solicitarla</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
          <li>
            Escribe desde el correo asociado a tu cuenta a{' '}
            <a className="font-medium text-primary hover:underline" href="mailto:adrianoduque3@gmail.com?subject=Solicitud%20de%20eliminación%20de%20cuenta%20Brasa">
              adrianoduque3@gmail.com
            </a>.
          </li>
          <li>Usa como asunto “Solicitud de eliminación de cuenta Brasa”.</li>
          <li>Indica si tu cuenta corresponde a cliente o prestador y solicita expresamente su eliminación.</li>
          <li>Brasa podrá pedir una verificación razonable para evitar que otra persona elimine tu cuenta.</li>
        </ol>
      </div>

      <div className="mt-6 space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          Una vez verificada la solicitud se eliminará o anonimizará la información que no sea
          necesario conservar. Los datos relacionados con reservas, pagos, reclamos u obligaciones
          legales pueden mantenerse durante el plazo exigido o razonablemente necesario.
        </p>
        <p>
          También puedes retirar el acceso de Facebook desde la configuración de aplicaciones y
          sitios web de tu cuenta de Facebook. Esto revoca la conexión con Facebook, pero para
          eliminar además la cuenta almacenada en Brasa debes seguir los pasos anteriores.
        </p>
      </div>
    </div>
  )
}
