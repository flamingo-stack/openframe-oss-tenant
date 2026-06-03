import { DetailPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { Skeleton } from '@flamingo-stack/openframe-frontend-core/components/ui';

export function NewDeviceSkeleton() {
  return (
    <DetailPageContainer padding="none" className="p-[var(--spacing-system-l)]">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-5 w-40" />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-9 w-32" />
        </div>
        {/* Organization + Platform */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-12 w-full rounded-[6px]" />
          <Skeleton className="h-12 w-full rounded-[6px]" />
        </div>

        {/* Add Device Tag */}
        <div className="flex items-center gap-2 py-3">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-6 w-32" />
        </div>

        {/* Command box */}
        <div className="bg-ods-card border border-ods-border rounded-[6px] p-6 flex flex-col gap-4">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-20 w-full rounded-[6px]" />
          <div className="flex justify-end gap-3">
            <Skeleton className="h-12 w-52 rounded-[6px]" />
            <Skeleton className="h-12 w-40 rounded-[6px]" />
          </div>
        </div>

        {/* Antivirus warning */}
        <div className="bg-ods-card border border-ods-border rounded-[6px] p-6 flex flex-col gap-4">
          <Skeleton className="h-14 w-full rounded-[6px]" />
          <Skeleton className="h-5 w-80" />
          <div className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-12 w-full rounded-[6px]" />
            ))}
          </div>
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
      </div>
    </DetailPageContainer>
  );
}
