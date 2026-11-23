import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig, type Plugin} from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function emitCustomerShellManifest(): Plugin {
  return {
    name: 'emit-customer-shell-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const excludedPrefixes = [
        'AdminPanel',
        'SuperAdminPortal',
        'ResetConfirmModal',
        'ServicePausedScreen',
        'vendor-supabase',
        'vendor-qr',
      ];

      const shellAssets: string[] = ['/'];
      for (const fileName of Object.keys(bundle)) {
        if (!fileName.startsWith('assets/')) continue;
        if (fileName.startsWith('assets/aistudio/')) continue;
        const base = fileName.slice('assets/'.length);
        if (excludedPrefixes.some((prefix) => base.startsWith(prefix))) continue;
        if (/\.(js|css|webp|svg|png|woff2?)$/i.test(fileName)) {
          shellAssets.push(`/${fileName}`);
        }
      }

      this.emitFile({
        type: 'asset',
        fileName: 'sw-manifest.json',
        source: JSON.stringify(shellAssets),
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), emitCustomerShellManifest()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'vendor-react';
            }
            if (id.includes('/motion/') || id.includes('/framer-motion/')) {
              return 'vendor-motion';
            }
            if (id.includes('/lucide-react/')) {
              return 'vendor-icons';
            }
            if (id.includes('/@supabase/')) {
              return 'vendor-supabase';
            }
            if (id.includes('/qrcode/')) {
              return 'vendor-qr';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
