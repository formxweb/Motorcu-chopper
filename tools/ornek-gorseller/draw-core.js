const LEATHER = {
  black:     {base:'#262428',hi:'#5c5862',sh:'#09080a',inner:'#0e0d0f',stitch:'#6e6a74',lace:'#3c3941',metal:'steel'},
  brown:     {base:'#4f3221',hi:'#8a6241',sh:'#1d110a',inner:'#1a0e07',stitch:'#a3805d',lace:'#6c4a31',metal:'steel'},
  tan:       {base:'#8f5d31',hi:'#cd9963',sh:'#482912',inner:'#38200d',stitch:'#e6c79c',lace:'#a8743f',metal:'brass'},
  oxblood:   {base:'#541719',hi:'#913736',sh:'#1f0607',inner:'#1a0506',stitch:'#ad6a63',lace:'#702325',metal:'steel'},
  denim:     {base:'#3f5c7d',hi:'#7a98ba',sh:'#1a293a',inner:'#22344a',stitch:'#d58e3d',lace:'#2c4058',metal:'copper',twill:1},
  lightdenim:{base:'#6d8fb3',hi:'#a9c2dd',sh:'#334f6f',inner:'#3d5877',stitch:'#d9984c',lace:'#4a6788',metal:'copper',twill:1},
  blackdenim:{base:'#2e2f34',hi:'#5c5e66',sh:'#111215',inner:'#18191c',stitch:'#b4ada2',lace:'#232428',metal:'steel',twill:1}
};
const COMBOS = [
  {id:'bs', name:'Beyaz yazı, siyah zemin',  bg:'#151414', thread:'#f1ede4', border:'#f1ede4'},
  {id:'ks', name:'Kırmızı yazı, siyah zemin',bg:'#151414', thread:'#d4362c', border:'#d4362c'},
  {id:'as', name:'Altın yazı, siyah zemin',  bg:'#151414', thread:'#dcb24b', border:'#dcb24b'},
  {id:'bk', name:'Beyaz yazı, kırmızı zemin',bg:'#a8221b', thread:'#f6f1e7', border:'#f6f1e7'}
];
const FONTS = [{id:'gotik',name:'Gotik'},{id:'blok',name:'Blok'}];
const comboOf = id => COMBOS.find(c=>c.id===id) || COMBOS[0];
const fontOf = id => FONTS.find(f=>f.id===id) || FONTS[0];

/* ---------- çizim: yelek kalıpları (400 x 460 alan) ---------- */
const PATHS = {
  'pf-classic':'M158 38 L88 58 C108 100 124 176 98 212 L86 418 Q140 432 200 440 L200 214 C190 152 172 92 158 38 Z',
  'pf-fitted': 'M160 40 L96 60 C114 100 128 172 106 210 C118 250 120 280 116 300 C112 330 104 370 100 404 Q148 418 200 426 L200 214 C190 152 174 92 160 40 Z',
  'pb-classic':'M158 38 Q200 50 242 38 L312 58 C292 100 276 176 302 212 L314 418 Q200 446 86 418 L98 212 C124 176 108 100 88 58 Z',
  'pb-fitted': 'M160 40 Q200 52 240 40 L304 60 C286 100 272 172 294 210 C282 250 280 280 284 300 C288 330 296 370 300 404 Q200 432 100 404 C104 370 112 330 116 300 C120 280 118 250 106 210 C128 172 114 100 96 60 Z',
  'sf-classic':'M152 44 C168 98 184 156 193 220 L193 431 M92 411 Q140 424 193 432 M96 63 C116 102 132 176 106 212',
  'sf-fitted': 'M154 46 C170 98 184 156 193 220 L193 418 M106 397 Q148 411 193 418 M104 65 C122 102 136 172 114 208',
  'sb-classic':'M95 63 C115 102 131 176 105 211 M305 63 C285 102 269 176 295 211 M92 410 Q200 437 308 410 M162 46 Q200 58 238 46',
  'sb-fitted': 'M103 65 C121 102 135 172 113 208 M297 65 C279 102 265 172 287 208 M106 396 Q200 423 294 396 M164 48 Q200 60 236 48'
};
const MIR = 'transform="translate(400 0) scale(-1 1)"';
const both = s => s + '<g ' + MIR + '>' + s + '</g>';

