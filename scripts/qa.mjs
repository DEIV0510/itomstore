/**
 * QA automatizado de ITOMSTORE.
 * Recorre todas las rutas en 3 viewports y verifica lo que exige el control de calidad:
 * errores de consola, scroll horizontal, imagenes rotas, enlaces muertos, jerarquia de titulos,
 * areas tactiles, y las interacciones clave (menu, buscador, filtros, carrito, WhatsApp).
 *
 *   node scripts/qa.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://localhost:5256'
const SHOTS = 'qa-shots'
fs.mkdirSync(SHOTS, { recursive: true })

const ROUTES = [
  ['/', 'home'],
  ['/catalogo', 'catalogo'],
  ['/catalogo?estado=usado', 'catalogo-usados'],
  ['/categoria/iphone', 'cat-iphone'],
  ['/categoria/airpods', 'cat-airpods'],
  ['/categoria/parlantes', 'cat-parlantes'],
  ['/producto/iphone-17-pro-max-plata', 'prod-iphone'],
  ['/producto/bose-s1-pro-plus', 'prod-bose'],
  ['/nosotros', 'nosotros'],
  ['/envios', 'envios'],
  ['/preguntas-frecuentes', 'faq'],
  ['/garantias', 'garantias'],
  ['/permutas', 'permutas'],
  ['/ruta-que-no-existe', '404'],
]

const VIEWPORTS = [
  { name: 'movil', width: 375, height: 812, isMobile: true },
  { name: 'movil-xs', width: 320, height: 700, isMobile: true },
  { name: 'tablet', width: 768, height: 1024, isMobile: false },
  { name: 'desktop', width: 1440, height: 900, isMobile: false },
]

const problems = []
const notes = []
const fail = (scope, msg) => problems.push(`[${scope}] ${msg}`)

/** Espera a que el preloader termine y la pagina este estable. */
async function settle(page) {
  await page.waitForLoadState('domcontentloaded')
  try {
    await page.waitForFunction(() => !document.querySelector('[data-preloader]'), { timeout: 4000 })
  } catch {
    /* el preloader puede no existir en navegaciones internas */
  }
  await page.waitForTimeout(500)
  // dispara los reveal y carga las imagenes diferidas
    await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0
      const step = () => {
        y += window.innerHeight * 0.6
        window.scrollTo(0, y)
        if (y < document.body.scrollHeight) setTimeout(step, 120)
        else {
          window.scrollTo(0, 0)
          setTimeout(res, 400)
        }
      }
      step()
    })
  })
  await page.waitForTimeout(400)
  // espera real a que las imagenes diferidas terminen de decodificar
  await page
    .evaluate(
      () =>
        Promise.all(
          [...document.images].map((i) =>
            i.complete ? Promise.resolve() : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }) })
          )
        )
    )
    .catch(() => {})
  await page.waitForTimeout(500)
}

