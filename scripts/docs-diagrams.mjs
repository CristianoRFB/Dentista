import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = path.join(root, 'docs');
const current = await readFile(path.join(docsRoot, 'CURRENT.md'), 'utf8');
const version = current.match(/CURRENT VERSION:\s*`([^`]+)`/)?.[1];
if (!version) throw new Error('docs/CURRENT.md não declara uma versão vigente.');
const base = path.join(docsRoot, 'versions', version, 'diagrams');
const sourceDir = path.join(base, 'source');
const renderedDir = path.join(base, 'rendered');
const sources = (await readdir(sourceDir)).filter(file => file.endsWith('.mmd')).sort();
if (!sources.length) throw new Error(`Nenhuma fonte Mermaid encontrada em ${sourceDir}`);

const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
function parseNode(token) {
  const match = token.trim().match(/^([A-Za-z_][\w-]*)(?:\[([\s\S]*)\]|\{([\s\S]*)\})?$/);
  if (!match) throw new Error(`Nó Mermaid não suportado: ${token}`);
  const raw = match[2] ?? match[3] ?? match[1];
  const label = raw.replace(/^['"]|['"]$/g, '').replace(/<br\s*\/?\s*>/gi, '\n').replaceAll('\\n', '\n');
  return { id: match[1], label, shape: match[3] === undefined ? 'box' : 'decision' };
}

function parseMermaid(source, filename) {
  const lines = source.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const direction = lines.find(line => /^(flowchart|graph)\s+/.test(line))?.split(/\s+/)[1];
  if (!['LR', 'RL', 'TD', 'TB'].includes(direction)) throw new Error(`${filename}: direção Mermaid ausente ou não suportada.`);
  const title = lines.find(line => line.startsWith('%%'))?.replace(/^%%\s*/, '') || filename.replace(/\.mmd$/, '');
  const nodes = new Map();
  const edges = [];
  for (const line of lines) {
    if (line.startsWith('%%') || /^(flowchart|graph)\s+/.test(line)) continue;
    let match = line.match(/^(.+?)\s+--\s+(.+?)\s+-->\s+(.+)$/);
    let edgeStyle = 'solid';
    if (!match) {
      match = line.match(/^(.+?)\s+-\.\s+(.+?)\s+\.->\s+(.+)$/);
      if (match) edgeStyle = 'dashed';
    }
    if (!match) {
      match = line.match(/^(.+?)\s+-\.->\s+(.+)$/);
      if (match) { match = [match[0], match[1], '', match[2]]; edgeStyle = 'dashed'; }
    }
    if (!match) {
      match = line.match(/^(.+?)\s+-->\s+(.+)$/);
      if (match) match = [match[0], match[1], '', match[2]];
    }
    if (!match) throw new Error(`${filename}: expressão Mermaid não suportada: ${line}`);
    const from = parseNode(match[1]);
    const to = parseNode(match[3]);
    nodes.set(from.id, from);
    nodes.set(to.id, to);
    edges.push({ from: from.id, to: to.id, label: match[2] ?? '', style: edgeStyle });
  }
  return { direction, title, nodes: [...nodes.values()], edges };
}

function escapeDot(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}

function renderDot(graph) {
  const rankdir = graph.direction === 'TD' || graph.direction === 'TB' ? 'TB' : 'LR';
  const nodes = graph.nodes.map(node => `  "${escapeDot(node.id)}" [label="${escapeDot(node.label)}"${node.shape === 'decision' ? ', shape=diamond' : ''}];`).join('\n');
  const edges = graph.edges.map(edge => `  "${escapeDot(edge.from)}" -> "${escapeDot(edge.to)}"${edge.label || edge.style === 'dashed' ? ` [${[
    edge.label ? `label="${escapeDot(edge.label)}"` : '',
    edge.style === 'dashed' ? 'style=dashed' : '',
  ].filter(Boolean).join(', ')}]` : ''};`).join('\n');
  return `digraph G {\n  rankdir=${rankdir};\n  graph [bgcolor="white", pad="0.3", label="${escapeDot(graph.title)}", labelloc=t, fontsize=18, fontname="Arial"];\n  node [shape=box, style="rounded,filled", fillcolor="#f6faf9", color="#8aa9a3", fontname="Arial", fontsize=11];\n  edge [color="#5f7b76", fontname="Arial", fontsize=9];\n${nodes}\n${edges}\n}\n`;
}

function wrap(label, max = 23) {
  const words = label.split(/\s+/).filter(Boolean);
  const lines = [];
  for (const rawWord of words) {
    const parts = rawWord.match(new RegExp(`.{1,${max}}`, 'gu')) ?? [rawWord];
    for (const word of parts) {
      const last = lines.at(-1);
      if (last && last.length + word.length + 1 <= max) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
  }
  return (lines.length ? lines : ['']).slice(0, 4);
}

function renderSvg(graph) {
  const vertical = graph.direction === 'TD' || graph.direction === 'TB';
  const cardWidth = 196;
  const gap = 54;
  const rowGap = 28;
  const ranks = new Map(graph.nodes.map(node => [node.id, 0]));
  for (let pass = 0; pass < graph.nodes.length; pass++) {
    let changed = false;
    for (const edge of graph.edges) {
      const candidate = ranks.get(edge.from) + 1;
      if (candidate > ranks.get(edge.to)) { ranks.set(edge.to, candidate); changed = true; }
    }
    if (!changed) break;
    if (pass === graph.nodes.length - 1) throw new Error(`Ciclo Mermaid não suportado no diagrama “${graph.title}”.`);
  }
  const groups = new Map();
  for (const node of graph.nodes) {
    const rank = ranks.get(node.id);
    if (!groups.has(rank)) groups.set(rank, []);
    const lines = wrap(node.label);
    groups.get(rank).push({ ...node, lines, width: cardWidth, height: 28 + lines.length * 17 });
  }
  const orderedRanks = [...groups.keys()].sort((a, b) => a - b);
  const positions = new Map();
  let width = 90;
  let height = 90;
  if (!vertical) {
    const maxRows = Math.max(...[...groups.values()].map(group => group.length));
    height = Math.max(160, 90 + [...groups.values()].reduce((max, group) => Math.max(max, group.reduce((sum, node) => sum + node.height + rowGap, 0)), 0));
    width = 90 + orderedRanks.length * cardWidth + Math.max(0, orderedRanks.length - 1) * gap;
    for (const rank of orderedRanks) {
      const group = groups.get(rank);
      const groupHeight = group.reduce((sum, node) => sum + node.height + rowGap, 0) - rowGap;
      let y = 46 + Math.max(0, (height - 92 - groupHeight) / 2);
      const x = 45 + rank * (cardWidth + gap);
      for (const node of group) {
        positions.set(node.id, { x, y, width: node.width, height: node.height, node });
        y += node.height + rowGap;
      }
    }
  } else {
    const maxWidth = Math.max(...[...groups.values()].map(group => group.length * cardWidth + Math.max(0, group.length - 1) * gap));
    width = 90 + maxWidth;
    height = 90 + orderedRanks.length * 92 + Math.max(0, orderedRanks.length - 1) * gap;
    for (const rank of orderedRanks) {
      const group = groups.get(rank);
      const groupWidth = group.length * cardWidth + Math.max(0, group.length - 1) * gap;
      let x = 45 + (maxWidth - groupWidth) / 2;
      const y = 46 + rank * (92 + gap);
      for (const node of group) {
        positions.set(node.id, { x, y, width: node.width, height: node.height, node });
        x += cardWidth + gap;
      }
    }
  }
  const edgeSvg = graph.edges.map(edge => {
    const a = positions.get(edge.from);
    const b = positions.get(edge.to);
    const x1 = vertical ? a.x + a.width / 2 : a.x + a.width;
    const y1 = vertical ? a.y + a.height : a.y + a.height / 2;
    const x2 = vertical ? b.x + b.width / 2 : b.x;
    const y2 = vertical ? b.y : b.y + b.height / 2;
    const middleX = (x1 + x2) / 2;
    const middleY = (y1 + y2) / 2;
    return `<g class="edge"><path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="#6c8580" stroke-width="1.6"${edge.style === 'dashed' ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#arrow)"/>${edge.label ? `<text x="${middleX}" y="${middleY - 6}" text-anchor="middle" class="edge-label">${xml(edge.label)}</text>` : ''}</g>`;
  }).join('\n');
  const nodeSvg = [...positions.values()].map(({ x, y, width: w, height: h, node }) => {
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const label = node.lines.map((line, index) => `<text x="${centerX}" y="${centerY - ((node.lines.length - 1) * 17) / 2 + index * 17 + 4}" text-anchor="middle">${xml(line)}</text>`).join('');
    const shape = node.shape === 'decision'
      ? `<polygon points="${centerX},${y} ${x + w},${centerY} ${centerX},${y + h} ${x},${centerY}"/>`
      : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/>`;
    return `<g class="node ${node.shape}">${shape}${label}</g>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n<title id="title">${xml(graph.title)}</title><desc id="desc">Diagrama Mermaid convertido a SVG pelo verificador local do projeto.</desc>\n<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#6c8580"/></marker></defs>\n<style>text{font-family:Arial,sans-serif;font-size:12px;fill:#183936}.node rect,.node polygon{fill:#f6faf9;stroke:#8aa9a3;stroke-width:1.5}.node.decision polygon{fill:#eef5f3}.edge-label{font-size:10px;fill:#425b56;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}</style>\n<text x="45" y="25" font-size="16" font-weight="700">${xml(graph.title)}</text>\n${edgeSvg}\n${nodeSvg}\n</svg>\n`;
}

const status = new Map([
  ['01-saas-overview','updated'], ['02-c4-context','updated'], ['03-c4-containers','updated'],
  ['04-tenant-isolation','updated'], ['05-rbac','updated'], ['06-data-model','updated'],
  ['07-clinical-domain','updated'], ['08-appointment-flow','updated'], ['09-appointment-sequence','updated'],
  ['10-clinical-record-lifecycle','updated'], ['13-clinical-media','updated'], ['14-tenant-resolver','updated'],
  ['15-onboarding','updated'], ['16-platform-support','updated'], ['18-deployment','updated'],
  ['21-schedule-resource-conflict','updated'],
  ['11-odontogram','future design — not implemented'], ['12-treatment-plan','future design — not implemented'],
  ['17-migration','future plan — no legacy client or migration'], ['20-recall-intake-usage','partially future — recall persistence and public intake unavailable'],
  ['22-pricing-entitlements','proposal only — runtime entitlements not implemented'],
]);

const manifestRows = [];
for (const filename of sources) {
  const graph = parseMermaid(await readFile(path.join(sourceDir, filename), 'utf8'), filename);
  const stem = filename.replace(/\.mmd$/, '');
  await writeFile(path.join(sourceDir, `${stem}.dot`), renderDot(graph), 'utf8');
  await writeFile(path.join(renderedDir, `${stem}.svg`), renderSvg(graph), 'utf8');
  const note = status.get(stem) ?? 'preserved';
  manifestRows.push(`| ${stem} | \`versions/${version}/diagrams/source/${stem}.mmd\` | \`versions/${version}/diagrams/source/${stem}.dot\` | \`versions/${version}/diagrams/rendered/${stem}.svg\` | ${note} |`);
}
const manifest = `# Diagramas — ${version}\n\nOs diagramas editáveis em Mermaid são a fonte canônica; Graphviz DOT é mantido como fonte interoperável, e SVG é a render atual. PNGs legados permanecem apenas para compatibilidade e não são a render vigente.\n\nOs diagramas de futuro/proposta estão explicitamente marcados e não descrevem runtime implementado. Nenhum diagrama é screenshot.\n\n| Diagrama | Mermaid | DOT | SVG vigente | Estado / observação |\n|---|---|---|---|---|\n${manifestRows.join('\n')}\n`;
await writeFile(path.join(docsRoot, 'DIAGRAMS_MANIFEST.md'), manifest, 'utf8');
console.log(`Diagramas renderizados e manifestados: ${manifestRows.length}.`);
