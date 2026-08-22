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
    strictPort: false,
    host: true,
    proxy: { '/api': { target: 'http://localhost:5257', changeOrigin: true } },
  },
  preview: { port: 5256 },
  build: { target: 'es2019', cssTarget: 'safari14', assetsInlineLimit: 2048 },
})
