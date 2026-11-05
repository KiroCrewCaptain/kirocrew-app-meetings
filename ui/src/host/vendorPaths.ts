/**
 * The Mermaid runtime the dashboard serves from its own origin
 * (`website/src/lib/vendorPaths.ts`, `MERMAID_RUNTIME_PATH`). The sketch frame
 * loads it by this root-relative URL; the frame blocks every other network
 * request. A host-served static path, not an App Kit seam (PORTING.md).
 */
export const MERMAID_RUNTIME_PATH = '/vendor/mermaid.min.js'
