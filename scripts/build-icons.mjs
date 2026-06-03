import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const sourceLogo = path.join(root, 'logo.png');
const iconsDir = path.join(root, 'build', 'icons');

const sizes = [16, 24, 32, 48, 64, 128, 256];

const ensureLogoExists = async () => {
  try {
    await fs.access(sourceLogo);
  } catch {
    throw new Error(`logo.png not found at ${sourceLogo}`);
  }
};

const resizeToPng = async (size, destination) => {
  await sharp(sourceLogo)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(destination);
};

const buildIcons = async () => {
  await ensureLogoExists();
  await fs.mkdir(iconsDir, { recursive: true });

  const icoPngInputs = [];

  for (const size of sizes) {
    const targetPng = path.join(iconsDir, `icon-${size}.png`);
    await resizeToPng(size, targetPng);
    icoPngInputs.push(targetPng);
  }

  const appPng = path.join(iconsDir, 'icon.png');
  await sharp(sourceLogo)
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(appPng);

  const icoBuffer = await pngToIco(icoPngInputs);
  const icoPath = path.join(iconsDir, 'icon.ico');
  await fs.writeFile(icoPath, icoBuffer);

  process.stdout.write(`Generated icons at ${iconsDir}\n`);
};

buildIcons().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});