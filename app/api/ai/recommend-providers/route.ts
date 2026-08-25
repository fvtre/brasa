import { NextResponse } from "next/server"

/* =========================================================
   TYPES
========================================================= */

type PricingMode =
  | "fixed"
  | "from"
  | "quote"

type ProviderInput = {
  id: string
  name: string
  rating?: number | null
  price?: number | null
  unit?: string | null
  pricingMode?: PricingMode | null
  verified?: boolean
  featured?: boolean
  comuna?: string | null
  serviceName?: string
  durationHours?: number | null
}

type RequestBody = {
  event: {
    date: string
    time: string
    guests: number
    category: string
    budget?: number
    comuna?: string
  }

  providers: ProviderInput[]
}

type RankedProvider = {
  providerId: string
  providerName: string

  score: number

  price: number
  unit: string
  pricingMode: PricingMode

  /*
   * Costo comparable del servicio
   * para ESTE evento.
   *
   * por evento:
   *   precio
   *
   * por persona:
   *   precio * invitados
   *
   * quote:
   *   null
   */
  estimatedTotal: number | null

  rating: number
  verified: boolean
  featured: boolean

  serviceName: string
  durationHours: number | null

  priceScore: number
  ratingScore: number
  verifiedScore: number
  featuredScore: number
  dataScore: number
}

/* =========================================================
   HELPERS
========================================================= */

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  )
}

function normalizePricingMode(
  value?: PricingMode | null
): PricingMode {
  if (
    value === "from" ||
    value === "quote"
  ) {
    return value
  }

  return "fixed"
}

function normalizeUnit(
  unit?: string | null
) {
  return (
    unit ||
    "por evento"
  )
    .trim()
    .toLowerCase()
}

/* =========================================================
   COSTO TOTAL COMPARABLE
========================================================= */

function calculateEstimatedTotal(
  provider: ProviderInput,
  guests: number
): number | null {
  const pricingMode =
    normalizePricingMode(
      provider.pricingMode
    )

  /*
   * QUOTE:
   *
   * No sabemos el precio.
   * $0 NO significa gratis.
   */
  if (
    pricingMode === "quote"
  ) {
    return null
  }

  const price =
    Number(
      provider.price || 0
    )

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return null
  }

  const unit =
    normalizeUnit(
      provider.unit
    )

  /*
   * PRECIO POR PERSONA
   */
  if (
    unit.includes("persona")
  ) {
    const safeGuests =
      Math.max(
        1,
        Number(
          guests || 0
        )
      )

    return (
      price *
      safeGuests
    )
  }

  /*
   * PRECIO POR EVENTO
   */
  return price
}

/* =========================================================
   SCORE DETERMINISTA BRASA
========================================================= */

