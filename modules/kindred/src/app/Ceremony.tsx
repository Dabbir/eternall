/**
 * KINDRED's full-screen moment (docs/design/kindred.md §Ceremony): a letterpress strike. The name
 * comes down onto card stock like a platen, presses in, leaves a faint ring of ink, and lifts.
 * Rendered through `house.ceremony`, so it is decorative, brief and skipped under reduced motion.
 */
export function Strike({ name, line }: { name: string; line: string }) {
  return (
    <div className="kr-strike">
      <div className="kr-strike__card">
        <span className="kr-strike__ink" />
        <span className="kr-strike__name">{name}</span>
        <span className="kr-strike__line">{line}</span>
      </div>
    </div>
  );
}
