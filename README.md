# Astra Configurator

A client-facing architectural configurator. The client opens their unit, sees the floorplan from above, enters a room, and composes it from approved references — with the architecture locked.

```
PROJECT → FLOORPLAN → ROOM → ROOM RENDER → COMPLETE MOODBOARD → SAVED COMPOSITION → UPDATED PERSPECTIVE
```

## Run

Requires Node.js 20.9+.

```sh
npm install
npm run dev          # http://localhost:3000   (PowerShell with script restrictions: npm.cmd)
npm test             # domain, Astra and render-workflow tests
npm run build && npm run test:e2e   # browser journey (installed Chrome on Windows)
```

## Routes

| Route       | What it is |
| ----------- | ---------- |
| `/`         | Supplied Prismal V2 office plan with 26 clickable areas. |
| `/demo`     | Redirects legacy links to the supplied plan. |
| `/internal` | The previous back-office workspace (hierarchy, catalog flags, documents). Not linked from the client UI, `noindex`. |

URLs carry room state (`/?layout=PRISMAL_LAYOUT&room=PRISMAL_LOUNGE`) so room views can be bookmarked.

## The experience

**Floorplan.** The plan fills the screen and is the navigation. Rooms highlight on hover and open on click (or keyboard). Layout tabs swap the plan. A supplied floorplan image is displayed with rooms mapped as polygons (`Room.planRegion`, normalized 0–1). Without one, the vector drawing in `Layout.illustrativePlan` is used. The demo plans (walls, openings, door swings, windows, furniture symbols, dimensions) live in `src/data/demo-plans.ts`.

**Room.** The interior perspective fills the main view. Lounge (21) has MOODBOARD 1, 2 and 3 beneath it; clicking one applies its complete seven-item composition and saves the choice. No individual item swaps, render badges or timestamps are shown.

**Composition controls.** Selection happens through whole moodboards. The old individual-item command parser remains a domain utility and is not exposed in the public room view.

## Architecture

```
src/domain/models.ts         Building → Unit → Layout → Room → Moodboard → Asset; ReferenceDocument, RoomConfiguration, RoomRender, ProjectRule
src/domain/catalog.ts        validation (approval, room/layout ownership, PDF provenance, mixing, one asset per element), element-slot selection
src/domain/architecture.ts   LOCKED_ARCHITECTURE / CONFIGURABLE_SCOPE, constraints attached to every render request
src/services/application.ts  loadResidence / loadRoom, applyAssetToggle (the single configuration entry point), generate()
src/services/render-provider.ts  ImageGenerationService: generateBaseRoomRender / editRoomRender / generateVariations, buildRenderBrief
src/services/astra.ts        parseAstraCommand → AstraIntent → resolveAstraIntents (against the approved catalog)
src/app/api/renders/route.ts server boundary for OpenAI Astra image generation
src/components/showroom/     client UI: floorplan, room workspace, render stage, design panel, Astra bar
src/components/internal/     back office (moved from the old main route)
```

**Relationships.** Each asset references its moodboard, room, layout, unit, building and source PDF (with page). Each moodboard references its PDF. The client sees image, name and set; the full provenance is behind the ⓘ on each tile.

**Room configuration.** Stored as `selectedAssets: [{ assetId, quantity }]`. `selectedAssetsByElement()` returns the client-facing shape:

```json
{ "sofa": "AST_SOFA_001", "coffee_table": "AST_TABLE_002", "rug": "AST_RUG_003" }
```

Every change produces an edit action that a provider receives:

```json
{ "action": "edit_room_render", "room": "…_LIVING_ROOM", "layout": "…_A", "element": "sofa", "asset": "AST_SOFA_002", "previous_asset": "AST_SOFA_001" }
```

**Architectural source of truth.** Walls, doors, windows, dimensions, structure, fixed joinery, ceiling geometry and layout are locked. `architecturalConstraints()` puts the locked list, the configurable scope and the floorplan document IDs into every render request. The catalog rejects assets whose category is architectural. When the only plan is illustrative, the flag `planIsIllustrative` tells providers not to treat it as real geometry.

