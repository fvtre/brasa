# 🔥 Brasa — Marketplace de servicios para eventos

> Proyecto APT · Analista Programador · **Grupo 3**

[![Aplicación](https://img.shields.io/badge/Aplicación-brasa--eventos.vercel.app-F4510B?style=for-the-badge)](https://brasa-eventos.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Estado](https://img.shields.io/badge/Estado-En%20desarrollo-2563EB?style=for-the-badge)](#estado-del-proyecto)

Brasa es una plataforma web y móvil que conecta clientes con prestadores de servicios para eventos en Chile. Centraliza la búsqueda, comparación, reserva, pago, coordinación y seguimiento de servicios, entregando trazabilidad para clientes, prestadores y administradores.

## Equipo

| Integrante | Rol colaborativo |
|---|---|
| **Adriano Lecaros** | Desarrollo, arquitectura e integración |
| **Felipe Molina** | Análisis, documentación y validación |
| **Bernardita Rivas** | Experiencia de usuario, documentación y pruebas |

**Grupo:** 3

**Asignatura:** APT122 — Proyecto de Título

## Propuesta de valor

- Búsqueda y comparación de prestadores en un solo lugar.
- Planificación y reserva de servicios para eventos.
- Pago seguro mediante Webpay con anticipo y saldo programado.
- Agenda y disponibilidad para cada prestador.
- Mensajería habilitada después de confirmar el pago.
- Notificaciones web, push y correo para hitos importantes.
- Panel administrativo para resolver incidencias y auditar operaciones.

## Flujo principal

```text
Cliente planifica → Prestador acepta → Cliente paga anticipo (30%)
        ↓                                      ↓
  Agenda reservada ← Notificaciones → Saldo pendiente (70%)
        ↓                                      ↓
 Evento realizado → Liquidación al prestador → Cierre auditable
```

## Seguridad y privacidad

Brasa incorpora controles alineados con buenas prácticas de ISO/IEC 27001:2022 y la preparación para la Ley chilena 21.719:

- autorización por roles y Row Level Security;
- MFA obligatorio para prestadores y administradores;
- MFA voluntario para clientes;
- bitácora de acciones administrativas sensibles;
- secretos fuera del repositorio;
- minimización y políticas de protección de datos;
- verificación automática de tipos, compilación y dependencias.

> Esta preparación no constituye una certificación ISO ni un dictamen jurídico.

## Arquitectura tecnológica

| Capa | Tecnología |
|---|---|
| Aplicación | Next.js, React y TypeScript |
| Estilos | Tailwind CSS |
| Datos y autenticación | Supabase y PostgreSQL |
| Pagos | Transbank Webpay Plus |
| Correos | Resend |
| Notificaciones | Web Push y Service Worker |
| Despliegue | Vercel |
| Aplicación Android | Trusted Web Activity (TWA) |

## Evidencias académicas

La documentación se organiza según la estructura obligatoria de evaluación:

```text
FASE 1/
├── Evidencias Grupales/
├── Evidencias Individuales/
└── Evidencias Proyecto/
FASE 2/
├── Evidencias Grupales/
├── Evidencias Individuales/
└── Evidencias Proyecto/
FASE 3/
├── Evidencias Grupales/
├── Evidencias Individuales/
└── Evidencias Proyecto/
```

| Fase | Estado documental |
|---|---|
| [FASE 1](./FASE%201/) | Entregables incorporados |
| [FASE 2](./FASE%202/) | Entregables incorporados |
| [FASE 3](./FASE%203/) | Estructura creada; documentos pendientes de completar |

## Ejecución local

Requisitos: Node.js compatible con el proyecto y variables de entorno autorizadas.

```bash
npm install
npm run dev
```

Verificaciones antes de integrar cambios:

```bash
npm run typecheck
npm run build
npm audit --omit=dev --audit-level=high
```

## Estado del proyecto

El sistema se encuentra en desarrollo avanzado. El flujo principal de autenticación, reserva, aceptación, pagos por etapas, mensajería, notificaciones y administración está implementado. La documentación de Fase 3 se completará con las plantillas e instrucciones oficiales de la evaluación.

---

© 2026 Grupo 3 · Proyecto Brasa
