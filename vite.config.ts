import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';
import path from 'path';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return defineConfig({
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    resolve: {
      alias: {
        '@': projectRoot
      }
    },
    server: {
      port: 3000,
      strictPort: true,
      host: true
    }
  });
};