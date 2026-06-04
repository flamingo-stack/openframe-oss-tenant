import { graphql } from 'react-relay';

export const deleteNotificationMutation = graphql`
  mutation deleteNotificationMutation($id: ID!) {
    deleteNotification(notificationId: $id)
  }
`;