function defsMarkup(){
  let d = '<defs>';
  for (const [k,L] of Object.entries(LEATHER)){
    d += `<linearGradient id="g-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${L.hi}"/><stop offset=".3" stop-color="${L.base}"/><stop offset="1" stop-color="${L.sh}"/></linearGradient>`;
    d += `<linearGradient id="gc-${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${L.hi}"/><stop offset=".35" stop-color="${L.base}"/><stop offset="1" stop-color="${L.sh}"/></linearGradient>`;
  }
  d += `<linearGradient id="g-side-f" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="0"><stop offset=".2" stop-color="#000" stop-opacity=".55"/><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset=".46" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#000" stop-opacity=".22"/><stop offset=".54" stop-color="#000" stop-opacity="0"/><stop offset=".65" stop-color="#000" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".55"/></linearGradient>`;
  d += `<linearGradient id="g-side-b" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="400" y2="0"><stop offset=".2" stop-color="#000" stop-opacity=".55"/><stop offset=".36" stop-color="#000" stop-opacity="0"/><stop offset=".64" stop-color="#000" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".55"/></linearGradient>`;
  d += `<radialGradient id="g-gloss"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
  d += `<linearGradient id="g-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5f6f7"/><stop offset=".42" stop-color="#a3a7ad"/><stop offset=".7" stop-color="#5b5f66"/><stop offset="1" stop-color="#d7d9dc"/></linearGradient>`;
  d += `<linearGradient id="g-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a8"/><stop offset=".45" stop-color="#c0943f"/><stop offset=".75" stop-color="#6e4f1b"/><stop offset="1" stop-color="#e2c071"/></linearGradient>`;
  d += `<linearGradient id="g-copper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6cf9c"/><stop offset=".45" stop-color="#b8743d"/><stop offset=".75" stop-color="#673718"/><stop offset="1" stop-color="#e2a46a"/></linearGradient>`;
  d += `<radialGradient id="g-studio" cx=".5" cy=".36" r=".78"><stop offset="0" stop-color="#5e544c"/><stop offset=".55" stop-color="#2e2723"/><stop offset="1" stop-color="#171311"/></radialGradient>`;
  d += `<linearGradient id="g-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>`;
  d += `<linearGradient id="g-tinbody" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#26272a"/><stop offset=".2" stop-color="#8c9096"/><stop offset=".3" stop-color="#d3d6da"/><stop offset=".55" stop-color="#5a5d63"/><stop offset="1" stop-color="#18191b"/></linearGradient>`;
  d += `<radialGradient id="g-tintop" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#e3e5e8"/><stop offset="1" stop-color="#6f737a"/></radialGradient>`;
  d += `<pattern id="pt-twill" patternUnits="userSpaceOnUse" width="5" height="5"><path d="M0 5L5 0M-1.25 1.25L1.25 -1.25M3.75 6.25L6.25 3.75" stroke="#fff" stroke-opacity=".1" stroke-width="1.1"/></pattern>`;
  d += `<pattern id="pt-weave" patternUnits="userSpaceOnUse" width="3" height="3"><path d="M0 3L3 0" stroke="#fff" stroke-opacity=".07" stroke-width=".8"/></pattern>`;
  /* doku: ışık haritası, koyu ve açık benekler olarak saydam katmana çevrilir (karışım modu gerekmez) */
  const grain = `<feColorMatrix in="l" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 1.32" result="dk"/><feColorMatrix in="l" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.5 0 0 0 -.92" result="lt"/><feMerge><feMergeNode in="dk"/><feMergeNode in="lt"/></feMerge>`;
  d += `<filter id="f-pebble" filterUnits="userSpaceOnUse" x="0" y="0" width="400" height="460" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4" result="n"/><feDiffuseLighting in="n" surfaceScale="1.7" lighting-color="#fff" result="l"><feDistantLight azimuth="225" elevation="34"/></feDiffuseLighting>${grain}</filter>`;
  d += `<filter id="f-fine" filterUnits="userSpaceOnUse" x="0" y="0" width="400" height="460" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="1.6 .9" numOctaves="2" seed="9" result="n"/><feDiffuseLighting in="n" surfaceScale="1.2" lighting-color="#fff" result="l"><feDistantLight azimuth="225" elevation="36"/></feDiffuseLighting>${grain}</filter>`;
  d += `<filter id="f-cloud" filterUnits="userSpaceOnUse" x="0" y="0" width="400" height="460"><feTurbulence type="fractalNoise" baseFrequency=".013 .028" numOctaves="3" seed="11"/><feColorMatrix type="matrix" values="0 0 0 0 .95  0 0 0 0 .8  0 0 0 0 .6  2.9 0 0 0 -1.3"/></filter>`;
  d += `<filter id="f-blur" x="-50%" y="-300%" width="200%" height="700%"><feGaussianBlur stdDeviation="7"/></filter>`;
  d += `<filter id="f-drop" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2.2" stdDeviation="2.2" flood-color="#000" flood-opacity=".55"/></filter>`;
  for (const [id,p] of Object.entries(PATHS)) d += `<path id="${id}" d="${p}"/>`;
  for (const f of ['classic','fitted']){
    d += `<clipPath id="cpf-${f}"><path d="${PATHS['pf-'+f]}"/><path d="${PATHS['pf-'+f]}" ${MIR}/></clipPath>`;
    d += `<clipPath id="cpb-${f}"><path d="${PATHS['pb-'+f]}"/></clipPath>`;
  }
  return d + '</defs>';
}

