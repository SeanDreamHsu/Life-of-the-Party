import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Two pages: the game at the root, its landing page at /landing/.
    rolldownOptions: {
      input: { main: 'index.html', landing: 'landing/index.html' },
    },
  },
});
