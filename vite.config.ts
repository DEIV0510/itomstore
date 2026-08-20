import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5256, strictPort: false, host: true },
  preview: { port: 5256 },
  build: { target: 'es2019', cssTarget: 'safari14', assetsInlineLimit: 2048 },
})
