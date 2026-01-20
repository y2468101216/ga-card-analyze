import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const vitePort = Number(env.VITE_PORT || 5173)
  const apiPort = Number(env.API_PORT || 3001)

  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    // Serve /data/gatcg.sqlite and /sql-wasm.wasm from here.
    publicDir: 'web/public',
    server: {
      port: vitePort,
      strictPort: true,
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}` ,
          changeOrigin: true
        }
      }
    }
  }
})
