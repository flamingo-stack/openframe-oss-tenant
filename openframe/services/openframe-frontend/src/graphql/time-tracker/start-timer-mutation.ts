import { graphql } from 'react-relay';

export const startTimerMutation = graphql`
  mutation startTimerMutation($input: StartTimerInput) {
    startTimer(input: $input) {
      ...timeEntryFields_timeEntry @relay(mask: false)
    }
  }
`;
