/* ================= KH Fab — language (МН / EN) and theme (Day / Night) =================
   The UI is written in Mongolian. In English mode every Mongolian fragment that reaches the
   screen (DOM text, attributes, canvas text, dialogs, PDFs, exported files) is replaced through
   the I18N_EN dictionary (src/i18n_en.json, injected by build.py). */
const LANG_KEY = 'kh-lang', THEME_KEY = 'kh-theme';
let LANG = (() => { try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'mn'; } catch (e) { return 'mn'; } })();
const TR_CYR = /[А-Яа-яЁёӨөҮү]/;
let TR_RE = null, TR_LOW = null;
function trBuild() {
  const esc = k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(I18N_EN).sort((a, b) => b.length - a.length);
  TR_LOW = {}; for (const k of keys) { const l = k.toLowerCase(); if (!(l in TR_LOW)) TR_LOW[l] = I18N_EN[k]; }
  TR_RE = new RegExp('(?<![А-Яа-яЁёӨөҮүA-Za-z])(?:' + keys.map(esc).join('|') + ')(?![А-Яа-яЁёӨөҮү])( ?)', 'giu');
}
function trForce(s) {
  if (typeof s !== 'string' || !TR_CYR.test(s)) return s;
  if (!TR_RE) trBuild();
  return s.replace(TR_RE, (m, sp) => {
    const k = sp ? m.slice(0, -sp.length) : m;
    let v = I18N_EN[k];
    if (v === undefined) {
      v = TR_LOW[k.toLowerCase()]; if (v === undefined) return m;
      const up = k[0] !== k[0].toLowerCase();
      if (v) v = (up ? v[0].toUpperCase() : v[0].toLowerCase()) + v.slice(1);
    }
    return v === '' ? '' : v + sp;
  });
}
const tr = s => LANG === 'en' ? trForce(s) : s;

/* ---- DOM: translate text nodes and a few attributes; originals are kept so МН can be restored ---- */
const TR_ORIG = new WeakMap(), TR_OUT = new WeakMap(), TR_ATTRS = ['placeholder', 'title', 'aria-label'];
const trSkip = el => !!(el && el.closest && el.closest('script,style,textarea,[contenteditable="true"],.notr'));
function trText(n) {
  const cur = n.data; let o = TR_ORIG.get(n);
  if (o === undefined || cur !== TR_OUT.get(n)) o = cur;
  const v = tr(o); TR_ORIG.set(n, o); TR_OUT.set(n, v); if (v !== cur) n.data = v;
}
function trAttr(el, a) {
  const cur = el.getAttribute(a); if (cur == null) return;
  const st = el.__tr || (el.__tr = {}); let o = st[a] && cur === st[a][1] ? st[a][0] : cur;
  const v = tr(o); st[a] = [o, v]; if (v !== cur) el.setAttribute(a, v);
}
function trWalk(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (!trSkip(root.parentElement)) trText(root); return; }
  if (root.nodeType !== 1 || trSkip(root)) return;
  for (const a of TR_ATTRS) if (root.hasAttribute(a)) trAttr(root, a);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: n => n.nodeType === 1 && trSkip(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
  let n; while ((n = w.nextNode())) { if (n.nodeType === 3) { if (TR_ORIG.has(n) || TR_CYR.test(n.data)) trText(n); } else for (const a of TR_ATTRS) if (n.hasAttribute(a)) trAttr(n, a); }
}
const trObs = new MutationObserver(list => {
  for (const m of list) {
    if (m.type === 'childList') m.addedNodes.forEach(trWalk);
    else if (m.type === 'characterData') { if (m.target.data !== TR_OUT.get(m.target) && !trSkip(m.target.parentElement)) trText(m.target); }
    else if (m.type === 'attributes') { const el = m.target, st = el.__tr && el.__tr[m.attributeName]; if (!(st && st[1] === el.getAttribute(m.attributeName)) && !trSkip(el)) trAttr(el, m.attributeName); }
  }
});

/* ---- canvas, dialogs, PDFs, saved files ---- */
(() => {
  const P = CanvasRenderingContext2D.prototype;
  for (const f of ['fillText', 'strokeText', 'measureText']) { const o = P[f]; P[f] = function (t, ...a) { return o.call(this, typeof t === 'string' ? tr(t) : t, ...a); }; }
  for (const f of ['alert', 'confirm', 'prompt']) { const o = window[f]; if (o) window[f] = (m, ...a) => o.call(window, tr(String(m ?? '')), ...a); }
})();
function i18nPdf(pdf) {
  const t = x => typeof x === 'string' ? tr(x) : Array.isArray(x) ? x.map(t) : x;
  for (const f of ['text', 'splitTextToSize', 'getTextWidth', 'getStringUnitWidth']) { const o = pdf[f]; if (typeof o === 'function') pdf[f] = function (s, ...a) { return o.call(this, t(s), ...a); }; }
  return pdf;
}

/* ---- switches ---- */
function i18nRerender() {
  try { const cur = (document.querySelector('.modtabs button.on') || {}).dataset?.mod || 'nest'; if (typeof renderAll === 'function') renderAll(); if (typeof setModule === 'function') setModule(cur); } catch (e) { }
}
function setLang(l) {
  LANG = l === 'en' ? 'en' : 'mn'; try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { }
  document.documentElement.lang = LANG === 'en' ? 'en' : 'mn';
  trWalk(document.body); i18nRerender(); i18nButtons();
}
function themeIsDark() { const a = document.documentElement.getAttribute('data-theme'); if (a) return a === 'dark'; return matchMedia('(prefers-color-scheme: dark)').matches; }
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem(THEME_KEY, t); } catch (e) { }
  i18nRerender(); i18nButtons();
}
function i18nButtons() {
  document.querySelectorAll('#langSeg button').forEach(b => b.classList.toggle('on', b.dataset.lang === LANG));
  const d = themeIsDark(), b = document.getElementById('btnTheme');
  if (b) { b.textContent = d ? '☀ Day' : '☾ Night'; b.title = d ? 'Day mode' : 'Night mode'; }
}
(() => {
  try { const t = localStorage.getItem(THEME_KEY); if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t); } catch (e) { }
  { const V = ['modern', 'calm', 'dark', 'fintech', 'bento'], apply = k => { const h = document.documentElement; h.setAttribute('data-skin', 'modern'); if (k === 'modern') h.removeAttribute('data-var'); else h.setAttribute('data-var', k); if (k === 'dark') h.setAttribute('data-theme', 'dark'); else if (h.dataset.forcedDark) h.setAttribute('data-theme', 'light'); h.dataset.forcedDark = k === 'dark' ? '1' : ''; if (typeof i18nButtons === 'function') i18nButtons(); };
    let k = 'modern'; try { k = localStorage.getItem('kh-skin') || 'modern'; } catch (e) { } if (!V.includes(k)) k = 'modern'; apply(k);
    const sel = document.getElementById('skinSel'); if (sel) { sel.value = k; sel.addEventListener('change', () => { apply(sel.value); try { localStorage.setItem('kh-skin', sel.value); } catch (e) { } }); } }
  document.documentElement.lang = LANG === 'en' ? 'en' : 'mn';
  trObs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TR_ATTRS });
  if (LANG === 'en') trWalk(document.body);
  document.querySelectorAll('#langSeg button').forEach(b => b.addEventListener('click', () => { if (b.dataset.lang !== LANG) setLang(b.dataset.lang); }));
  const bt = document.getElementById('btnTheme'); if (bt) bt.addEventListener('click', () => setTheme(themeIsDark() ? 'light' : 'dark'));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', i18nButtons);
  i18nButtons();
})();
