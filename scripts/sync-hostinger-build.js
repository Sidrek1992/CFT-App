import fs from 'fs/promises';
import path from 'path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const distIndex = path.join(distDir, 'index.html');
const distAssets = path.join(distDir, 'assets');

const rootIndex = path.join(rootDir, 'index.html');
const rootAssets = path.join(rootDir, 'assets');

async function exists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function syncHostingerBuild() {
  if (!(await exists(distIndex)) || !(await exists(distAssets))) {
    throw new Error('No se encontro dist/. Ejecuta primero npm run build');
  }

  await fs.copyFile(distIndex, rootIndex);
  await fs.rm(rootAssets, { recursive: true, force: true });
  await fs.cp(distAssets, rootAssets, { recursive: true });

  process.stdout.write('Build sincronizado para Hostinger: index.html y assets/\n');
}

syncHostingerBuild().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
