// Professional 2D floor plan + site drawing, rendered as SVG on an A3 sheet (mm units, 1:100).
import { house, wallById, wallVec, clearRect, areaSummary, M2_TO_SQFT } from './house.js';

const SHEET = { w: 420, h: 297 };
const S = 10;                 // 1:100 -> 1 m = 10 mm on paper
const OX = 22, OY = 34;       // sheet position of plot NW corner
const CUT = 1.2;              // plan cut height: openings with sill above this are shown dashed
const P = house.plot;

const X = x => OX + (x - P.x0) * S;
const Y = y => OY + (P.y1 - y) * S;
const f = n => +n.toFixed(2);
const pt = ([x, y]) => `${f(X(x))},${f(Y(y))}`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const INK = '#1b1b19', MID = '#5c5b57', FAINT = '#9a9891', ACCENT = '#9c4a2b';

function poly(points, attrs = '') {
  return `<polygon points="${points.map(pt).join(' ')}" ${attrs}/>`;
}
function line(a, b, attrs = '') {
  return `<line x1="${f(X(a[0]))}" y1="${f(Y(a[1]))}" x2="${f(X(b[0]))}" y2="${f(Y(b[1]))}" ${attrs}/>`;
}
function rectM([x0, y0, x1, y1], attrs = '') {
  return `<rect x="${f(X(x0))}" y="${f(Y(y1))}" width="${f((x1 - x0) * S)}" height="${f((y1 - y0) * S)}" ${attrs}/>`;
}
function text(x, y, str, attrs = '') {
  return `<text x="${f(x)}" y="${f(y)}" ${attrs}>${esc(str)}</text>`;
}
function polyline(pts, attrs = '') {
  return `<polyline points="${pts.map(pt).join(' ')}" fill="none" ${attrs}/>`;
}

// Point on a wall: distance u along a->b, offset v along the left normal
function wp(w, v, u, off) {
  return [w.a[0] + v.dx * u + v.nx * off, w.a[1] + v.dy * u + v.ny * off];
}

// ---------- defs: hatch patterns ----------
function defs() {
  return `<defs>
    <pattern id="p-terracotta" patternUnits="userSpaceOnUse" width="3" height="3">
      <rect width="3" height="3" fill="#f6ebe2"/><path d="M0 0H3M0 0V3" stroke="#d7b29a" stroke-width="0.15"/></pattern>
    <pattern id="p-tile" patternUnits="userSpaceOnUse" width="6" height="6">
      <rect width="6" height="6" fill="#f3f5f5"/><path d="M0 0H6M0 0V6" stroke="#cdd3d4" stroke-width="0.12"/></pattern>
    <pattern id="p-stone" patternUnits="userSpaceOnUse" width="6" height="3">
      <rect width="6" height="3" fill="#f2f1ee"/><path d="M0 0H6M0 0V3" stroke="#d6d2ca" stroke-width="0.12"/></pattern>
    <pattern id="p-timber" patternUnits="userSpaceOnUse" width="12" height="1.4">
      <rect width="12" height="1.4" fill="#faf5ee"/><path d="M0 0H12M5 0V1.4" stroke="#e6d8c4" stroke-width="0.1"/></pattern>
    <pattern id="p-cement" patternUnits="userSpaceOnUse" width="12" height="12">
      <rect width="12" height="12" fill="#fbfaf8"/></pattern>
    <pattern id="p-grass" patternUnits="userSpaceOnUse" width="4" height="4">
      <rect width="4" height="4" fill="#eef3e7"/><path d="M1 2.2l.3-.8.3.8M3 4l.3-.8.3.8" stroke="#bccdaa" stroke-width="0.12" fill="none"/></pattern>
    <pattern id="p-pebble" patternUnits="userSpaceOnUse" width="2.4" height="2.4">
      <rect width="2.4" height="2.4" fill="#f1efe9"/><circle cx="0.6" cy="0.7" r="0.32" fill="none" stroke="#c4bfb3" stroke-width="0.1"/>
      <circle cx="1.8" cy="1.7" r="0.26" fill="none" stroke="#c4bfb3" stroke-width="0.1"/></pattern>
    <pattern id="p-paver" patternUnits="userSpaceOnUse" width="4" height="4">
      <rect width="4" height="4" fill="#e9eee2"/><rect x="0.4" y="0.4" width="3.2" height="3.2" fill="#f4f2ed" stroke="#c9c5bb" stroke-width="0.1"/></pattern>
    <pattern id="p-gravel" patternUnits="userSpaceOnUse" width="2" height="2">
      <rect width="2" height="2" fill="#f2f0eb"/><circle cx="0.5" cy="0.5" r="0.12" fill="#c9c3b7"/><circle cx="1.5" cy="1.4" r="0.1" fill="#c9c3b7"/></pattern>
    <pattern id="p-road" patternUnits="userSpaceOnUse" width="2" height="2">
      <rect width="2" height="2" fill="#e4e3df"/><circle cx="1" cy="1" r="0.1" fill="#c8c6c0"/></pattern>
    <pattern id="p-laterite" patternUnits="userSpaceOnUse" width="1.2" height="1.2" patternTransform="rotate(45)">
      <rect width="1.2" height="1.2" fill="#ece4dc"/><path d="M0 0V1.2" stroke="#a88d78" stroke-width="0.18"/></pattern>
    <pattern id="p-water" patternUnits="userSpaceOnUse" width="6" height="3">
      <rect width="6" height="3" fill="#dcecef"/><path d="M0.5 1.5q1 -0.6 2 0t2 0" stroke="#9cc1ca" stroke-width="0.15" fill="none"/></pattern>
  </defs>`;
}

const FINISH_FILL = {
  cement: 'url(#p-cement)', timber: 'url(#p-timber)', stone: 'url(#p-stone)', tile: 'url(#p-tile)',
  terracotta: 'url(#p-terracotta)', pebble: 'url(#p-pebble)',
};

// ---------- site & landscape ----------
function treePath(t) {
  const n = 28, pts = [];
  const seed = t.x * 13.7 + t.y * 7.3;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = t.r * (1 + 0.07 * Math.sin(a * 5 + seed) + 0.04 * Math.sin(a * 11 + seed * 2));
    pts.push([t.x + Math.cos(a) * r, t.y + Math.sin(a) * r]);
  }
  return pts;
}