async function checkPage(page, route, slug, vp) {
  const scope = `${slug} @ ${vp.name}`

  // --- scroll horizontal: se mide el desplazamiento REAL, no solo scrollWidth ---
  const realScroll = await page.evaluate(() => {
    const before = window.scrollX
    window.scrollTo(1200, window.scrollY)
    const moved = window.scrollX
    window.scrollTo(before, window.scrollY)
    return moved
  })
  if (realScroll > 0) fail(scope, `la pagina SI se desplaza horizontalmente: scrollX = ${realScroll}px`)

  // --- scroll horizontal (diagnostico del culpable) ---
  const overflow = await page.evaluate(() => {
    const de = document.documentElement
    const extra = de.scrollWidth - de.clientWidth
    if (extra <= 1) return null
    const guilty = []
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0) continue
      if (r.right > de.clientWidth + 2 || r.left < -2) {
        const st = getComputedStyle(el)
        if (st.position === 'fixed') continue
        guilty.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 70)} (${Math.round(r.left)}..${Math.round(r.right)})`)
      }
      if (guilty.length >= 4) break
    }
    return { extra, guilty }
  })
  if (overflow) fail(scope, `scroll horizontal: sobran ${overflow.extra}px -> ${overflow.guilty.join(' | ')}`)

  // --- imagenes rotas o sin alt ---
  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll('img')].map((i) => ({
      src: i.currentSrc || i.src,
      ok: i.complete && i.naturalWidth > 0,
      alt: i.getAttribute('alt'),
      decorative: i.getAttribute('aria-hidden') === 'true' || !!i.closest('[aria-hidden=\"true\"]'),
      lazy: i.loading,
    }))
  )
  for (const i of imgs) {
    if (!i.ok) fail(scope, `imagen rota: ${i.src}`)
    if (i.alt === null) fail(scope, `imagen sin atributo alt: ${i.src}`)
    else if (i.alt.trim() === '' && !i.decorative) fail(scope, `imagen con alt vacio sin aria-hidden: ${i.src}`)
  }

  // --- enlaces ---
  const links = await page.evaluate(() =>
    [...document.querySelectorAll('a')].map((a) => ({
      href: a.getAttribute('href') || '',
      text: (a.textContent || '').trim().slice(0, 40),
      target: a.getAttribute('target'),
      rel: a.getAttribute('rel') || '',
      label: a.getAttribute('aria-label') || '',
    }))
  )
  for (const l of links) {
    if (l.href === '#' || l.href === '') fail(scope, `enlace muerto ("${l.text || l.label}")`)
    if (l.target === '_blank' && !l.rel.includes('noopener')) fail(scope, `target=_blank sin noopener: ${l.href}`)
    if (!l.text && !l.label) fail(scope, `enlace sin texto ni aria-label: ${l.href}`)
  }

  // --- botones sin nombre accesible ---
  const badButtons = await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'))
      .map((b) => String(b.className).slice(0, 60))
  )
  for (const b of badButtons) fail(scope, `boton sin nombre accesible: .${b}`)

  // --- jerarquia de encabezados ---
  const h1 = await page.locator('h1').count()
  if (h1 === 0) fail(scope, 'no hay <h1>')
  if (h1 > 1) fail(scope, `${h1} elementos <h1> (debe haber uno)`)

  // --- areas tactiles en movil ---
  if (vp.isMobile) {
    const small = await page.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll('a, button, [role="button"], input, select')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (getComputedStyle(el).display === 'none') continue
        if (r.height < 36 || r.width < 24) {
          out.push(`${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28)}" ${Math.round(r.width)}x${Math.round(r.height)}`)
        }
        if (out.length >= 6) break
      }
      return out
    })
    for (const s of small) notes.push(`[${scope}] area tactil pequena: ${s}`)
  }

  // --- SEO basico ---
  const seo = await page.evaluate(() => ({
    title: document.title,
    desc: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
  }))
  if (!seo.title || seo.title.length < 15) fail(scope, `title pobre: "${seo.title}"`)
  if (!seo.desc || seo.desc.length < 60) fail(scope, `meta description pobre (${seo.desc.length} chars)`)
  if (!seo.canonical) fail(scope, 'sin canonical')

  await page.screenshot({ path: `${SHOTS}/${slug}-${vp.name}.png`, fullPage: vp.name === 'desktop' })
}

