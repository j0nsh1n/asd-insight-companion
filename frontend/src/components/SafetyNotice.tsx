/**
 * Persistent Phase 5 notice. This copy is allowed to say the tool is not
 * a diagnosis; other results cards must stay non-diagnostic.
 */
export function SafetyNotice() {
  return (
    <aside className="safety-notice" role="note" aria-label="Research session notice">
      <strong>
        Research prototype only. This tool does not diagnose autism and cannot
        determine whether someone is autistic.
      </strong>
    </aside>
  )
}
