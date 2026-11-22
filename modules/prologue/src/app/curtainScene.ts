import type { SceneContext, SceneHandle } from '@eternall/stage';

/**
 * PROLOGUE's stage (docs/design/prologue.md §6): one full-frame shader — crimson drapes with pleat
 * lighting that sway toward the cursor, a scalloped valance, and an additive spotlight cone that
 * follows the focused act. Decorative only (aria-hidden); the DOM script is the interface.
 */
export interface CurtainProps {
  crimson: string;
  gilt: string;
  /** 0 (top) – 1 (bottom): where the spotlight lands. */
  spot: number;
}

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uSway; uniform float uSpot;
uniform vec3 uCrimson; uniform vec3 uGilt;
varying vec2 vUv;
float drape(float x, float side) {
  // Pleats: a sum of cosines, gathered toward the outer edge.
  float g = side < 0.0 ? x : 1.0 - x;
  float p = cos(g * 70.0 + sin(g * 9.0) * 1.6) * 0.5 + 0.5;
  return mix(0.35, 1.0, pow(p, 1.4));
}
void main() {
  vec2 uv = vUv; float aspect = uRes.x / uRes.y;
  vec3 col = vec3(0.035, 0.022, 0.02);
  // Spotlight cone from above, landing at uSpot.
  vec2 src = vec2(0.5, 1.08); vec2 dst = vec2(0.5 + (uMouse.x - 0.5) * 0.08, 1.0 - uSpot);
  vec2 d = uv - src; vec2 axis = normalize(dst - src);
  float along = dot(d, axis); vec2 perp = d - axis * along; perp.x *= aspect;
  float width = 0.04 + along * 0.22;
  float cone = smoothstep(width, width * 0.35, length(perp)) * smoothstep(0.0, 0.2, along);
  float pool = smoothstep(0.32, 0.0, length((uv - dst) * vec2(aspect, 2.4)));
  col += uGilt * (cone * 0.16 + pool * 0.22);
  // Drapes, swaying toward the cursor.
  float sway = (uMouse.x - 0.5) * 0.02 * uSway + sin(uTime * 0.6 + uv.y * 3.0) * 0.002 * uSway;
  float edgeL = 0.05 + sway * (1.0 - uv.y) + (1.0 - uv.y) * 0.015;
  float edgeR = 0.95 + sway * (1.0 - uv.y) - (1.0 - uv.y) * 0.015;
  if (uv.x < edgeL) {
    float x = uv.x / edgeL; float l = drape(x, -1.0);
    float rim = smoothstep(0.86, 1.0, x) * 0.5;
    col = uCrimson * l * (0.55 + 0.45 * uv.y) + rim * uGilt * 0.15;
  } else if (uv.x > edgeR) {
    float x = (uv.x - edgeR) / (1.0 - edgeR); float l = drape(x, 1.0);
    float rim = smoothstep(0.14, 0.0, x) * 0.5;
    col = uCrimson * l * (0.55 + 0.45 * uv.y) + rim * uGilt * 0.15;
  }
  // Valance: scallops along the top, a gilt fringe.
  float sc = 0.9 - abs(sin(uv.x * 3.14159 * 9.0)) * 0.03;
  if (uv.y > sc) col = uCrimson * drape(fract(uv.x * 9.0), -1.0) * 0.8;
  col += uGilt * smoothstep(0.006, 0.0, abs(uv.y - sc)) * 0.6;
  gl_FragColor = vec4(col, 1.0);
}`;

export default function createCurtain(ctx: SceneContext, initial: CurtainProps): SceneHandle<CurtainProps> {
  const { THREE, canvas } = ctx;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uRes: { value: new THREE.Vector2(ctx.width, ctx.height) },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uSway: { value: 0 },
    uSpot: { value: initial.spot },
    uCrimson: { value: new THREE.Color(initial.crimson) },
    uGilt: { value: new THREE.Color(initial.gilt) },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: FRAG });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));

  let target = 0.5;
  let settling = false;
  const settle = () => {
    if (settling) return;
    settling = true;
    ctx.animate((dt) => {
      uniforms.uTime.value += dt;
      uniforms.uMouse.value.x += (target - uniforms.uMouse.value.x) * Math.min(1, dt * 3);
      uniforms.uSway.value = Math.max(0, uniforms.uSway.value - dt * 0.5);
      const moving = Math.abs(target - uniforms.uMouse.value.x) > 0.002 || uniforms.uSway.value > 0.01;
      if (!moving) settling = false;
      return moving;
    });
  };
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    target = (e.clientX - r.left) / Math.max(1, r.width);
    uniforms.uSway.value = 1;
    settle();
  };
  window.addEventListener('pointermove', onMove);

  return {
    scene,
    camera,
    update(p) {
      uniforms.uSpot.value = p.spot;
      uniforms.uCrimson.value.set(p.crimson);
      uniforms.uGilt.value.set(p.gilt);
      ctx.invalidate();
    },
    resize(w, h) {
      uniforms.uRes.value.set(w, h);
    },
    dispose() {
      window.removeEventListener('pointermove', onMove);
      geometry.dispose();
      material.dispose();
    },
  };
}
