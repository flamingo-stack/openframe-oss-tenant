import type { AutocompleteOption } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRefetchableFragment } from 'react-relay';
import type { deviceTagsEditor_keySuggestions$key as KeySuggestionsFragmentKey } from '@/__generated__/deviceTagsEditor_keySuggestions.graphql';
import type { deviceTagsEditorKeySuggestionsRefetchQuery } from '@/__generated__/deviceTagsEditorKeySuggestionsRefetchQuery.graphql';
import { useDeferredLoading } from '@/app/hooks/use-deferred-loading';
import { keySuggestionsFragment } from './device-tags-editor';

const SUGGESTIONS_LIMIT = 20;
const DEBOUNCE_MS = 300;

export function useTagKeySuggestions(currentKey: string, keySuggestionsRef: KeySuggestionsFragmentKey) {
  const [isRefetching, startTransition] = useTransition();
  const showLoading = useDeferredLoading(isRefetching);

  const [keyData, refetchKeys] = useRefetchableFragment<
    deviceTagsEditorKeySuggestionsRefetchQuery,
    KeySuggestionsFragmentKey
  >(keySuggestionsFragment, keySuggestionsRef);

  const [input, setInput] = useState('');
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  useEffect(() => {
    startTransition(() => {
      refetchKeys(
        { search: debouncedInput || undefined, limit: SUGGESTIONS_LIMIT },
        { fetchPolicy: 'store-or-network' },
      );
    });
  }, [debouncedInput, refetchKeys]);

  const keyOptions: AutocompleteOption[] = useMemo(
    () => (keyData.tagKeySuggestions ?? []).map(s => ({ label: s.key, value: s.key })),
    [keyData],
  );

  const options = useMemo(() => {
    if (!currentKey || input || keyOptions.some(o => o.value === currentKey)) return keyOptions;
    return [{ label: currentKey, value: currentKey }, ...keyOptions];
  }, [keyOptions, currentKey, input]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const resetInput = useCallback(() => {
    setInput('');
  }, []);

  return { options, isRefetching: showLoading, handleInputChange, resetInput };
}