function calculateRanking(
  providers: ProviderInput[],
  guests: number
): RankedProvider[] {

  /*
   * Un prestador puede tener varios
   * servicios compatibles.
   *
   * Seleccionamos un servicio
   * representativo por prestador.
   *
   * IMPORTANTE:
   * se compara COSTO TOTAL,
   * no precio nominal.
   */

  const byProvider =
    new Map<
      string,
      ProviderInput
    >()

  for (
    const provider
    of providers
  ) {
    const existing =
      byProvider.get(
        provider.id
      )

    if (!existing) {
      byProvider.set(
        provider.id,
        provider
      )

      continue
    }

    const currentTotal =
      calculateEstimatedTotal(
        provider,
        guests
      )

    const existingTotal =
      calculateEstimatedTotal(
        existing,
        guests
      )

    /*
     * Si el nuevo servicio tiene
     * precio comparable y el anterior
     * no, usamos el nuevo.
     */
    if (
      currentTotal !== null &&
      existingTotal === null
    ) {
      byProvider.set(
        provider.id,
        provider
      )

      continue
    }

    /*
     * Si ambos tienen precio,
     * usamos el de menor costo TOTAL.
     */
    if (
      currentTotal !== null &&
      existingTotal !== null &&
      currentTotal <
        existingTotal
    ) {
      byProvider.set(
        provider.id,
        provider
      )
    }

    /*
     * Si ambos son quote,
     * conservamos el primero.
     */
  }

  const uniqueProviders =
    [
      ...byProvider.values(),
    ]

  /* =====================================================
     PRECIOS COMPARABLES
  ===================================================== */

  const comparableTotals =
    uniqueProviders
      .map(
        provider =>
          calculateEstimatedTotal(
            provider,
            guests
          )
      )
      .filter(
        (
          value
        ): value is number =>
          value !== null &&
          value > 0
      )

  const minTotal =
    comparableTotals.length > 0
      ? Math.min(
          ...comparableTotals
        )
      : null

  const maxTotal =
    comparableTotals.length > 0
      ? Math.max(
          ...comparableTotals
        )
      : null

  const comparableCount =
    comparableTotals.length

  /* =====================================================
     RANKING
  ===================================================== */

  const ranking =
    uniqueProviders.map(
      provider => {

        const price =
          Number(
            provider.price || 0
          )

        const unit =
          provider.unit ||
          "por evento"

        const pricingMode =
          normalizePricingMode(
            provider.pricingMode
          )

        const estimatedTotal =
          calculateEstimatedTotal(
            provider,
            guests
          )

        const rating =
          clamp(
            Number(
              provider.rating || 0
            ),
            0,
            5
          )

        /*
         * 50 puntos:
         *
         * Si llegó a esta API,
         * ya pasó:
         *
         * - categoría
         * - fecha
         * - hora
         * - disponibilidad
         * - capacidad
         */
        const compatibilityScore =
          50

        /* =================================================
           PRECIO · máximo 20
        ================================================= */

        let priceScore =
          0

        /*
         * QUOTE:
         *
         * No conocemos el precio.
         * No recibe puntos falsos.
         */
        if (
          estimatedTotal === null
        ) {
          priceScore =
            0

        } else if (
          comparableCount === 1 ||
          minTotal === maxTotal
        ) {
          /*
           * Existe precio conocido,
           * pero no hay comparación
           * suficiente.
           */
          priceScore =
            14

        } else if (
          minTotal !== null &&
          maxTotal !== null
        ) {
          const position =
            (
              estimatedTotal -
              minTotal
            ) /
            (
              maxTotal -
              minTotal
            )

          /*
           * Menor costo total = 20
           * Mayor costo total = 8
           */
          priceScore =
            20 -
            position * 12
        }

        /* =================================================
           RATING · máximo 15
        ================================================= */

        const ratingScore =
          (
            rating /
            5
          ) * 15

        /* =================================================
           VERIFICACIÓN · 10
        ================================================= */

        const verifiedScore =
          provider.verified
            ? 10
            : 0

        /* =================================================
           DATOS DEL SERVICIO · 5
        ================================================= */

        const dataScore =
          provider.durationHours != null &&
          Number(
            provider.durationHours
          ) > 0
            ? 5
            : 0

        /* =================================================
           SCORE FINAL
        ================================================= */

        const score =
          Math.round(
            compatibilityScore +
            priceScore +
            ratingScore +
            verifiedScore +
            dataScore
          )

        return {
          providerId:
            provider.id,

          providerName:
            provider.name,

          score:
            clamp(
              score,
              0,
              100
            ),

          price,

          unit,

          pricingMode,

          estimatedTotal,

          rating,

          verified:
            Boolean(
              provider.verified
            ),

          featured:
            Boolean(
              provider.featured
            ),

          serviceName:
            provider.serviceName ||
            "Servicio",

          durationHours:
            provider.durationHours != null
              ? Number(
                  provider.durationHours
                )
              : null,

          priceScore:
            Math.round(
              priceScore
            ),

          ratingScore:
            Math.round(
              ratingScore
            ),

          verifiedScore,

          /*
           * Featured NO altera
           * compatibilidad.
           */
          featuredScore:
            0,

          dataScore,
        }
      }
    )

  /* =====================================================
     ORDEN DETERMINISTA
  ===================================================== */

  return ranking.sort(
    (
      a,
      b
    ) => {

      /*
       * 1. SCORE
       */
      if (
        b.score !==
        a.score
      ) {
        return (
          b.score -
          a.score
        )
      }

      /*
       * 2. RATING
       */
      if (
        b.rating !==
        a.rating
      ) {
        return (
          b.rating -
          a.rating
        )
      }

      /*
       * 3. COSTO TOTAL
       */
      if (
        a.estimatedTotal !== null &&
        b.estimatedTotal !== null &&
        a.estimatedTotal !==
          b.estimatedTotal
      ) {
        return (
          a.estimatedTotal -
          b.estimatedTotal
        )
      }

      /*
       * Precio conocido antes
       * que cotización si todo
       * lo demás empata.
       */
      if (
        a.estimatedTotal !== null &&
        b.estimatedTotal === null
      ) {
        return -1
      }

      if (
        a.estimatedTotal === null &&
        b.estimatedTotal !== null
      ) {
        return 1
      }

      /*
       * 4. ID estable
       */
      return (
        a.providerId.localeCompare(
          b.providerId
        )
      )
    }
  )
}

