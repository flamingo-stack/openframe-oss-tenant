'use client';

import { Ellipsis01Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { ActionsMenuDropdown, Tag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useAutoLimitTags } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMemo } from 'react';

export interface SelectableTag {
  id: string;
  key: string;
}

interface SelectableTagsRowProps {
  tags: ReadonlyArray<SelectableTag>;
  selectedIds: ReadonlyArray<string>;
  onAdd: (tag: SelectableTag) => void;
}

/**
 * Single-line row of clickable tag chips for adding to a filter. Whatever does
 * not fit on one line collapses into a "…" chip that opens an actions menu of
 * the remaining tags; each caller supplies its own (already-fetched) tag list.
 */
export function SelectableTagsRow({ tags, selectedIds, onAdd }: SelectableTagsRowProps) {
  const available = useMemo(() => {
    const selected = new Set(selectedIds);
    return tags.filter(tag => !selected.has(tag.id));
  }, [tags, selectedIds]);

  const { visibleCount, middleRef, measureRef, badgeRef } = useAutoLimitTags({
    count: available.length,
    reserveInputWidth: false,
  });

  if (available.length === 0) return null;

  const visible = available.slice(0, visibleCount);
  const hidden = available.slice(visibleCount);

  return (
    <div className="relative">
      <div ref={middleRef} className="flex items-center gap-[var(--spacing-system-xxs)] overflow-hidden">
        {visible.map(tag => (
          <Tag
            key={tag.id}
            variant="outline"
            label={tag.key}
            onClick={() => onAdd(tag)}
            className="shrink-0 cursor-pointer hover:bg-ods-bg-hover"
          />
        ))}

        {hidden.length > 0 && (
          <ActionsMenuDropdown
            align="start"
            triggerAriaLabel={`Show ${hidden.length} more tags`}
            customTrigger={
              <button ref={badgeRef} type="button" className="shrink-0 cursor-pointer">
                <Tag
                  variant="outline"
                  label={<Ellipsis01Icon className="size-4" />}
                  className="hover:bg-ods-bg-hover"
                />
              </button>
            }
            groups={[
              // closeOnSelect: false keeps the menu open so several tags can be added in
              // one pass; the picked tag just moves up into the search box.
              {
                items: hidden.map(tag => ({
                  id: tag.id,
                  label: tag.key,
                  closeOnSelect: false,
                  onClick: () => onAdd(tag),
                })),
              },
            ]}
          />
        )}
      </div>

      {/* Off-screen copies of every available tag so useAutoLimitTags can measure widths. */}
      <div
        ref={measureRef}
        aria-hidden
        className="absolute left-0 top-0 flex gap-[var(--spacing-system-xxs)] pointer-events-none invisible -z-10"
      >
        {available.map(tag => (
          <Tag key={tag.id} variant="outline" label={tag.key} />
        ))}
      </div>
    </div>
  );
}
