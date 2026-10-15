# Plan2Home3D: Sisila House

A custom house design with a professional 2D floor plan and an interactive 3D model, both generated from one data file.

## Run it
The app uses ES modules, so serve the folder instead of opening the file directly:

```bash
python -m http.server 8080
```

Then open http://localhost:8080.

## What's inside
| File | Purpose |
|---|---|
| `src/house.js` | The design itself: plot, grid, walls, doors, windows, rooms, furniture, roofs, landscape. Edit this to change the house. |
| `src/plan2d.js` | A 1:100 A3 drawing sheet (SVG) with dimensions, grid, room schedule, legend and title block |
| `src/view3d.js` | Three.js model: roofs, sun path at 7° N with shadows, walk-through, GLB export |
| `src/main.js` | App shell, tabs and design notes |
| `DESIGN.md` | The architect's design brief |

## Using it
- **Floor Plan:** scroll to zoom and drag to pan. *Print / PDF* prints an A3 landscape sheet. *SVG* downloads the drawing.
- **3D Model:** preset views, roof Solid / Ghost / Cut-away, a sun-path slider by month and time, *Walk through* (WASD to move), PNG snapshot and GLB export for Blender or SketchUp.
- **Design Notes:** the concept, room schedule, climate strategy and materials.
