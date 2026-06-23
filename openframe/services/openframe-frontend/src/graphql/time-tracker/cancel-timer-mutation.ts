import { graphql } from 'react-relay';

export const cancelTimerMutation = graphql`
  mutation cancelTimerMutation {
    cancelTimer
  }
`;