/* =========================================================
   RAZONES OBJETIVAS DE BRASA

   Groq NO genera estas razones.
========================================================= */

function buildReasons(
  provider: RankedProvider,
  ranking: RankedProvider[]
) {
  const reasons: string[] =
    []

  /*
   * Solo prestadores con
   * precio comparable.
   */
  const comparable =
    ranking.filter(
      item =>
        item.estimatedTotal !==
        null
    )

  const comparableTotals =
    comparable.map(
      item =>
        item.estimatedTotal!
    )

  const minTotal =
    comparableTotals.length > 0
      ? Math.min(
          ...comparableTotals
        )
      : null

  const ratings =
    ranking
      .map(
        item =>
          item.rating
      )
      .filter(
        rating =>
          rating > 0
      )

  const maxRating =
    ratings.length > 0
      ? Math.max(
          ...ratings
        )
      : null

  /* =====================================================
     PRECIO / COTIZACIÓN
  ===================================================== */

  if (
    provider.pricingMode ===
    "quote"
  ) {
    reasons.push(
      "Precio sujeto a cotización con el prestador."
    )

  } else if (
    provider.estimatedTotal !==
      null &&
    comparable.length > 1 &&
    minTotal !== null &&
    provider.estimatedTotal ===
      minTotal
  ) {
    reasons.push(
      `Menor costo estimado entre ${comparable.length} alternativas con precio disponible.`
    )

  } else if (
    provider.estimatedTotal !==
    null
  ) {
    const prefix =
      provider.pricingMode ===
      "from"
        ? "Costo estimado desde"
        : "Costo estimado"

    reasons.push(
      `${prefix} $${provider.estimatedTotal.toLocaleString(
        "es-CL"
      )} para el evento.`
    )
  }

  /* =====================================================
     RATING
  ===================================================== */

  if (
    provider.rating > 0 &&
    reasons.length < 3
  ) {
    if (
      ranking.length > 1 &&
      maxRating !== null &&
      provider.rating ===
        maxRating
    ) {
      reasons.push(
        `Mejor evaluación entre las alternativas: ${provider.rating.toFixed(
          1
        )}/5.`
      )
    } else {
      reasons.push(
        `Evaluación de ${provider.rating.toFixed(
          1
        )}/5.`
      )
    }
  }

  /* =====================================================
     VERIFICACIÓN
  ===================================================== */

  if (
    provider.verified &&
    reasons.length < 3
  ) {
    reasons.push(
      "Prestador verificado en Brasa."
    )
  }

  /* =====================================================
     SERVICIO
  ===================================================== */

  if (
    provider.serviceName &&
    reasons.length < 3
  ) {
    reasons.push(
      `Servicio: ${provider.serviceName}.`
    )
  }

  /* =====================================================
     DURACIÓN
  ===================================================== */

  if (
    provider.durationHours &&
    reasons.length < 3
  ) {
    reasons.push(
      `Duración del servicio: ${provider.durationHours} ${
        provider.durationHours === 1
          ? "hora"
          : "horas"
      }.`
    )
  }

  return reasons.slice(
    0,
    3
  )
}

/* =========================================================
   API
========================================================= */

