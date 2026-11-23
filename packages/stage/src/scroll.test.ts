import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PerspectiveCamera } from 'three';
import { letPageScroll } from './scroll';

const wheel = (canvas: HTMLElement, init: WheelEventInit = {}) => {
  const e = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true, ...init });
  canvas.dispatchEvent(e);
  return e;
};

describe('letPageScroll', () => {
  it('without it, OrbitControls swallows the wheel and touch scrolling (the bug)', () => {
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    const controls = new OrbitControls(new PerspectiveCamera(), canvas);
    expect(wheel(canvas).defaultPrevented).toBe(true);
    expect(canvas.style.touchAction).toBe('none');
    controls.dispose();
  });

  it('lets a plain wheel scroll the page, zooms on Ctrl/⌘ + wheel or a trackpad pinch', () => {
    const canvas = document.createElement('canvas');
    document.body.append(canvas);
    const controls = new OrbitControls(new PerspectiveCamera(), canvas);
    const release = letPageScroll(controls, canvas);
    expect(wheel(canvas).defaultPrevented).toBe(false);
    expect(wheel(canvas, { ctrlKey: true }).defaultPrevented).toBe(true);
    expect(wheel(canvas, { metaKey: true }).defaultPrevented).toBe(true);
    expect(wheel(canvas).defaultPrevented).toBe(false);
    // Vertical swipes scroll the page on touch screens; horizontal drags still turn the scene.
    expect(canvas.style.touchAction).toBe('pan-y');
    release();
    controls.dispose();
  });

  it('keeps zoom off for scenes that turned it off', () => {
    const canvas = document.createElement('canvas');
    const controls = new OrbitControls(new PerspectiveCamera(), canvas);
    controls.enableZoom = false;
    letPageScroll(controls, canvas);
    expect(wheel(canvas, { ctrlKey: true }).defaultPrevented).toBe(false);
    controls.dispose();
  });
});
