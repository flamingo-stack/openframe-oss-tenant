import { fetchQuery, graphql } from 'react-relay';
import type { IEnvironment } from 'relay-runtime';
import type { unreadCountsRelayQuery as UnreadCountsRelayQueryType } from '@/__generated__/unreadCountsRelayQuery.graphql';

export const unreadCountsRelayQuery = graphql`
  query unreadCountsRelayQuery {
    unreadCountsByCategory {
      category
      count
    }
  }
`;

/**
 * Re-fetch unread counts into the Relay store. Components subscribed to the
 * query (e.g. the sidebar hydrator) re-render automatically from the store.
 */
export function refreshUnreadCounts(environment: IEnvironment): void {
  fetchQuery<UnreadCountsRelayQueryType>(
    environment,
    unreadCountsRelayQuery,
    {},
    { fetchPolicy: 'network-only' },
  ).subscribe({
    // Counts are decorative; a failed refresh just keeps the previous values.
    error: () => {},
  });
}
