import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Robust case-insensitive path resolver to survive Git casing issues on Linux / Netlify
function findCaseInsensitivePath(targetPath: string): string | null {
  if (!targetPath || targetPath === '/' || targetPath === '.' || /^[A-Z]:\\$/i.test(targetPath)) {
    return targetPath;
  }
  if (fs.existsSync(targetPath)) {
    return targetPath;
  }
  const parent = path.dirname(targetPath);
  const base = path.basename(targetPath).toLowerCase();
  const resolvedParent = findCaseInsensitivePath(parent);
  if (resolvedParent && fs.existsSync(resolvedParent)) {
    const files = fs.readdirSync(resolvedParent);
    // 1. Direct match
    let match = files.find(f => f.toLowerCase() === base);
    if (match) {
      return path.resolve(resolvedParent, match);
    }
    // 2. Match with typical extensions for extensionless imports
    const extensions = ['.tsx', '.ts', '.jsx', '.js', '.css', '.png', '.svg'];
    for (const ext of extensions) {
      match = files.find(f => f.toLowerCase() === base + ext);
      if (match) {
        return path.resolve(resolvedParent, match);
      }
    }
  }
  return null;
}

function caseInsensitiveFallbackPlugin() {
  return {
    name: 'case-insensitive-fallback',
    resolveId(source: string, importer: string | undefined) {
      if (!importer || source.startsWith('\0') || source.startsWith('node:')) {
        return null;
      }
      
      // We resolve relative imports, absolute /src imports, and path aliases (@/)
      if (source.startsWith('.') || source.startsWith('/') || source.startsWith('@/')) {
        let targetPath = '';
        if (source.startsWith('@/')) {
          targetPath = path.resolve(__dirname, source.slice(2));
        } else if (source.startsWith('/')) {
          targetPath = path.resolve(__dirname, source.slice(1));
        } else {
          targetPath = path.resolve(path.dirname(importer), source);
        }

        const actualPath = findCaseInsensitivePath(targetPath);
        if (actualPath && actualPath !== targetPath && fs.existsSync(actualPath)) {
          console.log(`[Case-Insensitive Fallback] Resolved "${source}" from "${importer}" -> "${actualPath}"`);
          return actualPath;
        }
      }
      return null;
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [caseInsensitiveFallbackPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
