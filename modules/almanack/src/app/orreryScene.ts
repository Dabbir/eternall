import { letPageScroll, type SceneContext, type SceneHandle } from '@eternall/stage';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * ALMANACK's mechanical orrery (docs/design/almanack.md §6): brass rings for decades lived and
 * ahead, the sun at the centre, the year as a planet on its orbit with the moon in today's phase,
 * and gears that turn as the "year of life" changes. Driven by the DOM slider; nothing autoplays.
 */
export interface OrreryProps {
  decades: number;
  /** 0–1 of the horizon, from the slider. */
  fraction: number;
  moonPhase: number;
  brass: string;
  enamel: string;
  accent: string;
  ink: string;
}

export default function createOrrery(ctx: SceneContext, initial: OrreryProps): SceneHandle<OrreryProps> {
  const { THREE, canvas } = ctx;
  let props = initial;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, ctx.width / ctx.height, 0.1, 200);
  camera.position.set(0, 16, 22);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfff1d6, 0x10152a, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(8, 14, 10);
  scene.add(key);

  const brass = new THREE.MeshStandardMaterial({ color: new THREE.Color(props.brass), metalness: 0.85, roughness: 0.32 });
  const enamel = new THREE.MeshStandardMaterial({ color: new THREE.Color(props.enamel), metalness: 0.1, roughness: 0.4 });
  const accent = new THREE.MeshStandardMaterial({ color: new THREE.Color(props.accent), metalness: 0.2, roughness: 0.35, emissive: new THREE.Color(props.accent), emissiveIntensity: 0.15 });
  const sunMat = new THREE.MeshStandardMaterial({ color: 0xf2c46b, emissive: 0xf2a33b, emissiveIntensity: 0.9, roughness: 0.6 });
  const disposables: { dispose(): void }[] = [brass, enamel, accent, sunMat];

  const R0 = 2.2;
  const step = 7.5 / Math.max(3, props.decades);
  for (let d = 0; d < props.decades; d++) {
    const geo = new THREE.TorusGeometry(R0 + (d + 1) * step, 0.035, 8, 120);
    disposables.push(geo);
    const ring = new THREE.Mesh(geo, brass);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
  }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R0 + props.decades * step + 0.6, R0 + props.decades * step + 0.9, 0.3, 96), enamel);
  base.position.y = -0.6;
  scene.add(base);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1.1, 48, 32), sunMat);
  scene.add(sun);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 16), brass);
  axle.position.y = -0.3;
  scene.add(axle);

  // The year: an arm from the sun to a planet, the moon circling it.
  const arm = new THREE.Group();
  scene.add(arm);
  const rod = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.05), brass);
  arm.add(rod);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), accent);
  arm.add(planet);
  const moonPivot = new THREE.Group();
  planet.add(moonPivot);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.9 }));
  moon.position.set(0.85, 0, 0);
  moonPivot.add(moon);

  // Gears at the base: they turn with the year, as in a real orrery.
  const gear = (r: number, teeth: number) => {
    const shape = new THREE.Shape();
    for (let i = 0; i <= teeth * 2; i++) {
      const a = (i / (teeth * 2)) * Math.PI * 2;
      const rr = i % 2 ? r : r * 1.12;
      if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    const hole = new THREE.Path();
    hole.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    disposables.push(geo);
    return new THREE.Mesh(geo, brass);
  };
  const g1 = gear(1.4, 28);
  const g2 = gear(0.8, 16);
  g1.position.set(-R0 - props.decades * step - 2.2, -0.45, 3);
  g2.position.set(g1.position.x + 2.1, -0.45, 3.6);
  scene.add(g1, g2);

  const controls = new OrbitControls(camera, canvas);

  // A plain wheel or swipe scrolls the page; Ctrl/⌘ + wheel or a pinch zooms.

  const releaseScroll = letPageScroll(controls, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 10;
  controls.maxDistance = 50;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.update();
  controls.addEventListener('change', () => ctx.animate(() => controls.update()));

  let shown = 0;
  const pose = (f: number) => {
    const count = props.decades;
    const pos = f * count;
    const ring = Math.min(count - 1, Math.floor(pos));
    const r = R0 + (ring + 1) * step;
    const angle = (pos % 1) * Math.PI * 2 - Math.PI / 2;
    arm.rotation.y = -angle;
    rod.scale.x = r;
    rod.position.x = r / 2;
    planet.position.x = r;
    moonPivot.rotation.y = props.moonPhase * Math.PI * 2;
    g1.rotation.y = f * Math.PI * 16;
    g2.rotation.y = -f * Math.PI * 16 * (28 / 16);
  };
  const settle = () =>
    ctx.animate(() => {
      shown += (props.fraction - shown) * 0.12;
      pose(shown);
      return Math.abs(props.fraction - shown) > 0.0005;
    });
  settle();

  return {
    scene,
    camera,
    update(next) {
      props = next;
      settle();
    },
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    dispose() {
      releaseScroll();
      controls.dispose();
      for (const d of disposables) d.dispose();
    },
  };
}
