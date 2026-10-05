import type { Metadata } from 'next'
import Link from 'next/link'
import { Database, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Seguridad y confianza | Brasa',
  description: 'Medidas de seguridad y privacidad implementadas por Brasa.',
}

const controls = [
  {
    icon: KeyRound,
    title: 'Acceso protegido',
    text: 'Autenticación administrada, inicio de sesión social y permisos separados para clientes, prestadores y administración.',
  },
  {
    icon: Database,
    title: 'Datos aislados por rol',
    text: 'Las políticas de seguridad de la base de datos limitan qué información puede consultar o modificar cada cuenta.',
  },
  {
    icon: LockKeyhole,
    title: 'Pagos del lado servidor',
    text: 'Las confirmaciones de Webpay se validan en el servidor. Brasa no almacena el número completo de tu tarjeta.',
  },
  {
    icon: ShieldCheck,
    title: 'Mejora continua',
    text: 'Revisamos dependencias, permisos, riesgos e incidentes y mantenemos migraciones y evidencia por versión.',
  },
]

export default function SecurityPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-primary">Seguridad y confianza</p>
        <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
          Tus eventos y datos merecen protección desde el diseño
        </h1>
        <p className="mt-4 text-pretty leading-7 text-muted-foreground">
          Brasa mantiene un programa de seguridad y privacidad inspirado en ISO/IEC 27001:2022
          y preparado para los requisitos de la Ley 21.719. Esto no constituye una certificación;
          refleja controles implementados y un proceso de mejora continua.
        </p>
      </div>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {controls.map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-2xl border bg-card p-5 shadow-sm">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6">
        <h2 className="text-lg font-bold">Transparencia y derechos</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Puedes conocer cómo tratamos tus datos, solicitar acceso, rectificación, portabilidad,
          bloqueo o eliminación, y reportar una inquietud de seguridad o privacidad.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/privacidad" className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
            Ver política de privacidad
          </Link>
          <Link href="/eliminacion-de-datos" className="rounded-lg border bg-background px-4 py-2">
            Ejercer mis derechos
          </Link>
        </div>
      </section>
    </main>
  )
}
