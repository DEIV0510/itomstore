/**
 * Semilla inicial: pasa el catalogo y la configuracion que hoy viven en
 * src/data/catalog.ts y src/lib/config.ts a la base de datos.
 *
 * Solo escribe si la tabla esta vacia: nunca pisa lo que el administrador
 * haya cambiado despues desde /admin.
 *
 * IMPORTANTE: se importa la version ya compilada en generated/ (ver
 * scripts/build-seed-data.mjs), NUNCA los .ts originales en tiempo real.
 * Compilarlos en el momento con esbuild funcionaba en un proceso tradicional,
 * pero en una funcion serverless de Vercel el empaquetador no rastrea esa
 * lectura dinamica y el .ts no viaja al paquete desplegado (fallaba con
 * "Could not resolve", verificado en produccion). Un `import` estatico si
 * se rastrea y se incluye siempre. generated/ se regenera antes de `dev`,
 * `build` y `start` (ver los scripts "pre*" de package.json): no se versiona.
 */
import bcrypt from 'bcryptjs'
import { CATEGORIES, PRODUCTS } from '../generated/catalog.mjs'
import { BRAND, SOCIALS, COVERAGE } from '../generated/config.mjs'
import { db, setSetting, getSetting } from './db.mjs'

export async function seed() {
  const nCats = (await db.get('SELECT COUNT(*) AS n FROM categories')).n
  const nProds = (await db.get('SELECT COUNT(*) AS n FROM products')).n
  const nUsers = (await db.get('SELECT COUNT(*) AS n FROM users')).n

  /* ---------------------------------------------------- catalogo inicial */
  if (nCats === 0 || nProds === 0) {
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
