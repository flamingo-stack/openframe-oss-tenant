'use client';

import { DevSectionPage, RoadmapView } from '@flamingo-stack/openframe-frontend-core/components';
import { EP, HELP_CENTER_BASE } from '../endpoints';

export const dynamic = 'force-dynamic';

/**
 * Roadmap — config-only. `<DevSectionPage sectionKey="roadmap">` supplies the
 * chrome (hero + search + status pills, all URL-param-wired); `<RoadmapView>`
 * reads those params, fetches the filtered list, renders the grid, and handles
 * voting. This page supplies only the api routes.
 */
export default function RoadmapPage() {
  return (
    <DevSectionPage sectionKey="roadmap" backButton={{ label: 'Back to Help Center', href: HELP_CENTER_BASE }}>
      <RoadmapView
        endpoint={EP.roadmap}
        buildRefreshUrl={EP.roadmapById}
        votingOptions={{ voteApiEndpoint: EP.roadmapVote }}
      />
    </DevSectionPage>
  );
}
