/**
 * TEMPORARY — Tactical RMM has been fully removed from the project.
 *
 * The legacy `/scripts` pages (list, details, edit, run, schedules) are kept ONLY
 * as UI scaffolding until the migration to OpenFrame RMM lands. Their data hooks
 * no longer call any backend: list reads return empty results, and every write /
 * run action rejects with {@link SCRIPTS_MIGRATION_PENDING_MESSAGE} so the user
 * gets a clear toast instead of a silent no-op.
 *
 * TODO(openframe-rmm): once the OpenFrame RMM scripts API is wired up (see the
 * native `scripts/v2` implementation), delete this file together with the legacy
 * `/scripts` markup, hooks and components that import it.
 */

export const SCRIPTS_MIGRATION_PENDING_MESSAGE =
  'Scripts are being migrated to OpenFrame RMM and are temporarily unavailable.';

/** Throw the standard "migration pending" error. Typed `never` so it satisfies any return type. */
export function rejectScriptsMigrationPending(): never {
  throw new Error(SCRIPTS_MIGRATION_PENDING_MESSAGE);
}
