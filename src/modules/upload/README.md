# Upload Module (`src/modules/upload`)

Purpose: handle PDF drawing upload entry points (web/API).

Planned responsibilities:
- Validate file type/size and metadata.
- Accept multi-page drawing packages.
- Trigger job creation in `jobs` module.

Notes:
- This module should not store files directly; delegate storage to `storage`.