function drawTree(t) {
  const out = [];
  if (t.kind === 'palm') {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const tip = [t.x + Math.cos(a) * t.r, t.y + Math.sin(a) * t.r];
      const mid = [t.x + Math.cos(a + 0.25) * t.r * 0.55, t.y + Math.sin(a + 0.25) * t.r * 0.55];
      out.push(`<path d="M${pt([t.x, t.y])} Q${pt(mid)} ${pt(tip)}" stroke="#6e8f5a" stroke-width="0.25" fill="none"/>`);
    }
    out.push(`<circle cx="${f(X(t.x))}" cy="${f(Y(t.y))}" r="1.2" fill="#fff" stroke="#6e8f5a" stroke-width="0.25"/>`);
  } else if (t.kind === 'bamboo') {
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, r = t.r * (0.25 + (i % 3) * 0.25);
      out.push(`<circle cx="${f(X(t.x + Math.cos(a) * r))}" cy="${f(Y(t.y + Math.sin(a) * r))}" r="1.1" fill="rgba(120,155,95,0.18)" stroke="#7d9a68" stroke-width="0.18"/>`);
    }
  } else {
    out.push(poly(treePath(t), `fill="rgba(110,150,90,0.13)" stroke="#6e8f5a" stroke-width="0.28" stroke-linejoin="round"`));
    out.push(`<circle cx="${f(X(t.x))}" cy="${f(Y(t.y))}" r="0.9" fill="none" stroke="#6e8f5a" stroke-width="0.25"/>`);
    out.push(`<path d="M${f(X(t.x) - 1.6)} ${f(Y(t.y))}H${f(X(t.x) + 1.6)}M${f(X(t.x))} ${f(Y(t.y) - 1.6)}V${f(Y(t.y) + 1.6)}" stroke="#6e8f5a" stroke-width="0.18"/>`);
  }
  return out.join('');
}

function site() {
  const L = house.landscape, out = [];
  // Road
  out.push(`<rect x="${X(P.x1)}" y="${Y(P.y1) - 6}" width="14" height="${(P.y1 - P.y0) * S + 12}" fill="url(#p-road)"/>`);
  out.push(text(X(P.x1) + 7, (Y(P.y1) + Y(P.y0)) / 2, 'ACCESS ROAD', `transform="rotate(90 ${X(P.x1) + 7} ${(Y(P.y1) + Y(P.y0)) / 2})" class="t-site" text-anchor="middle"`));
  // Lawn
  out.push(rectM([P.x0, P.y0, P.x1, P.y1], 'fill="url(#p-grass)"'));
  // Service yard (west)
  out.push(rectM([P.x0 + 0.2, 4.0, -0.115, 11.5], 'fill="url(#p-gravel)"'));
  out.push(text(X(-1.55), Y(6.2), 'SERVICE', 'class="t-site" text-anchor="middle"'));
  out.push(text(X(-1.55), Y(6.2) + 2.6, 'YARD', 'class="t-site" text-anchor="middle"'));
  // Driveway and path
  out.push(rectM(L.driveway, 'fill="url(#p-paver)" stroke="#bdb8ad" stroke-width="0.2"'));
  for (let x = 15.3; x < 21.8; x += 0.9) out.push(rectM([x, 5.65, x + 0.6, 6.35], 'fill="#f4f2ed" stroke="#a9a49a" stroke-width="0.18"'));
  // Carport pergola
  const c = L.carport.rect;
  out.push(rectM(c, `fill="none" stroke="${MID}" stroke-width="0.25" stroke-dasharray="2 1"`));
  for (let x = c[0] + 0.4; x < c[2]; x += 0.6) out.push(line([x, c[1]], [x, c[3]], `stroke="${FAINT}" stroke-width="0.12"`));
  for (const [x, y] of [[c[0] + 0.15, c[1] + 0.15], [c[2] - 0.15, c[1] + 0.15], [c[0] + 0.15, c[3] - 0.15], [c[2] - 0.15, c[3] - 0.15]])
    out.push(rectM([x - 0.1, y - 0.1, x + 0.1, y + 0.1], `fill="${INK}"`));
  // Car outline
  const car = [17.0, 8.95, 21.4 - 0.2 - 0.05, 10.65];
  out.push(`<rect x="${X(car[0])}" y="${Y(car[3])}" width="${(car[2] - car[0]) * S}" height="${(car[3] - car[1]) * S}" rx="3" fill="none" stroke="${FAINT}" stroke-width="0.2"/>`);
  out.push(line([18.0, 9.0], [18.0, 10.6], `stroke="${FAINT}" stroke-width="0.15"`));
  out.push(line([20.1, 9.0], [20.1, 10.6], `stroke="${FAINT}" stroke-width="0.15"`));
  out.push(text(X((c[0] + c[2]) / 2), Y(c[3]) - 1.4, 'CARPORT · SOLAR PERGOLA · EV', 'class="t-site" text-anchor="middle"'));
  // Rainwater tank
  out.push(`<circle cx="${X(L.tank.x)}" cy="${Y(L.tank.y)}" r="${L.tank.r * S}" fill="#fff" stroke="${MID}" stroke-width="0.25"/>`);
  out.push(text(X(L.tank.x), Y(L.tank.y) + 0.8, 'RWH', 'class="t-tiny" text-anchor="middle"'));
  out.push(text(X(L.tank.x), Y(L.tank.y) + 3.1, '5000 L', 'class="t-tiny" text-anchor="middle"'));
  // Plot boundary wall (with gate and drive openings on the road side)
  const bw = 0.2, g = L.gate, d = L.driveway;
  const seg = (a, b) => out.push(`<rect x="${f(Math.min(X(a[0]), X(b[0])) - bw * S / 2)}" y="${f(Math.min(Y(a[1]), Y(b[1])) - bw * S / 2)}" width="${f(Math.abs(X(b[0]) - X(a[0])) + bw * S)}" height="${f(Math.abs(Y(b[1]) - Y(a[1])) + bw * S)}" fill="url(#p-laterite)" stroke="${MID}" stroke-width="0.15"/>`);
  seg([P.x0, P.y0], [P.x1, P.y0]);
  seg([P.x0, P.y1], [P.x1, P.y1]);
  seg([P.x0, P.y0], [P.x0, P.y1]);
  seg([P.x1, P.y0], [P.x1, g.y0]);
  seg([P.x1, g.y1], [P.x1, d[1]]);
  seg([P.x1, d[3]], [P.x1, P.y1]);
  // Gate leaves
  out.push(line([P.x1, g.y0], [P.x1 - 0.55, g.y0 + 0.2], `stroke="${INK}" stroke-width="0.3"`));
  out.push(line([P.x1, g.y1], [P.x1 - 0.55, g.y1 - 0.2], `stroke="${INK}" stroke-width="0.3"`));
  out.push(text(X(P.x1) + 1.6, Y((g.y0 + g.y1) / 2) + 0.8, 'GATE', 'class="t-tiny"'));
  // Boundary line (dash-dot)
  out.push(rectM([P.x0, P.y0, P.x1, P.y1], `fill="none" stroke="${ACCENT}" stroke-width="0.3" stroke-dasharray="6 1.2 1 1.2"`));
  return out.join('');
}

