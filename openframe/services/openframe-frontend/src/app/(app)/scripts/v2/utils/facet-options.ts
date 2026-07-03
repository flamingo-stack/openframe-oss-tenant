/** A filter dropdown option derived from a server facet entry. */
export interface FacetOption {
  id: string;
  label: string;
  value: string;
}

/**
 * Maps a server-driven facet (`ScriptFilterOption { value, label, count }`) to
 * label-sorted filter options. The option `value` is the facet's `value`
 * verbatim — it must match the corresponding server filter input field (e.g. a
 * user id for `initiatorIds`/`authorIds`, a machineId for `machineIds`), so it
 * round-trips through the URL param unchanged.
 */
export function facetToSortedOptions(
  facet: ReadonlyArray<{ readonly value: string; readonly label: string }> | null | undefined,
): FacetOption[] {
  return (facet ?? [])
    .map(f => ({ id: f.value, label: f.label, value: f.value }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
