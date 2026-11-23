import { render } from '@testing-library/react';
import { Dialog } from './Dialog';

const locked = () => document.documentElement.classList.contains('has-modal');

describe('Dialog and the page scroll', () => {
  afterEach(() => document.documentElement.classList.remove('has-modal'));

  it('gives the scroll back when a mounted dialog is closed with open={false}', () => {
    const { rerender } = render(<Dialog open title="Search" onClose={() => {}}>x</Dialog>);
    expect(locked()).toBe(true);
    rerender(<Dialog open={false} title="Search" onClose={() => {}}>x</Dialog>);
    expect(locked()).toBe(false);
  });

  it('gives the scroll back when an open dialog is unmounted', () => {
    const { unmount } = render(<Dialog open title="Doors" onClose={() => {}}>x</Dialog>);
    expect(locked()).toBe(true);
    unmount();
    expect(locked()).toBe(false);
  });

  it('keeps the page locked while another dialog is still open', () => {
    render(<Dialog open title="Under" onClose={() => {}}>x</Dialog>);
    const top = render(<Dialog open title="Over" onClose={() => {}}>y</Dialog>);
    top.rerender(<Dialog open={false} title="Over" onClose={() => {}}>y</Dialog>);
    expect(locked()).toBe(true);
  });
});
