/**
 * ITOMSTORE - pipeline de imagenes.
 * Fuentes reales de la tienda (assets-src) -> WebP responsive + LQIP en public/img.
 * Regla: NUNCA se amplian los originales (son fotos de telefono, max 1291px de ancho).
 */
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { transparentLogo } from './_logo.mjs'

const SRC = 'assets-src'
const OUT = 'public/img'
fs.mkdirSync(OUT, { recursive: true })

const PHOTOS = {
  'iphone-cajas-mesa':  'iphone.png',
  'iphone-pro-mano':    'iphone4.png',
  'iphone-pro-colores': 'iphone3.png',
  'iphone-pro-unidad':  'bafle2.png',
  'envio-caja':         'iphones.png',
  'macbook-cajas':      'macbok.png',
  'macbook-inventario': 'ipad.png',
  'ipad-air-colores':   'ipads.png',
  'watch-caja':         'reloj.png',
  'watch-abierto':      'reloj2.png',
  'bose-banner':        'bafle.png',
  'bose-inventario':    'bafles.png',
  'beats-fundas':       'fundas.png',
  'galaxy-s26-ultra':   'samsung.png',
}

const WIDTHS = [400, 640, 960, 1280]
const manifest = {}

async function lqip(input) {
  const buf = await sharp(input).resize(20, 20, { fit: 'inside' }).blur(1.1).webp({ quality: 42 }).toBuffer()
  return 'data:image/webp;base64,' + buf.toString('base64')
}

async function photos() {
  for (const [slug, file] of Object.entries(PHOTOS)) {
    const src = path.join(SRC, file)
    const meta = await sharp(src).metadata()
    const nativeW = meta.width || 800
    const sizes = [...new Set(WIDTHS.filter((w) => w < nativeW).concat(nativeW))].sort((a, b) => a - b)
    const parts = []
    for (const w of sizes) {
      await sharp(src)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: w >= 960 ? 82 : 86, effort: 6 })
        .toFile(path.join(OUT, slug + '-' + w + '.webp'))
      parts.push('/img/' + slug + '-' + w + '.webp ' + w + 'w')
    }
    manifest[slug] = {
      src: '/img/' + slug + '-' + sizes[sizes.length - 1] + '.webp',
      srcSet: parts.join(', '),
      width: nativeW,
      height: meta.height || 800,
      lqip: await lqip(src),
    }
    console.log('  ok  ' + slug.padEnd(20) + sizes.join('/'))
  }
}

/** Lockup completo transparente + marca circular ("O" con la manzana) + favicons. */
async function logo() {
  const full = await sharp(await transparentLogo(path.join(SRC, 'logo.png'))).trim({ threshold: 2 }).png().toBuffer()
  const fm = await sharp(full).metadata()

  await sharp(full).resize({ width: 587, withoutEnlargement: true }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'logo.png'))
  await sharp(full).resize({ width: 587, withoutEnlargement: true }).webp({ quality: 94 }).toFile(path.join(OUT, 'logo.webp'))
  await sharp(full).resize({ width: 300 }).webp({ quality: 94 }).toFile(path.join(OUT, 'logo-sm.webp'))

  const mark = await sharp(full)
    .extract({
      left: Math.round(fm.width * 0.402),
      top: Math.round(fm.height * 0.368),
      width: Math.round(fm.width * 0.272),
      height: Math.round(fm.height * 0.368),
    })
    .trim({ threshold: 2 })
    .png()
    .toBuffer()

  const square = (buf, size) =>
    sharp(buf).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })

  await square(mark, 160).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'logo-mark.png'))
  await square(mark, 160).webp({ quality: 96 }).toFile(path.join(OUT, 'logo-mark.webp'))

  for (const s of [32, 180, 512]) {
    const inner = await sharp(mark).resize({ width: Math.round(s * 0.78), fit: 'inside' }).toBuffer()
    await sharp({ create: { width: s, height: s, channels: 4, background: '#050506' } })
      .composite([{ input: inner, gravity: 'center' }])
      .png()
      .toFile(path.join(OUT, 'favicon-' + s + '.png'))
  }
  console.log('  ok  logo ' + fm.width + 'x' + fm.height + ' + marca circular + favicons')
  return full
}

/** OG 1200x630: foto real difuminada + veladura + lockup. */
async function og(logoBuf) {
  const bg = await sharp(path.join(SRC, 'iphone.png'))
    .resize(1200, 630, { fit: 'cover', position: 'attention' })
    .blur(14)
    .modulate({ brightness: 0.34, saturation: 0.6 })
    .toBuffer()
  const veil = Buffer.from(
    '<svg width="1200" height="630"><defs><radialGradient id="g" cx="50%" cy="44%" r="72%">' +
      '<stop offset="0%" stop-color="#000" stop-opacity="0.1"/>' +
      '<stop offset="100%" stop-color="#000" stop-opacity="0.92"/></radialGradient></defs>' +
      '<rect width="1200" height="630" fill="url(#g)"/><rect x="0" y="606" width="1200" height="24" fill="#C9A227"/></svg>'
  )
  const lock = await sharp(logoBuf).resize({ width: 560, fit: 'inside' }).toBuffer()
  await sharp(bg)
    .composite([{ input: veil }, { input: lock, gravity: 'center' }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(OUT, 'og.jpg'))
  console.log('  ok  og.jpg 1200x630')
}

console.log('ITOMSTORE :: procesando fotos reales...')
const logoBuf = await logo()
await photos()
await og(logoBuf)
fs.mkdirSync('src/data', { recursive: true })
fs.writeFileSync('src/data/images.json', JSON.stringify(manifest, null, 2))
console.log('\nlisto -> ' + Object.keys(manifest).length + ' fotos + logo + og')