function landscapeOverlay() {
  return [...house.landscape.trees, house.courtyard.tree].map(drawTree).join('');
}

// ---------- floors ----------
function floors() {
  const out = [];
  for (const o of house.outdoor) out.push(rectM(o.rect, `fill="${FINISH_FILL[o.finish]}"`));
  // verandah / porch edge (step line)
  out.push(line([2.6, -2.4], [13.2, -2.4], `stroke="${MID}" stroke-width="0.25"`));
  out.push(line([2.6, -2.55], [13.2, -2.55], `stroke="${FAINT}" stroke-width="0.15"`));
  out.push(line([15.0, 4.6], [15.0, 7.4], `stroke="${MID}" stroke-width="0.25"`));
  for (let i = 1; i <= 2; i++) out.push(line([15.0 + i * 0.3, 4.9], [15.0 + i * 0.3, 7.1], `stroke="${FAINT}" stroke-width="0.15"`));
  for (const r of house.rooms) out.push(rectM(r.rect, `fill="${FINISH_FILL[r.finish]}"`));
  // Courtyard
  const c = house.courtyard;
  out.push(rectM(c.rect, 'fill="url(#p-pebble)"'));
  out.push(rectM(c.pond, `fill="url(#p-water)" stroke="#6a9aa6" stroke-width="0.25"`));
  for (const [x, y] of [[4.85, 4.7], [5.05, 5.35], [4.8, 6.4]]) out.push(rectM([x - 0.25, y - 0.2, x + 0.25, y + 0.2], `fill="#fff" stroke="${FAINT}" stroke-width="0.15"`));
  return out.join('');
}

// ---------- furniture ----------
function furnitureItem(it) {
  const [x0, y0, x1, y1] = it.rect, w = x1 - x0, d = y1 - y0;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const st = `fill="#fff" stroke="${MID}" stroke-width="0.18"`;
  const lt = `stroke="${FAINT}" stroke-width="0.14" fill="none"`;
  const out = [];
  const R = (r, a = st) => out.push(rectM(r, a));
  const label = s => out.push(text(X(cx), Y(cy) + 0.6, s, 'class="t-furn" text-anchor="middle"'));
  switch (it.type) {
    case 'bed': {
      R(it.rect);
      R([x0 + 0.08, y0 + 0.1, x0 + 0.45, cy - 0.05], lt);
      R([x0 + 0.08, cy + 0.05, x0 + 0.45, y1 - 0.1], lt);
      out.push(polyline([[x0 + 0.65, y0], [x0 + 0.65, y1]], lt));
      out.push(polyline([[x0 + 0.65, y0], [x0 + 0.95, y1]], lt));
      break;
    }
    case 'daybed': R(it.rect); R([x0 + 0.08, y0 + 0.08, x1 - 0.08, y0 + 0.45], lt); break;
    case 'sofa':
      R(it.rect); R([x0 + 0.2, y0, x1 - 0.2, y1 - 0.22], lt);
      out.push(polyline([[cx, y0], [cx, y1 - 0.22]], lt)); break;
    case 'armchair': case 'chair': case 'side':
      out.push(`<rect x="${X(x0)}" y="${Y(y1)}" width="${w * S}" height="${d * S}" rx="1" ${st}/>`); break;
    case 'shower':
      R(it.rect, `fill="none" stroke="${MID}" stroke-width="0.18"`);
      out.push(polyline([[x0, y0], [x1, y1]], lt)); out.push(polyline([[x0, y1], [x1, y0]], lt));
      out.push(`<circle cx="${X(cx)}" cy="${Y(cy)}" r="0.7" ${st}/>`); break;
    case 'wc': {
      const alongX = w >= d;
      if (alongX) {
        R([x0, y0 + 0.02, x0 + 0.2, y1 - 0.02]);
        out.push(`<ellipse cx="${X(x0 + 0.2 + (w - 0.2) / 2)}" cy="${Y(cy)}" rx="${(w - 0.2) / 2 * S}" ry="${d / 2 * S * 0.85}" ${st}/>`);
      } else {
        R([x0 + 0.02, y0, x1 - 0.02, y0 + 0.2]);
        out.push(`<ellipse cx="${X(cx)}" cy="${Y(y0 + 0.2 + (d - 0.2) / 2)}" rx="${w / 2 * S * 0.85}" ry="${(d - 0.2) / 2 * S}" ${st}/>`);
      }
      break;
    }
    case 'vanity': case 'basin':
      R(it.rect);
      out.push(`<ellipse cx="${X(cx)}" cy="${Y(cy)}" rx="${Math.min(w, d) * 0.32 * S}" ry="${Math.min(w, d) * 0.28 * S}" ${lt}/>`);
      if (it.type === 'vanity' && d > 0.8) out.push(`<ellipse cx="${X(cx)}" cy="${Y(y0 + d * 0.25)}" rx="${w * 0.3 * S}" ry="${w * 0.26 * S}" ${lt}/>`);
      break;
    case 'wardrobe':
      R(it.rect); out.push(polyline([[x0 + 0.05, cy], [x1 - 0.05, cy]], lt));
      for (let x = x0 + 0.15; x < x1 - 0.1; x += 0.22) out.push(polyline([[x, cy - 0.12], [x + 0.06, cy + 0.12]], lt));
      break;
    case 'washer':
      R(it.rect); out.push(`<circle cx="${X(cx)}" cy="${Y(cy)}" r="${Math.min(w, d) * 0.32 * S}" ${lt}/>`); break;
    case 'sink':
      R(it.rect); out.push(`<rect x="${X(x0 + 0.08)}" y="${Y(y1 - 0.08)}" width="${(w - 0.16) * S}" height="${(d - 0.16) * S}" rx="0.8" ${lt}/>`); break;
    case 'counter': {
      R(it.rect);
      const [sx0, sy0, sx1, sy1] = it.sink;
      out.push(`<rect x="${X(sx0 + 0.05)}" y="${Y(sy1)}" width="${(sx1 - sx0 - 0.1) * S}" height="${(sy1 - sy0) * S}" rx="0.8" ${lt}/>`);
      // hob
      for (const yy of [2.85, 3.2]) for (const xx of [12.62, 12.9]) out.push(`<circle cx="${X(xx)}" cy="${Y(yy)}" r="1" ${lt}/>`);
      break;
    }
    case 'dtable': {
      R(it.rect);
      const perSide = it.seats / 2, cw = 0.45;
      for (let i = 0; i < perSide; i++) {
        const x = x0 + (w / perSide) * (i + 0.5);
        out.push(`<rect x="${X(x - cw / 2)}" y="${Y(y1 + 0.1 + cw)}" width="${cw * S}" height="${cw * S}" rx="0.8" ${st}/>`);
        out.push(`<rect x="${X(x - cw / 2)}" y="${Y(y0 - 0.1)}" width="${cw * S}" height="${cw * S}" rx="0.8" ${st}/>`);
      }
      break;
    }
    case 'easel':
      out.push(poly([[cx, y1], [x0, y0], [x1, y0]], `fill="none" stroke="${MID}" stroke-width="0.18"`));
      out.push(polyline([[cx, y1], [cx, y0 - 0.1]], lt)); break;
    case 'backdrop':
      R(it.rect, `fill="none" stroke="${FAINT}" stroke-width="0.18" stroke-dasharray="1.2 0.8"`);
      out.push(polyline([[x1 - 0.06, y0 + 0.1], [x1 - 0.06, y1 - 0.1]], `stroke="${MID}" stroke-width="0.4"`));
      label(it.label); break;
    case 'bench':
      R(it.rect);
      if (w > d) for (let x = x0 + 0.2; x < x1; x += 0.2) out.push(polyline([[x, y0], [x, y1]], lt));
      else for (let y = y0 + 0.2; y < y1; y += 0.2) out.push(polyline([[x0, y], [x1, y]], lt));
      break;
    case 'screen':
      for (let y = y0; y <= y1 + 1e-6; y += 0.1) out.push(rectM([x0, y, x1, y + 0.04], `fill="${MID}"`));
      break;
    case 'rug':
      R(it.rect, `fill="none" stroke="${FAINT}" stroke-width="0.14" stroke-dasharray="0.6 0.6"`); break;
    case 'lounger':
      out.push(`<rect x="${X(x0)}" y="${Y(y1)}" width="${w * S}" height="${d * S}" rx="1.2" ${st}/>`);
      out.push(polyline([[x0, y1 - 0.5], [x1, y1 - 0.5]], lt)); break;
    case 'rack': case 'drycab': case 'flatfile': case 'shelf': case 'tall':
      R(it.rect); out.push(polyline([[x0, y0], [x1, y1]], lt));
      if (it.type !== 'flatfile' && it.type !== 'shelf') out.push(polyline([[x0, y1], [x1, y0]], lt));
      break;
    default: // desk, table, island, ctable
      R(it.rect);
      if (it.type === 'ctable') R([x0 + 0.08, y0 + 0.08, x1 - 0.08, y1 - 0.08], lt);
  }
  if (it.label && it.type !== 'backdrop') {
    const vertical = d > w * 1.6;
    if (vertical) out.push(text(X(cx) + 0.6, Y(cy), it.label, `class="t-furn" text-anchor="middle" transform="rotate(-90 ${f(X(cx) + 0.6)} ${f(Y(cy))})"`));
    else if (it.type !== 'bed') label(it.label);
  }
  return out.join('');
}

