import { graphql } from 'react-relay';

/**
 * Tags actually assigned to scripts, for the list filter. `archived` scopes the
 * set: null/false → tags on active scripts; true → tags on archived scripts.
 *
 * The editor's tag picker uses the shared `entityTagPickerQuery`
 * (`tagsByEntityType(entityType: SCRIPT)`) instead — the full tenant vocabulary.
 */
export const scriptTagsRelayFilterQuery = graphql`
  query scriptTagsRelayFilterQuery($archived: Boolean) {
    scriptsTags(archived: $archived) {
      id
      key
    }
  }
`;
