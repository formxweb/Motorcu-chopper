/*
 * Örnek ürün görsellerini üretir: public/ornek/*.webp ve public/ornek/k/*.webp
 * Gerçek fotoğraflar yönetim panelinden yüklendiğinde bu görseller kullanılmaz.
 * Çalıştırma: npx playwright install chromium && npm run gorseller
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const out = path.join(root, 'public/ornek');
const outThumb = path.join(out, 'k');

async function fontCss(pkg, file) {
  const dir = path.join(root, 'node_modules', pkg);
  const css = await readFile(path.join(dir, file), 'utf8');
  return css.replace(/url\(\.\/files\//g, `url(${pathToFileURL(path.join(dir, 'files')).href}/`);
}

const css = [
  await fontCss('@fontsource/pirata-one', '400.css'),
  await fontCss('@fontsource/big-shoulders-display', '800.css'),
  await fontCss('@fontsource/archivo', '400.css'),
].join('\n');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
html,body{margin:0;background:#17110e}#stage{display:block}#stage svg{display:block}</style></head>
<body><svg id="artDefs" width="0" height="0" style="position:absolute"></svg><div id="stage"></div>
<script src="${pathToFileURL(path.join(here, 'draw-core.js')).href}"></script>
<script src="${pathToFileURL(path.join(here, 'jobs.js')).href}"></script></body></html>`;
const page_file = path.join(here, '.render.html');
await writeFile(page_file, html);

await mkdir(outThumb, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1400 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('sayfa hatası:', e.message));
await page.goto(pathToFileURL(page_file).href);
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => Promise.all([...document.fonts].map((f) => f.load().catch(() => null))));
const jobs = await page.evaluate(() => window.MC_init());

for (const j of jobs) {
  const scale = j.w === 1200 ? 1 : j.file === 'hero' ? 3 : 2.5;
  const pxW = Math.round(j.w * scale);
  const pxH = Math.round(j.h * scale);
  await page.evaluate(([f, w, h]) => window.MC_stage(f, w, h), [j.file, pxW, pxH]);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.locator('#stage').screenshot({ type: 'png' });
  const sizes = j.w === 1200 ? [[1200, 630, 0.85]] : [[pxW, pxH, 0.82], [Math.round(pxW * 0.48), Math.round(pxH * 0.48), 0.8]];
  const urls = await page.evaluate(([d, s]) => window.MC_toWebp(d, s), ['data:image/png;base64,' + png.toString('base64'), sizes]);
  await writeFile(path.join(out, `${j.file}.webp`), Buffer.from(urls[0].split(',')[1], 'base64'));
  if (urls[1]) await writeFile(path.join(outThumb, `${j.file}.webp`), Buffer.from(urls[1].split(',')[1], 'base64'));
  console.log('üretildi:', j.file);
}
await browser.close();
console.log(`${jobs.length} görsel üretildi.`);
