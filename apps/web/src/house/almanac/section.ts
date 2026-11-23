import type { HouseSection } from '@eternall/core';

/**
 * Almanac, a house section (once the ALMANACK imprint; docs/adr/0011). It reads what everything
 * else keeps; its only record is `almanack/settings`, kept at its old path.
 */
export const almanacSection: HouseSection = {
  id: 'almanac',
  name: 'Almanac',
  functionLine: 'Measures & reflections',
  href: '/almanac',
  accent: { light: '#1f3d6b', dark: '#9db4e8' },
  collections: ['almanack/settings'],
  hasData: () => false,
};
