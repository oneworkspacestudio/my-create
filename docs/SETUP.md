# Setup and recovery

Windows 10/11 x64, a modern browser and an NTFS private data directory are
required. MyCreate.exe contains the server, editor and parsers. No Docker,
external database, Node.js runtime or AI model is needed on the installed host.

Workspace57 or later installs My Create at `/create`, registers its MyAccounts
OIDC client and manages startup, update and backup. Default port is 9017;
custom suite base ports use base + 27. Use the normal backed-up Workspace
updater. Do not copy old app data over an existing installation.

Standalone:

```powershell
.\MyCreate.exe --data C:\MyCreatePrivate --listen 127.0.0.1:9017
```

The browser opens a one-time first-owner setup URL. Keep data outside public
shared folders. Settings provides local users and password-encrypted backups.
Restore only into a new private directory:

```powershell
$env:WORKSPACE_BACKUP_PASSWORD = Read-Host 'Backup password' -MaskInput
.\MyCreate.exe --restore C:\Backups\create.owb --data C:\MyCreateRestored
Remove-Item Env:WORKSPACE_BACKUP_PASSWORD
```

Health: `/healthz`; version: `MyCreate.exe --version`. Structured imports and
offline templates need no Internet access. OCR uses already-installed Windows
recognition languages. My Drive requires Workspace and the same signed-in
MyAccounts user. If unavailable, keep working locally and export a pack.

Preserved sources are listed on the home page; retry or download them after a
conversion error. Saved versions can reopen as a copy. Keep periodic encrypted
backups and enough free space for source blobs and immutable revisions.
