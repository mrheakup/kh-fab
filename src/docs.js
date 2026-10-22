/* print resolution: 12 px/mm ≈ 305 dpi for every PDF / print; live previews pass a smaller K */
const PRINT_K = 12, PREV_K = 3;
/* ================= Kh International — logo + printable document engine =================
   KH_LOGO_DEFAULT is injected by build.py from src/logo.png. Every document is drawn on
   canvases (so Cyrillic fonts render exactly), then saved as PDF or sent straight to the printer. */
/* ---------- form library: every printable form, with its own style (text size, logo place/size, title, footer) ---------- */
const DOC_KINDS = [
  { k: 'quote', n: 'Үнийн санал — Kh загвар (захиалагчид)' },
  { k: 'docket', n: 'Delivery Docket / Packing list' },
  { k: 'qdetail', n: 'Үнийн санал — дэлгэрэнгүй задаргаа', title: 'ҮНИЙН САНАЛ' },
  { k: 'scope', n: 'Ажлын scope, хуваарь', title: 'АЖЛЫН SCOPE — МЭДЭЭЛЭЛ & ХУВААРЬ' },
  { k: 'cost', n: 'Зардал, ажиллах хүчний тооцоо', title: 'ЗАРДАЛ & АЖИЛЛАХ ХҮЧНИЙ ТООЦООЛОЛ' },
  { k: 'prog', n: 'Ажлын явц, зардлын тайлан', title: 'АЖЛЫН ЯВЦ & ЗАРДЛЫН ТАЙЛАН' },
  { k: 'acc', n: 'Хүлээн авалтын акт', title: 'ХҮЛЭЭН АВАЛТЫН АКТ & ӨӨРЧЛӨЛТИЙН БҮРТГЭЛ' },
  { k: 'instr', n: 'Ажлын байрны заавар', title: 'АЖЛЫН БАЙРНЫ ЗААВАР' },
  { k: 'insp', n: 'Өдөр тутмын үзлэгийн хуудас' },
  { k: 'idea', n: 'Санал — үйлдвэрийн сайжруулалт', title: 'САНАЛ — ҮЙЛДВЭРИЙН САЙЖРУУЛАЛТ' }];
const DOC_STYLE_DEF = { fs: 100, logo: 'left', logoH: 100, title: '', foot: '' };
function docStyle(k) { const A = (S.docStyle = S.docStyle || {}); return Object.assign({}, DOC_STYLE_DEF, A._all || {}, A[k] || {}); }
const docFs = k => Math.min(1.3, Math.max(0.8, (+docStyle(k).fs || 100) / 100));
const docLogoK = k => Math.min(1.6, Math.max(0.5, (+docStyle(k).logoH || 100) / 100));
/* a document canvas carries its text scale: every «font = … Npx» on it is scaled */
(() => { const P = CanvasRenderingContext2D.prototype, d = Object.getOwnPropertyDescriptor(P, 'font'); if (!d || !d.set) return;
  Object.defineProperty(P, 'font', { configurable: true, get() { return d.get.call(this); }, set(v) { const k = this.canvas && this.canvas.__fs; if (k && k !== 1 && typeof v === 'string') v = v.replace(/(\d*\.?\d+)px/, (m, n) => (+n * k).toFixed(3) + 'px'); d.set.call(this, v); } }); })();
