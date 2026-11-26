import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig, loadEnv, type Plugin} from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

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

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');

  const resolvedSupabaseUrl = stripWrappingQuotes(
    env.VITE_SUPABASE_URL ||
      env.VITE_SUPABASE_PROJECT_URL ||
      env.NEXT_PUBLIC_SUPABASE_URL ||
      env.SUPABASE_URL ||
      ''
  );

  const resolvedSupabaseAnonKey = stripWrappingQuotes(
    env.VITE_SUPABASE_ANON_KEY ||
      env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      env.SUPABASE_ANON_KEY ||
      ''
  );

  return {
    plugins: [react(), tailwindcss(), emitCustomerShellManifest()],
    define: {
      __VITE_SUPABASE_URL__: JSON.stringify(resolvedSupabaseUrl),
      __VITE_SUPABASE_ANON_KEY__: JSON.stringify(resolvedSupabaseAnonKey),
    },
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
