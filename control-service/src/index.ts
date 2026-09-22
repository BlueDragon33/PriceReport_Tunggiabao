import {
  PriceReportDeviceError,
  executePriceReportDeviceCommand,
  issuePriceReportDeviceChallenge,
  listPriceReportAudit,
  listPriceReportDevices,
  readPriceReportDeviceStatus,
  registerPriceReportDevice,
  touchPriceReportDeviceSession,
  verifyPriceReportDeviceProof,
  type PriceReportControlIdentity,
  type PriceReportControlRole,
} from "./device-store";

interface Env {
  PRICE_REPORT_CONTROL_SERVICE_SECRET?: string;
  APPLICATION_MANAGEMENT_ORIGIN?: string;
  PRICE_REPORT_APP_ORIGIN?: string;
  DB?: D1Database;
}

type Identity = PriceReportControlIdentity;
type Role = PriceReportControlRole;

const TOKEN_ISSUER = "application-management";
const TOKEN_AUDIENCE = "price-report-control";
const TOKEN_APP = "price-report-tunggiabao";
const CONTROL_PROTOCOL = "price-report-control-v1";

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 3072) throw new Error("INVALID_TICKET");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function secureEqual(left: string, right: string) {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return difference === 0;
}

async function signature(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function authenticate(request: Request, env: Env): Promise<Identity> {
  const secret = env.PRICE_REPORT_CONTROL_SERVICE_SECRET ?? "";
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (secret.length < 32 || supplied.length < 32) throw new PriceReportDeviceError("Không được phép truy cập control API PriceReport.", 403, "CONTROL_TICKET_FORBIDDEN");

  if (await secureEqual(secret, supplied)) {
    const suppliedRole = (request.headers.get("x-control-role") ?? "viewer").toLowerCase();
    const role = (["viewer", "reviewer", "publisher", "owner"].includes(suppliedRole) ? suppliedRole : "viewer") as Role;
    const controlDeviceId = (request.headers.get("x-control-device") ?? "").toLowerCase();
    return {
      actor: (request.headers.get("x-control-actor") ?? "system").trim().toLowerCase().slice(0, 160),
      role,
      controlDeviceId: /^[a-f0-9]{64}$/.test(controlDeviceId) ? controlDeviceId : null,
    };
  }

  const [version, encoded, suppliedSignature, extra] = supplied.split(".");
  if (version !== "v1" || !encoded || !suppliedSignature || extra) {
    throw new PriceReportDeviceError("Vé quản trị PriceReport không hợp lệ.", 403, "CONTROL_TICKET_FORBIDDEN");
  }
  if (!(await secureEqual(await signature(secret, `${version}.${encoded}`), suppliedSignature))) {
    throw new PriceReportDeviceError("Chữ ký vé quản trị PriceReport không hợp lệ.", 403, "CONTROL_TICKET_FORBIDDEN");
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as Record<string, unknown>;
  } catch {
    throw new PriceReportDeviceError("Payload vé quản trị PriceReport không hợp lệ.", 403, "CONTROL_TICKET_FORBIDDEN");
  }

  const actor = typeof payload.actor === "string" ? payload.actor.trim().toLowerCase().slice(0, 160) : "";
  const suppliedRole = typeof payload.role === "string" ? payload.role : "viewer";
  const role = (["viewer", "reviewer", "publisher", "owner"].includes(suppliedRole) ? suppliedRole : "viewer") as Role;
  const expiresAt = typeof payload.exp === "number" ? payload.exp : 0;
  const controlDeviceId = typeof payload.controlDeviceId === "string" && /^[a-f0-9]{64}$/.test(payload.controlDeviceId) ? payload.controlDeviceId : null;
  if (
    payload.iss !== TOKEN_ISSUER
    || payload.aud !== TOKEN_AUDIENCE
    || payload.app !== TOKEN_APP
    || !actor.includes("@")
    || expiresAt <= Date.now()
    || expiresAt > Date.now() + 10 * 60 * 1000
  ) {
    throw new PriceReportDeviceError("Vé quản trị PriceReport đã hết hạn hoặc không hợp lệ.", 403, "CONTROL_TICKET_FORBIDDEN");
  }
  return { actor, role, controlDeviceId };
}

function configuredOrigin(value: string | undefined) {
  return (value ?? "").trim().replace(/\/$/, "");
}

function corsFor(request: Request, allowedOrigin: string | undefined): Record<string, string> {
  const configured = configuredOrigin(allowedOrigin);
  const origin = configuredOrigin(request.headers.get("origin") ?? "");
  return configured && origin === configured ? {
    "access-control-allow-origin": configured,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-max-age": "600",
    vary: "Origin",
  } : {};
}

function controlCors(request: Request, env: Env) {
  return corsFor(request, env.APPLICATION_MANAGEMENT_ORIGIN);
}

function appCors(request: Request, env: Env) {
  return corsFor(request, env.PRICE_REPORT_APP_ORIGIN);
}

function securityHeaders(): Record<string, string> {
  return {
    "cache-control": "no-store, private",
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "x-content-type-options": "nosniff",
  };
}

function json(request: Request, env: Env, data: unknown, status = 200, surface: "control" | "app" | "none" = "control") {
  const cors = surface === "control" ? controlCors(request, env) : surface === "app" ? appCors(request, env) : {};
  return Response.json(data, { status, headers: { ...securityHeaders(), ...cors } });
}

function requireAppOrigin(request: Request, env: Env) {
  const configured = configuredOrigin(env.PRICE_REPORT_APP_ORIGIN);
  if (!configured) throw new PriceReportDeviceError("Chưa cấu hình PRICE_REPORT_APP_ORIGIN.", 503, "PRICE_REPORT_APP_ORIGIN_NOT_CONFIGURED");
  const origin = configuredOrigin(request.headers.get("origin") ?? "");
  if (origin !== configured) throw new PriceReportDeviceError("Origin không được phép dùng device gateway PriceReport.", 403, "PRICE_REPORT_APP_ORIGIN_FORBIDDEN");
}

function requireDatabase(env: Env) {
  if (!env.DB) throw new PriceReportDeviceError("PriceReport control service chưa được gắn D1 DB.", 503, "PRICE_REPORT_DB_NOT_CONFIGURED");
  return env.DB;
}

async function databaseReady(env: Env) {
  if (!env.DB) return false;
  try {
    await env.DB.prepare("SELECT device_id FROM kt_devices LIMIT 1").first();
    await env.DB.prepare("SELECT challenge_id FROM kt_device_challenges LIMIT 1").first();
    await env.DB.prepare("SELECT session_hash FROM kt_device_sessions LIMIT 1").first();
    await env.DB.prepare("SELECT command_id FROM kt_control_commands LIMIT 1").first();
    await env.DB.prepare("SELECT id FROM kt_audit_log LIMIT 1").first();
    return true;
  } catch {
    return false;
  }
}

async function body(request: Request) {
  const parsed = await request.json().catch(() => null);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new PriceReportDeviceError("JSON body không hợp lệ.", 400, "INVALID_JSON_BODY");
  }
  return parsed as Record<string, unknown>;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

function errorResponse(request: Request, env: Env, error: unknown, surface: "control" | "app") {
  if (error instanceof PriceReportDeviceError) {
    return json(request, env, { ok: false, error: error.message, code: error.code }, error.status, surface);
  }
  return json(request, env, { ok: false, error: "PriceReport control service đang tạm gián đoạn.", code: "PRICE_REPORT_CONTROL_ERROR" }, 500, surface);
}

async function publicDeviceRoute(request: Request, env: Env, url: URL) {
  try {
    requireAppOrigin(request, env);
    const database = requireDatabase(env);

    if (request.method === "POST" && url.pathname === "/api/device/register") {
      const device = await registerPriceReportDevice(database, await body(request));
      return json(request, env, { ok: true, application: TOKEN_APP, device }, 200, "app");
    }
    if (request.method === "POST" && url.pathname === "/api/device/challenge") {
      const payload = await body(request);
      const challenge = await issuePriceReportDeviceChallenge(database, payload.deviceId);
      return json(request, env, { ok: true, application: TOKEN_APP, ...challenge }, 200, "app");
    }
    if (request.method === "POST" && url.pathname === "/api/device/verify") {
      const verified = await verifyPriceReportDeviceProof(database, await body(request));
      return json(request, env, { ok: true, application: TOKEN_APP, ...verified }, 200, "app");
    }
    if (request.method === "POST" && url.pathname === "/api/device/heartbeat") {
      const device = await touchPriceReportDeviceSession(database, bearerToken(request));
      return json(request, env, { ok: true, application: TOKEN_APP, device }, 200, "app");
    }
    if (request.method === "GET" && url.pathname === "/api/device/status") {
      const device = await readPriceReportDeviceStatus(database, url.searchParams.get("deviceId"));
      return json(request, env, { ok: true, application: TOKEN_APP, device }, 200, "app");
    }
    return json(request, env, { ok: false, code: "NOT_FOUND" }, 404, "app");
  } catch (error) {
    return errorResponse(request, env, error, "app");
  }
}

async function controlRoute(request: Request, env: Env, url: URL) {
  try {
    const identity = await authenticate(request, env);

    if (request.method === "GET" && url.pathname === "/api/control/status") {
      const ready = await databaseReady(env);
      const appOriginReady = Boolean(configuredOrigin(env.PRICE_REPORT_APP_ORIGIN));
      return json(request, env, {
        ok: true,
        application: TOKEN_APP,
        canonicalApplication: TOKEN_APP,
        protocol: CONTROL_PROTOCOL,
        actorRole: identity.role,
        ownership: {
          runtime: "PriceReport_Tunggiabao",
          database: "PriceReport_Tunggiabao-control-service",
          deviceRegistry: "PriceReport_Tunggiabao-control-service",
          deviceSessions: "PriceReport_Tunggiabao-control-service",
          audit: "PriceReport_Tunggiabao-control-service",
          quotationData: "PriceReport_Tunggiabao-client-local",
          customerData: "PriceReport_Tunggiabao-client-local",
          centralRole: "policy-and-remote-admin-only",
        },
        readiness: {
          runtime: "available",
          deviceRegistry: ready ? "available" : "configuration-required",
          deviceGateway: ready && appOriginReady ? "available" : "configuration-required",
          mutationAdminApi: ready ? "available" : "configuration-required",
          auditApi: ready ? "available" : "configuration-required",
          p256Proof: ready && appOriginReady ? "available" : "configuration-required",
          revocableDeviceSessions: ready && appOriginReady ? "available" : "configuration-required",
        },
        capabilities: {
          deviceRegistry: ready,
          deviceRegistration: ready && appOriginReady,
          deviceApproval: ready,
          deviceUnblock: ready,
          deviceEditPermission: ready,
          deviceMetadata: ready,
          deviceIdempotentCommands: ready,
          optimisticConcurrency: ready,
          accessAndEditSeparated: ready,
          audit: ready,
          p256DeviceIdentity: ready,
          p256ChallengeProof: ready && appOriginReady,
          revocableDeviceSessions: ready && appOriginReady,
        },
        endpoints: {
          devices: "/api/control/devices",
          deviceCommands: "/api/control/device-commands",
          audit: "/api/control/audit",
          deviceRegister: "/api/device/register",
          deviceChallenge: "/api/device/challenge",
          deviceVerify: "/api/device/verify",
          deviceHeartbeat: "/api/device/heartbeat",
          deviceStatus: "/api/device/status",
        },
        deviceRegistry: { owner: "PriceReport_Tunggiabao", namespace: "KT-" },
        checkedAt: Date.now(),
      });
    }

    if (request.method === "GET" && url.pathname === "/api/control/devices") {
      const database = requireDatabase(env);
      const devices = await listPriceReportDevices(database);
      return json(request, env, { ok: true, application: TOKEN_APP, devices });
    }

    if (request.method === "POST" && url.pathname === "/api/control/device-commands") {
      const database = requireDatabase(env);
      const command = await executePriceReportDeviceCommand(database, identity, await body(request));
      return json(request, env, { ok: true, application: TOKEN_APP, ...command });
    }

    if (request.method === "GET" && url.pathname === "/api/control/audit") {
      if (identity.role === "viewer") throw new PriceReportDeviceError("Cần quyền reviewer trở lên để đọc audit PriceReport.", 403, "REVIEWER_REQUIRED");
      const database = requireDatabase(env);
      const audit = await listPriceReportAudit(database);
      return json(request, env, { ok: true, application: TOKEN_APP, audit });
    }

    return json(request, env, { ok: false, code: "NOT_FOUND" }, 404);
  } catch (error) {
    return errorResponse(request, env, error, "control");
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      if (url.pathname.startsWith("/api/device/")) {
        return new Response(null, { status: 204, headers: { ...securityHeaders(), ...appCors(request, env) } });
      }
      if (url.pathname.startsWith("/api/control/")) {
        return new Response(null, { status: 204, headers: { ...securityHeaders(), ...controlCors(request, env) } });
      }
      return new Response(null, { status: 204, headers: securityHeaders() });
    }

    if (url.pathname === "/health") {
      const ready = await databaseReady(env);
      return json(request, env, {
        ok: ready,
        application: TOKEN_APP,
        protocol: CONTROL_PROTOCOL,
        databaseReady: ready,
        appOriginConfigured: Boolean(configuredOrigin(env.PRICE_REPORT_APP_ORIGIN)),
        applicationManagementOriginConfigured: Boolean(configuredOrigin(env.APPLICATION_MANAGEMENT_ORIGIN)),
        controlSecretConfigured: (env.PRICE_REPORT_CONTROL_SERVICE_SECRET ?? "").length >= 32,
      }, ready ? 200 : 503, "none");
    }

    if (url.pathname.startsWith("/api/device/")) return await publicDeviceRoute(request, env, url);
    if (url.pathname.startsWith("/api/control/")) return await controlRoute(request, env, url);
    return json(request, env, { ok: false, code: "NOT_FOUND" }, 404, "none");
  },
};
