import { graphql } from 'react-relay';

export const markNotificationReadMutation = graphql`
  mutation markNotificationReadMutation($id: ID!) {
    markNotificationAsRead(notificationId: $id)
  }
`;
