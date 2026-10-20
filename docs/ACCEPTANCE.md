# Preview acceptance and limits

This is an unsigned Windows evaluation preview, not a claim of production or
Office/Photoshop/Canva parity. All testing uses original synthetic fixtures and
isolated NTFS data; the owner's existing installation is never used as a fixture.

Verified locally on Windows/Chrome:

* SVG retains genuine text, bold text runs, shapes, gradients, transformed groups
  and vector outlines. The invitation-style fixture recovers 9 objects and
  3 text elements. Outlined lettering remains a path.
* PPTX opens both slides, grouped pictures/shapes, rich text and editable table
  cells (15 objects, 6 text elements). Layout/theme support is best effort.
* A two-page PDF recovers selectable text, vector paths and embedded images;
  the scanned page remains raster artwork. Residual effects and an original
  reference are retained. Drawing operations are labelled reconstructed.
* PNG, JPEG and WebP preserve the raster source. Layered PSD preserves supported
  pixel layers. Windows.Media.Ocr reads both fixture text lines locally.
* Every fixture's scene packs and reopens with stable IDs and matching JSON.
  Three authored template packs also pass a complete round trip.
* Native MyCreate.exe login, import/review, text edit, position, undo/redo,
  revision save/reopen, settings navigation and PNG download pass. Desktop and
  390px phone layouts have no horizontal overflow; screenshots are inspected.
* Go tests cover source preservation, magic detection, XML/ZIP rejection,
  schema restrictions, CSRF, ownership, anonymous access, stale-revision conflict
  and previous-revision retention. TypeScript checks, Go vet and npm audit pass.

Machine-readable evidence is in `docs/evidence`. Visual comparisons resize both
images to 256 square pixels and measure mean absolute RGBA-channel difference.
The structured SVG fixture is about 0.12%; the PDF fixture about 0.65%. The
3% regression threshold is specific to those fixtures and is not a general
accuracy percentage. PPTX's comparison is generated from reconstructed content,
so its zero difference cannot establish fidelity to Office.

Known limitations: no Canva link/companion importer; no proprietary catalogue;
no advanced AI segmentation, background separation or model installation;
no integrated malware scanner; no hard OS resource sandbox for browser parsing.
SVG filters, masks, positioned text runs and use references may be removed or
approximate. PPTX charts/SmartArt/custom geometry/media/effects are reported,
not faithfully rendered by Office. PDF clip/effect order, text baselines/fonts,
blend modes and unsupported image forms may differ. PSD smart objects, masks,
adjustments and blend effects are approximate. Native editable recovery does
not imply editable reconstruction of hidden content.

Font substitution is local and explicit. Inferred OCR/colour rectangles start
hidden until reviewed. Preserve Appearance intentionally uses a raster reference
with extracted objects hidden. Maximum Editability expands supported groups.
Printing to PDF uses raster page previews. Large documents can block the browser
tab despite upload/scene limits; cancellation is cooperative. Refreshing retains
uploaded originals, but unsaved canvas edits are not an autosaved revision.

The independent update contract and full Workspace install/upgrade are verified
in the corresponding Workspace release evidence. My Drive is optional and
requires its own matching-user session; no arbitrary administrator credentials
are stored in My Create. Clean-host reboot and broad device acceptance remain
future work.
