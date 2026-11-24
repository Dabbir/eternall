/**
 * People's full-screen moment (docs/design/amazeen.md §14): **Pinned**. A card drops onto the cork,
 * a riso pin goes in, and the name settles with a small line beneath. Played through
 * `house.ceremony`: decorative, brief and skipped under reduced motion.
 */
export function Pinned({ name, line }: { name: string; line: string }) {
  return (
    <div className="pp-pinned">
      <div className="pp-pinned__card">
        <span className="pp-pinned__pin" />
        <span className="pp-pinned__name">{name}</span>
        <span className="pp-pinned__line">{line}</span>
      </div>
    </div>
  );
}
