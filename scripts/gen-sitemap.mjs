/** Genera public/sitemap.xml a partir de las rutas reales del router y del catalogo. */
import fs from 'node:fs'

const BASE = 'https://itomstore.vercel.app'
const src = fs.readFileSync('src/data/catalog.ts', 'utf8')

const ids = [...src.matchAll(/^\s{4}id: '([^']+)',/gm)].map((m) => m[1])
const cats = [...src.matchAll(/\{ id: '([^']+)', name:/g)].map((m) => m[1])

const urls = [
  { loc: '/', p: '1.0' },
  { loc: '/catalogo', p: '0.9' },
  ...cats.map((c) => ({ loc: `/categoria/${c}`, p: '0.8' })),
  ...ids.map((i) => ({ loc: `/producto/${i}`, p: '0.7' })),
  { loc: '/nosotros', p: '0.5' },
  { loc: '/envios', p: '0.6' },
  { loc: '/preguntas-frecuentes', p: '0.6' },
  { loc: '/garantias', p: '0.5' },
  { loc: '/permutas', p: '0.7' },
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${BASE}${u.loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${u.p}</priority>\n  </url>`).join('\n')}
</urlset>
`
fs.writeFileSync('public/sitemap.xml', xml)
console.log(`sitemap.xml -> ${urls.length} rutas (${cats.length} categorias, ${ids.length} productos)`)
