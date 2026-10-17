// Per-Worker-isolate accounting for real D1 operations. This is NOT a global
// Cloudflare Worker quiescence barrier and NEVER grants shutdown authority.
export function createLocalD1Observer(serviceId: string) {
  let activeRequests = 0;
  let activeD1Calls = 0;
  let completedD1Calls = 0;
  let failedD1Calls = 0;
  const preparedNative = new WeakMap<object, D1PreparedStatement>();

  async function observed<T>(invoke: () => Promise<T>): Promise<T> {
    activeD1Calls++;
    try {
      const result = await invoke();
      completedD1Calls++;
      return result;
    } catch (error) {
      failedD1Calls++;
      throw error;
    } finally {
      activeD1Calls--;
    }
  }

  function trackStatement(statement: D1PreparedStatement): D1PreparedStatement {
    const proxied = new Proxy(statement, {
      get(target, property) {
        if (property === "bind") {
          return (...values: unknown[]) =>
            trackStatement(Reflect.apply(Reflect.get(target, property), target, values));
        }
        const value = Reflect.get(target, property);
        if (typeof value !== "function") return value;
        if (["run", "first", "all", "raw"].includes(String(property))) {
          return (...args: unknown[]) =>
            observed(() => Reflect.apply(value, target, args) as Promise<unknown>);
        }
        return value.bind(target);
      },
    });
    preparedNative.set(proxied, statement);
    return proxied;
  }

  function trackDatabase(database: D1Database): D1Database {
    return new Proxy(database, {
      get(target, property) {
        if (property === "prepare") return (sql: string) => trackStatement(target.prepare(sql));
        if (property === "batch") {
          return (statements: D1PreparedStatement[]) =>
            observed(() => target.batch(statements.map(stmt => preparedNative.get(stmt) ?? stmt)));
        }
        if (property === "exec") return (sql: string) => observed(() => target.exec(sql));
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }

  async function trackFetch<TEnv extends { DB?: D1Database }>(
    env: TEnv, work: (wrapped: TEnv) => Promise<Response>,
  ): Promise<Response> {
    activeRequests++;
    const wrapped = env.DB ? { ...env, DB: trackDatabase(env.DB) } as TEnv : env;
    try { return await work(wrapped); }
    finally { activeRequests--; }
  }

  function snapshot() {
    return { serviceId, activeRequests, activeD1Calls, completedD1Calls,
      failedD1Calls, scope: "single-worker-isolate",
      allIsolatesObserved: false, allD1BindingsInstrumented: false,
      transactionCommitBarrierVerified: false, durableReadbackVerified: false,
      processExitVerified: false, gracefulShutdownReady: false };
  }

  // Constant 503 deliberately ignores any caller-supplied token/identity.
  // No public caller can set a drain state on a Worker that lacks global proof.
  function blockedPreflight(): Response {
    return Response.json({
      ok: false, protocol: "local-ops-runtime-drain/v1",
      code: "WORKER_ISOLATE_D1_DRAIN_UNVERIFIED",
      serviceId, supported: false, durableReadbackVerified: false,
      fullRuntimeExitVerified: false, autoRestartAllowed: false,
    }, { status: 503, headers: { "cache-control": "no-store",
      "x-content-type-options": "nosniff" } });
  }
  return { trackFetch, snapshot, blockedPreflight };
}
