-- Mantiene los precios calculados en PostgreSQL. La comisión se descuenta
-- al prestador; el cliente paga solo la suma de los servicios.
CREATE OR REPLACE FUNCTION public.create_brasa_booking(p_event_name text, p_event_date date, p_event_time time without time zone, p_comuna text, p_address text, p_guests integer, p_budget integer, p_contact_name text, p_contact_email text, p_contact_phone text, p_notes text, p_items jsonb)
 RETURNS TABLE(id uuid, code text, status booking_status, total integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

DECLARE

  v_user_id uuid;

  v_booking public.bookings%rowtype;

  v_item jsonb;

  v_provider public.service_providers%rowtype;
  v_service public.provider_services%rowtype;

  v_guests integer;
  v_quantity numeric;

  v_base_total integer;

  v_grill_selected boolean;
  v_grill_total integer;

  v_transport_selected boolean;
  v_transport_total integer;

  v_shopping_selected boolean;
  v_shopping_total integer;

  v_full_package boolean;

  v_discount integer;

  v_line_subtotal integer;
  v_line_total integer;

  v_subtotal integer := 0;

  v_platform_fee integer := 0;
  v_total integer := 0;

BEGIN

  -- =======================================================
  -- USUARIO
  -- =======================================================

  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION
      'Debes iniciar sesión para reservar.';
  END IF;


  -- =======================================================
  -- VALIDACIONES GENERALES
  -- =======================================================

  v_guests :=
    GREATEST(
      1,
      COALESCE(
        p_guests,
        1
      )
    );


  IF COALESCE(
    TRIM(p_event_name),
    ''
  ) = '' THEN

    RAISE EXCEPTION
      'Ingresa el nombre del evento.';

  END IF;


  IF p_event_date IS NULL THEN

    RAISE EXCEPTION
      'Selecciona la fecha del evento.';

  END IF;


  IF p_event_time IS NULL THEN

    RAISE EXCEPTION
      'Selecciona la hora del evento.';

  END IF;


  IF p_event_date < CURRENT_DATE THEN

    RAISE EXCEPTION
      'No puedes reservar un evento en una fecha pasada.';

  END IF;


  IF COALESCE(
    TRIM(p_address),
    ''
  ) = '' THEN

    RAISE EXCEPTION
      'Ingresa la dirección del evento.';

  END IF;


  IF
    p_items IS NULL
    OR jsonb_typeof(p_items) <> 'array'
    OR jsonb_array_length(p_items) = 0
  THEN

    RAISE EXCEPTION
      'Debes agregar al menos un servicio.';

  END IF;


  -- =======================================================
  -- CREAR RESERVA
  -- =======================================================

  INSERT INTO public.bookings (

    client_id,

    event_name,
    event_date,
    event_time,

    comuna,
    address,

    guests,
    budget,

    subtotal,
    platform_fee,
    total,

    status,

    contact_name,
    contact_email,
    contact_phone,

    notes

  )
  VALUES (

    v_user_id,

    TRIM(
      p_event_name
    ),

    p_event_date,
    p_event_time,

    NULLIF(
      TRIM(
        COALESCE(
          p_comuna,
          ''
        )
      ),
      ''
    ),

    TRIM(
      p_address
    ),

    v_guests,

    GREATEST(
      0,
      COALESCE(
        p_budget,
        0
      )
    ),

    0,
    0,
    0,

    'esperando_confirmacion',

    TRIM(
      p_contact_name
    ),

    TRIM(
      p_contact_email
    ),

    NULLIF(
      TRIM(
        COALESCE(
          p_contact_phone,
          ''
        )
      ),
      ''
    ),

    NULLIF(
      TRIM(
        COALESCE(
          p_notes,
          ''
        )
      ),
      ''
    )

  )

  RETURNING *
  INTO v_booking;


  -- =======================================================
  -- RECORRER SERVICIOS
  -- =======================================================

  FOR v_item IN

    SELECT value
    FROM jsonb_array_elements(
      p_items
    )

  LOOP

    -- =====================================================
    -- RESET VARIABLES
    -- =====================================================

    v_provider := NULL;
    v_service := NULL;

    v_base_total := 0;

    v_grill_selected := false;
    v_grill_total := 0;

    v_transport_selected := false;
    v_transport_total := 0;

    v_shopping_selected := false;
    v_shopping_total := 0;

    v_full_package := false;

    v_discount := 0;

    v_line_subtotal := 0;
    v_line_total := 0;


    -- =====================================================
    -- PRESTADOR
    -- =====================================================

    SELECT sp.*

    INTO v_provider

    FROM public.service_providers sp

    WHERE
      sp.active = true

      AND (

        sp.slug =
          v_item ->> 'providerSlug'

        OR

        sp.id::text =
          v_item ->> 'providerSlug'

      )

    LIMIT 1;


    IF v_provider.id IS NULL THEN

      RAISE EXCEPTION
        'Prestador no encontrado: %',
        v_item ->> 'providerName';

    END IF;


    -- =====================================================
    -- SERVICIO
    -- =====================================================

    SELECT ps.*

    INTO v_service

    FROM public.provider_services ps

    WHERE
      ps.provider_id =
        v_provider.id

      AND ps.active = true

      AND (

        ps.external_key =
          v_item ->> 'serviceKey'

        OR

        ps.id::text =
          v_item ->> 'serviceKey'

      )

    LIMIT 1;


    IF v_service.id IS NULL THEN

      RAISE EXCEPTION
        'Servicio no encontrado: %',
        v_item ->> 'serviceName';

    END IF;


    -- =====================================================
    -- CAPACIDAD
    -- =====================================================

    IF
      v_service.min_guests IS NOT NULL
      AND
      v_guests < v_service.min_guests
    THEN

      RAISE EXCEPTION
        'El servicio % requiere mínimo % personas.',
        v_service.name,
        v_service.min_guests;

    END IF;


    IF
      v_service.max_guests IS NOT NULL
      AND
      v_guests > v_service.max_guests
    THEN

      RAISE EXCEPTION
        'El servicio % permite máximo % personas.',
        v_service.name,
        v_service.max_guests;

    END IF;


    -- =====================================================
    -- DISPONIBILIDAD REAL
    -- =====================================================
    --
    -- Esta es la validación nueva.
    --
    -- Aunque React haya mostrado el horario como disponible,
    -- Supabase vuelve a comprobarlo justo antes de reservar.
    --
    -- Tiene en cuenta:
    --   * prestador
    --   * servicio
    --   * fecha
    --   * hora
    --   * duración
    --   * reservas existentes
    -- =====================================================

    IF NOT public.is_provider_service_available(
      v_provider.id,
      v_service.id,
      p_event_date,
      p_event_time,
      v_guests
    ) THEN

      RAISE EXCEPTION
        'El prestador % ya no está disponible el % a las %.',
        v_provider.business_name,
        p_event_date,
        p_event_time;

    END IF;


    -- =====================================================
    -- PRECIO BASE SEGÚN FORMA DE COBRO
    -- =====================================================

    CASE LOWER(
      TRIM(
        COALESCE(
          v_service.unit,
          'por evento'
        )
      )
    )

      WHEN 'por persona' THEN

        v_quantity := v_guests;

        v_base_total :=
          ROUND(
            v_service.price * v_quantity
          )::integer;


      WHEN 'por hora' THEN

        -- La cantidad facturable corresponde a la duración real
        -- calculada según el número de invitados.
        v_quantity :=
          public.get_service_duration_hours(
            v_service.id,
            v_guests
          );

        v_base_total :=
          ROUND(
            v_service.price * v_quantity
          )::integer;


      WHEN 'por unidad' THEN

        -- El cliente elige la cantidad, pero el precio unitario
        -- siempre se obtiene desde provider_services.
        v_quantity :=
          FLOOR(
            GREATEST(
              1,
              COALESCE(
                NULLIF(
                  v_item ->> 'quantity',
                  ''
                )::numeric,
                1
              )
            )
          );

        v_base_total :=
          ROUND(
            v_service.price * v_quantity
          )::integer;


      WHEN 'por pack' THEN

        v_quantity := 1;
        v_base_total := v_service.price;


      WHEN 'por evento' THEN

        v_quantity := 1;
        v_base_total := v_service.price;


      ELSE

        -- Fallback seguro para servicios antiguos.
        v_quantity := 1;
        v_base_total := v_service.price;

    END CASE;


    -- =====================================================
    -- EXTRAS SOLICITADOS
    -- =====================================================

    v_grill_selected :=
      COALESCE(
        (
          v_item ->>
          'wantsGrill'
        )::boolean,
        false
      );


    v_transport_selected :=
      COALESCE(
        (
          v_item ->>
          'wantsTransport'
        )::boolean,
        false
      );


    v_shopping_selected :=
      COALESCE(
        (
          v_item ->>
          'wantsShopping'
        )::boolean,
        false
      );


    v_full_package :=
      COALESCE(
        (
          v_item ->>
          'fullPackage'
        )::boolean,
        false
      );


    -- =====================================================
    -- FULL BRASA
    -- Activa automáticamente todos los extras disponibles
    -- =====================================================

    IF
      v_full_package
      AND
      COALESCE(
        v_service.full_package_enabled,
        false
      )
    THEN


      IF
        COALESCE(
          v_service.grill_available,
          false
        )
      THEN

        v_grill_selected :=
          true;

      END IF;


      IF
        COALESCE(
          v_service.transport_available,
          false
        )
      THEN

        v_transport_selected :=
          true;

      END IF;


      IF
        COALESCE(
          v_service.shopping_available,
          false
        )
      THEN

        v_shopping_selected :=
          true;

      END IF;


    ELSE

      v_full_package :=
        false;

    END IF;


    -- =====================================================
    -- PARRILLA
    -- =====================================================

    IF
      v_grill_selected
      AND
      COALESCE(
        v_service.grill_available,
        false
      )
    THEN

      v_grill_total :=
        GREATEST(
          0,
          COALESCE(
            v_service.grill_price,
            0
          )
        );

    ELSE

      v_grill_selected :=
        false;

      v_grill_total :=
        0;

    END IF;


    -- =====================================================
    -- TRASLADO
    -- =====================================================

    IF
      v_transport_selected
      AND
      COALESCE(
        v_service.transport_available,
        false
      )
    THEN

      v_transport_total :=
        GREATEST(
          0,
          COALESCE(
            v_service.transport_price,
            0
          )
        );

    ELSE

      v_transport_selected :=
        false;

      v_transport_total :=
        0;

    END IF;


    -- =====================================================
    -- GESTIÓN DE COMPRAS
    -- =====================================================

    IF
      v_shopping_selected
      AND
      COALESCE(
        v_service.shopping_available,
        false
      )
    THEN

      /*
       * Monto fijo:
       * se cobra ahora.
       *
       * Porcentaje:
       * todavía no tenemos el valor real de los productos,
       * por lo que se calculará posteriormente.
       */

      IF
        v_service.shopping_fee_type =
        'fixed'
      THEN

        v_shopping_total :=
          GREATEST(
            0,
            COALESCE(
              v_service.shopping_fee,
              0
            )::integer
          );

      ELSE

        v_shopping_total :=
          0;

      END IF;


    ELSE

      v_shopping_selected :=
        false;

      v_shopping_total :=
        0;

    END IF;


    -- =====================================================
    -- SUBTOTAL LÍNEA
    -- =====================================================

    v_line_subtotal :=

      v_base_total

      +

      v_grill_total

      +

      v_transport_total

      +

      v_shopping_total;


    -- =====================================================
    -- DESCUENTO FULL BRASA
    -- =====================================================

    IF v_full_package THEN


      IF
        v_service.full_package_discount_type =
        'fixed'
      THEN

        v_discount :=
          LEAST(

            v_line_subtotal,

            GREATEST(
              0,
              COALESCE(
                v_service.full_package_discount,
                0
              )::integer
            )

          );


      ELSE

        v_discount :=
          ROUND(

            v_line_subtotal

            *

            (

              GREATEST(

                0,

                LEAST(

                  100,

                  COALESCE(
                    v_service.full_package_discount,
                    0
                  )

                )

              )

              /

              100.0

            )

          )::integer;


      END IF;


    END IF;


    -- =====================================================
    -- TOTAL LÍNEA
    -- =====================================================

    v_line_total :=
      GREATEST(

        0,

        v_line_subtotal -
        v_discount

      );


    -- =====================================================
    -- GUARDAR BOOKING ITEM
    -- =====================================================

    INSERT INTO public.booking_items (

      booking_id,

      provider_id,
      service_id,

      provider_slug,
      provider_name,
      category_slug,

      service_external_key,
      service_name,

      unit,
      unit_price,
      quantity,

      base_service_total,

      grill_selected,
      grill_total,

      transport_selected,
      transport_total,

      shopping_selected,
      shopping_fee_type,
      shopping_fee_value,
      shopping_fee_total,

      full_package,
      discount_total,

      line_total,

      provider_status

    )
    VALUES (

      v_booking.id,

      v_provider.id,
      v_service.id,

      v_provider.slug,
      v_provider.business_name,
      v_provider.category_slug,

      v_service.external_key,
      v_service.name,

      v_service.unit,
      v_service.price,
      v_quantity,

      v_base_total,

      v_grill_selected,
      v_grill_total,

      v_transport_selected,
      v_transport_total,

      v_shopping_selected,

      v_service.shopping_fee_type,

      COALESCE(
        v_service.shopping_fee,
        0
      ),

      v_shopping_total,

      v_full_package,

      v_discount,

      v_line_total,

      'esperando_confirmacion'

    );


    -- =====================================================
    -- SUMAR TOTAL EVENTO
    -- =====================================================

    v_subtotal :=
      v_subtotal +
      v_line_total;


  END LOOP;


  -- =======================================================
  -- COMISIÓN BRASA 10% RETENIDA AL PRESTADOR
  -- =======================================================

  v_platform_fee :=
    ROUND(
      v_subtotal *
      0.10
    )::integer;


  v_total :=
    v_subtotal;


  -- =======================================================
  -- ACTUALIZAR BOOKING
  -- =======================================================

  UPDATE public.bookings b

  SET
    subtotal =
      v_subtotal,

    platform_fee =
      v_platform_fee,

    total =
      v_total,

    status =
      'esperando_confirmacion',

    updated_at =
      NOW()

  WHERE
    b.id =
      v_booking.id;


  -- =======================================================
  -- RESULTADO
  -- =======================================================

  RETURN QUERY

  SELECT
    b.id,
    b.code,
    b.status,
    b.total

  FROM public.bookings b

  WHERE
    b.id =
      v_booking.id;


END;

$function$;

-- Solo corrige cotizaciones antiguas sin ningún intento de pago.
-- No toca transacciones ni reservas con historial de pago.
update public.bookings as b
set platform_fee = round(b.subtotal * 0.10)::integer,
    total = b.subtotal,
    updated_at = now()
where b.subtotal > 0
  and b.total = b.subtotal + b.platform_fee
  and b.platform_fee = round(b.subtotal * 0.08)::integer
  and not exists (select 1 from public.payments p where p.booking_id = b.id);
