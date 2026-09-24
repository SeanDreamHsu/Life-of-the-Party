import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Two pages: the landing page at the root, the game itself at /play/.
    rolldownOptions: {
      input: { landing: 'index.html', play: 'play/index.html' },
    },
  },
});
