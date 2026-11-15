// The types of backdrop.js, which `npm run theme` bundles from src/backdrop.ts.
export function createBackdrop(o?: { style?: 'mosaic' | 'smooth'; width?: number; height?: number; cell?: number; seconds?: number; atOnce?: number; species?: string[]; water?: string; limit?: number }): { next: () => string }
