import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { PRODUCTS, getProduct } from '@/data/catalog'
import type { CartLine, Product } from './types'

/* ------------------------------ carrito ---------------------------------- */

const KEY = 'itomstore.cart.v1'

type Action =
  | { type: 'add'; id: string; qty: number }
  | { type: 'remove'; id: string }
  | { type: 'setQty'; id: string; qty: number }
  | { type: 'clear' }
  | { type: 'hydrate'; lines: CartLine[] }

function reducer(state: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case 'hydrate':
      return action.lines
    case 'add': {
      const found = state.find((l) => l.id === action.id)
      if (found) return state.map((l) => (l.id === action.id ? { ...l, qty: Math.min(99, l.qty + action.qty) } : l))
      return [...state, { id: action.id, qty: Math.min(99, action.qty) }]
    }
    case 'remove':
      return state.filter((l) => l.id !== action.id)
    case 'setQty':
      if (action.qty <= 0) return state.filter((l) => l.id !== action.id)
      return state.map((l) => (l.id === action.id ? { ...l, qty: Math.min(99, action.qty) } : l))
    case 'clear':
      return []
  }
}

function read(): CartLine[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // se descartan productos que ya no existen en el catalogo
    return parsed
      .filter((l): l is CartLine => !!l && typeof (l as CartLine).id === 'string' && typeof (l as CartLine).qty === 'number')
      .filter((l) => PRODUCTS.some((p) => p.id === l.id))
      .map((l) => ({ id: l.id, qty: Math.max(1, Math.min(99, Math.round(l.qty))) }))
  } catch {
    return []
  }
}

export interface CartItem {
  product: Product
  qty: number
}

interface StoreValue {
  lines: CartLine[]
  items: CartItem[]
  count: number
  /** suma de los productos que ya tienen precio publicado */
  total: number
  /** true si alguna linea todavia no tiene precio -> se muestra "a consultar" */
  hasPending: boolean
  add: (id: string, qty?: number) => void
  remove: (id: string) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
  cartOpen: boolean
  openCart: () => void
  closeCart: () => void
  searchOpen: boolean
  openSearch: () => void
  closeSearch: () => void
  toasts: Toast[]
  toast: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

export interface Toast {
  id: number
  title: string
  detail?: string
  image?: string
  action?: { label: string; onClick: () => void }
}

const Ctx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(reducer, [])
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    dispatch({ type: 'hydrate', lines: read() })
    setHydrated(true)
  }, [])

  useEffect(() => {
    // No se escribe hasta haber leido: si no, el estado inicial vacio pisaria
    // el carrito guardado y el cliente perderia su pedido al recargar.
    if (!hydrated) return
    try {
      window.localStorage.setItem(KEY, JSON.stringify(lines))
    } catch {
      /* almacenamiento no disponible: el carrito sigue funcionando en memoria */
    }
  }, [lines, hydrated])

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((t) => clearTimeout(t))
      map.clear()
    }
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const t = timers.current.get(id)
    if (t) {
      clearTimeout(t)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = ++seq.current
      setToasts((prev) => [...prev.slice(-2), { ...t, id }])
      const timer = setTimeout(() => dismiss(id), 4200)
      timers.current.set(id, timer)
    },
    [dismiss]
  )

  const items = useMemo(
    () =>
      lines
        .map((l) => {
          const product = getProduct(l.id)
          return product ? { product, qty: l.qty } : null
        })
        .filter((x): x is CartItem => x !== null),
    [lines]
  )

  const value = useMemo<StoreValue>(() => {
    const priced = items.filter((i) => i.product.price !== null)
    return {
      lines,
      items,
      count: items.reduce((a, i) => a + i.qty, 0),
      total: priced.reduce((a, i) => a + (i.product.price as number) * i.qty, 0),
      hasPending: items.some((i) => i.product.price === null),
      add: (id, qty = 1) => dispatch({ type: 'add', id, qty }),
      remove: (id) => dispatch({ type: 'remove', id }),
      setQty: (id, qty) => dispatch({ type: 'setQty', id, qty }),
      clear: () => dispatch({ type: 'clear' }),
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      searchOpen,
      openSearch: () => setSearchOpen(true),
      closeSearch: () => setSearchOpen(false),
      toasts,
      toast,
      dismiss,
    }
  }, [lines, items, cartOpen, searchOpen, toasts, toast, dismiss])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>')
  return ctx
}
