import { graphql } from 'react-relay';

export const resumeTimerMutation = graphql`
  mutation resumeTimerMutation {
    resumeTimer {
      ...timeEntryFields_timeEntry @relay(mask: false)
    }
  }
`;
