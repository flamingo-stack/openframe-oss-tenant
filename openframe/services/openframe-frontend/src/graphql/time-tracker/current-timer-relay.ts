import { graphql } from 'react-relay';

export const currentTimerRelayQuery = graphql`
  query currentTimerRelayQuery {
    currentTimer {
      ...timeEntryFields_timeEntry @relay(mask: false)
    }
  }
`;
