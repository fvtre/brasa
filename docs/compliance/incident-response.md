# Procedimiento de respuesta a incidentes

## Canal

Reportes internos y externos: `privacidad@brasa.cl`.

## Clasificación

- **Crítico:** exposición de credenciales privilegiadas, datos financieros, acceso masivo o pago alterado.
- **Alto:** acceso no autorizado a datos personales o indisponibilidad prolongada.
- **Medio:** incidente contenido con alcance limitado.
- **Bajo:** evento sin impacto confirmado que requiere seguimiento.

## Flujo

1. Registrar fecha, reportante, sistema, evidencia y alcance inicial.
2. Contener sin destruir evidencia: revocar claves, bloquear sesión o aislar integración.
3. Preservar logs, identificadores y línea de tiempo con acceso restringido.
4. Evaluar datos, titulares, proveedores, causa, impacto y obligaciones de comunicación.
5. Erradicar la causa y restaurar desde una condición conocida.
6. Verificar autenticación, RLS, pagos, mensajes y notificaciones antes de reabrir.
7. Comunicar a afectados y autoridad cuando la normativa lo exija.
8. Documentar causa raíz, acciones, responsable y fecha comprometida.
9. Revisar eficacia y actualizar riesgos dentro de diez días hábiles.

## Regla de secretos expuestos

Una clave mostrada en chat, captura, log, commit o documento se considera comprometida.
Debe reemplazarse en todos los entornos y luego revocarse; ocultarla posteriormente no
elimina el riesgo.
