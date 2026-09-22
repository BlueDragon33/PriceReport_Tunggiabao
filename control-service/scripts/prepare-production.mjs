import fs from 'node:fs';

const required = [
  'PRICE_REPORT_CONTROL_D1_DATABASE_ID',
  'PRICE_REPORT_APP_ORIGIN',
  'APPLICATION_MANAGEMENT_ORIGIN'
];
for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} is required`);
}
if (!/^[0-9a-f-]{36}$/i.test(process.env.PRICE_REPORT_CONTROL_D1_DATABASE_ID)) throw new Error('PRICE_REPORT_CONTROL_D1_DATABASE_ID must be a UUID');
for (const key of ['PRICE_REPORT_APP_ORIGIN','APPLICATION_MANAGEMENT_ORIGIN']) {
  const url = new URL(process.env[key]);
  if (url.protocol !== 'https:') throw new Error(`${key} must use HTTPS`);
}
let text = fs.readFileSync(new URL('../wrangler.production.example.jsonc', import.meta.url), 'utf8');
for (const key of required) text = text.replaceAll(`__${key}__`, process.env[key]);
fs.writeFileSync(new URL('../wrangler.production.jsonc', import.meta.url), text);
console.log('PriceReport production Wrangler config materialized.');
