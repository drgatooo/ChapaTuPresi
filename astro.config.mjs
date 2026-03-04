// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import icon from 'astro-icon';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['.ngrok-free.app', '.ngrok-free.app:3000', '.ngrok-free.app:4321']
    }
  },

  output: 'server',
  integrations: [icon()],
  adapter: vercel({ edgeMiddleware: false })
});