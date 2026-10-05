# Evidencia de seguridad y privacidad de Brasa

Última actualización: 5 de octubre de 2026.

Este directorio reúne evidencia inicial para el sistema de gestión de seguridad de
la información y el programa de privacidad de Brasa. No representa una certificación
ISO/IEC 27001 ni una declaración de cumplimiento legal definitivo.

## Documentos disponibles

- `security-readiness.md`: alcance, controles y evidencia requerida por versión.
- `risk-register.md`: riesgos, responsables y tratamiento previsto.
- `incident-response.md`: detección, contención, comunicación y recuperación.
- `data-retention.md`: criterios de conservación, anonimización y eliminación.

## Estado técnico verificado

- Aplicación compilada con verificación TypeScript activa.
- Dependencias de producción sin vulnerabilidades conocidas en `npm audit`.
- Encabezados HTTP defensivos configurados.
- Funciones internas de base de datos sin ejecución pública directa.
- Acceso a datos protegido mediante roles y Row Level Security de Supabase.
- Políticas públicas de privacidad, derechos y seguridad disponibles en la aplicación.

## Pendientes antes de declarar conformidad

- Aprobar formalmente responsables, alcance, inventario de activos y matriz de riesgos.
- Implementar MFA para administradores y revisión periódica de accesos.
- Ejecutar pruebas documentadas de restauración y respuesta a incidentes.
- Validar contratos y transferencias internacionales con cada proveedor.
- Definir y automatizar los plazos finales de retención por obligación legal.
- Realizar análisis de brechas y auditoría independiente para una certificación ISO.
