import sharp from 'sharp'
/** El logo viene en blanco/plata sobre negro: derivamos el alpha de la luminancia
 *  para obtener un PNG transparente utilizable sobre cualquier superficie. */
export async function transparentLogo(src) {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const px = info.width * info.height
  const out = Buffer.alloc(px * 4)
  for (let i = 0; i < px; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2]
    out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b
    out[i * 4 + 3] = Math.round(Math.min(255, Math.max(0, (Math.max(r, g, b) - 14) * 1.28)))
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()
}
