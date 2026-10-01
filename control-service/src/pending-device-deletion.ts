// Delete only the registration; application records and audit history remain owned by the app.
export class PendingDeviceDeletionError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); }
}
type Statement = {
  bind(...values: unknown[]): { first<T>(): Promise<T | null>; run(): Promise<{ meta: { changes?: number } }> };
};
type Database = { prepare(sql: string): Statement };
type Registration = { device_id: string; display_code: string; status: string };
export async function deletePendingRegistration(database: Database, table: string, payload: Record<string, unknown>) {
  if (!/^[a-z_]+$/.test(table)) throw new Error("Invalid registry table");
  const deviceId = typeof payload.deviceId === "string" ? payload.deviceId : "";
  const deviceCode = typeof payload.confirmDeviceCode === "string" ? payload.confirmDeviceCode.trim().toUpperCase() : "";
  if (!/^[a-f0-9]{64}$/.test(deviceId) || !deviceCode || deviceCode.length > 80) {
    throw new PendingDeviceDeletionError("Mã xác nhận thiết bị không hợp lệ.", 400, "INVALID_DEVICE");
  }
  if (payload.expectedStatus !== "pending") throw new PendingDeviceDeletionError("Chỉ xóa hồ sơ thiết bị chờ duyệt.", 409, "DEVICE_STATE_CONFLICT");
  const read = () => database.prepare(`SELECT device_id, display_code, status FROM ${table} WHERE device_id=?`).bind(deviceId).first<Registration>();
  const current = await read();
  if (!current) return { ok: true, verified: true, verifiedStatus: "deleted", deviceId, alreadyAbsent: true };
  if (current.status !== "pending") throw new PendingDeviceDeletionError("Thiết bị không còn chờ duyệt.", 409, "DEVICE_STATE_CONFLICT");
  if (current.display_code !== deviceCode) throw new PendingDeviceDeletionError("Mã xác nhận không khớp thiết bị.", 409, "DEVICE_CODE_MISMATCH");
  // The predicate protects an approval that happens after the live read above.
  const deleted = await database.prepare(`DELETE FROM ${table} WHERE device_id=? AND status='pending' AND display_code=?`).bind(deviceId, deviceCode).run();
  if (deleted.meta.changes !== 1) throw new PendingDeviceDeletionError("Trạng thái thiết bị vừa thay đổi; hãy đồng bộ lại.", 409, "DEVICE_STATE_CONFLICT");
  if (await read()) throw new PendingDeviceDeletionError("Ứng dụng chưa xác minh hồ sơ đã được xóa.", 409, "DEVICE_DELETE_READBACK_MISMATCH");
  return { ok: true, verified: true, verifiedStatus: "deleted", deviceId, deviceCode, alreadyAbsent: false };
}
