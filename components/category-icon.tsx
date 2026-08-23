import {
  Flame,
  Martini,
  ConciergeBell,
  UtensilsCrossed,
  CakeSlice,
  Disc3,
  PartyPopper,
  Camera,
  Armchair,
  Sparkles,
  type LucideProps,
} from "lucide-react"

const MAP = {
  Flame,
  Martini,
  ConciergeBell,
  UtensilsCrossed,
  CakeSlice,
  Disc3,
  PartyPopper,
  Camera,
  Armchair,
} as const

export function CategoryIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = MAP[name as keyof typeof MAP] ?? Sparkles
  return <Icon {...props} />
}
