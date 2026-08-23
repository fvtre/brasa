import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

export function StarRating({
  rating,
  reviews,
  className,
  size = 14,
}: {
  rating: number
  reviews?: number
  className?: string
  size?: number
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star size={size} className="fill-primary text-primary" aria-hidden />
      <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
      {reviews !== undefined && (
        <span className="text-muted-foreground">({reviews})</span>
      )}
    </span>
  )
}
