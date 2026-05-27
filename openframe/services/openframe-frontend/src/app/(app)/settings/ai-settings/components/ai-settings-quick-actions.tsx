'use client';

import type { FaeQuickAction } from '../types/fae-settings';

interface AiSettingsQuickActionsProps {
  actions: FaeQuickAction[];
}

export function AiSettingsQuickActions({ actions }: AiSettingsQuickActionsProps) {
  return (
    <section className="flex flex-col gap-[var(--spacing-system-m)]">
      <header className="flex items-center gap-2">
        <h3 className="text-h5 text-ods-text-secondary uppercase tracking-[-0.02em] whitespace-nowrap">
          Quick Actions
        </h3>
        <div className="flex-1 h-px bg-ods-border min-w-4" />
        <span className="text-h6 text-ods-text-secondary whitespace-nowrap">
          {actions.length} {actions.length === 1 ? 'result' : 'results'}
        </span>
      </header>

      <ul className="flex flex-col gap-[var(--spacing-system-s)]">
        {actions.map(action => (
          <li
            key={action.id}
            className="flex flex-col gap-1 bg-ods-card border border-ods-border rounded-md p-[var(--spacing-system-m)]"
          >
            <p className="text-h4 text-ods-text-primary">{action.name}</p>
            <p className="text-h6 text-ods-text-secondary">{action.instructions}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
