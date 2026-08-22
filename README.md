# ITOMSTORE — tienda web + panel de administración

Tienda virtual de tecnología y productos del ecosistema Apple.
Barranquilla, Atlántico · Colombia · WhatsApp **+57 302 217 0654**

**Una sola aplicación con dos niveles de acceso**, sobre una sola base de datos:

```
                    ITOMSTORE
                         │
                 ┌───────┴───────┐
                 │               │
             CLIENTE           ADMIN
                 │               │
              TIENDA          PANEL
                 /             /admin
                 │               │
                 └───────┬───────┘
                         │
                    /api  →  SQLite
```

React 18 · TypeScript · Vite · Tailwind CSS · react-router-dom
Node · Express · SQLite · JWT en cookie httpOnly · bcrypt

---

## Arrancar

```bash
npm install
npm run dev
```

Levanta **dos procesos a la vez**: la API en `:5257` y la web en `:5256`.
Abre <http://localhost:5256> — Vite redirige `/api` al servidor, así que para el navegador
todo es el mismo origen y la sesión funciona igual que en producción.

En producción es **un solo proceso**:

```bash
npm run build
npm start
```

`npm start` sirve la tienda, el panel y la API desde el mismo puerto (`:5257` por defecto, o el
que indique `PORT`).

| Comando | Qué hace |
|---|---|
| `npm run dev` | API + web en paralelo (desarrollo) |
| `npm run build` | sitemap + chequeo de tipos + build en `dist/` |
| `npm start` | un solo servidor: tienda + panel + API |
| `npm run qa` | recorre la tienda pública con Playwright |
| `npm run images` | reprocesa `assets-src/` → `public/img/` |

---

## Si el login del panel falla

El panel necesita **las dos piezas** vivas: la web en 5256 y la API en 5257.
`npm run dev` levanta ambas — mira su consola antes que nada.

| Lo que ves | Qué está pasando | Solución |
|---|---|---|
| `ERROR: el puerto 5257 ya esta ocupado` | otro proceso tiene el puerto, normalmente una API vieja que quedó viva | ciérralo, o arranca con `PORT=5357 npm start` |
| «La petición no llegó al servidor de ITOMSTORE» | la web responde pero la API no, o estás abriendo el puerto de otro proyecto | comprueba que la consola diga `ITOMSTORE API -> http://localhost:5257/api` y entra por <http://localhost:5256> |
| «Correo o contraseña incorrectos» | son las credenciales | las imprime la consola en el primer arranque |

Para ver qué proceso ocupa un puerto en Windows:

```bash
Get-NetTCPConnection -LocalPort 5257 -State Listen | Select-Object OwningProcess
```

---

## Entrar al panel

<http://localhost:5256/admin>

La primera vez que arranca, el servidor crea el administrador inicial y **lo imprime en la
consola**:

```
correo:     admin@itomstore.co
contraseña: ItomStore2026!
```

Al entrar, la aplicación **obliga a cambiar esa contraseña** antes de dejar hacer nada.
Puedes fijar otras credenciales iniciales con las variables `ADMIN_EMAIL` y `ADMIN_PASSWORD`
antes del primer arranque.

No hay ningún enlace al panel en la tienda: el cliente nunca ve que existe. Cuando hay sesión
abierta, y solo entonces, aparece un botón «Panel de administración» mientras se navega la tienda.

### Roles

| | Administrador | Editor |
|---|---|---|
| Productos, categorías, promociones, portada | ✅ | ✅ |
| Pedidos, permutas, clientes | ✅ | ✅ |
| Configuración de la empresa y SEO | ✅ | ❌ |
| Usuarios | ✅ | ❌ |

---

## Qué controla el panel

| Ruta | Qué gestiona |
|---|---|
| `/admin` | Panel con cifras reales, gráfica de pedidos y actividad |
| `/admin/productos` | Crear, editar, duplicar, publicar, destacar, eliminar. Precio y stock editables en la propia tabla |
| `/admin/inventario` | Stock, stock bajo y agotados |
| `/admin/categorias` | Crear, ordenar, activar, imagen e icono |
| `/admin/promociones` | Ofertas con fecha de inicio y fin; al caducar dejan de mostrarse solas |
| `/admin/pedidos` | Pedidos con sus 6 estados; al confirmar se descuenta el stock |
| `/admin/permutas` | Solicitudes de equipo usado, con su valoración y respuesta por WhatsApp |
| `/admin/clientes` | Fichas con pedidos y total comprado |
| `/admin/home` | Textos del héroe y qué secciones se ven en la portada |
| `/admin/configuracion` | Empresa, **WhatsApp**, redes sociales y cobertura de envíos |
| `/admin/seo` | Título y descripción de la portada |
| `/admin/usuarios` | Altas, roles y contraseñas |

**Todo lo que se cambia ahí se ve en la tienda sin tocar código.** Cambiar el número de WhatsApp
en `/admin/configuracion` lo cambia en el botón flotante, en cada producto y en el checkout del
carrito a la vez.

---

## Seguridad

La protección **no** consiste en esconder botones:

