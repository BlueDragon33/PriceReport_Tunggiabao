import assert from 'node:assert/strict';
import { sanitizePcFileName, supportsPcFolderAccess } from '../src/pc-storage.js';

assert.equal(sanitizePcFileName('BG: 09/2026 * Khách hàng?'), 'BG-_09-2026_-_Khach_hang');
assert.equal(sanitizePcFileName('   '), 'bao-gia');
assert.equal(supportsPcFolderAccess(), false);

console.log('PC STORAGE LOGIC PASS');
