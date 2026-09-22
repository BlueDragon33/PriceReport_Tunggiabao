export function normalizeLogoDisplayMode(value) {
  return ['original','remove-bg','styled'].includes(value) ? value : 'original';
}

export function normalizeRemoveBgTolerance(value, fallback = 46) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(8, Math.min(140, Math.round(n)));
}

// Backward-compatible alias for old persisted/control code. V3.2 changes the
// meaning from "light threshold" to true background-color tolerance.
export function normalizeRemoveBgThreshold(value, fallback = 46) {
  return normalizeRemoveBgTolerance(value, fallback);
}

function colorAt(data, index) {
  const i = index * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

function colorDistance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function averageCorner(data, width, height, cornerX, cornerY, radius = 4) {
  const colors = [];
  const cornerPx = cornerX === 0 ? 0 : width - 1;
  const cornerPy = cornerY === 0 ? 0 : height - 1;
  const xStep = cornerX === 0 ? 1 : -1;
  const yStep = cornerY === 0 ? 1 : -1;
  const maxDx = Math.min(radius, width - 1);
  const maxDy = Math.min(radius, height - 1);

  const pushPixel = (x, y) => {
    const i = (y * width + x) * 4;
    if (data[i + 3] < 20) return;
    colors.push([data[i], data[i + 1], data[i + 2]]);
  };

  // Sample only the two outer edges meeting at the corner. This prevents
  // subject pixels inside the logo from contaminating the background model.
  for (let d = 0; d <= maxDx; d += 1) pushPixel(cornerPx + d * xStep, cornerPy);
  for (let d = 1; d <= maxDy; d += 1) pushPixel(cornerPx, cornerPy + d * yStep);

  if (!colors.length) return [255, 255, 255];
  return [0,1,2].map((channel) =>
    Math.round(colors.reduce((sum, color) => sum + color[channel], 0) / colors.length)
  );
}

function nearestReferenceDistance(color, references) {
  let best = Infinity;
  for (const ref of references) best = Math.min(best, colorDistance(color, ref));
  return best;
}

/**
 * Truly removes a connected background by turning border-connected pixels
 * transparent. It does not simply lighten, blend, or recolor the background.
 *
 * The algorithm:
 * 1) estimates up to four background reference colors from image corners;
 * 2) flood-fills only pixels connected to the outer image border;
 * 3) accepts pixels whose color is within the requested tolerance of a
 *    background reference, with a small local-gradient allowance;
 * 4) writes alpha=0 for the accepted background and feathers only its boundary.
 *
 * Interior logo pixels that are not connected to the image border are not
 * removed even when they are white or similar to the background.
 */
export function removeConnectedBackgroundPixels(imageData, width, height, tolerance = 46) {
  const data = imageData?.data;
  if (!data || !width || !height || data.length < width * height * 4) return imageData;

  const tol = normalizeRemoveBgTolerance(tolerance, 46);
  const references = [
    averageCorner(data, width, height, 0, 0),
    averageCorner(data, width, height, 1, 0),
    averageCorner(data, width, height, 0, 1),
    averageCorner(data, width, height, 1, 1)
  ];

  // De-duplicate nearly identical corner models so a logo touching one corner
  // does not dominate every seed.
  const uniqueRefs = [];
  for (const ref of references) {
    if (!uniqueRefs.some((existing) => colorDistance(existing, ref) < 10)) uniqueRefs.push(ref);
  }

  const total = width * height;
  const visited = new Uint8Array(total);
  const background = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const seed = (index) => {
    if (visited[index]) return;
    const i = index * 4;
    visited[index] = 1;
    if (data[i + 3] === 0) {
      background[index] = 1;
      queue[tail++] = index;
      return;
    }
    const color = colorAt(data, index);
    if (nearestReferenceDistance(color, uniqueRefs) <= tol) {
      background[index] = 1;
      queue[tail++] = index;
    }
  };

  for (let x = 0; x < width; x += 1) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  const offsets = [[1,0],[-1,0],[0,1],[0,-1]];
  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    const current = colorAt(data, index);

    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nextIndex = ny * width + nx;
      if (visited[nextIndex]) continue;
      visited[nextIndex] = 1;

      const ni = nextIndex * 4;
      if (data[ni + 3] === 0) {
        background[nextIndex] = 1;
        queue[tail++] = nextIndex;
        continue;
      }

      const next = colorAt(data, nextIndex);
      const refDistance = nearestReferenceDistance(next, uniqueRefs);
      const localDistance = colorDistance(next, current);
      const accepted = refDistance <= tol ||
        (refDistance <= tol * 1.35 && localDistance <= Math.max(10, tol * 0.36));

      if (accepted) {
        background[nextIndex] = 1;
        queue[tail++] = nextIndex;
      }
    }
  }

  // Actual deletion: background pixels become alpha 0.
  for (let index = 0; index < total; index += 1) {
    if (!background[index]) continue;
    data[index * 4 + 3] = 0;
  }

  // Anti-alias only the immediate subject boundary. This does not recolor.
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      if (background[index]) continue;
      const neighbors = [
        index - 1, index + 1, index - width, index + width
      ];
      const touchingBackground = neighbors.some((neighbor) => background[neighbor]);
      if (!touchingBackground) continue;

      const color = colorAt(data, index);
      const distance = nearestReferenceDistance(color, uniqueRefs);
      if (distance <= tol * 1.45) {
        const keepRatio = Math.max(0.25, Math.min(1, (distance - tol) / Math.max(1, tol * 0.45)));
        data[index * 4 + 3] = Math.round(data[index * 4 + 3] * keepRatio);
      }
    }
  }

  return imageData;
}

// Legacy export name retained so old imports/tests do not break. It now performs
// true connected-background deletion rather than "light background processing".
export function removeLightBackgroundPixels(imageData, threshold = 46, _feather = 18, width, height) {
  if (!width || !height) {
    const pixels = Math.floor((imageData?.data?.length || 0) / 4);
    const side = Math.sqrt(pixels);
    if (Number.isInteger(side)) {
      width = side;
      height = side;
    } else {
      return imageData;
    }
  }
  return removeConnectedBackgroundPixels(imageData, width, height, threshold);
}

export async function removeBackgroundDataUrl(dataUrl, tolerance = 46) {
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
  removeConnectedBackgroundPixels(imageData, canvas.width, canvas.height, tolerance);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

// Backward-compatible function name. Semantics are upgraded in V3.2.
export async function removeLightBackgroundDataUrl(dataUrl, threshold = 46) {
  return removeBackgroundDataUrl(dataUrl, threshold);
}
