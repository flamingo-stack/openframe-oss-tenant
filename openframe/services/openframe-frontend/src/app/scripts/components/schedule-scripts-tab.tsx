'use client';

import { InfoCard } from '@flamingo-stack/openframe-frontend-core';
import { Chevron01DownIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { ScriptScheduleAction, ScriptScheduleDetail } from '../types/script-schedule.types';

interface ScheduleScriptsTabProps {
  schedule: ScriptScheduleDetail;
}

export function ScheduleScriptsTab({ schedule }: ScheduleScriptsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      {schedule.actions.map((action, index) => (
        <ScheduleScriptCard key={`${action.script}-${index}`} action={action} />
      ))}
    </div>
  );
}

interface ScheduleScriptCardProps {
  action: ScriptScheduleAction;
}

function ScheduleScriptCard({ action }: ScheduleScriptCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const scriptId = String(action.script);

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const handleScriptDetails = useCallback(() => {
    router.push(`/scripts/details/${scriptId}`);
  }, [router, scriptId]);

  const argsData =
    action.script_args.length > 0
      ? {
          items: action.script_args.map(arg => {
            const [key, ...rest] = arg.includes('=') ? arg.split('=') : [arg];
            return { label: key, value: rest.join('=') || 'flag' };
          }),
        }
      : null;

  const envData =
    action.env_vars.length > 0
      ? {
          items: action.env_vars.map(env => {
            const [key, ...rest] = env.includes('=') ? env.split('=') : [env];
            return { label: key, value: rest.join('=') || '' };
          }),
        }
      : null;

  return (
    <div className="bg-ods-card border border-ods-border rounded-[8px] overflow-clip flex flex-col">
      {/* Header */}
      <div className="flex gap-4 items-center h-[80px] px-4">
        <div className="flex-1 flex flex-col min-w-0">
          <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">{action.name}</span>
          <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">Script</span>
        </div>

        <div className="flex flex-col">
          <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary truncate">
            {action.timeout} Seconds
          </span>
          <span className="font-medium text-[14px] leading-[20px] text-ods-text-secondary truncate">Timeout</span>
        </div>

        {/* Script Details - hidden on mobile */}
        <Button variant="device-action" onClick={handleScriptDetails} className="hidden md:flex">
          Script Details
        </Button>

        <Button
          variant="device-action"
          size="icon"
          onClick={toggleExpand}
          centerIcon={
            <span className={`inline-flex transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              <Chevron01DownIcon size={24} />
            </span>
          }
        />
      </div>

      {/* Expandable Content — animated with grid rows */}
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden min-h-0">
          <div className="flex flex-col border-t border-ods-border">
            {/* Args and Env Vars */}
            {argsData || envData ? (
              <div className="flex flex-col md:flex-row items-start w-full">
                <div className="flex-1 w-full p-4">
                  {argsData ? (
                    <InfoCard data={{ title: 'Script Arguments', ...argsData }} />
                  ) : (
                    <div className="text-ods-text-secondary text-[14px]">No script arguments</div>
                  )}
                </div>
                <div className="flex-1 w-full p-4">
                  {envData ? (
                    <InfoCard data={{ title: 'Environment Vars', ...envData }} />
                  ) : (
                    <div className="text-ods-text-secondary text-[14px]">No environment variables</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 text-ods-text-secondary text-[14px]">
                No script arguments or environment variables configured
              </div>
            )}

            {/* Show Script Details - visible on mobile only */}
            <div className="md:hidden px-4 pb-4">
              <Button variant="device-action" onClick={handleScriptDetails} className="w-full">
                Show Script Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
