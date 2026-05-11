// vite.config.js
import { defineConfig } from 'vite'
import react            from '@vitejs/plugin-react'
import { resolve }      from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Alias @ → src/ để import gọn: '@/lib/utils' thay vì '../../../lib/utils'
    alias: { '@': resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    open: true,
  },
})