/* ================= KH Fab — 3D: viewer (three.js), STEP (AP214 B-rep) and STL export, STEP/IGES import → flat plates ================= */
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js';
const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js';
const OCCT_URL = 'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js';
async function ensureThree() { if (!window.THREE) await loadScript(THREE_URL); if (!THREE.OrbitControls) await loadScript(ORBIT_URL); }

/* ---------- loop helpers (local 2D, bulge arcs) ---------- */
function ccwLoop(lp, ccw) { return orientLoop(lp, ccw); }
function loopPts(lp, tol) { return flattenLoop(lp, tol || 0.3); }
const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len: a => Math.hypot(a[0], a[1], a[2]), norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; } };
const wpt = (fr, x, y, z) => [0, 1, 2].map(i => fr.o[i] + x * fr.u[i] + y * fr.v[i] + z * fr.n[i]);

/* ---------- three.js meshes ---------- */
function solidGeometry(s) {
  const outer = ccwLoop(s.loops[0], true), sh = new THREE.Shape(loopPts(outer, 0.3).map(p => new THREE.Vector2(p[0], p[1])));
  s.loops.slice(1).forEach(h => sh.holes.push(new THREE.Path(loopPts(ccwLoop(h, false), 0.3).map(p => new THREE.Vector2(p[0], p[1])))));
  const g = new THREE.ExtrudeGeometry(sh, { depth: s.t, bevelEnabled: false, curveSegments: 24 });
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...s.fr.u), new THREE.Vector3(...s.fr.v), new THREE.Vector3(...s.fr.n)).setPosition(new THREE.Vector3(...s.fr.o));
  g.applyMatrix4(m); return g;
}
const V3D = new Map();
async function show3D(host, solids, opts) {
  await ensureThree();
  const old = V3D.get(host); if (old) old.dispose();
  host.innerHTML = '';
  const dark = isDark(), W = host.clientWidth || 600, H = host.clientHeight || 400;
  const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); R.setPixelRatio(window.devicePixelRatio || 1); R.setSize(W, H);
  R.setClearColor(dark ? 0x141a21 : 0xeef1f4); host.appendChild(R.domElement);
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, W / H, 1, 1e6); cam.up.set(0, 0, 1);
  scene.add(new THREE.AmbientLight(0xffffff, 0.55)); const dl = new THREE.DirectionalLight(0xffffff, 0.75); dl.position.set(1, -1.5, 2); scene.add(dl); const dl2 = new THREE.DirectionalLight(0xffffff, 0.3); dl2.position.set(-1, 1, 0.5); scene.add(dl2);
  const keys = [...new Set(solids.map(s => s.key))], box = new THREE.Box3();
  solids.forEach(s => {
    const g = solidGeometry(s), hue = (keys.indexOf(s.key) * 137.5 + 20) % 360;
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(`hsl(${hue}, 45%, ${dark ? 58 : 62}%)`), metalness: 0.25, roughness: 0.6 });
    const mesh = new THREE.Mesh(g, mat); scene.add(mesh);
    scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), new THREE.LineBasicMaterial({ color: dark ? 0x0b0f14 : 0x2c3640 })));
    g.computeBoundingBox(); box.union(g.boundingBox);
  });
  const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3()), d = Math.max(sz.x, sz.y, sz.z) || 1;
  cam.position.set(c.x + d * 1.3, c.y - d * 1.6, c.z + d * 1.0); cam.near = d / 100; cam.far = d * 100; cam.updateProjectionMatrix();
  const ctl = new THREE.OrbitControls(cam, R.domElement); ctl.target.copy(c); ctl.update();
  const grid = new THREE.GridHelper(d * 3, 30, dark ? 0x334050 : 0xc3cbd3, dark ? 0x222b35 : 0xdde2e7); grid.rotation.x = Math.PI / 2; grid.position.set(c.x, c.y, box.min.z - 0.5); scene.add(grid);
  let raf = 0; const loop = () => { raf = requestAnimationFrame(loop); R.render(scene, cam); }; loop();
  const ro = new ResizeObserver(() => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; R.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); }); ro.observe(host);
  const api = { dispose() { cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose(); R.dispose(); scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); host.innerHTML = ''; V3D.delete(host); }, png: () => R.domElement.toDataURL('image/png') };
  V3D.set(host, api); return api;
}

