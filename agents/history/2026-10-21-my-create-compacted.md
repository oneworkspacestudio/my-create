# My Create first preview

User authorized app implementation from the Smart Importer brief, GitHub source
publication, local installation and release. New repo in oneworkspacestudio;
single Windows MyCreate.exe uses shared apphost, MyAccounts OIDC, SQLite, NTFS
private data and encrypted backups. No Actions or mandatory AI/cloud service.

Read docs/RESEARCH.md for official Canva boundary and library selection. No
companion exporter: third-party design-transfer restrictions mean this preview
uses user-supplied official file exports. No private catalogue/scraping code.

Implemented schema1 Fabric7 scene envelope, SVG/PPTX/PDF/PSD/raster adapters,
comparison, font substitution, layer editing, pages, undo/redo, immutable sources
and revisions, packs, original CC0 starters and optional local Windows OCR.
All UI screen trees originate in AUI. Optional browser-only Drive integration
verifies the same OIDC subject and refuses overwrite. Secrets are never embedded.

Go/API, frontend/unit, real browser fixtures and native executable tests pass;
see docs/ACCEPTANCE.md and privacy-filtered evidence. Fixed SVG rich-run loss,
Fabric7 origin defaults, unsafe archive paths/pattern sources, PDF image extraction
and alpha-false residual rendering, CSP-safe PNG export and settings remount.
Single write concurrency and 2 GiB per-account stored-source/revision budget.

Build artifacts: I:/Projects/tooling/my-create-20261020. Isolated NTFS tests:
C:/Projects/.cache/my-create-20261020. I drive had an outage during initial work;
now responsive. Go1.27 t.TempDir honours GOTMPDIR: use the named C test cache for
suite/apphost tests. Source/build caches may remain on I. Never use owner data as
fixtures. Stop tracked preview PIDs and verify before cleanup.

Workspace integration is on codex/my-create in the C workspace clone, rebased on
origin/main eea959c (installed blue-branding56). Candidate Workspace57 adds create
at base+27 without changing any existing app package/version. Separate template
repo contains only three new CC0 packs. Released v0.1.0-preview.1 from 2687e8a; all 4 public assets match local SHA-256.
Workspace57 released from a401b4e and installed through its normal backed-up
updater. All 25 apps are present and 24 service entries healthy; previous 24 app
versions/packages, identities and paths preserved. Native synthetic suite upgrade
proved retained sign-in, MyAccounts OIDC, correct port, saved project and same-user
Drive new-copy writes. Local/public logo hashes match. Docs/evidence records the
privacy-filtered publication and installation receipts. Installed Chat preview9
was retained. Tags/assets are immutable.

Operational note: stale global Git safe-directory entries for unavailable drives
can stall Git when working on exFAT. Per-command GIT_CONFIG_GLOBAL=NUL and
GIT_CONFIG_NOSYSTEM=1 with this exact safe.directory and explicit author identity
worked; no global configuration was changed. Task-owned blocked diagnostic
processes received termination requests; some Windows I/O waits did not exit.
These are separate from the stopped synthetic app services.
