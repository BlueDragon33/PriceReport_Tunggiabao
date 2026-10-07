import {
  PriceReportDeviceError,
  type PriceReportControlIdentity,
} from "./device-store";

export type PriceReportAutomationPolicy = {
  autoApproveDevices: boolean;
  autoBlockPendingDevices: boolean;
  pendingBlockAfterHours: 24 | 168 | 720;
  revision: number;
};

type AutomationRow = {
  auto_approve_devices: number;
  auto_block_pending_devices: number;
  pending_block_after_hours: number;
  revision: number;
};

type AutomationCommandRow = {
  command_id: string;
  payload_hash: string;
  state: string;
  actor: string;
  control_device_id: string | null;
  execution_nonce: string;
  error_code: string | null;
};

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function validCommandId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeHours(value: unknown): 24 | 168 | 720 | null {
  const hours = Math.round(Number(value));
  return hours === 24 || hours === 168 || hours === 720 ? hours : null;
}

function publicPolicy(row: AutomationRow): PriceReportAutomationPolicy {
  return {
    autoApproveDevices: row.auto_approve_devices === 1,
    autoBlockPendingDevices: row.auto_block_pending_devices === 1,
    pendingBlockAfterHours: normalizeHours(row.pending_block_after_hours) ?? 168,
    revision: Number(row.revision) || 1,
  };
}

async function ensurePolicy(database: D1Database) {
  await database.prepare(
    `INSERT OR IGNORE INTO kt_automation_policy
       (id, auto_approve_devices, auto_block_pending_devices, pending_block_after_hours, revision)
     VALUES (1, 0, 0, 168, 1)`,
  ).run();
}

export async function readPriceReportAutomationPolicy(database: D1Database) {
  await ensurePolicy(database);
  const row = await database.prepare(
    `SELECT auto_approve_devices, auto_block_pending_devices, pending_block_after_hours, revision
       FROM kt_automation_policy WHERE id=1`,
  ).first<AutomationRow>();
  if (!row) throw new PriceReportDeviceError("Không đọc được automation policy PriceReport.", 500, "AUTOMATION_POLICY_MISSING");
  return publicPolicy(row);
}

async function commandRow(database: D1Database, commandId: string) {
  return database.prepare(
    `SELECT command_id, payload_hash, state, actor, control_device_id, execution_nonce, error_code
       FROM kt_automation_commands WHERE command_id=?`,
  ).bind(commandId).first<AutomationCommandRow>();
}

async function audit(database: D1Database, identity: PriceReportControlIdentity, action: string, detail: Record<string, unknown>) {
  await database.prepare(
    "INSERT INTO kt_audit_log (actor, action, target, detail_json) VALUES (?, ?, 'automation', ?)",
  ).bind(identity.actor, action, JSON.stringify({ ...detail, controlDeviceId: identity.controlDeviceId })).run();
}

function expectedMatches(current: PriceReportAutomationPolicy, expected: Record<string, unknown>, desired: Record<string, unknown>) {
  if ("autoApproveDevices" in desired) {
    if (typeof expected.autoApproveDevices !== "boolean" || expected.autoApproveDevices !== current.autoApproveDevices) return false;
  }
  if ("autoBlockPendingDevices" in desired) {
    if (typeof expected.autoBlockPendingDevices !== "boolean" || expected.autoBlockPendingDevices !== current.autoBlockPendingDevices) return false;
  }
  if ("pendingBlockAfterHours" in desired) {
    const expectedHours = normalizeHours(expected.pendingBlockAfterHours);
    if (!expectedHours || expectedHours !== current.pendingBlockAfterHours) return false;
  }
  return true;
}

