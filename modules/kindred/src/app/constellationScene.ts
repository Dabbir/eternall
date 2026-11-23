import { letPageScroll, type SceneContext, type SceneHandle } from '@eternall/stage';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * KINDRED's constellation in the round (docs/design/kindred.md §6): people as softly glowing stars,
 * you at the centre, faint lines between people who share a drawer. Selecting a star flies to it.
 * Positions come from the same pure layout as the 2D sky; nothing drifts on its own.
 */
export interface SkyProps {
  stars: { id: string; name: string; x: number; y: number; size: number; drawer: string }[];
  star: string;
  you: string;
  line: string;
  ink: string;
  onOpen(id: string): void;
}

function glowTexture(THREE: SceneContext['THREE']) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function label(THREE: SceneContext['THREE'], text: string, color: string) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const font = '500 44px "Work Sans", system-ui, sans-serif';
  g.font = font;
  c.width = Math.ceil(g.measureText(text).width) + 24;
  c.height = 64;
  g.font = font;
  g.fillStyle = color;
  g.textBaseline = 'middle';
  g.fillText(text, 12, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(c.width / 110, c.height / 110, 1);
  return sprite;
}

export default function createSky(ctx: SceneContext, initial: SkyProps): SceneHandle<SkyProps> {
  const { THREE, canvas } = ctx;
  let props = initial;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, ctx.width / ctx.height, 0.1, 200);
  camera.position.set(0, -6, 17);
  const controls = new OrbitControls(camera, canvas);
  // A plain wheel or swipe scrolls the page; Ctrl/⌘ + wheel or a pinch zooms.
  const releaseScroll = letPageScroll(controls, canvas);
  controls.enableDamping = true;
  controls.minDistance = 5;
  controls.maxDistance = 40;
  controls.addEventListener('change', () => ctx.invalidate());

  const glow = glowTexture(THREE);
  const disposables: { dispose(): void }[] = [glow];
  const pickables: { mesh: InstanceType<typeof THREE.Sprite>; id: string }[] = [];
  const R = 9;

  // Background field of faint stars, for depth.
  const field = new THREE.BufferGeometry();
  const pts = new Float32Array(900);
  for (let i = 0; i < 300; i++) {
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(2 * Math.random() - 1);
    const r = 40 + Math.random() * 30;
    pts.set([r * Math.sin(v) * Math.cos(u), r * Math.sin(v) * Math.sin(u), r * Math.cos(v)], i * 3);
  }
  field.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const fieldMat = new THREE.PointsMaterial({ color: new THREE.Color(props.ink), size: 0.18, transparent: true, opacity: 0.45 });
  scene.add(new THREE.Points(field, fieldMat));
  disposables.push(field, fieldMat);

  const you = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(props.you), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  you.scale.set(1.6, 1.6, 1);
  scene.add(you);
  const youLabel = label(THREE, 'you', props.ink);
  youLabel.position.set(0, -0.9, 0);
  scene.add(youLabel);

  const positions = new Map<string, InstanceType<typeof THREE.Vector3>>();
  props.stars.forEach((s, i) => {
    // A gentle depth so the sky has volume: drawers tilt into their own planes.
    const z = Math.sin(i * 2.399) * 1.6 * Math.hypot(s.x, s.y);
    const pos = new THREE.Vector3(s.x * R, -s.y * R, z);
    positions.set(s.id, pos);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(props.star), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const sc = 0.55 + s.size * 0.32;
    sprite.scale.set(sc, sc, 1);
    sprite.position.copy(pos);
    scene.add(sprite);
    pickables.push({ mesh: sprite, id: s.id });
    const l = label(THREE, s.name, props.ink);
    l.position.set(pos.x, pos.y - 0.55 - s.size * 0.1, pos.z);
    scene.add(l);
  });

  // Faint lines between people who share a drawer, in name order.
  const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(props.line), transparent: true, opacity: 0.35 });
  disposables.push(lineMat);
  const byDrawer = new Map<string, string[]>();
  for (const s of props.stars) byDrawer.set(s.drawer, [...(byDrawer.get(s.drawer) ?? []), s.id]);
  for (const ids of byDrawer.values()) {
    if (ids.length < 2) continue;
    const g = new THREE.BufferGeometry().setFromPoints(ids.map((id) => positions.get(id)!));
    disposables.push(g);
    scene.add(new THREE.Line(g, lineMat));
  }

  // Click a star: fly toward it, then open the card.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downAt = { x: 0, y: 0 };
  const onDown = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
  const onUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 5) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables.map((p) => p.mesh))[0];
    const id = hit && pickables.find((p) => p.mesh === hit.object)?.id;
    if (!id) return;
    const target = positions.get(id)!;
    const from = controls.target.clone();
    const camFrom = camera.position.clone();
    const camTo = target.clone().add(new THREE.Vector3(0, -1.5, 6));
    let t = 0;
    ctx.animate((dt) => {
      t = Math.min(1, t + dt / 0.8);
      const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      controls.target.lerpVectors(from, target, k);
      camera.position.lerpVectors(camFrom, camTo, k);
      controls.update();
      if (t >= 1) props.onOpen(id);
      return t < 1;
    });
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  ctx.animate(() => controls.update());

  return {
    scene,
    camera,
    update(p) {
      props = p;
    },
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      releaseScroll();
      controls.dispose();
      scene.traverse((o) => {
        const m = (o as { material?: { map?: { dispose(): void } | null; dispose(): void } }).material;
        if (m) {
          if (m.map && m.map !== glow) m.map.dispose();
          m.dispose();
        }
      });
      for (const d of disposables) d.dispose();
    },
  };
}
