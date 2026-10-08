import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = path.join(root, 'docs');
const version = (await readFile(path.join(docsRoot, 'CURRENT.md'), 'utf8')).match(/CURRENT VERSION:\s*`([^`]+)`/)?.[1];
if (!version) throw new Error('docs/CURRENT.md não declara a versão vigente.');
const manifest = await readFile(path.join(docsRoot, 'LEADS_MANIFEST.md'), 'utf8');
const overview = await readFile(path.join(docsRoot, 'versions', version, 'LEADS_OVERVIEW.md'), 'utf8');
if (!/nenhum lead confirmado/i.test(manifest) || !/nenhum lead confirmado/i.test(overview)) {
  throw new Error('Manifestos devem confirmar leads reais ou declarar que nenhum lead está confirmado.');
}
const leadsRoot = path.join(docsRoot, 'versions', version, 'leads');
try {
  const entries = await readdir(leadsRoot);
  for (const entry of entries) {
    const lead = path.join(leadsRoot, entry);
    const stat = await import('node:fs/promises').then(fs => fs.stat(lead));
    if (!stat.isDirectory()) continue;
    for (const required of ['LEAD_CONTEXT.md','LEAD_REFERENCE_SUMMARY.md','LEAD_VISUAL_DIRECTION.md','captures','assets','generated']) {
      try { await access(path.join(lead, required)); } catch { throw new Error(`Lead ${entry} sem ${required}.`); }
    }
  }
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
console.log('Leads OK: nenhum lead confirmado; não há pasta de lead fictício.');
