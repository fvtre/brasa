# MFA y auditoría administrativa

Fecha de control: 3 de noviembre de 2026.

Brasa exige un segundo factor TOTP a las cuentas con rol `administrador` y `prestador`. El acceso a funciones administrativas, agenda, servicios, mensajería operativa, datos bancarios y liquidaciones requiere sesión autenticada, rol autorizado y nivel AAL2. Para clientes el enrolamiento es voluntario y se recomienda como protección adicional. El enrolamiento y desafío se realizan en `/seguridad/mfa` mediante una aplicación autenticadora.

Las acciones sensibles quedan registradas en `security_audit_events`: cambios administrativos de reservas, pago de liquidaciones y verificación de cuentas bancarias. La tabla utiliza RLS, permite lectura e inserción solo a administradores autenticados y no concede actualización ni eliminación. No almacena contraseñas, códigos TOTP, tokens ni direcciones IP.

Controles operativos:

- revisión trimestral de cuentas administradoras y factores activos;
- revisión mensual de eventos anómalos o fallidos;
- revocación inmediata del acceso al terminar una relación laboral;
- conservación de evidencia conforme a la política de retención;
- registro de excepciones y cambios en la matriz de cambios.

Estos controles apoyan la preparación para ISO/IEC 27001:2022 y Ley 21.719, pero no constituyen por sí solos certificación ni dictamen legal.
