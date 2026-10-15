// Sisila House: the single source of truth for the design.
// Units: metres. x points east, y points north, origin at the SW wall-centreline corner.
// Heights are measured from finished floor level (FFL), which sits on a raised plinth.

export const house = {
  meta: {
    name: 'Sisila House',
    meaning: '"Sisila" (සිසිල) means cool, a cool breeze, in Sinhala',
    subtitle: 'A minimalist tropical courtyard home',
    location: 'Wet-zone Sri Lanka (Colombo–Kandy belt), lat. 7.0° N',
    latitude: 7.0,
    client: 'Private residence: technologist, painter, photographer',
    architect: 'Plan2Home3D Studio',
    drawingNo: 'A-101',
    revision: 'A',
    date: '15 Oct 2026',
    scale: '1:100 @ A3',
  },

  // 25 m x 18 m plot = 450 m², about 17.8 perches (1 perch = 25.29 m²). Road on the east.
  plot: { x0: -3, y0: -5, x1: 22, y1: 13, road: 'east' },

  levels: {
    plinth: 0.45,      // FFL above natural ground
    wallH: 3.2,        // wall plate height above FFL
    courtyard: -0.3,   // courtyard floor relative to FFL (pebbles and pond)
  },

  // Structural grid (wall centrelines)
  grid: {
    x: [{ id: 'A', v: 0 }, { id: 'B', v: 2.6 }, { id: 'C', v: 6.4 }, { id: 'D', v: 10.0 }, { id: 'E', v: 13.2 }],
    y: [{ id: '1', v: 0 }, { id: '2', v: 4.0 }, { id: '3', v: 7.2 }, { id: '4', v: 8.4 }, { id: '5', v: 11.6 }],
  },

  // Walls: centreline a -> b (always in increasing x or y), thickness t, optional height h.
  walls: [
    // External: 230 mm brick, lime plaster
    { id: 'W1', a: [0, 0],    b: [13.2, 0],    t: 0.23, kind: 'ext' },   // south
    { id: 'W2', a: [13.2, 0], b: [13.2, 11.6], t: 0.23, kind: 'ext' },   // east
    { id: 'W3', a: [0, 11.6], b: [13.2, 11.6], t: 0.23, kind: 'ext' },   // north
    { id: 'W4', a: [0, 0],    b: [0, 11.6],    t: 0.23, kind: 'ext' },   // west
    // Courtyard walls (also external)
    { id: 'C1', a: [2.6, 4.0], b: [6.4, 4.0], t: 0.23, kind: 'ext' },
    { id: 'C2', a: [2.6, 4.0], b: [2.6, 7.2], t: 0.23, kind: 'ext' },
    { id: 'C3', a: [6.4, 4.0], b: [6.4, 7.2], t: 0.23, kind: 'ext' },
    { id: 'C4', a: [2.6, 7.2], b: [6.4, 7.2], t: 0.23, kind: 'ext' },
    // Internal: 115 mm
    { id: 'I1',  a: [2.6, 0],   b: [2.6, 4.0],   t: 0.115, kind: 'int' },  // ensuite | bedroom
    { id: 'I2',  a: [0, 4.0],   b: [2.6, 4.0],   t: 0.115, kind: 'int' },  // ensuite | utility
    { id: 'I3',  a: [0, 5.6],   b: [2.6, 5.6],   t: 0.115, kind: 'int' },  // utility | bath
    { id: 'I4',  a: [0, 7.2],   b: [2.6, 7.2],   t: 0.115, kind: 'int' },  // bath | gallery
    { id: 'I5',  a: [0, 8.4],   b: [2.6, 8.4],   t: 0.115, kind: 'int' },  // gallery | edit suite
    { id: 'I6',  a: [2.6, 8.4], b: [2.6, 11.6],  t: 0.115, kind: 'int' },  // edit suite | studio
    { id: 'I7',  a: [2.6, 8.4], b: [10.0, 8.4],  t: 0.115, kind: 'int' },  // gallery | studio (art wall)
    { id: 'I8',  a: [10.0, 8.4], b: [10.0, 11.6], t: 0.115, kind: 'int' }, // studio | guest
    { id: 'I9',  a: [10.0, 8.4], b: [13.2, 8.4], t: 0.115, kind: 'int' },  // foyer | guest
    { id: 'I10', a: [6.4, 0],   b: [6.4, 4.0],   t: 0.115, kind: 'int' },  // bedroom | living
    { id: 'I11', a: [10.0, 4.0], b: [13.2, 4.0], t: 0.115, kind: 'int' },  // kitchen | foyer
    // Garden shower court screen walls (laterite, 2.1 m high)
    { id: 'G1', a: [0, -2.4],   b: [2.6, -2.4], t: 0.23, h: 2.1, kind: 'garden' },
    { id: 'G2', a: [0, -2.4],   b: [0, 0],      t: 0.23, h: 2.1, kind: 'garden' },
    { id: 'G3', a: [2.6, -2.4], b: [2.6, 0],    t: 0.10, h: 2.1, kind: 'screen' }, // timber slat screen
  ],

  // Openings: o = offset from wall start a to the opening edge, w = width.
  // type: door | pivot | slide | pocket | window | louvre | clerestory
  // Doors: hinge 'a'|'b' = hinge end; side +1 = swings to the left of a->b, -1 = to the right.
  openings: [
    // W1 south
    { wall: 'W1', o: 1.2,  w: 0.9, type: 'door', hinge: 'a', side: -1, head: 2.4, label: 'Ensuite to garden court' },
    { wall: 'W1', o: 3.2,  w: 2.4, type: 'slide', head: 2.4, label: 'Bedroom to verandah' },
    { wall: 'W1', o: 6.8,  w: 2.8, type: 'slide', head: 2.4, label: 'Living to verandah' },
    { wall: 'W1', o: 10.4, w: 0.9, type: 'door', hinge: 'a', side: -1, head: 2.4, glazed: true, label: 'Kitchen to verandah' },
    { wall: 'W1', o: 11.8, w: 1.0, type: 'window', sill: 1.05, head: 2.1 },
    // W2 east
    { wall: 'W2', o: 1.2, w: 1.6, type: 'window', sill: 1.05, head: 2.1, label: 'Kitchen, morning light' },
    { wall: 'W2', o: 5.4, w: 1.2, type: 'pivot', hinge: 'a', side: 1, head: 2.7, label: 'Main entrance, timber pivot door' },
    { wall: 'W2', o: 9.2, w: 1.6, type: 'window', sill: 0.9, head: 2.1 },
    // W3 north: studio north light
    { wall: 'W3', o: 3.3,  w: 2.4, type: 'window', sill: 0.6, head: 2.3 },
    { wall: 'W3', o: 6.7,  w: 2.4, type: 'window', sill: 0.6, head: 2.3 },
    { wall: 'W3', o: 3.0,  w: 6.6, type: 'clerestory', sill: 2.55, head: 3.05, label: 'North-light clerestory' },
    { wall: 'W3', o: 10.8, w: 1.6, type: 'window', sill: 0.9, head: 2.1 },
    // W4 west: small, high, shaded
    { wall: 'W4', o: 1.4,  w: 1.0, type: 'louvre', sill: 1.7, head: 2.3 },
    { wall: 'W4', o: 4.3,  w: 0.9, type: 'slide', head: 2.1, label: 'Utility to service yard' },
    { wall: 'W4', o: 6.0,  w: 0.8, type: 'louvre', sill: 1.7, head: 2.3 },
    { wall: 'W4', o: 7.35, w: 0.9, type: 'door', hinge: 'b', side: -1, head: 2.1, label: 'Gallery to service yard' },
    // Courtyard
    { wall: 'C1', o: 0.6, w: 2.6, type: 'window', sill: 0.45, head: 2.4, label: 'Bedroom picture window' },
    { wall: 'C2', o: 0.4, w: 1.0, type: 'louvre', sill: 1.05, head: 2.1 },
    { wall: 'C2', o: 2.0, w: 0.9, type: 'louvre', sill: 1.7, head: 2.3 },
    { wall: 'C3', o: 0.3, w: 2.6, type: 'slide', head: 2.4, label: 'Dining to courtyard' },
    { wall: 'C4', o: 0.3, w: 3.2, type: 'slide', head: 2.4, label: 'Gallery to courtyard' },
    // Internal
    { wall: 'I1',  o: 3.0, w: 0.8,  type: 'pocket', head: 2.1 },
    { wall: 'I4',  o: 0.2, w: 0.8,  type: 'door', hinge: 'a', side: -1, head: 2.1 },
    { wall: 'I5',  o: 1.4, w: 0.8,  type: 'door', hinge: 'b', side: 1, head: 2.1, label: 'Light-tight door' },
    { wall: 'I7',  o: 1.0, w: 2.0,  type: 'slide', head: 2.4, label: 'Studio barn door' },
    { wall: 'I7',  o: 4.6, w: 2.0,  type: 'slide', head: 2.4, label: 'Studio barn door' },
    { wall: 'I9',  o: 0.4, w: 0.85, type: 'door', hinge: 'a', side: 1, head: 2.1 },
    { wall: 'I10', o: 2.9, w: 0.9,  type: 'door', hinge: 'b', side: 1, head: 2.1 },
  ],

  // Rooms: centreline rectangles [x0, y0, x1, y1]. Clear areas are computed from wall thicknesses.
  rooms: [
    { id: 'R01', name: 'Living',               rect: [6.4, 0, 10.0, 4.0],    finish: 'cement',   zone: 'live', label: [8.2, 0.45] },
    { id: 'R02', name: 'Dining',               rect: [6.4, 4.0, 10.0, 7.2],  finish: 'cement',   zone: 'live' },
    { id: 'R03', name: 'Kitchen',              rect: [10.0, 0, 13.2, 4.0],   finish: 'cement',   zone: 'live', label: [11.98, 2.95] },
    { id: 'R04', name: 'Entry Foyer',          rect: [10.0, 4.0, 13.2, 8.4], finish: 'cement',   zone: 'live', label: [11.3, 7.55] },
    { id: 'R05', name: 'Master Bedroom',       rect: [2.6, 0, 6.4, 4.0],     finish: 'timber',   zone: 'rest', label: [4.3, 3.4] },
    { id: 'R06', name: 'Ensuite',              rect: [0, 0, 2.6, 4.0],       finish: 'stone',    zone: 'wet', label: [1.62, 2.25], sub: 'dressing · shower' },
    { id: 'R07', name: 'Utility',              rect: [0, 4.0, 2.6, 5.6],     finish: 'tile',     zone: 'wet', label: [0.6, 4.85] },
    { id: 'R08', name: 'Bath',                 rect: [0, 5.6, 2.6, 7.2],     finish: 'stone',    zone: 'wet', label: [1.12, 6.62] },
    { id: 'R09', name: 'Art Gallery',          rect: [0, 7.2, 10.0, 8.4],    finish: 'cement',   zone: 'art', label: [4.6, 7.95], sub: 'track-lit art wall' },
    { id: 'R10', name: 'Studio',               rect: [2.6, 8.4, 10.0, 11.6], finish: 'cement',   zone: 'art', sub: 'paint · photo', label: [5.6, 8.92] },
    { id: 'R11', name: 'Edit Suite',           rect: [0, 8.4, 2.6, 11.6],    finish: 'timber',   zone: 'art', sub: 'dry store', label: [1.65, 10.2] },
    { id: 'R12', name: 'Work / Guest',         rect: [10.0, 8.4, 13.2, 11.6], finish: 'timber',  zone: 'rest', label: [11.3, 9.95] },
  ],

  courtyard: {
    name: 'Courtyard', rect: [2.6, 4.0, 6.4, 7.2],
    pond: [2.8, 4.2, 4.4, 7.0],
    tree: { x: 5.35, y: 5.9, r: 1.5, h: 4.2, kind: 'frangipani' },
    rainChains: [[4.0, 4.6], [3.6, 6.6]],
  },

  outdoor: [
    { id: 'O1', name: 'Verandah',          rect: [2.6, -2.4, 13.2, 0],   finish: 'terracotta', level: 0 },
    { id: 'O2', name: 'Garden Shower Court', rect: [0, -2.4, 2.6, 0],   finish: 'pebble', level: -0.05 },
    { id: 'O3', name: 'Porch',             rect: [13.2, 4.6, 15.0, 7.4], finish: 'terracotta', level: 0 },
  ],

  columns: [
    // Verandah: 200 mm timber columns on stone bases
    [2.6, -2.4], [5.25, -2.4], [7.9, -2.4], [10.55, -2.4], [13.2, -2.4],
    // Porch
    [15.0, 4.6], [15.0, 7.4],
  ],

  // Roofs. Hip roofs with clay tiles at 25°, plus flat concrete link slabs.
  roofs: [
    { id: 'RS', type: 'hip', rect: [-0.9, -3.0, 14.1, 4.6], eave: 3.45, pitch: 25, label: 'South pavilion' },
    { id: 'RN', type: 'hip', rect: [-0.6, 6.6, 13.8, 12.2], eave: 3.45, pitch: 25, label: 'North pavilion' },
    { id: 'L1', type: 'flat', rect: [6.285, 4.0, 13.5, 7.2], top: 3.35, thick: 0.15 },
    { id: 'L2', type: 'flat', rect: [-0.4, 4.0, 2.715, 7.2], top: 3.35, thick: 0.15 },
    { id: 'P1', type: 'flat', rect: [13.2, 4.2, 15.6, 7.8], top: 3.0, thick: 0.12 },
  ],

  solarPanels: { roof: 'RS', x0: 3.6, x1: 9.6, rows: 2, panelW: 1.0, panelL: 1.7 },

  furniture: [
    // Master bedroom
    { type: 'bed',    rect: [2.66, 0.65, 4.8, 2.45], label: 'Q' },
    { type: 'side',   rect: [2.66, 0.2, 3.1, 0.6] },
    { type: 'side',   rect: [2.66, 2.5, 3.1, 2.9] },
    { type: 'chair',  rect: [5.4, 0.5, 6.1, 1.2] },
    // Ensuite & dressing
    { type: 'shower', rect: [0.12, 0.12, 1.1, 1.1] },
    { type: 'wc',     rect: [0.12, 1.4, 0.82, 1.8] },
    { type: 'vanity', rect: [0.12, 2.0, 0.62, 3.0] },
    { type: 'wardrobe', rect: [0.62, 3.3, 2.0, 3.88] },
    // Utility
    { type: 'washer', rect: [1.85, 4.1, 2.45, 4.7] },
    { type: 'sink',   rect: [1.85, 4.8, 2.45, 5.5] },
    { type: 'rack',   rect: [1.15, 4.1, 1.75, 4.7], label: 'NET' },
    // Bath
    { type: 'wc',     rect: [0.25, 5.66, 0.65, 6.31], rot: 90 },
    { type: 'basin',  rect: [1.0, 5.66, 1.5, 6.1] },
    { type: 'shower', rect: [1.6, 5.66, 2.48, 7.14] },
    // Edit suite
    { type: 'desk',   rect: [0.15, 10.85, 2.48, 11.45], label: 'EDIT' },
    { type: 'drycab', rect: [0.15, 8.5, 0.75, 9.7], label: 'DRY' },
    { type: 'flatfile', rect: [0.15, 9.8, 0.75, 10.7] },
    // Studio
    { type: 'sink',   rect: [2.7, 8.5, 3.3, 9.1] },
    { type: 'rack',   rect: [2.7, 9.4, 3.1, 11.4], label: 'CANVAS' },
    { type: 'easel',  rect: [4.0, 10.0, 4.8, 10.6] },
    { type: 'table',  rect: [5.3, 9.4, 7.3, 10.4], label: 'WORK TABLE' },
    { type: 'backdrop', rect: [7.9, 9.0, 9.9, 11.42], label: 'PHOTO SET' },
    // Gallery
    { type: 'bench',  rect: [7.4, 7.3, 9.4, 7.7] },
    // Work / guest
    { type: 'daybed', rect: [12.15, 9.4, 13.05, 11.4] },
    { type: 'desk',   rect: [10.1, 10.85, 11.7, 11.45], label: 'DESK' },
    { type: 'shelf',  rect: [10.1, 9.5, 10.45, 10.7] },
    // Foyer
    { type: 'bench',  rect: [12.6, 6.9, 13.05, 8.2] },
    { type: 'screen', rect: [9.96, 4.5, 10.04, 6.6] },
    // Dining
    { type: 'dtable', rect: [7.3, 5.15, 9.1, 6.05], seats: 6 },
    // Living
    { type: 'sofa',   rect: [7.4, 2.7, 9.6, 3.6] },
    { type: 'ctable', rect: [8.0, 1.6, 9.0, 2.2] },
    { type: 'armchair', rect: [6.65, 1.1, 7.35, 1.8] },
    { type: 'rug',    rect: [7.2, 1.0, 9.8, 3.3] },
    // Kitchen
    { type: 'counter', rect: [12.45, 0.6, 13.085, 3.94], sink: [12.45, 1.5, 13.0, 2.3] },
    { type: 'tall',    rect: [10.6, 3.3, 12.45, 3.94], label: 'FRIDGE · PANTRY' },
    { type: 'island',  rect: [10.7, 1.0, 11.6, 2.6] },
    // Verandah
    { type: 'lounger', rect: [3.6, -1.9, 4.4, -0.3] },
    { type: 'dtable',  rect: [10.9, -1.8, 12.5, -0.9], seats: 4 },
  ],

  landscape: {
    trees: [
      { x: 19.0, y: 2.0,  r: 2.6, h: 8.0, kind: 'na',     label: 'Na tree (Mesua ferrea)' },
      { x: 0.6,  y: -3.9, r: 2.0, h: 7.0, kind: 'kumbuk', label: 'Kumbuk' },
      { x: 16.9, y: 2.8,  r: 1.2, h: 3.8, kind: 'frangipani', label: 'Araliya' },
      { x: 20.6, y: -3.7, r: 1.5, h: 9.0, kind: 'palm', label: 'King coconut' },
      { x: -1.9, y: 1.6, r: 1.5, h: 10.0, kind: 'palm', label: 'King coconut' },
      { x: 20.3, y: 12.0, r: 1.0, h: 6.0, kind: 'bamboo' },
      { x: 4.0,  y: 12.4, r: 0.8, h: 6.0, kind: 'bamboo' },
      { x: 8.5,  y: 12.4, r: 0.8, h: 6.0, kind: 'bamboo' },
      { x: -2.2, y: -4.0, r: 0.9, h: 5.0, kind: 'bamboo' },
    ],
    driveway: [15.8, 8.2, 22, 11.4],
    path: [15.0, 5.6, 22, 6.4],
    carport: { rect: [15.8, 8.2, 21.4, 11.4], h: 2.7, label: 'Carport · solar pergola · EV point' },
    tank: { x: -1.8, y: 10.2, r: 0.75, label: 'Rainwater tank 5,000 L' },
    gate: { y0: 5.4, y1: 6.6 },
  },
};