/* ---------- STL (binary) ---------- */
async function stlFile(solids) {
  await ensureThree();
  const tris = [];
  solids.forEach(s => { const g = solidGeometry(s).toNonIndexed(), p = g.attributes.position.array; for (let i = 0; i < p.length; i += 9) tris.push(p.slice(i, i + 9)); g.dispose(); });
  const buf = new ArrayBuffer(84 + tris.length * 50), dv = new DataView(buf);
  const hdr = 'Kh International - KH Fab STL'; for (let i = 0; i < hdr.length; i++) dv.setUint8(i, hdr.charCodeAt(i));
  dv.setUint32(80, tris.length, true);
  tris.forEach((t, k) => {
    const o = 84 + k * 50, a = [t[3] - t[0], t[4] - t[1], t[5] - t[2]], b = [t[6] - t[0], t[7] - t[1], t[8] - t[2]], n = v3.norm(v3.cross(a, b));
    n.forEach((v, i) => dv.setFloat32(o + i * 4, v, true)); for (let i = 0; i < 9; i++) dv.setFloat32(o + 12 + i * 4, t[i], true);
  });
  return new Blob([buf], { type: 'model/stl' });
}

/* ---------- STEP AP214: each solid = planar profile (lines + arcs) extruded along n ---------- */
function stepFile(solids, name) {
  const L = []; let id = 0;
  const E = s => { L.push(`#${++id}=${s};`); return '#' + id; };
  const R = v => { let s = String(Number((+v).toFixed(6))); if (s === '-0') s = '0'; if (!/[.eE]/.test(s)) s += '.'; return s; };
  const P = p => E(`CARTESIAN_POINT('',(${R(p[0])},${R(p[1])},${R(p[2])}))`);
  const Dn = d => { const n = v3.norm(d); return E(`DIRECTION('',(${R(n[0])},${R(n[1])},${R(n[2])}))`); };
  const AX = (p, z, x) => E(`AXIS2_PLACEMENT_3D('',${P(p)},${Dn(z)},${Dn(x)})`);
  const esc = s => String(s).replace(/'/g, "''").replace(/[^\x20-\x7e]/g, '_');
  const ctx = E("APPLICATION_CONTEXT('automotive design')");
  E(`APPLICATION_PROTOCOL_DEFINITION('international standard','automotive_design',2000,${ctx})`);
  const pc = E(`PRODUCT_CONTEXT('',${ctx},'mechanical')`), prod = E(`PRODUCT('${esc(name)}','${esc(name)}','',(${pc}))`);
  E(`PRODUCT_RELATED_PRODUCT_CATEGORY('part',$,(${prod}))`);
  const pdf = E(`PRODUCT_DEFINITION_FORMATION('','',${prod})`), pdc = E(`PRODUCT_DEFINITION_CONTEXT('part definition',${ctx},'design')`);
  const pd = E(`PRODUCT_DEFINITION('design','',${pdf},${pdc})`), pds = E(`PRODUCT_DEFINITION_SHAPE('','',${pd})`);
  const lu = E('(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.))'), au = E('(NAMED_UNIT(*)PLANE_ANGLE_UNIT()SI_UNIT($,.RADIAN.))'), su = E('(NAMED_UNIT(*)SI_UNIT($,.STERADIAN.)SOLID_ANGLE_UNIT())');
  const unc = E(`UNCERTAINTY_MEASURE_WITH_UNIT(LENGTH_MEASURE(1.E-05),${lu},'distance_accuracy_value','')`);
  const gctx = E(`(GEOMETRIC_REPRESENTATION_CONTEXT(3)GLOBAL_UNCERTAINTY_ASSIGNED_CONTEXT((${unc}))GLOBAL_UNIT_ASSIGNED_CONTEXT((${lu},${au},${su}))REPRESENTATION_CONTEXT('',''))`);
  const breps = [];
  solids.forEach((s, si) => {
    const fr = s.fr, t = s.t, n = fr.n, faces = [];
    const loops = s.loops.map((lp, i) => orientLoop(lp, i === 0)).map(lp => {
      const N = lp.length, vb = [], vt = [];
      lp.forEach(v => { vb.push({ p: wpt(fr, v.x, v.y, 0) }); vt.push({ p: wpt(fr, v.x, v.y, t) }); });
      vb.forEach(v => v.e = E(`VERTEX_POINT('',${P(v.p)})`)); vt.forEach(v => v.e = E(`VERTEX_POINT('',${P(v.p)})`));
      const seg = [], eb = [], et = [], ev = [];
      for (let i = 0; i < N; i++) {
        const a = lp[i], b = lp[(i + 1) % N], sa = segArc(a, b, a.b);
        seg.push(sa.line ? { line: true, a, b } : { line: false, a, b, cx: sa.cx, cy: sa.cy, r: sa.r, bu: a.b });
      }
      const mkEdge = (z, vs, i) => {
        const g = seg[i], j = (i + 1) % N, A = vs[i], B = vs[j];
        if (g.line) { const d = v3.sub(B.p, A.p); return E(`EDGE_CURVE('',${A.e},${B.e},${E(`LINE('',${P(A.p)},${E(`VECTOR('',${Dn(d)},${R(v3.len(d))})`)})`)},.T.)`); }
        const C = wpt(fr, g.cx, g.cy, z), ax = g.bu > 0 ? n : v3.mul(n, -1);
        return E(`EDGE_CURVE('',${A.e},${B.e},${E(`CIRCLE('',${AX(C, ax, v3.sub(A.p, C))},${R(g.r)})`)},.T.)`);
      };
      for (let i = 0; i < N; i++) { eb.push(mkEdge(0, vb, i)); et.push(mkEdge(t, vt, i)); }
      for (let i = 0; i < N; i++) { const d = v3.sub(vt[i].p, vb[i].p); ev.push(E(`EDGE_CURVE('',${vb[i].e},${vt[i].e},${E(`LINE('',${P(vb[i].p)},${E(`VECTOR('',${Dn(d)},${R(t)})`)})`)},.T.)`)); }
      // side faces
      for (let i = 0; i < N; i++) {
        const g = seg[i], j = (i + 1) % N;
        const loop = E(`EDGE_LOOP('',(${E(`ORIENTED_EDGE('',*,*,${eb[i]},.T.)`)},${E(`ORIENTED_EDGE('',*,*,${ev[j]},.T.)`)},${E(`ORIENTED_EDGE('',*,*,${et[i]},.F.)`)},${E(`ORIENTED_EDGE('',*,*,${ev[i]},.F.)`)}))`);
        const bnd = E(`FACE_OUTER_BOUND('',${loop},.T.)`);
        let surf, sense = '.T.';
        if (g.line) { const d = v3.norm(v3.sub(vb[j].p, vb[i].p)), m = v3.cross(d, n); surf = E(`PLANE('',${AX(vb[i].p, m, d)})`); }
        else { const C = wpt(fr, g.cx, g.cy, 0); surf = E(`CYLINDRICAL_SURFACE('',${AX(C, n, v3.sub(vb[i].p, C))},${R(g.r)})`); sense = g.bu > 0 ? '.T.' : '.F.'; }
        faces.push(E(`ADVANCED_FACE('',(${bnd}),${surf},${sense})`));
      }
      return { eb, et, N };
    });
    // top (+n) and bottom (−n) caps
    const cap = (top) => {
      const bounds = loops.map((lp, k) => {
        const oe = [];
        if (top) for (let i = 0; i < lp.N; i++) oe.push(E(`ORIENTED_EDGE('',*,*,${lp.et[i]},.T.)`));
        else for (let i = lp.N - 1; i >= 0; i--) oe.push(E(`ORIENTED_EDGE('',*,*,${lp.eb[i]},.F.)`));
        const el = E(`EDGE_LOOP('',(${oe.join(',')}))`);
        return E(`${k === 0 ? 'FACE_OUTER_BOUND' : 'FACE_BOUND'}('',${el},.T.)`);
      });
      const o = wpt(fr, 0, 0, top ? t : 0);
      return E(`ADVANCED_FACE('',(${bounds.join(',')}),${E(`PLANE('',${AX(o, top ? n : v3.mul(n, -1), fr.u)})`)},.T.)`);
    };
    faces.push(cap(true), cap(false));
    breps.push(E(`MANIFOLD_SOLID_BREP('${esc(s.key || 'solid')}_${si + 1}',${E(`CLOSED_SHELL('',(${faces.join(',')}))`)})`));
  });
  const rep = E(`ADVANCED_BREP_SHAPE_REPRESENTATION('${esc(name)}',(${AX([0, 0, 0], [0, 0, 1], [1, 0, 0])},${breps.join(',')}),${gctx})`);
  E(`SHAPE_DEFINITION_REPRESENTATION(${pds},${rep})`);
  const now = new Date().toISOString().slice(0, 19);
  return `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('Kh International - KH Fab'),'2;1');\nFILE_NAME('${esc(name)}.stp','${now}',('Kh International'),('Kh International'),'KH Fab','KH Fab','');\nFILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));\nENDSEC;\nDATA;\n${L.join('\n')}\nENDSEC;\nEND-ISO-10303-21;\n`;
}

/* ---------- STEP / IGES / BREP import → flat plates ---------- */
let OCCT = null;
async function ensureOcct() {
  if (OCCT) return OCCT;
  if (!window.occtimportjs) await loadScript(OCCT_URL);
  const base = OCCT_URL.replace(/[^/]*$/, '');
  if (location.protocol === 'file:' && !/^https?:/.test(OCCT_URL)) {
    // offline app: browsers cannot fetch() file:// URLs, so the wasm ships as a base64 script
    if (!window.OCCT_WASM_B64) await loadScript(base + 'occt-wasm-b64.js');
    const bin = Uint8Array.from(atob(window.OCCT_WASM_B64), ch => ch.charCodeAt(0));
    OCCT = await occtimportjs({ wasmBinary: bin });
  } else OCCT = await occtimportjs({ locateFile: f => base + f });
  return OCCT;
}
/* mesh → plate {t, loops (2D, mm)} or null */
function meshPlate(mesh) {
  const P = mesh.attributes.position.array, I = mesh.index.array, faces = mesh.brep_faces && mesh.brep_faces.length ? mesh.brep_faces : [{ first: 0, last: I.length / 3 - 1 }];
  const tri = k => [0, 1, 2].map(j => [P[I[k * 3 + j] * 3], P[I[k * 3 + j] * 3 + 1], P[I[k * 3 + j] * 3 + 2]]);
  const F = faces.map(f => {
    let nx = 0, ny = 0, nz = 0, area = 0, planar = true; const ts = [];
    for (let k = f.first; k <= f.last; k++) { const [a, b, c] = tri(k), cr = v3.cross(v3.sub(b, a), v3.sub(c, a)); nx += cr[0]; ny += cr[1]; nz += cr[2]; area += v3.len(cr) / 2; ts.push([a, b, c, cr]); }
    const n = v3.norm([nx, ny, nz]);
    for (const q of ts) { const l = v3.len(q[3]); if (l > 1e-9 && v3.dot(v3.mul(q[3], 1 / l), n) < 0.999) { planar = false; break; } }
    return { n, area, planar, ts, d: ts.length ? v3.dot(n, ts[0][0]) : 0 };
  }).filter(f => f.area > 1e-6);
  const pl = F.filter(f => f.planar).sort((a, b) => b.area - a.area);
  if (!pl.length) return null;
  const top = pl[0], n = top.n;
  // thickness: extent of the whole mesh along n
  let mn = Infinity, mx = -Infinity; for (let i = 0; i < P.length; i += 3) { const d = n[0] * P[i] + n[1] * P[i + 1] + n[2] * P[i + 2]; if (d < mn) mn = d; if (d > mx) mx = d; }
  const t = mx - mn;
  const opp = pl.find(f => v3.dot(f.n, n) < -0.999 && Math.abs(f.area - top.area) < 0.02 * top.area);
  if (!opp || t <= 0.05) return null;
  // all side faces must be perpendicular to n (prismatic plate)
  const sideOk = F.every(f => (f.planar && Math.abs(v3.dot(f.n, n)) > 0.999) || (!f.planar ? f.ts.every(q => { const l = v3.len(q[3]); return l < 1e-9 || Math.abs(v3.dot(q[3], n)) / l < 0.02; }) : Math.abs(v3.dot(f.n, n)) < 0.02));
  if (!sideOk) return { bent: true, t };
  // outline: boundary edges of all faces coplanar with the top face
  const e1 = v3.norm(Math.abs(n[0]) < 0.9 ? v3.cross(n, [1, 0, 0]) : v3.cross(n, [0, 1, 0])), e2 = v3.cross(n, e1);
  const key = p => `${Math.round(v3.dot(p, e1) * 1e3)},${Math.round(v3.dot(p, e2) * 1e3)}`, xy = new Map(), cnt = new Map();
  pl.filter(f => v3.dot(f.n, n) > 0.999 && Math.abs(f.d - top.d) < 0.01).forEach(f => f.ts.forEach(([a, b, c]) => {
    [[a, b], [b, c], [c, a]].forEach(([p, q]) => { const kp = key(p), kq = key(q); xy.set(kp, [v3.dot(p, e1), v3.dot(p, e2)]); xy.set(kq, [v3.dot(q, e1), v3.dot(q, e2)]); const k = kp < kq ? kp + '|' + kq : kq + '|' + kp; const o = cnt.get(k); cnt.set(k, o ? { n: o.n + 1, a: o.a, b: o.b } : { n: 1, a: kp, b: kq }); });
  }));
  const adj = new Map(); for (const e of cnt.values()) if (e.n === 1) { (adj.get(e.a) || adj.set(e.a, []).get(e.a)).push(e.b); (adj.get(e.b) || adj.set(e.b, []).get(e.b)).push(e.a); }
  const used = new Set(), loops = [];
  for (const s of adj.keys()) {
    if (used.has(s)) continue;
    const pts = [s]; used.add(s); let cur = s, prev = null;
    for (let g = 0; g < 1e6; g++) { const nx = (adj.get(cur) || []).find(k => k !== prev && !used.has(k)); if (!nx) break; pts.push(nx); used.add(nx); prev = cur; cur = nx; }
    if (pts.length >= 3) loops.push(fitPoly(pts.map(k => xy.get(k)), true, 0.02));
  }
  return loops.length ? { t, loops } : null;
}
async function importStep(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase(), base = file.name.replace(/\.[^.]+$/, '');
  const oc = await ensureOcct(), buf = new Uint8Array(await file.arrayBuffer());
  const res = ext === 'igs' || ext === 'iges' ? oc.ReadIgesFile(buf, null) : ext === 'brep' ? oc.ReadBrepFile(buf, null) : oc.ReadStepFile(buf, null);
  if (!res || !res.success) throw new Error('3D файл уншигдсангүй');
  let bent = 0, other = 0; const groups = [];
  res.meshes.forEach((m, i) => {
    const pl = meshPlate(m);
    if (!pl) { other++; return; } if (pl.bent) { bent++; return; }
    const tt = Math.round(pl.t * 10) / 10;
    // one mesh = one part (plates may overlap once projected, so never mix meshes); then merge identical ones
    loopsToParts(pl.loops, m.name || base).forEach(p => {
      const inf = partInfo(p), sig = [tt, inf.area.toFixed(0), inf.cut.toFixed(0), Math.min(inf.w, inf.h).toFixed(1), Math.max(inf.w, inf.h).toFixed(1), p.holes.length].join('|');
      const g = groups.find(x => x.sig === sig); if (g) g.qty += p.qty; else groups.push({ sig, qty: p.qty, p, t: tt, nm: m.name });
    });
  });
  const parts = groups.map((g, i) => ({ ...g.p, name: g.nm || `${base} ${g.t}мм-${i + 1}`, qty: g.qty, thk: g.t }));
  return { parts, open: 0, bent, other, solids: res.meshes.length };
}
