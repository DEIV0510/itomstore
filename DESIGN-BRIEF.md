# ITOMSTORE — brief técnico y visual (LÉELO COMPLETO ANTES DE ESCRIBIR CÓDIGO)

Proyecto: `C:\Users\Lenovo\Desktop\PROYECTOS-CLAUDE\itomstore`
Stack: **React 18 + TypeScript estricto + Vite + Tailwind 3 + react-router-dom 6 + lucide-react**.
Alias: `@/` → `src/`.

---

## 0. Reglas duras (romper una es un bug)

1. **NO inventar información comercial.** No hay precios, ni capacidades, ni garantías, ni cantidades de stock, ni años de experiencia, ni número de clientes, ni testimonios. Si no está en `src/data/catalog.ts`, no existe.
2. **NUNCA** afirmar que ITOMSTORE es distribuidor oficial / reseller autorizado / servicio técnico autorizado de Apple, Bose, Beats o Samsung.
3. **NO inventar testimonios, reseñas, estrellas, ni contadores.**
4. `price === null` es lo normal hoy → la UI muestra **"Precio a consultar"**. Nunca "$0", nunca "Gratis".
5. **Ningún botón muerto, ningún enlace roto, ningún `href="#"`.** Todo navega o ejecuta algo real.
6. **Cero scroll horizontal** en cualquier viewport (320px incluido).
7. Español de Colombia, tono premium + cercano. Sin tildes en identificadores de código; **sí** con tildes en el texto visible al usuario.
8. TypeScript estricto: `noUnusedLocals` y `noUnusedParameters` están activos. No dejes imports ni variables sin usar o el build falla.

---

## 1. Identidad visual

El logo real es **plateado/cromado sobre negro** (`iTOM STORE · TU MUNDO APPLE`). El dorado es **acento**, no color base.

| Rol | Token Tailwind | Valor |
|---|---|---|
| Fondo base | `bg-ink` | `#050506` |
| Fondo alterno | `bg-carbon` | `#0A0A0C` |
| Superficie | `bg-graphite` | `#121215` |
| Superficie elevada | `bg-elevated` | `#17171B` |
| Borde | `border-hairline` | `rgba(255,255,255,.08)` |
| Texto | `text-silver-100` | `#F5F6F8` |
| Texto secundario | `text-silver-500` | `#9AA0AA` |
| Texto terciario | `text-silver-700` | `#5C6069` |
| Acento | `text-gold-500` / `gold-300` / `gold-400` | `#C9A227` / `#E9D090` / `#DCBB66` |

**Dosis de dorado:** como máximo un CTA dorado por sección. El resto del oro va en: eyebrows, líneas divisorias, halos radiales muy suaves, números de paso, iconos pequeños, bordes al hacer hover.

Tipografía: `font-display` = Plus Jakarta Sans 800 (títulos, precios), `font-sans` = Inter (todo lo demás). Solo esas dos.

---

## 2. Clases del sistema (ya existen en `src/styles/index.css`, ÚSALAS, no reinventes)

**Layout:** `.container-x` (max-w 1280 + padding lateral responsive), `.section-y` (padding vertical de sección).

**Tipografía:** `.eyebrow`, `.title-hero`, `.title-xl`, `.title-md`, `.body-lg`, `.text-metal` (degradado plata sobre texto), `.text-gold-metal`.

**Superficies:** `.surface`, `.surface-glass` (glassmorphism sutil), `.hairline-t`, `.glow-gold` (halo dorado ambiental; el contenido necesita `relative z-10`), `.grain` (requiere `relative`).

**Botones:** `.btn` + una variante: `.btn-gold` (CTA principal), `.btn-light`, `.btn-ghost`, `.btn-wa` (WhatsApp, verde). `.btn-sm` para tamaño reducido. `.sheen` añade barrido de luz al hover.

**Badges:** `.badge` + `.badge-new` / `.badge-used` / `.badge-semi` / `.badge-gold` / `.badge-muted`.