// ---------- Helpers shared by both renderers ----------

export const wallById = Object.fromEntries(house.walls.map(w => [w.id, w]));

export function wallVec(w) {
  const dx = w.b[0] - w.a[0], dy = w.b[1] - w.a[1];
  const len = Math.hypot(dx, dy);
  return { dx: dx / len, dy: dy / len, len, nx: -dy / len, ny: dx / len };
}

// Half thickness of the wall that lies along a rectangle edge (0 if the edge is open)
function edgeInset(axis, c, from, to) {
  const mid = (from + to) / 2;
  for (const w of house.walls) {
    if (w.kind === 'garden' || w.kind === 'screen') continue;
    if (axis === 'h' && w.a[1] === c && w.b[1] === c && w.a[0] <= mid && w.b[0] >= mid) return w.t / 2;
    if (axis === 'v' && w.a[0] === c && w.b[0] === c && w.a[1] <= mid && w.b[1] >= mid) return w.t / 2;
  }
  return 0;
}

export function clearRect([x0, y0, x1, y1]) {
  return [
    x0 + edgeInset('v', x0, y0, y1),
    y0 + edgeInset('h', y0, x0, x1),
    x1 - edgeInset('v', x1, y0, y1),
    y1 - edgeInset('h', y1, x0, x1),
  ];
}

