alter type public.booking_status
  add value if not exists 'rechazada' after 'cancelada';

notify pgrst, 'reload schema';
