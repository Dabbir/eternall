import type { ReactNode } from 'react';
import { useHouse } from '@eternall/kit';

/** A link inside ROUTEEN: a real href for the keyboard and new tabs, navigated in place on a plain click. */
export function Go({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const house = useHouse();
  const href = house.href(to);
  return (
    <a
      className={className}
      href={href}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        house.navigate(href);
      }}
    >
      {children}
    </a>
  );
}
