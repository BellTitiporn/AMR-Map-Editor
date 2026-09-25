// // on server
// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react()],
//   base: '/',

//   server: {
//     host: '0.0.0.0',
//     port: 5173,
//   },

//   preview: {
//     host: '0.0.0.0',
//     port: 5173,
//   },
// })

// on github pages
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/AMR-Map-Editor/',
})