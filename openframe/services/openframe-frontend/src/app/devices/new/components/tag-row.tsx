'use client';

import type { AutocompleteOption } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Autocomplete, Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Trash2 } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { graphql, useLazyLoadQuery, useRefetchableFragment } from 'react-relay';
import type { deviceTagsEditor_keySuggestions$key as KeySuggestionsFragmentKey } from '@/__generated__/deviceTagsEditor_keySuggestions.graphql';
import type { deviceTagsEditorKeySuggestionsRefetchQuery } from '@/__generated__/deviceTagsEditorKeySuggestionsRefetchQuery.graphql';
import type { tagRow_valueSuggestions$key as ValueSuggestionsFragmentKey } from '@/__generated__/tagRow_valueSuggestions.graphql';
import type { tagRowValueSuggestionsQuery as ValueSuggestionsQueryType } from '@/__generated__/tagRowValueSuggestionsQuery.graphql';
import type { tagRowValueSuggestionsRefetchQuery } from '@/__generated__/tagRowValueSuggestionsRefetchQuery.graphql';
import type { DeviceTag } from '../../hooks/use-install-command';
import { keySuggestionsFragment } from './device-tags-editor';

const SUGGESTIONS_LIMIT = 20;
const DEBOUNCE_MS = 300;

/** Tag keys/values: alphanumeric, underscores, hyphens. Must start with a letter or digit. */
export const TAG_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
const TAG_FORMAT_MSG = 'Allowed characters: a-z, A-Z, 0-9, _, -';

export function validateTagKey(key: string): string | undefined {
  if (!key) return undefined;
  if (!TAG_REGEX.test(key)) return TAG_FORMAT_MSG;
  return undefined;
}

export function validateTagValues(values: string[]): string | undefined {
  const invalid = values.filter(v => !TAG_REGEX.test(v));
  if (invalid.length === 0) return undefined;
  return `Invalid: ${invalid.join(', ')}`;
}

/** Debounces non-empty values; empty values pass through immediately (for refocus). */
function useSearchDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!value) {
      // Empty → immediate (refocus / clear)
      clearTimeout(timerRef.current);
      setDebounced('');
      return;
    }
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerRef.current);
  }, [value, delay]);

  return debounced;
}

const valueSuggestionsRootQuery = graphql`
  query tagRowValueSuggestionsQuery($organizationId: String!, $tagKey: String!, $limit: Int) {
    ...tagRow_valueSuggestions @arguments(organizationId: $organizationId, tagKey: $tagKey, limit: $limit)
  }
`;

const valueSuggestionsFragment = graphql`
  fragment tagRow_valueSuggestions on Query
    @refetchable(queryName: "tagRowValueSuggestionsRefetchQuery")
    @argumentDefinitions(
      organizationId: { type: "String!" }
      tagKey: { type: "String!" }
      search: { type: "String" }
      limit: { type: "Int" }
    ) {
    tagValueSuggestions(organizationId: $organizationId, tagKey: $tagKey, search: $search, limit: $limit)
  }
`;

// ─── Value Autocomplete (only rendered when tag.key exists) ───

interface TagValueAutocompleteProps {
  organizationId: string;
  tagKey: string;
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
  label?: string;
  className?: string;
}

