import { formatMedium, type ISODate } from '@eternall/core';
import { Seal } from '@eternall/ui';

/** A circular postmark that carries a date, as real post does. */
export function Postmark({ date, label = 'SEALED', size = 84 }: { date: ISODate; label?: string; size?: number }) {
  const d = formatMedium(date).toUpperCase();
  const id = `pm-${date}-${label}`.replace(/[^a-z0-9-]/gi, '');
  return (
    <svg className="envoi-postmark" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <defs>
        <path id={id} d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <text fontSize="9.5" letterSpacing="2.4" fill="currentColor" fontFamily="var(--font-mono)">
        <textPath href={`#${id}`} startOffset="2%">
          {label} · AMAZEEN · {label} · THE POST ROOM ·
        </textPath>
      </text>
      <text x="50" y="47" textAnchor="middle" fontSize="8.5" fill="currentColor" fontFamily="var(--font-mono)">
        {d.split(' ').slice(0, 2).join(' ')}
      </text>
      <text x="50" y="60" textAnchor="middle" fontSize="11" fill="currentColor" fontFamily="var(--font-mono)" fontWeight="700">
        {d.split(' ')[2]}
      </text>
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M96 ${38 + i * 8} q 10 -3 22 0 t 22 0`} fill="none" stroke="currentColor" strokeWidth="1.4" />
      ))}
    </svg>
  );
}

interface EnvelopeProps {
  title: string;
  to: string;
  opensOn: ISODate;
  sealedOn: ISODate;
  fingerprint: string;
  initial: string;
  /** 0–1 of the wait elapsed; drawn as the airmail border filling in. */
  progress?: number;
  size?: 's' | 'm' | 'l';
  state: 'sealed' | 'ready' | 'opened';
}

/** The front of an airmail envelope: chevron border, address label, postmark, wax seal. */
export function Envelope({ title, to, opensOn, sealedOn, fingerprint, initial, progress, size = 'm', state }: EnvelopeProps) {
  return (
    <div className={`envoi-envelope envoi-envelope--${size} is-${state}`} style={progress !== undefined ? { ['--p' as string]: progress } : undefined}>
      <div className="envoi-envelope__inner">
        <div className="envoi-envelope__label">
          <span className="envoi-envelope__to">To: {to}</span>
          <span className="envoi-envelope__title">{title}</span>
          <span className="envoi-envelope__opens">{state === 'opened' ? `Opened · sent ${formatMedium(sealedOn)}` : `Do not open before ${formatMedium(opensOn)}`}</span>
        </div>
        <div className="envoi-envelope__stamp" aria-hidden="true">
          <span>A</span>
        </div>
        <div className="envoi-envelope__postmark">
          <Postmark date={sealedOn} size={size === 's' ? 52 : 74} />
        </div>
        {state !== 'opened' && (
          <div className="envoi-envelope__seal">
            <Seal fingerprint={fingerprint} initial={initial} size={size === 's' ? 30 : size === 'm' ? 44 : 64} />
          </div>
        )}
      </div>
      {progress !== undefined && state === 'sealed' && <span className="envoi-envelope__progress" aria-hidden="true" />}
    </div>
  );
}
