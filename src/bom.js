/* ================= KH Fab — BOM import (Excel / CSV): rows → parts, DXF files matched by name ================= */
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const BOM_COLS = {
  name: /^(нэр|нэршил|name|part|эд\s*анги|деталь|наименование|description|тайлбар)/i,
  qty: /^(тоо|ширхэг|qty|quantity|pcs|count|кол|ш\.?$|тоо\s*ширхэг)/i,
  mat: /^(материал|material|марка|grade|ган)/i,
  thk: /^(зузаан|thickness|thk|t$|s$|толщина|зуз)/i,
  L: /^(урт|length|l$|длина)/i,
  W: /^(өргөн|width|w$|b$|ширина)/i,
  D: /^(диаметр|diameter|ø|d$|dia)/i,
  file: /^(файл|file|dxf|drawing|чертеж|зураг)/i
};
function bomNum(v) { if (v == null) return NaN; if (typeof v === 'number') return v; const m = String(v).replace(/\s/g, '').replace(',', '.').match(/-?\d+(\.\d+)?/); return m ? +m[0] : NaN; }
function parseCsv(txt) {
  txt = txt.replace(/^﻿/, '');
  const first = txt.split(/\r?\n/)[0] || '', d = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
    if (ch === '"') q = true; else if (ch === d) { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim()));
}
async function readBomRows(file) {
  if (/\.csv$|\.txt$/i.test(file.name)) {
    const buf = new Uint8Array(await file.arrayBuffer());
    let txt = new TextDecoder('utf-8').decode(buf);
    if (txt.includes('�')) txt = new TextDecoder('windows-1251').decode(buf); // Excel “CSV” saved in Cyrillic code page
    return parseCsv(txt);
  }
  if (!window.XLSX) await loadScript(XLSX_URL);
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }).filter(r => r.some(c => String(c).trim()));
}
function bomMap(rows) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const m = {};
    rows[i].forEach((c, j) => { const s = String(c).trim(); for (const [k, re] of Object.entries(BOM_COLS)) if (m[k] == null && re.test(s)) { m[k] = j; break; } });
    if (m.qty != null && (m.name != null || m.file != null)) return { map: m, start: i + 1 };
  }
  return { map: { name: 0, qty: 1, mat: 2, thk: 3, L: 4, W: 5, file: 6 }, start: 0 };
}
function bomMat(txt, added) {
  const s = String(txt || '').trim(); if (!s) return S.defMat;
  const lo = s.toLowerCase(), hit = S.materials.find(m => m.name.toLowerCase() === lo) || S.materials.find(m => m.name.toLowerCase().split(/\s*\/\s*/).includes(lo)) || S.materials.find(m => m.name.toLowerCase().includes(lo));
  if (hit) return hit.name;
  S.materials.push({ name: s, rho: /alum|цагаан/i.test(s) ? 2.7 : 7.85, price: 0, rm: 420 }); added.add(s); return s;
}
/* rows + geometry files → parts */
async function bomToParts(rows, geoFiles) {
  const { map, start } = bomMap(rows), out = [], msgs = [], added = new Set();
  const byName = new Map(geoFiles.map(f => [f.name.replace(/\.[^.]+$/, '').toLowerCase(), f]));
  const cell = (r, k) => map[k] != null ? r[map[k]] : '';
  let skipped = 0;
  for (let i = start; i < rows.length; i++) {
    const r = rows[i], qty = Math.round(bomNum(cell(r, 'qty')));
    const name = String(cell(r, 'name') || '').trim() || `Мөр ${i + 1}`;
    if (!(qty > 0)) { skipped++; continue; }
    const thk = bomNum(cell(r, 'thk')), mat = bomMat(cell(r, 'mat'), added), base = { qty, mat, thk: thk > 0 ? thk : +S.defThk, rot: true, mir: false, prio: 0 };
    const fn = String(cell(r, 'file') || '').trim(), key = fn.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '').toLowerCase();
    const f = key && (byName.get(key) || [...byName.entries()].find(([k]) => k.includes(key) || key.includes(k))?.[1]);
    if (f) {
      try {
        const g = await importAnyFile(f);
        if (!g.parts.length) { msgs.push(`${name}: «${f.name}» хаалттай контургүй`); continue; }
        g.parts.forEach((p, k) => out.push({ ...base, id: uid(), name: g.parts.length > 1 ? `${name} (${k + 1})` : name, qty: qty * (p.qty || 1), outer: p.outer, holes: p.holes, ...(p.bends ? { bends: p.bends } : {}) }));
      } catch (e) { msgs.push(`${name}: ${e.message || 'файл уншигдсангүй'}`); }
      continue;
    }
    const L = bomNum(cell(r, 'L')), W = bomNum(cell(r, 'W')), D = bomNum(cell(r, 'D'));
    if (L > 0 && W > 0) out.push({ ...base, id: uid(), name, outer: rectLoop(L, W, 0), holes: [] });
    else if (D > 0) out.push({ ...base, id: uid(), name, outer: circleLoop(D / 2, D / 2, D / 2), holes: [] });
    else msgs.push(fn ? `${name}: «${fn}» файл сонгогдоогүй` : `${name}: хэмжээ эсвэл файл алга`);
  }
  if (added.size) msgs.push(`Шинэ материал: ${[...added].join(', ')} (нягт, үнийг Тохиргоонд шалгана уу)`);
  return { parts: out, msgs, skipped };
}
async function importBom(files, target) {
  const tab = files.filter(f => /\.(xlsx|xlsm|xls|csv|txt|ods)$/i.test(f.name)), geo = files.filter(f => !tab.includes(f));
  if (!tab.length) { toast('Excel (.xlsx) эсвэл CSV файл сонгоно уу — DXF-үүдийг хамт сонгож болно'); return null; }
  let parts = [], msgs = [];
  for (const f of tab) {
    try { const rows = await readBomRows(f); const r = await bomToParts(rows, geo); parts = parts.concat(r.parts); msgs = msgs.concat(r.msgs); }
    catch (e) { msgs.push(`${f.name}: ${e.message || 'уншиж чадсангүй'}`); }
  }
  if (target === 'kit') {
    if (parts.length) { const k = { id: uid(), name: tab[0].name.replace(/\.[^.]+$/, ''), desc: 'BOM-оос', parts: parts.map(cleanPart) }; S.kits.unshift(k); J.kit = k.id; J.bucket = false; }
    save(); renderJobs();
  } else { S.parts.push(...parts); save(); renderParts(); renderSettings(); }
  toast((parts.length ? `BOM: ${parts.length} төрлийн парт, ${parts.reduce((a, p) => a + p.qty, 0)} ширхэг` : 'BOM-оос парт нэмэгдсэнгүй') + (msgs.length ? ' · ' + msgs.slice(0, 4).join(' · ') + (msgs.length > 4 ? ` · +${msgs.length - 4}` : '') : ''), msgs.length ? 10000 : 3000);
  return parts;
}
$('#bomIn').addEventListener('change', e => { importBom([...e.target.files], 'nest'); e.target.value = ''; });
$('#bomKitIn').addEventListener('change', e => { importBom([...e.target.files], 'kit'); e.target.value = ''; });
$('#bomTpl').addEventListener('click', () => {
  const csv = '﻿Нэр;Тоо;Материал;Зузаан;Урт;Өргөн;Диаметр;Файл\r\nХажуу хавтан;2;S355 / 09Г2С;16;;;;side_plate.dxf\r\nИрний хавтан;1;Hardox 450;30;1100;220;;\r\nШайб;8;Ст3 / S235;6;;;80;\r\n';
  saveFile('KH_BOM_загвар.csv', csv, 'text/csv');
});
