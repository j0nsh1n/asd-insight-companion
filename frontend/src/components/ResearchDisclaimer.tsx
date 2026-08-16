/**
 * Persistent research-only / non-diagnostic banner.
 * Always visible for Phase 0+; not dismissible.
 */
export function ResearchDisclaimer() {
  return (
    <aside className="research-disclaimer" role="note" aria-label="Research disclaimer">
      <strong>
        Research prototype only. This tool does not diagnose autism and cannot
        determine whether someone is autistic.
      </strong>
      <p>
        ASD Insight Companion is an exploratory, non-diagnostic ASD-trait
        prescreen tool for research and education. Results are not clinical
        advice. If you have questions or ongoing concerns, consider discussing
        them with a qualified healthcare professional.
      </p>
    </aside>
  )
}
