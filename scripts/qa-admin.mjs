/**
 * Pruebas de aceptacion de ITOMSTORE: las 9 que pidio el cliente.
 * Recorren la tienda publica y el panel con un navegador real.
 *
 *   node scripts/qa-admin.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://localhost:5257'
const EMAIL = process.env.ADMIN_EMAIL || 'admin@itomstore.co'
const PASS = process.env.ADMIN_PASSWORD || 'ItomStore2026!'
const SHOTS = 'qa-shots'
fs.mkdirSync(SHOTS, { recursive: true })

const results = []
const ok = (n, msg) => results.push({ n, pass: true, msg })
const bad = (n, msg) => results.push({ n, pass: false, msg })

async function settle(page, ms = 900) {
  await page.waitForLoadState('domcontentloaded')
  try {
    await page.waitForFunction(() => !document.querySelector('[data-preloader]'), { timeout: 5000 })
  } catch {
    /* el preloader ya no estaba */
  }
  await page.waitForTimeout(ms)
}

const browser = await chromium.launch()

/* ===================================================================
   PRUEBA 1 — el visitante usa la tienda con normalidad
   =================================================================== */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await settle(page, 2200)

  const cards = await page.locator('a[href^="/producto/"]').count()
  cards > 0 ? ok(1, `la portada muestra productos (${cards} enlaces)`) : bad(1, 'la portada no muestra productos')

  const adminVisible = await page.locator('a[href="/admin"], a[href^="/admin/"]').count()
  adminVisible === 0
    ? ok(1, 'el visitante NO ve ningun acceso al panel')
    : bad(1, `el visitante ve ${adminVisible} enlaces al panel`)

  await page.goto(BASE + '/catalogo', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const enCatalogo = await page.locator('a[href^="/producto/"]').count()
  enCatalogo > 0 ? ok(1, `el catalogo carga (${enCatalogo} productos)`) : bad(1, 'el catalogo salio vacio')

  errors.length ? bad(1, 'errores de consola: ' + errors.slice(0, 2).join(' | ')) : ok(1, 'sin errores de consola')
  await page.screenshot({ path: `${SHOTS}/adm-01-tienda.png`, fullPage: false })
  await ctx.close()
}

/* ===================================================================
   PRUEBA 2 — /admin sin sesion redirige al login
   PRUEBA 7 (parte) — una ruta interna tambien
   =================================================================== */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()

  for (const ruta of ['/admin', '/admin/productos', '/admin/usuarios']) {
    await page.goto(BASE + ruta, { waitUntil: 'domcontentloaded' })
    await settle(page)
    const url = page.url()
    url.includes('/admin/login')
      ? ok(2, `${ruta} sin sesion -> login`)
      : bad(2, `${ruta} sin sesion NO redirige (quedo en ${url})`)
  }

  // y la API tampoco cede
  const r = await page.request.get(BASE + '/api/users')
  r.status() === 401 ? ok(2, 'la API responde 401 sin sesion') : bad(2, `la API respondio ${r.status()}`)
  await page.screenshot({ path: `${SHOTS}/adm-02-login.png` })
  await ctx.close()
}

/* ===================================================================
   PRUEBAS 3 a 8 — sesion de administrador
   =================================================================== */
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } })
const page = await ctx.newPage()
const adminErrors = []
page.on('pageerror', (e) => adminErrors.push(e.message))
page.on('console', (m) => m.type() === 'error' && adminErrors.push(m.text()))

// --- PRUEBA 3: entrar como administrador
await page.goto(BASE + '/admin/login', { waitUntil: 'domcontentloaded' })
await settle(page)
await page.fill('input[type="email"]', EMAIL)
await page.fill('input[type="password"]', PASS)
await page.getByRole('button', { name: /entrar/i }).first().click()
await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 15000 }).catch(() => {})
await settle(page, 1500)