let _uid = 0;
const uid = p => p + (++_uid);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function shade(hex, f){ const n=parseInt(hex.slice(1),16); return '#'+[(n>>16)&255,(n>>8)&255,n&255].map(v=>Math.round(v*f).toString(16).padStart(2,'0')).join(''); }
const fx = n => n.toFixed(1);

/* yüzey: gölge, doku, parlama */
function surface(L, o, v){
  let s = `<rect width="400" height="460" fill="url(#g-side-${v})"/>`;
  if (L.twill) s += `<rect width="400" height="460" fill="url(#pt-twill)"/>`;
  s += `<rect width="400" height="460" filter="url(#${L.twill?'f-fine':'f-pebble'})" opacity="${L.twill?.35:.55}"/>`;
  if (o.distressed) s += `<rect width="400" height="460" filter="url(#f-cloud)" opacity=".42"/>`;
  const g = L.twill ? .35 : 1;
  if (v==='f') s += `<ellipse cx="146" cy="150" rx="44" ry="96" fill="url(#g-gloss)" opacity="${g}"/><ellipse cx="254" cy="150" rx="44" ry="96" fill="url(#g-gloss)" opacity="${g}"/>`;
  else s += `<ellipse cx="200" cy="165" rx="98" ry="125" fill="url(#g-gloss)" opacity="${g*.85}"/>`;
  return s;
}

