/**
 * Negative top margin that cancels the frozen TitleBlock's leading
 * `pt-[var(--spacing-system-l)]`. Apply to a shared page component's PageLayout
 * `className` when it is embedded inside a tab, so its header sits flush under
 * the tab bar instead of leaving a redundant top gap. The TitleBlock's bottom
 * `mb-l` (gap between title and content) is preserved.
 */
export const EMBEDDED_PAGE_OFFSET = '-mt-[var(--spacing-system-l)]';
