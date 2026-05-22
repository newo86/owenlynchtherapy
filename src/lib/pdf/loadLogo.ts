import path from 'node:path';
import sharp from 'sharp';

let cached: Buffer | null = null;

/** Loads the horizontal logo as a PNG buffer, rasterised once and reused. */
export async function loadHorizontalLogoPng(): Promise<Buffer> {
  if (cached) return cached;
  const svgPath = path.join(process.cwd(), 'public/images/logo-horizontal-light-bg.svg');
  // SVG is 480×120. Render at 4× density for sharp print quality.
  cached = await sharp(svgPath).resize(800, 200).png().toBuffer();
  return cached;
}
