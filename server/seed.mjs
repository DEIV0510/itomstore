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
  // en un filesystem de solo lectura (serverless) se escribe en /tmp, que si es escribible
  const tmpDir = process.env.VERCEL ? '/tmp' : path.join(ROOT, 'data')
  fs.mkdirSync(tmpDir, { recursive: true })
  const tmp = path.join(tmpDir, `.seed-${path.basename(rel)}-${Date.now()}.mjs`)
  fs.writeFileSync(tmp, code)
  try {
    return await import(`file://${tmp}`)
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

export async function seed() {
  const nCats = (await db.get('SELECT COUNT(*) AS n FROM categories')).n
  const nProds = (await db.get('SELECT COUNT(*) AS n FROM products')).n
  const nUsers = (await db.get('SELECT COUNT(*) AS n FROM users')).n

  /* ---------------------------------------------------- catalogo inicial */
  if (nCats === 0 || nProds === 0) {
    const { CATEGORIES, PRODUCTS } = await loadTs('src/data/catalog.ts')

    await db.transaction(async (tx) => {
      if (nCats === 0) {
        for (const [i, c] of CATEGORIES.entries()) {
          await tx.run(
            `INSERT OR IGNORE INTO categories (id, name, short, blurb, image, icon, sort, active)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
            [c.id, c.name, c.short, c.blurb, c.image, c.icon, i]
          )
        }
      }
      if (nProds === 0) {
        for (const [i, p] of PRODUCTS.entries()) {
          await tx.run(
            `INSERT OR IGNORE INTO products
              (id, name, brand, category, description, price, old_price, condition, stock, sku,
               color, capacity, images, features, confirm, featured, published, sort)
             VALUES
              (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
            [
              p.id,
              p.name,
              p.brand,
              p.category,
              p.description,
              p.price,
              p.oldPrice,
              p.condition,
              // no inventamos existencias: el stock queda sin definir hasta que el admin lo cargue
              null,
              null,
              p.color,
              p.capacity,
              JSON.stringify(p.images ?? []),
              JSON.stringify(p.features ?? []),
              JSON.stringify(p.confirm ?? []),
              p.featured ? 1 : 0,
              i,
            ]
          )
        }
      }
    })
    console.log(`  semilla: ${CATEGORIES.length} categorias, ${PRODUCTS.length} productos`)
  }

  /* ------------------------------------------------ configuracion global */
  if ((await getSetting('brand')) === null) {
    const { BRAND, SOCIALS, COVERAGE } = await loadTs('src/lib/config.ts')
    await setSetting('brand', {
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
    await setSetting('socials', SOCIALS)
    await setSetting('coverage', COVERAGE)
    console.log('  semilla: configuracion global')
  }

  if ((await getSetting('home')) === null) {
    await setSetting('home', {
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
    await setSetting('seo', {
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
    await db.run(`INSERT INTO users (email, password, name, role, must_change) VALUES (?, ?, ?, 'admin', 1)`, [
      email.toLowerCase(),
      bcrypt.hashSync(pass, 12),
      'Administrador',
    ])
    console.log('\n  ────────────────────────────────────────────────')
    console.log('   ADMINISTRADOR INICIAL')
    console.log(`   correo:     ${email}`)
    console.log(`   contraseña: ${pass}`)
    console.log('   CAMBIALA al entrar por primera vez en /admin')
    console.log('  ────────────────────────────────────────────────\n')
  }
}
