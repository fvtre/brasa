import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Brasa — Arma tu evento en Chile',
    short_name: 'Brasa',
    description:
      'El marketplace chileno para encontrar y reservar servicios para eventos.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fdfaf6',
    theme_color: '#f4510b',
    lang: 'es-CL',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/brasa-meta-icon-1024.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
