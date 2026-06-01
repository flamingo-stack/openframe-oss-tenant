import { graphql } from 'react-relay';

export const deleteAllReadNotificationsMutation = graphql`
  mutation deleteAllReadNotificationsMutation {
    deleteAllReadNotifications
  }
`;
