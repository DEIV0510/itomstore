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
                    /api  →  libSQL
```

React 18 · TypeScript · Vite · Tailwind CSS · react-router-dom
Node · Express · libSQL (SQLite / Turso) · JWT en cookie httpOnly · bcrypt

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

La base es **libSQL**: el mismo SQL de siempre, pero con un cliente que puede hablar con un
archivo local **o** con una base remota (Turso), según qué variables de entorno encuentre:

| Entorno | Dónde vive la base | Variables |
|---|---|---|
| Local (`npm run dev`) | `data/itomstore.db`, un archivo en disco | ninguna: es el valor por defecto |
| Producción en Vercel | Turso (remota) | `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` |
| Producción en Railway/Render/VPS | archivo local en un volumen persistente, **o** Turso | igual que arriba: si defines las dos variables de Turso, las usa; si no, usa un archivo |

Esto existe porque las funciones serverless de Vercel tienen disco de solo lectura y no comparten
archivos entre invocaciones: un SQLite en archivo ahí perdería datos. En cualquier host con
proceso persistente (Railway, un VPS) el archivo local funciona igual de bien que siempre.

El esquema está en `server/db.mjs`. La primera vez, `server/seed.mjs` **siembra la base** con el
catálogo de `src/data/catalog.ts` y la configuración de `src/lib/config.ts`. A partir de ahí la
base manda: esos dos archivos quedan solo como semilla y no se vuelven a leer salvo que la base
esté vacía.

Para empezar de cero en local: para el servidor, borra la carpeta `data/` y vuelve a arrancar.

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
data/                  base de datos local en archivo (ignorada por git; no existe si usas Turso)
api/
  index.mjs            punto de entrada de Vercel: la misma app, como funcion serverless
server/
  app.mjs              arma la app Express (rutas, middleware, siembra) sin arrancar el puerto
  index.mjs            arranque tradicional: usa app.mjs y llama a .listen()
  db.mjs               cliente libSQL (archivo local o Turso) + esquema + utilidades
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

### Opción A — Vercel (con Turso)

El proyecto ya está preparado para Vercel: `api/index.mjs` expone toda la API como una función
serverless y `vercel.json` reescribe `/api/*` hacia ahí y todo lo demás hacia la tienda.
Como el disco de una función serverless es efímero, la base de datos tiene que ser remota:
[Turso](https://turso.tech) (gratis para este tamaño de tienda, compatible con SQLite).

**1. Crea la base de datos** (una vez, dos minutos):

```bash
curl -sSfL https://get.tur.so/install.sh | bash   # instala el CLI (o descárgalo desde turso.tech)
turso auth signup                                  # o `turso auth login` si ya tienes cuenta
turso db create itomstore
turso db show itomstore --url                      # copia esta URL -> TURSO_DATABASE_URL
turso db tokens create itomstore                    # copia este token -> TURSO_AUTH_TOKEN
```

Si prefieres no usar la terminal, el [dashboard de Turso](https://turso.tech) ofrece los mismos
tres datos (crear base, ver URL, crear token) con clics.

**2. Configura las variables de entorno en Vercel** (Project Settings → Environment Variables,
o por CLI):

```bash
vercel env add TURSO_DATABASE_URL production
vercel env add TURSO_AUTH_TOKEN production
vercel env add JWT_SECRET production      # cualquier cadena larga y aleatoria
vercel env add ADMIN_EMAIL production     # opcional: si no, usa admin@itomstore.co
vercel env add ADMIN_PASSWORD production  # opcional: si no, usa la de scripts/seed.mjs
```

**3. Despliega:**

```bash
vercel deploy --prod
```

La primera petición a la API siembra la base de Turso automáticamente (mismo `seed.mjs` de
siempre). Entra a `/admin`, inicia sesión con las credenciales que imprimió el primer arranque
en local (o las que hayas puesto en `ADMIN_EMAIL`/`ADMIN_PASSWORD`) y cambia la contraseña.

**Limitación conocida:** subir una foto nueva desde `/admin/productos` no funciona todavía en
Vercel (el disco de la función es de solo lectura). El formulario avisa con un mensaje claro en
vez de fallar en silencio. Las fotos del catálogo ya sembrado siguen funcionando con normalidad:
lo que no funciona es agregar una imagen que no exista ya en `public/img`. Para habilitarlo hay
que conectar un almacenamiento como [Vercel Blob](https://vercel.com/docs/storage/vercel-blob).

### Opción B — Railway / Render / un VPS (con archivo local)

Si prefieres no depender de Turso, cualquier host que mantenga un proceso vivo con disco
persistente sirve tal cual, sin tocar código:

```bash
npm install --omit=dev && npm run build && npm start
```

| Variable | Para qué |
|---|---|
| `PORT` | puerto (por defecto 5257) |
| `JWT_SECRET` | secreto de sesión (si no se define, se genera en `.env`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | credenciales del primer administrador |
| `NODE_ENV=production` | activa la cookie `secure` (requiere HTTPS) |

`data/` debe ser un volumen persistente: ahí vive la base de datos si no defines las variables
de Turso. Las subidas de imágenes SÍ funcionan aquí (el disco es persistente).

### En cualquiera de las dos

Después del primer despliegue, cambia la URL del sitio en `/admin/configuracion`: de ahí salen el
canonical, las etiquetas Open Graph y el JSON-LD.
