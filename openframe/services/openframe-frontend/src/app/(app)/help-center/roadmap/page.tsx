'use client';

import { RoadmapPage } from '@flamingo-stack/openframe-frontend-core/components/help-center-pages';
import { EP, HELP_CENTER_BASE } from '../endpoints';

/**
 * Roadmap — one-line mount of the lib's ready-made `<RoadmapPage>` (PageLayout
 * chrome + hero + search/status + the self-fetching `RoadmapView`). This page
 * supplies only the `/content`-proxied api routes + the back target.
 */
export default function RoadmapRoute() {
  return (
    <RoadmapPage
      shell={false}
      roadmapEndpoint={EP.roadmap}
      buildRefreshUrl={EP.roadmapById}
      voteApiEndpoint={EP.roadmapVote}
      backButton={{ label: 'Back to Help Center', href: HELP_CENTER_BASE }}
    />
  );
}
