import type { SceneContext, SceneHandle } from '@eternall/stage';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * The life coil (docs/design/eternall.md §6): every week of a life wound into a rising helix,
 * one turn per year, decades as visible gaps. Colours come from the same lifeline model as the
 * flat page; selection is shared with the week panel and the keyboard.
 */
export interface CoilProps {
  rows: number;
  now: number;
  /** One solid colour per week index. */
  colors: readonly string[];
  selected: number;
  ink: string;
  paper: string;
  seal: string;
  onSelect(index: number): void;
}

const WEEKS = 52;
const R = 9;
const PITCH = 1.18;
const DECADE_GAP = 0.9;

function helix(i: number) {
  const age = Math.floor(i / WEEKS);
  const week = i % WEEKS;
  const theta = (week / WEEKS) * Math.PI * 2 - Math.PI / 2;
  const y = -(age + week / WEEKS) * PITCH - Math.floor(age / 10) * DECADE_GAP;
  return { x: Math.cos(theta) * R, y, z: Math.sin(theta) * R, rot: -theta + Math.PI / 2 };
}

function flat(i: number) {
  const age = Math.floor(i / WEEKS);
  const week = i % WEEKS;
  return { x: (week - WEEKS / 2) * 1.1, y: -age * PITCH - Math.floor(age / 10) * DECADE_GAP, z: R, rot: 0 };
}

export default function createCoil(ctx: SceneContext, initial: CoilProps): SceneHandle<CoilProps> {
  const { THREE, canvas } = ctx;
  let props = initial;
  const count = props.rows * WEEKS;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(new THREE.Color(props.paper), 28, 70);
  const camera = new THREE.PerspectiveCamera(42, ctx.width / ctx.height, 0.1, 400);

  scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(props.ink), 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(12, 20, 16);
  scene.add(sun);

  const cell = (2 * Math.PI * R) / WEEKS;
  const geometry = new THREE.BoxGeometry(cell * 0.82, PITCH * 0.78, 0.22);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.02 });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  const dummy = new THREE.Object3D();
  const place = (t: number) => {
    const e = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
    for (let i = 0; i < count; i++) {
      // Rows wind into the coil one after another, so the life appears to wrap itself up.
      const row = Math.floor(i / WEEKS);
      const local = Math.min(1, Math.max(0, e * 1.6 - (row / props.rows) * 0.6));
      const a = flat(i);
      const b = helix(i);
      dummy.position.set(a.x + (b.x - a.x) * local, a.y + (b.y - a.y) * local, a.z + (b.z - a.z) * local);
      dummy.rotation.set(0, a.rot + (b.rot - a.rot) * local, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  const colorCache = new Map<string, InstanceType<typeof THREE.Color>>();
  const paint = () => {
    for (let i = 0; i < count; i++) {
      const css = props.colors[i] ?? props.paper;
      let c = colorCache.get(css);
      if (!c) {
        c = new THREE.Color(css);
        colorCache.set(css, c);
      }
      mesh.setColorAt(i, c);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  paint();

  // Outlines for the selected and hovered weeks.
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(cell * 0.98, PITCH * 0.96, 0.4));
  const selectedLine = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: new THREE.Color(props.ink) }));
  const hoverLine = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: new THREE.Color(props.ink), transparent: true, opacity: 0.45 }));
  hoverLine.visible = false;
  scene.add(selectedLine, hoverLine);
  const mark = (line: typeof selectedLine, i: number) => {
    const p = helix(i);
    line.position.set(p.x, p.y, p.z);
    line.rotation.set(0, p.rot, 0);
  };
  mark(selectedLine, props.selected);

  const yNow = helix(props.now).y;
  camera.position.set(0, yNow + 6, 38);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, yNow, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = true;
  controls.minDistance = 8;
  controls.maxDistance = 80;
  controls.update();
  controls.addEventListener('change', () => ctx.animate(() => controls.update()));

  // Pointer: hover and click-to-select (a drag is not a click).
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down: { x: number; y: number } | null = null;
  const pick = (e: PointerEvent): number | null => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(mesh, false)[0];
    return hit?.instanceId ?? null;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || down) return;
    const i = pick(e);
    hoverLine.visible = i !== null && i !== props.selected;
    if (i !== null) mark(hoverLine, i);
    canvas.style.cursor = i !== null ? 'pointer' : 'grab';
    ctx.invalidate();
  };
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) {
      const i = pick(e);
      if (i !== null) props.onSelect(i);
    }
    down = null;
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  // The intro: the flat page lifts and winds into the coil.
  let t = 0;
  place(0);
  ctx.animate((dt) => {
    t = Math.min(1, t + dt / 1.2);
    place(t);
    return t < 1;
  });

  return {
    scene,
    camera,
    update(next) {
      const recolor = next.colors !== props.colors;
      const moved = next.selected !== props.selected;
      props = next;
      if (recolor) {
        scene.fog = new THREE.Fog(new THREE.Color(next.paper), 28, 70);
        (selectedLine.material as InstanceType<typeof THREE.LineBasicMaterial>).color.set(next.ink);
        paint();
      }
      if (moved) {
        mark(selectedLine, next.selected);
        // Glide the view to the chosen week, keeping the current angle.
        const target = helix(next.selected).y;
        const from = controls.target.y;
        let k = 0;
        ctx.animate((dt) => {
          k = Math.min(1, k + dt / 0.5);
          const y = from + (target - from) * (1 - Math.pow(1 - k, 3));
          camera.position.y += y - controls.target.y;
          controls.target.y = y;
          controls.update();
          return k < 1;
        });
      }
      ctx.invalidate();
    },
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    dispose() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      edges.dispose();
    },
  };
}
