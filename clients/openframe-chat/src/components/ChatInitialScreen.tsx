import { type ChatTicketItemData, ChatTicketList } from '@flamingo-stack/openframe-frontend-core';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ChatInitialScreenProps {
  tickets: ChatTicketItemData[];
  onTicketClick: (ticketId: string) => void | Promise<void>;
  /** While true, show skeleton ticket rows instead of the loaded list. */
  isLoadingTickets?: boolean;
}

export function ChatInitialScreen({ tickets, onTicketClick, isLoadingTickets = false }: ChatInitialScreenProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const [showTopFade, setShowTopFade] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight + 1;
    const atBottom = Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight - 1;
    setShowBottomFade(hasOverflow && !atBottom);
    setShowTopFade(el.scrollTop > 0);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    for (const child of Array.from(el.children)) {
      ro.observe(child);
    }
    el.addEventListener('scroll', updateScrollState, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', updateScrollState);
    };
  }, [updateScrollState]);

  const hasTickets = tickets.length > 0;

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="m-auto w-full flex flex-col items-center gap-[var(--spacing-system-xl)]">
          <div className="flex flex-col w-full max-w-ods-content-narrow text-center gap-[var(--spacing-system-xxs)] py-[var(--spacing-system-l)]">
            <h1 className="text-h2">Hey! How can I help?</h1>
            <p className="text-h4 text-ods-text-secondary">Describe what's happening and I'll take a look.</p>
          </div>

          {isLoadingTickets ? (
            <ChatTicketList className="w-full max-w-ods-content-narrow" tickets={[]} isLoading skeletonCount={5} />
          ) : (
            hasTickets && (
              <ChatTicketList
                className="w-full max-w-ods-content-narrow [&_button:last-child]:border-b-0"
                tickets={tickets}
                onTicketClick={onTicketClick}
              />
            )
          )}
        </div>
      </div>
      {/* Scroll-fade overlays — fade edge content into the page background in
          both themes. `var(--color-bg)` flips with `data-theme`: dark #161616,
          light #fafafa. */}
      <div
        aria-hidden="true"
        style={{
          background: 'linear-gradient(180deg, var(--color-bg) 0%, transparent 100%)',
        }}
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-10 transition-opacity duration-200',
          showTopFade ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        aria-hidden="true"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, var(--color-bg) 100%)',
        }}
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-10 transition-opacity duration-200',
          showBottomFade ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  );
}
