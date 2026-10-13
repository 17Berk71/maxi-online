// Capture repeatable garment baselines locally. Personal images stay in ignored wardrobe/out.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {browser, ROOT, WWW} from './common.mjs';

const pack = path.resolve(process.env.PACK_DIR || path.join(ROOT, 'tools/wardrobe/out'));
const index = JSON.parse(fs.readFileSync(path.join(pack, 'index.json'), 'utf8'));
const selected = (process.env.ITEMS || 'zolla-tee,qs-tee,knit-polo,barrel-jeans,brown-pants').split(',');
for (const id of selected) if (!index.some(item => item.id === id)) throw new Error(`Missing garment: ${id}`);
const revision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: ROOT, encoding: 'utf8'}).trim();
const out = process.env.OUT ? path.resolve(process.env.OUT) : path.join(pack, 'baselines', revision.slice(0, 7));
fs.mkdirSync(out, {recursive: true});
if (fs.existsSync(path.join(out, 'baseline.json'))) throw new Error('Baseline already exists: choose another OUT directory');
const makeEnv = {...process.env}; delete makeEnv.OUT; // make.mjs uses OUT for an HTML filename
execFileSync(process.execPath, [path.join(ROOT, 'tools/lab/make.mjs')], {cwd: ROOT, env: makeEnv});
const sourceHash = crypto.createHash('sha256');
const src=path.resolve(process.env.SRC||path.join(ROOT,'src'));
function hashSources(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) hashSources(p);
    else if (p.endsWith('.js')) sourceHash.update('src/'+path.relative(src, p)).update(fs.readFileSync(p));
  }
}
hashSources(src);
const source_sha256=sourceHash.digest('hex');
const assets = [{path: 'index.json', sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(pack, 'index.json'))).digest('hex')}];
for (const item of index) {
  const meta = path.join(pack, item.id, 'meta.json');
  assets.push({path: path.relative(pack, meta), sha256: crypto.createHash('sha256').update(fs.readFileSync(meta)).digest('hex')});
  const folder = path.join(pack, item.files || item.id);
  const names = ['front.webp', 'back.webp', 'front_cut.webp', 'back_cut.webp', ...(item.sleeve ? ['sleeve.webp'] : [])];
  for (const name of names) {
    const p = path.join(folder, name);
    if (!fs.existsSync(p)) throw new Error(`Missing texture: ${item.id}/${name}`);
    assets.push({path: path.relative(pack, p), sha256: crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')});
  }
}
const mime = {'.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg'};
const server = http.createServer((req, res) => {
  try {
    const p = path.resolve(WWW, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (p !== WWW && !p.startsWith(WWW + path.sep)) {res.writeHead(403); res.end(); return;}
    const file = fs.statSync(p).isDirectory() ? path.join(p, 'index.html') : p;
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch {res.writeHead(404); res.end();}
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let b;
const issues = [], rows = [];
const body = JSON.parse(process.env.BODY || '{"sex":"m","height":186,"weight":82,"chest":110,"waist":82,"hips":98,"skin":0}');
try {
  b = await browser();
  const page = await b.newPage({viewport: {width: 620, height: 920}, deviceScaleFactor: 1});
  page.setDefaultTimeout(180000);
  page.on('pageerror', e => issues.push(e.message));
  page.on('console', m => {if (m.type() === 'error') issues.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async body => {localStorage.clear();window.__shadowMap=512; Object.assign(PREFS.body, body); await FIT.addPack('wardrobe/'); FIT.setAnim(false); FIT.open();}, body);
  const groups = selected.map(id => [id]);
  if (selected.includes('zolla-tee') && selected.includes('barrel-jeans')) groups.push(['zolla-tee', 'barrel-jeans']);
  for (const ids of groups) {
    const caseBody=!process.env.BODY&&index.find(i=>i.id===ids[0]).who==='women'?{sex:'f',height:173,weight:56,chest:82,waist:62,hips:92,skin:0}:body;
    const start = Date.now();
    await page.evaluate(async ({ids,body}) => {Object.assign(PREFS.body,body);FIT.wear(ids.map(id => 'w-' + id), {}); await FIT.ready();}, {ids,body:caseBody});
    await page.waitForFunction(() => Object.values(window.__ptex || {}).every(t => !!t.image?.width));
    await page.evaluate(() => FIT.ready());
    const row = {ids, body:caseBody, elapsed_ms: Date.now() - start, garments: await page.evaluate(ids => ids.map(id => ({id, qc: FIT.qc('w-' + id), fit_note: FIT.fitNote('w-' + id)})), ids), shots: []};
    for (const [label, angle] of [['front', 0], ['side', Math.PI / 2], ['back', Math.PI]]) {
      await page.evaluate(angle => {FIT.setRot(angle); FIT.setZoom(0.6, 0.5);}, angle);
      await page.waitForTimeout(300);
      const name = ids.join('_') + '_' + label + '.png';
      await page.locator('#fitC').screenshot({path: path.join(out, name)});
      row.shots.push(name);
    }
    rows.push(row);
    fs.writeFileSync(path.join(out,'checkpoint.json'),JSON.stringify({schema_version:1,complete:false,source_revision:revision,source_sha256,shadow_map:512,assets,rows,issues},null,2));
    console.log(ids.join('+'), row.garments.map(g => g.qc?.score).join(','));
  }
  fs.writeFileSync(path.join(out, 'baseline.json'), JSON.stringify({schema_version: 1, created_at: new Date().toISOString(),
    source_revision: revision, source_worktree_dirty: !!execFileSync('git', ['status', '--porcelain'], {cwd: ROOT, encoding: 'utf8'}).trim(), source_sha256, wardrobe_revision: process.env.WARDROBE_COMMIT || null,
    cloth_version: fs.readFileSync(path.join(src, 'shop/fitting/worker.js'), 'utf8').match(/CLOTH_VER = '([^']+)'/)?.[1], shadow_map:512,
    browser: b.version(), viewport: {width: 620, height: 920, dpr: 1}, animation: false, angles: [0, Math.PI / 2, Math.PI],
    assets, rows, issues}, null, 2));
  if (issues.length) throw new Error(issues.join('\n'));
  console.log(`Baseline saved: ${out}`);
} finally {
  if (b) await b.close();
  await new Promise(resolve => server.close(resolve));
}
