import { useEffect, useRef, type ReactNode } from 'react';
import { IconButton } from './Button';

interface Props {
  open: boolean;
  /** Called for Esc, backdrop click and the close button. The parent decides whether to actually close. */
  onClose: () => void;
  title: string;
  eyebrow?: ReactNode;
  hideTitle?: boolean;
  size?: 'm' | 'l' | 'stage';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Native <dialog> gives us focus trapping, inertness of the page and Esc handling for free.
 * We only add animation and route all dismissals through `onClose`.
 */
/** Remove the page's scroll lock when no dialog other than `self` is open. */
function releaseScrollLock(self: HTMLDialogElement) {
  const others = [...document.querySelectorAll('dialog[open]')].some((d) => d !== self);
  if (!others) document.documentElement.classList.remove('has-modal');
}

export function Dialog({ open, onClose, title, eyebrow, hideTitle, size = 'm', children, footer, className = '' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useRef(`dlg-${Math.random().toString(36).slice(2)}`).current;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      document.documentElement.classList.add('has-modal');
      // showModal() focuses the first focusable element (the close button), overriding React's autoFocus.
      // Move focus to the first meaningful control instead: a field, then an action.
      // A control marked `data-autofocus` (e.g. the checked choice) wins.
      const target = el.querySelector<HTMLElement>('.dialog__body [data-autofocus]:not([disabled])') ?? el.querySelector<HTMLElement>(
        '.dialog__body :is(input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea):not([disabled]), .dialog__body button:not([disabled]), .dialog__foot button:not([disabled])',
      );
      target?.focus();
    } else if (!open && el.open) {
      el.close();
    }
    // Closing must hand the page its scroll back, unless another dialog is still open. (Before, a
    // dialog kept mounted and closed through `open={false}` left `has-modal` on: the page froze.)
    if (!open) releaseScrollLock(el);
    return () => {
      if (!el.isConnected || !el.open) releaseScrollLock(el);
    };
  }, [open]);

  // However it closes (Esc, a form, the browser), the page gets its scroll back.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClosed = () => releaseScrollLock(el);
    el.addEventListener('close', onClosed);
    return () => {
      el.removeEventListener('close', onClosed);
      releaseScrollLock(el);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener('cancel', onCancel);
    return () => el.removeEventListener('cancel', onCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${size} ${className}`}
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        // Only a press that starts on the backdrop (the dialog element itself) dismisses.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && (
        <div className="dialog__panel">
          <header className={`dialog__head ${hideTitle ? 'is-hidden' : ''}`}>
            <div>
              {eyebrow && !hideTitle && <p className="eyebrow">{eyebrow}</p>}
              <h2 id={titleId} className={hideTitle ? 'visually-hidden' : 'display dialog__title'}>{title}</h2>
            </div>
            <IconButton icon="close" label="Close" onClick={onClose} className="dialog__close" />
          </header>
          <div className="dialog__body">{children}</div>
          {footer && <footer className="dialog__foot">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