function sideX(F, y){
  const pts = F ? [[106,210],[116,300],[100,404]] : [[98,212],[86,418]];
  for (let i=0;i<pts.length-1;i++){ const a=pts[i], b=pts[i+1]; if (y<=b[1]) return a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]); }
  return pts[pts.length-1][0];
}
function laces(F, L){
  const n=7, step=F?22:24, y0=238, rows=[];
  for (let i=0;i<n;i++){ const y=y0+i*step, xa=sideX(F,y)+6; rows.push([xa, xa+15, y]); }
  const left = rows.map(r=>`L${fx(r[0]+4)} ${r[2]}`).join(' ');
  const right = rows.slice().reverse().map(r=>`L${fx(r[1]-4)} ${r[2]}`).join(' ');
  let s = `<path d="M${fx(rows[0][0]+4)} ${rows[0][2]-8} ${left} L${fx(rows[n-1][0]+4)} ${rows[n-1][2]+8} L${fx(rows[n-1][1]-4)} ${rows[n-1][2]+8} ${right} L${fx(rows[0][1]-4)} ${rows[0][2]-8} Z" fill="#000" opacity=".6"/>`;
  let lace = '';
  for (let i=0;i<n-1;i++){ const a=rows[i], b=rows[i+1]; lace += `M${fx(a[0])} ${a[2]} L${fx(b[1])} ${b[2]} M${fx(a[1])} ${a[2]} L${fx(b[0])} ${b[2]} `; }
  s += `<path d="${lace}" stroke="${L.lace}" stroke-width="3.6" stroke-linecap="round" fill="none"/><path d="${lace}" stroke="${L.hi}" stroke-width=".9" opacity=".55" fill="none"/>`;
  for (const r of rows) s += `<circle cx="${fx(r[0])}" cy="${r[2]}" r="2.7" fill="url(#g-steel)" stroke="#000" stroke-width=".5"/><circle cx="${fx(r[1])}" cy="${r[2]}" r="2.7" fill="url(#g-steel)" stroke="#000" stroke-width=".5"/>`;
  return s;
}
function closure(o, L, F){
  const bot = F ? 426 : 440;
  if (o.closure==='zip'){
    return `<line x1="200" y1="214" x2="200" y2="${bot-2}" stroke="#121212" stroke-width="7.5"/><line x1="200" y1="216" x2="200" y2="${bot-3}" stroke="#b9bcc1" stroke-width="5" stroke-dasharray="1.6 1.3"/><rect x="194.5" y="214" width="11" height="22" rx="3" fill="url(#g-steel)" stroke="#000" stroke-width=".7"/><rect x="198" y="230" width="4" height="13" rx="2" fill="url(#g-steel)" stroke="#000" stroke-width=".4"/>`;
  }
  const ys = F ? [246,290,334,378] : [242,294,346,398];
  const r = o.closure==='button' ? 7.6 : 6.3;
  return ys.map(y=>`<circle cx="189" cy="${y}" r="${r}" fill="url(#g-${L.metal})" stroke="#000" stroke-opacity=".65" stroke-width=".8"/><circle cx="189" cy="${y}" r="${fx(r*.5)}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1"/><circle cx="${fx(189-r*.35)}" cy="${fx(y-r*.35)}" r="${fx(r*.22)}" fill="#fff" opacity=".7"/>`).join('');
}
function collarFront(L, k){
  const band = `<path d="M152 34 Q200 58 248 34 L248 24 Q200 46 152 24 Z" fill="url(#gc-${k})"/>`;
  const lap = `<path d="M152 24 L119 50 L160 131 L177 118 L158 38 Z" fill="url(#gc-${k})" stroke="${L.sh}" stroke-width="1.2" filter="url(#f-drop)"/><path d="M150 32 L127 52 L161 121" fill="none" stroke="${L.stitch}" stroke-width="1" stroke-dasharray="3 2.4" opacity=".8"/>`;
  return band + both(lap);
}
function chestPocket(L, k){
  return `<path d="M130 160 L130 204 L174 204 L174 160" fill="none" stroke="${L.stitch}" stroke-width="1.1" stroke-dasharray="3 2.4"/><path d="M127 128 L177 128 L176 158 L152 169 L128 158 Z" fill="url(#gc-${k})" stroke="${L.sh}" stroke-width="1" filter="url(#f-drop)"/><path d="M131 132 L173 132 L172 155 L152 164 L132 155 Z" fill="none" stroke="${L.stitch}" stroke-width="1.1" stroke-dasharray="3 2.4"/><circle cx="152" cy="157" r="6" fill="url(#g-${L.metal})" stroke="#000" stroke-opacity=".6" stroke-width=".7"/>`;
}
function denimSeams(F, L){
  const st = `fill="none" stroke="${L.stitch}" stroke-width="1.1" stroke-dasharray="3 2.4"`;
  const hb = F ? 'M104 388 Q148 402 193 408' : 'M92 398 Q140 411 193 418';
  return `<path d="M108 106 Q140 113 176 103" ${st}/><path d="M108 111 Q140 118 177 108" ${st}/><path d="${hb}" ${st}/>`;
}

