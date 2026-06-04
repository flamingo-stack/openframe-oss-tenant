import { graphql } from 'react-relay';

export const markAllNotificationsReadMutation = graphql`
  mutation markAllNotificationsReadMutation {
    markAllNotificationsAsRead
  }
`;
