import { appsOn, withApp } from './apps';

const none = { hidden: [] as string[] };

describe('appsOn', () => {
  it('starts a new vault with Journal, Money and Practices (ADR 0014)', () => {
    expect(appsOn(none, [])).toEqual(['amazeen', 'casheen', 'routeen']);
  });
  it('keeps every app that already holds data on, with nothing written', () => {
    expect(appsOn({ hidden: ['routeen'] }, [])).toEqual(['amazeen', 'casheen']);
    expect(appsOn({ apps: ['amazeen'], hidden: [] }, ['casheen'])).toEqual(['amazeen']);
  });
  it('honours the old hidden list until a choice is made, but never hides AMAZEEN', () => {
    expect(appsOn({ hidden: ['casheen', 'amazeen'] }, ['casheen'])).toEqual(['amazeen', 'routeen']);
  });
  it('follows the person’s choice once made, always with AMAZEEN', () => {
    expect(appsOn({ apps: ['routeen'], hidden: [] }, ['casheen'])).toEqual(['amazeen', 'routeen']);
  });
});

describe('withApp', () => {
  it('turns an app on or off and retires the hidden list', () => {
    expect(withApp(['amazeen', 'casheen'], 'refrain', true)).toEqual({ apps: ['amazeen', 'casheen', 'refrain'], hidden: [] });
    expect(withApp(['amazeen', 'casheen'], 'casheen', false)).toEqual({ apps: ['amazeen'], hidden: [] });
  });
  it('cannot turn AMAZEEN off', () => {
    expect(withApp(['amazeen'], 'amazeen', false).apps).toEqual(['amazeen']);
  });
});
