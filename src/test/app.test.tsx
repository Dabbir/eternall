import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { fingerprintOf } from '../domain/capsule';
import { addDays, addYears, todayISO } from '../domain/time';
import { EMPTY_DATA, type AppData } from '../domain/types';
import { STORAGE_KEY } from '../store/persistence';

const today = todayISO();

function seed(data: Partial<AppData>) {
  const archive: AppData = {
    ...EMPTY_DATA,
    profile: { name: 'Ada', birthDate: addYears(today, -30), horizonYears: 90, createdAt: new Date().toISOString() },
    ...data,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
  return archive;
}

function reducedMotion() {
  window.matchMedia = ((q: string) => ({
    matches: q.includes('reduce'),
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  window.location.hash = '#/';
  reducedMotion();
});

describe('onboarding', () => {
  it('walks a new person from welcome to their lifeline', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Begin your lifeline' }));

    // Empty name is rejected.
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/can’t be empty/);

    await user.type(screen.getByLabelText(/what should we call you/i), 'Ada');
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    const birth = screen.getByLabelText(/When were you born, Ada/);
    fireEvent.change(birth, { target: { value: addDays(today, 3) } });
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/future/);

    fireEvent.change(birth, { target: { value: addYears(today, -30) } });
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.click(screen.getByRole('button', { name: /Draw my lifeline/ }));

    expect(await screen.findByText(/This is your life in weeks/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Enter ETERNALL/ }));
    expect(await screen.findByRole('heading', { level: 1, name: /Ada, this is week/ })).toBeInTheDocument();
    // Saved for next time.
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').profile?.name).toBe('Ada'));
  });
});

describe('inscriptions', () => {
  it('inscribes this week, then removes and restores it with undo', async () => {
    const user = userEvent.setup();
    seed({});
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Inscribe this week' }));
    const dialog = await screen.findByRole('dialog', { name: 'Inscribe a memory' });

    // Validation: title and tone are required.
    await user.click(within(dialog).getByRole('button', { name: 'Inscribe' }));
    expect(within(dialog).getByText('Title can’t be empty.')).toBeInTheDocument();
    expect(within(dialog).getByText('Choose a tone.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Title'), 'First swim of the year');
    await user.click(within(dialog).getByLabelText('Joy'));
    await user.click(within(dialog).getByRole('button', { name: 'Inscribe' }));

    expect(await screen.findByText(/Inscribed into week/)).toBeInTheDocument();
    const memory = await screen.findByRole('button', { name: /First swim of the year/ });

    await user.click(memory);
    const edit = await screen.findByRole('dialog', { name: 'Edit inscription' });
    await user.click(within(edit).getByRole('button', { name: 'Remove' }));
    await user.click(within(edit).getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /First swim of the year/ })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByRole('button', { name: /First swim of the year/ })).toBeInTheDocument();
  });

  it('guards unsaved writing before closing', async () => {
    const user = userEvent.setup();
    seed({});
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Inscribe this week' }));
    const dialog = await screen.findByRole('dialog', { name: 'Inscribe a memory' });
    await user.type(within(dialog).getByLabelText('Title'), 'Half a thought');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(within(dialog).getByText('Discard what you’ve written?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Keep writing' }));
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Half a thought');
  });

  it('filters the archive by search and shows a no-results state', async () => {
    const user = userEvent.setup();
    const stamp = new Date().toISOString();
    seed({
      inscriptions: [
        { id: 'a', date: addDays(today, -40), title: 'Lisbon with Mum', body: 'Custard tarts.', tone: 'joy', createdAt: stamp, updatedAt: stamp },
        { id: 'b', date: addDays(today, -400), title: 'Moving day', body: 'Boxes everywhere.', tone: 'bold', createdAt: stamp, updatedAt: stamp },
      ],
    });
    window.location.hash = '#/archive';
    render(<App />);
    const search = await screen.findByPlaceholderText(/Search titles/);
    await user.type(search, 'tarts');
    await waitFor(() => expect(screen.queryByText('Moving day')).not.toBeInTheDocument());
    expect(screen.getByText('Lisbon with Mum')).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, 'zzzz');
    expect(await screen.findByText('Nothing matches.')).toBeInTheDocument();
  });
});

describe('capsules', () => {
  it('never renders a sealed letter’s contents', async () => {
    const contents = { title: 'For later', body: 'THE SECRET BODY', sealedOn: addDays(today, -10), opensOn: addYears(today, 2) };
    seed({ capsules: [{ id: 'c1', ...contents, fingerprint: await fingerprintOf(contents), openedAt: null }] });
    window.location.hash = '#/capsules';
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: /For later/ }));
    expect(within(await screen.findByRole('dialog')).getByText(/Opens in 2 years/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('THE SECRET BODY');
  });

  it('opens a ready capsule and verifies its seal', async () => {
    const contents = { title: 'Hello again', body: 'You made it.', sealedOn: addDays(today, -400), opensOn: addDays(today, -1) };
    seed({ capsules: [{ id: 'c2', ...contents, fingerprint: await fingerprintOf(contents), openedAt: null }] });
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Open it' }));
    await user.click(await screen.findByRole('button', { name: 'Break the seal' }));
    expect(await screen.findByText('You made it.')).toBeInTheDocument();
    expect(screen.getByText(/Seal intact/)).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).capsules[0].openedAt).not.toBeNull());
  });

  it('seals a new letter for the selected future week', async () => {
    const user = userEvent.setup();
    seed({});
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Write to the future' }));
    const dialog = await screen.findByRole('dialog', { name: 'A letter to your future self' });
    await user.type(within(dialog).getByLabelText('Title'), 'Open in a year');
    await user.type(within(dialog).getByLabelText('Your letter'), 'Hi.');
    await user.click(within(dialog).getByRole('button', { name: 'In one year' }));
    expect(within(dialog).getByText(/in 1 year/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Seal letter' }));
    expect(await screen.findByText('Sealed.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Sealed until/)).toBeInTheDocument(), { timeout: 2000 });
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
      expect(saved.capsules).toHaveLength(1);
      expect(saved.capsules[0]).toMatchObject({ title: 'Open in a year', opensOn: addYears(today, 1), openedAt: null });
      expect(saved.capsules[0].fingerprint).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});

describe('recovery and shortcuts', () => {
  it('pauses on damaged storage instead of overwriting it', () => {
    window.localStorage.setItem(STORAGE_KEY, '{"version":1,"profile":{"name":""}}');
    render(<App />);
    expect(screen.getByText('Your archive couldn’t be read.')).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"name":""');
  });

  it('opens the command palette with Ctrl+K and jumps to a date', async () => {
    const user = userEvent.setup();
    seed({});
    render(<App />);
    await screen.findByRole('heading', { level: 1 });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    });
    const input = await screen.findByRole('combobox', { name: /Search commands/ });
    await user.type(input, addYears(today, -5));
    expect(screen.getByRole('option', { name: /Jump to the week of/ })).toBeInTheDocument();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(window.location.hash).toMatch(/week=\d+/));
  });
});