const LOGO_KEY = 'kh-logo';
function logoSrc() { try { return localStorage.getItem(LOGO_KEY) || KH_LOGO_DEFAULT; } catch (e) { return KH_LOGO_DEFAULT; } }
let LOGO_IMG = null;
function logoImg() {
  const src = logoSrc();
  if (LOGO_IMG && LOGO_IMG._src === src && LOGO_IMG.complete && LOGO_IMG.naturalWidth) return Promise.resolve(LOGO_IMG);
  return new Promise(res => { const im = new Image(); im._src = src; im.onload = () => { LOGO_IMG = im; res(im); }; im.onerror = () => res(null); im.src = src; });
}
/* draw the logo with height h (mm); returns the drawn width */
function drawLogo(x, X, Y, h, align) {
  const im = LOGO_IMG;
  if (!im || !im.naturalWidth) { x.save(); x.font = `700 ${h * 0.7}px "IBM Plex Sans", Arial, sans-serif`; x.textBaseline = 'top'; x.textAlign = align === 'right' ? 'right' : 'left'; x.fillStyle = '#10161c'; x.fillText('Kh International', X, Y); const w = x.measureText('Kh International').width; x.restore(); return w; }
  const w = h * im.naturalWidth / im.naturalHeight; x.drawImage(im, align === 'right' ? X - w : X, Y, w, h); return w;
}
function applyLogoUI() {
  const src = logoSrc(); document.querySelectorAll('.brand-logo').forEach(i => { i.src = src; });
  logoImg();
}

