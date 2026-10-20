# Security

Report vulnerabilities privately to the repository's security advisory channel
when available. Do not attach user designs, credentials or private data to a
public issue. This unsigned evaluation preview has not had an independent audit.

The Go apphost handles MyAccounts OIDC, issuer/subject identities, session/CSRF
checks, account-change guards, local SQLite and NTFS private data permissions.
Each source and project is owner-scoped. Sources and project revisions are
immutable. A stale revision returns HTTP 409 and cannot overwrite newer work.

Uploads are checked by content, not extensions. Limits include 32 MiB input,
64 MiB scene JSON, 60 pages, 12,000 objects, 32 group levels, 40 megapixels per
page, 4,096 ZIP members, 128 MiB total expansion and 300:1 expansion ratio for
large members. XML DTDs/entities, traversal, duplicate archive names, external
SVG resources, active markup and unsupported serialized types are rejected or
removed. SVG use references are removed to prevent recursive expansion. Scene
images/patterns accept embedded PNG/JPEG/WebP only. Nothing executes from an
uploaded file. File source downloads use attachment/octet-stream responses.

Conversion runs locally in the browser. PDF parsing uses its bundled worker;
other parsers run in the browser page, with bounded inputs and cooperative
cancellation between pages. This is not an OS sandbox or a hard CPU/memory
quota: a complex file can still stall its tab. Close the tab and reopen the
preserved source if that happens. Do not expose the service to untrusted users
without an authenticated Workspace gateway and host-level resource controls.

Windows OCR is optional, single-concurrency, has a 45-second deadline and uses
installed recognition languages. It starts Windows PowerShell without a profile
or a window; no user-supplied command text is executed. No external AI service,
model download or font download is required. Antivirus can scan source storage
at the operating-system level; an integrated malware-scanner hook and advanced
model sandbox are not included in this preview.

My Drive operations use the current browser session, verify the OIDC subject,
and request a new filename without overwrite. There is no administrator token
or server-side permission bypass. A pack contains its original source, scene,
embedded assets, preview, provenance and licence metadata. Treat it as sensitive
when its source is private. Never redistribute fonts or designs without rights.
