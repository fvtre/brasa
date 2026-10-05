# Inventario y retención de datos

| Categoría | Finalidad | Sistema | Acceso | Criterio de conservación |
|---|---|---|---|---|
| Perfil y contacto | Cuenta y comunicación | Supabase Auth/DB | Titular, soporte autorizado | Mientras la cuenta esté activa y obligaciones posteriores aplicables |
| Dirección y datos del evento | Ejecutar reserva | Supabase DB | Cliente, prestador participante, admin | Hasta cerrar operación, reclamos y obligaciones legales |
| Servicios y agenda | Operación del prestador | Supabase DB | Prestador, clientes según publicación, admin | Mientras esté publicado o sea necesario para reservas históricas |
| Pagos y comprobantes | Pago, conciliación y auditoría | Supabase/Transbank | Participantes según rol, finanzas | Plazo legal, contable, tributario y antifraude aplicable |
| Cuenta de liquidación | Transferir al prestador | Supabase DB | Prestador y admin autorizado | Mientras exista relación y liquidaciones pendientes |
| Mensajes | Coordinar servicio y resolver disputas | Supabase DB | Participantes y admin autorizado | Mientras sea necesario para servicio, seguridad o reclamos |
| Push y correo | Avisos transaccionales | Supabase/Resend | Sistema y titular | Hasta entregar, vencer o resolver el evento relacionado |
| Logs técnicos | Seguridad y diagnóstico | Supabase/Vercel/GitHub | Personal autorizado | Ventana mínima necesaria según capacidad del proveedor |

## Eliminación

La eliminación debe considerar Supabase Auth, tablas de perfil, Storage, suscripciones
push y datos derivados. Las reservas o pagos que deban conservarse se anonimizarán cuando
sea compatible con su finalidad y obligación legal. Cada solicitud debe dejar evidencia
de recepción, verificación, decisión y ejecución.
