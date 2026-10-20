# Editable scene and pack contract

Schema 1 is a JSON envelope with `schema: 1`, `engine: "fabric@7"`, `title`,
`pages`, `report`, and optional `license`. Each page has a stable ID, name,
width/height in CSS pixels, a Fabric 7 serialized `canvas`, a PNG `preview`,
and an honest `previewKind`. Coordinates use explicit left/top origins;
groups retain their transforms. Array order is back-to-front stacking order.

Objects use stable UUID `id`, human-readable `name`, and `provenance` with
kind (`native`, `reconstructed`, `raster`, `authored`), source format/reference,
optional confidence, bounds and note. Supported Fabric text, styled runs,
vector paths, shapes, embedded images, groups, transforms, gradients, strokes,
shadows, clips, opacity, visibility and movement/scaling locks retain their
serialized representation. `reference` distinguishes preserved raster references.
Unsupported effects are reported; serialization support is not a promise that
every source format can recover those properties.

`report` records format, mode, warning strings, fonts and the original file's
SHA-256. `license` records name, author, attribution, categories and keywords.
Unknown scene versions fail explicitly. There is no older released schema to
migrate; future migrations must produce a new revision and retain the source.
Schema 1 packs remain schema 1 on round-trip; no silent lossy downgrade.

A `.mycreate` pack is a ZIP containing `manifest.json`, `scene.json`, optional
`preview.png`, `source/original` and `source/info.json`. The manifest includes
schema 1, title, licence and SHA-256 for every other member. Installation rejects
missing, additional/unhashed, changed, unsafe or oversized members. Assets are
embedded PNG/JPEG/WebP data URLs in scene objects. Font family labels are saved;
font binaries are never exported. Packs cap at 32 MiB compressed/64 MiB expanded
and obey the stricter anti-expansion-ratio limit. All files can be used offline.

Projects are persisted transactionally in SQLite. A save supplies the expected
revision; conflicts require reopen or Save as Template/copy. The source ID cannot
change on an existing project. Revision history remains available for reopening
as a new copy. Source and revision storage is included in encrypted apphost
backups. Data remains in the user's private app folder unless explicitly copied
to My Drive or exported.
