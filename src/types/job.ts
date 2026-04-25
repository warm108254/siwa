/**
 * Job and status tracking types.
 *
 * This file defines queue/job primitives used to monitor asynchronous
 * BOQ processing pipelines.
 */

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export interface ProcessingJob {
  /** Stable job identifier. */
  id: string;
  /** Reference to source drawing asset. */
  drawingId: string;
  /** Current state in the async pipeline. */
  status: JobStatus;
  /** ISO timestamp when job was created. */
  createdAt: string;
  /** Optional error message if failed. */
  errorMessage?: string;
}
