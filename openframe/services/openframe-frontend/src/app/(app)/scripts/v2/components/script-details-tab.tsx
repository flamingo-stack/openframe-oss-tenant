'use client';

import { ScriptArgumentsCard } from '../../components/script/script-arguments-card';
import { ScriptEditor } from '../../components/script/script-editor';

interface ScriptDetailsTabProps {
  /** Default args as "key value" strings. */
  args: string[];
  /** Default env vars as "name=value" strings. */
  envVarStrings: string[];
  scriptBody: string;
  /** Lowercase shell id (e.g. 'bash') for editor syntax highlighting. */
  shellId: string;
}

/**
 * "Script Details" tab body: the default-args and default-env-var cards (shown
 * only when present) followed by the read-only script source. Extracted from the
 * details view so the tabs can swap it out for the execution history.
 */
export function ScriptDetailsTab({ args, envVarStrings, scriptBody, shellId }: ScriptDetailsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      {(args.length > 0 || envVarStrings.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {args.length > 0 ? (
            <ScriptArgumentsCard title="Default Script Arguments" args={args} separator=" " />
          ) : (
            <div />
          )}
          {envVarStrings.length > 0 && <ScriptArgumentsCard title="Default Environment Vars" args={envVarStrings} />}
        </div>
      )}

      {scriptBody && (
        <div className="flex flex-col gap-1">
          <div className="text-h5 text-ods-text-secondary w-full">Syntax</div>
          <ScriptEditor value={scriptBody} shell={shellId} readOnly height="400px" />
        </div>
      )}
    </div>
  );
}
