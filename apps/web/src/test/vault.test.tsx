import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { todayISO } from '@eternall/core';
import { openVaultDb } from '@eternall/vault';
import { Root } from '../shell/Root';

const today = todayISO();

function at(path: string) {
  window.history.replaceState(null, '', path);
}

beforeEach(() => {
  window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
});

async function inscribe(user: ReturnType<typeof userEvent.setup>, title: string) {
  const dialog = await screen.findByRole('dialog', { name: 'Inscribe a memory' });
  await user.type(within(dialog).getByLabelText('Title'), title);
  await user.click(within(dialog).getByLabelText('Joy'));
  await user.click(within(dialog).getByRole('button', { name: 'Inscribe' }));
}

describe('the vault, end to end', () => {
  it('asks to lock on the first thing kept, issues a recovery kit, and stores only ciphertext', async () => {
    const user = userEvent.setup();
    const idb = new IDBFactory();
    at(`/inscriptions?new=1&date=${today}`);
    const { unmount } = render(<Root idb={idb} />);
    await inscribe(user, 'A very private memory');

    const setup = await screen.findByRole('dialog', { name: /lock it to you/ });
    await user.click(within(setup).getByRole('button', { name: /Set a passphrase/ }));
    await user.type(within(setup).getByLabelText('Passphrase'), 'four ordinary words here');
    await user.type(within(setup).getByLabelText('Type it again'), 'four ordinary words here');
    await user.click(within(setup).getByRole('button', { name: 'Lock my vault' }));

    // PBKDF2 at full strength takes a moment.
    const kit = await screen.findByRole('dialog', { name: 'Your recovery key' }, { timeout: 15000 });
    const key = within(kit).getByText(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){6}$/).textContent!;
    await user.type(within(kit).getByLabelText(/characters 5 to 8/), key.slice(5, 9));
    await user.click(within(kit).getByRole('button', { name: 'I’ve saved it' }));

    await waitFor(async () => {
      const db = await openVaultDb(idb);
      const records = await db.allRecords();
      expect(records.length).toBeGreaterThan(0);
      expect(JSON.stringify(records)).not.toContain('private memory');
      expect(JSON.stringify(records)).not.toContain('house/inscription');
    });
    expect(JSON.stringify({ ...window.localStorage })).not.toContain('private memory');
    unmount();

    // Coming back: the threshold asks for the passphrase.
    at('/inscriptions');
    render(<Root idb={idb} />);
    expect(await screen.findByRole('heading', { name: 'Your archive is locked.' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Passphrase'), 'wrong passphrase');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByText(/didn’t open the vault/, {}, { timeout: 15000 })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Passphrase'));
    await user.type(screen.getByLabelText('Passphrase'), 'four ordinary words here');
    await user.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByText('A very private memory', {}, { timeout: 15000 })).toBeInTheDocument();
  }, 60000);

  it('opens silently next time when the person skipped the lock (device key)', async () => {
    const user = userEvent.setup();
    const idb = new IDBFactory();
    at(`/inscriptions?new=1&date=${today}`);
    const { unmount } = render(<Root idb={idb} />);
    await inscribe(user, 'Kept on this device');
    const setup = await screen.findByRole('dialog', { name: /lock it to you/ });
    await user.click(within(setup).getByRole('button', { name: /Skip for now/ }));
    const kit = await screen.findByRole('dialog', { name: 'Your recovery key' });
    await user.click(within(kit).getByRole('button', { name: 'I’ll save it later' }));
    await waitFor(async () => expect((await (await openVaultDb(idb)).allRecords()).length).toBeGreaterThan(0));
    unmount();

    at('/inscriptions');
    render(<Root idb={idb} />);
    expect(await screen.findByText('Kept on this device')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Lock now' })).not.toBeInTheDocument();
  }, 30000);

  it('keeps writing in memory, with a clear warning, if the person postpones the lock', async () => {
    const user = userEvent.setup();
    at(`/inscriptions?new=1&date=${today}`);
    render(<Root idb={new IDBFactory()} />);
    await inscribe(user, 'Not yet locked');
    const setup = await screen.findByRole('dialog', { name: /lock it to you/ });
    await user.click(within(setup).getByRole('button', { name: 'Close' }));
    expect(await screen.findByText(/Not locked yet/)).toBeInTheDocument();
    expect(screen.getByText('Not yet locked')).toBeInTheDocument();
  });
});
