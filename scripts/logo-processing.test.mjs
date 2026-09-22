import assert from 'node:assert/strict';
import {
  normalizeLogoDisplayMode,
  normalizeRemoveBgTolerance,
  removeConnectedBackgroundPixels
} from '../src/logo-processing.js';

assert.equal(normalizeLogoDisplayMode('original'), 'original');
assert.equal(normalizeLogoDisplayMode('remove-bg'), 'remove-bg');
assert.equal(normalizeLogoDisplayMode('styled'), 'styled');
assert.equal(normalizeLogoDisplayMode('unexpected'), 'original');

assert.equal(normalizeRemoveBgTolerance(200), 140);
assert.equal(normalizeRemoveBgTolerance(2), 8);
assert.equal(normalizeRemoveBgTolerance('46'), 46);

// 5x5 image: blue background connected to all borders, red ring subject,
// and a blue center pixel enclosed by red. True background removal must:
// - delete the border-connected blue pixels;
// - preserve the red subject;
// - preserve the blue center because it is NOT connected to the border.
const width = 5;
const height = 5;
const BG = [40, 110, 180, 255];
const RED = [200, 40, 45, 255];
const pixels = [];
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
    const center = x === 2 && y === 2;
    if (border || center) pixels.push(...BG);
    else pixels.push(...RED);
  }
}
const imageData = { data: new Uint8ClampedArray(pixels) };
removeConnectedBackgroundPixels(imageData, width, height, 32);

// Every border pixel becomes transparent.
for (let x = 0; x < width; x += 1) {
  assert.equal(imageData.data[(x * 4) + 3], 0);
  assert.equal(imageData.data[(((height - 1) * width + x) * 4) + 3], 0);
}
// Enclosed center background-colored pixel remains opaque.
assert.equal(imageData.data[((2 * width + 2) * 4) + 3], 255);
// Red logo ring remains opaque.
assert.equal(imageData.data[((1 * width + 1) * 4) + 3], 255);

// Background does not need to be white/light. Verify a gray-beige edge is
// deleted while a strongly colored subject remains.
const width2 = 3;
const height2 = 3;
const beige = [192, 184, 165, 255];
const green = [20, 150, 65, 255];
const pixels2 = [
  ...beige,...beige,...beige,
  ...beige,...green,...beige,
  ...beige,...beige,...beige
];
const imageData2 = { data: new Uint8ClampedArray(pixels2) };
removeConnectedBackgroundPixels(imageData2, width2, height2, 36);
assert.equal(imageData2.data[3], 0);
assert.equal(imageData2.data[((1 * width2 + 1) * 4) + 3], 255);

console.log('LOGO PROCESSING LOGIC PASS');
