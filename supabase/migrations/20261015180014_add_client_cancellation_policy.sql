-- Estado explícito para pagos que fueron devueltos solo en parte.
-- Se mantiene separado de la migración que lo utiliza porque PostgreSQL no
-- permite usar de forma segura un valor enum nuevo dentro de la misma transacción.
alter type public.payment_status
  add value if not exists 'parcialmente_reembolsado' after 'pagado';
