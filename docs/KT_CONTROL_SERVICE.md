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

Deployment is manual and fail-closed. After health read-back passes, update `public/device-control.json` with the live origin and enable the gate, then publish GitHub Pages and configure the same control origin/secret in Application Management.
