import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// Перетворюємо експорт на функцію, щоб отримати доступ до { command }
export default defineConfig(({ command }) => {
  return {
    plugins: [
      react(),
      // basicSsl() 
    ],
    base: command === 'build' ? '/Brain-Ring/' : '/',
    server: {
      host: true,
      // https: true 
    }
  }
})