export function roomArea(room) {
  const [x0, y0, x1, y1] = clearRect(room.rect);
  return (x1 - x0) * (y1 - y0);
}

export const M2_TO_SQFT = 10.7639;

export function areaSummary() {
  const rooms = house.rooms.map(r => ({ ...r, area: roomArea(r) }));
  const carpet = rooms.reduce((s, r) => s + r.area, 0);
  // Gross built-up = outer face of external walls, minus the open courtyard
  const xs = [-0.115, 13.315], ys = [-0.115, 11.715];
  const court = clearRect(house.courtyard.rect);
  const gross = (xs[1] - xs[0]) * (ys[1] - ys[0]) - (court[2] - court[0]) * (court[3] - court[1]);
  const outdoor = house.outdoor.reduce((s, o) => s + (o.rect[2] - o.rect[0]) * (o.rect[3] - o.rect[1]), 0);
  const p = house.plot;
  const plot = (p.x1 - p.x0) * (p.y1 - p.y0);
  return { rooms, carpet, gross, outdoor, plot, perches: plot / 25.29, courtyard: (court[2] - court[0]) * (court[3] - court[1]) };
}

// Solar position for a latitude, month (1-12, mid-month) and local solar hour.
// Returns a unit vector in ENU (east, north, up) plus altitude and azimuth in degrees.
export function sunPosition(lat, month, hour) {
  const dayOfYear = Math.round((month - 1) * 30.44 + 15);
  const decl = 23.44 * Math.sin((2 * Math.PI / 365) * (284 + dayOfYear)) * Math.PI / 180;
  const H = (15 * (hour - 12)) * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  const east = -Math.cos(decl) * Math.sin(H);
  const north = Math.sin(decl) * Math.cos(phi) - Math.cos(decl) * Math.cos(H) * Math.sin(phi);
  const up = Math.sin(decl) * Math.sin(phi) + Math.cos(decl) * Math.cos(H) * Math.cos(phi);
  const alt = Math.asin(up) * 180 / Math.PI;
  let az = Math.atan2(east, north) * 180 / Math.PI;
  if (az < 0) az += 360;
  return { east, north, up, alt, az };
}
