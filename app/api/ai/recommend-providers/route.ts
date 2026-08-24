import { NextResponse } from "next/server"

type ProviderInput = {
    id: string
    name: string
    rating?: number | null
    price?: number | null
    unit?: string | null
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

/* =========================================================
   SCORE DETERMINISTA
========================================================= */

function calculateRanking(
    providers: ProviderInput[]
): RankedProvider[] {
    /*
     * SCORE BRASA
     *
     * 50 pts = compatibilidad base
     * 20 pts = precio relativo
     * 15 pts = rating
     * 10 pts = verificación
     *  5 pts = datos del servicio
     */

    /*
     * Un mismo prestador puede tener varios
     * servicios compatibles.
     *
     * Para el ranking de PRESTADOR usamos
     * su servicio compatible más económico.
     */
    const byProvider =
        new Map<
            string,
            ProviderInput
        >()

    for (const provider of providers) {
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

        const currentPrice =
            Number(
                provider.price || 0
            )

        const existingPrice =
            Number(
                existing.price || 0
            )

        if (
            currentPrice > 0 &&
            (
                existingPrice <= 0 ||
                currentPrice <
                existingPrice
            )
        ) {
            byProvider.set(
                provider.id,
                provider
            )
        }
    }

    const uniqueProviders =
        [
            ...byProvider.values(),
        ]

    const validPrices =
        uniqueProviders
            .map(
                provider =>
                    Number(
                        provider.price || 0
                    )
            )
            .filter(
                price =>
                    price > 0
            )

    const minPrice =
        validPrices.length > 0
            ? Math.min(
                ...validPrices
            )
            : 0

    const maxPrice =
        validPrices.length > 0
            ? Math.max(
                ...validPrices
            )
            : 0

    const ranking =
        uniqueProviders.map(
            provider => {
                const price =
                    Number(
                        provider.price || 0
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
                 * Compatibilidad base.
                 *
                 * Si llegó a esta API,
                 * ya pasó validaciones reales:
                 *
                 * - categoría
                 * - fecha
                 * - hora
                 * - disponibilidad
                 * - duración
                 * - reservas que bloquean
                 */
                const compatibilityScore =
                    50

                /*
                 * Precio · máximo 20 pts.
                 */
                let priceScore =
                    0

                if (
                    price <= 0
                ) {
                    priceScore =
                        0

                } else if (
                    uniqueProviders.length === 1 ||
                    minPrice === maxPrice
                ) {
                    /*
                     * Si es la única alternativa,
                     * no fingimos que es "el más barato".
                     */
                    priceScore =
                        14

                } else {
                    const position =
                        (
                            price -
                            minPrice
                        ) /
                        (
                            maxPrice -
                            minPrice
                        )

                    /*
                     * Más barato = 20
                     * Más caro = 8
                     */
                    priceScore =
                        20 -
                        position * 12
                }

                /*
                 * Rating · máximo 15 pts.
                 */
                const ratingScore =
                    (
                        rating /
                        5
                    ) * 15

                /*
                 * Verificación · 10 pts.
                 */
                const verifiedScore =
                    provider.verified
                        ? 10
                        : 0

                /*
                 * Datos del servicio · 5 pts.
                 */
                const dataScore =
                    provider.durationHours != null &&
                        Number(
                            provider.durationHours
                        ) > 0
                        ? 5
                        : 0

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

                    unit:
                        provider.unit ||
                        "por evento",

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
                     * Featured no suma compatibilidad.
                     */
                    featuredScore:
                        0,

                    dataScore,
                }
            }
        )

    /*
     * Orden determinista:
     *
     * 1. score
     * 2. rating
     * 3. precio
     * 4. id
     */
    return ranking.sort(
        (
            a,
            b
        ) => {
            if (
                b.score !==
                a.score
            ) {
                return (
                    b.score -
                    a.score
                )
            }

            if (
                b.rating !==
                a.rating
            ) {
                return (
                    b.rating -
                    a.rating
                )
            }

            if (
                a.price !==
                b.price
            ) {
                return (
                    a.price -
                    b.price
                )
            }

            return a.providerId.localeCompare(
                b.providerId
            )
        }
    )
}

/* =========================================================
   RAZONES REALES DE BRASA

   Groq NO genera estas razones.
========================================================= */

function buildReasons(
    provider: RankedProvider,
    ranking: RankedProvider[]
) {
    const reasons: string[] = []

    const totalProviders =
        ranking.length

    const prices =
        ranking
            .map(item => item.price)
            .filter(price => price > 0)

    const minPrice =
        prices.length > 0
            ? Math.min(...prices)
            : null

    const ratings =
        ranking
            .map(item => item.rating)
            .filter(rating => rating > 0)

    const maxRating =
        ratings.length > 0
            ? Math.max(...ratings)
            : null

    /* PRECIO */

    if (
        totalProviders > 1 &&
        minPrice !== null &&
        provider.price === minPrice
    ) {
        reasons.push(
            `Menor precio entre ${totalProviders} alternativas disponibles.`
        )
    } else if (
        provider.price > 0
    ) {
        reasons.push(
            `$${provider.price.toLocaleString(
                "es-CL"
            )} ${provider.unit}.`
        )
    }

    /* RATING */

    if (
        provider.rating > 0 &&
        reasons.length < 3
    ) {
        if (
            totalProviders > 1 &&
            maxRating !== null &&
            provider.rating === maxRating
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

    /* VERIFICACIÓN */

    if (
        provider.verified &&
        reasons.length < 3
    ) {
        reasons.push(
            "Prestador verificado en Brasa."
        )
    }

    /* SERVICIO */

    if (
        provider.serviceName &&
        reasons.length < 3
    ) {
        reasons.push(
            `Servicio: ${provider.serviceName}.`
        )
    }

    /* DURACIÓN */

    if (
        provider.durationHours &&
        reasons.length < 3
    ) {
        reasons.push(
            `Duración del servicio: ${provider.durationHours} ${provider.durationHours === 1
                ? "hora"
                : "horas"
            }.`
        )
    }

    return reasons.slice(0, 3)
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
                body.providers
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
- servicio;
- datos objetivos.

Tu única tarea es redactar UNA explicación breve y prudente de por qué el prestador recomendado es una buena alternativa.

NO debes:
- cambiar el proveedor recomendado;
- cambiar el score;
- inventar precios;
- inventar disponibilidad;
- inventar duración;
- inventar evaluaciones;
- inventar características;
- afirmar que algo está dentro del presupuesto si no se informó presupuesto;
- decir que es el precio más competitivo si no existe comparación suficiente;
- repetir datos técnicos como lista.

EVENTO:
- Fecha: ${body.event.date}
- Hora: ${body.event.time}
- Invitados: ${body.event.guests}
- Categoría: ${body.event.category}
- Comuna: ${body.event.comuna || "No indicada"}
- Presupuesto: ${body.event.budget
                ? `$${body.event.budget} CLP`
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

        if (
            !response.ok
        ) {
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

        if (
            content
        ) {
            try {
                explanation =
                    JSON.parse(
                        content
                    )
            } catch (
            error
            ) {
                console.error(
                    "JSON IA inválido:",
                    error
                )
            }
        }

        /* =====================================================
           RESULTADO FINAL
    
           IMPORTANTE:
           razones = siempre Brasa
           reason general = Groq
        ===================================================== */

        const finalRanking =
            deterministicRanking.map(
                item => ({
                    providerId:
                        item.providerId,

                    score:
                        item.score,

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

    } catch (
    error: any
    ) {
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