import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const canonical = resolve(root, 'docs/versions/v01-multitenant-whitelabel');

const required = [
  'README.md',
  'STATUS.md',
  'ARCHITECTURE.md',
  'SECURITY.md',
  'DATA_MODEL.md',
  'DEPLOYMENT.md',
  'MIGRATION.md',
  'SCREENS.md',
  'ROADMAP.md',
  'STANDARDS.md',
  'CORE_ALIGNMENT.md',
  'ACCESSIBILITY.md',
  'FEATURE_INVENTORY.md',
  'PRICING_AND_PLANS.md',
  'ENTITLEMENTS_DELTA.md',
  'COMMERCIAL_DEMO.md',
  'PRICING_PROTOCOL_ALIGNMENT.md',
].map(name => resolve(canonical, name));

const missing = required.filter(path => !existsSync(path));
if (missing.length) {
  console.error('Documentos canônicos ausentes:');
  missing.forEach(path => console.error(`- ${path}`));
  process.exit(1);
}

const standards = readFileSync(resolve(canonical, 'STANDARDS.md'), 'utf8');
const expected = [
  'CORE_VERSION=v01',
  'GLOBAL_STANDARD=GLOBAL-v01',
  'VERTICAL_STANDARD=APPOINTMENT-v01',
  'PRODUCT_STANDARD=DENTIST-v01',
  'PRICING_PROTOCOL_SOURCE=SAAS_PRICING_PLANS_REFACTOR_PROTOCOL(1).md',
];

const missingMarkers = expected.filter(marker => !standards.includes(marker));
if (missingMarkers.length) {
  console.error('Marcadores de standard ausentes:');
  missingMarkers.forEach(marker => console.error(`- ${marker}`));
  process.exit(1);
}

const current = readFileSync(resolve(root, 'docs/CURRENT.md'), 'utf8');
if (!current.includes('v01-multitenant-whitelabel')) {
  console.error('docs/CURRENT.md não aponta para v01-multitenant-whitelabel');
  process.exit(1);
}

console.log('Core/doc standards: OK');
