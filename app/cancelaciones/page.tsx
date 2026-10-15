import Link from 'next/link'
import { ArrowLeft, CalendarClock, CircleCheck, ShieldCheck } from 'lucide-react'

export const metadata = { title: 'Cancelaciones y devoluciones | Brasa' }

const rules = [
  ['Más de 7 días', '100% de devolución', 'Sin compensación'],
  ['Entre 72 horas y 7 días', '80% de devolución', '20% para el prestador'],
  ['Entre 24 y 72 horas', '50% de devolución', '50% para el prestador'],
  ['Menos de 24 horas', 'Sin devolución', '90% para el prestador y 10% para Brasa'],
]

export default function CancellationPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" /> Volver a Brasa
      </Link>
      <p className="mt-8 text-sm font-semibold text-primary">Condiciones de contratación</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Cancelaciones y devoluciones</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        La devolución depende del tiempo restante para el inicio del evento. Antes de confirmar una cancelación, Brasa siempre muestra el monto exacto que recibirá cada parte.
      </p>

      <section className="mt-8 overflow-hidden rounded-2xl border bg-card">
        {rules.map(([time, refund, compensation]) => (
          <div key={time} className="grid gap-2 border-b p-5 last:border-b-0 sm:grid-cols-3 sm:items-center">
            <div className="flex items-center gap-2 font-bold"><CalendarClock className="size-4 text-primary" />{time}</div>
            <div><span className="text-xs text-muted-foreground sm:block">Cliente</span>{refund}</div>
            <div><span className="text-xs text-muted-foreground sm:block">Reserva de agenda</span>{compensation}</div>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border bg-card p-5">
          <CircleCheck className="size-6 text-emerald-600" />
          <h2 className="mt-3 font-bold">Si cancela el prestador</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">El cliente recibe el 100% de lo pagado. Brasa puede aplicar medidas al prestador y ayudar a buscar una alternativa.</p>
        </article>
        <article className="rounded-2xl border bg-card p-5">
          <ShieldCheck className="size-6 text-primary" />
          <h2 className="mt-3 font-bold">Casos excepcionales</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Emergencias, condiciones peligrosas o incumplimientos pueden ser revisados por administración. Los derechos legales del consumidor siempre prevalecen.</p>
        </article>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        La devolución se solicita al mismo medio de pago utilizado. El tiempo de abono final depende de Webpay, el emisor de la tarjeta y el banco del cliente.
      </p>
    </main>
  )
}
