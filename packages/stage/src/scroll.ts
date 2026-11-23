/** The parts of three's OrbitControls this needs (kept structural so the shell never imports three). */
interface ZoomableControls {
  enableZoom: boolean;
}

/**
 * Keep the page scrollable over a 3D scene (docs/DESIGN.md §6: 3D never traps the page).
 * OrbitControls takes every wheel event (`preventDefault`) and sets `touch-action: none`, so a
 * scene filling most of the screen stops the page from scrolling whenever the pointer is over it.
 * After this: a plain wheel scrolls the page; Ctrl/⌘ + wheel (and trackpad pinch, which browsers
 * send as Ctrl + wheel) zooms; vertical swipes scroll on touch screens, horizontal drags turn.
 * Call it right after creating the controls; it returns a cleanup.
 */
export function letPageScroll(controls: ZoomableControls, canvas: HTMLElement): () => void {
  const zoomAllowed = controls.enableZoom;
  canvas.style.touchAction = 'pan-y';
  // Capture runs before OrbitControls' own wheel listener on the same element.
  const onWheel = (e: WheelEvent) => {
    controls.enableZoom = zoomAllowed && (e.ctrlKey || e.metaKey);
  };
  canvas.addEventListener('wheel', onWheel, { capture: true, passive: true });
  return () => {
    canvas.removeEventListener('wheel', onWheel, { capture: true });
    controls.enableZoom = zoomAllowed;
  };
}
