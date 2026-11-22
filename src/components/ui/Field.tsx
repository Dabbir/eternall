import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  count?: { value: number; max: number };
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

function FieldShell({ label, hint, error, count, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined;
  const near = count && count.value > count.max * 0.9;
  return (
    <div className={`field ${error ? 'is-invalid' : ''}`}>
      <div className="field__top">
        <label className="field__label" htmlFor={id}>{label}</label>
        {count && (
          <span className={`field__count mono ${near ? 'is-near' : ''}`} aria-hidden={!near}>
            {count.value.toLocaleString('en-GB')} / {count.max.toLocaleString('en-GB')}
          </span>
        )}
      </div>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p className="field__error" id={errId} role="alert">{error}</p>
      ) : (
        hint && <p className="field__hint" id={hintId}>{hint}</p>
      )}
    </div>
  );
}

type TextProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & { label: string; hint?: ReactNode; error?: string; showCount?: boolean };

export function TextField({ label, hint, error, showCount, maxLength, value, className = '', ...rest }: TextProps) {
  const count = showCount && maxLength ? { value: String(value ?? '').length, max: maxLength } : undefined;
  return (
    <FieldShell label={label} hint={hint} error={error} count={count}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          className={`input ${className}`}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          maxLength={maxLength}
          value={value}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

type AreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & { label: string; hint?: ReactNode; error?: string; showCount?: boolean };

export function TextArea({ label, hint, error, showCount, maxLength, value, className = '', ...rest }: AreaProps) {
  const count = showCount && maxLength ? { value: String(value ?? '').length, max: maxLength } : undefined;
  return (
    <FieldShell label={label} hint={hint} error={error} count={count}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          className={`input input--area ${className}`}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          maxLength={maxLength}
          value={value}
          {...rest}
        />
      )}
    </FieldShell>
  );
}
