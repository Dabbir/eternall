import { createContext, useContext, useEffect } from 'react';
import { isDefaultLook, lookCss, type Look } from './look';

/** The person's look for their edition, and a way to change it (inside ETERNALL only). */
export interface LookControls {
  look: Look;
  setLook(look: Look): void;
}
export const LookContext = createContext<LookControls | null>(null);
export const useLook = (): LookControls | null => useContext(LookContext);

/**
 * Wear a look while AMAZEEN is open: one stylesheet for light and dark, and `data-look` on the
 * app's root, both removed when AMAZEEN closes. The default look adds nothing.
 */
export function useApplyLook(look: Look): void {
  const css = isDefaultLook(look) ? '' : lookCss(look);
  useEffect(() => {
    if (!css) return;
    const style = document.createElement('style');
    style.dataset.amazeenLook = '';
    style.textContent = css;
    document.head.appendChild(style);
    document.body.dataset.look = '';
    return () => {
      style.remove();
      delete document.body.dataset.look;
    };
  }, [css]);
}
