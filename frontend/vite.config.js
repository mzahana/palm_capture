import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), basicSsl()],
    server: {
        host: '0.0.0.0',
        proxy: {
            '^/(auth|users|register|entries|settings|upload|static)': {
                target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000',
                changeOrigin: true
            }
        }
    }
})
