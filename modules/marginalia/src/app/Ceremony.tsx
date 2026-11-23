/**
 * MARGINALIA's full-screen moments (docs/design/marginalia.md §Ceremony), through `house.ceremony`.
 * The sweep: the line you kept, set large, a highlighter drawn under it and a pencil tick in the
 * margin. Filed: a new catalogue card slides into its drawer.
 */
export function Sweep({ text, source }: { text: string; source: string }) {
  const shown = text.length > 160 ? `${text.slice(0, 159)}…` : text;
  return (
    <div className="mr-sweep">
      <figure className="mr-sweep__page">
        <blockquote className="mr-sweep__quote">
          <span className="mr-sweep__hl">{shown}</span>
        </blockquote>
        <span className="mr-sweep__tick">✓</span>
        <figcaption className="mr-sweep__src">{source}</figcaption>
      </figure>
    </div>
  );
}

export function Filed({ heading, title, under }: { heading: string; title: string; under: string }) {
  return (
    <div className="mr-filed">
      <div className="mr-filed__drawer">
        <span className="mr-filed__label">{under}</span>
        <div className="mr-filed__card">
          <span className="mr-filed__head">{heading}</span>
          <span className="mr-filed__title">{title}</span>
        </div>
      </div>
      <p className="mr-filed__note">Filed under {under}</p>
    </div>
  );
}
