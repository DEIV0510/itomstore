import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // en desarrollo /api va al servidor Express: para el navegador es el mismo origen,
  // asi que la cookie de sesion funciona igual que en produccion
  server: {
    port: 5256,
    // strictPort a proposito: si 5256 estuviera ocupado, Vite saltaria al 5257
    // (el puerto de la API), se haria proxy a si mismo y el login fallaria sin
    // explicacion. Mejor que avise y no arranque.
    strictPort: true,
    host: true,
    proxy: { '/api': { target: 'http://localhost:5257', changeOrigin: true } },
  },
  // el mismo proxy para `vite preview`: no hereda el de `server`
  preview: {
    port: 5256,
    proxy: { '/api': { target: 'http://localhost:5257', changeOrigin: true } },
  },
  build: { target: 'es2019', cssTarget: 'safari14', assetsInlineLimit: 2048 },
})
