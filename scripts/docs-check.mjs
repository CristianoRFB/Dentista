import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = path.join(root, 'docs');
const currentText = await readFile(path.join(docsRoot, 'CURRENT.md'), 'utf8');
const version = currentText.match(/CURRENT VERSION:\s*`([^`]+)`/)?.[1];
if (!version) throw new Error('docs/CURRENT.md não aponta para uma versão.');
const versionRoot = path.join(docsRoot, 'versions', version);
const required = [
  'README.md','STATUS.md','ARCHITECTURE.md','DATA_MODEL.md','SECURITY.md','FIREBASE_STRUCTURE.md',
  'PROJECT_STRUCTURE.md','SCREENS.md','GENERATED_VISUALS.md','LEADS_OVERVIEW.md',
];
const missing = [];
for (const file of required) {
  try { await access(path.join(versionRoot, file)); } catch { missing.push(`versions/${version}/${file}`); }
}
try { await access(versionRoot); } catch { missing.push(`versions/${version}/`); }
if (missing.length) throw new Error(`Documentação obrigatória ausente:\n- ${missing.join('\n- ')}`);

let diagrams;
try { diagrams = await readFile(path.join(docsRoot, 'DIAGRAMS_MANIFEST.md'), 'utf8'); }
catch { throw new Error('docs/DIAGRAMS_MANIFEST.md ausente.'); }
const diagramRows = [...diagrams.matchAll(/^\|\s*([^|]+)\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|/gm)];
if (!diagramRows.length) throw new Error('DIAGRAMS_MANIFEST.md não lista diagramas.');
for (const [, name, ...files] of diagramRows) {
  for (const relative of files) {
    try { await access(path.join(docsRoot, relative)); } catch { missing.push(`${name.trim()}: ${relative}`); }
  }
  const svgRelative = diagramRows.find(row => row[1].trim() === name.trim())?.[4];
  if (svgRelative) {
    const svg = await readFile(path.join(docsRoot, svgRelative), 'utf8');
    if (!svg.includes('<svg') || !svg.includes('</svg>')) missing.push(`${name.trim()}: SVG inválido`);
  }
}

const screens = await readFile(path.join(versionRoot, 'SCREENS.md'), 'utf8');
for (const [, relative] of screens.matchAll(/`(screenshots\/[^`]+\.(?:png|jpe?g|webp))`/gi)) {
  try { await access(path.join(versionRoot, relative)); } catch { missing.push(`screenshot referido e ausente: ${relative}`); }
}
const visualDoc = await readFile(path.join(versionRoot, 'GENERATED_VISUALS.md'), 'utf8');
const visualPaths = new Set([...visualDoc.matchAll(/`(generated\/[^`]+\.(?:png|jpe?g|webp))`/gi)].map(match => match[1]));
for (const relative of visualPaths) {
  try { await access(path.join(versionRoot, relative)); } catch { missing.push(`imagem gerada referida e ausente: ${relative}`); }
}
async function walk(directory) {
  let items;
  try { items = await readdir(directory, { withFileTypes: true }); } catch { return []; }
  const output = [];
  for (const item of items) {
    const target = path.join(directory, item.name);
    if (item.isDirectory()) output.push(...await walk(target));
    else if (/\.(png|jpe?g|webp)$/i.test(item.name)) output.push(path.relative(versionRoot, target).split(path.sep).join('/'));
  }
  return output;
}
for (const relative of await walk(path.join(versionRoot, 'generated'))) {
  if (!visualPaths.has(relative)) missing.push(`imagem em generated/ sem inventário: ${relative}`);
}
const leads = await readFile(path.join(docsRoot, 'LEADS_MANIFEST.md'), 'utf8');
const leadsOverview = await readFile(path.join(versionRoot, 'LEADS_OVERVIEW.md'), 'utf8');
if (!/nenhum lead confirmado/i.test(leads) || !/nenhum lead confirmado/i.test(leadsOverview)) {
  throw new Error('Estado de lead ausente ou inconsistente; não invente leads para preencher o manifesto.');
}
if (missing.length) throw new Error(`Verificação documental falhou:\n- ${missing.join('\n- ')}`);
console.log(`Docs OK: ${version}, ${diagramRows.length} diagramas, ${visualPaths.size} imagens conceituais, screenshots referenciados válidos.`);
