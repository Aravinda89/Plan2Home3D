import { house, areaSummary, M2_TO_SQFT } from './house.js';
import { mountPlan } from './plan2d.js';

const $ = s => document.querySelector(s);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

// ---------- theme ----------
const savedTheme = store.get('p2h-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
$('#theme-toggle').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.set('p2h-theme', next);
});

// ---------- floor plan ----------
const plan = mountPlan($('#plan-paper'));
$('#zoom-in').onclick = plan.zoomIn;
$('#zoom-out').onclick = plan.zoomOut;
$('#zoom-fit').onclick = plan.fit;
$('#print-plan').onclick = () => { plan.fit(); window.print(); };
window.addEventListener('beforeprint', plan.fit);
$('#download-svg').onclick = () => download(new Blob([plan.svgText()], { type: 'image/svg+xml' }), 'sisila-house-A-101-floor-plan.svg');

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------- 3D model (loaded on first visit) ----------
let viewer = null;
async function ensureViewer() {
  if (viewer) return viewer;
  const { createViewer } = await import('./view3d.js');
  viewer = createViewer($('#viewport'), {
    onSun(s, st) {
      $('#sun-month-out').textContent = MONTHS[st.month - 1];
      const hh = Math.floor(st.hour), mm = Math.round((st.hour - hh) * 60);
      $('#sun-hour-out').textContent = `${hh}:${String(mm).padStart(2, '0')}`;
      const side = s.alt <= 0 ? 'below the horizon' : s.north > 0.05 ? 'in the northern sky' : s.north < -0.05 ? 'in the southern sky' : 'almost overhead';
      $('#sun-readout').textContent = s.alt <= 0
        ? 'The sun is below the horizon.'
        : `Altitude ${s.alt.toFixed(0)}°, azimuth ${s.az.toFixed(0)}°. The sun is ${side}.`;
    },
    onWalk(on) { $('#walk-hint').hidden = !on; $('#controls').style.visibility = on ? 'hidden' : ''; },
  });
  $('#loading').remove();
  return viewer;
}

function bindModelControls() {
  const chips = (sel, attr, fn) => {
    const btns = document.querySelectorAll(`${sel} button`);
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.classList.toggle('on', x === b));
      fn(b.dataset[attr]);
    }));
  };
  chips('#views', 'view', v => {
    viewer.setView(v);
    if (v === 'top') { document.querySelector('#roof-mode [data-mode="off"]').click(); }
  });
  chips('#roof-mode', 'mode', m => viewer.setRoofMode(m));
  const sun = () => viewer.setSun(+$('#sun-month').value, +$('#sun-hour').value);
  $('#sun-month').addEventListener('input', sun);
  $('#sun-hour').addEventListener('input', sun);
  $('#shadows').addEventListener('change', e => viewer.setShadows(e.target.checked));
  $('#walk').addEventListener('click', () => viewer.enterWalk());
  $('#snapshot').addEventListener('click', async () => {
    const url = viewer.snapshot();
    const blob = await (await fetch(url)).blob();
    download(blob, 'sisila-house-view.png');
  });
  $('#export-glb').addEventListener('click', async () => {
    const btn = $('#export-glb'); btn.textContent = 'Exporting…';
    try { download(await viewer.exportGLB(), 'sisila-house.glb'); }
    finally { btn.textContent = 'GLB model'; }
  });
}

// ---------- tabs ----------
const tabs = document.querySelectorAll('.tabs button');
let modelBound = false;
async function showTab(name) {
  tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
  for (const id of ['plan', 'model', 'notes']) $(`#panel-${id}`).hidden = id !== name;
  if (name === 'model') {
    const v = await ensureViewer();
    if (!modelBound) { bindModelControls(); modelBound = true; }
    v.start();
  } else viewer?.stop();
  if (location.hash !== `#${name}`) history.replaceState(null, '', `#${name}`);
}
tabs.forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

