import { defineConfig, loadEnv } from 'vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { devtools } from '@tanstack/devtools-vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return;

  const m = id.match(
    /[\\/]node_modules[\\/](?:\.pnpm[\\/][^\\/]+[\\/]node_modules[\\/])?((?:@[^\\/]+[\\/])?[^\\/]+)/,
  );
  if (!m) return;
  const pkg = m[1];

  if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler' || pkg === 'react-is') {
    return 'vendor-react';
  }
  if (pkg.startsWith('@tanstack/')) return 'vendor-tanstack';
  if (pkg === '@radix-ui/react-slot') return 'vendor-radix-slot';
  if (pkg.startsWith('@radix-ui/') || pkg === 'radix-ui' || pkg === 'cmdk') return 'vendor-radix';
  if (pkg === 'recharts' || pkg.startsWith('d3-') || pkg === 'victory-vendor') return 'vendor-charts';
  if (pkg === 'framer-motion' || pkg === 'motion') return 'vendor-motion';
  if (pkg === '@dnd-kit/core' || pkg === '@dnd-kit/sortable' || pkg === '@dnd-kit/utilities') {
    return 'vendor-dnd';
  }
  if (pkg === 'lucide-react') return 'vendor-icons';
  if (pkg === 'three' || pkg === '@react-three/fiber' || pkg === '@react-three/drei') {
    return 'particle-field';
  }
  if (pkg === 'ag-grid-community' || pkg === 'ag-grid-react') return 'vendor-aggrid';
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const branch = process.env.CF_PAGES_BRANCH;
  const isDevelop = branch && branch !== 'main';

  const apiUrl =
    env.VITE_API_URL ||
    process.env.VITE_API_URL ||
    (isDevelop ? 'https://developapi.ecotechts.com.br/api' : 'https://api.ecotechts.com.br/api');

  const appUrl =
    env.VITE_APP_URL ||
    process.env.VITE_APP_URL ||
    (isDevelop ? 'https://develop.ecotechts.com.br' : 'https://ecotechts.com.br');

  const storageUrl =
    env.VITE_STORAGE_URL ||
    process.env.VITE_STORAGE_URL ||
    'https://storage.grupoecosistema.com.br';

  // Sentry — o build roda no CI (sem .env), então o DSN precisa entrar via define,
  // como as URLs acima. DSN é público (vai no bundle por design).
  const sentryDsn =
    env.VITE_SENTRY_DSN ||
    process.env.VITE_SENTRY_DSN ||
    'https://7e0d7b4d206c529053d954f95c989607@o4511546855391232.ingest.us.sentry.io/4511546858930176';

  const sentryTracesSampleRate =
    env.VITE_SENTRY_TRACES_SAMPLE_RATE ||
    process.env.VITE_SENTRY_TRACES_SAMPLE_RATE ||
    '0.5';

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@ecotech/shared/types': path.resolve(__dirname, '../../libs/shared/types/src/index.ts'),
        '@ecotech/shared/utils': path.resolve(__dirname, '../../libs/shared/utils/src/index.ts'),
        '@ecotech/shared/config': path.resolve(__dirname, '../../libs/shared/config/src/index.ts'),
        '@ecotech/ui': path.resolve(__dirname, '../../libs/shared/ui/src/index.ts'),
      },
    },
    plugins: [
      mode === 'development' ? devtools() : null,
      tailwindcss(),
      mode !== 'development' && !process.env.CF_PAGES_BRANCH ? visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true }) : null,
      tanstackRouter({
        target: 'react',
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
        autoCodeSplitting: true,
      }),
      viteReact(),
    ],
    build: {
      target: 'esnext',
      reportCompressedSize: false,
      outDir: 'dist/client',
      modulePreload: {
        resolveDependencies(_url, deps, context) {
          if (context.hostType === 'html') {
            // Don't eagerly preload heavy chunks only needed inside lazy routes.
            // particle-field (Three.js) is only rendered inside an iframe on desktop.
            // vendor-charts (recharts) is only used behind authenticated app routes.
            const SKIP = ['particle-field', 'vendor-charts', 'vendor-aggrid'];
            return deps.filter((dep) => !SKIP.some((s) => dep.includes(s)));
          }
          return deps;
        },
      },
      rollupOptions: {
        output: {
          manualChunks: vendorChunk,
        },
      },
    },
    server: {
      allowedHosts: ['elisa-sachemic-jayden.ngrok-free.app', 'elisa-sachemic-jayden.ngrok-free.dev'],
      warmup: {
        clientFiles: ['./src/main.tsx', './src/routeTree.gen.ts'],
      },
      proxy: {
        '/api/treinamentos': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          rewrite: (path) => path.replace('/api/treinamentos', '/api/admin'),
        },
      },
    },
    optimizeDeps: {
      include: [
        'lucide-react',
        'recharts',
        'react-hook-form',
        '@hookform/resolvers',
        '@tanstack/react-router',
        '@tanstack/react-query',
        'zustand',
      ],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
      'import.meta.env.VITE_APP_URL': JSON.stringify(appUrl),
      'import.meta.env.VITE_STORAGE_URL': JSON.stringify(storageUrl),
      'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(sentryDsn),
      'import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE': JSON.stringify(sentryTracesSampleRate),
    },
  };
});
