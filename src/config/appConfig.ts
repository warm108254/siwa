/**
 * Application-level configuration placeholders.
 *
 * This file should centralize non-AI runtime config such as:
 * - environment name
 * - upload limits
 * - queue settings
 * - storage bucket names
 */

export const appConfig = {
  appName: 'RC6 Easy BOQ',
  env: process.env.NODE_ENV ?? 'development',
  upload: {
    maxFileSizeMb: 100,
    allowedMimeTypes: ['application/pdf'],
  },
} as const;
