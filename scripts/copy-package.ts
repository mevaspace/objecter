import * as fs from 'node:fs';
import * as path from 'node:path';

const rootDir = path.resolve(process.cwd(), '..');
const sourcePath = path.resolve(rootDir, 'package.json');
const targetPath = path.resolve(rootDir, 'dist/package.json');

const ALLOWED_KEYS = [
  'name',
  'version',
  'description',
  'author',
  'license',
  'main',
  'module',
  'types',
  'exports',
  'dependencies',
  'peerDependencies',
  'repository',
  'keywords',
  'bugs',
  'homepage',
  'publishConfig',
];

function adjustPath(p: string): string {
  if (p.startsWith('./dist/')) {
    return './' + p.substring(7);
  }
  if (p.startsWith('dist/')) {
    return p.substring(5);
  }
  return p;
}

function processExports(exports: any): any {
  if (typeof exports === 'string') {
    return adjustPath(exports);
  }
  if (typeof exports === 'object' && exports !== null) {
    const newExports: any = {};
    for (const key in exports) {
      newExports[key] = processExports(exports[key]);
    }
    return newExports;
  }
  return exports;
}

function run() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const newPackageJson: any = {};

    for (const key of ALLOWED_KEYS) {
      if (key in packageJson) {
        let value = packageJson[key];

        if (key === 'main' || key === 'module' || key === 'types') {
          value = adjustPath(value);
        } else if (key === 'exports') {
          value = processExports(value);
        }

        newPackageJson[key] = value;
      }
    }

    if (!fs.existsSync(path.dirname(targetPath))) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    }

    fs.writeFileSync(targetPath, JSON.stringify(newPackageJson, null, 2));
    console.warn(`Copied package.json to ${targetPath}`);

    const filesToCopy = ['README.md', 'CHANGELOG.md'];
    for (const file of filesToCopy) {
      const src = path.resolve(rootDir, file);
      const dest = path.resolve(rootDir, 'dist', file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.warn(`Copied ${file} to dist/`);
      }
    }
  } catch (error) {
    console.warn('Error copying package.json:', error);
    process.exit(1);
  }

  const coreDistPath = path.resolve(rootDir, 'core/dist');
  const rootDist = path.resolve(rootDir, 'dist');
  if (fs.existsSync(coreDistPath)) {
    const files = fs.readdirSync(coreDistPath);
    for (const file of files) {
      const src = path.resolve(coreDistPath, file);
      const dest = path.resolve(rootDist, file);
      fs.copyFileSync(src, dest);
      console.warn(`Copied ${file} to ${dest}`);
    }
  }
}

run();
