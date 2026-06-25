import { graphql } from 'react-relay';

export const createTimeEntryMutation = graphql`
  mutation createTimeEntryMutation($input: CreateTimeEntryInput!) {
    createTimeEntry(input: $input) {
      ...timeEntryFields_timeEntry @relay(mask: false)
    }
  }
`;
