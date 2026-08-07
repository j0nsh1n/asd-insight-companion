/**
 * Persistent research-only / non-diagnostic banner.
 * Always visible for Phase 0+; not dismissible.
 */
export function ResearchDisclaimer() {
  return (
    <aside className="research-disclaimer" role="note" aria-label="Research disclaimer">
      <strong>Research prototype only — not a medical diagnosis.</strong>
      <p>
        ASD Insight Companion is an exploratory, non-diagnostic ASD-trait
        prescreen tool for research and education. It does not diagnose autism
        or any medical condition. Results are not clinical advice. If you have
        concerns, consult a qualified healthcare professional.
      </p>
    </aside>
  )
}
