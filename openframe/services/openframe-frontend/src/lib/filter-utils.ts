/**
 * Unified Filter Utilities
 *
 * Shared utilities for table filters across all screens (devices, logs, organizations, etc.)
 */

/**
 * Filter option structure
 */
export interface FilterOption {
  id: string;
  label: string;
  value: any;
}

/**
 * Deduplicate filter options by their ID
 *
 * Handles cases where backend returns duplicate entries for the same filter value.
 * Uses Map to ensure only unique IDs are included.
 *
 * @param options - Array of filter options (may contain duplicates)
 * @returns Deduplicated array of filter options
 *
 * @example
 * const options = [
 *   { id: 'uuid-1', label: 'Acme', value: 'uuid-1' },
 *   { id: 'uuid-1', label: 'Acme', value: 'uuid-1' }, // Duplicate
 *   { id: 'uuid-2', label: 'Other', value: 'uuid-2' }
 * ]
 *
 * deduplicateFilterOptions(options)
 * // Returns: [{ id: 'uuid-1', ... }, { id: 'uuid-2', ... }]
 */
export function deduplicateFilterOptions<T extends FilterOption>(options: T[] | undefined | null): T[] {
  if (!options || !Array.isArray(options)) {
    return [];
  }

  const uniqueMap = new Map<string, T>();

  options.forEach(option => {
    // Only add if we haven't seen this ID before
    if (!uniqueMap.has(option.id)) {
      uniqueMap.set(option.id, option);
    }
  });

  return Array.from(uniqueMap.values());
}

/**
 * Transform organization data to filter options format
 *
 * Handles multiple backend formats:
 * - Logs format: { id, name }
 * - Devices format: { value, label, count }
 *
 * Automatically deduplicates and normalizes to consistent format.
 *
 * @param organizations - Organization data from backend
 * @returns Deduplicated filter options
 */
export function transformOrganizationFilters(
  organizations:
    | Array<{
        id?: string;
        name?: string;
        value?: string;
        label?: string;
      }>
    | undefined
    | null,
): FilterOption[] {
  if (!organizations || !Array.isArray(organizations)) {
    return [];
  }

  const mapped = organizations.map(org => ({
    id: org.id || org.value || 'system',
    label: (org.name === 'null' ? 'System' : org.name) || org.label || 'Unknown',
    value: org.id || org.value || 'system',
  }));

  return deduplicateFilterOptions(mapped);
}
