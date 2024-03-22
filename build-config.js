import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  build: {
    target: "esnext",
    minify: false,
    modulePreload: true,
    lib: {
      name: "index",
      fileName: "index",
      formats: ["es"],
      entry: "src/index.js",
    },
    rollupOptions: {
      external: ["html2canvas", "jspdf"],
      output: {
        entryFileNames: "[name].js",
        manualChunks (id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        },
      }
    }
  },
  esbuild: true,
  define: {
  },
  plugins: [
  ],
  resolve: {
    alias: {
    }
  }
})
