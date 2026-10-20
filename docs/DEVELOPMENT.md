# Build and repeatable checks

Use Go 1.27.2, Node 26, PowerShell 7 and a local Chrome browser for QA.
`web/package-lock.json` pins the UI dependencies; `go.sum` pins Go dependencies.
Screens are authored in `web/src/screens/*.aui`; generated TSX must not be
edited by hand. Logic and the design-system adapter use React.createElement.

```powershell
cd web
npm ci
npm run build
npm test
npm audit --audit-level=moderate
cd ..
$env:MYCREATE_TEST_ROOT='C:/Projects/.cache/my-create-tests'
New-Item -ItemType Directory -Force $env:MYCREATE_TEST_ROOT
go test ./...
go vet ./...
```

Never point tests at an existing user's data. Fixture generation requires Pillow,
reportlab and python-pptx (`python scripts/fixtures.py`). Start Vite on 127.0.0.1:29118
and run `node scripts/browser-tests.mjs`. It imports real SVG/PPTX/PDF/raster/PSD
fixtures, validates layers, preserves IDs through packs and writes comparison
images/evidence. Native UI tests use a separately bootstrapped private app.

For release, regenerate the shared logo exports, commit generated source and
native icon resource, then run `scripts/build.ps1 -Release` in a clean tree.
It produces one executable, an archive, checksums, dependency inventory and
complete third-party licence texts. Publish only after native and import checks.
`workspace-update.json` accompanies the release for the suite updater. No
GitHub Actions are enabled under the ecosystem's local-build policy.
