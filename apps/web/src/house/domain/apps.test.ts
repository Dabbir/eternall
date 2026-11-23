import { appsOn, withApp } from './apps';

const none = { hidden: [] as string[] };

describe('appsOn', () => {
  it('starts a new vault with Journal and Money only', () => {
    expect(appsOn(none, [])).toEqual(['amazeen', 'casheen']);
  });
  it('keeps every app that already holds data on, with nothing written', () => {
    expect(appsOn(none, ['kindred', 'refrain'])).toEqual(['amazeen', 'casheen', 'kindred', 'refrain']);
  });
  it('honours the old hidden list until a choice is made, but never hides AMAZEEN', () => {
    expect(appsOn({ hidden: ['kindred', 'amazeen'] }, ['kindred'])).toEqual(['amazeen', 'casheen']);
  });
  it('follows the person’s choice once made, always with AMAZEEN', () => {
    expect(appsOn({ apps: ['marginalia'], hidden: [] }, ['kindred'])).toEqual(['amazeen', 'marginalia']);
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
