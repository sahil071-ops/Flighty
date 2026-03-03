/**
 * Icon generator script for FamilyFlights PWA
 * Generates PNG icons from SVG using pure Node.js
 *
 * Usage: node scripts/generate-icons.mjs
 *
 * If you have ImageMagick installed:
 *   magick convert -background none public/icons/icon.svg -resize 192x192 public/icons/icon-192x192.png
 *   magick convert -background none public/icons/icon.svg -resize 512x512 public/icons/icon-512x512.png
 *   magick convert -background none public/icons/icon.svg -resize 180x180 public/icons/apple-touch-icon.png
 *
 * This script creates minimal placeholder PNG files if ImageMagick is not available.
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const iconsDir = path.join(rootDir, 'public', 'icons');
const svgPath = path.join(iconsDir, 'icon.svg');

const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

// Check if ImageMagick is available
let hasImageMagick = false;
try {
  execSync('magick --version', { stdio: 'ignore' });
  hasImageMagick = true;
} catch {
  try {
    execSync('convert --version', { stdio: 'ignore' });
    hasImageMagick = true;
  } catch {
    // ImageMagick not available
  }
}

if (hasImageMagick) {
  console.log('ImageMagick found. Generating icons from SVG...');
  for (const { name, size } of sizes) {
    const outPath = path.join(iconsDir, name);
    try {
      try {
        execSync(`magick convert -background "#0f172a" "${svgPath}" -resize ${size}x${size} "${outPath}"`);
      } catch {
        execSync(`convert -background "#0f172a" "${svgPath}" -resize ${size}x${size} "${outPath}"`);
      }
      console.log(`  ✓ Generated ${name}`);
    } catch (err) {
      console.error(`  ✗ Failed to generate ${name}:`, err.message);
    }
  }
} else {
  console.log('ImageMagick not found. Creating placeholder PNG files...');
  console.log('For proper icons, install ImageMagick and run this script again.');

  // Create minimal valid PNG (1x1 dark blue pixel scaled up concept — actually write a proper minimal PNG)
  // This is a minimal 1x1 dark blue PNG that will at least allow the build to complete
  // Replace with proper icons before deploying

  // Minimal valid 16x16 dark PNG (base64 decoded)
  // Generated from a dark blue #0f172a square
  const minimalPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAABmJLR0QA/wD/AP+gvaeTAAAA' +
    'DklEQVR42mNkYGD4TwABBAEAWuWY5QAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNC0wMS0wMVQw' +
    'MDowMDowMCswMDowMBPPuuQAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjQtMDEtMDFUMDA6MDA6' +
    'MDArMDA6MDBizWJYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAA==',
    'base64'
  );

  for (const { name } of sizes) {
    const outPath = path.join(iconsDir, name);
    if (!existsSync(outPath)) {
      writeFileSync(outPath, minimalPng);
      console.log(`  ✓ Created placeholder ${name}`);
    } else {
      console.log(`  - Skipped ${name} (already exists)`);
    }
  }

  console.log('\nTo generate proper icons:');
  console.log('  1. Install ImageMagick: https://imagemagick.org/script/download.php');
  console.log('  2. Run: node scripts/generate-icons.mjs');
  console.log('\nOr use any SVG-to-PNG converter with the file: public/icons/icon.svg');
}

console.log('\nDone!');
