# KT Control Service deployment

PriceReport remains local-first for quotation/customer/catalog data. Only device access metadata is stored in the client-owned KT Control D1.

## Production boundary

- Registry namespace: `KT-`
- Device identity: non-extractable ECDSA P-256 private key in browser IndexedDB
- Server stores public JWK only
- Device states: `pending / approved / blocked`
- Approved proof issues revocable `kt1.*` session
- Blocking a device preserves registry/audit and revokes active sessions
- Admin mutation uses `commandId` + `expectedStatus`
- Application Management uses a short-lived HMAC bridge ticket
- Quote/customer/catalog/backup content never enters KT Control D1

## GitHub environment required

Environment: `price-report-control-production`

Secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `PRICE_REPORT_CONTROL_D1_DATABASE_ID`
- `PRICE_REPORT_CONTROL_SERVICE_SECRET` (>=32 chars)

Variables:
- `PRICE_REPORT_CONTROL_ORIGIN`
- `PRICE_REPORT_APP_ORIGIN=https://bluedragon33.github.io`
- `APPLICATION_MANAGEMENT_ORIGIN`

Deployment is manual and fail-closed. The deploy workflow first applies D1 migrations, deploys the Worker, rotates the control secret, and requires a successful public health read-back. It then triggers the Pages workflow.

The Pages workflow runs `scripts/production-config.mjs`. When `PRICE_REPORT_CONTROL_ORIGIN` is empty, the checked-in source remains classification-only. When the origin is configured, the script re-verifies `/health` before it:
- enables `public/device-control.json`,
- publishes live readiness in `public/management-contract.json`,
- marks `policy.remoteAdminReady=true`, and
- rotates the PWA cache namespace so existing clients do not keep a stale rollout contract.

Application Management must use the same control origin and `PRICE_REPORT_CONTROL_SERVICE_SECRET`. If health verification fails, Pages deployment fails instead of publishing an enabled Device Gate against an unhealthy control service.


## Environment-to-Pages origin handoff

`PRICE_REPORT_CONTROL_ORIGIN` may be stored as a variable on the protected `price-report-control-production` GitHub Environment. The control-service deployment therefore forwards that verified value explicitly to the Pages `workflow_dispatch` input `control_origin`. The Pages workflow prefers the forwarded input and only falls back to the repository variable for ordinary pushes/manual runs.

Production health also requires `applicationManagementOriginConfigured=true` before the Device Gate can be enabled. This prevents a partially configured control service from being advertised as remotely manageable.
