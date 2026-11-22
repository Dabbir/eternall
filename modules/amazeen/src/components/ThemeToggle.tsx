import { useRef } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { setPreference, useTheme } from '../lib/theme';
import styles from './ThemeToggle.module.css';

interface ThemeToggleProps {
  /** `vertical`: the lamp hangs inside the spine. `horizontal`: it hangs from a top bar, cord dangling below it. */
  orientation?: 'vertical' | 'horizontal';
  size?: 'regular' | 'small';
  className?: string | undefined;
}

/** Toggle between Day and Night editions, spilling from the centre of an element when given. */
export function toggleTheme(current: 'light' | 'dark', from?: Element | null): void {
  const rect = from?.getBoundingClientRect();
  const visible = rect && rect.width > 0 && rect.height > 0;
  setPreference(current === 'dark' ? 'light' : 'dark', visible ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined);
}

/** The switch currently on screen (the spine's on wide screens, the top bar's on phones). */
export function visibleThemeSwitch(): Element | null {
  return [...document.querySelectorAll('[data-theme-switch]')].find((el) => el.getBoundingClientRect().width > 0) ?? null;
}

const MAX_PULL = 34; // px the cord stretches
const PULL_TO_TOGGLE = 14; // a deliberate pull
const TAP_SLOP = 6; // movement still counted as a tap

/**
 * Day / Night edition as a pull-cord lamp. Pull the cord (drag it down, tap it, or press
 * Space/Enter) and the lights go out; pull again and they come back on. It is a real switch
 * (role="switch"), and the new edition spills out from the bulb as a circle of ink.
 */
export function ThemeToggle({ orientation = 'horizontal', size = 'regular', className }: ThemeToggleProps) {
  const { theme } = useTheme();
  const night = theme === 'dark';
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ y: number; pull: number; pointerId: number } | null>(null);

  const setPull = (px: number): void => {
    ref.current?.style.setProperty('--pull', `${px}px`);
  };

  /** Flip the edition with a tug of the cord and a swing on release. */
  const pullCord = (): void => {
    const el = ref.current;
    if (!el) return;
    toggleTheme(theme, el.querySelector(`.${styles.bulb}`) ?? el);
    el.classList.remove(styles.swing ?? '');
    void el.offsetWidth; // restart the swing animation
    el.classList.add(styles.swing ?? '');
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(12);
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>): void => {
    if (e.button !== 0) return;
    drag.current = { y: e.clientY, pull: 0, pointerId: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    e.currentTarget.dataset.dragging = 'true';
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>): void => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    // Resistance grows as the cord stretches, like the real thing.
    const raw = Math.max(0, e.clientY - d.y);
    d.pull = MAX_PULL * (1 - Math.exp(-raw / MAX_PULL));
    setPull(d.pull);
  };

  const endDrag = (e: PointerEvent<HTMLButtonElement>, cancelled = false): void => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    delete e.currentTarget.dataset.dragging;
    const moved = Math.abs(e.clientY - d.y);
    setPull(0);
    if (!cancelled && (d.pull >= PULL_TO_TOGGLE || moved <= TAP_SLOP)) pullCord();
  };

  // Pointer activation is handled above; keyboard "clicks" (detail === 0) land here.
  const onClick = (e: MouseEvent<HTMLButtonElement>): void => {
    if (e.detail === 0) pullCord();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      pullCord();
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={night}
      aria-label="Night edition"
      aria-keyshortcuts="T"
      title={night ? 'Lights off: night edition. Pull to switch (T)' : 'Lights on: day edition. Pull to switch (T)'}
      className={`${styles.lamp} ${className ?? ''}`}
      data-orientation={orientation}
      data-size={size}
      data-theme-switch=""
      data-theme-state={theme}
      style={{ '--pull': '0px' } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endDrag(e)}
      onPointerCancel={(e) => endDrag(e, true)}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onAnimationEnd={(e) => e.currentTarget.classList.remove(styles.swing ?? '')}
    >
      <span className={styles.fixture} aria-hidden="true">
        <span className={styles.glow} />
        <svg className={styles.shade} viewBox="0 0 40 28">
          <path className={styles.stem} d="M20 0v6" />
          <path className={styles.hood} d="M8 22 C9 12 14 7 20 7 C26 7 31 12 32 22 Z" />
          <path className={styles.rim} d="M6 22h28" />
        </svg>
        <span className={styles.bulb} />
      </span>
      <span className={styles.cord} aria-hidden="true">
        <span className={styles.string} />
        <span className={styles.bead} />
      </span>
      <span className={styles.label} aria-hidden="true">
        {night ? 'Night' : 'Day'}
      </span>
    </button>
  );
}
