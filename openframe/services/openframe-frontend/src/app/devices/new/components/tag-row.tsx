'use client';

import { Autocomplete, Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Trash2 } from 'lucide-react';
import { Suspense, useCallback, useMemo } from 'react';
import type { deviceTagsEditor_keySuggestions$key as KeySuggestionsFragmentKey } from '@/__generated__/deviceTagsEditor_keySuggestions.graphql';
import type { DeviceTag } from '../../hooks/use-install-command';
import { TagValueAutocomplete } from './tag-value-autocomplete';
import { useTagKeySuggestions } from './use-tag-key-suggestions';

/** Tag keys/values: alphanumeric, underscores, hyphens. Must start with a letter or digit. */
export const TAG_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
export const TAG_MAX_LENGTH = 64;
const TAG_FORMAT_MSG = 'Allowed characters: a-z, A-Z, 0-9, _, -';
const TAG_LENGTH_MSG = `Max length: ${TAG_MAX_LENGTH} characters`;

export function isValidTag(value: string): boolean {
  return value.length <= TAG_MAX_LENGTH && TAG_REGEX.test(value);
}

export function validateTagKey(key: string): string | undefined {
  if (!key) return undefined;
  if (key.length > TAG_MAX_LENGTH) return TAG_LENGTH_MSG;
  if (!TAG_REGEX.test(key)) return TAG_FORMAT_MSG;
  return undefined;
}

export function validateTagValues(values: string[]): string | undefined {
  if (values.some(v => v.length > TAG_MAX_LENGTH)) return TAG_LENGTH_MSG;
  if (values.some(v => !TAG_REGEX.test(v))) return TAG_FORMAT_MSG;
  return undefined;
}

interface TagRowProps {
  tag: DeviceTag & { id: string };
  onChange: (tag: DeviceTag) => void;
  onDelete: () => void;
  existingKeys: string[];
  keySuggestionsRef: KeySuggestionsFragmentKey;
  isFirst?: boolean;
}

export function TagRow({ tag, onChange, onDelete, existingKeys, keySuggestionsRef, isFirst }: TagRowProps) {
  const {
    options: keyOptions,
    isRefetching: isKeyRefetching,
    handleInputChange: handleKeyInputChange,
    resetInput: resetKeyInput,
  } = useTagKeySuggestions(tag.key, keySuggestionsRef);

  // Focus the inner input as soon as the wrapper mounts. Used for:
  // - the key input when a new row is added (row only mounts on "Add Device Tag")
  // - the value input when the user first enters a key (value autocomplete only mounts once tag.key is truthy)
  const focusInputOnMount = useCallback((el: HTMLDivElement | null) => {
    el?.querySelector('input')?.focus();
  }, []);

  const handleKeyChange = useCallback(
    (value: string | null) => {
      resetKeyInput();
      const nextKey = value ?? '';
      const valuesChanged = nextKey !== tag.key;
      onChange({ key: nextKey, values: valuesChanged ? [] : tag.values });
    },
    [onChange, tag.key, tag.values, resetKeyInput],
  );

  const handleValuesChange = useCallback(
    (values: string[]) => {
      onChange({ key: tag.key, values });
    },
    [onChange, tag.key],
  );

  const labelClassName = isFirst ? '[&>label]:hidden md:[&>label]:block' : undefined;

  const disabledValueAutocomplete = (
    <Autocomplete
      multiple
      options={[]}
      value={tag.values}
      onChange={() => {}}
      placeholder="Enter value..."
      label={isFirst ? 'Tag Values' : undefined}
      className={labelClassName}
      showChevron={false}
      disabled
    />
  );

  const isDuplicateKey = tag.key !== '' && existingKeys.filter(k => k === tag.key).length > 1;
  const keyError = useMemo(() => {
    if (isDuplicateKey) return 'Duplicate tag — this key is already used';
    return validateTagKey(tag.key);
  }, [tag.key, isDuplicateKey]);
  const valuesError = useMemo(() => validateTagValues(tag.values), [tag.values]);

  return (
    <div className="flex flex-col md:flex-row gap-[var(--spacing-system-l)] md:gap-[var(--spacing-system-s)] items-start w-full">
      <div className="w-full md:flex-1 min-w-0" ref={focusInputOnMount}>
        <Autocomplete
          options={keyOptions}
          value={tag.key || null}
          onChange={handleKeyChange}
          onInputChange={handleKeyInputChange}
          placeholder="Enter tag key..."
          label={isFirst ? 'Device Tag Name' : undefined}
          className={labelClassName}
          loading={isKeyRefetching}
          error={keyError}
          showChevron={false}
          clearOnOpen={false}
          disableClientFilter
          creatable
          freeSolo
        />
      </div>

      <div className="w-full md:flex-1 flex gap-[var(--spacing-system-s)] items-end min-w-0">
        <div className="flex-1 min-w-0">
          {tag.key ? (
            <Suspense fallback={disabledValueAutocomplete}>
              {/* Wrapper div is mounted only after Suspense resolves, so the ref callback
                  fires exactly once — on the real autocomplete, not on the fallback. */}
              <div ref={focusInputOnMount}>
                <TagValueAutocomplete
                  tagKey={tag.key}
                  values={tag.values}
                  onChange={handleValuesChange}
                  error={valuesError}
                  label={isFirst ? 'Tag Values' : undefined}
                  className={labelClassName}
                />
              </div>
            </Suspense>
          ) : (
            disabledValueAutocomplete
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
