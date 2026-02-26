'use client';

import { InfoCard, Label } from '@flamingo-stack/openframe-frontend-core';

interface ScriptArgumentsCardProps {
  title: string;
  args: string[];
}

export function ScriptArgumentsCard({ title, args }: ScriptArgumentsCardProps) {
  if (!args || args.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <Label className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary w-full">
        {title}
      </Label>
      <InfoCard
        data={{
          items: args.map((arg: string) => {
            const [key, ...rest] = arg.includes('=') ? arg.split('=') : [arg];
            const value = rest.length > 0 ? rest.join('=') : '';
            return { label: key, value: value || '' };
          }),
        }}
      />
    </div>
  );
}