// ---------- walls & openings ----------
function wallsAndOpenings() {
  const solid = [], symbols = [], high = [];
  for (const w of house.walls) {
    const v = wallVec(w), t = w.t, half = t / 2, L = v.len;
    const ops = house.openings.filter(o => o.wall === w.id).sort((a, b) => a.o - b.o);
    const cutOps = ops.filter(o => (o.sill ?? 0) < CUT);
    const fill = w.kind === 'garden' ? 'url(#p-laterite)' : w.kind === 'screen' ? '#fff' : INK;
    const stroke = w.kind === 'ext' || w.kind === 'int' ? '' : `stroke="${MID}" stroke-width="0.18"`;
    let u = -half;
    const pieces = [];
    for (const o of cutOps) { pieces.push([u, o.o]); u = o.o + o.w; }
    pieces.push([u, L + half]);
    for (const [u0, u1] of pieces) {
      if (u1 - u0 <= 1e-6) continue;
      solid.push(poly([wp(w, v, u0, -half), wp(w, v, u1, -half), wp(w, v, u1, half), wp(w, v, u0, half)], `fill="${fill}" ${stroke}`));
    }
    if (w.kind === 'screen') for (let s = 0.1; s < L; s += 0.15) solid.push(line(wp(w, v, s, -half), wp(w, v, s, half), `stroke="${MID}" stroke-width="0.15"`));

    for (const o of ops) {
      const u0 = o.o, u1 = o.o + o.w;
      const jamb = uu => line(wp(w, v, uu, -half), wp(w, v, uu, half), `stroke="${INK}" stroke-width="0.2"`);
      if ((o.sill ?? 0) >= CUT) {
        // High-level window above the cut plane: dashed outline
        high.push(line(wp(w, v, u0, 0), wp(w, v, u1, 0), `stroke="#fff" stroke-width="0.35" stroke-dasharray="1 0.7"`));
        if (o.type === 'clerestory') {
          const out = wp(w, v, (u0 + u1) / 2, -half - 0.32);
          high.push(line(wp(w, v, u0, -half - 0.18), wp(w, v, u1, -half - 0.18), `stroke="${MID}" stroke-width="0.18" stroke-dasharray="1.6 0.8"`));
          high.push(text(X(out[0]), Y(out[1]) - 0.4, 'NORTH-LIGHT CLERESTORY OVER (SILL +2.55)', 'class="t-tiny" text-anchor="middle"'));
        } else {
          // Label on the side facing away from the house centre
          const pa = wp(w, v, (u0 + u1) / 2, half + 0.25), pb = wp(w, v, (u0 + u1) / 2, -half - 0.25);
          const d = p => Math.hypot(p[0] - 6.6, p[1] - 5.8);
          const lp = d(pa) > d(pb) ? pa : pb;
          high.push(text(X(lp[0]), Y(lp[1]) + 0.7, 'HL', 'class="t-tiny" text-anchor="middle"'));
        }
        continue;
      }
      symbols.push(jamb(u0), jamb(u1));
      if (o.type === 'window' || o.type === 'louvre') {
        symbols.push(line(wp(w, v, u0, -half), wp(w, v, u1, -half), `stroke="${INK}" stroke-width="0.15"`));
        symbols.push(line(wp(w, v, u0, half), wp(w, v, u1, half), `stroke="${INK}" stroke-width="0.15"`));
        symbols.push(line(wp(w, v, u0, -0.025), wp(w, v, u1, -0.025), `stroke="${INK}" stroke-width="0.12"`));
        symbols.push(line(wp(w, v, u0, 0.025), wp(w, v, u1, 0.025), `stroke="${INK}" stroke-width="0.12"`));
        if (o.type === 'louvre') for (let s = u0 + 0.12; s < u1 - 0.05; s += 0.12)
          symbols.push(line(wp(w, v, s, -half * 0.8), wp(w, v, s + 0.06, half * 0.8), `stroke="${MID}" stroke-width="0.1"`));
      } else if (o.type === 'slide') {
        const pw = o.w * 0.53;
        symbols.push(poly([wp(w, v, u0, 0.01), wp(w, v, u0 + pw, 0.01), wp(w, v, u0 + pw, 0.05), wp(w, v, u0, 0.05)], `fill="#fff" stroke="${INK}" stroke-width="0.15"`));
        symbols.push(poly([wp(w, v, u1 - pw, -0.05), wp(w, v, u1, -0.05), wp(w, v, u1, -0.01), wp(w, v, u1 - pw, -0.01)], `fill="#fff" stroke="${INK}" stroke-width="0.15"`));
      } else if (o.type === 'pocket') {
        symbols.push(line(wp(w, v, u0, 0), wp(w, v, u1, 0), `stroke="${INK}" stroke-width="0.25"`));
        symbols.push(line(wp(w, v, u0 - o.w, 0), wp(w, v, u0, 0), `stroke="${MID}" stroke-width="0.2" stroke-dasharray="0.8 0.5"`));
      } else {
        // Hinged / pivot door: leaf + swing arc, drawn from the face on the swing side
        const s = o.side, hu = o.hinge === 'a' ? u0 : u1, fu = o.hinge === 'a' ? u1 : u0;
        const face = s * half;
        const hinge = wp(w, v, hu, face);
        const leafEnd = wp(w, v, hu, face + s * o.w);
        const arc = [];
        for (let i = 0; i <= 16; i++) {
          const a = (i / 16) * Math.PI / 2;
          const along = (fu - hu) * Math.sin(a), off = s * o.w * Math.cos(a);
          arc.push(wp(w, v, hu + along, face + off));
        }
        symbols.push(polyline(arc, `stroke="${MID}" stroke-width="0.14"`));
        symbols.push(line(hinge, leafEnd, `stroke="${INK}" stroke-width="${o.type === 'pivot' ? 0.6 : 0.35}"`));
      }
    }
  }
  return solid.join('') + symbols.join('') + high.join('');
}

