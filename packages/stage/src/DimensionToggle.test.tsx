import { render, screen } from '@testing-library/react';
import { DimensionToggle } from './DimensionToggle';

describe('DimensionToggle', () => {
  it('says Flat and 3D unless the app names its views', () => {
    render(<DimensionToggle value="2d" onChange={() => {}} allowed reason="ok" />);
    expect(screen.getByRole('button', { name: 'Flat' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '3D' })).toBeTruthy();
  });

  it('takes both labels from the app, and keeps the reason when 3D is off', () => {
    render(<DimensionToggle value="2d" onChange={() => {}} allowed={false} reason="reduced-motion" label2d="Level" label3d="Dome" />);
    expect(screen.getByRole('button', { name: 'Level' })).toBeTruthy();
    const dome = screen.getByRole('button', { name: 'Dome' }) as HTMLButtonElement;
    expect(dome.disabled).toBe(true);
    expect(dome.title).toBe('Your device asks for reduced motion.');
  });
});
