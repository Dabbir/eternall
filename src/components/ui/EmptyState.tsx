import type { ReactNode } from 'react';

export function EmptyState({ art, title, children, action }: { art?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty rise">
      {art && <div className="empty__art" aria-hidden="true">{art}</div>}
      <h3 className="display empty__title">{title}</h3>
      {children && <p className="empty__body muted">{children}</p>}
      {action && <div className="empty__action">{action}</div>}
    </div>
  );
}

/** A small decorative fragment of the lifeline used in empty states. */
export function GridArt({ filled = 9, total = 21, accent = -1 }: { filled?: number; total?: number; accent?: number }) {
  const cols = 7;
  return (
    <svg viewBox={`0 0 ${cols * 12} ${Math.ceil(total / cols) * 12}`} width={cols * 12} className="grid-art">
      {Array.from({ length: total }, (_, i) => {
        const x = (i % cols) * 12;
        const y = Math.floor(i / cols) * 12;
        if (i === accent) return <circle key={i} cx={x + 4.5} cy={y + 4.5} r="4" fill="var(--seal)" />;
        return <rect key={i} x={x} y={y} width="9" height="9" rx="2" fill={i < filled ? 'var(--cell-lived)' : 'var(--cell-future)'} />;
      })}
    </svg>
  );
}
