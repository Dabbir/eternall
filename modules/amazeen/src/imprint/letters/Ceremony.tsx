import { Seal } from '@eternall/ui';

/**
 * The Letters room's full-screen moment, kin to AMAZEEN's "Filed" stamp: hot wax spreads, the seal
 * comes down with the letter's own fingerprint ring, and the date it opens is set beneath.
 */
export function SealedRite({ fingerprint, initial, opensOn }: { fingerprint: string; initial: string; opensOn: string }) {
  return (
    <div className="amz-rite">
      <span className="amz-rite__wax" />
      <span className="amz-rite__seal">
        <Seal fingerprint={fingerprint} initial={initial} size={180} />
      </span>
      <p className="amz-rite__label">
        <span>Sealed</span> until {opensOn}
      </p>
    </div>
  );
}
