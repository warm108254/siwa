/**
 * Drawing-related shared types.
 *
 * This file defines metadata for uploaded drawing PDFs/pages and
 * preprocessing artifacts consumed by classifier/vision modules.
 */

export interface DrawingAsset {
  /** Unique drawing file identifier in storage. */
  id: string;
  /** Original filename uploaded by user. */
  filename: string;
  /** Total pages in the PDF document. */
  pageCount: number;
}

export interface DrawingPage {
  /** Parent drawing id. */
  drawingId: string;
  /** 1-based page number from source PDF. */
  pageNumber: number;
  /** Optional classified page type. */
  pageType?: string;
}
