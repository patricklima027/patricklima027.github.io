/* Noondoor: porta3d.js (v3). O simbolo da marca em vidro, pequeno, sobre a praca vazia ao meio-dia; ao rolar o sol sobe, a camera mergulha nele e a
   superficie do sol vira uma janela para a praca das portas (a mesma imagem que a camada HTML mostra por baixo).
   Modulo ES carregado por main.js com import() depois do evento load. three.js 0.169.0 por import map (jsDelivr, versao fixa).
   Todo texto e HTML por cima do canvas. Sem cursor proprio, sem brilho seguindo o mouse: so uma inclinacao sutil do vidro.
   Tier A (notebook): vidro com transmission (refracao real da praca). Tier B (celular): vidro "falso" (reflexo do estudio + verniz), sem transmission.
   Se o quadro demora, cai A -> B -> C (C = sem WebGL: o main.js faz o mergulho em 2D). */
import * as THREE from "three";

const C = {
  cream: 0xF3EADB, umber: 0x2A1D14, terracotta: 0xA94A22, ochre: 0xD9A03F,
  sun1: 0xF0B450, sun2: 0xD9732F, sun3: 0xB4532A
};
const col = (h) => new THREE.Color(h);
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIn = (t) => t * t * t;

/* Geometria do arco, gerada na mao (nao e ExtrudeGeometry: as tampas dele saem em triangulos longos e o vidro mostra listras). O simbolo e um TRACO de
   largura 42 com pontas redondas sobre a linha central (pernas em x = +-41, arco de raio 41). Cada anel e o contorno do traco com meia-largura h (21 na
   parede, 14 na tampa); a tampa e uma tira ligando as bordas externa e interna e as pontas redondas sao leques. Bisel redondo: x = 5 sen(phi),
   z = 7 + 7 cos(phi). Espessura total 30. Normais analiticas. Origem = centro (100,100) do SVG do simbolo, y para cima, unidades do SVG. */
