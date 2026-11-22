import type { SceneContext, SceneHandle } from '@eternall/stage';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * FOLIO's bookshelf in the round (docs/design/folio.md §6): one plank per decade, each chapter a
 * cloth-bound volume with its title stamped in gilt. Choosing a book pulls it off the shelf.
 */
export interface ShelfBook {
  id: string;
  title: string;
  color: string;
  /** Relative thickness (from the chapter's length). */
  width: number;
  ongoing: boolean;
  blank: boolean;
}
export interface ShelfProps {
  shelves: { label: string; books: ShelfBook[] }[];
  gilt: string;
  plank: string;
  ink: string;
  onOpen(id: string): void;
}

const HEIGHT = 2.4;
const DEPTH = 1.6;
const ROW = 3.4;

export default async function createShelf(ctx: SceneContext, initial: ShelfProps): Promise<SceneHandle<ShelfProps>> {
  // Gilt titles are drawn into textures, so wait for the binding face to be ready.
  await document.fonts?.load('600 32px Cinzel').catch(() => undefined);
  const { THREE, canvas } = ctx;
  let props = initial;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, ctx.width / ctx.height, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x2a1d12, 1.4));
  const lamp = new THREE.PointLight(0xffe2b0, 60, 40, 1.6);
  lamp.position.set(2, 6, 8);
  scene.add(lamp);

  const root = new THREE.Group();
  scene.add(root);
  const books: { mesh: InstanceType<typeof THREE.Mesh>; id: string; home: InstanceType<typeof THREE.Vector3>; blank: boolean }[] = [];
  const disposables: { dispose(): void }[] = [];

  const spineTexture = (title: string, color: string, gilt: string, w: number) => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 640;
    const g = c.getContext('2d')!;
    g.fillStyle = color;
    g.fillRect(0, 0, 128, 640);
    g.strokeStyle = gilt;
    g.lineWidth = 3;
    for (const y of [60, 72, 568, 580]) {
      g.beginPath();
      g.moveTo(18, y);
      g.lineTo(110, y);
      g.stroke();
    }
    g.save();
    g.translate(64, 320);
    g.rotate(-Math.PI / 2);
    g.fillStyle = gilt;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const size = Math.max(22, Math.min(38, 34 * Math.min(1.4, w)));
    g.font = `600 ${size}px Cinzel, Georgia, serif`;
    const text = title.toUpperCase();
    g.fillText(text.length > 22 ? `${text.slice(0, 21)}…` : text, 0, 0);
    g.restore();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    disposables.push(tex);
    return tex;
  };

  const build = () => {
    root.clear();
    books.length = 0;
    const plankMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(props.plank), roughness: 0.7 });
    disposables.push(plankMat);
    let maxW = 4;
    props.shelves.forEach((shelf, row) => {
      const y = -row * ROW;
      let x = 0;
      for (const b of shelf.books) {
        const w = Math.max(0.28, Math.min(1.5, b.width));
        const geo = new THREE.BoxGeometry(w, HEIGHT, DEPTH);
        const cloth = new THREE.MeshStandardMaterial({ color: new THREE.Color(b.blank ? props.plank : b.color), roughness: b.blank ? 0.95 : 0.65 });
        const spine = new THREE.MeshStandardMaterial({ map: spineTexture(b.blank ? 'Unnamed' : b.title, b.blank ? props.plank : b.color, b.blank ? props.ink : props.gilt, w), roughness: 0.55 });
        disposables.push(geo, cloth, spine);
        const mesh = new THREE.Mesh(geo, [cloth, cloth, cloth, cloth, spine, cloth]);
        const home = new THREE.Vector3(x + w / 2, y + HEIGHT / 2, 0);
        mesh.position.copy(home);
        if (b.ongoing) {
          // Still being written: the book leans against the end of the row.
          mesh.rotation.z = -0.12;
          mesh.position.x += 0.12;
        }
        root.add(mesh);
        books.push({ mesh, id: b.id, home, blank: b.blank });
        x += w + 0.04;
      }
      maxW = Math.max(maxW, x);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(x + 1.2, 0.18, DEPTH + 0.4), plankMat);
      plank.position.set(x / 2, y - 0.09, 0);
      root.add(plank);
    });
    root.position.x = -maxW / 2;
    root.position.y = ((props.shelves.length - 1) * ROW) / 2 - HEIGHT / 2;
    const totalH = props.shelves.length * ROW;
    camera.position.set(0, 0.6, Math.max(10, maxW * 0.95, totalH * 1.3));
  };
  build();

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.screenSpacePanning = true;
  controls.minAzimuthAngle = -0.7;
  controls.maxAzimuthAngle = 0.7;
  controls.minPolarAngle = Math.PI / 2 - 0.5;
  controls.maxPolarAngle = Math.PI / 2 + 0.35;
  controls.minDistance = 4;
  controls.maxDistance = 40;
  controls.update();
  controls.addEventListener('change', () => ctx.animate(() => controls.update()));

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered: (typeof books)[number] | null = null;
  let down: { x: number; y: number } | null = null;
  const pick = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(books.map((b) => b.mesh), false)[0];
    return hit ? books.find((b) => b.mesh === hit.object) ?? null : null;
  };
  const lift = (b: (typeof books)[number] | null, on: boolean) => {
    if (!b) return;
    const target = on ? b.home.y + 0.18 : b.home.y;
    ctx.animate(() => {
      b.mesh.position.y += (target - b.mesh.position.y) * 0.25;
      return Math.abs(target - b.mesh.position.y) > 0.002;
    });
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || down) return;
    const b = pick(e);
    if (b !== hovered) {
      lift(hovered, false);
      lift(b, true);
      hovered = b;
      canvas.style.cursor = b ? 'pointer' : 'grab';
    }
  };
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    const wasClick = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5;
    down = null;
    if (!wasClick) return;
    const b = pick(e);
    if (!b) return;
    // Pull the volume off the shelf and turn it to show its cover, then open it.
    let t = 0;
    ctx.animate((dt) => {
      t = Math.min(1, t + dt / 0.6);
      const e2 = 1 - Math.pow(1 - t, 3);
      b.mesh.position.z = b.home.z + e2 * 2.2;
      b.mesh.rotation.y = e2 * (Math.PI / 2);
      if (t >= 1) props.onOpen(b.id);
      return t < 1;
    });
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  return {
    scene,
    camera,
    update(next) {
      const rebuild = next.shelves !== props.shelves;
      props = next;
      if (rebuild) build();
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
      for (const d of disposables) d.dispose();
    },
  };
}
