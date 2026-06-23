import { graphql } from 'react-relay';

export const pauseTimerMutation = graphql`
  mutation pauseTimerMutation {
    pauseTimer {
      ...timeEntryFields_timeEntry @relay(mask: false)
    }
  }
`;
