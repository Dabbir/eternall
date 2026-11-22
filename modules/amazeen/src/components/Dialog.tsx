import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import ui from './ui.module.css';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}

/**
 * Modal built on the native <dialog> element: focus trapping, Escape-to-close,
 * inert background and top-layer stacking come from the platform.
 */
export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    } else if (!open && el.open) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
  }, [open]);

  return (
    // Backdrop clicks land on the <dialog> itself; keyboard users close it with Escape (onCancel).
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={ui.dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
    >
      {open && (
        <div className={ui.dialogBody}>
          <h2 id={titleId} className={ui.dialogTitle}>
            {title}
          </h2>
          {children}
          {actions && <div className={ui.dialogActions}>{actions}</div>}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = 'Keep editing', tone = 'default', onConfirm, onCancel }: ConfirmProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      actions={
        <>
          <button type="button" className={`${ui.btn} ${ui.quiet}`} onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button type="button" className={`${ui.btn} ${tone === 'danger' ? ui.danger : ui.dark}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className={ui.dialogText}>{message}</p>
    </Dialog>
  );
}
