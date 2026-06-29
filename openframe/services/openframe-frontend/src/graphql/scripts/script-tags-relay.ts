import { graphql } from 'react-relay';

/**
 * Tag vocabulary for the script editor picker — every tag defined for the SCRIPT
 * entity type (tenant-wide), the set a user can assign to a script.
 */
export const scriptTagsRelayPickerQuery = graphql`
  query scriptTagsRelayPickerQuery {
    tagsByEntityType(entityType: SCRIPT) {
      id
      key
    }
  }
`;

/**
 * Tags actually assigned to scripts, for the list filter. `archived` scopes the
 * set: null/false → tags on active scripts; true → tags on archived scripts.
 */
export const scriptTagsRelayFilterQuery = graphql`
  query scriptTagsRelayFilterQuery($archived: Boolean) {
    scriptsTags(archived: $archived) {
      id
      key
    }
  }
`;
