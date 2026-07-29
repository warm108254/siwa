# Vision Module (`src/modules/vision`)

Purpose: integrate with OpenAI Vision API for drawing understanding.

Planned responsibilities:
- Build prompts/messages for page parsing.
- Submit page images to Vision API.
- Return structured extraction candidates for downstream validation.

Notes:
- Keep request/response mapping isolated here to simplify future model upgrades.
