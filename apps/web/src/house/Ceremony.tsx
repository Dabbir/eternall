/**
 * The house's full-screen moments (docs/design/eternall.md §6), through `house.ceremony`.
 * Carved: an inscription is cut into the page, letter by letter, and sealed with the house's dot.
 * Shelved: a new chapter's book slides onto the shelf in its own cloth.
 */
export function Carved({ title, when }: { title: string; when: string }) {
  return (
    <div className="hr-carved">
      <p className="hr-carved__title">
        <span className="hr-carved__text">{title}</span>
        <span className="hr-carved__seal" />
      </p>
      <p className="hr-carved__when">{when}</p>
    </div>
  );
}

export function Shelved({ title, color }: { title: string; color: string }) {
  return (
    <div className="hr-shelved">
      <div className="hr-shelved__shelf">
        <span className="hr-shelved__book" style={{ ['--cloth' as string]: color }}>
          <span className="hr-shelved__title">{title}</span>
        </span>
        <span className="hr-shelved__plank" />
      </div>
      <p className="hr-shelved__note">A new chapter on the shelf</p>
    </div>
  );
}
