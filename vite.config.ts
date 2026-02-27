import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Increase warning threshold since we've added code splitting
        chunkSizeWarningLimit: 600,
        rollupOptions: {
          output: {
            manualChunks: {
              // Firebase SDK — large but shared across all views
              'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
              // Rich text editor — only loaded on Template view
              'vendor-tiptap': [
                '@tiptap/react',
                '@tiptap/starter-kit',
                '@tiptap/extension-heading',
              ],
              // Charts — only loaded on Dashboard view
              'vendor-recharts': ['recharts'],
              // Excel — only loaded on import/export actions
              'vendor-xlsx': ['xlsx'],
              // AI SDK
              'vendor-gemini': ['@google/genai'],
              // Lucide icons (tree-shaken but still sizeable)
              'vendor-lucide': ['lucide-react'],
            },
          },
        },
      },
    };
});
