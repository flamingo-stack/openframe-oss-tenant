// Resolves the machineId used to subscribe to `machine.<machineId>.notification`.
//
// Source order:
//   1. Vite env `VITE_OPENFRAME_MACHINE_ID` — convenient for dev so a
//      developer can simulate a specific machine.
//
// In Tauri builds Rust separately reads `OPENFRAME_MACHINE_ID` at process
// start, so the JS side here is best-effort: even when this returns null
// the Rust bridge already has the machineId from the launching daemon.
// In Vite-only builds notifications aren't wired up at all (no Rust bridge),
// so a null return is fine.
export function resolveMachineId(): string | null {
  const envValue = (import.meta.env.VITE_OPENFRAME_MACHINE_ID as string | undefined) ?? null;
  if (envValue && envValue.trim()) return envValue.trim();
  return null;
}
