import assert from 'node:assert/strict';
import { classifyDeviceProfile, DEVICE_PROFILES, resolveRemoteAdminReady, deviceGateOwnsDeviceChip } from '../src/device-profile.js';

assert.equal(classifyDeviceProfile({ width: 1440, touchPoints: 0, userAgent: 'Windows NT' }).id, 'desktop');
assert.equal(classifyDeviceProfile({ width: 820, touchPoints: 5, userAgent: 'iPad' }).id, 'tablet');
assert.equal(classifyDeviceProfile({ width: 1024, touchPoints: 5, userAgent: 'iPad' }).id, 'tablet');
assert.equal(classifyDeviceProfile({ width: 1366, touchPoints: 5, userAgent: 'Macintosh' }).id, 'tablet');
assert.equal(classifyDeviceProfile({ width: 430, touchPoints: 5, userAgent: 'iPhone' }).id, 'phone');
assert.equal(classifyDeviceProfile({ width: 900, touchPoints: 0, userAgent: 'Windows NT' }).id, 'desktop');
assert.equal(classifyDeviceProfile({ width: 900, touchPoints: 1, userAgent: 'Android' }).id, 'tablet');
assert.equal(DEVICE_PROFILES.phone.shell, 'mobile-single');
assert.equal(DEVICE_PROFILES.tablet.interaction, 'touch-first');
assert.equal(DEVICE_PROFILES.desktop.density, 'high');

const readyContract = {
  application: { id: 'price-report-tunggiabao' },
  policy: { remoteAdminReady: true },
  readiness: {
    deviceRegistry: 'available',
    deviceGateway: 'available',
    adminApi: 'available'
  }
};
assert.equal(resolveRemoteAdminReady(readyContract), true);
assert.equal(resolveRemoteAdminReady({ ...readyContract, policy: { remoteAdminReady: false } }), false);
assert.equal(resolveRemoteAdminReady({ ...readyContract, application: { id: 'other-app' } }), false);
assert.equal(resolveRemoteAdminReady({
  ...readyContract,
  readiness: { ...readyContract.readiness, deviceGateway: 'implemented-requires-d1-and-app-origin' }
}), false);

assert.equal(deviceGateOwnsDeviceChip('authorized'), true);
assert.equal(deviceGateOwnsDeviceChip('pending'), true);
assert.equal(deviceGateOwnsDeviceChip('blocked'), true);
assert.equal(deviceGateOwnsDeviceChip('offline'), true);
assert.equal(deviceGateOwnsDeviceChip('checking'), true);
assert.equal(deviceGateOwnsDeviceChip('classification-only'), false);
assert.equal(deviceGateOwnsDeviceChip(''), false);

console.log('DEVICE PROFILE LOGIC PASS');