async function interactions(browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await settle(page)

  // 1. menu hamburguesa
  const burger = page.locator('header button').filter({ hasText: '' }).first()
  const menuBtn = page.getByRole('button', { name: /men/i }).first()
  const target = (await menuBtn.count()) ? menuBtn : burger
  if (await target.count()) {
    await target.click()
    await page.waitForTimeout(600)
    const dialog = await page.locator('[role="dialog"]').count()
    if (!dialog) fail('interaccion', 'el menu movil no abrio un [role=dialog]')
    else {
      await page.screenshot({ path: `${SHOTS}/ix-menu.png` })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(450)
      if (await page.locator('[role="dialog"]').count()) fail('interaccion', 'el menu movil no cierra con Escape')
    }
  } else fail('interaccion', 'no se encontro el boton de menu movil')

  // 2. buscador
  const search = page.getByRole('button', { name: /buscar/i }).first()
  if (await search.count()) {
    await search.click()
    await page.waitForTimeout(500)
    const input = page.locator('input[type="search"], input[placeholder*="Buscar" i]').first()
    if (!(await input.count())) fail('interaccion', 'el buscador no muestra un input')
    else {
      await input.fill('iphone')
      await page.waitForTimeout(600)
      const results = await page.locator('[role="option"], a[href^="/producto/"]').count()
      if (results === 0) fail('interaccion', 'la busqueda "iphone" no devolvio resultados')
      await page.screenshot({ path: `${SHOTS}/ix-buscador.png` })
      await input.fill('zzzzqqq')
      await page.waitForTimeout(600)
      await page.screenshot({ path: `${SHOTS}/ix-buscador-vacio.png` })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }
  } else fail('interaccion', 'no se encontro el boton de buscar')

  // 3. agregar al carrito desde una ficha
  await page.goto(BASE + '/producto/bose-s1-pro-plus', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const addBtn = page.getByRole('button', { name: /agregar al carrito/i }).first()
  if (await addBtn.count()) {
    await addBtn.click()
    await page.waitForTimeout(900)
    const drawer = page.locator('[role="dialog"]')
    if (!(await drawer.count())) fail('interaccion', 'agregar al carrito no abrio el carrito')
    await page.screenshot({ path: `${SHOTS}/ix-carrito.png` })

    // el CTA de WhatsApp debe llevar el pedido
    const waLink = page.locator('a[href*="wa.me"]').filter({ hasText: /finalizar/i }).first()
    if (!(await waLink.count())) fail('interaccion', 'el carrito no tiene el CTA de finalizar por WhatsApp')
    else {
      const href = await waLink.getAttribute('href')
      if (!href?.includes('573022170654')) fail('interaccion', 'el checkout no apunta al WhatsApp de la tienda')
      const txt = decodeURIComponent(href || '')
      if (!/bose/i.test(txt)) fail('interaccion', 'el mensaje de checkout no incluye el producto')
      notes.push('[interaccion] mensaje de checkout: ' + txt.split('text=')[1]?.slice(0, 180).replace(/\n/g, ' | '))
    }
    // persistencia
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await settle(page)
    const badge = await page.locator('header').textContent()
    if (!/1/.test(badge || '')) notes.push('[interaccion] revisar: el contador del carrito no se ve tras recargar')
  } else fail('interaccion', 'no se encontro el boton "Agregar al carrito" en la ficha')

  // 4. filtros del catalogo
  await page.goto(BASE + '/catalogo', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const before = await page.locator('a[href^="/producto/"]').count()
  await page.goto(BASE + '/catalogo?cat=parlantes', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const after = await page.locator('a[href^="/producto/"]').count()
  if (after >= before) fail('interaccion', `el filtro por categoria no reduce resultados (${before} -> ${after})`)
  await page.screenshot({ path: `${SHOTS}/ix-filtros.png` })

  // 5. busqueda por URL sin resultados -> estado vacio con CTA
  await page.goto(BASE + '/catalogo?q=zzzzqqq', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const emptyCta = await page.locator('a[href*="wa.me"]').count()
  if (emptyCta === 0) fail('interaccion', 'el estado vacio del catalogo no ofrece WhatsApp')
  await page.screenshot({ path: `${SHOTS}/ix-vacio.png` })

  // 6. todos los enlaces de WhatsApp del sitio apuntan al numero real
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await settle(page)
  const waHrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[href*="wa.me"]')].map((a) => a.getAttribute('href') || '')
  )
  if (!waHrefs.length) fail('interaccion', 'la home no tiene enlaces de WhatsApp')
  for (const h of waHrefs) {
    if (!h.includes('573022170654')) fail('interaccion', `enlace de WhatsApp con numero incorrecto: ${h.slice(0, 90)}`)
    if (!h.includes('text=')) fail('interaccion', `enlace de WhatsApp sin mensaje predeterminado: ${h.slice(0, 90)}`)
  }
  notes.push(`[interaccion] ${waHrefs.length} enlaces de WhatsApp en la home, todos con mensaje`)

  if (errors.length) for (const e of errors) fail('consola', e.slice(0, 220))
  await ctx.close()
}

const browser = await chromium.launch()
console.log(`QA ITOMSTORE -> ${BASE}\n`)

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    deviceScaleFactor: vp.isMobile ? 2 : 1,
  })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message))
  page.on('requestfailed', (r) => {
    const u = r.url()
    if (!u.includes('fonts.g')) errs.push(`peticion fallida: ${u.slice(0, 110)}`)
  })

  for (const [route, slug] of ROUTES) {
    process.stdout.write(`  ${vp.name.padEnd(10)} ${route}\n`)
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded' })
    await settle(page)
    await checkPage(page, route, slug, vp)
  }
  for (const e of errs) fail(`consola @ ${vp.name}`, e.slice(0, 220))
  await ctx.close()
}

console.log('\nInteracciones...')
await interactions(browser)
await browser.close()

console.log('\n' + '='.repeat(72))
if (notes.length) {
  console.log('\nNOTAS (' + notes.length + ')')
  notes.forEach((n) => console.log('  · ' + n))
}
if (problems.length === 0) {
  console.log('\nSIN PROBLEMAS. Capturas en ' + SHOTS + '/')
} else {
  console.log('\nPROBLEMAS (' + problems.length + ')')
  const seen = new Set()
  for (const p of problems) {
    if (seen.has(p)) continue
    seen.add(p)
    console.log('  X ' + p)
  }
  console.log('\nTotal unicos: ' + seen.size)
  process.exitCode = 1
}
