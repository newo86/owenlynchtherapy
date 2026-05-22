import { readFile } from 'node:fs/promises';
import path from 'node:path';

let cached: Buffer | null = null;

/** Loads the pre-rendered horizontal logo PNG.
 *
 * We can't rasterise the SVG at runtime via sharp because the SVG references
 * Avenir/Poppins/Georgia, and those fonts aren't present in the Vercel build
 * environment (or, depending on the box, on the Mac that sharp's librsvg
 * happens to be looking at). Missing fonts silently rendered an almost-empty
 * PNG, which is why the logo "wasn't showing" in earlier versions. The PNG
 * committed at public/images/logo-horizontal-pdf.png was rendered through
 * a real browser so all the typography is baked in. */
export async function loadHorizontalLogoPng(): Promise<Buffer> {
  if (cached) return cached;
  const pngPath = path.join(process.cwd(), 'public/images/logo-horizontal-pdf.png');
  cached = await readFile(pngPath);
  return cached;
}
