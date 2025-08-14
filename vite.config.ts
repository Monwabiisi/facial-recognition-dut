import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import type { UserConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }): UserConfig => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [
      react({
        // Enable babel macros and runtime
        babel: {
          plugins: [
            'macros',
            ['@babel/plugin-transform-runtime', { regenerator: true }],
          ],
        },
        // Enable Fast Refresh
        fastRefresh: true,
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@services": path.resolve(__dirname, "./src/services"),
        "@utils": path.resolve(__dirname, "./src/utils"),
        "@hooks": path.resolve(__dirname, "./src/hooks"),
        "@ml": path.resolve(__dirname, "./src/ml"),
        "@pages": path.resolve(__dirname, "./src/pages"),
      },
    },
    server: {
      host: true,
      port: 5174,
      strictPort: true,
      // Enable HTTPS in development for camera access
      https: true,
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
      proxy: {
        // Add proxy configuration if needed
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      outDir: "build",
      sourcemap: mode === 'development',
      // Optimize build
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: [
              'react',
              'react-dom',
              'react-router-dom',
              'firebase',
              '@mediapipe/face_detection',
              '@mediapipe/face_mesh',
            ],
            ml: ['@vladmandic/human', 'face-api.js'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
      include: [
        "@mediapipe/face_detection",
        "@mediapipe/face_mesh",
        "@mediapipe/camera_utils",
        "@vladmandic/human",
        "face-api.js",
      ],
      exclude: ['firebase'],
    },
    // TypeScript configuration
    esbuild: {
      jsxInject: `import React from 'react'`,
      target: 'es2020',
    },
    // Enable PWA
    pwa: {
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'DUT Facial Recognition',
        short_name: 'DUT-FR',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/logo192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/logo512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    },
  };
});
