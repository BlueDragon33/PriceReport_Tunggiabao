import assert from 'node:assert/strict';
import { classifyDeviceProfile, DEVICE_PROFILES } from '../src/device-profile.js';

assert.equal(classifyDeviceProfile({ width: 1440, touchPoints: 0, userAgent: 'Windows NT' }).id, 'desktop');
assert.equal(classifyDeviceProfile({ width: 820, touchPoints: 5, userAgent: 'iPad' }).id, 'tablet');
assert.equal(classifyDeviceProfile({ width: 430, touchPoints: 5, userAgent: 'iPhone' }).id, 'phone');
assert.equal(classifyDeviceProfile({ width: 900, touchPoints: 0, userAgent: 'Windows NT' }).id, 'desktop');
assert.equal(classifyDeviceProfile({ width: 900, touchPoints: 1, userAgent: 'Android' }).id, 'tablet');
assert.equal(DEVICE_PROFILES.phone.shell, 'mobile-single');
assert.equal(DEVICE_PROFILES.tablet.interaction, 'touch-first');
assert.equal(DEVICE_PROFILES.desktop.density, 'high');

console.log('DEVICE PROFILE LOGIC PASS');
