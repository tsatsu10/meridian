/**
 * Ambient module declarations for optional / build-time-only dependencies
 * so `tsc` can typecheck without installing every client library.
 */

declare module 'meilisearch' {
  export class MeiliSearch {
    constructor(host: string, apiKey?: string);
    index(uid: string): {
      search(query: string, options?: Record<string, unknown>): Promise<unknown>;
      addDocuments(documents: unknown[]): Promise<unknown>;
      updateDocuments(documents: unknown[]): Promise<unknown>;
      deleteDocument(id: string | number): Promise<unknown>;
      [key: string]: unknown;
    };
  }
}

declare module 'file-type' {
  export function fileTypeFromBuffer(
    buffer: Uint8Array | ArrayBuffer
  ): Promise<{ ext: string; mime: string } | undefined>;
}

declare module '@tensorflow/tfjs';
declare module 'puppeteer';
declare module 'googleapis';
declare module 'ml-kmeans';
declare module 'ml-matrix';
declare module 'ml-regression';
