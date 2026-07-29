/**
 * AI integration configuration placeholders.
 *
 * This file should centralize model/API config for:
 * - OpenAI Vision model selection
 * - retry/timeouts
 * - token and image size controls
 */

export const aiConfig = {
  provider: 'openai',
  visionModel: process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini',
  maxRetries: 2,
  timeoutMs: 60_000,
} as const;