// ---------- design notes ----------
const WHY = {
  Living: 'Opens fully to the south verandah and garden; sliding doors stack away so the room becomes a pavilion.',
  Dining: 'Sits between courtyard and living. A sliding glass wall puts the frangipani and pond at the table.',
  Kitchen: 'South-east corner: morning light over the sink, a door to the verandah for outdoor meals, an island facing the living room.',
  'Entry Foyer': 'A calm threshold. A timber pivot door, a bench for shoes and a jali screen that hints at the courtyard beyond.',
  'Master Bedroom': 'Wakes to the courtyard on one side and the garden on the other. Cross-ventilated without a fan most nights.',
  Ensuite: 'A shower, WC, vanity and dressing wardrobe. High louvres on the west for privacy. A door to a walled garden shower court screened by laterite and planting.',
  Utility: 'Laundry, network rack and solar inverter. Opens to the service yard and rainwater tank.',
  Bath: 'A guest and day bath reached from the gallery, ventilated through high louvres onto the courtyard.',
  'Art Gallery': 'The circulation spine doubles as a gallery: a long track-lit art wall facing the courtyard glazing.',
  Studio: 'The heart of the creative life. Even north light through windows and a clerestory, open rafters, a painter’s sink and a photo set.',
  'Edit Suite': 'Light-controlled for colour-accurate editing. A sealed, dehumidified dry cabinet protects lenses and canvases from fungus.',
  'Work / Guest': 'A quiet desk for focused tech work and a daybed for the occasional guest, close to the entry.',
};