**Otros:** `.reveal` (lo maneja `<Reveal>`), `.skeleton`, `.rail` (carrusel horizontal con snap para móvil), `.no-scrollbar`, `.mask-fade-b`, `.text-shadow-deep`.

Animaciones Tailwind disponibles: `animate-fade-up`, `animate-fade-in`, `animate-shimmer`, `animate-sweep`, `animate-pulse-ring`, `animate-float`. Easing: `ease-premium`.

---

## 3. Componentes ya construidos (impórtalos, NO los redefinas)

```ts
import Img from '@/components/ui/Img'                    // <Img name="clave" alt="..." className="" imgClassName="" sizes="" priority fallback={<.../>} />
import Reveal from '@/components/ui/Reveal'              // <Reveal delay={90} className=""> ... </Reveal>
import SectionHead from '@/components/ui/SectionHead'    // <SectionHead eyebrow title blurb align="left|center" aside={<...>} />
import ProductCard from '@/components/ui/ProductCard'    // <ProductCard product={p} railed priority />
import ConditionBadge from '@/components/ui/ConditionBadge'
import { useStore } from '@/lib/store'                   // carrito + drawer + buscador + toasts
import { useSeo } from '@/lib/seo'
import { useLockScroll } from '@/hooks/useLockScroll'
import { useEscape } from '@/hooks/useEscape'
import { BRAND, SOCIALS, COVERAGE } from '@/lib/config'
import { CATEGORIES, PRODUCTS, getProduct, getCategory, productsIn } from '@/data/catalog'
import { priceLabel, formatCOP, discountPct, CONDITION_LABEL } from '@/lib/format'
import { wa, waProduct, waCategory, waCheckout, WA_GENERAL, WA_ASESORIA, WA_PERMUTA, WA_ENVIO, WA_USADOS } from '@/lib/whatsapp'
import { img, LOGO, LOGO_SM, LOGO_MARK } from '@/lib/images'
import { applyFilters, facets, countActive, norm, EMPTY_FILTERS } from '@/lib/filters'
import type { FilterState, SortKey } from '@/lib/filters'
import type { Product, Category, CategoryId, Condition } from '@/lib/types'
```

`useStore()` devuelve:
`{ lines, items, count, total, hasPending, add(id,qty?), remove(id), setQty(id,qty), clear(), cartOpen, openCart(), closeCart(), searchOpen, openSearch(), closeSearch(), toasts, toast({title,detail?,image?,action?}), dismiss(id) }`

---

## 4. Fotos reales disponibles (claves para `<Img name="...">`)

Son fotos de celular, máximo 1291px de ancho. **Nunca las estires a pantalla completa**: van dentro de tarjetas, marcos, columnas o con máscara y oscurecidas. Si necesitas un fondo amplio, usa la foto con `blur`, `scale` y una veladura oscura encima.

| clave | qué es | uso ideal |
|---|---|---|
| `iphone-pro-mano` | mano sosteniendo 4 cajas de iPhone 17 Pro (blanco y naranja) | hero |
| `iphone-pro-colores` | 6 cajas iPhone 17 Pro plata y Cosmic Orange de pie | categoría iPhone |
| `iphone-pro-unidad` | una caja de iPhone 17 Pro plata en mano | tarjeta de producto |
| `iphone-cajas-mesa` | muchas cajas de iPhone sobre mesa de madera | stock / fondo |
| `envio-caja` | caja de envío con iPhones y accesorios dentro de un carro | sección de envíos |
| `macbook-cajas` | cajas de MacBook Neo rosa | categoría MacBook |
| `macbook-inventario` | cajas MacBook rosa apiladas sobre cajas Bose S1 Pro+ (apaisada 1291x747) | banda ancha / inventario |
| `ipad-air-colores` | 4 cajas de iPad Air (azul, morado, naranja, gris) con luces cálidas | categoría iPad |
| `watch-caja` | caja de Apple Watch en mano dentro del local | categoría Watch |
| `watch-abierto` | Apple Watch negro desempacado con cable y correa | destacado Watch |
| `bose-banner` | **banner propio de ITOMSTORE**: Bose S1 Pro+, muro de cajas, luz cálida, logo de la tienda | sección parlantes |
| `bose-inventario` | muro de cajas Bose apiladas | stock / parlantes |
| `beats-fundas` | 4 fundas Beats Rugged Case para iPhone 17 Pro Max | accesorios |
| `galaxy-s26-ultra` | cajas de Samsung Galaxy S26 Ultra | categoría Samsung |

