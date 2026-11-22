import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'seal' | 'ghost' | 'quiet' | 'danger';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: IconName;
  iconAfter?: IconName;
  busy?: boolean;
  size?: 'm' | 's';
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'ghost', icon, iconAfter, busy = false, size = 'm', className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`btn btn--${variant} btn--${size} ${busy ? 'is-busy' : ''} ${className}`}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? <span className="btn__spinner" aria-hidden="true" /> : icon && <Icon name={icon} size={size === 's' ? 16 : 18} />}
      {children && <span className="btn__label">{children}</span>}
      {iconAfter && !busy && <Icon name={iconAfter} size={size === 's' ? 16 : 18} />}
    </button>
  );
});

export function IconButton({ icon, label, className = '', ...rest }: { icon: IconName; label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`icon-btn ${className}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={18} />
    </button>
  );
}
