import { graphql } from 'react-relay';

/**
 * Canonical TimeEntry selection shared by every time-tracker query and mutation
 * so results normalize into the same store record by `id`. Spread with
 * `@relay(mask: false)` at read sites that need the fields inline.
 */
export const timeEntryFieldsFragment = graphql`
  fragment timeEntryFields_timeEntry on TimeEntry {
    id
    userId
    ticketId
    ticketNumber
    ticketTitle
    ticket {
      id
      ticketNumber
      title
      organizationId
      organizationName
    }
    organizationId
    organization {
      id
      name
    }
    notes
    startedAt
    endedAt
    pausedAt
    durationSeconds
    breakSeconds
    state
    source
    createdAt
    updatedAt
  }
`;