function vestFront(o){
  const L = LEATHER[o.leather], F = o.fit==='fitted', fit = F?'fitted':'classic';
  let s = `<ellipse cx="200" cy="${F?432:448}" rx="128" ry="9" fill="#000" opacity=".5" filter="url(#f-blur)"/>`;
  s += `<path d="${F?'M160 40 Q200 64 240 40 L200 214 Z':'M158 38 Q200 62 242 38 L200 214 Z'}" fill="${L.inner}"/>`;
  s += both(`<use href="#pf-${fit}" fill="url(#g-${o.leather})"/>`);
  s += `<g clip-path="url(#cpf-${fit})">${surface(L,o,'f')}</g>`;
  s += both(`<use href="#pf-${fit}" fill="none" stroke="${L.sh}" stroke-width="1.6"/>`);
  s += both(`<use href="#sf-${fit}" fill="none" stroke="${L.stitch}" stroke-width="1.1" stroke-dasharray="3.2 2.6" opacity=".85"/>`);
  if (L.twill) s += both(denimSeams(F,L));
  if (o.pockets==='slash') s += both(`<path d="M126 ${F?292:298} L155 ${F?342:350}" stroke="${L.sh}" stroke-width="7" stroke-linecap="round"/><path d="M129.5 ${F?290:296} L158.5 ${F?340:348}" stroke="${L.hi}" stroke-width="1.2" opacity=".55"/>`);
  if (o.pockets==='chest') s += both(chestPocket(L, o.leather));
  if (o.laces) s += both(laces(F,L));
  if (o.collar) s += collarFront(L, o.leather);
  s += closure(o, L, F);
  return s;
}

/* arka: rocker geometrisi */
const ROCK = { top:{cx:200,cy:330,Ro:240,Ri:192,phi:22}, bot:{cx:200,cy:122,Ri:230,Ro:278,phi:20}, mid:{cx:200,cy:238,r:56} };
const P = (cx,cy,r,a) => fx(cx+r*Math.cos(a)) + ' ' + fx(cy+r*Math.sin(a));
function topShape(){ const {cx,cy,Ro,Ri,phi}=ROCK.top, p=phi*Math.PI/180, aL=-Math.PI/2-p, aR=-Math.PI/2+p;
  return `M${P(cx,cy,Ro,aL)} A${Ro} ${Ro} 0 0 1 ${P(cx,cy,Ro,aR)} L${P(cx,cy,Ri,aR)} A${Ri} ${Ri} 0 0 0 ${P(cx,cy,Ri,aL)} Z`; }
function topLine(){ const {cx,cy,Ro,Ri,phi}=ROCK.top, p=phi*Math.PI/180, m=(Ro+Ri)/2;
  return { d:`M${P(cx,cy,m,-Math.PI/2-p)} A${m} ${m} 0 0 1 ${P(cx,cy,m,-Math.PI/2+p)}`, len:m*2*p*.86 }; }
function botShape(){ const {cx,cy,Ro,Ri,phi}=ROCK.bot, p=phi*Math.PI/180, aL=Math.PI/2+p, aR=Math.PI/2-p;
  return `M${P(cx,cy,Ro,aL)} A${Ro} ${Ro} 0 0 0 ${P(cx,cy,Ro,aR)} L${P(cx,cy,Ri,aR)} A${Ri} ${Ri} 0 0 1 ${P(cx,cy,Ri,aL)} Z`; }
function botLine(){ const {cx,cy,Ro,Ri,phi}=ROCK.bot, p=phi*Math.PI/180, m=(Ro+Ri)/2;
  return { d:`M${P(cx,cy,m,Math.PI/2+p)} A${m} ${m} 0 0 0 ${P(cx,cy,m,Math.PI/2-p)}`, len:m*2*p*.86 }; }

