import {
  Cable,
  Headphones,
  Laptop,
  type LucideIcon,
  Smartphone,
  Speaker,
  Tablet,
  TabletSmartphone,
  Watch,
} from 'lucide-react'
import type { Category } from '@/lib/types'

/** Un solo icono por categoria en toda la tienda (home, categoria, buscador, menu). */
export const CATEGORY_ICON: Record<Category['icon'], LucideIcon> = {
  smartphone: Smartphone,
  laptop: Laptop,
  tablet: Tablet,
  watch: Watch,
  headphones: Headphones,
  speaker: Speaker,
  cable: Cable,
  android: TabletSmartphone,
}
