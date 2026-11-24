import { LookPicker, useHouse } from '@eternall/kit';
import { CASHEEN_LOOKS } from '../look';
import { useCasheenLook } from './lookContext';

/** "Your book's look" (docs/design/casheen.md §14): four account books, clerks' inks, type, size, density. */
export function LookPage() {
  const house = useHouse();
  const { look, setLook } = useCasheenLook();
  return (
    <>
      <h1 className="lg-month">Your book’s look</h1>
      <p className="lg-note">Choose the book you keep. Every choice applies at once and stays readable; red is kept for “over”. Day or night follows ETERNALL.</p>
      <LookPicker
        spec={CASHEEN_LOOKS}
        look={look}
        onChange={setLook}
        accentLegend="Ink"
        sample={() => (
          <span className="lk-sample">
            <span className="lk-sample__row">
              <span>kopi</span>
              <span className="lg-num">25.000</span>
            </span>
            <span className="lk-sample__row">
              <span>gaji</span>
              <span className="lg-num lk-sample__in">8.000.000</span>
            </span>
            <span className="lk-sample__rule" />
          </span>
        )}
        preview={
          <p className="lk-preview">
            <span className="lk-preview__month">November 2026</span> · Budget: <span className="is-red">over by Rp 9.500</span> · <span className="lg-num">Rp 6.915.500</span> kept
          </p>
        }
      />
      <p className="lg-note">
        <button type="button" className="lg-link" onClick={() => house.navigate(house.href('/'))}>
          Back to the month
        </button>
      </p>
    </>
  );
}
