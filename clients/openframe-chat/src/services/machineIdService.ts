// Resolves the machineId used to subscribe to `machine.<machineId>.notification`.
// Dev override only: in Tauri builds the daemon provides the machineId via the
// `machineId` preference/CLI arg read at process start, so a null here is fine.
export function resolveMachineId(): string | null {
  const envValue = import.meta.env.VITE_OPENFRAME_MACHINE_ID as string | undefined;
  return envValue?.trim() || null;
}