function renderNotes() {
  const s = areaSummary();
  const sq = v => Math.round(v * M2_TO_SQFT).toLocaleString('en');
  const rows = s.rooms.map(r => `<tr><td>${r.name}</td><td class="num">${r.area.toFixed(1)}</td><td class="num">${sq(r.area)}</td><td class="why">${WHY[r.name] || ''}</td></tr>`).join('');
  const palette = [
    ['#efe9de', 'Lime plaster', 'Breathable walls, off-white'],
    ['#a5502f', 'Clay roof tiles', 'Half-round, locally fired'],
    ['#9a5b3f', 'Laterite', 'Garden and boundary walls'],
    ['#cbc7bf', 'Polished cement', 'Cool floor, living spaces'],
    ['#b8653f', 'Terracotta', 'Verandah and porch'],
    ['#5e3d27', 'Jak & teak', 'Doors, louvres, columns'],
    ['#6f6a63', 'Granite plinth', 'Rubble base, +450 mm'],
    ['#3d6f78', 'Water', 'Courtyard pond and rain chains'],
  ].map(([c, n, d]) => `<div class="swatch"><i style="background:${c}"></i><div><b>${n}</b><span>${d}</span></div></div>`).join('');

  $('#notes').innerHTML = `
    <p class="eyebrow">Concept design · ${house.meta.date}</p>
    <h1>${house.meta.name}</h1>
    <p class="lede">A quiet single-storey house around an open courtyard. It is built for light, air and making art, and sits lightly in the Sri Lankan climate.</p>

    <div class="stats">
      <div class="stat"><b>${s.gross.toFixed(0)} m²</b><span>gross built-up · ${sq(s.gross)} sq ft</span></div>
      <div class="stat"><b>${s.carpet.toFixed(0)} m²</b><span>usable floor area</span></div>
      <div class="stat"><b>${s.outdoor.toFixed(0)} m²</b><span>verandah, porch & court</span></div>
      <div class="stat"><b>${s.perches.toFixed(1)}</b><span>perch plot · 25 × 18 m</span></div>
    </div>

    <h2>The brief</h2>
    <p>A home for one or two people who work in AI and technology, paint and photograph, and want to live close to nature. It should be minimalist, simple and elegant. It should be just big enough for daily life, with a guest for a few nights now and then. It has to handle Sri Lanka's heat, humidity and two monsoons without depending on air-conditioning.</p>
    <p class="callout">The name <em>Sisila</em> (සිසිල) means coolness, a cool breeze. That is the main thing the house is designed to give.</p>

    <h2>The concept</h2>
    <p>The house follows the tropical modernism of Geoffrey Bawa: two long pavilions under deep clay-tile hip roofs, joined by a flat-roofed link around an <strong>open-to-sky courtyard</strong>. The bedroom, dining room, gallery and bath all look into the courtyard. Rain chains carry monsoon water from the eaves into its pond, so the house shows the weather instead of hiding from it.</p>
    <p>The plan is organised by daylight. The <strong>south pavilion</strong> holds living, kitchen and the master bedroom, all opening onto a 2.4 m verandah and the garden. The <strong>north pavilion</strong> holds the studio, edit suite and work room, which get the even north light that painters and photographers prize. The <strong>west edge</strong> is a buffer of baths, utility and storage, so few windows face the harsh afternoon sun. The entrance faces the morning sun and the road on the east.</p>

    <h2>Spaces</h2>
    <table class="schedule">
      <thead><tr><th>Space</th><th class="num">m²</th><th class="num">sq ft</th><th>Design intent</th></tr></thead>
      <tbody>${rows}
        <tr class="total"><td>Usable floor area</td><td class="num">${s.carpet.toFixed(1)}</td><td class="num">${sq(s.carpet)}</td><td></td></tr>
      </tbody>
    </table>

    <h2>Designed for the climate</h2>
    <div class="cards">
      <div class="card"><span class="k">Monsoon</span><h4>Steep roofs, deep eaves</h4><p>Clay tiles at 25° shed heavy rain quickly. Eaves of 1.2–1.5 m keep the walls dry and windows open during storms. Gutters feed a 5,000 L rainwater tank.</p></div>
      <div class="card"><span class="k">Heat</span><h4>Shade before glass</h4><p>The long axis runs east–west. Big glazing faces the shaded verandah and courtyard only. The solid west wall and service rooms absorb the afternoon heat.</p></div>
      <div class="card"><span class="k">Humidity</span><h4>Air moves through every room</h4><p>Each room has openings on two sides, timber louvres and vented eaves. The courtyard works as a chimney that draws warm air up and out. A sealed dry store protects camera gear.</p></div>
      <div class="card"><span class="k">Flood & termites</span><h4>A raised plinth</h4><p>The whole house sits on a 450 mm granite rubble plinth with a termite barrier. That lifts floors above storm-water runoff and keeps damp out of the walls.</p></div>
      <div class="card"><span class="k">Energy</span><h4>Sun on the roof, not in the rooms</h4><p>About 4 kWp of solar PV (ten panels) and a solar water heater sit on the south roof slope, with a solar pergola and EV point at the carport. A fibre-ready network rack lives in the utility room.</p></div>
      <div class="card"><span class="k">Nature</span><h4>Garden as architecture</h4><p>The courtyard has a frangipani (araliya) and a pond. A Na tree, the national tree, shades the entrance. Bamboo screens the north boundary and a kumbuk tree shades the west garden.</p></div>
    </div>

    <h2>For the painter, the photographer, the technologist</h2>
    <ul>
      <li><strong>North light studio</strong> (about 22 m²): windows and a continuous clerestory give steady, glare-free daylight all day. It has open rafters, a painter's sink, a canvas rack and a 2.4 m photo backdrop.</li>
      <li><strong>Edit suite</strong>: a light-controlled room for colour-critical work, with a sealed, dehumidified dry cabinet and flat files for prints and works on paper.</li>
      <li><strong>Gallery spine</strong>: the corridor is a 7 m track-lit art wall facing the courtyard. The house shows its owner's work every day.</li>
      <li><strong>Work room</strong>: a quiet desk with a garden view, wired for fibre and Wi-Fi mesh, and a daybed that turns it into a guest room.</li>
    </ul>

    <h2>Materials</h2>
    <div class="swatches">${palette}</div>

    <h2>Assumptions & next steps</h2>
    <ul>
      <li>Plot assumed to be 25 × 18 m (${s.perches.toFixed(1)} perches) with road access on the east, in the wet-zone lowlands or mid-country. The layout rotates or mirrors to suit a real site.</li>
      <li>Kitchen in the south-east, master bedroom in the south-west and an open centre are also consistent with traditional Vastu.</li>
      <li>Next: a site survey and soil test, then a check against local UDA / Pradeshiya Sabha setbacks. After that come elevations and sections, a structural design (RC plinth beam, brick load-bearing walls with ring beam), and MEP and costing.</li>
      <li>This is a concept design and not for construction. Approval drawings need to be prepared and signed by a chartered architect registered in Sri Lanka.</li>
    </ul>`;
}
renderNotes();

const initial = (location.hash || '#plan').slice(1);
showTab(['plan', 'model', 'notes'].includes(initial) ? initial : 'plan');