function buildArchGeometry(hi) {
  const nLeg = hi ? 16 : 8, nArc = hi ? 64 : 36, T = hi ? 24 : 12, B = hi ? 9 : 6;
  const R = 41, H = 21, BS = 5, BT = 7, HALF = 7;
  const Cc = [], Nm = [];
  for (let k = 0; k < nLeg; k++) { Cc.push([-R, -R + R * k / nLeg]); Nm.push([-1, 0]); }
  for (let k = 0; k <= nArc; k++) { const th = Math.PI - Math.PI * k / nArc; Cc.push([R * Math.cos(th), R * Math.sin(th)]); Nm.push([Math.cos(th), Math.sin(th)]); }
  for (let k = 1; k <= nLeg; k++) { Cc.push([R, -R * k / nLeg]); Nm.push([1, 0]); }
  const M = Cc.length, N = 2 * M + 2 * T;
  const ring = (h) => {
    const P = new Array(N), Q = new Array(N);
    for (let i = 0; i < M; i++) { P[i] = [Cc[i][0] + Nm[i][0] * h, Cc[i][1] + Nm[i][1] * h]; Q[i] = Nm[i]; }
    for (let k = 1; k <= T; k++) { const a = -Math.PI * k / (T + 1), c = Math.cos(a), s = Math.sin(a); P[M + k - 1] = [Cc[M - 1][0] + h * c, Cc[M - 1][1] + h * s]; Q[M + k - 1] = [c, s]; }
    for (let i = M - 1; i >= 0; i--) { const j = M + T + (M - 1 - i); P[j] = [Cc[i][0] - Nm[i][0] * h, Cc[i][1] - Nm[i][1] * h]; Q[j] = [-Nm[i][0], -Nm[i][1]]; }
    for (let k = 1; k <= T; k++) { const a = -Math.PI * k / (T + 1), c = Math.cos(a), s = Math.sin(a); P[2 * M + T + k - 1] = [Cc[0][0] + h * c, Cc[0][1] + h * s]; Q[2 * M + T + k - 1] = [c, s]; }
    return [P, Q];
  };
  const rings = [];
  for (let t = 0; t <= B; t++) { const phi = (t / B) * Math.PI / 2; rings.push({ h: H - BS + BS * Math.sin(phi), z: HALF + BT * Math.cos(phi), phi, front: true }); }
  for (let t = B; t >= 0; t--) { const phi = (t / B) * Math.PI / 2; rings.push({ h: H - BS + BS * Math.sin(phi), z: -(HALF + BT * Math.cos(phi)), phi, front: false }); }
  const pos = [], nor = [], idx = [];
  rings.forEach((rg) => {
    const [P, Q] = ring(rg.h), sn = Math.sin(rg.phi), cs = Math.cos(rg.phi);
    for (let j = 0; j < N; j++) {
      pos.push(P[j][0], P[j][1], rg.z);
      const nx = Q[j][0] * sn / BS, ny = Q[j][1] * sn / BS, nz = (rg.front ? 1 : -1) * cs / BT;
      const l = Math.hypot(nx, ny, nz); nor.push(nx / l, ny / l, nz / l);
    }
  });
  const RN = rings.length;
  for (let r = 0; r < RN - 1; r++) for (let j = 0; j < N; j++) {
    const a = r * N + j, b = r * N + (j + 1) % N, c = (r + 1) * N + j, d = (r + 1) * N + (j + 1) % N;
    idx.push(a, c, b, b, c, d);
  }
  const DOME = 0.8;
  const cap = (r, sgn) => {
    const base = r * N, inner = (i) => base + M + T + (M - 1 - i);
    const tri = (x, y, z) => (sgn > 0 ? idx.push(x, y, z) : idx.push(x, z, y));
    const z = pos[r * N * 3 + 2], zc = z + sgn * DOME, hh = rings[r].h;
    const Qr = ring(hh)[1], tilt = 2 * DOME / hh;
    for (let j = 0; j < N; j++) { const l = Math.hypot(Qr[j][0] * tilt, Qr[j][1] * tilt, 1); nor[(base + j) * 3] = Qr[j][0] * tilt / l; nor[(base + j) * 3 + 1] = Qr[j][1] * tilt / l; nor[(base + j) * 3 + 2] = sgn / l; }
    const cid = [];
    for (let i = 0; i < M; i++) { cid.push(pos.length / 3); pos.push(Cc[i][0], Cc[i][1], zc); nor.push(0, 0, sgn); }
    for (let i = 0; i < M - 1; i++) {
      tri(base + i, cid[i], cid[i + 1]); tri(base + i, cid[i + 1], base + i + 1);
      tri(cid[i], inner(i), inner(i + 1)); tri(cid[i], inner(i + 1), cid[i + 1]);
    }
    const fan = (cIdx, seq) => { for (let k = 0; k < seq.length - 1; k++) { if (sgn > 0) idx.push(cIdx, seq[k + 1], seq[k]); else idx.push(cIdx, seq[k], seq[k + 1]); } };
    const sr = [base + M - 1]; for (let k = 1; k <= T; k++) sr.push(base + M + k - 1); sr.push(inner(M - 1)); fan(cid[M - 1], sr);
    const sl = [inner(0)]; for (let k = 1; k <= T; k++) sl.push(base + 2 * M + T + k - 1); sl.push(base + 0); fan(cid[0], sl);
  };
  cap(0, 1); cap(RN - 1, -1);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/* ---- vidro sobre creme. Tier A: transmission (refrata o horizonte da praca). Tier B: vidro falso, translucido, sem transmission ---- */
const LOOK = {
  a: { color: 0xFFFFFF, roughness: 0.03, transmission: 1, thickness: 60, ior: 1.55, attenuationColor: 0xEFB878, attenuationDistance: 300, dispersion: 0.4,
       iridescence: 0.3, iridescenceIOR: 1.3, iridescenceThicknessRange: [260, 620], clearcoat: 0.8, clearcoatRoughness: 0.03, envMapIntensity: 1.25 },
  b: { color: 0xFFFFFF, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.5, clearcoat: 1, clearcoatRoughness: 0.05,
       sheen: 0.3, sheenColor: 0xD9A03F, sheenRoughness: 0.4, iridescence: 0.2, iridescenceIOR: 1.3, iridescenceThicknessRange: [300, 600], envMapIntensity: 1.8 },
  rimA: 0.12, rimB: 0.35, envStudio: 0xF6E9D6
};

/* estudio creme com cartoes escuros nas laterais: e a tecnica de foto de produto para vidro em fundo claro (os cartoes desenham a borda) */
function studio(renderer) {
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: LOOK.envStudio, side: THREE.BackSide })));
  const card = (x, z, ry, c, w = 6, h = 14) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, 0, z); m.rotation.y = ry; es.add(m); };
  card(-9.5, 0, Math.PI / 2, 0x2A1D14); card(9.5, 0, -Math.PI / 2, 0x3B2719); card(0, -9.5, 0, 0x4A3020, 10, 8);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshBasicMaterial({ color: 0xFFFFFF })); top.position.set(0, 9.8, 0); top.rotation.x = Math.PI / 2; es.add(top);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(4, 10), new THREE.MeshBasicMaterial({ color: 0xFFF4E0 })); win.position.set(-6, 2, 9.8); es.add(win);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(es, 0.02).texture;
  pm.dispose();
  return tex;
}