function TagValueAutocomplete({
  organizationId,
  tagKey,
  values,
  onChange,
  error,
  label,
  className,
}: TagValueAutocompleteProps) {
  const [isRefetching, startTransition] = useTransition();

  const queryData = useLazyLoadQuery<ValueSuggestionsQueryType>(
    valueSuggestionsRootQuery,
    { organizationId, tagKey, limit: SUGGESTIONS_LIMIT },
    { fetchPolicy: 'store-or-network' },
  );

  const [valueData, refetchValues] = useRefetchableFragment<
    tagRowValueSuggestionsRefetchQuery,
    ValueSuggestionsFragmentKey
  >(valueSuggestionsFragment, queryData as ValueSuggestionsFragmentKey);

  const [input, setInput] = useState('');
  const debouncedInput = useSearchDebounce(input, DEBOUNCE_MS);

  useEffect(() => {
    startTransition(() => {
      refetchValues(
        { organizationId, tagKey, search: debouncedInput || undefined, limit: SUGGESTIONS_LIMIT },
        { fetchPolicy: 'store-or-network' },
      );
    });
  }, [debouncedInput, organizationId, tagKey, refetchValues]);

  const mergedOptions: AutocompleteOption[] = useMemo(() => {
    const suggestions = (valueData.tagValueSuggestions ?? []).map(v => ({ label: v, value: v }));
    if (input) return suggestions;
    const serverValues = new Set(suggestions.map(o => o.value));
    const extraSelected = values.filter(v => !serverValues.has(v)).map(v => ({ label: v, value: v }));
    return [...suggestions, ...extraSelected];
  }, [valueData, values, input]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleChange = useCallback(
    (newValues: string[]) => {
      setInput('');
      onChange(newValues);
    },
    [onChange],
  );

  return (
    <Autocomplete
      multiple
      options={mergedOptions}
      value={values}
      onChange={handleChange}
      onInputChange={handleInputChange}
      placeholder={values.length > 0 ? 'Add More...' : 'Enter value...'}
      label={label}
      className={className}
      loading={isRefetching}
      error={error}
      disableClientFilter
      creatable
      freeSolo
    />
  );
}

// ─── TagRow ───

interface TagRowProps {
  organizationId: string;
  tag: DeviceTag & { id: string };
  onChange: (tag: DeviceTag) => void;
  onDelete: () => void;
  existingKeys: string[];
  keySuggestionsRef: KeySuggestionsFragmentKey;
  isFirst?: boolean;
}

export function TagRow({
  organizationId,
  tag,
  onChange,
  onDelete,
  existingKeys,
  keySuggestionsRef,
  isFirst,
}: TagRowProps) {
  const [isKeyRefetching, startKeyTransition] = useTransition();

  const [keyData, refetchKeys] = useRefetchableFragment<
    deviceTagsEditorKeySuggestionsRefetchQuery,
    KeySuggestionsFragmentKey
  >(keySuggestionsFragment, keySuggestionsRef);

  const [keyInput, setKeyInput] = useState('');
  const debouncedKeyInput = useSearchDebounce(keyInput, DEBOUNCE_MS);

  useEffect(() => {
    startKeyTransition(() => {
      refetchKeys(
        { organizationId, search: debouncedKeyInput || undefined, limit: SUGGESTIONS_LIMIT },
        { fetchPolicy: 'store-or-network' },
      );
    });
  }, [debouncedKeyInput, organizationId, refetchKeys]);

  const keyOptions: AutocompleteOption[] = useMemo(
    () => (keyData.tagKeySuggestions ?? []).map(s => ({ label: s.key, value: s.key })),
    [keyData],
  );

  const mergedKeyOptions = useMemo(() => {
    if (!tag.key || keyInput || keyOptions.some(o => o.value === tag.key)) return keyOptions;
    return [{ label: tag.key, value: tag.key }, ...keyOptions];
  }, [keyOptions, tag.key, keyInput]);

  const handleKeyInputChange = useCallback((value: string) => {
    setKeyInput(value);
  }, []);

  const handleKeyChange = useCallback(
    (value: string | null) => {
      setKeyInput('');
      onChange({ key: value ?? '', values: tag.values });
    },
    [onChange, tag.values],
  );

  const handleValuesChange = useCallback(
    (values: string[]) => {
      onChange({ key: tag.key, values });
    },
    [onChange, tag.key],
  );

  const labelClassName = isFirst ? '[&>label]:hidden md:[&>label]:block' : undefined;

  const isDuplicateKey = tag.key !== '' && existingKeys.filter(k => k === tag.key).length > 1;
  const keyError = useMemo(() => {
    if (isDuplicateKey) return 'Duplicate tag — this key is already used';
    return validateTagKey(tag.key);
  }, [tag.key, isDuplicateKey]);
  const valuesError = useMemo(() => validateTagValues(tag.values), [tag.values]);

  return (
    <div className="flex flex-col md:flex-row gap-[var(--spacing-system-l)] md:gap-[var(--spacing-system-s)] items-start w-full">
      <div className="w-full md:flex-1 min-w-0">
        <Autocomplete
          options={mergedKeyOptions}
          value={tag.key || null}
          onChange={handleKeyChange}
          onInputChange={handleKeyInputChange}
          placeholder="Enter tag key..."
          label={isFirst ? 'Device Tag Name' : undefined}
          className={labelClassName}
          loading={isKeyRefetching}
          error={keyError}
          disableClientFilter
          creatable
          freeSolo
        />
      </div>

      <div className="w-full md:flex-1 flex gap-[var(--spacing-system-s)] items-end min-w-0">
        <div className="flex-1 min-w-0">
          {tag.key ? (
            <Suspense
              fallback={
                <Autocomplete
                  multiple
                  options={[]}
                  value={tag.values}
                  onChange={() => {}}
                  placeholder="Enter value..."
                  label={isFirst ? 'Tag Values' : undefined}
                  className={labelClassName}
                  disabled
                  loading
                />
              }
            >
              <TagValueAutocomplete
                organizationId={organizationId}
                tagKey={tag.key}
                values={tag.values}
                onChange={handleValuesChange}
                error={valuesError}
                label={isFirst ? 'Tag Values' : undefined}
                className={labelClassName}
              />
            </Suspense>
          ) : (
            <Autocomplete
              multiple
              options={[]}
              value={[]}
              onChange={() => {}}
              placeholder="Enter value..."
              label={isFirst ? 'Tag Values' : undefined}
              className={labelClassName}
              disabled
            />
          )}
        </div>

        <Button
          type="button"
          variant="card"
          size="icon"
          onClick={onDelete}
          aria-label="Remove tag row"
          centerIcon={<Trash2 className="size-4 md:size-6 " color="var(--ods-attention-red-error)" />}
        />
      </div>
    </div>
  );
}