## Rendering

The browser uses HttpImageGenerationService and POST /api/renders. The server calls GPT-6 Astra through the Responses API with the image generation tool (gpt-image-2.5-sunburst). Base renders, edits and 1?4 variations include selected assets, materials, room region, architectural constraints, reference previews and the previous image.

Configure OPENAI_API_KEY in .env.local (already ignored by Git). Optional server settings: OPENAI_RENDER_MODEL and OPENAI_IMAGE_MODEL. Restart the dev server after changing these settings. API credits must be available; a ChatGPT subscription does not fund this integration.

Generated PNGs are stored in .render-data/ (ignored by Git) and served through /api/renders/:id. References must be local public PNG/JPEG/WebP files or image data URLs; PDFs need an image preview. Missing reference files fail explicitly. Demo rooms without a measured floorplan produce conceptual images. Architectural fidelity still needs human review.

This integration is for the local workspace. Before public deployment, add application authentication and per-user quotas, and replace local image storage with persistent object storage. The endpoint currently allows one active generation per server process.

## Connecting Astra (conversational AI)

`parseAstraCommand` is a small rule-based parser, not AI. A language model can replace it by emitting the same `AstraIntent[]`. Resolution stays deterministic: `resolveAstraIntents` picks only approved assets for this room, checks mixing permissions, and refuses architecture changes. The UI then applies the result through `applyAssetToggle`, the same path the tiles use.

## Data

- **Real workspace opens the supplied Prismal V2 office floorplan.** 26 provisionally named areas are mapped over the PDF. Each opens an eye-level interior preview from 12 generated typology images. Product catalogs are not yet supplied. Existing saved projects are preserved. Persistence is browser `localStorage` behind `ProjectRepository`. Swap in a server/database repository when the Excel catalog arrives. The importer should map spreadsheet rows to `Asset` records, keeping the moodboard → PDF → asset chain.
- **Legacy test fixture** (`src/data/demo.ts`) uses `DEMO_` IDs, generic names (“Sofa 02”), abstract palettes and glyphs instead of product images, and PDFs with no file (`storageReference: null`). Living Room has 3 sets and Master Bedroom has 2. Other rooms are intentionally empty to show the empty states. Use **Reset demo** in the top bar to restore it.
- The supplied `Layout Base - testes Prismal V2.pdf` (rendered to `public/plans/`) is kept as source material. It is the default real-workspace plan and render reference; legacy /demo links redirect to the supplied plan.

## Provisional interiors

The supplied office floorplan is the default across public and internal entrypoints, including saved demo preferences. Room regions and provisional names are defined in `src/data/prismal-rooms.ts`. Twelve images in `public/renders/prismal/` populate 26 room previews without API calls. Repeated typologies share an image. These are provisional images; geometry, glazing, heights, surroundings and finishes are interpretations, not a measured reconstruction. Full prompts: `docs/provisional-renders.md`. Existing saved projects and render histories are retained by an idempotent migration.

## Complete decoration compositions

The public room view now selects whole moodboards instead of individual furniture. Lounge (room 21) offers MOODBOARD 1, 2 and 3 beneath the perspective. Each contains artwork, side table, plant, sofa, coffee table, rug and armchair. Selection atomically persists the moodboard ID and its local image snapshot, without calling the API. Three images share the original Lounge viewpoint and architectural background; generated edits are visual approximations, not a pixel-level guarantee. Render overlays, simulation labels and timestamps have been removed as requested. Original item-level domain utilities remain for existing data compatibility, but are not exposed in the public room UI.

## Automatic project generation

Submitting the initial prompt saves the project direction and automatically renders every unlocked room for each available moodboard. Each image uses its room plan and references and is saved as that room's moodboard composition. The page displays progress, skipped rooms/catalogs, and individual errors; a failed room does not stop the remaining images. The existing room prompt still edits only that room.

The browser processes one image request at a time. Keep the page open until completion; canceling, reloading, or switching rooms stops the remaining queue. Completed images remain saved on the server and in the browser gallery. No paid API calls are made until the user submits the prompt.
