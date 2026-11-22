import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PerspectiveCamera, OrthographicCamera, Scene, WebGLRenderer } from 'three';

/** What a scene module gets from the stage. */
export interface SceneContext {
  THREE: typeof import('three');
  renderer: WebGLRenderer;
  canvas: HTMLCanvasElement;
  /** Ask for one more frame (render on demand: nothing draws while idle). */
  invalidate(): void;
  /** Run `step(dt)` every frame until it returns false (for animations). */
  animate(step: (dt: number) => boolean): void;
  readonly width: number;
  readonly height: number;
}

export interface SceneHandle<P> {
  scene: Scene;
  camera: PerspectiveCamera | OrthographicCamera;
  update?(props: P): void;
  resize?(width: number, height: number): void;
  dispose?(): void;
}

export type SceneModule<P> = { default: (ctx: SceneContext, props: P) => SceneHandle<P> | Promise<SceneHandle<P>> };

interface Props<P> {
  load: () => Promise<SceneModule<P>>;
  props: P;
  /** Accessible description of what the 3D view shows (the DOM layer carries the interaction). */
  label: string;
  /** Called when the device can't keep up, so the host can fall back to 2D. */
  onDowngrade?(): void;
  className?: string;
  /** Shown while three.js and the scene load. */
  loading?: ReactNode;
}

const FRAME_BUDGET_MS = 33;
/** Development only: `?nobudget` keeps 3D on slow (software-rendered) browsers for visual checks. */
const budgetOff = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('nobudget');
const DOWNGRADE_AFTER_MS = 2000;

/**
 * A lazily-loaded three.js stage (docs/DESIGN.md §6): render on demand, pause when hidden,
 * and hand back to 2D automatically if frames stay above 33 ms for two seconds.
 */
export function Stage3D<P>({ load, props, label, onDowngrade, className = '', loading }: Props<P>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SceneHandle<P> | null>(null);
  const propsRef = useRef(props);
  const downgradeRef = useRef(onDowngrade);
  downgradeRef.current = onDowngrade;
  const invalidateRef = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    propsRef.current = props;
    handleRef.current?.update?.(props);
    invalidateRef.current();
  }, [props]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let renderer: WebGLRenderer | null = null;
    let raf = 0;
    let last = 0;
    let slowSince = 0;
    const steps = new Set<(dt: number) => boolean>();
    let needsFrame = false;
    let cleanupExtra = () => {};

    const frame = (t: number) => {
      raf = 0;
      if (disposed || !renderer || !handleRef.current) return;
      const dt = last ? Math.min(0.1, (t - last) / 1000) : 0.016;
      const elapsed = last ? t - last : 16;
      last = t;
      for (const s of steps) if (!s(dt)) steps.delete(s);
      const start = performance.now();
      renderer.render(handleRef.current.scene, handleRef.current.camera);
      const cost = performance.now() - start;
      // Watch sustained frame time while animating; a slow device goes back to the 2D page.
      if (steps.size && (cost > FRAME_BUDGET_MS || elapsed > FRAME_BUDGET_MS * 1.5)) {
        if (!slowSince) slowSince = t;
        else if (t - slowSince > DOWNGRADE_AFTER_MS && !budgetOff) downgradeRef.current?.();
      } else slowSince = 0;
      if ((steps.size || needsFrame) && !document.hidden) {
        needsFrame = false;
        raf = requestAnimationFrame(frame);
      } else last = 0;
    };
    const invalidate = () => {
      if (disposed) return;
      if (raf) {
        needsFrame = true;
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    invalidateRef.current = invalidate;

    void (async () => {
      try {
        const [THREE, mod] = await Promise.all([import('three'), load()]);
        if (disposed) return;
        const canvas = document.createElement('canvas');
        canvas.className = 'stage3d__canvas';
        canvas.setAttribute('aria-hidden', 'true');
        host.appendChild(canvas);
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        const size = () => ({ w: host.clientWidth || 600, h: host.clientHeight || 400 });
        let { w, h } = size();
        renderer.setSize(w, h, false);
        const ctx: SceneContext = {
          THREE,
          renderer,
          canvas,
          invalidate,
          animate: (s) => {
            steps.add(s);
            invalidate();
          },
          get width() {
            return w;
          },
          get height() {
            return h;
          },
        };
        handleRef.current = await mod.default(ctx, propsRef.current);
        if (disposed) {
          handleRef.current.dispose?.();
          return;
        }
        const ro = new ResizeObserver(() => {
          ({ w, h } = size());
          renderer?.setSize(w, h, false);
          handleRef.current?.resize?.(w, h);
          invalidate();
        });
        ro.observe(host);
        const onVis = () => !document.hidden && invalidate();
        document.addEventListener('visibilitychange', onVis);
        cleanupExtra = () => {
          ro.disconnect();
          document.removeEventListener('visibilitychange', onVis);
        };
        setReady(true);
        invalidate();
      } catch {
        if (!disposed) {
          setFailed(true);
          downgradeRef.current?.();
        }
      }
    })();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      cleanupExtra();
      handleRef.current?.dispose?.();
      handleRef.current = null;
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, [load]);

  return (
    <div ref={hostRef} className={`stage3d ${ready ? 'is-ready' : ''} ${className}`} role="img" aria-label={label}>
      {!ready && !failed && (loading ?? <span className="stage3d__loading" aria-hidden="true" />)}
    </div>
  );
}