function desiredPolicy(current: PriceReportAutomationPolicy, desired: Record<string, unknown>) {
  const hasApprove = "autoApproveDevices" in desired;
  const hasBlock = "autoBlockPendingDevices" in desired;
  const hasHours = "pendingBlockAfterHours" in desired;
  if (!hasApprove && !hasBlock && !hasHours) {
    throw new PriceReportDeviceError("Automation command không có thay đổi.", 400, "AUTOMATION_DESIRED_EMPTY");
  }
  if (hasApprove && typeof desired.autoApproveDevices !== "boolean") {
    throw new PriceReportDeviceError("autoApproveDevices không hợp lệ.", 400, "INVALID_AUTO_APPROVE");
  }
  if (hasBlock && typeof desired.autoBlockPendingDevices !== "boolean") {
    throw new PriceReportDeviceError("autoBlockPendingDevices không hợp lệ.", 400, "INVALID_AUTO_BLOCK");
  }
  const requestedHours = hasHours ? normalizeHours(desired.pendingBlockAfterHours) : current.pendingBlockAfterHours;
  if (!requestedHours) {
    throw new PriceReportDeviceError("pendingBlockAfterHours phải là 24, 168 hoặc 720.", 400, "INVALID_AUTO_BLOCK_THRESHOLD");
  }
  return {
    autoApproveDevices: hasApprove ? desired.autoApproveDevices === true : current.autoApproveDevices,
    autoBlockPendingDevices: hasBlock ? desired.autoBlockPendingDevices === true : current.autoBlockPendingDevices,
    pendingBlockAfterHours: requestedHours,
  };
}

export async function executePriceReportAutomationCommand(
  database: D1Database,
  identity: PriceReportControlIdentity,
  payload: Record<string, unknown>,
) {
  if (identity.role !== "owner") {
    throw new PriceReportDeviceError("PriceReport yêu cầu quyền Chủ hệ thống để đổi automation policy.", 403, "OWNER_REQUIRED");
  }
  const commandId = typeof payload.commandId === "string" ? payload.commandId.trim().toLowerCase() : "";
  if (!validCommandId(commandId)) {
    throw new PriceReportDeviceError("commandId automation không hợp lệ.", 400, "INVALID_COMMAND_ID");
  }
  if (payload.operation !== "set-device-automation") {
    throw new PriceReportDeviceError("Automation operation không hợp lệ.", 400, "INVALID_AUTOMATION_OPERATION");
  }
  const expected = record(payload.expected);
  const desired = record(payload.desired);
  const requested = {
    ...("autoApproveDevices" in desired ? { autoApproveDevices: desired.autoApproveDevices } : {}),
    ...("autoBlockPendingDevices" in desired ? { autoBlockPendingDevices: desired.autoBlockPendingDevices } : {}),
    ...("pendingBlockAfterHours" in desired ? { pendingBlockAfterHours: normalizeHours(desired.pendingBlockAfterHours) } : {}),
  };
  const canonicalPayload = JSON.stringify({
    operation: "set-device-automation",
    expected: {
      ...("autoApproveDevices" in desired ? { autoApproveDevices: expected.autoApproveDevices } : {}),
      ...("autoBlockPendingDevices" in desired ? { autoBlockPendingDevices: expected.autoBlockPendingDevices } : {}),
      ...("pendingBlockAfterHours" in desired ? { pendingBlockAfterHours: normalizeHours(expected.pendingBlockAfterHours) } : {}),
    },
    desired: requested,
  });
  const payloadHash = await sha256Hex(canonicalPayload);

  const prior = await commandRow(database, commandId);
  if (prior) {
    if (prior.payload_hash !== payloadHash) {
      throw new PriceReportDeviceError("commandId automation đã được dùng cho payload khác.", 409, "COMMAND_ID_PAYLOAD_MISMATCH");
    }
    if (prior.state === "completed") {
      return { commandId, replayed: true, automation: await readPriceReportAutomationPolicy(database) };
    }
    throw new PriceReportDeviceError("Lệnh automation cùng commandId đang được xử lý.", 409, "COMMAND_IN_PROGRESS");
  }

  const current = await readPriceReportAutomationPolicy(database);
  if (!expectedMatches(current, expected, desired)) {
    throw new PriceReportDeviceError("Automation policy đã thay đổi trước khi lệnh được áp dụng.", 409, "AUTOMATION_STATE_CONFLICT");
  }
  const next = desiredPolicy(current, desired);

  const executionNonce = crypto.randomUUID();
  await database.prepare(
    `INSERT INTO kt_automation_commands
       (command_id, payload_hash, state, actor, control_device_id, execution_nonce)
     VALUES (?, ?, 'processing', ?, ?, ?)`,
  ).bind(commandId, payloadHash, identity.actor, identity.controlDeviceId, executionNonce).run();

  try {
    const mutation = await database.prepare(
      `UPDATE kt_automation_policy
          SET auto_approve_devices=?, auto_block_pending_devices=?, pending_block_after_hours=?,
              revision=revision+1, updated_by=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=1 AND revision=?`,
    ).bind(
      next.autoApproveDevices ? 1 : 0,
      next.autoBlockPendingDevices ? 1 : 0,
      next.pendingBlockAfterHours,
      identity.actor,
      current.revision,
    ).run();
    if (Number(mutation.meta.changes ?? 0) !== 1) {
      await database.prepare(
        "UPDATE kt_automation_commands SET state='failed', error_code='AUTOMATION_STATE_CONFLICT', completed_at=CURRENT_TIMESTAMP WHERE command_id=? AND execution_nonce=?",
      ).bind(commandId, executionNonce).run();
      throw new PriceReportDeviceError("Automation policy đã thay đổi trước khi ghi.", 409, "AUTOMATION_STATE_CONFLICT");
    }

    const updated = await readPriceReportAutomationPolicy(database);
    for (const [key] of Object.entries(desired)) {
      if (key === "autoApproveDevices" && updated.autoApproveDevices !== next.autoApproveDevices
        || key === "autoBlockPendingDevices" && updated.autoBlockPendingDevices !== next.autoBlockPendingDevices
        || key === "pendingBlockAfterHours" && updated.pendingBlockAfterHours !== next.pendingBlockAfterHours) {
        throw new PriceReportDeviceError("Automation policy chưa xác nhận readback.", 502, "AUTOMATION_READBACK_MISMATCH");
      }
    }

    await audit(database, identity, "automation_policy_updated", {
      commandId,
      expected,
      desired,
      result: updated,
    });
    await database.prepare(
      "UPDATE kt_automation_commands SET state='completed', completed_at=CURRENT_TIMESTAMP WHERE command_id=? AND execution_nonce=?",
    ).bind(commandId, executionNonce).run();
    return { commandId, replayed: false, automation: updated };
  } catch (error) {
    if (!(error instanceof PriceReportDeviceError && error.code === "AUTOMATION_STATE_CONFLICT")) {
      try {
        await database.prepare(
          "UPDATE kt_automation_commands SET state='uncertain', error_code='COMMAND_REQUIRES_RECONCILIATION' WHERE command_id=? AND execution_nonce=? AND state='processing'",
        ).bind(commandId, executionNonce).run();
      } catch {
        // Refuse blind replay while automation command state is unresolved.
      }
    }
    throw error;
  }
}