**AirPods NO tiene foto.** `CATEGORIES` lo trae con `image: null`. `<Img>` renderiza el prop `fallback` en ese caso: usa un fondo degradado oscuro + icono de lucide + un halo dorado. **No pongas una foto de otro producto ahí.**

Logos: `LOGO` (lockup completo, 587x435, transparente), `LOGO_SM`, `LOGO_MARK` (marca circular 160x160: anillo plateado con la manzana — ideal para header compacto y elementos pequeños).

---

## 5. Datos de la tienda (reales, no cambiar)

- Nombre: **ITOMSTORE** — lema **"Tu mundo Apple"**
- WhatsApp: **+57 302 217 0654** (`BRAND.whatsapp` = `573022170654`)
- Barranquilla, Atlántico — domicilios y **pago contra entrega**
- Valledupar, Cesar — entregas disponibles
- Resto de Colombia — envíos nacionales
- Redes: `SOCIALS` tiene `url: null` en las tres → **renderiza el bloque como "próximamente" o no lo renderices; jamás enlaces a un perfil inventado.**

---

## 6. Responsive y accesibilidad

- Mobile-first. Breakpoints: base (móvil) → `sm:` 640 → `md:` 768 → `lg:` 1024 → `xl:` 1280.
- Áreas táctiles ≥ 44px. Los `.btn` ya miden 48px de alto (40px con `.btn-sm`).
- Toda imagen con `alt` descriptivo en español. Iconos decorativos: `aria-hidden`.
- Botones de solo icono: `aria-label` obligatorio.
- Capas (drawer/menu/buscador): `role="dialog"`, `aria-modal="true"`, cerrar con Escape (`useEscape`), bloquear scroll (`useLockScroll`), foco inicial dentro de la capa.
- Jerarquía: un solo `<h1>` por página; secciones con `<h2>`; usa `aria-labelledby` en `<section>` cuando aplique.
- Nada de `onClick` en `div`. Usa `<button>` o `<Link>`.
- Los enlaces externos (WhatsApp): `target="_blank" rel="noopener noreferrer"`.

## 7. Navegación (rutas que YA existen — enlaza solo a estas)

`/` · `/catalogo` · `/categoria/:id` (id ∈ iphone, macbook, ipad, watch, airpods, parlantes, accesorios, android) · `/producto/:id` · `/nosotros` · `/envios` · `/preguntas-frecuentes` · `/garantias` · `/permutas`

El catálogo lee de la URL: `?q=`, `?cat=`, `?estado=`, `?marca=`, `?orden=`.
Anclas de la home: `#categorias`, `#destacados`, `#permuta`, `#envios`, `#confianza`, `#proceso`.

## 8. Calidad de acabado

Detalles que se esperan: bordes suaves (`rounded-2xl`/`rounded-3xl`), glassmorphism muy sutil, halos dorados de baja opacidad, sombras profundas y naturales, transiciones de 300–800ms con `ease-premium`, skeletons al cargar, estados hover/focus en todo lo interactivo, y estados vacíos que **convierten** (siempre con un CTA a WhatsApp).

Evita: colores chillones, exceso de dorado, más de 2 animaciones simultáneas por sección, bordes por todos lados, sombras duras, texto sobre foto sin veladura.
