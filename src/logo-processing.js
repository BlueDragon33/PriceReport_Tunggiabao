export function normalizeLogoDisplayMode(value) {
  return ['original','remove-bg','styled'].includes(value) ? value : 'original';
}

export function normalizeRemoveBgThreshold(value, fallback = 244) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(210, Math.min(254, Math.round(n)));
}

export function removeLightBackgroundPixels(imageData, threshold = 244, feather = 18) {
  const data = imageData?.data;
  if (!data || typeof data.length !== 'number') return imageData;
  const hi = normalizeRemoveBgThreshold(threshold);
  const lo = Math.max(0, hi - Math.max(1, Number(feather) || 18));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const spread = max - min;
    const brightness = (r + g + b) / 3;

    // Only target light, low-saturation background pixels.
    if (min >= hi && spread <= 22) {
      data[i + 3] = 0;
    } else if (brightness >= lo && spread <= 28) {
      const ratio = Math.max(0, Math.min(1, (hi - brightness) / Math.max(1, hi - lo)));
      data[i + 3] = Math.round(data[i + 3] * ratio);
    }
  }
  return imageData;
}

export async function removeLightBackgroundDataUrl(dataUrl, threshold = 244) {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return dataUrl;
  const image = new Image();
  image.decoding = 'async';

  const loaded = new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('logo-image-load-failed'));
  });
  image.src = dataUrl;
  await loaded;

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  if (!canvas.width || !canvas.height) return dataUrl;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return dataUrl;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  removeLightBackgroundPixels(imageData, threshold);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
