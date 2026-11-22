import { PHOTO_MAX_CHARS, fitWithin, isPhotoSrc } from '../people';

/**
 * Shrink a chosen image on this device to a small JPEG data URL. The original file never leaves
 * the browser and is never stored; only this copy goes into the encrypted vault.
 */
export async function shrinkPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('That file isn’t an image.');
  if (file.size > 40 * 1024 * 1024) throw new Error('That image is too large to use.');
  const source = await decode(file);
  const { w, h } = fitWithin(source.width, source.height);
  if (!w || !h) {
    source.done();
    throw new Error('That image couldn’t be read.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('This browser can’t resize images.');
  g.drawImage(source.image, 0, 0, w, h);
  source.done();
  for (const q of [0.85, 0.72, 0.6, 0.45]) {
    const src = canvas.toDataURL('image/jpeg', q);
    if (src.length <= PHOTO_MAX_CHARS && isPhotoSrc(src)) return src;
  }
  throw new Error('That image couldn’t be made small enough.');
}

interface Decoded {
  image: CanvasImageSource;
  width: number;
  height: number;
  done(): void;
}

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { image: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close() };
    } catch {
      // Fall through to <img>, which some formats need.
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('That image couldn’t be read.');
  }
  return { image: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
}