export async function createPorta(opts) {
  let TIER = opts.tier || "a";
  const canvas = opts.canvas;
  const dprMax = opts.dprMax || { a: 1.75, b: 1.5 };
  const spinSec = opts.spinSeconds || { a: 18, b: 22 };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: TIER === "a" ? "high-performance" : "default", preserveDrawingBuffer: !!opts.preserve });
  if (!renderer.capabilities.isWebGL2) throw new Error("webgl2");
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  let dpr = Math.min(window.devicePixelRatio || 1, dprMax[TIER]);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.environment = studio(renderer);
  scene.environmentIntensity = 1.0;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 4000);

  const loader = new THREE.TextureLoader();
  const tex = (url, ready) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; ready(t); });

  /* ---- fundo: a praca vazia (mesmo enquadramento da camada HTML), mais a sombra de meio-dia do simbolo no chao ---- */
  const bgU = {
    uTex: { value: null }, uFrame: { value: new THREE.Vector4(0, 0, 1600, 900) }, uBufH: { value: 1 }, uPR: { value: 1 },
    uShadow: { value: new THREE.Vector4(0, 0, 1, 1) }, uShadowAmt: { value: 1 }, uCaustic: { value: 1 }
  };
  tex(opts.bgUrl, (t) => { bgU.uTex.value = t; });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: bgU, depthTest: false, depthWrite: false,
    vertexShader: "void main(){ gl_Position = vec4(position.xy, 0.9999, 1.0); }",
    fragmentShader: `
      uniform sampler2D uTex; uniform vec4 uFrame, uShadow; uniform float uBufH, uPR, uShadowAmt, uCaustic;
      void main(){
        vec2 xy = vec2(gl_FragCoord.x, uBufH - gl_FragCoord.y) / uPR;
        vec2 uv = (xy + uFrame.xy) / uFrame.zw; uv.y = 1.0 - uv.y;
        vec3 c = texture2D(uTex, uv).rgb;
        vec2 d = (xy - uShadow.xy) / uShadow.zw;
        float g = exp(-dot(d, d) * 2.2);
        c = mix(c, vec3(0.025, 0.012, 0.006), 0.26 * g * uShadowAmt);                                  // umber a ~18% (no espaco linear)
        vec2 e = (xy - uShadow.xy - vec2(0.0, -uShadow.w * 0.15)) / (uShadow.zw * vec2(0.5, 0.62));
        c += vec3(0.62, 0.30, 0.04) * 0.09 * exp(-dot(e, e) * 2.4) * uCaustic;                         // caustica ambar: o sol atravessando o vidro
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`
  }));
  bg.frustumCulled = false; bg.renderOrder = -10;
  scene.add(bg);

  /* ---- vidro ---- */
  const rimU = { uRim: { value: TIER === "a" ? LOOK.rimA : LOOK.rimB }, uLift: { value: 0 } };   // uLift: ao se aproximar, o reflexo escuro dos cartoes do estudio sobe para um tom quente medio
  function makeGlass(hi) {
    const p = Object.assign({}, hi ? LOOK.a : LOOK.b);
    p.attenuationColor && (p.attenuationColor = col(p.attenuationColor));
    p.sheenColor && (p.sheenColor = col(p.sheenColor));
    p.color = col(p.color);
    const m = new THREE.MeshPhysicalMaterial(p);
    if (!hi) m.depthFunc = THREE.LessDepth;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, rimU);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uRim, uLift;")
        .replace("#include <lights_fragment_maps>", `#include <lights_fragment_maps>
          // de perto, as laterais do vidro nao podem refletir os cartoes escuros (viram traco marrom): o reflexo sobe para um tom quente medio
          #if defined( RE_IndirectSpecular )
            radiance = mix( radiance, max( radiance, vec3( 0.82, 0.66, 0.48 ) ), uLift );
            #ifdef USE_CLEARCOAT
              clearcoatRadiance = mix( clearcoatRadiance, max( clearcoatRadiance, vec3( 0.82, 0.66, 0.48 ) ), uLift );
            #endif
          #endif`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          // aro fino e claro nas bordas, com um toque de iridescencia verde/violeta so no angulo rasante
          float fr = pow(1.0 - clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 3.2);
          vec3 irid = 0.5 + 0.5 * cos(6.2831 * (vec3(0.30, 0.55, 0.80) + fr * 0.9 + vNormal.x * 0.25));
          irid = mix(vec3(0.62, 0.95, 0.80), vec3(0.78, 0.66, 1.0), irid.b);
          totalEmissiveRadiance += (vec3(1.0, 0.95, 0.86) * 0.42 + irid * 0.34) * fr * uRim;`);
    };
    return m;
  }
  let glass = makeGlass(TIER === "a");
  let geo = buildArchGeometry(TIER === "a");
  const door = new THREE.Group();
  scene.add(door);
  const arch = new THREE.Mesh(geo, glass);
  door.add(arch);

  /* ---- sol: esfera com o degrade do logo; no mergulho a superficie vira uma janela para a praca das portas (mesma imagem da camada HTML) ---- */
  const sunU = {
    c1: { value: col(C.sun1) }, c2: { value: col(C.sun2) }, c3: { value: col(C.sun3) }, uBright: { value: 1 },
    uWorld: { value: null }, uFrame: { value: new THREE.Vector4(0, 0, 1920, 1075) }, uCenter: { value: new THREE.Vector2(0, 0) }, uZoom: { value: 1.04 },
    uBufH: { value: 1 }, uPR: { value: 1 }, uPortal: { value: 0 }, uExposure: { value: 1.7 }, uRimFade: { value: 0 }
  };
  tex(opts.worldUrl, (t) => { sunU.uWorld.value = t; });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(14.4, 48, 32), new THREE.ShaderMaterial({
    uniforms: sunU,
    vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform vec3 c1, c2, c3; uniform float uBright, uBufH, uPR, uPortal, uExposure, uRimFade, uZoom;
      uniform sampler2D uWorld; uniform vec4 uFrame; uniform vec2 uCenter;
      varying vec3 vN;
      void main(){
        float t = clamp(dot(normalize(vN.xy + 1e-4), vec2(0.7071, -0.7071)) * 0.5 * length(vN.xy) + 0.5, 0.0, 1.0);
        vec3 c = t < 0.55 ? mix(c1, c2, t / 0.55) : mix(c2, c3, (t - 0.55) / 0.45);
        c *= (0.92 + 0.08 * vN.z) * uBright;
        vec2 xy = vec2(gl_FragCoord.x, uBufH - gl_FragCoord.y) / uPR;
        xy = (xy - uCenter) / uZoom + uCenter;
        vec2 wuv = (xy + uFrame.xy) / uFrame.zw; wuv.y = 1.0 - wuv.y;
        vec3 w = texture2D(uWorld, wuv).rgb * uExposure;
        float inside = mix(smoothstep(0.30, 0.40, vN.z), 1.0, uRimFade);
        gl_FragColor = vec4(mix(c, w, uPortal * inside), 1.0);
        #include <colorspace_fragment>
      }`
  }));
  sun.position.set(0, -16.2, 0);
  door.add(sun);

  const sunLight = new THREE.PointLight(C.sun1, 900, 0, 2);   // acende a face de dentro do arco
  sun.add(sunLight);

  /* ---- estado, layout ---- */
  let P = 0, intro = 1;
  let W = 1, H = 1, D0 = 500, VX = 0, VY = 0, lastW = 0, lastH = 0, slotH = 100, slotCx = 0, slotBottom = 0;
  let active = false, raf = 0, last = performance.now(), firstFrame = false, destroyed = false, layoutOk = false;
  const ptr = { x: 0, y: 0, on: 0 };
  const touch = { down: false, id: -1, lastX: 0, vel: 0 };
  let press = 0, pressV = 0, pressT = 0;
  const tilt = { x: 0, y: 0 };
  let idle = 0;
  const fpsHist = []; let measuring = 3.3, tierDropped = false;
  const container = opts.container, slotEl = opts.slot;

  function layout(force) {
    const r = container.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return false;
    if (!force && w === lastW && Math.abs(h - lastH) < 140 && lastH) { /* barra do navegador do celular: mantem o tamanho do canvas */ } else { renderer.setSize(w, h, false); lastW = w; lastH = h; }
    W = lastW; H = lastH;
    camera.aspect = W / H;
    const sr = slotEl.getBoundingClientRect();
    slotH = Math.max(40, sr.height);
    const cy = (sr.top + sr.height / 2 - r.top) / r.height, cx = (sr.left + sr.width / 2 - r.left) / r.width;
    VY = 0.5 - cy; VX = 0.5 - cx;
    D0 = 124 * r.height / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * slotH);
    slotCx = sr.left + sr.width / 2 - r.left; slotBottom = sr.bottom - r.top;
    return true;
  }

  const onMove = (e) => {
    if (e.pointerType === "touch") return;
    const r = container.getBoundingClientRect();
    ptr.x = (e.clientX - r.left) / r.width * 2 - 1; ptr.y = (e.clientY - r.top) / r.height * 2 - 1; ptr.on = 1;
  };
  const onLeave = () => { ptr.on = 0; };
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  const onDown = (e) => {
    if (e.pointerType !== "touch" || P > 0.1) return;
    const sr = slotEl.getBoundingClientRect();
    if (e.clientX < sr.left - 20 || e.clientX > sr.right + 20 || e.clientY < sr.top - 20 || e.clientY > sr.bottom + 20) return;
    touch.down = true; touch.id = e.pointerId; touch.lastX = e.clientX; touch.vel = 0; pressT = 1;
  };
  const onTMove = (e) => { if (!touch.down || e.pointerId !== touch.id) return; const dx = e.clientX - touch.lastX; touch.lastX = e.clientX; touch.vel = dx * 0.012; idle += dx * 0.012; };
  const onUp = (e) => { if (e.pointerId === touch.id) { touch.down = false; pressT = 0; } };
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointermove", onTMove, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("pointercancel", onUp, { passive: true });

  function frame(now) {
    if (!active || destroyed) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    const dtRaw = (now - last) / 1000; last = now;
    const dt = Math.min(0.05, dtRaw);
    if (document.hidden || !layoutOk) return;

    if (measuring > 0 && firstFrame) {
      measuring -= dtRaw; if (measuring < 1.5) fpsHist.push(dtRaw * 1000);
      if (measuring <= 0) {
        const avg = fpsHist.reduce((a, b) => a + b, 0) / Math.max(1, fpsHist.length);
        if (!tierDropped) {
          if (TIER === "a" && avg > 22) setTier("b");
          else if (TIER === "b" && avg > 30) { tierDropped = true; opts.onTier && opts.onTier("c"); }
        }
      }
    }

    // giro ocioso; assenta de frente (multiplo de PI) ate 8% e a inclinacao do mouse vai a zero
    const lift = ss(0.18, 0.40, P);
    rimU.uLift.value = lift; rimU.uRim.value = (TIER === "a" ? LOOK.rimA : LOOK.rimB) * (1 + 1.4 * lift);
    const settle = ss(0.0, 0.08, P);
    if (P === 0) idle += dt * (Math.PI * 2 / spinSec[TIER]);
    if (!touch.down && Math.abs(touch.vel) > 0.0004) { idle += touch.vel; touch.vel *= Math.exp(-dt * 3.2); }
    const nearest = Math.round(idle / Math.PI) * Math.PI;
    const rotY = lerp(idle, nearest, settle);
    const k = 1 - Math.exp(-dt / 0.4);
    const fine = ptr.on && !touch.down;
    tilt.x += ((fine ? -ptr.y * 0.08 : 0) * (1 - settle) - tilt.x) * k;     // inclinacao sutil: +-0,08 rad em X e +-0,14 em Y
    tilt.y += ((fine ? ptr.x * 0.14 : 0) * (1 - settle) - tilt.y) * k;
    const bob = Math.sin(now / 1000 * 1.1) * 2 * (1 - settle);
    door.rotation.set(0.10 * (1 - ss(0.16, 0.30, P)) + tilt.x, rotY + tilt.y, 0);
    door.position.y = bob;
    pressV += (220 * ((pressT ? 0.06 : 0) - press) - 14 * pressV) * dt; press += pressV * dt;
    door.scale.setScalar(1 - Math.max(0, press));

    // meio-dia: o sol sobe ate ficar concentrico ao arco de dentro
    const noon = ss(0.08, 0.20, P);
    sun.position.y = lerp(lerp(-46, -16.2, 1 - Math.pow(1 - intro, 3)), 0, noon);
    sunU.uBright.value = 1 + 0.15 * noon;
    sunLight.intensity = 900 * (0.4 + 0.6 * intro) * (1 + 0.4 * noon);

    // mergulho (16% a 50%): a camera entra no sol; o sol vira janela (30% a 52%)
    const tr = clamp((P - 0.16) / 0.34, 0, 1);
    const camZ = lerp(D0, 15.5, easeIn(tr));
    camera.position.set(0, 0, camZ);
    camera.fov = lerp(30, 36, ss(0.40, 0.50, P));
    camera.lookAt(0, 0, camZ - 300);
    const vk = ss(0.16, 0.30, P);
    camera.setViewOffset(W, H, W * VX * (1 - vk), H * VY * (1 - vk), W, H);
    camera.updateProjectionMatrix();

    const pr = renderer.getPixelRatio(), bufH = renderer.domElement.height;
    const fr = opts.getFrame();
    bgU.uFrame.value.set(fr.left, fr.top, fr.W, fr.H); bgU.uBufH.value = bufH; bgU.uPR.value = pr;
    sunU.uFrame.value.set(fr.left, fr.top, fr.W, fr.H); sunU.uBufH.value = bufH; sunU.uPR.value = pr; sunU.uCenter.value.set(W / 2, H / 2);
    sunU.uPortal.value = sunU.uWorld.value ? ss(0.30, 0.40, P) : 0;
    sunU.uExposure.value = lerp(1.7, 1.283, ss(0.40, 0.52, P));        // 1,283 = 1,12 ^ 2,2: o brightness(1,12) da camada HTML, em luz linear
    sunU.uRimFade.value = ss(0.46, 0.52, P);
    // sombra do meio-dia no chao: encolhe 15% e fica mais forte quando o sol sobe; acompanha a flutuacao; some no mergulho
    const sh = 1 - 0.15 * noon - bob * 0.02;
    bgU.uShadow.value.set(slotCx, slotBottom + slotH * 0.015, slotH * 0.65 * sh, slotH * 0.06 * sh);
    bgU.uShadowAmt.value = (1 - ss(0.14, 0.26, P)) * (0.85 + 0.15 * noon) * (1 - bob * 0.04);
    bgU.uCaustic.value = (1 - ss(0.14, 0.26, P)) * (0.6 + 0.4 * noon);

    renderer.render(scene, camera);
    if (!firstFrame) { firstFrame = true; opts.onFirstFrame && opts.onFirstFrame(); }
  }

  function setTier(t) {
    if (t === TIER) return;
    TIER = t;
    glass.dispose(); geo.dispose();
    glass = makeGlass(t === "a"); geo = buildArchGeometry(t === "a");
    arch.material = glass; arch.geometry = geo;
    dpr = Math.min(window.devicePixelRatio || 1, dprMax[t]);
    renderer.setPixelRatio(dpr); layoutOk = layout(true);
    measuring = 3.3; fpsHist.length = 0;
    opts.onTier && opts.onTier(t, true);
  }

  const api = {
    setProgress(p) { P = clamp(p, 0, 1); },
    setIntro(v) { intro = clamp(v, 0, 1); },
    layout() { layoutOk = layout(false); return layoutOk; },
    start() { if (active || destroyed) return; layoutOk = layout(true); active = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { active = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    dispose() {
      destroyed = true; api.stop();
      window.removeEventListener("pointermove", onMove); document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onTMove);
      window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
      renderer.dispose();
    }
  };
  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); api.stop(); opts.onLost && opts.onLost(); }, false);
  layoutOk = layout(true);
  return api;
}
