import type { AutocompleteOption } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { graphql, useLazyLoadQuery, useRefetchableFragment } from 'react-relay';
import type { useTagValueSuggestions_valueSuggestions$key as ValueSuggestionsFragmentKey } from '@/__generated__/useTagValueSuggestions_valueSuggestions.graphql';
import type { useTagValueSuggestions_valueSuggestionsQuery as ValueSuggestionsQueryType } from '@/__generated__/useTagValueSuggestions_valueSuggestionsQuery.graphql';
import type { useTagValueSuggestions_valueSuggestionsRefetchQuery } from '@/__generated__/useTagValueSuggestions_valueSuggestionsRefetchQuery.graphql';
import { useDeferredLoading } from '@/app/hooks/use-deferred-loading';

const SUGGESTIONS_LIMIT = 20;
const DEBOUNCE_MS = 300;

const valueSuggestionsRootQuery = graphql`
  query useTagValueSuggestions_valueSuggestionsQuery($tagKey: String!, $limit: Int) {
    ...useTagValueSuggestions_valueSuggestions @arguments(tagKey: $tagKey, limit: $limit)
  }
`;

const valueSuggestionsFragment = graphql`
  fragment useTagValueSuggestions_valueSuggestions on Query
    @refetchable(queryName: "useTagValueSuggestions_valueSuggestionsRefetchQuery")
    @argumentDefinitions(
      tagKey: { type: "String!" }
      search: { type: "String" }
      limit: { type: "Int" }
    ) {
    tagValueSuggestions(tagKey: $tagKey, search: $search, limit: $limit)
  }
`;

export function useTagValueSuggestions(tagKey: string) {
  const [isRefetching, startTransition] = useTransition();
  const showLoading = useDeferredLoading(isRefetching);

  const queryData = useLazyLoadQuery<ValueSuggestionsQueryType>(
    valueSuggestionsRootQuery,
    { tagKey, limit: SUGGESTIONS_LIMIT },
    { fetchPolicy: 'store-or-network' },
  );

  const [valueData, refetchValues] = useRefetchableFragment<
    useTagValueSuggestions_valueSuggestionsRefetchQuery,
    ValueSuggestionsFragmentKey
  >(valueSuggestionsFragment, queryData);

  const [input, setInput] = useState('');
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  useEffect(() => {
    startTransition(() => {
      refetchValues(
        { tagKey, search: debouncedInput || undefined, limit: SUGGESTIONS_LIMIT },
        { fetchPolicy: 'store-or-network' },
      );
    });
  }, [debouncedInput, tagKey, refetchValues]);

  const options: AutocompleteOption[] = useMemo(
    () => (valueData.tagValueSuggestions ?? []).map(v => ({ label: v, value: v })),
    [valueData],
  );

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const resetInput = useCallback(() => {
    setInput('');
  }, []);

  return { options, isRefetching: showLoading, handleInputChange, resetInput };
}
