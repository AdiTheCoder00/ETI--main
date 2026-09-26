/**
 * The viewfinder mark: four frame corners around a lens, with the record dot in hi-vis orange.
 * Takes the text colour, so it follows light and dark mode. Decorative next to the wordmark.
 * Construction and usage: brand/brand-kit.html.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path d="M8 31V8h23M69 8h23v23M92 69v23H69M31 92H8V69" fill="none" stroke="currentColor" strokeWidth="7.5" strokeLinecap="square" />
      <circle cx="50" cy="50" r="21" fill="none" stroke="currentColor" strokeWidth="7.5" />
      <circle cx="50" cy="50" r="7" fill="var(--accent)" />
    </svg>
  );
}
