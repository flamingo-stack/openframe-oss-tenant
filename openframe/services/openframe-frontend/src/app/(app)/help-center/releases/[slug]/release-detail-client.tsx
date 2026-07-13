'use client';

import {
  type DeliveryResponse,
  DeliveryTable,
  ReleaseDetailPage,
  RoadmapGrid,
  type VideoDisplaySectionProps,
} from '@flamingo-stack/openframe-frontend-core/components';
import type { RoadmapItem } from '@flamingo-stack/openframe-frontend-core/components/chat';
import { EntityVideoSection } from '@flamingo-stack/openframe-frontend-core/components/features';
import { embedAuthedFetch } from '@flamingo-stack/openframe-frontend-core/utils';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { EP, HELP_CENTER_BASE } from '../../endpoints';

/**
 * Host-supplied data hook — `ReleaseDetailPage` REQUIRES this so it fetches
 * through the app's QueryClient. Points at the single-release route
 * (`EP.productReleaseBySlug`); a miss surfaces the lib's error state (no crash).
 *
 * Fetches via `embedAuthedFetch` — the SAME authed proxy fetch every other
 * help-center surface uses (bearer in dev-ticket mode + `credentials: include`
 * + 401-refresh-retry). The lib's own surfaces reach it through the internal
 * `contentFetch`; this host-supplied hook calls it directly (the chat adapter
 * is always registered under `(app)`, so the auth + refresh behave identically).
 */
function useRelease(slug: string | undefined) {
  const query = useQuery({
    queryKey: ['help-center', 'product-release', slug],
    queryFn: async () => {
      const res = await embedAuthedFetch(EP.productReleaseBySlug(slug!));
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      return res.json();
    },
    enabled: !!slug,
  });
  return { data: query.data, error: (query.error as Error) ?? null, isLoading: query.isLoading };
}

// Injected roadmap section — wraps RoadmapGrid so linked roadmap items
// vote/refresh via the same /content endpoints as the standalone page.
function RoadmapSection({
  items,
  onItemUpdate,
}: {
  items: RoadmapItem[];
  isLoading: boolean;
  onItemUpdate?: (item: RoadmapItem) => void;
}) {
  return (
    <RoadmapGrid
      items={items}
      onItemUpdate={onItemUpdate}
      buildRefreshUrl={EP.roadmapById}
      votingOptions={{ voteApiEndpoint: EP.roadmapVote }}
      showLeftMargin={false}
    />
  );
}

// Injected video section. Without it the lib renders MULTIPLE separate players
// (full + highlight); `<EntityVideoSection>` renders ONE player with Full Video /
// Highlights tabs. `VideoDisplaySectionProps` is a structural subset of its
// props, so they forward verbatim.
function VideoDisplaySection(props: VideoDisplaySectionProps) {
  return <EntityVideoSection {...props} />;
}

// Injected delivery (bug-fixes & enhancements) section. Without this prop the
// lib skips the section (it gates on `&& DeliverySection`). Renders the
// completed + in-progress tables from the data `ReleaseDetailPage` fetches via
// `deliveryApiEndpoint` (the base `/delivery?task_ids=` route → `{ completed,
// inProgress }`).
function DeliverySection({ data, isLoading }: { data: DeliveryResponse | null; isLoading: boolean }) {
  if (isLoading) return <DeliveryTable items={[]} isLoading />;
  if (!data) return null;
  return (
    <>
      {data.completed.length > 0 && <DeliveryTable items={data.completed} isLoading={false} />}
      {data.inProgress.length > 0 && <DeliveryTable items={data.inProgress} isLoading={false} />}
    </>
  );
}

export function ReleaseDetailClient() {
  const { slug = '' } = useParams<{ slug: string }>();
  return (
    <ReleaseDetailPage
      shell={false}
      slug={slug}
      useRelease={useRelease}
      RoadmapSection={RoadmapSection}
      DeliverySection={DeliverySection}
      VideoDisplaySection={VideoDisplaySection}
      roadmapApiEndpoint={EP.roadmap}
      deliveryApiEndpoint={EP.delivery}
      backButton={{ label: 'Back to releases', href: `${HELP_CENTER_BASE}/releases` }}
    />
  );
}
