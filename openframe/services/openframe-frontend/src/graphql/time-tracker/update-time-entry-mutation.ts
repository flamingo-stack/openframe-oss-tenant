import { graphql } from 'react-relay';

export const updateTimeEntryMutation = graphql`
  mutation updateTimeEntryMutation($input: UpdateTimeEntryInput!) {
    updateTimeEntry(input: $input) {
      ...timeEntryFields_timeEntry @relay(mask: false)
    }
  }
`;
