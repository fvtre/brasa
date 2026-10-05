# Registro inicial de riesgos de Brasa

Escala: probabilidad e impacto de 1 a 5. Riesgo = probabilidad × impacto.

| ID | Riesgo | P | I | Nivel | Tratamiento | Evidencia esperada |
|---|---|---:|---:|---:|---|---|
| R-01 | Exposición de secretos o credenciales | 3 | 5 | 15 | Secretos por entorno, rotación y prohibición de publicarlos | Inventario y fecha de rotación |
| R-02 | Acceso a reservas de otro usuario | 2 | 5 | 10 | RLS, pruebas cliente/prestador/admin y revisión de RPC | Políticas y pruebas negativas |
| R-03 | Dependencia vulnerable | 3 | 4 | 12 | Auditoría por release y actualización priorizada | Reporte `npm audit` |
| R-04 | Función privilegiada invocable indebidamente | 3 | 5 | 15 | Revocar ejecución y justificar cada `SECURITY DEFINER` | Supabase Security Advisor |
| R-05 | Pago confirmado o repetido incorrectamente | 2 | 5 | 10 | Confirmación servidor-servidor, monto validado e idempotencia | Registro de Webpay y pago |
| R-06 | Pérdida o corrupción de datos | 2 | 5 | 10 | Backups administrados y prueba de restauración | Acta de prueba semestral |
| R-07 | Incidente sin respuesta o comunicación | 3 | 4 | 12 | Procedimiento, responsables y bitácora | Ticket/acta de simulacro |
| R-08 | Conservación excesiva de datos | 3 | 4 | 12 | Tabla de retención, anonimización y revisión anual | Registro de eliminación |
| R-09 | Proveedor externo indisponible | 3 | 3 | 9 | Reintentos, canales alternativos y monitoreo | Logs y prueba de continuidad |
| R-10 | Toma de cuenta administrativa | 2 | 5 | 10 | MFA, acceso individual y revisión trimestral | Reporte de accesos |

Los riesgos 15 o superiores requieren plan y responsable antes del siguiente release.
