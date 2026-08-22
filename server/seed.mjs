/**
 * Semilla inicial: pasa el catalogo y la configuracion que hoy viven en
 * src/data/catalog.ts y src/lib/config.ts a la base de datos.
 *
 * Solo escribe si la tabla esta vacia: nunca pisa lo que el administrador
 * haya cambiado despues desde /admin.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { build } from 'esbuild'
import { db, setSetting, getSetting } from './db.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Compila un modulo TS de solo datos y lo importa. */
async function loadTs(rel) {
  const out = await build({
    entryPoints: [path.join(ROOT, rel)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    external: ['@/*'],
    logLevel: 'silent',
  })
  const code = out.outputFiles[0].text
  const tmp = path.join(ROOT, 'data', `.seed-${path.basename(rel)}.mjs`)
  fs.writeFileSync(tmp, code)
  try {
    return await import(`file://${tmp}?t=${Date.now()}`)
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

export async function seed() {
  const nCats = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n
  const nProds = db.prepare('SELECT COUNT(*) AS n FROM products').get().n
  const nUsers = db.prepare('SELECT COUNT(*) AS n FROM users').get().n

  /* ---------------------------------------------------- catalogo inicial */
  if (nCats === 0 || nProds === 0) {
    const { CATEGORIES, PRODUCTS } = await loadTs('src/data/catalog.ts')

    const insCat = db.prepare(
      `INSERT OR IGNORE INTO categories (id, name, short, blurb, image, icon, sort, active)
       VALUES (@id, @name, @short, @blurb, @image, @icon, @sort, 1)`
    )
    const insProd = db.prepare(
      `INSERT OR IGNORE INTO products
        (id, name, brand, category, description, price, old_price, condition, stock, sku,
         color, capacity, images, features, confirm, featured, published, sort)
       VALUES
        (@id, @name, @brand, @category, @description, @price, @old_price, @condition, @stock, @sku,
         @color, @capacity, @images, @features, @confirm, @featured, 1, @sort)`
    )

    db.transaction(() => {
      if (nCats === 0) {
        CATEGORIES.forEach((c, i) =>
          insCat.run({ id: c.id, name: c.name, short: c.short, blurb: c.blurb, image: c.image, icon: c.icon, sort: i })
        )
      }
      if (nProds === 0) {
        PRODUCTS.forEach((p, i) =>
          insProd.run({
            id: p.id,
            name: p.name,
            brand: p.brand,
            category: p.category,
            description: p.description,
            price: p.price,
            old_price: p.oldPrice,
            condition: p.condition,
            // no inventamos existencias: el stock queda sin definir hasta que el admin lo cargue
            stock: null,
            sku: null,
            color: p.color,
            capacity: p.capacity,
            images: JSON.stringify(p.images ?? []),
            features: JSON.stringify(p.features ?? []),
            confirm: JSON.stringify(p.confirm ?? []),
            featured: p.featured ? 1 : 0,
            sort: i,
          })
        )
      }
    })()
    console.log(`  semilla: ${CATEGORIES.length} categorias, ${PRODUCTS.length} productos`)
  }

  /* ------------------------------------------------ configuracion global */
  if (getSetting('brand') === null) {
    const { BRAND, SOCIALS, COVERAGE } = await loadTs('src/lib/config.ts')
    setSetting('brand', {
      name: BRAND.name,
      wordmark: BRAND.wordmark,
      tagline: BRAND.tagline,
      city: BRAND.city,
      region: BRAND.region,
      country: BRAND.country,
      whatsapp: BRAND.whatsapp,
      whatsappDisplay: BRAND.whatsappDisplay,
      whatsappPretty: BRAND.whatsappPretty,
      url: BRAND.url,
      hours: '',
    })
    setSetting('socials', SOCIALS)
    setSetting('coverage', COVERAGE)
    console.log('  semilla: configuracion global')
  }

  if (getSetting('home') === null) {
    setSetting('home', {
      heroEyebrow: 'Barranquilla · Valledupar · Envíos a toda Colombia',
      heroTitle: 'TECNOLOGÍA QUE ESTÁ',
      heroTitleAccent: 'A OTRO NIVEL',
      heroSubtitle:
        'Encuentra iPhone, MacBook, iPad, Apple Watch, audífonos, parlantes y mucho más en ITOMSTORE.',
      heroCta: 'VER PRODUCTOS',
      heroCtaHref: '/catalogo',
      heroImage: 'iphone-pro-mano',
      heroBadgeTitle: 'iPhone 17 Pro',
      heroBadgeText: 'Sellado · varios colores',
      productsTitle: 'NUESTROS PRODUCTOS',
      productsEyebrow: 'Catálogo',
      showTrustBar: true,
      showCategories: true,
      showBose: true,
      showTradeIn: true,
      showShipping: true,
    })
    setSetting('seo', {
      title: 'ITOMSTORE | Tecnología Apple y productos premium en Colombia',
      description:
        'Compra iPhone, MacBook, iPad, Apple Watch, audífonos, parlantes Bose y tecnología en ITOMSTORE. Domicilios en Barranquilla, entregas en Valledupar y envíos a toda Colombia.',
    })
    console.log('  semilla: contenido de portada y SEO')
  }

  /* -------------------------------------------------- administrador inicial */
  if (nUsers === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@itomstore.co'
    const pass = process.env.ADMIN_PASSWORD || 'ItomStore2026!'
    db.prepare(
      `INSERT INTO users (email, password, name, role, must_change) VALUES (?, ?, ?, 'admin', 1)`
    ).run(email.toLowerCase(), bcrypt.hashSync(pass, 12), 'Administrador')
    console.log('\n  ────────────────────────────────────────────────')
    console.log('   ADMINISTRADOR INICIAL')
    console.log(`   correo:     ${email}`)
    console.log(`   contraseña: ${pass}`)
    console.log('   CAMBIALA al entrar por primera vez en /admin')
    console.log('  ────────────────────────────────────────────────\n')
  }
}
