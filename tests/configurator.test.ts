import { test } from "node:test";
import assert from "node:assert/strict";
import { demoDatabase } from "../src/data/demo";
import { emptyDatabase } from "../src/data/empty";
import { validateDatabase } from "../src/data/validation";
import { LocalProjectRepository, MemoryDataSource } from "../src/data/local-repository";
import { selectedAssetsByElement, setLabel, toggleAssetSelection, validateConfiguration } from "../src/domain/catalog";
import { isLockedCategory } from "../src/domain/architecture";
import { blankConfiguration, createApplicationServices, loadResidence, loadRoom } from "../src/services/application";
import { MockImageGenerationService, buildRenderBrief } from "../src/services/render-provider";
import { parseAstraCommand, resolveAstraIntents } from "../src/services/astra";

const ROOM = "DEMO_LAYOUT_A_LIVING_ROOM", LAYOUT = "DEMO_LAYOUT_A";
const asset = (code: string, set: number) => `DEMO_A_AST_LIV_${code}_${String(set).padStart(3, "0")}`;
const roomCatalog = (data = demoDatabase()) => ({
  moodboards: data.moodboards.filter(b => b.roomId === ROOM),
  assets: data.assets.filter(a => a.roomId === ROOM),
});

test("the application works with an empty database", async () => {
  const data = emptyDatabase();
  validateDatabase(data);
  const residence = await loadResidence(new LocalProjectRepository(new MemoryDataSource(data)), null, null);
  assert.equal(residence.project, null);
  assert.deepEqual(residence.rooms, []);
});

test("demo data is valid, labelled demo, and has no files or product data", () => {
  const data = demoDatabase();
  validateDatabase(data);
  assert.ok(data.projects.every(p => p.isDemo));
  assert.ok([...data.assets, ...data.moodboards, ...data.referenceDocuments, ...data.layouts].every(row => row.id.startsWith("DEMO_")));
  assert.ok(data.referenceDocuments.every(doc => doc.storageReference === null));
  assert.ok(data.assets.every(a => a.previewImageUrl === null && a.finishMaterial === null && a.colour === null));
  assert.ok(data.layouts.every(l => l.illustrativePlan?.isIllustrative && l.floorplanDocumentId === null));
});

test("every asset keeps its moodboard → reference PDF → room → layout chain", () => {
  const data = demoDatabase();
  for (const a of data.assets) {
    const board = data.moodboards.find(b => b.id === a.moodboardId)!;
    const pdf = data.referenceDocuments.find(d => d.id === a.sourcePdfId)!;
    assert.equal(board.referencePdfId, pdf.id);
    assert.equal(pdf.moodboardId, board.id);
    assert.equal(board.roomId, a.roomId);
    assert.equal(board.layoutId, a.layoutId);
  }
});

test("assets from different sets can be mixed; one asset per element", () => {
  const data = demoDatabase();
  let config = blankConfiguration(ROOM, LAYOUT);
  for (const id of [asset("SOFA", 1), asset("TABLE", 2), asset("RUG", 3), asset("FLOOR", 1), asset("LIGHT", 2)])
    config = toggleAssetSelection(data, config, id).configuration;
  assert.deepEqual(selectedAssetsByElement(data, config), {
    sofa: asset("SOFA", 1), coffee_table: asset("TABLE", 2), rug: asset("RUG", 3), floor: asset("FLOOR", 1), pendant_light: asset("LIGHT", 2),
  });
  // Choosing another sofa replaces the sofa only — the set is not applied as a package.
  const { configuration, action } = toggleAssetSelection(data, config, asset("SOFA", 2));
  assert.equal(configuration.selectedAssets.length, 5);
  assert.equal(selectedAssetsByElement(data, configuration).rug, asset("RUG", 3));
  assert.deepEqual(action, { action: "edit_room_render", room: ROOM, layout: LAYOUT, element: "sofa", asset: asset("SOFA", 2), previous_asset: asset("SOFA", 1) });
  // Selecting the chosen asset again clears the element.
  assert.equal(toggleAssetSelection(data, configuration, asset("SOFA", 2)).configuration.selectedAssets.length, 4);
});