- Las contraseñas se guardan con **bcrypt** (coste 12). El hash nunca sale del servidor.
- La sesión viaja en una **cookie httpOnly + sameSite**: el token no es accesible desde
  JavaScript, así que un XSS no puede robarlo.
- **Cada ruta de escritura de `/api` valida sesión y rol en el servidor.** Aunque alguien saltara
  la interfaz, la API responde `401` o `403`.
- El login tiene freno a la fuerza bruta (8 intentos por IP cada 15 minutos) y da el mismo mensaje
  exista o no el correo.
- El secreto de firma se genera solo en `.env`, que está en `.gitignore`. La base de datos
  (`data/`) tampoco se sube al repositorio.
- Un administrador no puede eliminarse a sí mismo, ni quitarse el rol, ni dejar la tienda sin
  ningún administrador activo.

---

## Los datos

Todo vive en `data/itomstore.db` (SQLite). El esquema está en `server/db.mjs`.

La primera vez, `server/seed.mjs` **siembra la base** con el catálogo de `src/data/catalog.ts` y
la configuración de `src/lib/config.ts`. A partir de ahí la base manda: esos dos archivos quedan
solo como semilla y no se vuelven a leer salvo que borres la base.

Para empezar de cero: para el servidor, borra `data/itomstore.db` y vuelve a arrancar.

### Los productos

```
id · name · brand · category · description · price · oldPrice · condition
stock · sku · color · capacity · images · features · featured · published
createdAt · updatedAt
```

- `price: null` → la tienda muestra **«Precio a consultar»**. En cuanto pongas un número, la
  ficha, el carrito y el mensaje de WhatsApp calculan solos.
- `stock: null` → sin control de existencias, siempre disponible. Con `0` la tienda lo marca
  **agotado** y no deja agregarlo al carrito.
- `published: false` → borrador: no aparece en la tienda ni por su URL directa (responde 404).

---

## Decisiones de contenido

El sitio **no inventa información comercial**. Los materiales de la tienda no traían precios,
capacidades, garantías con plazos ni testimonios, así que nada de eso se inventó: donde falta un
dato, la interfaz lo dice y ofrece WhatsApp. El panel sigue el mismo criterio — si no hay pedidos,
el gráfico dice *«Todavía no hay suficientes datos para mostrar estadísticas»* en vez de dibujar
una curva falsa.

Tampoco se afirma que ITOMSTORE sea distribuidor, reseller o servicio técnico autorizado de
Apple, Bose, Beats o Samsung.

---

## Estructura

```
assets-src/            fotos originales de la tienda
public/img/            WebP generados + logo transparente + favicons + og
data/                  base de datos SQLite (ignorada por git)
server/
  index.mjs            Express: /api + la tienda construida
  db.mjs               esquema y utilidades
  seed.mjs             siembra inicial desde el catálogo
  auth.mjs             bcrypt, JWT, roles y límite de intentos
  routes/              auth, products, categories, orders, tradeins,
                       customers, promotions, settings, users, stats, media
scripts/
  process-images.mjs   pipeline de imágenes
  gen-sitemap.mjs      sitemap desde las rutas reales
  qa.mjs               QA de la tienda pública
  qa-admin.mjs         las 9 pruebas de aceptación del panel
src/
  admin/               panel completo (se descarga aparte: el cliente nunca lo carga)
  components/          tienda pública
  lib/
    api.ts             cliente HTTP
    shop.tsx           datos vivos de la tienda (productos, categorías, ajustes)
    auth.tsx           sesión y permisos
    store.tsx          carrito, buscador, avisos
  data/catalog.ts      SEMILLA del catálogo (ya no se edita: se edita en /admin)
  pages/               tienda pública
```

---

## Pruebas

```bash
npm run qa                      # tienda pública: 14 rutas × 4 viewports
node scripts/qa-admin.mjs       # las 9 pruebas de aceptación del panel
```

`qa-admin.mjs` comprueba de punta a punta: que el visitante no ve el panel, que `/admin` sin
sesión redirige al login, que la API responde 401, que un producto creado aparece en la tienda,
que el cambio de precio se refleja, que al despublicarlo desaparece, que el héroe y el WhatsApp
cambian en toda la web, y que al cerrar sesión vuelve a pedir autenticación.

---

## Despliegue

Con backend, el proyecto **necesita un host con Node** (Railway, Render, Fly.io, un VPS…).
Ya no sirve un hosting estático como Vercel sin funciones.

```bash
npm install --omit=dev && npm run build && npm start
```

Configura estas variables de entorno:

| Variable | Para qué |
|---|---|
| `PORT` | puerto (por defecto 5257) |
| `JWT_SECRET` | secreto de sesión (si no se define, se genera en `.env`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | credenciales del primer administrador |
| `NODE_ENV=production` | activa la cookie `secure` (requiere HTTPS) |

`data/` debe ser un volumen persistente: ahí vive la base de datos.

Después del primer despliegue, cambia la URL del sitio en `/admin/configuracion`: de ahí salen el
canonical, las etiquetas Open Graph y el JSON-LD.
