import type { SceneContext, SceneHandle } from '@eternall/stage';

/**
 * ENVOI's physical envelope (docs/design/envoi.md §6): a paper envelope with a wax seal pressed
 * from the letter's fingerprint. When `breaking` turns true, the wax fractures into shards that
 * fall away and the flap opens. Purely presentational: the DOM carries every control.
 */
export interface EnvelopeProps {
  breaking: boolean;
  wax: string;
  waxDeep: string;
  paper: string;
  ink: string;
  airmailRed: string;
  airmailBlue: string;
  /** Hex fingerprint: drives the seal's rim and engraving, like the 2D seal. */
  fingerprint: string;
  initial: string;
}

export default function createEnvelope(ctx: SceneContext, initial: EnvelopeProps): SceneHandle<EnvelopeProps> {
  const { THREE } = ctx;
  let props = initial;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, ctx.width / ctx.height, 0.1, 100);
  camera.position.set(0, 1.2, 9.5);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x443322, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-3, 5, 6);
  scene.add(key);

  // The envelope: a thin body with an airmail-striped edge drawn on a canvas texture.
  const tex = (() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const g = c.getContext('2d')!;
    g.fillStyle = props.paper;
    g.fillRect(0, 0, 1024, 512);
    const stripe = 28;
    for (let x = -512; x < 1536; x += stripe * 2) {
      for (const [y0, y1] of [[0, 22], [490, 512]] as const) {
        g.save();
        g.beginPath();
        g.rect(0, y0, 1024, y1 - y0);
        g.clip();
        g.fillStyle = (x / (stripe * 2)) % 2 ? props.airmailRed : props.airmailBlue;
        g.beginPath();
        g.moveTo(x, y1);
        g.lineTo(x + stripe, y0);
        g.lineTo(x + stripe * 1.6, y0);
        g.lineTo(x + stripe * 0.6, y1);
        g.fill();
        g.restore();
      }
    }
    g.fillStyle = props.ink;
    g.globalAlpha = 0.75;
    g.font = '28px "Courier Prime", monospace';
    g.fillText(`TO: ${props.initial.toUpperCase()}`, 600, 300);
    g.fillText('IN THE FUTURE', 600, 340);
    return new THREE.CanvasTexture(c);
  })();
  tex.colorSpace = THREE.SRGBColorSpace;
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 0.06), [paperMat, paperMat, paperMat, paperMat, paperMat, paperMat]);
  scene.add(body);

  // The flap: a triangle hinged at the top edge.
  const flapShape = new THREE.Shape();
  flapShape.moveTo(-3, 0);
  flapShape.lineTo(3, 0);
  flapShape.lineTo(0, -1.8);
  flapShape.lineTo(-3, 0);
  const flapMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(props.paper).multiplyScalar(0.92), roughness: 0.85, side: THREE.DoubleSide });
  const flap = new THREE.Mesh(new THREE.ShapeGeometry(flapShape), flapMat);
  const flapEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ShapeGeometry(flapShape)), new THREE.LineBasicMaterial({ color: new THREE.Color(props.ink), transparent: true, opacity: 0.35 }));
  flapEdge.position.z = 0.002;
  const hinge = new THREE.Group();
  hinge.position.set(0, 1.5, 0.04);
  hinge.add(flap, flapEdge);
  scene.add(hinge);

  // The seal: wedges of a short cylinder, assembled until they break apart.
  const bytes = props.fingerprint.match(/../g)?.map((h) => parseInt(h, 16)) ?? [128];
  const pieces = 6 + ((bytes[3] ?? 0) % 5);
  const waxMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(props.wax), roughness: 0.38, metalness: 0.05 });
  const waxDeep = new THREE.MeshStandardMaterial({ color: new THREE.Color(props.waxDeep), roughness: 0.5 });
  const seal = new THREE.Group();
  seal.position.set(0, -0.3, 0.12);
  const shards: { mesh: InstanceType<typeof THREE.Mesh>; v: InstanceType<typeof THREE.Vector3>; spin: InstanceType<typeof THREE.Vector3> }[] = [];
  for (let i = 0; i < pieces; i++) {
    const start = (i / pieces) * Math.PI * 2;
    const len = (Math.PI * 2) / pieces;
    const radius = 0.62 + ((bytes[i] ?? 0) / 255) * 0.06;
    const geo = new THREE.CylinderGeometry(radius, radius * 1.04, 0.14, 10, 1, false, start, len);
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, [waxMat, waxMat, waxDeep]);
    seal.add(mesh);
    const mid = start + len / 2;
    shards.push({ mesh, v: new THREE.Vector3(Math.sin(mid) * 2.2, Math.cos(mid) * 1.6 + 1.2, 1.4 + (i % 3) * 0.4), spin: new THREE.Vector3(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 4 - 2) });
  }
  // An engraved ring and the initial, on top of the wax.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.018, 8, 48), waxDeep);
  ring.position.z = 0.08;
  seal.add(ring);
  scene.add(seal);

  // A gentle breathing tilt while waiting; rendered only when animating.
  let broken = false;
  const breakApart = () => {
    if (broken) return;
    broken = true;
    ring.visible = false;
    let t = 0;
    ctx.animate((dt) => {
      t += dt;
      for (const s of shards) {
        s.v.y -= 9.8 * dt;
        s.mesh.position.addScaledVector(s.v, dt);
        s.mesh.rotation.x += s.spin.x * dt;
        s.mesh.rotation.y += s.spin.y * dt;
        s.mesh.rotation.z += s.spin.z * dt;
      }
      hinge.rotation.x = -Math.min(1, t / 0.7) * Math.PI * 0.92;
      body.position.y = -Math.min(1, t / 1.2) * 0.4;
      return t < 1.6;
    });
  };

  let idle = 0;
  ctx.animate((dt) => {
    idle += dt;
    body.rotation.y = Math.sin(idle * 0.6) * 0.08;
    hinge.rotation.y = body.rotation.y;
    seal.rotation.y = body.rotation.y;
    // Settle after a moment so nothing animates forever.
    return idle < 2.5 && !broken;
  });
  if (props.breaking) breakApart();

  return {
    scene,
    camera,
    update(next) {
      props = next;
      if (next.breaking) breakApart();
    },
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    dispose() {
      tex.dispose();
      paperMat.dispose();
      flapMat.dispose();
      waxMat.dispose();
      waxDeep.dispose();
    },
  };
}
