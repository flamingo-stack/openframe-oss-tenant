'use client';

export const deviceQueryKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceQueryKeys.all, 'list'] as const,
  detail: (machineId: string) => [...deviceQueryKeys.all, 'detail', machineId] as const,
} as const;
