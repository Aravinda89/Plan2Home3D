// 3D model of Sisila House built from house.js with Three.js.
// Plan (x east, y north) maps to three.js (X = x, Y = up, Z = -y).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { house, wallVec, clearRect, sunPosition } from './house.js';

const FFL = house.levels.plinth;
const WALL_H = house.levels.wallH;
const CEIL = WALL_H;              // flat ceiling and soffit height above FFL
const DEG = Math.PI / 180;

// ---------- seeded random for stable landscape ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// ---------- canvas textures ----------
function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const TEX = {
  // 1 m × 1 m of clay roof tiles: 3 courses, 4 tiles across
  roof: () => canvasTex(256, (g, s) => {
    const r = rng(7);
    const course = s / 3, tile = s / 4;
    for (let row = 0; row < 3; row++) {
      for (let col = -1; col < 5; col++) {
        const x = col * tile + (row % 2) * tile / 2, y = row * course;
        const l = 38 + r() * 8, sat = 52 + r() * 10;
        const grad = g.createLinearGradient(0, y, 0, y + course);
        grad.addColorStop(0, `hsl(16 ${sat}% ${l - 14}%)`);
        grad.addColorStop(0.25, `hsl(16 ${sat}% ${l}%)`);
        grad.addColorStop(1, `hsl(18 ${sat}% ${l + 6}%)`);
        g.fillStyle = grad;
        g.fillRect(x + 1, y, tile - 2, course);
      }
      g.fillStyle = 'rgba(40,15,5,0.55)';
      g.fillRect(0, row * course, s, 3);
    }
  }),
  // 0.6 m of terracotta floor tiles (2 × 2 of 300 mm)
  terracotta: () => canvasTex(128, (g, s) => {
    const r = rng(3);
    g.fillStyle = '#8f5a3e'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle = `hsl(${18 + r() * 6} ${45 + r() * 10}% ${48 + r() * 6}%)`;
      g.fillRect(i * s / 2 + 1.5, j * s / 2 + 1.5, s / 2 - 3, s / 2 - 3);
    }
  }),
  // 4 m of lawn
  grass: () => canvasTex(256, (g, s) => {
    const r = rng(11);
    g.fillStyle = '#7f9c5a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `hsla(${80 + r() * 30} ${35 + r() * 25}% ${30 + r() * 25}% / 0.5)`;
      g.fillRect(r() * s, r() * s, 1.5, 3);
    }
  }),
  // 1.2 m of timber floor boards
  timber: () => canvasTex(256, (g, s) => {
    const r = rng(5), bw = s / 8;
    for (let i = 0; i < 8; i++) {
      g.fillStyle = `hsl(${28 + r() * 6} ${38 + r() * 8}% ${46 + r() * 8}%)`;
      g.fillRect(0, i * bw, s, bw - 1);
      g.fillStyle = 'rgba(60,35,15,0.25)';
      g.fillRect(r() * s, i * bw, 1.5, bw);
    }
  }),
  // 2 m of polished cement
  cement: () => canvasTex(256, (g, s) => {
    const r = rng(9);
    g.fillStyle = '#cbc7bf'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
      const x = r() * s, y = r() * s, rad = 10 + r() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${r() > 0.5 ? '255,255,250' : '150,145,135'},0.12)`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    }
  }),
  // 1.2 m of road / paving
  paver: () => canvasTex(128, (g, s) => {
    g.fillStyle = '#7c8a62'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#c9c4b8';
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) g.fillRect(i * s / 3 + 4, j * s / 3 + 4, s / 3 - 8, s / 3 - 8);
  }),
  pebble: () => canvasTex(128, (g, s) => {
    const r = rng(21);
    g.fillStyle = '#a9a294'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `hsl(${30 + r() * 20} ${8 + r() * 10}% ${55 + r() * 25}%)`;
      g.beginPath(); g.ellipse(r() * s, r() * s, 2 + r() * 3, 1.5 + r() * 2.5, r() * 3, 0, Math.PI * 2); g.fill();
    }
  }),
};

// ---------- materials ----------
function makeMaterials() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...o });
  const m = {
    plaster: std('#f2ede3', { roughness: 0.92 }),
    plinth: std('#6f6a63', { roughness: 0.95 }),
    laterite: std('#9a5b3f', { roughness: 1 }),
    timber: std('#5e3d27', { roughness: 0.7 }),
    timberLight: std('#c29a6b', { roughness: 0.65 }),
    fabric: std('#e3dccf', { roughness: 1 }),
    sage: std('#7a8a72', { roughness: 1 }),
    white: std('#f5f5f2', { roughness: 0.35 }),
    dark: std('#353532', { roughness: 0.6 }),
    rug: std('#c7b493', { roughness: 1 }),
    slab: std('#dcd8cf', { roughness: 0.9 }),
    ceiling: std('#f4f1ea', { roughness: 0.95 }),
    stone: std('#d9d4ca', { roughness: 0.6 }),
    tile: std('#e7e9e8', { roughness: 0.4 }),
    glass: new THREE.MeshStandardMaterial({ color: '#b9d3d8', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false }),
    water: new THREE.MeshStandardMaterial({ color: '#2c6670', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.9, emissive: '#0d2a30' }),
    leaf: std('#5d8746', { roughness: 0.9, flatShading: true }),
    leafDark: std('#3f6a35', { roughness: 0.9, flatShading: true }),
    leafLight: std('#7fa85a', { roughness: 0.9, flatShading: true }),
    bark: std('#5b4636', { roughness: 1 }),
    palmTrunk: std('#8a7a62', { roughness: 1 }),
    flower: std('#fff8e6', { roughness: 0.6, emissive: '#3a3020' }),
    road: std('#55534f', { roughness: 0.95 }),
    solar: new THREE.MeshStandardMaterial({ color: '#1d2a3c', roughness: 0.25, metalness: 0.5 }),
    gutter: std('#3d3b38', { roughness: 0.5, metalness: 0.3 }),
    car: new THREE.MeshStandardMaterial({ color: '#d7d9db', roughness: 0.3, metalness: 0.6 }),
  };
  const texMat = (key, color, o = {}) => {
    const map = TEX[key]();
    return { mat: new THREE.MeshStandardMaterial({ map, color, roughness: 0.85, ...o }), map };
  };
  m.roofT = texMat('roof', '#ffffff', { roughness: 0.8 });
  m.roofUnder = std('#b48a60', { roughness: 0.8, side: THREE.BackSide });
  m.terracottaT = texMat('terracotta', '#ffffff');
  m.grassT = texMat('grass', '#ffffff', { roughness: 1 });
  m.timberT = texMat('timber', '#ffffff', { roughness: 0.55 });
  m.cementT = texMat('cement', '#ffffff', { roughness: 0.45 });
  m.paverT = texMat('paver', '#ffffff', { roughness: 0.95 });
  m.pebbleT = texMat('pebble', '#ffffff', { roughness: 1 });
  return m;
}

// ---------- geometry helpers ----------
function box(parent, [x0, y0, x1, y1], z0, z1, mat, { cast = true, receive = true } = {}) {
  const g = new THREE.BoxGeometry(Math.max(x1 - x0, 1e-3), Math.max(z1 - z0, 1e-3), Math.max(y1 - y0, 1e-3));
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.set((x0 + x1) / 2, (z0 + z1) / 2, -(y0 + y1) / 2);
  mesh.castShadow = cast; mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

// Horizontal textured plane with UVs in world metres / tileSize
function plane(parent, [x0, y0, x1, y1], z, texMat, tileSize) {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + uv.getX(i) * (x1 - x0)) / tileSize, (y0 + uv.getY(i) * (y1 - y0)) / tileSize);
  const mesh = new THREE.Mesh(g, texMat.mat);
  mesh.position.set((x0 + x1) / 2, z, -(y0 + y1) / 2);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// Polygon (3D points in plan coords [x, y, z]) as triangles with up-facing normals
function polyMesh(points, uvFn, mat) {
  const pos = [], uvs = [];
  for (let i = 1; i < points.length - 1; i++) {
    let tri = [points[0], points[i], points[i + 1]];
    const v = tri.map(([x, y, z]) => new THREE.Vector3(x, z, -y));
    const n = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0]));
    if (n.y < 0) tri = [tri[0], tri[2], tri[1]];
    for (const p of tri) { pos.push(p[0], p[2], -p[1]); uvs.push(...uvFn(p)); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

// ---------- builders ----------
function buildGround(root, M) {
  const g = new THREE.Group(); g.name = 'Site';
  const P = house.plot;
  // Wider surroundings
  const outer = new THREE.Mesh(new THREE.CircleGeometry(140, 48), new THREE.MeshStandardMaterial({ color: '#6f8c50', roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.set(9, -0.02, -4); outer.receiveShadow = true;
  g.add(outer);
  plane(g, [P.x0, P.y0, P.x1, P.y1], 0, M.grassT, 4);
  // Road
  box(g, [P.x1 + 0.2, P.y0 - 30, P.x1 + 7.5, P.y1 + 30], -0.02, 0.01, M.road, { cast: false });
  // Driveway + path
  plane(g, house.landscape.driveway, 0.012, M.paverT, 1.2);
  for (let x = 15.3; x < 21.8; x += 0.9) box(g, [x, 5.65, x + 0.6, 6.35], 0, 0.04, M.stone);
  // Service yard gravel
  plane(g, [P.x0 + 0.2, 4.0, -0.115, 11.5], 0.01, M.pebbleT, 1.2);
  // Boundary wall with gate and drive openings
  const bw = 0.1, h = 1.5, gt = house.landscape.gate, d = house.landscape.driveway;
  const wall = r => box(g, r, 0, h, M.laterite);
  wall([P.x0 - bw, P.y0 - bw, P.x1 + bw, P.y0 + bw]);
  wall([P.x0 - bw, P.y1 - bw, P.x1 + bw, P.y1 + bw]);
  wall([P.x0 - bw, P.y0, P.x0 + bw, P.y1]);
  wall([P.x1 - bw, P.y0, P.x1 + bw, gt.y0]);
  wall([P.x1 - bw, gt.y1, P.x1 + bw, d[1]]);
  wall([P.x1 - bw, d[3], P.x1 + bw, P.y1]);
  // Rainwater tank
  const L = house.landscape;
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(L.tank.r, L.tank.r, 1.9, 28), M.slab);
  tank.position.set(L.tank.x, 0.95, -L.tank.y); tank.castShadow = tank.receiveShadow = true;
  g.add(tank);
  // Carport pergola with solar panels
  const c = L.carport.rect;
  for (const [x, y] of [[c[0] + 0.15, c[1] + 0.15], [c[2] - 0.15, c[1] + 0.15], [c[0] + 0.15, c[3] - 0.15], [c[2] - 0.15, c[3] - 0.15]])
    box(g, [x - 0.08, y - 0.08, x + 0.08, y + 0.08], 0, L.carport.h, M.timber);
  box(g, [c[0], c[1] + 0.07, c[2], c[1] + 0.23], L.carport.h - 0.25, L.carport.h, M.timber);
  box(g, [c[0], c[3] - 0.23, c[2], c[3] - 0.07], L.carport.h - 0.25, L.carport.h, M.timber);
  for (let x = c[0] + 0.3; x < c[2]; x += 1.1) box(g, [x, c[1] + 0.25, x + 1.05, c[3] - 0.25], L.carport.h + 0.02, L.carport.h + 0.06, M.solar);
  // Car
  const carG = new THREE.Group();
  box(carG, [17.0, 9.0, 21.0, 10.65], 0.25, 0.85, M.car);
  box(carG, [17.9, 9.1, 20.0, 10.55], 0.85, 1.35, M.glass);
  box(carG, [17.95, 9.15, 19.95, 10.5], 1.33, 1.38, M.car);
  for (const [x, y] of [[17.6, 9.0], [20.3, 9.0], [17.6, 10.65], [20.3, 10.65]]) {
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 18), M.dark);
    wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.32, -y); wh.castShadow = true;
    carG.add(wh);
  }
  g.add(carG);
  root.add(g);
}

function buildPlinth(root, M) {
  const g = new THREE.Group(); g.name = 'Plinth & floors';
  const court = clearRect(house.courtyard.rect);
  const top = FFL - 0.02;
  const pieces = [
    [-0.115, -0.115, 13.315, court[1]],
    [-0.115, court[1], court[0], court[3]],
    [court[2], court[1], 13.315, court[3]],
    [-0.115, court[3], 13.315, 11.715],
    [2.6, -2.4, 13.2, -0.115],                 // verandah
    [13.315, 4.6, 15.0, 7.4],                  // porch
  ];
  for (const p of pieces) box(g, p, 0, top, M.plinth);
  box(g, [0, -2.4, 2.6, -0.115], 0, FFL - 0.12, M.plinth);   // shower court
  plane(g, [0.1, -2.3, 2.5, -0.2], FFL - 0.119, M.pebbleT, 0.6);
  // Steps: verandah to garden, porch to path
  box(g, [6.4, -2.75, 9.8, -2.4], 0, FFL - 0.15, M.stone);
  box(g, [6.4, -3.1, 9.8, -2.75], 0, FFL - 0.3, M.stone);
  box(g, [15.0, 5.0, 15.35, 7.0], 0, FFL - 0.15, M.stone);
  box(g, [15.35, 5.0, 15.7, 7.0], 0, FFL - 0.3, M.stone);
  // Finished floors
  const finishMat = { cement: [M.cementT, 2], timber: [M.timberT, 1.2], stone: [M.stone], tile: [M.tile], terracotta: [M.terracottaT, 0.6] };
  for (const r of [...house.rooms, ...house.outdoor.filter(o => o.finish === 'terracotta')]) {
    const [mat, size] = finishMat[r.finish];
    if (size) plane(g, r.rect, FFL, mat, size);
    else box(g, r.rect, top, FFL, mat, { cast: false });
  }
  // Courtyard: sunken pebble floor, pond, stepping stones
  const cy = house.courtyard;
  const cz = FFL + house.levels.courtyard;
  box(g, court, 0, cz - 0.01, M.plinth, { cast: false });
  plane(g, court, cz, M.pebbleT, 0.6);
  const [px0, py0, px1, py1] = cy.pond;
  box(g, [px0 - 0.08, py0 - 0.08, px1 + 0.08, py1 + 0.08], cz, cz + 0.06, M.stone);
  const water = box(g, [px0, py0, px1, py1], cz, cz + 0.045, M.water, { cast: false });
  water.name = 'Pond';
  for (const [x, y] of [[4.85, 4.7], [5.05, 5.35], [4.8, 6.4]]) box(g, [x - 0.25, y - 0.2, x + 0.25, y + 0.2], cz, cz + 0.08, M.stone);
  root.add(g);
}

// Build a wall and its openings in a local frame: x = along wall, y = height above FFL, z = across thickness
function buildWalls(root, M) {
  const g = new THREE.Group(); g.name = 'Walls & openings';
  for (const w of house.walls) {
    const v = wallVec(w);
    const local = new THREE.Group();
    const isGarden = w.kind === 'garden' || w.kind === 'screen';
    const base = isGarden ? -FFL : -0.02;
    local.position.set(w.a[0], FFL, -w.a[1]);
    local.rotation.y = Math.atan2(v.dy, v.dx);   // +x plan stays +X; +y plan becomes -Z
    g.add(local);
    const H = w.h ?? WALL_H, half = w.t / 2, L = v.len;
    const mat = w.kind === 'garden' ? M.laterite : w.kind === 'screen' ? M.timber : M.plaster;
    const lbox = (u0, u1, y0, y1, z0, z1, m) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, y1 - y0, z1 - z0), m);
      mesh.position.set((u0 + u1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      mesh.castShadow = mesh.receiveShadow = true;
      local.add(mesh);
      return mesh;
    };
    if (w.kind === 'screen') {
      for (let u = 0.05; u < L; u += 0.12) lbox(u, u + 0.045, base, H, -half, half, M.timber);
      continue;
    }
    const ops = house.openings.filter(o => o.wall === w.id);
    const cuts = new Set([-half, L + half]);
    for (const o of ops) { cuts.add(o.o); cuts.add(o.o + o.w); }
    const us = [...cuts].sort((a, b) => a - b);
    for (let i = 0; i < us.length - 1; i++) {
      const u0 = us[i], u1 = us[i + 1];
      if (u1 - u0 < 1e-4) continue;
      const holes = ops.filter(o => o.o <= u0 + 1e-6 && o.o + o.w >= u1 - 1e-6)
        .map(o => [o.sill ?? 0, o.head]).sort((a, b) => a[0] - b[0]);
      let y = base;
      for (const [s, h] of holes) {
        const s0 = s <= 0 ? base : s;
        if (s0 > y + 1e-4) lbox(u0, u1, y, s0, -half, half, mat);
        y = Math.max(y, h);
      }
      if (H > y + 1e-4) lbox(u0, u1, y, H, -half, half, mat);
    }
    for (const o of ops) buildOpening(local, o, w, M, lbox);
  }
  root.add(g);
}

function buildOpening(local, o, w, M, lbox) {
  const u0 = o.o, u1 = o.o + o.w, s = o.sill ?? 0, h = o.head, fz = 0.04, fw = 0.05;
  const frame = (a0, a1, b0, b1) => {
    lbox(a0, a0 + fw, b0, b1, -fz, fz, M.timber);
    lbox(a1 - fw, a1, b0, b1, -fz, fz, M.timber);
    lbox(a0, a1, b1 - fw, b1, -fz, fz, M.timber);
    if (b0 > 0.01) lbox(a0, a1, b0, b0 + fw, -fz, fz, M.timber);
  };
  if (o.type === 'pocket') return;
  if (o.type === 'window' || o.type === 'clerestory') {
    frame(u0, u1, s, h);
    lbox(u0 + fw, u1 - fw, s + fw, h - fw, -0.006, 0.006, M.glass);
    const n = Math.max(1, Math.round(o.w / 1.1));
    for (let i = 1; i < n; i++) { const m = u0 + (o.w * i) / n; lbox(m - 0.025, m + 0.025, s, h, -fz, fz, M.timber); }
    return;
  }
  if (o.type === 'louvre') {
    frame(u0, u1, s, h);
    for (let y = s + 0.08; y < h - 0.05; y += 0.09) {
      const slat = lbox(u0 + fw, u1 - fw, y - 0.006, y + 0.006, -0.04, 0.04, M.timber);
      slat.rotation.x = 35 * DEG;
    }
    return;
  }
  if (o.type === 'slide') {
    const pw = o.w * 0.53;
    const panel = (a0, a1, z) => {
      lbox(a0, a0 + fw, 0, h, z - 0.02, z + 0.02, M.timber);
      lbox(a1 - fw, a1, 0, h, z - 0.02, z + 0.02, M.timber);
      lbox(a0, a1, h - fw, h, z - 0.02, z + 0.02, M.timber);
      lbox(a0, a1, 0, 0.08, z - 0.02, z + 0.02, M.timber);
      lbox(a0 + fw, a1 - fw, 0.08, h - fw, z - 0.005, z + 0.005, M.glass);
    };
    panel(u0, u0 + pw, 0.035);
    panel(u1 - pw, u1, -0.035);
    return;
  }
  // Hinged or pivot door, shown open so the plan reads in 3D
  const sigma = -o.side;                         // local z direction of swing
  const opening = o.type === 'pivot' ? 70 * DEG : 80 * DEG;
  const hingeA = o.hinge === 'a';
  const hu = hingeA ? u0 : u1;
  const pivot = new THREE.Group();
  pivot.position.set(hu, 0, sigma * w.t / 2);
  pivot.rotation.y = (hingeA ? -sigma : sigma) * opening;
  local.add(pivot);
  const dir = hingeA ? 1 : -1;
  const leafW = o.w - 0.04;
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafW, h - 0.02, o.type === 'pivot' ? 0.06 : 0.04), o.glazed ? M.glass : M.timber);
  leaf.position.set(dir * (leafW / 2 + 0.02), (h - 0.02) / 2, 0);
  leaf.castShadow = leaf.receiveShadow = true;
  pivot.add(leaf);
  if (o.glazed) {
    for (const [a, b, c, d] of [[0, 0.05, 0, h], [leafW - 0.05, leafW, 0, h], [0, leafW, h - 0.07, h], [0, leafW, 0, 0.12]]) {
      const fr = new THREE.Mesh(new THREE.BoxGeometry(b - a, d - c, 0.05), M.timber);
      fr.position.set(dir * (0.02 + (a + b) / 2), (c + d) / 2, 0);
      pivot.add(fr);
    }
  }
  // Door frame
  lbox(u0, u0 + 0.04, 0, h, -w.t / 2 - 0.005, w.t / 2 + 0.005, M.timber);
  lbox(u1 - 0.04, u1, 0, h, -w.t / 2 - 0.005, w.t / 2 + 0.005, M.timber);
}

function buildColumns(root, M) {
  const g = new THREE.Group(); g.name = 'Columns';
  for (const [x, y] of house.columns) {
    const top = x === 15.0 ? FFL + 3.0 - 0.12 : FFL + CEIL;
    box(g, [x - 0.15, y - 0.15, x + 0.15, y + 0.15], FFL - 0.02, FFL + 0.3, M.plinth);
    box(g, [x - 0.1, y - 0.1, x + 0.1, y + 0.1], FFL + 0.3, top, M.timber);
  }
  root.add(g);
}

function buildRoofs(root, M) {
  const roofG = new THREE.Group(); roofG.name = 'Roof';
  // Roof-only material copies so ghosting the roof leaves the rest of the model untouched
  const R = { timber: M.timber.clone(), slab: M.slab.clone(), ridge: M.laterite.clone(), gutter: M.gutter.clone(), solar: M.solar.clone(), under: M.roofUnder };
  const ceilG = new THREE.Group(); ceilG.name = 'Ceilings & soffits';
  const studio = house.rooms.find(r => r.name === 'Studio').rect;
  for (const r of house.roofs) {
    const [x0, y0, x1, y1] = r.rect;
    if (r.type === 'flat') {
      box(roofG, r.rect, FFL + r.top - r.thick, FFL + r.top, R.slab);
      continue;
    }
    const e = FFL + r.eave, t = Math.tan(r.pitch * DEG), c = Math.cos(r.pitch * DEG);
    const W = x1 - x0, D = y1 - y0;
    const alongX = W >= D;
    const h = Math.min(W, D) / 2, ridge = e + h * t;
    const xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
    const faces = alongX ? [
      { pts: [[x0, y0, e], [x1, y0, e], [x1 - h, ym, ridge], [x0 + h, ym, ridge]], uv: p => [p[0], (p[1] - y0) / c] },
      { pts: [[x1, y1, e], [x0, y1, e], [x0 + h, ym, ridge], [x1 - h, ym, ridge]], uv: p => [p[0], (y1 - p[1]) / c] },
      { pts: [[x0, y1, e], [x0, y0, e], [x0 + h, ym, ridge]], uv: p => [p[1], (p[0] - x0) / c] },
      { pts: [[x1, y0, e], [x1, y1, e], [x1 - h, ym, ridge]], uv: p => [p[1], (x1 - p[0]) / c] },
    ] : [
      { pts: [[x0, y0, e], [x0, y1, e], [xm, y1 - h, ridge], [xm, y0 + h, ridge]], uv: p => [p[1], (p[0] - x0) / c] },
      { pts: [[x1, y1, e], [x1, y0, e], [xm, y0 + h, ridge], [xm, y1 - h, ridge]], uv: p => [p[1], (x1 - p[0]) / c] },
      { pts: [[x0, y0, e], [x1, y0, e], [xm, y0 + h, ridge]], uv: p => [p[0], (p[1] - y0) / c] },
      { pts: [[x1, y1, e], [x0, y1, e], [xm, y1 - h, ridge]], uv: p => [p[0], (y1 - p[1]) / c] },
    ];
    for (const fc of faces) {
      const mesh = polyMesh(fc.pts, fc.uv, M.roofT.mat);
      roofG.add(mesh);
      // Timber-boarded underside, seen from the studio and below the eaves
      const under = new THREE.Mesh(mesh.geometry, R.under);
      under.receiveShadow = true;
      roofG.add(under);
    }
    // Ridge cap
    if (alongX) box(roofG, [x0 + h, ym - 0.12, x1 - h, ym + 0.12], ridge - 0.02, ridge + 0.09, R.ridge);
    // Fascia boards + gutters from the soffit to the tiles
    const z0 = FFL + CEIL - 0.06, z1 = e + 0.05;
    box(roofG, [x0, y0 - 0.04, x1, y0], z0, z1, R.timber);
    box(roofG, [x0, y1, x1, y1 + 0.04], z0, z1, R.timber);
    box(roofG, [x0 - 0.04, y0, x0, y1], z0, z1, R.timber);
    box(roofG, [x1, y0, x1 + 0.04, y1], z0, z1, R.timber);
    box(roofG, [x0 - 0.16, y0 - 0.16, x1 + 0.16, y0 - 0.04], e - 0.12, e - 0.02, R.gutter);
    box(roofG, [x0 - 0.16, y1 + 0.04, x1 + 0.16, y1 + 0.16], e - 0.12, e - 0.02, R.gutter);
    // Soffit / flat ceiling (open to the rafters over the studio)
    const pieces = r.id === 'RN'
      ? [[x0, y0, x1, studio[1]], [x0, studio[1], studio[0], y1], [studio[2], studio[1], x1, y1], [studio[0], studio[3] + 0.115, studio[2], y1]]
      : [r.rect];
    for (const p of pieces) box(ceilG, p, FFL + CEIL - 0.01, FFL + CEIL + 0.03, M.ceiling, { cast: true, receive: true });
  }
  // Solar PV on the south slope of the south pavilion
  const sp = house.solarPanels, rs = house.roofs.find(r => r.id === sp.roof);
  const pitch = rs.pitch * DEG;
  for (let row = 0; row < sp.rows; row++) {
    const sMid = 0.7 + row * (sp.panelL + 0.08) + sp.panelL / 2;
    const y = rs.rect[1] + sMid * Math.cos(pitch), z = FFL + rs.eave + sMid * Math.sin(pitch) + 0.06;
    for (let x = sp.x0; x + sp.panelW <= sp.x1 + 1e-6; x += sp.panelW + 0.04) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(sp.panelW, 0.04, sp.panelL), R.solar);
      p.position.set(x + sp.panelW / 2, z, -y);
      p.rotation.x = pitch;
      p.castShadow = true;
      roofG.add(p);
    }
  }
  // Rain chains into the pond
  for (const [x, y] of house.courtyard.rainChains) {
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, FFL + 3.4 - (FFL - 0.3), 6), R.gutter);
    ch.position.set(x, (FFL + 3.4 + FFL - 0.3) / 2, -y);
    roofG.add(ch);
  }
  root.add(roofG, ceilG);
  return { roofG, ceilG };
}

function furnitureMesh(parent, it, M) {
  const [x0, y0, x1, y1] = it.rect, f = FFL;
  const b = (r, z0, z1, m) => box(parent, r, f + z0, f + z1, m);
  const table = (r, hgt, m = M.timberLight) => {
    const [a, c, d, e] = r;
    b(r, hgt - 0.04, hgt, m);
    for (const [lx, ly] of [[a + 0.05, c + 0.05], [d - 0.05, c + 0.05], [a + 0.05, e - 0.05], [d - 0.05, e - 0.05]])
      b([lx - 0.025, ly - 0.025, lx + 0.025, ly + 0.025], 0, hgt - 0.04, m);
  };
  switch (it.type) {
    case 'bed': b(it.rect, 0, 0.3, M.timberLight); b([x0 + 0.05, y0 + 0.05, x1 - 0.05, y1 - 0.05], 0.3, 0.52, M.fabric);
      b([x0, y0, x0 + 0.06, y1], 0, 1.0, M.timberLight); b([x0 + 0.1, y0 + 0.15, x0 + 0.5, y1 - 0.15], 0.52, 0.64, M.white); break;
    case 'daybed': b(it.rect, 0, 0.45, M.fabric); break;
    case 'side': b(it.rect, 0, 0.5, M.timberLight); break;
    case 'chair': case 'armchair': b(it.rect, 0, 0.42, M.sage); b([x0, y0, x1, y0 + 0.15], 0.42, 0.8, M.sage); break;
    case 'sofa': b(it.rect, 0, 0.42, M.sage); b([x0, y1 - 0.2, x1, y1], 0.42, 0.82, M.sage);
      b([x0, y0, x0 + 0.18, y1], 0.42, 0.62, M.sage); b([x1 - 0.18, y0, x1, y1], 0.42, 0.62, M.sage); break;
    case 'shower': b(it.rect, 0, 0.04, M.stone); break;
    case 'wc': b(it.rect, 0, 0.42, M.white); break;
    case 'vanity': case 'basin': b(it.rect, 0, 0.85, M.timberLight); b([x0 + 0.05, y0 + 0.05, x1 - 0.05, y1 - 0.05], 0.85, 0.9, M.white); break;
    case 'wardrobe': case 'tall': b(it.rect, 0, 2.1, M.timberLight); break;
    case 'washer': b(it.rect, 0, 0.85, M.white); break;
    case 'sink': b(it.rect, 0, 0.88, M.white); break;
    case 'rack': b(it.rect, 0, it.label === 'NET' ? 1.2 : 1.9, it.label === 'NET' ? M.dark : M.timberLight); break;
    case 'drycab': b(it.rect, 0, 1.8, M.dark); break;
    case 'flatfile': b(it.rect, 0, 0.9, M.timberLight); break;
    case 'shelf': b(it.rect, 0, 1.9, M.timberLight); break;
    case 'counter': b(it.rect, 0, 0.86, M.timberLight); b(it.rect, 0.86, 0.9, M.stone); break;
    case 'island': b(it.rect, 0, 0.86, M.timber); b([x0 - 0.05, y0 - 0.05, x1 + 0.05, y1 + 0.05], 0.86, 0.9, M.stone); break;
    case 'desk': table(it.rect, 0.75); break;
    case 'table': table(it.rect, 0.85); break;
    case 'ctable': b(it.rect, 0, 0.38, M.timber); break;
    case 'dtable': {
      table(it.rect, 0.75, M.timber);
      const per = it.seats / 2, cw = 0.45, w = x1 - x0;
      for (let i = 0; i < per; i++) {
        const x = x0 + (w / per) * (i + 0.5);
        b([x - cw / 2, y1 + 0.1, x + cw / 2, y1 + 0.1 + cw], 0, 0.45, M.timberLight);
        b([x - cw / 2, y1 + 0.1 + cw - 0.05, x + cw / 2, y1 + 0.1 + cw], 0.45, 0.85, M.timberLight);
        b([x - cw / 2, y0 - 0.1 - cw, x + cw / 2, y0 - 0.1], 0, 0.45, M.timberLight);
        b([x - cw / 2, y0 - 0.1 - cw, x + cw / 2, y0 - 0.1 - cw + 0.05], 0.45, 0.85, M.timberLight);
      }
      break;
    }
    case 'easel': {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      b([cx - 0.03, cy - 0.03, cx + 0.03, cy + 0.03], 0, 1.9, M.timber);
      b([cx - 0.45, cy - 0.04, cx + 0.45, cy + 0.0], 0.8, 1.7, M.white);
      break;
    }
    case 'backdrop': b([x1 - 0.06, y0, x1, y1], 0, 2.7, M.white); b([x1 - 1.4, y0, x1 - 0.06, y1], 0, 0.01, M.white); break;
    case 'bench': b(it.rect, 0.38, 0.45, M.timberLight); b([x0 + 0.05, y0 + 0.05, x0 + 0.12, y1 - 0.05], 0, 0.38, M.timberLight); b([x1 - 0.12, y0 + 0.05, x1 - 0.05, y1 - 0.05], 0, 0.38, M.timberLight); break;
    case 'screen': for (let y = y0; y <= y1; y += 0.1) b([x0, y, x1, y + 0.04], 0, 2.4, M.timber); break;
    case 'rug': b(it.rect, 0, 0.012, M.rug); break;
    case 'lounger': b(it.rect, 0, 0.32, M.timberLight); b([x0, y1 - 0.5, x1, y1], 0.32, 0.6, M.fabric); break;
    default: b(it.rect, 0, 0.75, M.timberLight);
  }
}

function buildFurniture(root, M) {
  const g = new THREE.Group(); g.name = 'Furniture';
  for (const it of house.furniture) furnitureMesh(g, it, M);
  root.add(g);
}

function buildTree(t, M, seed) {
  const r = rng(seed), g = new THREE.Group();
  g.position.set(t.x, t.kind === 'frangipani' && t.x < 7 ? FFL - 0.3 : 0, -t.y);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  if (t.kind === 'palm') {
    let x = 0, z = 0, y = 0;
    const segs = 8, lean = (r() - 0.5) * 0.12;
    for (let i = 0; i < segs; i++) {
      const sh = t.h / segs;
      const seg = add(new THREE.CylinderGeometry(0.14, 0.17, sh, 8), M.palmTrunk, x, y + sh / 2, z);
      seg.rotation.z = lean * i * 0.4;
      x -= Math.sin(lean * i * 0.4) * sh; y += sh;
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(t.r * 1.2, 0.03, 0.35), M.leaf);
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z); pivot.rotation.y = a;
      frond.position.set(t.r * 0.55, -0.25, 0); frond.rotation.z = -0.45;
      frond.castShadow = true;
      pivot.add(frond); g.add(pivot);
    }
    add(new THREE.SphereGeometry(0.28, 8, 6), M.leafDark, x, y, z);
    return g;
  }
  if (t.kind === 'bamboo') {
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, d = r() * t.r * 0.6, hh = t.h * (0.7 + r() * 0.3);
      const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
      const cul = add(new THREE.CylinderGeometry(0.035, 0.045, hh, 5), M.leafLight, cx, hh / 2, cz);
      cul.rotation.z = (r() - 0.5) * 0.15;
      add(new THREE.IcosahedronGeometry(0.5 + r() * 0.3, 0), M.leaf, cx, hh * (0.75 + r() * 0.2), cz);
    }
    return g;
  }
  const trunkH = t.h * (t.kind === 'frangipani' ? 0.45 : 0.42);
  const thin = t.kind === 'frangipani';
  add(new THREE.CylinderGeometry(thin ? 0.06 : 0.1 + t.h * 0.012, thin ? 0.11 : 0.16 + t.h * 0.02, trunkH, 8), M.bark, 0, trunkH / 2, 0);
  if (thin) for (let i = 0; i < 3; i++) {
    const br = add(new THREE.CylinderGeometry(0.035, 0.05, t.h * 0.3, 6), M.bark, 0, 0, 0);
    const a = i * 2.1 + 0.4;
    br.position.set(Math.cos(a) * 0.28, trunkH + t.h * 0.1, Math.sin(a) * 0.28);
    br.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
  }
  const mat = t.kind === 'na' ? M.leafDark : t.kind === 'frangipani' ? M.leafLight : M.leaf;
  const blobs = t.kind === 'frangipani' ? 6 : 8;
  for (let i = 0; i < blobs; i++) {
    const a = r() * Math.PI * 2, d = r() * t.r * 0.55;
    const rad = t.r * (0.45 + r() * 0.3);
    const yy = trunkH + (t.h - trunkH) * (0.3 + r() * 0.45);
    const blob = add(new THREE.IcosahedronGeometry(rad, 1), mat, Math.cos(a) * d, yy, Math.sin(a) * d);
    blob.scale.y = t.kind === 'na' ? 1.15 : 0.75;
  }
  if (t.kind === 'frangipani') {
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = r() * t.r * 0.9;
      const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), M.flower);
      fl.position.set(Math.cos(a) * d, trunkH + (t.h - trunkH) * (0.55 + r() * 0.35), Math.sin(a) * d);
      g.add(fl);
    }
  }
  return g;
}

function buildLandscape(root, M) {
  const g = new THREE.Group(); g.name = 'Landscape';
  house.landscape.trees.forEach((t, i) => g.add(buildTree(t, M, 100 + i * 17)));
  g.add(buildTree(house.courtyard.tree, M, 7));
  root.add(g);
}

function buildLabels(root) {
  const g = new THREE.Group(); g.name = 'Labels';
  const items = [...house.rooms.map(r => ({ name: r.name, c: clearRect(r.rect) })),
    { name: 'Courtyard', c: [4.4, 5.0, 6.2, 5.0] }, { name: 'Verandah', c: [6, -1.2, 10, -1.2] }];
  for (const it of items) {
    const el = document.createElement('div');
    el.className = 'room-tag';
    el.textContent = it.name;
    const o = new CSS2DObject(el);
    o.position.set((it.c[0] + it.c[2]) / 2, FFL + 1.4, -(it.c[1] + it.c[3]) / 2);
    g.add(o);
  }
  root.add(g);
  return g;
}

// ---------- the viewer ----------
export function createViewer(container, ui = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'label-layer';
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const sky = new THREE.Color('#cfe0ea');
  scene.background = sky.clone();
  scene.fog = new THREE.Fog(sky.clone(), 60, 180);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = 88 * DEG;
  controls.minDistance = 2;
  controls.maxDistance = 90;

  const hemi = new THREE.HemisphereLight('#e4effa', '#b9a68a', 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e0', 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  const center = new THREE.Vector3(8.5, 0, -4);
  sun.target.position.copy(center);
  scene.add(sun, sun.target);

  const M = makeMaterials();
  const site = new THREE.Group(); site.name = 'Sisila House';
  scene.add(site);
  buildGround(site, M);
  buildPlinth(site, M);
  buildWalls(site, M);
  buildColumns(site, M);
  const { roofG, ceilG } = buildRoofs(site, M);
  buildFurniture(site, M);
  buildLandscape(site, M);
  const labels = buildLabels(scene);
  labels.children.forEach(l => { l.visible = false; });

  // ----- views -----
  const VIEWS = {
    aerial:    { pos: [27, 21, 19],  target: [6.8, 0.8, -4.6] },
    garden:    { pos: [15.2, 1.75, 4.7], target: [6.5, 2.1, -0.6] },
    courtyard: { pos: [5.0, FFL + 1.6, -8.2], target: [4.4, FFL + 0.9, -4.6] },
    entry:     { pos: [21.4, 1.7, -6.0], target: [13, 1.8, -6.0] },
    studio:    { pos: [9.5, FFL + 1.65, -8.9], target: [3.5, FFL + 1.6, -10.6] },
    top:       { pos: [6.6, 34, -5.6], target: [6.6, 0, -5.8] },
  };
  function setView(name) {
    const v = VIEWS[name];
    camera.position.set(...v.pos);
    controls.target.set(...v.target);
    controls.update();
  }
  setView('aerial');

  // ----- roof modes -----
  function setRoofMode(mode) {
    const ghost = mode === 'ghost';
    roofG.visible = mode !== 'off';
    ceilG.visible = mode === 'solid';
    roofG.traverse(o => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m === M.glass) continue;
        m.transparent = ghost;
        m.opacity = ghost ? 0.18 : 1;
        m.depthWrite = !ghost;
        m.needsUpdate = true;
      }
      o.castShadow = !ghost;
    });
    labels.children.forEach(l => { l.visible = mode !== 'solid'; });
  }

  // ----- sun -----
  const state = { month: 3, hour: 10.5, shadows: true };
  function updateSun() {
    const s = sunPosition(house.meta.latitude, state.month, state.hour);
    const up = Math.max(s.up, -0.05);
    sun.position.set(center.x + s.east * 50, center.y + up * 50, center.z - s.north * 50);
    const day = THREE.MathUtils.clamp(s.alt / 25, 0, 1);
    sun.intensity = 2.8 * day;
    const warm = THREE.MathUtils.clamp(1 - s.alt / 35, 0, 1);
    sun.color.setRGB(1, 0.95 - warm * 0.2, 0.88 - warm * 0.38);
    hemi.intensity = 0.25 + 0.75 * day;
    const night = new THREE.Color('#1c2533'), dusk = new THREE.Color('#e9c9a8'), noon = new THREE.Color('#cfe0ea');
    const col = s.alt < 0 ? night.clone().lerp(dusk, THREE.MathUtils.clamp(1 + s.alt / 8, 0, 1)) : dusk.clone().lerp(noon, day);
    scene.background.copy(col); scene.fog.color.copy(col);
    renderer.shadowMap.enabled = state.shadows;
    sun.castShadow = state.shadows;
    ui.onSun?.(s, state);
  }
  updateSun();

  // ----- walk mode -----
  const walk = new PointerLockControls(camera, renderer.domElement);
  const keys = {};
  const onKey = (e, down) => { keys[e.code] = down; };
  window.addEventListener('keydown', e => onKey(e, true));
  window.addEventListener('keyup', e => onKey(e, false));
  const court = clearRect(house.courtyard.rect);
  function floorAt(x, y) {
    const inCourt = x > court[0] && x < court[2] && y > court[1] && y < court[3];
    if (inCourt) return FFL + house.levels.courtyard;
    const inHouse = x > -0.1 && x < 13.3 && y > -0.1 && y < 11.7;
    const onDeck = (x > 2.6 && x < 13.2 && y > -2.4 && y < 0) || (x > 13.2 && x < 15.0 && y > 4.6 && y < 7.4);
    return inHouse || onDeck ? FFL : 0;
  }
  // Walking works with pointer lock when the browser allows it, and falls back to drag-to-look.
  let walking = false;
  function enterWalk() {
    camera.position.set(15.6, 1.65, -6.0);
    camera.lookAt(10, 1.9, -6.0);
    walking = true; controls.enabled = false; ui.onWalk?.(true);
    // PointerLockControls picks up the lock through document events; failure means drag-to-look
    try { renderer.domElement.requestPointerLock()?.catch?.(() => {}); } catch { /* unavailable */ }
  }
  function exitWalk() {
    if (!walking) return;
    walking = false; controls.enabled = true;
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    controls.target.copy(camera.position).addScaledVector(dir, 3);
    controls.update();
    ui.onWalk?.(false);
  }
  walk.addEventListener('unlock', exitWalk);
  window.addEventListener('keydown', e => { if (e.code === 'Escape' && walking && !walk.isLocked) exitWalk(); });
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  let look = null;
  renderer.domElement.addEventListener('pointerdown', e => { if (walking && !walk.isLocked) look = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('pointerup', () => { look = null; });
  window.addEventListener('pointermove', e => {
    if (!look) return;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= (e.clientX - look.x) * 0.004;
    euler.x = THREE.MathUtils.clamp(euler.x - (e.clientY - look.y) * 0.004, -1.4, 1.4);
    camera.quaternion.setFromEuler(euler);
    look = { x: e.clientX, y: e.clientY };
  });

  // ----- loop -----
  const clock = new THREE.Clock();
  let running = false;
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
    camera.aspect = w / h; camera.fov = w < h ? 64 : 42; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (walking) {
      const sp = (keys.ShiftLeft || keys.ShiftRight ? 3.2 : 1.6) * dt;
      if (keys.KeyW || keys.ArrowUp) walk.moveForward(sp);
      if (keys.KeyS || keys.ArrowDown) walk.moveForward(-sp);
      if (keys.KeyA || keys.ArrowLeft) walk.moveRight(-sp);
      if (keys.KeyD || keys.ArrowRight) walk.moveRight(sp);
      const target = floorAt(camera.position.x, -camera.position.z) + 1.6;
      camera.position.y += (target - camera.position.y) * Math.min(1, dt * 10);
    } else controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  return {
    start() { if (!running) { running = true; resize(); clock.getDelta(); frame(); } },
    stop() { running = false; },
    setView,
    setRoofMode,
    setSun(month, hour) { state.month = month; state.hour = hour; updateSun(); },
    setShadows(on) { state.shadows = on; updateSun(); scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); },
    enterWalk,
    snapshot() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
    exportGLB() {
      return new Promise((resolve, reject) => {
        new GLTFExporter().parse(site, data => resolve(new Blob([data], { type: 'model/gltf-binary' })), reject, { binary: true });
      });
    },
  };
}
