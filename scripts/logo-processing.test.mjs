import assert from 'node:assert/strict';
import {
  normalizeLogoDisplayMode,
  normalizeRemoveBgThreshold,
  removeLightBackgroundPixels
} from '../src/logo-processing.js';

assert.equal(normalizeLogoDisplayMode('original'), 'original');
assert.equal(normalizeLogoDisplayMode('remove-bg'), 'remove-bg');
assert.equal(normalizeLogoDisplayMode('styled'), 'styled');
assert.equal(normalizeLogoDisplayMode('unexpected'), 'original');

assert.equal(normalizeRemoveBgThreshold(300), 254);
assert.equal(normalizeRemoveBgThreshold(180), 210);
assert.equal(normalizeRemoveBgThreshold('244'), 244);

const imageData = {
  data: new Uint8ClampedArray([
    255,255,255,255,   // pure white => transparent
    248,247,249,255,   // near white low saturation => transparent/feathered
    10,150,60,255,     // colored logo => preserved
    250,210,10,255     // bright saturated yellow => preserved
  ])
};
removeLightBackgroundPixels(imageData, 244, 18);
assert.equal(imageData.data[3], 0);
assert.ok(imageData.data[7] < 255);
assert.equal(imageData.data[11], 255);
assert.equal(imageData.data[15], 255);

console.log('LOGO PROCESSING LOGIC PASS');
