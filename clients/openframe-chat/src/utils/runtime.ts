// Runtime detection — distinguishes the Tauri shell from `npm run frontend:dev`
// (Vite-only) mode. Used to branch NATS plumbing: Tauri builds delegate to the
// Rust bridge; Vite-only builds fall back to the core-lib WS hooks.
export const isTauri: boolean = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
