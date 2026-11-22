import type { ImprintDefinition } from '@eternall/core';

export const almanack: ImprintDefinition = {
  id: 'almanack',
  name: 'ALMANACK',
  functionLine: 'Measures & reflections',
  basePath: '/almanack/',
  release: 1,
  accent: { light: '#1f3d6b', dark: '#9db4e8' },
  intro: 'An almanac of your own life: your time measured gently, and what earlier years were doing this very week.',
  load: () => import('./app/AlmanackApp'),
  collections: ['almanack/settings'],
  // ALMANACK reads what the other imprints keep; it holds nothing of its own worth counting.
  hasData: () => false,
};