function fontAttrs(font){
  return font==='blok'
    ? `font-family="'Big Shoulders Display','Arial Narrow',sans-serif" font-weight="800" letter-spacing="1"`
    : `font-family="'Pirata One','Old English Text MT',serif" font-weight="400" letter-spacing=".4"`;
}
function prepText(t, font){ t = String(t||'').trim(); return font==='blok' ? t.toLocaleUpperCase('tr-TR') : t; }
/* yazıyı gerçek yazı tipiyle ölçüp arma içine sığdırır */
let _meas = null;
function measure(t, font, fs){
  try {
    if (!_meas){ _meas = document.createElementNS('http://www.w3.org/2000/svg','text'); document.getElementById('artDefs').appendChild(_meas); }
    _meas.setAttribute('font-family', font==='blok' ? "'Big Shoulders Display','Arial Narrow',sans-serif" : "'Pirata One','Old English Text MT',serif");
    _meas.setAttribute('font-weight', font==='blok' ? '800' : '400');
    _meas.setAttribute('letter-spacing', font==='blok' ? '1' : '.4');
    _meas.setAttribute('font-size', fs);
    _meas.textContent = t;
    return _meas.getComputedTextLength() || 0;
  } catch(e) { return 0; }
}
function fitSize(t, font, max, room){
  const w = measure(t, font, max);
  const est = t.length * max * (font==='blok' ? .5 : .47);
  return Math.max(10, Math.min(max, max * room / (w || est || 1)));
}
function textOnArc(line, txt, font, c){
  const id = uid('tp'), t = prepText(txt, font);
  const fs = fitSize(t, font, font==='blok'?32:34, line.len);
  return `<path id="${id}" d="${line.d}" fill="none"/><text ${fontAttrs(font)} font-size="${fx(fs)}" fill="${c.thread}" stroke="${shade(c.thread,.55)}" stroke-width=".7" paint-order="stroke" text-anchor="middle" dy="${fx(fs*.33)}"><textPath href="#${id}" startOffset="50%">${esc(t)}</textPath></text>`;
}
function patchShape(d, c){
  return `<path d="${d}" fill="${c.bg}"/><path d="${d}" fill="url(#pt-weave)"/><path d="${d}" fill="none" stroke="${c.border}" stroke-width="4.6" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${shade(c.border,.6)}" stroke-width=".8" stroke-linejoin="round" opacity=".6"/>`;
}
function emblem(c){
  const {cx,cy,r} = ROCK.mid, t = c.thread;
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c.bg}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#pt-weave)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c.border}" stroke-width="4.6"/><circle cx="${cx}" cy="${cy}" r="${r-9}" fill="none" stroke="${t}" stroke-width="1.4" stroke-dasharray="2.5 2.5" opacity=".8"/>`;
  let sp = '';
  for (let i=0;i<10;i++){ const a=i*Math.PI/5; sp += `M${fx(cx+4*Math.cos(a))} ${fx(cy+4*Math.sin(a))} L${fx(cx+16*Math.cos(a))} ${fx(cy+16*Math.sin(a))} `; }
  const wing = `<path d="M${cx-20} ${cy-5} C${cx-29} ${cy-15} ${cx-38} ${cy-19} ${cx-44} ${cy-17} M${cx-21} ${cy+1} C${cx-30} ${cy-5} ${cx-38} ${cy-6} ${cx-45} ${cy-3} M${cx-20} ${cy+7} C${cx-28} ${cy+5} ${cx-35} ${cy+7} ${cx-40} ${cy+12}" fill="none" stroke="${t}" stroke-width="4.6" stroke-linecap="round"/>`;
  s += `<g>${wing}<g transform="translate(${cx*2} 0) scale(-1 1)">${wing}</g><circle cx="${cx}" cy="${cy}" r="17" fill="none" stroke="${t}" stroke-width="3.6"/><path d="${sp}" stroke="${t}" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="4.4" fill="${t}"/></g>`;
  return s;
}
function rockerPatches(rk){
  const c = comboOf(rk.combo);
  let s = `<g filter="url(#f-drop)">`;
  if (String(rk.top||'').trim()) s += patchShape(topShape(), c) + textOnArc(topLine(), rk.top, rk.font, c);
  s += emblem(c);
  if (String(rk.bottom||'').trim()) s += patchShape(botShape(), c) + textOnArc(botLine(), rk.bottom, rk.font, c);
  return s + '</g>';
}
function ghostPatches(){
  const st = 'fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.3" stroke-dasharray="6 5"';
  return `<path d="${topShape()}" ${st}/><circle cx="${ROCK.mid.cx}" cy="${ROCK.mid.cy}" r="${ROCK.mid.r}" ${st}/><path d="${botShape()}" ${st}/>`;
}
function vestBack(o, rk){
  const L = LEATHER[o.leather], F = o.fit==='fitted', fit = F?'fitted':'classic';
  let s = `<ellipse cx="200" cy="${F?430:446}" rx="128" ry="9" fill="#000" opacity=".5" filter="url(#f-blur)"/>`;
  s += `<use href="#pb-${fit}" fill="url(#g-${o.leather})"/>`;
  s += `<g clip-path="url(#cpb-${fit})">${surface(L,o,'b')}</g>`;
  s += `<use href="#pb-${fit}" fill="none" stroke="${L.sh}" stroke-width="1.6"/>`;
  s += `<use href="#sb-${fit}" fill="none" stroke="${L.stitch}" stroke-width="1.1" stroke-dasharray="3.2 2.6" opacity=".85"/>`;
  if (L.twill) s += `<path d="M104 112 Q200 130 296 112" fill="none" stroke="${L.stitch}" stroke-width="1.1" stroke-dasharray="3 2.4"/><path d="M104 117 Q200 135 296 117" fill="none" stroke="${L.stitch}" stroke-width="1.1" stroke-dasharray="3 2.4"/>`;
  if (o.laces) s += both(laces(F,L));
  if (o.collar) s += `<path d="M148 30 Q200 48 252 30 L258 50 Q200 72 142 50 Z" fill="url(#gc-${o.leather})" stroke="${L.sh}" stroke-width="1.2" filter="url(#f-drop)"/><path d="M147 44 Q200 64 253 44" fill="none" stroke="${L.stitch}" stroke-width="1" stroke-dasharray="3 2.4" opacity=".8"/>`;
  if (rk) s += rockerPatches(rk);
  else if (o.ghost) s += ghostPatches();
  return s;
}

