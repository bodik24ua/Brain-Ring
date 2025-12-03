import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
    // basicSsl() // Додаємо плагін для SSL
  ],
  server: {
    host: true,   // Робить сервер доступним у мережі
    // https: true   // Вмикає HTTPS
  }
})