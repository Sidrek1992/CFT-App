import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
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
              // Lucide icons (tree-shaken but still sizeable)
              'vendor-lucide': ['lucide-react'],
            },
          },
        },
      },
    };
});
