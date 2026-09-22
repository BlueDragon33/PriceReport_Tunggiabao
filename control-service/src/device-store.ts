export type PriceReportDeviceStatus = "pending" | "approved" | "blocked";
export type PriceReportDeviceType = "desktop" | "tablet" | "phone" | "unknown";
export type PriceReportControlRole = "viewer" | "reviewer" | "publisher" | "owner";

export type PriceReportControlIdentity = {
  actor: string;
  role: PriceReportControlRole;
  controlDeviceId: string | null;
};

export class PriceReportDeviceError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "PriceReportDeviceError";
    this.status = status;
    this.code = code;
  }
}

type DeviceRow = {
  device_id: string;
  display_code: string;
  public_jwk_json: string;
  device_type: string;
  platform: string | null;
  browser: string | null;
  display_name: string | null;
  label: string | null;
  status: string;
  edit_enabled: number;
  created_at: string;
  updated_at: string;
  last_seen_at: number;
  approved_at: string | null;
  approved_by: string | null;
  blocked_at: string | null;
};

type ChallengeRow = {
  challenge_id: string;
  device_id: string;
  challenge: string;
  expires_at: number;
};

type SessionRow = {
  session_hash: string;
  device_id: string;
  state: string;
  expires_at: number;
  last_seen_at: number;
};

type CommandRow = {
  command_id: string;
  device_id: string;
  operation: string;
  expected_status: string;
  payload_hash: string;
  state: string;
  result_status: string | null;
  actor: string;
  control_device_id: string | null;
  execution_nonce: string;
  error_code: string | null;
  created_at: string;
  completed_at: string | null;
};

const CHALLENGE_TTL_MS = 2 * 60 * 1000;
const DEVICE_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function text(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeDeviceType(value: unknown): PriceReportDeviceType {
  return value === "desktop" || value === "tablet" || value === "phone" ? value : "unknown";
}

function normalizeStatus(value: unknown): PriceReportDeviceStatus | null {
  return value === "pending" || value === "approved" || value === "blocked" ? value : null;
}

function validDeviceId(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}

function validCommandId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function validChallengeId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 2048) {
    throw new PriceReportDeviceError("Chữ ký thiết bị không hợp lệ.", 400, "INVALID_DEVICE_SIGNATURE");
  }
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    throw new PriceReportDeviceError("Chữ ký thiết bị không hợp lệ.", 400, "INVALID_DEVICE_SIGNATURE");
  }
}

