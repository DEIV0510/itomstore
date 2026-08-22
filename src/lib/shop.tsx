import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import { applySettings, DEFAULT_SETTINGS } from './settings'
import type { Settings } from './settings'
import type { Category, Product } from './types'

/**
 * Datos vivos de la tienda.
 *
 * FUENTE UNICA: la base de datos, via /api. Lo que el administrador cambie en
 * /admin se refleja aqui sin tocar codigo. Los archivos src/data/catalog.ts y
 * src/lib/config.ts ya solo sirven de semilla inicial de esa base.
 */
interface ShopValue {
  products: Product[]
  categories: Category[]
  settings: Settings
  loading: boolean
  error: string | null
  /** vuelve a pedir todo a la API (lo usa el panel tras guardar) */
  refresh: () => Promise<void>
  getProduct: (id: string) => Product | undefined
  getCategory: (id: string) => Category | undefined
  productsIn: (id: string) => Product[]
}

const Ctx = createContext<ShopValue | null>(null)

export function ShopProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [p, c, s] = await Promise.all([
        api.get<{ products: Product[] }>('/products'),
        api.get<{ categories: Category[] }>('/categories'),
        api.get<Partial<Settings>>('/settings'),
      ])
      setProducts(p.products ?? [])
      setCategories(c.categories ?? [])
      // se guarda tambien en el modulo para que los enlaces de WhatsApp usen el numero vigente
      setSettings(applySettings(s ?? {}))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar la tienda.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const value = useMemo<ShopValue>(
    () => ({
      products,
      categories,
      settings,
      loading,
      error,
      refresh: load,
      getProduct: (id) => products.find((p) => p.id === id),
      getCategory: (id) => categories.find((c) => c.id === id),
      productsIn: (id) => products.filter((p) => p.category === id),
    }),
    [products, categories, settings, loading, error, load]
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useShop(): ShopValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useShop debe usarse dentro de <ShopProvider>')
  return ctx
}