export async function enforcePriceReportAutomation(database: D1Database) {
  const policy = await readPriceReportAutomationPolicy(database);
  if (!policy.autoBlockPendingDevices) return { blocked: 0, policy };
  const due = await database.prepare(
    `SELECT device_id, display_code
       FROM kt_devices
      WHERE status='pending'
        AND unixepoch(created_at) <= unixepoch('now') - (? * 3600)
      ORDER BY created_at
      LIMIT 200`,
  ).bind(policy.pendingBlockAfterHours).all<{ device_id: string; display_code: string }>();

  let blocked = 0;
  for (const device of due.results) {
    const result = await database.prepare(
      `UPDATE kt_devices
          SET status='blocked', edit_enabled=0, blocked_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
        WHERE device_id=? AND status='pending'`,
    ).bind(device.device_id).run();
    if (Number(result.meta.changes ?? 0) !== 1) continue;
    blocked += 1;
    await database.prepare(
      "INSERT INTO kt_audit_log (actor, action, target, detail_json) VALUES ('automation', 'pending_device_auto_blocked', ?, ?)",
    ).bind(device.device_id, JSON.stringify({
      deviceCode: device.display_code,
      pendingBlockAfterHours: policy.pendingBlockAfterHours,
      registryPreserved: true,
    })).run();
  }
  return { blocked, policy };
}
