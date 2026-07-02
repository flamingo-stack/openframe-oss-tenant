'use client';

import { type ReactNode, Suspense, useLayoutEffect, useState } from 'react';
import { useLazyLoadQuery } from 'react-relay';
import type { scriptDetailRelayQuery as ScriptDetailQueryType } from '@/__generated__/scriptDetailRelayQuery.graphql';
import { scriptDetailRelayQuery } from '@/graphql/scripts/script-detail-relay';
import { NotFoundBoundary, NotFoundSignal } from './not-found-boundary';

/** The loaded `script` payload of the detail query. Not-found never reaches consumers — see {@link ScriptDetailGate}. */
export type ScriptDetailData = NonNullable<ScriptDetailQueryType['response']['script']>;

/**
 * Invisible data island: suspends on the script query (inside the gate's silent
 * `<Suspense fallback={null}>`) and hands the result up. A missing script throws
 * {@link NotFoundSignal} — the same full-page not-found mechanism the details
 * page uses — so consumers only ever see a loaded script.
 *
 * `store-and-network`: always revalidate against the server (admin app — freshness
 * over cache). Consumers must tolerate a late second delivery: the edit and run
 * forms both guard their seeding effects on `!isDirty`.
 */
function ScriptDataSeeder({ scriptId, onData }: { scriptId: string; onData: (script: ScriptDetailData) => void }) {
  const data = useLazyLoadQuery<ScriptDetailQueryType>(
    scriptDetailRelayQuery,
    { id: scriptId },
    { fetchPolicy: 'store-and-network' },
  );
  const script = data.script;

  // Layout effect so a warm Relay store (navigating from the details page) seeds
  // the page before the first paint — the empty state is never shown at all.
  useLayoutEffect(() => {
    if (script) onData(script);
  }, [script, onData]);

  if (!script) {
    throw new NotFoundSignal();
  }

  return null;
}

interface ScriptDetailGateProps {
  scriptId: string;
  /** Rendered immediately; `script` is `undefined` while the query is in flight. */
  children: (script: ScriptDetailData | undefined) => ReactNode;
}

function ScriptDetailGateInner({ scriptId, children }: ScriptDetailGateProps) {
  // undefined = query in flight; not-found never lands here (the seeder throws).
  const [script, setScript] = useState<ScriptDetailData | undefined>(undefined);

  return (
    <NotFoundBoundary message="Script not found">
      <Suspense fallback={null}>
        <ScriptDataSeeder scriptId={scriptId} onData={setScript} />
      </Suspense>
      {children(script)}
    </NotFoundBoundary>
  );
}

/**
 * Owns the "render the real page once, pour the data in" pattern for the edit
 * and run script pages: the children render immediately (empty, disabled) and
 * stay mounted while the script loads — no skeleton swap, no remount (Monaco
 * mounts once). The seeder delivers the script through gate-owned state (a
 * stable `useState` setter, so the seeder's effect never re-fires spuriously),
 * and a missing script swaps the whole page for the full-page not-found state
 * via {@link NotFoundBoundary} — one not-found mechanism across the v2 pages.
 *
 * Keyed by `scriptId`: the app router reuses the `[id]` route segment when only
 * the param changes, so without the key a client-side hop from script A to
 * script B would keep A's delivered data in state (children would render A's
 * form as "loaded" under B's URL) and keep a tripped {@link NotFoundBoundary}
 * latched. The key remounts the whole gate — state, boundary, and form — per
 * script.
 */
export function ScriptDetailGate(props: ScriptDetailGateProps) {
  return <ScriptDetailGateInner key={props.scriptId} {...props} />;
}
