# ITOMSTORE — tienda web

Tienda virtual de tecnología y productos del ecosistema Apple.
Barranquilla, Atlántico · Colombia · WhatsApp **+57 302 217 0654**

React 18 · TypeScript · Vite · Tailwind CSS · react-router-dom

---

## Arrancar

```bash
npm install
npm run dev
```

Abre <http://localhost:5256>.

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run build` | chequeo de tipos + build de producción en `dist/` |
| `npm run preview` | sirve el build |
| `npm run images` | reprocesa `assets-src/` → `public/img/` + `src/data/images.json` |
| `npm run qa` | recorre el sitio con Playwright y reporta problemas |

---

## Cómo agregar o editar productos

Todo el catálogo vive en un solo archivo: **`src/data/catalog.ts`**.
No hay que tocar ningún componente.

```ts
{
  id: 'iphone-16-pro-negro',        // único, sin espacios. Es la URL: /producto/iphone-16-pro-negro
  name: 'iPhone 16 Pro',
  category: 'iphone',               // iphone | macbook | ipad | watch | airpods | parlantes | accesorios | android
  brand: 'Apple',
  price: 4890000,                   // pesos, sin puntos. null = "Precio a consultar"
  oldPrice: 5290000,                // null si no hay promoción. Activa el badge de descuento
  condition: 'nuevo',               // nuevo | seminuevo | usado
  capacity: '256GB',                // null si no está confirmado
  color: 'Titanio negro',
  images: ['iphone-pro-unidad'],    // claves de src/data/images.json (la primera es la principal)
  description: '...',
  features: ['Caja sellada'],       // solo lo que sea cierto
  available: true,
  featured: true,                   // aparece en "Productos destacados" de la home
  confirm: ['Precio vigente'],      // lo que se confirma por WhatsApp antes de comprar
}
```

**Al poner un `price`, la web se adapta sola**: la ficha muestra el valor, el carrito calcula el
subtotal y el total, y el mensaje de WhatsApp incluye los importes. Mientras `price` sea `null`
todo eso dice *"a consultar"*, que es como está hoy.

### Publicar equipos usados

Basta con agregar productos con `condition: 'usado'`. La sección "Nuevos y usados", el filtro
de estado y la ruta `/catalogo?estado=usado` empiezan a mostrarlos automáticamente. Mientras no
haya ninguno, esas vistas muestran un estado vacío que invita a escribir por WhatsApp.

### Agregar fotos

1. Deja el archivo en `assets-src/`.
2. Regístralo en el objeto `PHOTOS` de `scripts/process-images.mjs` con la clave que quieras usar.
3. `npm run images`.
4. Usa esa clave en `images: [...]` del producto o en `image` de la categoría.

El script genera WebP en varios anchos, un *placeholder* borroso y el `srcset`.
Nunca amplía los originales.

### Redes sociales

En `src/lib/config.ts`, `SOCIALS` tiene los tres perfiles con `url: null` — por eso los iconos
del footer aparecen apagados. Al poner una URL real, el icono se convierte solo en un enlace.

---

## La portada va al producto

La home es corta a propósito: **héroe → confianza → categorías → todo el catálogo → parlantes →
permutas → cobertura**. El catálogo completo aparece en la primera pantalla de scroll, con filtro
instantáneo por categoría, en lugar de esconderse detrás de secciones informativas.

Todo lo que es texto de apoyo —quiénes somos, cómo compras, envíos, garantías, permutas,
preguntas frecuentes— vive en sus propias páginas (`/nosotros`, `/envios`,
`/preguntas-frecuentes`, `/garantias`, `/permutas`), enlazadas desde el pie. Así la portada
vende y las páginas informan.

---

## Decisiones de contenido

El sitio **no inventa información comercial**. No hay precios, capacidades, garantías con plazos,
testimonios, contadores de clientes ni horarios, porque nada de eso venía en los materiales de la
tienda. Donde falta un dato, la interfaz lo dice y ofrece WhatsApp.

Tampoco se afirma en ninguna parte que ITOMSTORE sea distribuidor, reseller o servicio técnico
autorizado de Apple, Bose, Beats o Samsung. El footer y la sección de confianza llevan el aviso
de marcas independientes.

---

## Estructura

```
assets-src/            fotos originales de la tienda
public/img/            WebP generados + logo transparente + favicons + og
scripts/
  process-images.mjs   pipeline de imágenes
  qa.mjs               QA con Playwright
src/
  components/
    layout/            Header, MobileMenu, Footer, Preloader, WhatsAppFab
    home/              Hero, TrustBar, CategoryGrid, ProductsGrid, BoseBand, TradeIn, Shipping
    cart/              CartDrawer
    search/            SearchOverlay
    ui/                Img, Reveal, SectionHead, ProductCard, ConditionBadge, EmptyState, Toasts, Wordmark
  data/
    catalog.ts         PRODUCTOS Y CATEGORÍAS  ← se edita aquí
    nav.ts             menús
    images.json        generado por el pipeline
  lib/
    config.ts          datos de la tienda (WhatsApp, ciudades, redes)
    whatsapp.ts        constructores de mensajes
    filters.ts         búsqueda y filtros
    store.tsx          carrito, buscador, toasts
    format.ts          pesos colombianos
    seo.ts             meta por ruta
  pages/               Home, Catalog, CategoryPage, ProductPage, InfoPage, NotFound
```

---

## Despliegue

`vercel.json` ya reescribe todas las rutas a `index.html` (necesario para el enrutado del lado
del cliente) y cachea `/img` y `/assets` de forma permanente.

```bash
npx vercel deploy --prod --yes
```

Después del primer despliegue, cambia `BRAND.url` en `src/lib/config.ts` y las URLs absolutas de
`index.html` (canonical, Open Graph y JSON-LD) por el dominio definitivo.