test("unapproved, non-mixable, wrong-room and architectural assets are rejected", () => {
  const data = demoDatabase();
  const config = toggleAssetSelection(data, blankConfiguration(ROOM, LAYOUT), asset("SOFA", 1)).configuration;
  data.assets.find(a => a.id === asset("RUG", 2))!.approved = false;
  assert.throws(() => toggleAssetSelection(data, config, asset("RUG", 2)), /approved/);
  data.assets.find(a => a.id === asset("TABLE", 3))!.canBeMixed = false;
  assert.throws(() => toggleAssetSelection(data, config, asset("TABLE", 3)), /mixing/);
  assert.throws(() => validateConfiguration(data, { ...config, roomId: "DEMO_LAYOUT_A_KITCHEN" }), /room|layout/);
  assert.ok(isLockedCategory("Windows") && isLockedCategory("joinery") && !isLockedCategory("Materials"));
  data.assets.find(a => a.id === asset("FLOOR", 1))!.category = "Ceiling";
  assert.throws(() => toggleAssetSelection(data, config, asset("FLOOR", 1)), /locked/);
});

test("Astra resolves natural phrasing against the approved catalog", () => {
  const catalog = roomCatalog();
  const selected = { sofa: asset("SOFA", 1) };
  const run = (text: string, current = selected) => resolveAstraIntents(catalog, current, parseAstraCommand(text, catalog));

  assert.deepEqual(run("Astra, use the sofa from Set 2.").map(r => r.kind === "select" && r.assetId), [asset("SOFA", 2)]);
  const mixed = run("Astra, keep the sofa but use the rug from Set 3");
  assert.deepEqual(mixed.map(r => r.kind), ["keep", "select"]);
  assert.equal(mixed[1].kind === "select" && mixed[1].assetId, asset("RUG", 3));
  assert.equal(run("use the coffee table from set two")[0].kind === "select", true);
  const change = run("Astra, change the sofa.")[0];
  assert.equal(change.kind, "clarify");
  assert.deepEqual(change.kind === "clarify" && change.options.map(o => o.assetId), [asset("SOFA", 2), asset("SOFA", 3)]);
  assert.equal(run("use the sofa from set 9")[0].kind, "clarify");
  assert.equal(run("remove the sofa")[0].kind, "clear");
  assert.equal(run("move the kitchen wall")[0].kind, "reject");
  assert.equal(run("add a jacuzzi")[0].kind, "reject");
});

test("Astra never selects unapproved or non-mixable assets", () => {
  const data = demoDatabase();
  data.assets.find(a => a.id === asset("SOFA", 2))!.approved = false;
  data.assets.find(a => a.id === asset("RUG", 3))!.canBeMixed = false;
  const catalog = { moodboards: data.moodboards.filter(b => b.roomId === ROOM), assets: data.assets.filter(a => a.roomId === ROOM && a.approved) };
  const results = resolveAstraIntents(catalog, { sofa: asset("SOFA", 1) }, parseAstraCommand("use the sofa from set 2 and the rug from set 3", catalog));
  assert.deepEqual(results.map(r => r.kind), ["clarify", "reject"]);
  assert.equal(setLabel(data, catalog.moodboards[1].id), "Set 02");
});

test("render workflow records placeholders with the configuration and locked architecture", async () => {
  const repository = new LocalProjectRepository(new MemoryDataSource(demoDatabase()));
  const images = new MockImageGenerationService(0);
  const services = createApplicationServices(repository, images);
  await services.applyAssetToggle(ROOM, LAYOUT, asset("SOFA", 1));
  const [base] = await services.generate("base", ROOM, "base");
  assert.equal(base.isPlaceholder, true);
  assert.equal(base.imageUrl, null);
  const { action } = await services.applyAssetToggle(ROOM, LAYOUT, asset("RUG", 3));
  const [edit] = await services.generate("edit", ROOM, "apply", base, 1, undefined, [action]);
  assert.equal(edit.parentRenderId, base.id);

  const residence = await loadResidence(repository, null, LAYOUT);
  const room = (await loadRoom(repository, residence, ROOM))!;
  assert.equal(room.renders.length, 2);
  assert.deepEqual(room.renders[1].assetSnapshot.map(a => a.id).sort(), [asset("RUG", 3), asset("SOFA", 1)].sort());

  let brief: ReturnType<typeof buildRenderBrief> | null = null;
  const capture = createApplicationServices(repository, { ...images, providerName: "capture", generatesImages: false,
    generateBaseRoomRender: async request => { brief = buildRenderBrief(request, "base"); return images.generateBaseRoomRender(request); },
    editRoomRender: r => images.editRoomRender(r), generateVariations: r => images.generateVariations(r) });
  await capture.generate("base", ROOM, "base");
  assert.ok(brief!.architecture!.locked.includes("walls"));
  assert.equal(brief!.architecture!.planIsIllustrative, true);
  assert.equal(brief!.selections.length, 2);
});
