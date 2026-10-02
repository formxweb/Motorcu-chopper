/* Örnek ürün görselleri için çizim işleri. draw-core.js'ten sonra yüklenir. */
/* global LEATHER, vestFront, vestBack, nameTag, chainArt, tinArt, defsMarkup */

const LEATHER_KEY = {
  siyah: 'black',
  kahve: 'brown',
  taba: 'tan',
  bordo: 'oxblood',
  'koyu-mavi': 'denim',
  'acik-mavi': 'lightdenim',
  'siyah-kot': 'blackdenim',
};

const VESTS = {
  'kulup-yelegi': { colors: ['siyah'], o: { closure: 'snap', collar: true, pockets: 'slash', ghost: true } },
  'klasik-deri-yelek': { colors: ['siyah', 'kahve'], o: { closure: 'snap', pockets: 'slash' } },
  'yan-bagcikli-deri-yelek': { colors: ['siyah', 'kahve', 'bordo'], o: { closure: 'snap', laces: true, pockets: 'slash' } },
  'eskitme-taba-deri-yelek': { colors: ['taba'], o: { closure: 'snap', collar: true, distressed: true, pockets: 'slash' } },
  'fermuarli-deri-yelek': { colors: ['kahve', 'siyah'], o: { closure: 'zip', collar: true, pockets: 'slash' } },
  'kadin-deri-yelek': { colors: ['siyah', 'bordo'], o: { fit: 'fitted', closure: 'zip', laces: true } },
  'kot-yelek': { colors: ['koyu-mavi', 'siyah-kot'], o: { closure: 'button', collar: true, pockets: 'chest' } },
  'acik-yikama-kot-yelek': { colors: ['acik-mavi'], o: { closure: 'button', pockets: 'chest' } },
};

const COMBO_FONT = { bs: 'gotik', ks: 'gotik', as: 'blok', bk: 'blok' };

function studio(w, h) {
  return `<rect width="${w}" height="${h}" fill="url(#g-studio)"/><rect y="${h * 0.72}" width="${w}" height="${h * 0.28}" fill="url(#g-floor)"/>`;
}

function svg(w, h, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">${inner}</svg>`;
}

/** Her iş: { file, w, h, markup } */
function buildJobs() {
  const jobs = [];
  for (const [slug, v] of Object.entries(VESTS)) {
    for (const c of v.colors) {
      const o = Object.assign({}, v.o, { leather: LEATHER_KEY[c] });
      jobs.push({ file: `${slug}-${c}-on`, w: 400, h: 500, markup: svg(400, 500, studio(400, 500) + `<g transform="translate(20 34) scale(.9)">${vestFront(o)}</g>`) });
      jobs.push({ file: `${slug}-${c}-arka`, w: 400, h: 500, markup: svg(400, 500, studio(400, 500) + `<g transform="translate(20 34) scale(.9)">${vestBack(o)}</g>`) });
    }
  }
  for (const combo of ['bs', 'ks', 'as', 'bk']) {
    const rk = { top: 'Demir Atlar', bottom: 'İzmir', combo, font: COMBO_FONT[combo] };
    jobs.push({ file: `rocker-seti-${combo}`, w: 400, h: 500, markup: svg(400, 500, studio(400, 500) + `<g transform="translate(20 34) scale(.9)">${vestBack({ leather: 'black', collar: true }, rk)}</g>`) });
    jobs.push({ file: `rocker-seti-${combo}-yakin`, w: 400, h: 500, markup: svg(400, 500, studio(400, 500) + `<g transform="translate(-96 -116) scale(1.48)">${vestBack({ leather: 'black', collar: true }, rk)}</g>`) });
    jobs.push({ file: `isim-armasi-${combo}`, w: 400, h: 500, markup: svg(400, 500, studio(400, 500) + nameTag({ text: 'Kaptan', combo, font: combo === 'bs' || combo === 'as' ? 'blok' : 'gotik' })) });
  }
  jobs.push({ file: 'cuzdan-zinciri', w: 400, h: 500, markup: svg(400, 500, studio(400, 500) + chainArt()) });
  jobs.push({ file: 'deri-bakim-kremi', w: 400, h: 500, markup: svg(400, 500, studio(400, 500) + tinArt()) });

  const heroRk = { top: 'Motorcu Chopper', bottom: 'Yelek & Ekipman', combo: 'bs', font: 'gotik' };
  jobs.push({
    file: 'hero',
    w: 400,
    h: 466,
    markup: svg(400, 466, studio(400, 466) + `<g transform="translate(10 6) scale(.95)">${vestBack({ leather: 'black', collar: true }, heroRk)}</g>`),
  });
  jobs.push({
    file: 'paylasim',
    w: 1200,
    h: 630,
    markup: svg(
      1200,
      630,
      `<rect width="1200" height="630" fill="#17110e"/><rect x="640" width="560" height="630" fill="url(#g-studio)"/>
       <text x="70" y="250" font-family="'Pirata One',serif" font-size="96" fill="#f1e8dc">Motorcu Chopper</text>
       <text x="74" y="310" font-family="'Big Shoulders Display',sans-serif" font-weight="800" font-size="44" fill="#d4ad5f">Deri yelek, kulüp yeleği, sırt arması</text>
       <text x="74" y="370" font-family="'Archivo',sans-serif" font-size="26" fill="#ac9d8b">Kartla güvenli ödeme, Türkiye geneli kargo</text>
       <g transform="translate(700 20) scale(1.3)">${vestBack({ leather: 'black', collar: true }, heroRk)}</g>`,
    ),
  });
  return jobs;
}

window.MC_init = function () {
  document.getElementById('artDefs').innerHTML = defsMarkup();
  return buildJobs().map((j) => ({ file: j.file, w: j.w, h: j.h }));
};

window.MC_stage = function (file, pxW, pxH) {
  const job = buildJobs().find((j) => j.file === file);
  const stage = document.getElementById('stage');
  stage.style.width = pxW + 'px';
  stage.style.height = pxH + 'px';
  stage.innerHTML = job.markup;
};

window.MC_toWebp = async function (pngDataUrl, sizes) {
  const img = new Image();
  img.src = pngDataUrl;
  await img.decode();
  const out = [];
  for (const [w, h, q] of sizes) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    out.push(c.toDataURL('image/webp', q));
  }
  return out;
};
