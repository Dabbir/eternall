import { applyMention, mentionQuery } from './mentions';

describe('mentions', () => {
  it('finds the @name being typed before the caret', () => {
    expect(mentionQuery('Lunch with @An', 14)).toEqual({ start: 11, query: 'An' });
    expect(mentionQuery('@', 1)).toEqual({ start: 0, query: '' });
    expect(mentionQuery('Saw (@João', 10)).toEqual({ start: 5, query: 'João' });
  });

  it('ignores emails, finished words and text after the caret', () => {
    expect(mentionQuery('mail me@home', 12)).toBeNull();
    expect(mentionQuery('with @Ana today', 15)).toBeNull();
    expect(mentionQuery('with @Ana today', 9)).toEqual({ start: 5, query: 'Ana' });
  });

  it('writes the name as plain text and moves the caret past it', () => {
    expect(applyMention('Lunch with @An', 11, 14, 'Ana Sousa')).toEqual({ text: 'Lunch with Ana Sousa ', caret: 21 });
    expect(applyMention('With @a, then', 5, 7, 'Ana')).toEqual({ text: 'With Ana, then', caret: 8 });
    expect(applyMention('@a', 0, 2, 'Ana', 3)).toEqual({ text: '@a', caret: 2 });
  });
});
