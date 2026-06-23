import { graphql } from 'react-relay';

export const stopTimerMutation = graphql`
  mutation stopTimerMutation($input: StopTimerInput) {
    stopTimer(input: $input) {
      ...timeEntryFields_timeEntry @relay(mask: false)
    }
  }
`;
