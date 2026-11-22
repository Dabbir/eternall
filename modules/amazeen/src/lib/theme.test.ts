import { beforeEach, describe, expect, it } from 'vitest';
import { readPreference, resolveTheme, setPreference, THEME_KEY } from './theme';

describe('theme preference', () => {
  beforeEach(() => {
    setPreference('system');
  });

  it('defaults to following the system, which is day when the system says nothing', () => {
    expect(readPreference()).toBe('system');
    expect(resolveTheme('system')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('applies and remembers an explicit edition', () => {
    setPreference('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(readPreference()).toBe('dark');

    setPreference('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
  });

  it('forgets the choice when going back to system, and ignores junk in storage', () => {
    setPreference('dark');
    setPreference('system');
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
    localStorage.setItem(THEME_KEY, 'sepia');
    expect(readPreference()).toBe('system');
  });
});
