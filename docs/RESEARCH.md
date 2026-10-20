# Import decisions — 20 October 2026

Inspection found no existing My Create app or template repository in the
oneworkspacestudio organization. Build one editor on the shared Go apphost
(MyAccounts OIDC, issuer/subject identity, CSRF, portable private SQLite and
encrypted backups), embedded in MyCreate.exe. Use the existing blue branding
and AUI components. No Docker, cloud inference or external database.

## Official Canva boundary

Canva's [download guide](https://www.canva.com/help/download-file-types/) lists
SVG, raster images, PDF and presentation-only PPTX; availability depends on the
design and account. Exports may outline text, flatten effects or substitute fonts.
[requestExport](https://www.canva.dev/docs/apps/api/latest/design-request-export/)
returns static files, not a portable native element scene. The
[Design Editing API](https://www.canva.dev/docs/apps/design-editing/) exposes
supported content inside authorized sessions; it does not guarantee that
restricted assets or arbitrary design structure can leave Canva.

The [developer terms](https://www.canva.com/policies/canva-developer-terms/)
restrict apps primarily exporting designs into third-party design platforms,
with specified exceptions including approved content-publisher flows. Therefore
do not ship a companion exporter without an independently validated permitted
use and Canva authorization. No link scraping, private API or imaginary native
Canva parser. Users explicitly supply files they are authorized to use.

## Compatibility matrix and implementation choices

| Input | Editable recovery | Appearance and loss |
|---|---|---|
| SVG | Real text, paths, basic shapes, fills/gradients, images, transforms and clips via Fabric | Sanitized before parsing; unsupported filters/masks and complex text reported. Outlined text stays vector. No external fetches. |
| PPTX | Slide pages, text/runs, common shapes, pictures, groups, table cells and stacking | Open XML relationships validated; theme/layout inheritance best effort. Charts, SmartArt, media and uncommon geometry/effects reported. No claim of Office rendering parity. |
| PDF | Selectable text plus supported path/image drawing operations | Drawing operations are reconstructed objects, not original design layers. Raster reference retained; residual fallback disclosed. Fonts use local substitutes, never redistributed embedded font files. |
| PNG/JPEG/WebP | Raster object; optional local Windows OCR and bounded simple-region reconstruction | Original retained as locked reference. Inferred elements carry evidence/confidence. Hidden content is never recovered or invented. |
| PSD | Pixel layers/groups and supported text | ag-psd supports a subset; blend/effects, smart objects and clipping may be lossy. Composite retained for comparison. |
| My Create pack | Versioned editable scene, assets, report and source | Hash validation, local installation and explicit attribution. Never automatically publishes private content. |

## Libraries reviewed

* [Fabric.js](https://fabricjs.com/api/functions/loadsvgfromstring/) (MIT): one
  editor with real text editing, transforms, groups, gradients, clips and vector
  export. Preserve its versioned object representation inside our documented
  scene envelope instead of maintaining a second rendering model.
* [PresentationML](https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document): parse bounded ZIP/XML ourselves using
  [fflate](https://github.com/101arrowz/fflate) (MIT), without executing Office.
* [PDF.js](https://github.com/mozilla/pdf.js) (Apache-2.0): local parser, original
  rendering and text geometry. PDF semantics do not encode original layers.
* [ag-psd](https://github.com/Agamnentzar/ag-psd) (MIT): layered PSD subset,
  explicitly not Photoshop effect parity.
* [Tela](https://github.com/heyimjames/tela) and
  [OpenDesign](https://github.com/clawnify/OpenDesign) reviewed as editor
  alternatives. Their separate application/storage stacks would duplicate the
  ecosystem contract. No code/assets from them are incorporated.
* Native Windows.Media.Ocr is optional and uses already installed recognition
  languages. No commercial font download or mandatory AI model.

## Security and fidelity

Limit uploads to 32 MiB, ZIP contents to 128 MiB/4096 members, pages to 60,
objects to 12000, scene JSON to 64 MiB and recursive groups to 32. Validate magic,
XML declarations, relationship paths and embedded image URLs. Immutable source
blobs and SQL revision transactions survive failed conversions and saves. User
ownership is checked at every API read/write. Drive copies use only the current
browser user's separately verified Drive session; no administrator token.

Release as an evaluation preview with format-specific test evidence and explicit
loss reports. Do not claim perfect import, production acceptance or full Canva
parity. Run local repeatable quality gates; ecosystem policy keeps Actions off.