function columns() {
  return house.columns.map(([x, y]) => rectM([x - 0.1, y - 0.1, x + 0.1, y + 0.1], `fill="${INK}"`)).join('');
}

// ---------- roof lines ----------
function roofLines() {
  const out = [], dash = `fill="none" stroke="${MID}" stroke-width="0.2" stroke-dasharray="3 1.2"`;
  for (const r of house.roofs) {
    const [x0, y0, x1, y1] = r.rect;
    if (r.type === 'hip') {
      out.push(rectM(r.rect, dash));
      const half = Math.min(x1 - x0, y1 - y0) / 2, ym = (y0 + y1) / 2;
      const hd = `stroke="${FAINT}" stroke-width="0.16" stroke-dasharray="4 1 0.6 1"`;
      out.push(line([x0 + half, ym], [x1 - half, ym], hd));
      out.push(line([x0, y0], [x0 + half, ym], hd), line([x0, y1], [x0 + half, ym], hd));
      out.push(line([x1, y0], [x1 - half, ym], hd), line([x1, y1], [x1 - half, ym], hd));
    } else if (r.id === 'P1') {
      out.push(rectM(r.rect, dash));
    }
  }
  out.push(text(X(2.9), Y(-3.0) + 2.6, 'ROOF OVER · CLAY TILE 25° · DEEP EAVES', 'class="t-tiny"'));
  // Rain chains
  for (const [x, y] of house.courtyard.rainChains) out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="0.55" fill="#fff" stroke="${ACCENT}" stroke-width="0.2"/>`);
  return out.join('');
}

// ---------- labels ----------
function roomLabels() {
  const out = [];
  for (const r of house.rooms) {
    const c = clearRect(r.rect);
    const [lx, ly] = r.label || [(c[0] + c[2]) / 2, (c[1] + c[3]) / 2];
    const a = (c[2] - c[0]) * (c[3] - c[1]);
    const dims = `${(c[2] - c[0]).toFixed(2)} × ${(c[3] - c[1]).toFixed(2)}`;
    let yy = Y(ly) - (r.sub ? 2.2 : 1.2);
    const small = (c[2] - c[0]) < 3.1;
    out.push(text(X(lx), yy, r.name.toUpperCase(), `class="${small ? 't-room-s' : 't-room'}" text-anchor="middle"`));
    if (r.sub) { yy += 2.3; out.push(text(X(lx), yy, r.sub, 'class="t-sub" text-anchor="middle"')); }
    yy += 2.5;
    out.push(text(X(lx), yy, small ? `${a.toFixed(1)} m²` : `${a.toFixed(1)} m²  ·  ${dims}`, 'class="t-area" text-anchor="middle"'));
  }
  // Courtyard, outdoor
  const c = house.courtyard;
  out.push(text(X(5.45), Y(5.25), 'COURTYARD', 'class="t-room-s" text-anchor="middle"'));
  out.push(text(X(5.45), Y(5.25) + 2.1, 'open to sky', 'class="t-sub" text-anchor="middle"'));
  out.push(text(X(3.6), Y(5.9), 'POND', 'class="t-tiny" text-anchor="middle" fill="#4f7f8a"'));
  out.push(text(X(8.0), Y(-1.15), 'VERANDAH', 'class="t-room" text-anchor="middle"'));
  out.push(text(X(8.0), Y(-1.15) + 2.4, 'terracotta · deep eaves · outdoor living', 'class="t-sub" text-anchor="middle"'));
  out.push(text(X(1.3), Y(-1.0), 'GARDEN', 'class="t-room-s" text-anchor="middle"'));
  out.push(text(X(1.3), Y(-1.0) + 2.2, 'SHOWER COURT', 'class="t-room-s" text-anchor="middle"'));
  out.push(text(X(14.1), Y(6.0) + 0.7, 'PORCH', 'class="t-room-s" text-anchor="middle"'));
  // Entry arrow
  out.push(`<path d="M${X(17.6)} ${Y(6.0)}H${X(15.4)}" stroke="${ACCENT}" stroke-width="0.35" marker-end="url(#arrow)"/>`);
  out.push(text(X(18.9), Y(6.0) + 0.8, 'ENTRY', `class="t-sub" fill="${ACCENT}" text-anchor="middle"`));
  // Levels
  const lvl = (x, y, s) => out.push(`<g transform="translate(${f(X(x))} ${f(Y(y))})"><path d="M0 0l-1 -1.6h2z" fill="none" stroke="${INK}" stroke-width="0.18"/><line x1="0" y1="0" x2="7" y2="0" stroke="${INK}" stroke-width="0.15"/>${text(0.4, -0.5, s, 'class="t-tiny"')}</g>`);
  lvl(10.15, 0.45, 'FFL +0.450');
  lvl(5.0, 4.3, 'CY +0.150');
  lvl(14.2, -1.6, 'GL ±0.000');
  return out.join('');
}

// ---------- grid & dimensions ----------
function gridAndDims() {
  const out = [], g = house.grid;
  const bubbleY = 17, bubbleX = 14;
  const gl = `stroke="${FAINT}" stroke-width="0.14" stroke-dasharray="5 1 1 1"`;
  for (const gx of g.x) {
    out.push(`<line x1="${X(gx.v)}" y1="${bubbleY + 3.2}" x2="${X(gx.v)}" y2="${Y(11.6) - 1.5}" ${gl}/>`);
    out.push(`<circle cx="${X(gx.v)}" cy="${bubbleY}" r="3.2" fill="#fff" stroke="${INK}" stroke-width="0.25"/>`);
    out.push(text(X(gx.v), bubbleY + 1.1, gx.id, 'class="t-grid" text-anchor="middle"'));
  }
  for (const gy of g.y) {
    out.push(`<line x1="${bubbleX + 3.2}" y1="${Y(gy.v)}" x2="${X(0) - 1.5}" y2="${Y(gy.v)}" ${gl}/>`);
    out.push(`<circle cx="${bubbleX}" cy="${Y(gy.v)}" r="3.2" fill="#fff" stroke="${INK}" stroke-width="0.25"/>`);
    out.push(text(bubbleX, Y(gy.v) + 1.1, gy.id, 'class="t-grid" text-anchor="middle"'));
  }
  const tick = (x, y) => `<line x1="${f(x - 0.9)}" y1="${f(y + 0.9)}" x2="${f(x + 0.9)}" y2="${f(y - 0.9)}" stroke="${INK}" stroke-width="0.25"/>`;
  const hChain = (vals, y, labels) => {
    const xs = vals.map(X);
    out.push(`<line x1="${xs[0] - 1.5}" y1="${y}" x2="${xs[xs.length - 1] + 1.5}" y2="${y}" stroke="${INK}" stroke-width="0.15"/>`);
    xs.forEach(x => out.push(tick(x, y)));
    for (let i = 1; i < vals.length; i++)
      out.push(text((xs[i - 1] + xs[i]) / 2, y - 0.9, labels ? labels[i - 1] : Math.round((vals[i] - vals[i - 1]) * 1000), 'class="t-dim" text-anchor="middle"'));
  };
  const vChain = (vals, x, labels) => {
    const ys = vals.map(Y);
    out.push(`<line x1="${x}" y1="${ys[0] + 1.5}" x2="${x}" y2="${ys[ys.length - 1] - 1.5}" stroke="${INK}" stroke-width="0.15"/>`);
    ys.forEach(y => out.push(tick(x, y)));
    for (let i = 1; i < vals.length; i++) {
      const my = (ys[i - 1] + ys[i]) / 2;
      out.push(text(x - 0.9, my, labels ? labels[i - 1] : Math.round((vals[i] - vals[i - 1]) * 1000), `class="t-dim" text-anchor="middle" transform="rotate(-90 ${f(x - 0.9)} ${f(my)})"`));
    }
  };
  // Grid spacing chains (centrelines) + overall external dims
  hChain(g.x.map(a => a.v), 25.5);
  hChain([-0.115, 13.315], 30.5);
  vChain(g.y.map(a => a.v), 45.5);
  vChain([-0.115, 11.715], 40);
  // Plot dims
  hChain([P.x0, P.x1], Y(P.y0) + 6, ['PLOT 25 000']);
  // Setbacks (south garden and east front)
  hChain([13.315, P.x1], Y(-4.4), null);
  vChain([P.y0, -0.115], X(9.4), null);
  return out.join('');
}

// ---------- sheet furniture: north arrow, scale bar, notes, schedule, title block ----------
function northArrow(x, y) {
  return `<g transform="translate(${x} ${y})">
    <circle r="7" fill="none" stroke="${INK}" stroke-width="0.25"/>
    <path d="M0 -9 L3 4 L0 2 L-3 4 Z" fill="${INK}"/>
    <path d="M0 -9 L0 2 L3 4 Z" fill="#fff" stroke="${INK}" stroke-width="0.2"/>
    ${text(0, -10.5, 'N', 'class="t-grid" text-anchor="middle"')}
  </g>`;
}

function scaleBar(x, y) {
  const out = [`<g transform="translate(${x} ${y})">`];
  for (let i = 0; i < 5; i++) out.push(`<rect x="${i * 10}" y="0" width="10" height="2" fill="${i % 2 ? '#fff' : INK}" stroke="${INK}" stroke-width="0.2"/>`);
  for (let i = 0; i <= 5; i++) out.push(text(i * 10, 5.5, i, 'class="t-tiny" text-anchor="middle"'));
  out.push(text(53, 1.8, 'm', 'class="t-tiny"'));
  out.push(text(0, -2, 'SCALE 1:100 @ A3', 'class="t-label"'));
  out.push('</g>');
  return out.join('');
}

function legend(x, y) {
  const rows = [
    ['wall-ext', '230 brick wall, lime plaster'],
    ['wall-int', '115 internal wall'],
    ['laterite', 'Laterite garden wall'],
    ['window', 'Window / louvre (timber)'],
    ['slide', 'Sliding glazed door'],
    ['hl', 'High-level window (above cut)'],
    ['roof', 'Line of roof / eaves over'],
    ['chain', 'Rain chain to pond'],
  ];
  const out = [`<g transform="translate(${x} ${y})">`, text(0, 0, 'LEGEND', 'class="t-head"')];
  rows.forEach(([k, label], i) => {
    const yy = 5 + i * 4.6;
    let sym = '';
    if (k === 'wall-ext') sym = `<rect x="0" y="${yy - 1.6}" width="8" height="2.3" fill="${INK}"/>`;
    if (k === 'wall-int') sym = `<rect x="0" y="${yy - 1.0}" width="8" height="1.15" fill="${INK}"/>`;
    if (k === 'laterite') sym = `<rect x="0" y="${yy - 1.6}" width="8" height="2.3" fill="url(#p-laterite)" stroke="${MID}" stroke-width="0.15"/>`;
    if (k === 'window') sym = `<rect x="0" y="${yy - 1.6}" width="8" height="2.3" fill="#fff" stroke="${INK}" stroke-width="0.15"/><line x1="0" y1="${yy - 0.7}" x2="8" y2="${yy - 0.7}" stroke="${INK}" stroke-width="0.12"/><line x1="0" y1="${yy - 0.2}" x2="8" y2="${yy - 0.2}" stroke="${INK}" stroke-width="0.12"/>`;
    if (k === 'slide') sym = `<rect x="0" y="${yy - 1.0}" width="4.6" height="0.45" fill="#fff" stroke="${INK}" stroke-width="0.15"/><rect x="3.4" y="${yy - 0.4}" width="4.6" height="0.45" fill="#fff" stroke="${INK}" stroke-width="0.15"/>`;
    if (k === 'hl') sym = `<rect x="0" y="${yy - 1.6}" width="8" height="2.3" fill="${INK}"/><line x1="0" y1="${yy - 0.45}" x2="8" y2="${yy - 0.45}" stroke="#fff" stroke-width="0.35" stroke-dasharray="1 0.7"/>`;
    if (k === 'roof') sym = `<line x1="0" y1="${yy - 0.45}" x2="8" y2="${yy - 0.45}" stroke="${MID}" stroke-width="0.2" stroke-dasharray="3 1.2"/>`;
    if (k === 'chain') sym = `<circle cx="4" cy="${yy - 0.45}" r="0.55" fill="#fff" stroke="${ACCENT}" stroke-width="0.2"/>`;
    out.push(sym, text(11, yy + 0.4, label, 'class="t-label"'));
  });
  out.push('</g>');
  return out.join('');
}

function schedule(x, y, wTotal) {
  const s = areaSummary();
  const out = [`<g transform="translate(${x} ${y})">`, text(0, 0, 'ROOM SCHEDULE', 'class="t-head"')];
  const rowH = 3.7;
  out.push(`<line x1="0" y1="2" x2="${wTotal}" y2="2" stroke="${INK}" stroke-width="0.25"/>`);
  out.push(text(0, 5.2, 'NO.', 'class="t-th"'), text(9, 5.2, 'SPACE', 'class="t-th"'),
    text(wTotal - 18, 5.2, 'm²', 'class="t-th" text-anchor="end"'), text(wTotal, 5.2, 'sq ft', 'class="t-th" text-anchor="end"'));
  out.push(`<line x1="0" y1="6.6" x2="${wTotal}" y2="6.6" stroke="${INK}" stroke-width="0.12"/>`);
  s.rooms.forEach((r, i) => {
    const yy = 10 + i * rowH;
    out.push(text(0, yy, r.id.slice(1), 'class="t-td"'), text(9, yy, r.name, 'class="t-td"'),
      text(wTotal - 18, yy, r.area.toFixed(1), 'class="t-td" text-anchor="end"'),
      text(wTotal, yy, Math.round(r.area * M2_TO_SQFT), 'class="t-td" text-anchor="end"'));
  });
  let yy = 10 + s.rooms.length * rowH - 1.5;
  out.push(`<line x1="0" y1="${yy}" x2="${wTotal}" y2="${yy}" stroke="${INK}" stroke-width="0.12"/>`);
  const tot = [
    ['Usable floor area (carpet)', s.carpet],
    ['Gross built-up area', s.gross],
    ['Verandah · porch · shower court', s.outdoor],
    ['Open courtyard', s.courtyard],
  ];
  tot.forEach(([k, v], i) => {
    const y2 = yy + 3.8 + i * rowH;
    out.push(text(9, y2, k, `class="${i === 1 ? 't-td-b' : 't-td'}"`),
      text(wTotal - 18, y2, v.toFixed(1), `class="${i === 1 ? 't-td-b' : 't-td'}" text-anchor="end"`),
      text(wTotal, y2, Math.round(v * M2_TO_SQFT).toLocaleString('en'), `class="${i === 1 ? 't-td-b' : 't-td'}" text-anchor="end"`));
  });
  yy += 3.8 + tot.length * rowH;
  out.push(text(9, yy, `Plot 25 × 18 m = ${s.plot} m² (${s.perches.toFixed(1)} perches) · coverage ${Math.round(s.gross / s.plot * 100)}%`, 'class="t-label"'));
  out.push('</g>');
  return out.join('');
}

function notes(x, y) {
  const lines = [
    'Long axis E–W; service rooms shield the hot west.',
    'Studio lit by even north light + clerestory.',
    'Cross-ventilation on every room; vented eaves.',
    'Plinth +450 mm against flood, damp & termites.',
    'Clay-tile roofs at 25° shed monsoon rain;',
    '  gutters & rain chains feed pond and 5000 L tank.',
    'Solar PV + solar hot water on south roof slope.',
    'Sealed, dehumidified dry store for camera gear.',
  ];
  const out = [`<g transform="translate(${x} ${y})">`, text(0, 0, 'CLIMATE & DESIGN NOTES', 'class="t-head"')];
  lines.forEach((l, i) => out.push(text(0, 5 + i * 3.5, l, 'class="t-label"')));
  out.push('</g>');
  return out.join('');
}

function titleBlock(x, y, w, h) {
  const m = house.meta, out = [`<g transform="translate(${x} ${y})">`];
  out.push(`<rect width="${w}" height="${h}" fill="#fff" stroke="${INK}" stroke-width="0.35"/>`);
  out.push(`<rect width="${w}" height="16" fill="${INK}"/>`);
  out.push(text(4, 7.4, m.name.toUpperCase(), 'class="t-title"'));
  out.push(text(4, 12.6, m.subtitle, 'class="t-title-sub"'));
  const cell = (cx, cy, cw, label, value, cls = 't-val') => {
    out.push(`<rect x="${cx}" y="${cy}" width="${cw}" height="9" fill="none" stroke="${INK}" stroke-width="0.15"/>`);
    out.push(text(cx + 1.5, cy + 3, label, 'class="t-key"'), text(cx + 1.5, cy + 7.3, value, `class="${cls}"`));
  };
  const half = w / 2;
  cell(0, 16, w, 'DRAWING', 'GROUND FLOOR PLAN & SITE PLAN', 't-val-b');
  cell(0, 25, w, 'LOCATION', m.location);
  cell(0, 34, w, 'CLIENT', m.client);
  cell(0, 43, half, 'SCALE', m.scale);
  cell(half, 43, half, 'DATE', m.date);
  cell(0, 52, half, 'DRAWING NO.', m.drawingNo, 't-val-b');
  cell(half, 52, half, 'REVISION', m.revision);
  out.push(text(1.5, h - 2, m.architect.toUpperCase() + ' · CONCEPT DESIGN, NOT FOR CONSTRUCTION', 'class="t-key"'));
  out.push('</g>');
  return out.join('');
}

function styles() {
  return `<style>
    text { font-family: 'IBM Plex Sans', 'Segoe UI', Arial, sans-serif; fill: ${INK}; }
    .t-room { font-size: 2.5px; font-weight: 600; letter-spacing: 0.35px; }
    .t-room-s { font-size: 2.0px; font-weight: 600; letter-spacing: 0.25px; }
    .t-sub { font-size: 1.6px; fill: ${MID}; font-style: italic; }
    .t-area { font-size: 1.65px; fill: ${MID}; font-family: 'IBM Plex Mono', Consolas, monospace; }
    .t-furn { font-size: 1.25px; fill: ${FAINT}; letter-spacing: 0.15px; }
    .t-tiny { font-size: 1.45px; fill: ${MID}; }
    .t-site { font-size: 1.9px; fill: ${MID}; letter-spacing: 0.5px; }
    .t-grid { font-size: 3px; font-weight: 600; }
    .t-dim { font-size: 1.75px; font-family: 'IBM Plex Mono', Consolas, monospace; }
    .t-head { font-size: 2.6px; font-weight: 700; letter-spacing: 0.6px; }
    .t-label { font-size: 1.95px; fill: #333; }
    .t-th { font-size: 1.7px; font-weight: 700; letter-spacing: 0.3px; fill: ${MID}; }
    .t-td { font-size: 1.95px; }
    .t-td-b { font-size: 1.95px; font-weight: 700; }
    .t-title { font-size: 5px; font-weight: 700; letter-spacing: 1.4px; fill: #fff; }
    .t-title-sub { font-size: 2.2px; fill: #d9d6cf; letter-spacing: 0.3px; }
    .t-key { font-size: 1.45px; fill: ${MID}; letter-spacing: 0.35px; }
    .t-val { font-size: 2.1px; }
    .t-val-b { font-size: 2.3px; font-weight: 700; }
    .t-sheet { font-size: 3.6px; font-weight: 700; letter-spacing: 1px; }
  </style>`;
}

export function renderPlanSVG() {
  const right = 300, rw = SHEET.w - 10 - right;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SHEET.w} ${SHEET.h}" width="${SHEET.w}mm" height="${SHEET.h}mm" id="plan-svg">
    ${styles()}
    ${defs()}
    <marker id="arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L6 3L0 6z" fill="${ACCENT}"/></marker>
    <rect width="${SHEET.w}" height="${SHEET.h}" fill="#fff"/>
    <rect x="6" y="6" width="${SHEET.w - 12}" height="${SHEET.h - 12}" fill="none" stroke="${INK}" stroke-width="0.5"/>
    <line x1="${right - 4}" y1="6" x2="${right - 4}" y2="${SHEET.h - 6}" stroke="${INK}" stroke-width="0.25"/>
    <g id="drawing">
      ${site()}
      ${floors()}
      ${house.furniture.map(furnitureItem).join('')}
      ${wallsAndOpenings()}
      ${columns()}
      ${landscapeOverlay()}
      ${roofLines()}
      ${roomLabels()}
      ${gridAndDims()}
    </g>
    ${text(22, 236, 'GROUND FLOOR PLAN & SITE', 'class="t-sheet"')}
    ${text(22, 240.5, 'All dimensions in millimetres to wall centrelines unless noted. Levels in metres above natural ground.', 'class="t-label"')}
    ${northArrow(36, 258)}
    ${scaleBar(54, 256)}
    ${legend(140, 247)}
    ${notes(right, 120)}
    ${schedule(right, 16, rw)}
    ${titleBlock(right, 216, rw, 74)}
  </svg>`;
}

// Mount with simple pan/zoom
export function mountPlan(container) {
  container.innerHTML = renderPlanSVG();
  const svg = container.querySelector('svg');
  svg.removeAttribute('width'); svg.removeAttribute('height');
  let vb = { x: 0, y: 0, w: SHEET.w, h: SHEET.h };
  const apply = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const zoomAt = (factor, cx, cy) => {
    const nw = Math.min(SHEET.w * 1.2, Math.max(30, vb.w * factor));
    const k = nw / vb.w;
    vb = { x: cx - (cx - vb.x) * k, y: cy - (cy - vb.y) * k, w: nw, h: vb.h * k };
    apply();
  };
  const toSvg = (e) => {
    const r = svg.getBoundingClientRect();
    const scale = Math.max(vb.w / r.width, vb.h / r.height);
    const offX = (r.width * scale - vb.w) / 2, offY = (r.height * scale - vb.h) / 2;
    return [vb.x - offX + (e.clientX - r.left) * scale, vb.y - offY + (e.clientY - r.top) * scale, scale];
  };
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const [x, y] = toSvg(e);
    zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, x, y);
  }, { passive: false });
  let drag = null;
  svg.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, vb: { ...vb } }; svg.setPointerCapture(e.pointerId); svg.classList.add('dragging'); });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const [, , scale] = toSvg(e);
    vb.x = drag.vb.x - (e.clientX - drag.x) * scale;
    vb.y = drag.vb.y - (e.clientY - drag.y) * scale;
    apply();
  });
  const end = () => { drag = null; svg.classList.remove('dragging'); };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  return {
    zoomIn: () => zoomAt(1 / 1.3, vb.x + vb.w / 2, vb.y + vb.h / 2),
    zoomOut: () => zoomAt(1.3, vb.x + vb.w / 2, vb.y + vb.h / 2),
    fit: () => { vb = { x: 0, y: 0, w: SHEET.w, h: SHEET.h }; apply(); },
    svgText: () => renderPlanSVG(),
  };
}