// el primer acceso obliga a cambiar la contraseña
const forced = await page.locator('text=/contraseña actual/i').count()
if (forced > 0) {
  ok(3, 'el primer acceso exige cambiar la contraseña')
  const inputs = page.locator('[role="dialog"] input[type="password"]')
  await inputs.nth(0).fill(PASS)
  await inputs.nth(1).fill('ItomStoreSegura2026')
  await page.locator('[role="dialog"]').getByRole('button', { name: /guardar|cambiar|actualizar/i }).first().click()
  await page.waitForTimeout(2000)
}

const enPanel = page.url().includes('/admin') && !page.url().includes('/login')
enPanel ? ok(3, 'el administrador entra a /admin') : bad(3, `no entro al panel (${page.url()})`)
await page.screenshot({ path: `${SHOTS}/adm-03-panel.png` })

// --- PRUEBA 4: crear producto y verlo en la tienda
const NOMBRE = 'Producto de prueba QA'
const creado = await page.evaluate(async (name) => {
  const res = await fetch('/api/products', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      brand: 'QA',
      category: 'accesorios',
      description: 'Producto temporal creado por la prueba automatica.',
      price: 1234000,
      condition: 'nuevo',
      stock: 5,
      images: ['beats-fundas'],
      features: ['Prueba'],
      published: true,
    }),
  })
  const data = await res.json()
  return { status: res.status, id: data?.product?.id, error: data?.error }
}, NOMBRE)

if (creado.status !== 201) {
  bad(4, `no se pudo crear el producto: ${creado.error ?? creado.status}`)
} else {
  ok(4, `producto creado (${creado.id})`)
  const guest = await browser.newContext()
  const gp = await guest.newPage()
  await gp.goto(`${BASE}/producto/${creado.id}`, { waitUntil: 'domcontentloaded' })
  await settle(gp, 1600)
  const visible = await gp.locator(`text=${NOMBRE}`).count()
  visible > 0 ? ok(4, 'el producto nuevo aparece en la tienda') : bad(4, 'el producto nuevo NO aparece en la tienda')

  // --- PRUEBA 5: cambiar el precio
  await page.evaluate(async (id) => {
    await fetch('/api/products/' + id, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 999000 }),
    })
  }, creado.id)
  await gp.reload({ waitUntil: 'domcontentloaded' })
  await settle(gp, 1600)
  const txt = (await gp.locator('main').innerText()).replace(/\s/g, ' ')
  const precioNuevo = new RegExp('999\\.?000').test(txt)
  precioNuevo ? ok(5, 'el precio nuevo se ve en la tienda') : bad(5, 'el precio no se actualizo en la tienda')

  // --- PRUEBA 6: desactivar el producto
  await page.evaluate(async (id) => {
    await fetch('/api/products/' + id, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: false }),
    })
  }, creado.id)
  const anon = await gp.request.get(`${BASE}/api/products/${creado.id}`)
  anon.status() === 404
    ? ok(6, 'el producto despublicado deja de existir para el visitante (404)')
    : bad(6, `el producto despublicado sigue accesible (${anon.status()})`)

  const lista = await (await gp.request.get(`${BASE}/api/products`)).json()
  lista.products.some((p) => p.id === creado.id)
    ? bad(6, 'el producto despublicado sigue en el listado publico')
    : ok(6, 'el producto despublicado no aparece en el listado publico')

  await guest.close()

  // limpieza
  await page.evaluate(
    async (id) => fetch('/api/products/' + id, { method: 'DELETE', credentials: 'include' }),
    creado.id
  )
}

// --- PRUEBA 7: cambiar el hero de la portada
const HERO = 'TITULAR DE PRUEBA QA'
const heroRes = await page.evaluate(async (titulo) => {
  const actual = await (await fetch('/api/settings')).json()
  const res = await fetch('/api/settings/home', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...actual.home, heroTitle: titulo }),
  })
  return { status: res.status, previo: actual.home.heroTitle }
}, HERO)

