# Jobs Module (`src/modules/jobs`)

Purpose: manage asynchronous pipeline jobs and status tracking.

Planned responsibilities:
- Create processing jobs from uploads.
- Track lifecycle states (queued/running/succeeded/failed).
- Store progress checkpoints and error payloads.

Notes:
- Other modules should report status through this module, not mutate job state directly.
