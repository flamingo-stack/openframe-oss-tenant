'use client';

import { InfoCard, Label } from '@flamingo-stack/openframe-frontend-core';

interface ScriptArgumentsCardProps {
  title: string;
  args: string[];
  separator?: string;
}

export function ScriptArgumentsCard({ title, args, separator = '=' }: ScriptArgumentsCardProps) {
  if (!args || args.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      <Label className="text-h5 text-ods-text-secondary w-full">{title}</Label>
      <InfoCard
        data={{
          items: args.map((arg: string) => {
            const idx = arg.indexOf(separator);
            if (idx === -1) return { label: arg, value: '' };
            return { label: arg.substring(0, idx), value: arg.substring(idx + separator.length) };
          }),
        }}
      />
    </div>
  );
}