export async function POST(
  request: Request
) {
  try {
    const apiKey =
      process.env
        .GROQ_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GROQ_API_KEY no está configurada.",
        },
        {
          status: 500,
        }
      )
    }

    const body =
      (
        await request.json()
      ) as RequestBody

    if (
      !body?.event ||
      !Array.isArray(
        body.providers
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Datos incompletos.",
        },
        {
          status: 400,
        }
      )
    }

    if (
      body.providers.length ===
      0
    ) {
      return NextResponse.json({
        recommendedProviderId:
          null,

        reason:
          "No hay prestadores disponibles para recomendar.",

        ranking: [],
      })
    }

    /* =====================================================
       RANKING REAL DE BRASA
    ===================================================== */

    const deterministicRanking =
      calculateRanking(
        body.providers,
        body.event.guests
      )

    const recommended =
      deterministicRanking[0]

    if (!recommended) {
      return NextResponse.json({
        recommendedProviderId:
          null,

        reason:
          "No hay alternativas válidas.",

        ranking: [],
      })
    }

    /* =====================================================
       GROQ SOLO REDACTA EL RESUMEN

       NO decide:
       - ganador
       - score
       - razones técnicas
       - precio
       - disponibilidad
    ===================================================== */

    const prompt = `
Eres Brasa IA, asistente de recomendaciones para un marketplace chileno de eventos.

El sistema Brasa ya calculó:
- disponibilidad;
- prestador recomendado;
- score;
- precio;
- modalidad de precio;
- costo estimado cuando corresponde;
- servicio;
- datos objetivos.

Tu única tarea es redactar UNA explicación breve y prudente de por qué el prestador recomendado es una buena alternativa.

REGLAS IMPORTANTES:

- NO cambies el proveedor recomendado.
- NO cambies el score.
- NO inventes precios.
- NO inventes disponibilidad.
- NO inventes duración.
- NO inventes evaluaciones.
- NO inventes características.
- NO afirmes que algo está dentro del presupuesto si no se informó presupuesto.
- NO digas que un precio es barato, competitivo o conveniente si esa conclusión no está en los datos.
- Si pricingMode es "quote", el precio NO es $0: significa que requiere cotización.
- Si pricingMode es "from", el precio corresponde a un valor "desde".
- estimatedTotal es una estimación calculada por Brasa para este evento.
- NO presentes estimatedTotal como precio final garantizado cuando pricingMode sea "from".
- NO repitas una lista de datos técnicos.

EVENTO:
- Fecha: ${body.event.date}
- Hora: ${body.event.time}
- Invitados: ${body.event.guests}
- Categoría: ${body.event.category}
- Comuna: ${body.event.comuna || "No indicada"}
- Presupuesto: ${
      body.event.budget
        ? `$${body.event.budget.toLocaleString(
            "es-CL"
          )} CLP`
        : "No indicado"
    }

PRESTADOR RECOMENDADO:
${JSON.stringify(
  recommended,
  null,
  2
)}

Devuelve exclusivamente JSON válido:

{
  "reason": "Explicación humana en español, máximo 25 palabras."
}

No agregues ningún otro campo.
`

    const response =
      await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${apiKey}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              model:
                "openai/gpt-oss-120b",

              temperature:
                0.1,

              response_format: {
                type:
                  "json_object",
              },

              messages: [
                {
                  role:
                    "system",

                  content:
                    "Redacta únicamente explicaciones breves basadas en datos proporcionados. Responde solo JSON válido.",
                },

                {
                  role:
                    "user",

                  content:
                    prompt,
                },
              ],
            }),
        }
      )

    /* =====================================================
       FALLBACK SI GROQ FALLA
    ===================================================== */

    if (!response.ok) {
      const groqError =
        await response.text()

      console.error(
        "GROQ ERROR:",
        response.status,
        groqError
      )

      return NextResponse.json({
        recommendedProviderId:
          recommended.providerId,

        reason:
          "Alternativa compatible con tu evento según disponibilidad, servicio y datos registrados en Brasa.",

        ranking:
          deterministicRanking.map(
            item => ({
              providerId:
                item.providerId,

              score:
                item.score,

              reason:
                "Evaluación calculada por Brasa.",

              reasons:
                buildReasons(
                  item,
                  deterministicRanking
                ),
            })
          ),
      })
    }

    const result =
      await response.json()

    const content =
      result?.choices?.[0]
        ?.message?.content

    let explanation:
      | {
          reason?: string
        }
      | null =
      null

    if (content) {
      try {
        explanation =
          JSON.parse(
            content
          )
      } catch (error) {
        console.error(
          "JSON IA inválido:",
          error
        )
      }
    }

    /* =====================================================
       RESULTADO FINAL

       reasons = BRASA
       reason general = GROQ
    ===================================================== */

    const finalRanking =
      deterministicRanking.map(
        item => ({
          providerId:
            item.providerId,

          score:
            item.score,

          /*
           * Estos campos además
           * nos servirán para la UI.
           */
          price:
            item.price,

          unit:
            item.unit,

          pricingMode:
            item.pricingMode,

          estimatedTotal:
            item.estimatedTotal,

          reason:
            item.providerId ===
            recommended.providerId
              ? (
                  explanation
                    ?.reason ||
                  "Alternativa compatible con tu evento según los datos registrados."
                )
              : "Alternativa compatible según los criterios calculados por Brasa.",

          reasons:
            buildReasons(
              item,
              deterministicRanking
            ),
        })
      )

    return NextResponse.json({
      recommendedProviderId:
        recommended.providerId,

      reason:
        explanation?.reason ||
        "Alternativa compatible con tu evento según los datos registrados.",

      ranking:
        finalRanking,
    })

  } catch (error: any) {
    console.error(
      "recommend-providers:",
      error
    )

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Error interno generando la recomendación.",
      },
      {
        status: 500,
      }
    )
  }
}