/* diğer ürün çizimleri (400 x 500 alan) */
function nameTag(cfg){
  const c = comboOf(cfg.combo), t = prepText(cfg.text||'Kaptan', cfg.font);
  const fs = fitSize(t, cfg.font, 62, 228);
  const d = 'M86 202 h228 a14 14 0 0 1 14 14 v76 a14 14 0 0 1 -14 14 h-228 a14 14 0 0 1 -14 -14 v-76 a14 14 0 0 1 14 -14 Z';
  return `<ellipse cx="200" cy="356" rx="150" ry="12" fill="#000" opacity=".5" filter="url(#f-blur)"/><g transform="rotate(-4 200 254)" filter="url(#f-drop)">${patchShape(d,c)}<text x="200" y="254" dy="${fx(fs*.34)}" text-anchor="middle" ${fontAttrs(cfg.font)} font-size="${fx(fs)}" fill="${c.thread}" stroke="${shade(c.thread,.55)}" stroke-width=".8" paint-order="stroke">${esc(t)}</text></g>`;
}
function chainArt(){
  const A=[96,150], C=[200,520], B=[304,150];
  const q = t => [(1-t)*(1-t)*A[0]+2*(1-t)*t*C[0]+t*t*B[0], (1-t)*(1-t)*A[1]+2*(1-t)*t*C[1]+t*t*B[1]];
  const N=400, pts=[], cum=[0];
  for (let i=0;i<=N;i++){ pts.push(q(i/N)); if (i) cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1])); }
  const total = cum[N], step = 15.5;
  let s = `<ellipse cx="200" cy="378" rx="120" ry="10" fill="#000" opacity=".5" filter="url(#f-blur)"/>`, k = 0;
  for (let dd=step; dd<total-step*.6; dd+=step, k++){
    let i = cum.findIndex(v=>v>=dd); i = Math.max(1,i);
    const [x,y]=pts[i], [x0,y0]=pts[i-1], ang=Math.atan2(y-y0,x-x0)*180/Math.PI;
    const tr = `transform="translate(${fx(x)} ${fx(y)}) rotate(${fx(ang)})"`;
    s += k%2
      ? `<rect x="-11.5" y="-2.8" width="23" height="5.6" rx="2.8" fill="#c7cace" stroke="#25272a" stroke-width="1" ${tr}/><rect x="-8" y="-1.2" width="16" height="1.2" rx=".6" fill="#f2f3f5" opacity=".8" ${tr}/>`
      : `<ellipse rx="11.5" ry="6.8" fill="none" stroke="#25272a" stroke-width="5.8" ${tr}/><ellipse rx="11.5" ry="6.8" fill="none" stroke="url(#g-steel)" stroke-width="3.6" ${tr}/>`;
  }
  const hook = 'M96 154 L96 134 C96 116 84 112 84 96 A12 12 0 0 1 108 96 L108 116';
  s += `<path d="${hook}" fill="none" stroke="#25272a" stroke-width="9" stroke-linecap="round"/><path d="${hook}" fill="none" stroke="#c7cace" stroke-width="5.4" stroke-linecap="round"/><path d="M93 126 L93 102" stroke="#f2f3f5" stroke-width="1.4" opacity=".8"/><rect x="88" y="146" width="16" height="14" rx="4" fill="url(#g-steel)" stroke="#25272a" stroke-width="1"/>`;
  s += `<circle cx="304" cy="126" r="25" fill="none" stroke="#25272a" stroke-width="7"/><circle cx="304" cy="126" r="25" fill="none" stroke="url(#g-steel)" stroke-width="4"/><path d="M286 110 l5 4" stroke="#25272a" stroke-width="2"/>`;
  return s;
}
function tinArt(){
  return `<ellipse cx="200" cy="350" rx="118" ry="13" fill="#000" opacity=".5" filter="url(#f-blur)"/>
  <path d="M108 238 L108 326 A92 25 0 0 0 292 326 L292 238 Z" fill="url(#g-tinbody)"/>
  <path d="M108 262 A92 25 0 0 0 292 262 L292 306 A92 25 0 0 1 108 306 Z" fill="#17120e"/>
  <path d="M108 268 A92 25 0 0 0 292 268" fill="none" stroke="#d6b062" stroke-width="1" opacity=".7"/>
  <text x="200" y="298" text-anchor="middle" font-family="'Big Shoulders Display','Arial Narrow',sans-serif" font-weight="800" font-size="25" fill="#d6b062" textLength="164" lengthAdjust="spacingAndGlyphs">DERİ BAKIM KREMİ</text>
  <text x="200" y="316" text-anchor="middle" font-family="'Archivo',system-ui,sans-serif" font-size="10.5" fill="#bfb1a1" textLength="150" lengthAdjust="spacingAndGlyphs">Arı mumu ve lanolin · 150 ml</text>
  <path d="M104 222 L104 240 A96 26 0 0 0 296 240 L296 222 Z" fill="url(#g-tinbody)"/>
  <ellipse cx="200" cy="222" rx="96" ry="26" fill="url(#g-tintop)"/>
  <ellipse cx="200" cy="222" rx="74" ry="19" fill="none" stroke="#5c6066" stroke-width="1.4" opacity=".7"/>
  <text x="200" y="227" text-anchor="middle" font-family="'Pirata One','Old English Text MT',serif" font-size="17" fill="#3d3f44" opacity=".75" transform="translate(0 0)">Motorcu Chopper</text>`;
}