function base64UrlCoordinate(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : "";
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken(bytes = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

function displayCodeFor(deviceId: string) {
  const key = deviceId.slice(0, 16).toUpperCase();
  return `KT-${key.slice(0, 4)}-${key.slice(4, 8)}-${key.slice(8, 12)}-${key.slice(12, 16)}`;
}

async function canonicalPublicJwk(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PriceReportDeviceError("Khóa thiết bị P-256 không hợp lệ.", 400, "INVALID_PUBLIC_KEY");
  }
  const supplied = value as Record<string, unknown>;
  const x = base64UrlCoordinate(supplied.x);
  const y = base64UrlCoordinate(supplied.y);
  if (supplied.kty !== "EC" || supplied.crv !== "P-256" || !x || !y) {
    throw new PriceReportDeviceError("Khóa thiết bị phải là ECDSA P-256 hợp lệ.", 400, "INVALID_PUBLIC_KEY");
  }
  const jwk: JsonWebKey = { kty: "EC", crv: "P-256", x, y, ext: true };
  try {
    await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  } catch {
    throw new PriceReportDeviceError("Tọa độ khóa P-256 không hợp lệ.", 400, "INVALID_PUBLIC_KEY");
  }
  return {
    jwk,
    canonical: JSON.stringify({ crv: "P-256", kty: "EC", x, y }),
  };
}

function publicDevice(row: DeviceRow) {
  const status = normalizeStatus(row.status) ?? "pending";
  return {
    deviceId: row.device_id,
    deviceCode: row.display_code,
    deviceType: normalizeDeviceType(row.device_type),
    platform: row.platform,
    browser: row.browser,
    displayName: row.display_name,
    label: row.label,
    status,
    editEnabled: row.edit_enabled === 1,
    active: Date.now() - Number(row.last_seen_at || 0) <= 2 * 60 * 1000,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSeenAt: Number(row.last_seen_at || 0),
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    blockedAt: row.blocked_at,
  };
}

async function deviceRow(database: D1Database, deviceId: string) {
  return database.prepare(
    `SELECT device_id, display_code, public_jwk_json, device_type, platform, browser, display_name, label, status, edit_enabled,
            created_at, updated_at, last_seen_at, approved_at, approved_by, blocked_at
       FROM kt_devices WHERE device_id = ?`,
  ).bind(deviceId).first<DeviceRow>();
}

async function commandRow(database: D1Database, commandId: string) {
  return database.prepare(
    `SELECT command_id, device_id, operation, expected_status, payload_hash, state, result_status, actor,
            control_device_id, execution_nonce, error_code, created_at, completed_at
       FROM kt_control_commands WHERE command_id = ?`,
  ).bind(commandId).first<CommandRow>();
}

async function audit(database: D1Database, actor: string, action: string, target: string, detail: Record<string, unknown>) {
  await database.prepare(
    "INSERT INTO kt_audit_log (actor, action, target, detail_json) VALUES (?, ?, ?, ?)",
  ).bind(actor, action, target, JSON.stringify(detail)).run();
}

async function revokeDeviceSessions(database: D1Database, deviceId: string, actor: string) {
  const result = await database.prepare(
    `UPDATE kt_device_sessions
        SET state='revoked', revoked_at=CURRENT_TIMESTAMP, revoked_by=?
      WHERE device_id=? AND state='active'`,
  ).bind(actor, deviceId).run();
  return Number(result.meta.changes ?? 0);
}

export async function registerPriceReportDevice(database: D1Database, payload: Record<string, unknown>) {
  const key = await canonicalPublicJwk(payload.publicJwk ?? payload.publicKey);
  const deviceId = await sha256Hex(key.canonical);
  const displayCode = displayCodeFor(deviceId);
  const now = Date.now();
  const deviceType = normalizeDeviceType(payload.deviceType);
  const platform = text(payload.platform, 120) || null;
  const browser = text(payload.browser, 160) || null;
  const displayName = text(payload.displayName, 120) || null;
  const label = text(payload.label, 100) || null;

  await database.prepare(
    `INSERT OR IGNORE INTO kt_devices
       (device_id, display_code, public_jwk_json, device_type, platform, browser, display_name, label, status, edit_enabled, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
  ).bind(deviceId, displayCode, JSON.stringify(key.jwk), deviceType, platform, browser, displayName, label, now).run();

  await database.prepare(
    `UPDATE kt_devices
        SET device_type = CASE WHEN ?='unknown' THEN device_type ELSE ? END,
            platform = COALESCE(?, platform), browser = COALESCE(?, browser),
            display_name = COALESCE(?, display_name), label = COALESCE(?, label),
            last_seen_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE device_id = ?`,
  ).bind(deviceType, deviceType, platform, browser, displayName, label, now, deviceId).run();

  const row = await deviceRow(database, deviceId);
  if (!row) throw new PriceReportDeviceError("Không thể tạo registry thiết bị PriceReport.", 500, "DEVICE_REGISTRY_WRITE_FAILED");
  return publicDevice(row);
}

export async function issuePriceReportDeviceChallenge(database: D1Database, deviceIdValue: unknown) {
  const deviceId = text(deviceIdValue, 64).toLowerCase();
  if (!validDeviceId(deviceId)) throw new PriceReportDeviceError("Mã thiết bị không hợp lệ.", 400, "INVALID_DEVICE_ID");
  const row = await deviceRow(database, deviceId);
  if (!row) throw new PriceReportDeviceError("Không tìm thấy thiết bị PriceReport.", 404, "DEVICE_NOT_FOUND");

  const challengeId = crypto.randomUUID();
  const challenge = randomToken(32);
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  await database.prepare("DELETE FROM kt_device_challenges WHERE device_id=? OR expires_at<=?")
    .bind(deviceId, Date.now()).run();
  await database.prepare(
    "INSERT INTO kt_device_challenges (challenge_id, device_id, challenge, expires_at) VALUES (?, ?, ?, ?)",
  ).bind(challengeId, deviceId, challenge, expiresAt).run();

  return {
    device: publicDevice(row),
    challengeId,
    challenge,
    expiresAt,
    signingInput: `price-report-device:v1:${deviceId}:${challengeId}:${challenge}`,
  };
}

export async function verifyPriceReportDeviceProof(database: D1Database, payload: Record<string, unknown>) {
  const deviceId = text(payload.deviceId, 64).toLowerCase();
  const challengeId = text(payload.challengeId, 64).toLowerCase();
  const signature = text(payload.signature, 2048);
  if (!validDeviceId(deviceId)) throw new PriceReportDeviceError("Mã thiết bị không hợp lệ.", 400, "INVALID_DEVICE_ID");
  if (!validChallengeId(challengeId)) throw new PriceReportDeviceError("challengeId không hợp lệ.", 400, "INVALID_CHALLENGE_ID");
  if (!signature) throw new PriceReportDeviceError("Thiếu chữ ký thiết bị.", 400, "INVALID_DEVICE_SIGNATURE");

  const challenge = await database.prepare(
    "SELECT challenge_id, device_id, challenge, expires_at FROM kt_device_challenges WHERE challenge_id=? AND device_id=?",
  ).bind(challengeId, deviceId).first<ChallengeRow>();
  if (!challenge) throw new PriceReportDeviceError("Challenge không tồn tại hoặc đã được dùng.", 409, "CHALLENGE_NOT_FOUND");
  if (Number(challenge.expires_at) <= Date.now()) {
    await database.prepare("DELETE FROM kt_device_challenges WHERE challenge_id=?").bind(challengeId).run();
    throw new PriceReportDeviceError("Challenge đã hết hạn.", 409, "CHALLENGE_EXPIRED");
  }

  const consumed = await database.prepare(
    "DELETE FROM kt_device_challenges WHERE challenge_id=? AND device_id=?",
  ).bind(challengeId, deviceId).run();
  if (Number(consumed.meta.changes ?? 0) !== 1) {
    throw new PriceReportDeviceError("Challenge đã được sử dụng.", 409, "CHALLENGE_ALREADY_USED");
  }

  const row = await deviceRow(database, deviceId);
  if (!row) throw new PriceReportDeviceError("Không tìm thấy thiết bị PriceReport.", 404, "DEVICE_NOT_FOUND");
  let jwk: JsonWebKey;
  try {
    jwk = JSON.parse(row.public_jwk_json) as JsonWebKey;
  } catch {
    throw new PriceReportDeviceError("Khóa thiết bị trong registry bị lỗi.", 500, "DEVICE_PUBLIC_KEY_CORRUPT");
  }

  const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const signingInput = `price-report-device:v1:${deviceId}:${challengeId}:${challenge.challenge}`;
  const verified = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    fromBase64Url(signature),
    new TextEncoder().encode(signingInput),
  );
  if (!verified) throw new PriceReportDeviceError("Chữ ký thiết bị không hợp lệ.", 403, "DEVICE_PROOF_INVALID");

  await database.prepare(
    "UPDATE kt_devices SET last_seen_at=?, updated_at=CURRENT_TIMESTAMP WHERE device_id=?",
  ).bind(Date.now(), deviceId).run();
  const updated = await deviceRow(database, deviceId);
  if (!updated) throw new PriceReportDeviceError("Không tìm thấy thiết bị PriceReport.", 404, "DEVICE_NOT_FOUND");
  const device = publicDevice(updated);

  if (device.status === "pending") {
    throw new PriceReportDeviceError("Thiết bị PriceReport đang chờ quản trị viên duyệt.", 409, "DEVICE_PENDING");
  }
  if (device.status === "blocked") {
    throw new PriceReportDeviceError("Thiết bị PriceReport đã bị khóa.", 403, "DEVICE_BLOCKED");
  }

  const sessionToken = `kt1.${randomToken(32)}`;
  const sessionHash = await sha256Hex(sessionToken);
  const expiresAt = Date.now() + DEVICE_SESSION_TTL_MS;
  await database.prepare(
    `INSERT INTO kt_device_sessions (session_hash, device_id, state, expires_at, last_seen_at)
     VALUES (?, ?, 'active', ?, ?)`,
  ).bind(sessionHash, deviceId, expiresAt, Date.now()).run();
  await audit(database, `device:${deviceId}`, "device_proof_verified", deviceId, { expiresAt });

  return { device, sessionToken, expiresAt };
}

async function sessionAndDevice(database: D1Database, sessionTokenValue: unknown) {
  const sessionToken = text(sessionTokenValue, 256);
  if (!/^bm1\.[A-Za-z0-9_-]{40,100}$/.test(sessionToken)) {
    throw new PriceReportDeviceError("Phiên thiết bị không hợp lệ.", 401, "DEVICE_SESSION_INVALID");
  }
  const sessionHash = await sha256Hex(sessionToken);
  const session = await database.prepare(
    "SELECT session_hash, device_id, state, expires_at, last_seen_at FROM kt_device_sessions WHERE session_hash=?",
  ).bind(sessionHash).first<SessionRow>();
  if (!session || session.state !== "active") {
    throw new PriceReportDeviceError("Phiên thiết bị đã hết hiệu lực.", 401, "DEVICE_SESSION_REVOKED");
  }
  if (Number(session.expires_at) <= Date.now()) {
    await database.prepare(
      "UPDATE kt_device_sessions SET state='expired', revoked_at=CURRENT_TIMESTAMP WHERE session_hash=? AND state='active'",
    ).bind(sessionHash).run();
    throw new PriceReportDeviceError("Phiên thiết bị đã hết hạn.", 401, "DEVICE_SESSION_EXPIRED");
  }
  const row = await deviceRow(database, session.device_id);
  if (!row) throw new PriceReportDeviceError("Thiết bị của phiên không còn trong registry.", 401, "DEVICE_NOT_FOUND");
  const device = publicDevice(row);
  if (device.status !== "approved") {
    await database.prepare(
      "UPDATE kt_device_sessions SET state='revoked', revoked_at=CURRENT_TIMESTAMP, revoked_by='device-status' WHERE session_hash=? AND state='active'",
    ).bind(sessionHash).run();
    throw new PriceReportDeviceError(
      device.status === "blocked" ? "Thiết bị PriceReport đã bị khóa." : "Thiết bị PriceReport chưa được duyệt.",
      403,
      device.status === "blocked" ? "DEVICE_BLOCKED" : "DEVICE_PENDING",
    );
  }
  return { sessionHash, session, device };
}

export async function touchPriceReportDeviceSession(database: D1Database, sessionToken: unknown) {
  const authenticated = await sessionAndDevice(database, sessionToken);
  const now = Date.now();
  await database.batch([
    database.prepare("UPDATE kt_devices SET last_seen_at=?, updated_at=CURRENT_TIMESTAMP WHERE device_id=?")
      .bind(now, authenticated.device.deviceId),
    database.prepare("UPDATE kt_device_sessions SET last_seen_at=? WHERE session_hash=? AND state='active'")
      .bind(now, authenticated.sessionHash),
  ]);
  const updated = await deviceRow(database, authenticated.device.deviceId);
  if (!updated) throw new PriceReportDeviceError("Thiết bị không còn trong registry.", 401, "DEVICE_NOT_FOUND");
  return publicDevice(updated);
}

export async function readPriceReportDeviceStatus(database: D1Database, deviceIdValue: unknown) {
  const deviceId = text(deviceIdValue, 64).toLowerCase();
  if (!validDeviceId(deviceId)) throw new PriceReportDeviceError("Mã thiết bị không hợp lệ.", 400, "INVALID_DEVICE_ID");
  const row = await deviceRow(database, deviceId);
  if (!row) throw new PriceReportDeviceError("Không tìm thấy thiết bị PriceReport.", 404, "DEVICE_NOT_FOUND");
  const device = publicDevice(row);
  return {
    deviceId: device.deviceId,
    deviceCode: device.deviceCode,
    status: device.status,
    editEnabled: device.editEnabled,
    active: device.active,
    lastSeenAt: device.lastSeenAt,
  };
}

export async function listPriceReportDevices(database: D1Database) {
  const rows = await database.prepare(
    `SELECT device_id, display_code, public_jwk_json, device_type, platform, browser, display_name, label, status, edit_enabled,
            created_at, updated_at, last_seen_at, approved_at, approved_by, blocked_at
       FROM kt_devices ORDER BY created_at DESC LIMIT 500`,
  ).all<DeviceRow>();
  return rows.results.map(publicDevice);
}

export async function executePriceReportDeviceCommand(
  database: D1Database,
  identity: PriceReportControlIdentity,
  payload: Record<string, unknown>,
) {
  if (identity.role !== "owner") {
    throw new PriceReportDeviceError("PriceReport yêu cầu quyền Chủ hệ thống để thay đổi thiết bị.", 403, "OWNER_REQUIRED");
  }

  const commandId = text(payload.commandId, 64).toLowerCase();
  const deviceId = text(payload.deviceId, 64).toLowerCase();
  const operation = payload.operation === "approve" || payload.operation === "block" || payload.operation === "unblock" || payload.operation === "set_edit_permission"
    ? payload.operation
    : "";
  const expectedStatus = normalizeStatus(payload.expectedStatus);
  const requestedEditEnabled = typeof payload.editEnabled === "boolean" ? payload.editEnabled : null;
  if (!validCommandId(commandId)) throw new PriceReportDeviceError("commandId không hợp lệ.", 400, "INVALID_COMMAND_ID");
  if (!validDeviceId(deviceId)) throw new PriceReportDeviceError("Mã thiết bị không hợp lệ.", 400, "INVALID_DEVICE_ID");
  if (!operation) throw new PriceReportDeviceError("Thao tác thiết bị không hợp lệ.", 400, "INVALID_DEVICE_OPERATION");
  if (!expectedStatus) throw new PriceReportDeviceError("expectedStatus không hợp lệ.", 400, "INVALID_EXPECTED_STATUS");
  if (operation === "approve" && expectedStatus !== "pending") {
    throw new PriceReportDeviceError("Chỉ thiết bị pending mới được duyệt.", 409, "DEVICE_STATE_CONFLICT");
  }
  if (operation === "block" && expectedStatus !== "pending" && expectedStatus !== "approved") {
    throw new PriceReportDeviceError("Thiết bị đã bị khóa hoặc trạng thái không cho phép.", 409, "DEVICE_STATE_CONFLICT");
  }
  if (operation === "unblock" && expectedStatus !== "blocked") {
    throw new PriceReportDeviceError("Chỉ thiết bị blocked mới được mở khóa.", 409, "DEVICE_STATE_CONFLICT");
  }
  if (operation === "set_edit_permission" && (expectedStatus !== "approved" || requestedEditEnabled === null)) {
    throw new PriceReportDeviceError("Quyền sửa chỉ thay đổi trên thiết bị approved và phải có editEnabled boolean.", 409, "DEVICE_EDIT_PERMISSION_CONFLICT");
  }

  const payloadHash = await sha256Hex(JSON.stringify({ deviceId, expectedStatus, operation, editEnabled: requestedEditEnabled }));
  const existing = await commandRow(database, commandId);
  if (existing) {
    if (existing.payload_hash !== payloadHash) {
      throw new PriceReportDeviceError("commandId đã được dùng cho payload khác.", 409, "COMMAND_ID_PAYLOAD_MISMATCH");
    }
    if (existing.state === "completed" && normalizeStatus(existing.result_status)) {
      return { commandId, deviceId, operation, status: existing.result_status as PriceReportDeviceStatus, replayed: true };
    }
    throw new PriceReportDeviceError(
      "Lệnh này đã được tiếp nhận nhưng chưa có kết quả chắc chắn; không tự động chạy lại.",
      409,
      existing.state === "processing" ? "COMMAND_IN_PROGRESS" : "COMMAND_REQUIRES_RECONCILIATION",
    );
  }

  const current = await deviceRow(database, deviceId);
  if (!current) throw new PriceReportDeviceError("Không tìm thấy thiết bị PriceReport.", 404, "DEVICE_NOT_FOUND");
  if (normalizeStatus(current.status) !== expectedStatus) {
    throw new PriceReportDeviceError(
      `Snapshot PriceReport đã thay đổi: expected ${expectedStatus}, hiện tại ${current.status}.`,
      409,
      "DEVICE_STATE_CONFLICT",
    );
  }

  const executionNonce = crypto.randomUUID();
  await database.prepare(
    `INSERT OR IGNORE INTO kt_control_commands
       (command_id, device_id, operation, expected_status, payload_hash, state, actor, control_device_id, execution_nonce)
     VALUES (?, ?, ?, ?, ?, 'processing', ?, ?, ?)`,
  ).bind(commandId, deviceId, operation, expectedStatus, payloadHash, identity.actor, identity.controlDeviceId, executionNonce).run();

  const owned = await commandRow(database, commandId);
  if (!owned) throw new PriceReportDeviceError("Không thể ghi command ledger PriceReport.", 500, "COMMAND_LEDGER_WRITE_FAILED");
  if (owned.payload_hash !== payloadHash) {
    throw new PriceReportDeviceError("commandId đã được dùng cho payload khác.", 409, "COMMAND_ID_PAYLOAD_MISMATCH");
  }
  if (owned.execution_nonce !== executionNonce) {
    if (owned.state === "completed" && normalizeStatus(owned.result_status)) {
      return { commandId, deviceId, operation, status: owned.result_status as PriceReportDeviceStatus, replayed: true };
    }
    throw new PriceReportDeviceError("Lệnh cùng commandId đang được xử lý.", 409, "COMMAND_IN_PROGRESS");
  }

  const targetStatus: PriceReportDeviceStatus =
    operation === "block" ? "blocked" : operation === "set_edit_permission" ? expectedStatus : "approved";
  try {
    let mutation;
    if (operation === "approve") {
      mutation = await database.prepare(
        `UPDATE kt_devices
            SET status='approved', approved_at=CURRENT_TIMESTAMP, approved_by=?, blocked_at=NULL,
                updated_at=CURRENT_TIMESTAMP
          WHERE device_id=? AND status=?`,
      ).bind(identity.actor, deviceId, expectedStatus).run();
    } else if (operation === "block") {
      mutation = await database.prepare(
        `UPDATE kt_devices
            SET status='blocked', edit_enabled=0, blocked_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
          WHERE device_id=? AND status=?`,
      ).bind(deviceId, expectedStatus).run();
    } else if (operation === "unblock") {
      mutation = await database.prepare(
        `UPDATE kt_devices
            SET status='approved', blocked_at=NULL, approved_at=COALESCE(approved_at, CURRENT_TIMESTAMP),
                approved_by=COALESCE(approved_by, ?), updated_at=CURRENT_TIMESTAMP
          WHERE device_id=? AND status='blocked'`,
      ).bind(identity.actor, deviceId).run();
    } else {
      mutation = await database.prepare(
        `UPDATE kt_devices
            SET edit_enabled=?, updated_at=CURRENT_TIMESTAMP
          WHERE device_id=? AND status='approved'`,
      ).bind(requestedEditEnabled ? 1 : 0, deviceId).run();
    }

    if (Number(mutation.meta.changes ?? 0) !== 1) {
      await database.prepare(
        "UPDATE kt_control_commands SET state='failed', error_code='DEVICE_STATE_CONFLICT', completed_at=CURRENT_TIMESTAMP WHERE command_id=? AND execution_nonce=?",
      ).bind(commandId, executionNonce).run();
      throw new PriceReportDeviceError("Trạng thái thiết bị đã thay đổi trước khi lệnh được áp dụng.", 409, "DEVICE_STATE_CONFLICT");
    }

    const revokedSessions = operation === "block" ? await revokeDeviceSessions(database, deviceId, identity.actor) : 0;
    const auditAction =
      operation === "approve" ? "device_approved"
        : operation === "block" ? "device_blocked"
          : operation === "unblock" ? "device_unblocked"
            : "device_edit_permission_changed";
    await audit(database, identity.actor, auditAction, deviceId, {
      commandId,
      expectedStatus,
      resultStatus: targetStatus,
      registryPreserved: true,
      editDisabled: operation === "block",
      editEnabled: operation === "set_edit_permission" ? requestedEditEnabled : undefined,
      revokedSessions,
    });

    await database.prepare(
      "UPDATE kt_control_commands SET state='completed', result_status=?, completed_at=CURRENT_TIMESTAMP WHERE command_id=? AND execution_nonce=?",
    ).bind(targetStatus, commandId, executionNonce).run();

    const updated = await deviceRow(database, deviceId);
    if (!updated || normalizeStatus(updated.status) !== targetStatus
      || (operation === "set_edit_permission" && (updated.edit_enabled === 1) !== requestedEditEnabled)) {
      throw new PriceReportDeviceError("Registry PriceReport chưa xác nhận kết quả lệnh.", 502, "DEVICE_COMMAND_READBACK_MISMATCH");
    }
    return { commandId, deviceId, operation, status: targetStatus, replayed: false, device: publicDevice(updated), revokedSessions };
  } catch (error) {
    if (!(error instanceof PriceReportDeviceError && error.code === "DEVICE_STATE_CONFLICT")) {
      try {
        await database.prepare(
          "UPDATE kt_control_commands SET state='uncertain', error_code='COMMAND_REQUIRES_RECONCILIATION' WHERE command_id=? AND execution_nonce=? AND state='processing'",
        ).bind(commandId, executionNonce).run();
      } catch {
        // Refuse blind replay while the ledger is unresolved.
      }
    }
    throw error;
  }
}

export async function listPriceReportAudit(database: D1Database) {
  const rows = await database.prepare(
    "SELECT id, actor, action, target, detail_json, created_at FROM kt_audit_log ORDER BY id DESC LIMIT 300",
  ).all<{ id: number; actor: string; action: string; target: string; detail_json: string; created_at: string }>();
  return rows.results.map((row) => {
    let detail: Record<string, unknown> = {};
    try { detail = JSON.parse(row.detail_json) as Record<string, unknown>; } catch { detail = {}; }
    return { id: `bm-${row.id}`, actor: row.actor, action: row.action, target: row.target, detail, createdAt: row.created_at };
  });
}
