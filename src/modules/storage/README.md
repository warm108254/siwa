# Storage Module (`src/modules/storage`)

Purpose: abstract file persistence (Cloudflare R2 in production).

Planned responsibilities:
- Upload/download/delete drawing assets.
- Generate signed access URLs.
- Define storage key conventions per project/job/page.

Notes:
- Keep provider-agnostic interfaces so local/mock storage can be swapped in tests.