if (heroRes.status !== 200) {
  bad(7, `no se pudo cambiar el hero (${heroRes.status})`)
} else {
  const guest = await browser.newContext()
  const gp = await guest.newPage()
  await gp.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await settle(gp, 2200)
  const h1 = await gp.locator('h1').first().innerText()
  h1.includes(HERO) ? ok(7, 'el titular nuevo se ve en la portada') : bad(7, `la portada sigue mostrando "${h1.slice(0, 40)}"`)
  await gp.screenshot({ path: `${SHOTS}/adm-07-hero.png` })
  await guest.close()

  // se deja como estaba
  await page.evaluate(async (previo) => {
    const actual = await (await fetch('/api/settings')).json()
    await fetch('/api/settings/home', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...actual.home, heroTitle: previo }),
    })
  }, heroRes.previo)
}

// --- PRUEBA 8: cambiar el WhatsApp y ver que cambia en toda la web
const NUEVO_WA = '573001112233'
const waRes = await page.evaluate(async (numero) => {
  const actual = await (await fetch('/api/settings')).json()
  const res = await fetch('/api/settings/brand', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...actual.brand, whatsapp: numero }),
  })
  const data = await res.json()
  return { status: res.status, previo: actual.brand.whatsapp, guardado: data?.value?.whatsapp ?? data?.brand?.whatsapp }
}, NUEVO_WA)

if (waRes.status !== 200) {
  bad(8, `no se pudo cambiar el WhatsApp (${waRes.status})`)
} else {
  const guest = await browser.newContext()
  const gp = await guest.newPage()
  await gp.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await settle(gp, 2200)
  const hrefs = await gp.evaluate(() =>
    [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.getAttribute('href') || '')
  )
  const viejos = hrefs.filter((h) => h.includes('573022170654')).length
  const nuevos = hrefs.filter((h) => h.includes(NUEVO_WA)).length
  nuevos > 0 && viejos === 0
    ? ok(8, `los ${hrefs.length} enlaces de WhatsApp usan el numero nuevo`)
    : bad(8, `enlaces con el numero nuevo: ${nuevos}, con el viejo: ${viejos}`)
  await guest.close()

  await page.evaluate(async (previo) => {
    const actual = await (await fetch('/api/settings')).json()
    await fetch('/api/settings/brand', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...actual.brand, whatsapp: previo }),
    })
  }, waRes.previo)
}

// --- PRUEBA 9: cerrar sesion y volver a /admin
await page.goto(BASE + '/admin', { waitUntil: 'domcontentloaded' })
await settle(page, 1200)
const salir = page.getByRole('button', { name: /cerrar sesión/i }).first()
if (await salir.count()) {
  await salir.click()
  await page.waitForTimeout(1800)
  await page.goto(BASE + '/admin/productos', { waitUntil: 'domcontentloaded' })
  await settle(page, 1200)
  page.url().includes('/admin/login')
    ? ok(9, 'tras cerrar sesion, /admin vuelve a pedir autenticacion')
    : bad(9, `tras cerrar sesion sigue entrando (${page.url()})`)
} else {
  bad(9, 'no se encontro el boton de cerrar sesion')
}

adminErrors.length
  ? bad(3, 'errores de consola en el panel: ' + adminErrors.slice(0, 3).join(' | '))
  : ok(3, 'panel sin errores de consola')

await ctx.close()
await browser.close()

/* ------------------------------------------------------------- informe */
console.log('\n' + '='.repeat(70))
console.log('PRUEBAS DE ACEPTACION — ITOMSTORE\n')
let fails = 0
for (const r of results) {
  if (!r.pass) fails++
  console.log(`  ${r.pass ? 'OK  ' : 'FALLA'}  [prueba ${r.n}] ${r.msg}`)
}
console.log('\n' + '='.repeat(70))
console.log(fails === 0 ? `\nTODAS PASAN (${results.length} comprobaciones)\n` : `\n${fails} FALLAS de ${results.length}\n`)
process.exitCode = fails === 0 ? 0 : 1
