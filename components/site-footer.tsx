import Link from "next/link"
import { Flame } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Flame size={18} />
            </span>
            <span className="text-lg font-bold tracking-tight">Brasa</span>
          </Link>
          <p className="text-sm text-muted-foreground text-pretty">
            El marketplace chileno para armar tu evento completo, desde el asado hasta la última foto.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Explorar</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/categorias" className="hover:text-foreground">Categorías</Link></li>
            <li><Link href="/proveedores" className="hover:text-foreground">Proveedores</Link></li>
            <li><Link href="/planificar" className="hover:text-foreground">Planificar evento</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Servicios</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/categorias/parrilleros" className="hover:text-foreground">Parrilleros</Link></li>
            <li><Link href="/categorias/bartenders" className="hover:text-foreground">Bartenders</Link></li>
            <li><Link href="/categorias/catering" className="hover:text-foreground">Catering</Link></li>
            <li><Link href="/categorias/parrilleros-veganos" className="hover:text-foreground">Parrilleros</Link></li>

            
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold">Brasa</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/privacidad" className="hover:text-foreground">Política de privacidad</Link></li>
            <li><Link href="/eliminacion-de-datos" className="hover:text-foreground">Eliminación de datos</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Brasa. Todos los derechos reservados.
      </div>
    </footer>
  )
}