/* ---------- document builder ---------- */
const DF = '"IBM Plex Sans", Arial, sans-serif', DFM = '"IBM Plex Mono", Consolas, monospace';
const DC = { ink: '#10161c', ink2: '#4f5b68', mute: '#6a7684', line: '#c6ced7', line2: '#e3e8ee', acc: '#e0650f', soft: '#fdf1e8', head: '#2b2f33', zebra: '#f3f6fa' };
async function kdoc(opt) {
  if (!window.jspdf && !opt.noPdfLib) { /* printing still works without jsPDF */ }
  try { await document.fonts.ready; } catch (e) { }
  await logoImg();
  const kind = (DOC_KINDS.find(d => d.title && d.title === opt.title) || {}).k || opt.kind || '', ST = docStyle(kind);
  const land = !!opt.landscape, PW = land ? 297 : 210, PH = land ? 210 : 297, K = opt.K || window.__docK || PRINT_K, M = opt.margin || 14, pages = [];
  const D = { PW, PH, M, W: PW - 2 * M, pages, x: null, y: 0, land };
  D.foot = ST.foot || opt.foot || `Kh International · ISO 9001 чанарын удирдлагын тогтолцоо${S.iso && S.iso.rev ? ' · Хувилбар ' + S.iso.rev : ''}`;
  D.page = () => {
    const c = document.createElement('canvas'); c.width = PW * K; c.height = PH * K; const x = c.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH);
    c.__fs = docFs(kind); D.x = x; pages.push(c);
    if (opt.bare) { D.y = M; return x; }
    const lh = Math.min(12.5, 10 * docLogoK(kind)), R = ST.logo === 'right', tx = R ? M : PW - M;
    if (ST.logo !== 'none') drawLogo(x, R ? PW - M : M, Math.max(4, 18 - lh), lh, R ? 'right' : 'left');
    x.textBaseline = 'alphabetic'; x.textAlign = R ? 'left' : 'right'; x.fillStyle = DC.ink; x.font = `700 4.6px ${DF}`; x.fillText(ST.title || opt.title || '', tx, 13.5);
    x.font = `400 2.9px ${DF}`; x.fillStyle = DC.mute; x.fillText([opt.sub, `хуудас ${pages.length}`].filter(Boolean).join(' · '), tx, 18.5);
    x.strokeStyle = DC.acc; x.lineWidth = 0.5; x.beginPath(); x.moveTo(M, 21.5); x.lineTo(PW - M, 21.5); x.stroke();
    x.textAlign = 'left'; x.font = `400 2.5px ${DF}`; x.fillStyle = DC.mute; x.fillText(D.foot, M, PH - 6);
    x.textAlign = 'right'; x.fillText(opt.code || '', PW - M, PH - 6); x.textAlign = 'left';
    D.y = 29; return x;
  };
  D.need = h => { if (D.y + h > PH - 14) D.page(); };
  D.wrap = (s, w, font) => {
    const x = D.x; x.font = font; const out = [];
    trDoc(String(s ?? '')).split('\n').forEach(par => {
      const words = par.split(/(\s+)/); let line = '';
      words.forEach(wd => { const t = line + wd; if (x.measureText(t).width > w && line.trim()) { out.push(line.trimEnd()); line = wd.trimStart(); } else line = t; });
      while (x.measureText(line).width > w && line.length > 1) { let k = line.length; while (k > 1 && x.measureText(line.slice(0, k)).width > w) k--; out.push(line.slice(0, k)); line = line.slice(k); }
      out.push(line);
    });
    return out;
  };
  D.h2 = (t, right) => {
    D.need(14); const x = D.x; D.y += 2;
    x.fillStyle = DC.acc; x.fillRect(M, D.y - 3.6, 1.2, 5);
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = DC.ink; x.font = `700 3.7px ${DF}`; x.fillText(t, M + 3, D.y);
    if (right) { x.textAlign = 'right'; x.font = `400 2.8px ${DF}`; x.fillStyle = DC.mute; x.fillText(right, PW - M, D.y); x.textAlign = 'left'; }
    D.y += 4;
  };
  D.para = (t, o = {}) => {
    const font = `${o.bold ? 600 : 400} ${o.size || 3}px ${DF}`, lh = (o.size || 3) * 1.45, lines = D.wrap(t, o.w || D.W, font);
    lines.forEach(l => { D.need(lh + 1); const x = D.x; x.font = font; x.fillStyle = o.color || DC.ink; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText(l, (o.x || M), D.y + lh * 0.75); D.y += lh; });
    D.y += o.after ?? 2;
  };
  /* key/value grid: pairs [[k,v],...], ncol columns */
  D.kv = (pairs, ncol = 2, o = {}) => {
    const cw = D.W / ncol, kw = o.kw || Math.min(32, cw * 0.42), rh = o.rh || 6;
    const rows = Math.ceil(pairs.length / ncol); D.need(rows * rh + 2);
    const x = D.x; x.strokeStyle = DC.line; x.lineWidth = 0.25;
    pairs.forEach(([k, v], i) => {
      const X = M + (i % ncol) * cw, Y = D.y + Math.floor(i / ncol) * rh;
      x.fillStyle = o.fill || '#f6f7f9'; x.fillRect(X, Y, kw, rh); x.strokeRect(X, Y, cw, rh); x.beginPath(); x.moveTo(X + kw, Y); x.lineTo(X + kw, Y + rh); x.stroke();
      x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillStyle = DC.ink; x.font = `600 2.7px ${DF}`; x.fillText(k, X + 1.5, Y + rh / 2);
      x.font = `400 2.9px ${DF}`; let s = trDoc(String(v ?? '')); while (s.length > 2 && x.measureText(s).width > cw - kw - 3) s = s.slice(0, -2) + '…'; x.fillText(s, X + kw + 1.5, Y + rh / 2);
    });
    D.y += rows * rh + (o.after ?? 4); D.x.textBaseline = 'alphabetic';
  };
  /* table with wrapping cells. cols: {t, w (mm, last col fills), a:'r'|'c', m:mono}; rows: arrays or {cells, bold, fill} */
  D.table = (cols, rows, o = {}) => {
    const fs = o.fs || 2.8, lh = fs * 1.35, pad = 1.3, sum = cols.reduce((a, c) => a + (c.w || 0), 0);
    const W = o.w || D.W, X0 = o.x || M, free = cols.filter(c => !c.w).length, fw = free ? Math.max(10, (W - sum) / free) : 0;
    const ws = cols.map(c => c.w || fw), sc = W / ws.reduce((a, b) => a + b, 0); for (let i = 0; i < ws.length; i++) ws[i] *= sc;
    const head = () => {
      const x = D.x, hh = Math.max(...cols.map((c, j) => D.wrap(c.t, ws[j] - 2 * pad, `600 ${fs * 0.92}px ${DF}`).length)) * lh + 2 * pad;
      x.fillStyle = o.headFill || DC.head; x.fillRect(X0, D.y, W, hh);
      let cx = X0; x.fillStyle = '#fff'; x.font = `600 ${fs * 0.92}px ${DF}`; x.textBaseline = 'middle';
      cols.forEach((c, j) => { const ls = D.wrap(c.t, ws[j] - 2 * pad, x.font); x.textAlign = c.a === 'r' ? 'right' : c.a === 'c' ? 'center' : 'left'; ls.forEach((l, k) => x.fillText(l, c.a === 'r' ? cx + ws[j] - pad : c.a === 'c' ? cx + ws[j] / 2 : cx + pad, D.y + pad + lh * (k + 0.5) + (hh - 2 * pad - ls.length * lh) / 2)); cx += ws[j]; });
      D.y += hh;
    };
    D.need(18); head();
    rows.forEach((r, ri) => {
      const cells = Array.isArray(r) ? r : r.cells, bold = !Array.isArray(r) && r.bold, fill = !Array.isArray(r) && r.fill;
      const fonts = cols.map(c => `${bold ? 600 : 400} ${fs}px ${c.m ? DFM : DF}`);
      const ls = cells.map((v, j) => D.wrap(v ?? '', ws[j] - 2 * pad, fonts[j]));
      const rh = Math.max(o.minRh || 0, Math.max(1, ...ls.map(l => l.length)) * lh + 2 * pad);
      if (D.y + rh > PH - 14) { D.page(); head(); }
      const x = D.x; x.fillStyle = fill || (ri % 2 && o.zebra !== false ? DC.zebra : '#fff'); x.fillRect(X0, D.y, W, rh);
      let cx = X0; x.textBaseline = 'middle'; x.fillStyle = DC.ink;
      cols.forEach((c, j) => { x.font = fonts[j]; x.textAlign = c.a === 'r' ? 'right' : c.a === 'c' ? 'center' : 'left'; ls[j].forEach((l, k) => x.fillText(l, c.a === 'r' ? cx + ws[j] - pad : c.a === 'c' ? cx + ws[j] / 2 : cx + pad, D.y + pad + lh * (k + 0.5))); cx += ws[j]; });
      x.strokeStyle = DC.line; x.lineWidth = 0.2; cx = X0; x.beginPath(); cols.forEach((c, j) => { x.moveTo(cx, D.y); x.lineTo(cx, D.y + rh); cx += ws[j]; }); x.moveTo(cx, D.y); x.lineTo(cx, D.y + rh); x.moveTo(X0, D.y + rh); x.lineTo(X0 + W, D.y + rh); x.stroke();
      D.y += rh;
    });
    D.x.textBaseline = 'alphabetic'; D.y += o.after ?? 5;
  };
  /* totals block on the right: [[label, value, bold?, fill?]] */
  D.totals = (lines, o = {}) => {
    const w = o.w || 92, X = PW - M - w, rh = 5.6; D.need(lines.length * rh + 4);
    const x = D.x; lines.forEach(([k, v, b, f], i) => {
      const Y = D.y + i * rh; x.fillStyle = f || (b ? DC.soft : '#fff'); x.fillRect(X, Y, w, rh); x.strokeStyle = DC.line; x.lineWidth = 0.2; x.strokeRect(X, Y, w, rh);
      x.textBaseline = 'middle'; x.fillStyle = DC.ink; x.font = `${b ? 700 : 400} 2.9px ${DF}`; x.textAlign = 'left'; x.fillText(k, X + 1.5, Y + rh / 2); x.textAlign = 'right'; x.font = `${b ? 700 : 500} 3px ${DFM}`; x.fillText(v, X + w - 1.5, Y + rh / 2);
    });
    D.y += lines.length * rh + (o.after ?? 5); x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  };
  D.sigs = (labels, o = {}) => {
    D.need(22); const x = D.x, n = labels.length, w = (D.W - (n - 1) * 8) / n;
    labels.forEach((t, i) => {
      const X = M + i * (w + 8); x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.font = `600 3px ${DF}`; x.fillStyle = DC.ink; x.fillText(t, X, D.y + 3);
      if (o.names && o.names[i]) { x.font = `400 2.9px ${DF}`; x.fillText(o.names[i], X, D.y + 8); }
      x.strokeStyle = '#8a95a1'; x.lineWidth = 0.25; x.beginPath(); x.moveTo(X, D.y + 14); x.lineTo(X + w, D.y + 14); x.stroke();
      x.font = `400 2.5px ${DF}`; x.fillStyle = DC.mute; x.fillText('нэр, гарын үсэг / огноо', X, D.y + 17.5);
    });
    D.y += 22;
  };
  D.box = (title, lines) => {
    const font = `400 2.8px ${DF}`, ls = lines.flatMap(l => D.wrap(l, D.W - 6, font)), h = ls.length * 4 + 9; D.need(h);
    const x = D.x; x.fillStyle = '#fafbfc'; x.fillRect(M, D.y, D.W, h); x.strokeStyle = DC.line; x.lineWidth = 0.25; x.strokeRect(M, D.y, D.W, h); x.fillStyle = DC.acc; x.fillRect(M, D.y, 0.8, h);
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.font = `700 3px ${DF}`; x.fillStyle = DC.acc; x.fillText(title, M + 3, D.y + 4.6);
    x.font = font; x.fillStyle = DC.ink2; ls.forEach((l, i) => x.fillText(l, M + 3, D.y + 9 + i * 4)); D.y += h + 4;
  };
  D.page();
  return D;
}
/* output: PDF file or direct print. imgs: [{url, alias}] (same alias = stored once in the PDF) */
const PAPERS = { a4: [210, 297], a3: [297, 420], letter: [215.9, 279.4] };
function pdfImgs(imgs, land, name, fmt = 'a4') {
  if (!window.jspdf) { toast('PDF сан ачаалагдсангүй — «Хэвлэх» товчийг ашиглана уу'); return; }
  const [a, b] = PAPERS[fmt] || PAPERS.a4, PW = land ? b : a, PH = land ? a : b;
  const pdf = i18nPdf(new window.jspdf.jsPDF({ orientation: land ? 'landscape' : 'portrait', unit: 'mm', format: fmt, compress: true }));
  imgs.forEach((im, i) => { if (i) pdf.addPage(); pdf.addImage(im.url, 'JPEG', 0, 0, PW, PH, im.alias, 'FAST'); });
  saveFile(safeName(tr(String(name).replace(/_/g, ' '))) + '.pdf', pdf.output('blob'), 'application/pdf');
}
/* print: open an in-app preview, then print (Electron: main process; browser: off-screen iframe) */
function printHtml(imgs, land, fmt) {
  const [sa, sb] = PAPERS[fmt] || PAPERS.a4, w = (land ? sb : sa) + 'mm', h = (land ? sa : sb) + 'mm';
  return `<!doctype html><html><head><meta charset="utf-8"><title>Kh International</title><style>@page{size:${fmt === 'letter' ? 'letter' : fmt.toUpperCase()} ${land ? 'landscape' : 'portrait'};margin:0}html,body{margin:0;padding:0;background:#fff}img{display:block;width:${w};height:${h};page-break-after:always;break-after:page}img:last-child{page-break-after:auto;break-after:auto}</style></head><body>${imgs.map(i => `<img src="${i.url}">`).join('')}</body></html>`;
}
async function doPrint(imgs, land, fmt) {
  const html = printHtml(imgs, land, fmt);
  if (window.kh && window.kh.printHtml) { try { const r = await window.kh.printHtml(html, { landscape: !!land, pageSize: fmt === 'letter' ? 'Letter' : fmt.toUpperCase() }); if (r && r.error) toast('Хэвлэж чадсангүй: ' + r.error); } catch (e) { toast('Хэвлэж чадсангүй'); } return; }
  const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0';
  document.body.appendChild(fr); const doc = fr.contentDocument; doc.open(); doc.write(html); doc.close();
  const go = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { toast('Хэвлэж чадсангүй'); } setTimeout(() => fr.remove(), 60000); };
  const ims = [...doc.images]; let n = ims.filter(i => !i.complete).length; if (!n) setTimeout(go, 120); else ims.forEach(i => { if (!i.complete) i.onload = i.onerror = () => { if (--n === 0) setTimeout(go, 120); }; });
}
function printImgs(imgs, land, fmt = 'a4', name = 'Kh_International') {
  const old = document.getElementById('pvModal'); if (old) old.remove();
  const m = document.createElement('div'); m.id = 'pvModal'; m.className = 'pvmodal';
  m.innerHTML = `<div class="pvbar"><b>Хэвлэхийн өмнө харах</b><span class="muted">${imgs.length} хуудас · ${fmt === 'letter' ? 'Letter' : fmt.toUpperCase()} ${land ? 'хэвтээ' : 'босоо'}</span><span class="sp" style="flex:1"></span><button class="btn primary" data-pv="print">🖨 Хэвлэх</button><button class="btn" data-pv="pdf">PDF хадгалах</button><button class="btn ghost" data-pv="close">Хаах ✕</button></div>
    <div class="pvpages">${imgs.map((i, k) => `<figure class="${land ? 'land' : ''}"><img src="${i.url}" alt="хуудас ${k + 1}"><figcaption>${k + 1} / ${imgs.length}</figcaption></figure>`).join('')}</div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener('keydown', esc); }, esc = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc);
  m.addEventListener('click', e => { const b = e.target.closest('[data-pv]'); if (e.target === m) close(); if (!b) return; const a = b.dataset.pv; if (a === 'close') close(); else if (a === 'pdf') pdfImgs(imgs, land, name, fmt); else doPrint(imgs, land, fmt); });
}
const docImgs = D => D.pages.map((c, i) => ({ url: c.toDataURL('image/jpeg', 0.95), alias: 'p' + i }));
function docPdf(D, name) { pdfImgs(docImgs(D), D.land, name); }
function docPrint(D, name) { printImgs(docImgs(D), D.land, 'a4', name); }
/* draw one page on a fresh canvas and return it as an image */
async function pageImg(land, draw, K = window.__docK || PRINT_K) {
  const PW = land ? 297 : 210, PH = land ? 210 : 297, c = document.createElement('canvas'); c.width = PW * K; c.height = PH * K;
  const x = c.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH); draw(x, PW, PH);
  return c.toDataURL('image/jpeg', 0.95);
}
/* run a builder and send it to pdf / print */
async function docOut(mode, build, name) {
  try { const D = await build(); if (!D) return; if (mode === 'print') docPrint(D, name || 'Kh_International'); else docPdf(D, name || 'Kh_International'); }
  catch (e) { console.error(e); toast('Алдаа: ' + e.message); }
}
const outBtns = (id, label) => `<span class="outb"><button class="btn" data-out="pdf" data-doc="${id}">${label} PDF</button><button class="btn ghost" data-out="print" data-doc="${id}" title="Шууд хэвлэх">🖨 Хэвлэх</button></span>`;
const money = v => nf(Math.round(+v || 0));

(() => {
  const p = document.getElementById('logoPick'), f = document.getElementById('logoFile'), r = document.getElementById('logoReset'); if (!p) return;
  p.addEventListener('click', () => f.click());
  f.addEventListener('change', () => {
    const file = f.files[0]; f.value = ''; if (!file) return;
    const rd = new FileReader(); rd.onload = () => {
      const im = new Image(); im.onload = () => {
        const sc = Math.min(1, 1200 / im.naturalWidth, 400 / im.naturalHeight), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * sc); c.height = Math.round(im.naturalHeight * sc);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        try { localStorage.setItem(LOGO_KEY, c.toDataURL('image/png')); applyLogoUI(); toast('Лого шинэчлэгдлээ'); } catch (e) { toast('Лого хадгалж чадсангүй — файл хэт том байна'); }
      }; im.onerror = () => toast('Зураг уншигдсангүй'); im.src = rd.result;
    }; rd.readAsDataURL(file);
  });
  r.addEventListener('click', () => { try { localStorage.removeItem(LOGO_KEY); } catch (e) { } applyLogoUI(); toast('Анхны лого сэргээгдлээ'); });
})();
