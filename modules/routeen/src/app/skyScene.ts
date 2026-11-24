import { letPageScroll, type SceneContext, type SceneHandle } from '@eternall/stage';
import type { ISODate } from '@eternall/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Mode } from '../modes';
import type { Tier } from '../practices';

/**
 * The year as a sky dome (spec §4.6, optional 3D): 52 weeks around the horizon, seven days up the side,
 * each lit day a point of light sized by its brightest tier and each Day off a faint star. Drag to turn it;
 * a click on a point opens that day. The flat year grid is the complete equivalent.
 */
export interface SkyDay {
  date: ISODate;
  light: Tier | null;
  mode: Mode;
}
export interface SkyProps {
  /** The year's days in order, Monday-first weeks, oldest first (as `yearSky` gives them), past and present only. */
  days: SkyDay[];
  colors: { paper: string; ink: string; accent: string };
  onOpen(date: ISODate): void;
}

const RADIUS = 10;
const LOW = (8 * Math.PI) / 180;
const HIGH = (68 * Math.PI) / 180;

/** Where a day sits on the dome: its week turns around the horizon, its weekday climbs from Monday (low) to Sunday (high). */
export function domePosition(week: number, weekday: number): [number, number, number] {
  const az = (week / 52) * Math.PI * 2;
  const el = LOW + (weekday / 6) * (HIGH - LOW);
  return [RADIUS * Math.cos(el) * Math.cos(az), RADIUS * Math.sin(el), RADIUS * Math.cos(el) * Math.sin(az)];
}

type Kind = Tier | 'off' | 'dark';
const SIZE: Record<Kind, number> = { minimum: 0.6, target: 0.9, more: 1.25, off: 0.38, dark: 0.18 };
const OPACITY: Record<Kind, number> = { minimum: 0.9, target: 1, more: 1, off: 0.45, dark: 0.22 };
const kindOf = (d: SkyDay): Kind => d.light ?? (d.mode === 'off' ? 'off' : 'dark');

export default async function createSky(ctx: SceneContext, initial: SkyProps): Promise<SceneHandle<SkyProps>> {
  const { THREE, canvas } = ctx;
  let props = initial;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, ctx.width / ctx.height, 0.1, 200);
  camera.position.set(0, 13, 24);

  // A soft round point, drawn once.
  const dot = document.createElement('canvas');
  dot.width = dot.height = 64;
  const g = dot.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const sprite = new THREE.CanvasTexture(dot);
  sprite.colorSpace = THREE.SRGBColorSpace;

  const root = new THREE.Group();
  scene.add(root);
  const disposables: { dispose(): void }[] = [sprite];
  let clouds: { points: InstanceType<typeof THREE.Points>; dates: ISODate[] }[] = [];

  const build = () => {
    for (const d of disposables.splice(1)) d.dispose();
    root.clear();
    clouds = [];
    const ink = new THREE.Color(props.colors.ink);
    const accent = new THREE.Color(props.colors.accent);
    // The horizon and three faint rings give the dome its shape.
    const ringMat = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.14 });
    disposables.push(ringMat);
    for (const day of [-1, 0, 3, 6]) {
      const pts: InstanceType<typeof THREE.Vector3>[] = [];
      for (let w = 0; w <= 52; w++) {
        const [x, y, z] = domePosition(w, Math.max(0, day));
        // The horizon is Monday's ring pressed flat to the ground.
        pts.push(day < 0 ? new THREE.Vector3(x / Math.cos(LOW), 0, z / Math.cos(LOW)) : new THREE.Vector3(x, y, z));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      disposables.push(geo);
      root.add(new THREE.Line(geo, ringMat));
    }
    const groups = new Map<Kind, { pos: number[]; dates: ISODate[] }>();
    props.days.forEach((d, i) => {
      const k = kindOf(d);
      const grp = groups.get(k) ?? { pos: [], dates: [] };
      grp.pos.push(...domePosition(Math.floor(i / 7), i % 7));
      grp.dates.push(d.date);
      groups.set(k, grp);
    });
    for (const [k, grp] of groups) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(grp.pos, 3));
      const lit = k === 'minimum' || k === 'target' || k === 'more';
      const mat = new THREE.PointsMaterial({ size: SIZE[k], map: sprite, color: lit ? accent : ink, transparent: true, opacity: OPACITY[k], depthWrite: false, sizeAttenuation: true });
      disposables.push(geo, mat);
      const points = new THREE.Points(geo, mat);
      root.add(points);
      clouds.push({ points, dates: grp.dates });
    }
  };
  build();

  const controls = new OrbitControls(camera, canvas);
  // A plain wheel or swipe scrolls the page; Ctrl/⌘ + wheel or a pinch zooms.
  const releaseScroll = letPageScroll(controls, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.target.set(0, 3, 0);
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI / 2 + 0.1;
  controls.minDistance = 8;
  controls.maxDistance = 60;
  // Stand far enough back that the whole dome fits the width, on a phone as on a wide screen.
  const fit = (aspect: number) => {
    const half = Math.atan(Math.tan(((camera.fov / 2) * Math.PI) / 180) * Math.min(1.4, aspect));
    const dist = Math.min(controls.maxDistance, (RADIUS * 1.2) / Math.tan(half) + RADIUS * 0.4);
    const dir = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
  };
  fit(ctx.width / ctx.height);
  controls.update();
  controls.addEventListener('change', () => ctx.animate(() => controls.update()));

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 0.35 };
  const pointer = new THREE.Vector2();
  const pick = (e: PointerEvent): ISODate | null => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    // Every past or present day opens, the faint unlit ones too.
    const hit = raycaster.intersectObjects(clouds.map((c) => c.points), false)[0];
    if (!hit || hit.index === undefined) return null;
    return clouds.find((c) => c.points === hit.object)?.dates[hit.index] ?? null;
  };
  let down: { x: number; y: number } | null = null;
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || down) return;
    canvas.style.cursor = pick(e) ? 'pointer' : 'grab';
  };
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    const wasClick = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5;
    down = null;
    if (!wasClick) return;
    const date = pick(e);
    if (date) props.onOpen(date);
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  return {
    scene,
    camera,
    update(next) {
      const rebuild = next.days !== props.days || next.colors !== props.colors;
      props = next;
      if (rebuild) build();
      ctx.invalidate();
    },
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      fit(w / h);
      controls.update();
    },
    dispose() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      releaseScroll();
      controls.dispose();
      for (const d of disposables) d.dispose();
    },
  };
}
