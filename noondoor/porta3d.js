/* Noondoor: porta3d.js (v2). A porta de vidro: o simbolo da marca (mesma geometria do SVG oficial) extrudado como uma pedra de vidro ambar,
   com o sol do meio-dia dentro do vao. Uma cena so, em tres lugares: topo (giro, meio-dia, travessia), e rodape (o arco e o primeiro "n" do
   "noondoor" gigante; o sol se poe saindo por baixo da porta).
   Modulo ES carregado por main.js com import() depois do evento load. three.js 0.169.0 por import map (jsDelivr, versao fixa).
   Todo texto e HTML por cima do canvas: nada de texto dentro do WebGL.
   Tier A (notebook): vidro com transmission (refracao real do fundo), dispersao, iridescencia. Tier B (celular): vidro "falso" (reflexo do
   ambiente + verniz + brilho), sem transmission. Se o quadro demora, cai A -> B -> C (C = sem WebGL: o main.js mostra o poster 2D). */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const C = {
  cream: 0xF3EADB, sand: 0xE4D3B8, umber: 0x2A1D14, shade: 0x1E150F, night: 0x160F0A,
  terracotta: 0xA94A22, ochre: 0xD9A03F, clay: 0x8C5B3F, olive: 0x5F6445,
  sun1: 0xF0B450, sun2: 0xD9732F, sun3: 0xB4532A
};
const col = (h) => new THREE.Color(h);
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIn = (t) => t * t * t;

function openingShape() {
  const s = new THREE.Shape();
  s.moveTo(-20, -62); s.lineTo(-20, 0); s.absarc(0, 0, 20, Math.PI, 0, true); s.lineTo(20, -62); s.closePath();
  return s;
}
/* Geometria do arco, gerada na mao (nao e ExtrudeGeometry: as tampas dele saem em triangulos enormes com T-junctions e o vidro mostra
   listras nas arestas). O simbolo e um TRACO de largura 42 com pontas redondas sobre a linha central (pernas em x = +-41, arco de raio 41).
   Cada anel e o contorno do traco com meia-largura h (21 na parede, 14 na tampa); a tampa e uma tira ligando as bordas externa e interna
   (sem triangulos longos) e as pontas redondas sao leques. Bisel redondo: x = 7 sen(phi), z = 7 + 8 cos(phi). Espessura total 30 (+-15).
   Normais analiticas. Medida: tier A ~9,7 mil triangulos, tier B ~3,6 mil. */
function buildArchGeometry(hi) {
  const nLeg = hi ? 16 : 8, nArc = hi ? 64 : 36, T = hi ? 24 : 12, B = hi ? 9 : 6;
  const R = 41, H = 21, BS = 5, BT = 7, HALF = 7;
  // linha central: pontos C, normal externa Nrm (xy)
  const C = [], Nm = [];
  for (let k = 0; k < nLeg; k++) { C.push([-R, -R + R * k / nLeg]); Nm.push([-1, 0]); }
  for (let k = 0; k <= nArc; k++) { const th = Math.PI - Math.PI * k / nArc; C.push([R * Math.cos(th), R * Math.sin(th)]); Nm.push([Math.cos(th), Math.sin(th)]); }
  for (let k = 1; k <= nLeg; k++) { C.push([R, -R * k / nLeg]); Nm.push([1, 0]); }
  const M = C.length, N = 2 * M + 2 * T;
  const ring = (h) => {            // retorna [pos[N][2], nrmXY[N][2]]
    const P = new Array(N), Q = new Array(N);
    for (let i = 0; i < M; i++) { P[i] = [C[i][0] + Nm[i][0] * h, C[i][1] + Nm[i][1] * h]; Q[i] = Nm[i]; }
    for (let k = 1; k <= T; k++) { const a = -Math.PI * k / (T + 1), c = Math.cos(a), s = Math.sin(a); P[M + k - 1] = [C[M - 1][0] + h * c, C[M - 1][1] + h * s]; Q[M + k - 1] = [c, s]; }
    for (let i = M - 1; i >= 0; i--) { const j = M + T + (M - 1 - i); P[j] = [C[i][0] - Nm[i][0] * h, C[i][1] - Nm[i][1] * h]; Q[j] = [-Nm[i][0], -Nm[i][1]]; }
    for (let k = 1; k <= T; k++) { const a = -Math.PI * k / (T + 1), c = Math.cos(a), s = Math.sin(a); P[2 * M + T + k - 1] = [C[0][0] + h * c, C[0][1] + h * s]; Q[2 * M + T + k - 1] = [c, s]; }
    return [P, Q];
  };
  const rings = [];       // frente (z = +), depois verso (espelhado)
  for (let t = 0; t <= B; t++) { const phi = (t / B) * Math.PI / 2; rings.push({ h: H - BS + BS * Math.sin(phi), z: HALF + BT * Math.cos(phi), phi, front: true }); }
  for (let t = B; t >= 0; t--) { const phi = (t / B) * Math.PI / 2; rings.push({ h: H - BS + BS * Math.sin(phi), z: -(HALF + BT * Math.cos(phi)), phi, front: false }); }
  const pos = [], nor = [], idx = [];
  rings.forEach((rg) => {
    const [P, Q] = ring(rg.h), sn = Math.sin(rg.phi), cs = Math.cos(rg.phi);
    for (let j = 0; j < N; j++) {
      pos.push(P[j][0], P[j][1], rg.z);
      let nx = Q[j][0] * sn / BS, ny = Q[j][1] * sn / BS, nz = (rg.front ? 1 : -1) * cs / BT;
      const l = Math.hypot(nx, ny, nz); nor.push(nx / l, ny / l, nz / l);
    }
  });
  const RN = rings.length;
  for (let r = 0; r < RN - 1; r++) for (let j = 0; j < N; j++) {
    const a = r * N + j, b = r * N + (j + 1) % N, c = (r + 1) * N + j, d = (r + 1) * N + (j + 1) % N;
    idx.push(a, c, b, b, c, d);
  }
  // tampas: duas tiras (borda externa -> linha central -> borda interna) e leques nas pontas redondas. A tampa e levemente abaulada
  // (0,8 de altura no centro, como uma gota de vidro): as normais variam um pouco e o reflexo desliza em vez de ficar chapado.
  const DOME = 0.8;
  const cap = (r, sgn) => {
    const base = r * N, inner = (i) => base + M + T + (M - 1 - i);
    const tri = (x, y, z) => (sgn > 0 ? idx.push(x, y, z) : idx.push(x, z, y));
    const z = pos[r * N * 3 + 2], zc = z + sgn * DOME, hh = rings[r].h;
    const Qr = ring(hh)[1], tilt = 2 * DOME / hh;
    for (let j = 0; j < N; j++) { const l = Math.hypot(Qr[j][0] * tilt, Qr[j][1] * tilt, 1); nor[(base + j) * 3] = Qr[j][0] * tilt / l; nor[(base + j) * 3 + 1] = Qr[j][1] * tilt / l; nor[(base + j) * 3 + 2] = sgn / l; }
    const cid = [];
    for (let i = 0; i < M; i++) { cid.push(pos.length / 3); pos.push(C[i][0], C[i][1], zc); nor.push(0, 0, sgn); }
    for (let i = 0; i < M - 1; i++) {
      tri(base + i, cid[i], cid[i + 1]); tri(base + i, cid[i + 1], base + i + 1);
      tri(cid[i], inner(i), inner(i + 1)); tri(cid[i], inner(i + 1), cid[i + 1]);
    }
    const fan = (cIdx, seq) => { for (let k = 0; k < seq.length - 1; k++) { if (sgn > 0) idx.push(cIdx, seq[k + 1], seq[k]); else idx.push(cIdx, seq[k], seq[k + 1]); } };
    // ponta direita: outer(M-1) -> tipR -> inner(M-1); ponta esquerda: inner(0) -> tipL -> outer(0). O centro da ponta e o proprio vertice da linha central.
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

/* ---- vidro: tier A (transmission) e tier B (falso) ---- */
function glassParams(hi) {
  return hi ? {
    color: 0xFFF3E4, roughness: 0.015, metalness: 0,
    transmission: 1, thickness: 48, ior: 1.52, attenuationColor: col(0xFFE4BE), attenuationDistance: 500, dispersion: 1.2,
    clearcoat: 0.85, clearcoatRoughness: 0.03,
    iridescence: 1, iridescenceIOR: 1.32, iridescenceThicknessRange: [260, 720],
    specularIntensity: 1, specularColor: col(0xFFE9CF), envMapIntensity: 1.7
  } : {
    color: 0x6B4526, roughness: 0.1, metalness: 0.04, transparent: true, opacity: 0.8,
    clearcoat: 1, clearcoatRoughness: 0.04,
    iridescence: 0.7, iridescenceIOR: 1.32, iridescenceThicknessRange: [300, 640],
    sheen: 0.6, sheenColor: col(C.ochre), sheenRoughness: 0.4,
    specularIntensity: 1, specularColor: col(0xFFFFFF), envMapIntensity: 1.8
  };
}

/* ajustes de aparencia (o lab mexe nestes valores) */
const LOOK = { glowR: 0.3, glowAmt: 1.0, glowNoon: 0.0, glowA: 0xB07A48, glowB: 0xC48C50, leafDark: 0.08, botNoon: 0x3A2618, emi: 0.05, rx: 0, ry: 0 };

export async function createPorta(opts) {
  const Q = new URLSearchParams(location.search);
  let TIER = opts.tier || "a";
  const canvas = opts.canvas;
  const dprMax = opts.dprMax || { a: 1.75, b: 1.5 };
  const spinSec = opts.spinSeconds || { a: 16, b: 20 };
  let SPIN = Q.get("spin") !== "0" && !opts.noSpin;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: TIER === "a" ? "high-performance" : "default", preserveDrawingBuffer: !!opts.preserve });
  if (!renderer.capabilities.isWebGL2) throw new Error("webgl2");
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  let dpr = Math.min(window.devicePixelRatio || 1, dprMax[TIER]);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 1.15;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 4000);

  /* ---- fundo: quad em tela cheia (degrade, halo quente atras da porta, sombra de folhas de palmeira ao meio-dia) ---- */
  const bgU = {
    uTop: { value: col(C.night) }, uBot: { value: col(C.umber) },
    uGlow: { value: col(C.clay) }, uGlowAmt: { value: 0.45 },
    uGlowPos: { value: new THREE.Vector2(0.5, 0.6) }, uGlowR: { value: 0.5 },
    uAspect: { value: 1 }, uFlood: { value: 0 }, uCream: { value: col(C.cream) },
    uLeaves: { value: null }, uLeafAmt: { value: 0 }, uLeafOff: { value: new THREE.Vector2(0, 0) }, uLeafDark: { value: 0.3 }
  };
  new THREE.TextureLoader().load(opts.leavesUrl, (t) => {
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.colorSpace = THREE.NoColorSpace; bgU.uLeaves.value = t; bgU.uLeafAmt.value = 1;
  });
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: bgU, depthTest: false, depthWrite: false,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }",
    fragmentShader: `
      uniform vec3 uTop, uBot, uGlow, uCream; uniform float uGlowAmt, uGlowR, uAspect, uFlood, uLeafAmt, uLeafDark; uniform vec2 uGlowPos, uLeafOff;
      uniform sampler2D uLeaves;
      varying vec2 vUv;
      void main(){
        vec3 c = mix(uBot, uTop, smoothstep(0.0, 1.0, vUv.y));
        vec2 d = (vUv - uGlowPos) * vec2(uAspect, 1.0);
        float g = exp(-pow(length(d) / uGlowR, 2.0) * 2.2);
        c = mix(c, uGlow, clamp(g * uGlowAmt, 0.0, 1.0));
        if (uLeafAmt > 0.0) {
          vec2 lu = vec2(vUv.x * uAspect / 1.777, 1.0 - vUv.y) * 0.9 + uLeafOff;
          float leaf = 1.0 - texture2D(uLeaves, lu).r;
          c = mix(c, c * uLeafDark, leaf * uLeafAmt * (0.4 + 0.6 * g));
        }
        c = mix(c, uCream, uFlood);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`
  }));
  bg.frustumCulled = false; bg.renderOrder = -10;
  scene.add(bg);

  /* ---- vidro ---- */
  const glow = { uPointer: { value: new THREE.Vector3(0, 0, 40) }, uGlow: { value: 0 }, uGlowColor: { value: col(C.sun1) }, uGlowR: { value: 70 }, uRim: { value: 1 } };
  function makeGlass(hi) {
    const m = new THREE.MeshPhysicalMaterial(glassParams(hi));
    if (!hi) m.depthFunc = THREE.LessDepth;   // vidro falso e transparente: sem isso as arestas dos triangulos grandes da tampa sao pintadas duas vezes (listras claras)
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, glow);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; uniform vec3 uPointer; uniform float uGlow; uniform vec3 uGlowColor; uniform float uGlowR; uniform float uRim;")
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          // brilho de sol sob o cursor
          totalEmissiveRadiance += uGlowColor * uGlow * exp(-1.6 * pow(distance(vWPos, uPointer) / uGlowR, 2.0));
          // aro fino e claro nas bordas, com iridescencia verde/violeta so no angulo rasante
          float fr = pow(1.0 - clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 3.2);
          vec3 irid = 0.5 + 0.5 * cos(6.2831 * (vec3(0.30, 0.55, 0.80) + fr * 0.9 + vNormal.x * 0.25));
          irid = mix(vec3(0.62, 0.95, 0.80), vec3(0.78, 0.66, 1.0), irid.b);
          totalEmissiveRadiance += (vec3(1.0, 0.95, 0.86) * 0.42 + irid * 0.34) * fr * uRim;
          // volume: brilho quente suave que cresce para a borda interna (a luz "mora" dentro do vidro) + faixa de luz vinda do alto
          float fr1 = pow(1.0 - clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 1.4);
          float topL = smoothstep(-0.1, 0.9, normalize(vNormal).y);
          totalEmissiveRadiance += (vec3(1.0, 0.78, 0.5) * 0.16 * fr1 + vec3(1.0, 0.9, 0.75) * 0.10 * topL * fr1) * uRim;`);
    };
    return m;
  }
  let glass = makeGlass(TIER === "a");
  let geo = buildArchGeometry(TIER === "a");
  const door = new THREE.Group();
  scene.add(door);
  const arch = new THREE.Mesh(geo, glass);
  door.add(arch);

  /* ---- sol: esfera com o degrade do logo (calculado pela normal em espaco de camera: fica igual ao logo mesmo com o arco girando) ---- */
  const sunU = { c1: { value: col(C.sun1) }, c2: { value: col(C.sun2) }, c3: { value: col(C.sun3) }, uBright: { value: 1 } };
  const sun = new THREE.Mesh(new THREE.SphereGeometry(14.4, 48, 32), new THREE.ShaderMaterial({
    uniforms: sunU,
    vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform vec3 c1, c2, c3; uniform float uBright; varying vec3 vN;
      void main(){
        float t = clamp(dot(normalize(vN.xy + 1e-4), vec2(0.7071, -0.7071)) * 0.5 * length(vN.xy) + 0.5, 0.0, 1.0);
        vec3 c = t < 0.55 ? mix(c1, c2, t / 0.55) : mix(c2, c3, (t - 0.55) / 0.45);
        c *= 0.92 + 0.08 * vN.z;
        gl_FragColor = vec4(c * uBright, 1.0);
        #include <colorspace_fragment>
      }`
  }));
  sun.position.set(0, -16.2, 0);
  door.add(sun);

  const sunLight = new THREE.PointLight(C.sun1, 1500, 0, 2);
  sun.add(sunLight);
  const key = new THREE.DirectionalLight(C.cream, 1.2);
  key.position.set(-220, 260, 320);
  scene.add(key);
  const rimL = new THREE.DirectionalLight(C.cream, 2.4);          // contraluz: desenha o aro do lado direito no giro
  rimL.position.set(260, 120, -300);
  scene.add(rimL);
  const curLight = new THREE.PointLight(0xFFF2DD, 0, 0, 1.6);   // reflexo especular que corre com o cursor
  curLight.position.set(0, 0, 150);
  scene.add(curLight);

  const gcv = document.createElement("canvas"); gcv.width = gcv.height = 128;
  const gx = gcv.getContext("2d");
  const gg = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gg.addColorStop(0, "rgba(240,180,80,0.9)"); gg.addColorStop(0.35, "rgba(217,115,47,0.35)"); gg.addColorStop(1, "rgba(180,83,42,0)");
  gx.fillStyle = gg; gx.fillRect(0, 0, 128, 128);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gcv), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, transparent: true, opacity: 0.35 }));
  halo.scale.set(70, 70, 1);
  sun.add(halo);

  /* ---- membrana de luz no vao (o meio-dia do outro lado): a primeira tela de exemplo aparece a 18% dentro dela (so tier A) ---- */
  const memU = { uCream: { value: col(C.cream) }, uWarm: { value: col(C.sun1) }, uOp: { value: 0 }, uSolid: { value: 0 }, uTex: { value: null }, uWorld: { value: 0 }, uWash: { value: 0 } };
  const membrane = new THREE.Mesh(new THREE.ShapeGeometry(openingShape(), 24), new THREE.ShaderMaterial({
    uniforms: memU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `
      uniform vec3 uCream, uWarm; uniform float uOp, uSolid, uWorld, uWash; uniform sampler2D uTex; varying vec2 vP;
      void main(){
        // o mundo do meio-dia atras do vidro: um site de exemplo banhado de luz, com a sombra das folhas (textura "mundo")
        float down = smoothstep(14.0, -62.0, vP.y);
        vec3 c = mix(uCream, uWarm, down * 0.45);
        if (uWorld > 0.0) {
          vec2 tu = vec2((vP.x + 20.0) / 40.0, (vP.y + 62.0) / 82.0);
          vec3 s = texture2D(uTex, tu).rgb;
          s = mix(s, uWarm, down * 0.25);
          // a luz do outro lado: o centro do vao clareia para o creme conforme a camera se aproxima, e as bordas ainda mostram o site
          float cd = length((vP - vec2(0.0, -8.0)) / vec2(20.0, 36.0));
          s = mix(s, uCream, (1.0 - smoothstep(0.0, 1.05, cd)) * uWash);
          c = mix(c, s, uWorld);
        }
        float a = uOp * mix(mix(1.0 - down * 0.55, 1.0, uWorld), 1.0, uSolid);
        c = mix(c, uCream, uSolid);
        gl_FragColor = vec4(c, a);
        #include <colorspace_fragment>
      }`
  }));
  membrane.position.z = -15;
  membrane.renderOrder = 1;
  door.add(membrane);
  if (opts.worldUrl) {
    new THREE.TextureLoader().load(opts.worldUrl, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; memU.uTex.value = t; worldReady = true; });
  }
  let worldReady = false;

  /* ---- estado, layout e entrada ---- */
  let mode = "top", P = 0, footQ = 0;
  let container = opts.container, slotEl = opts.slot;
  let W = 1, H = 1, D0 = 500, VX = 0, VY = 0.1, lastW = 0, lastH = 0;
  let active = false, raf = 0, last = performance.now(), firstFrame = false, destroyed = false;
  const ptr = { x: 0, y: 0, on: 0, over: 0 };
  const touch = { down: false, id: -1, x0: 0, vel: 0, lastX: 0, yaw: 0 };
  let press = 0, pressV = 0, pressT = 0;
  const tilt = { x: 0, y: 0 };
  let idle = parseFloat(Q.get("rot") || "0"), glowNow = 0, spinMul = 1, curI = 0;
  let sunBase = -16.2;
  const ray = new THREE.Raycaster(); const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -16);
  const fpsHist = []; let measuring = 1.8 + 1.5, tierDropped = false;

  function layout(force) {
    if (!container || !slotEl) return false;
    const r = container.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return false;
    // barra do navegador do celular aparecendo e sumindo muda so a altura: nao redimensiona (a cena nao pula)
    if (!force && w === lastW && Math.abs(h - lastH) < 140 && lastH) { /* mantem o tamanho do canvas, so recalcula a posicao */ } else { renderer.setSize(w, h, false); lastW = w; lastH = h; }
    W = lastW; H = lastH;
    camera.aspect = W / H;
    const sr = slotEl.getBoundingClientRect();
    const slotH = Math.max(40, sr.height);
    const cy = (sr.top + sr.height / 2 - r.top) / r.height, cx = (sr.left + sr.width / 2 - r.left) / r.width;
    VY = 0.5 - cy; VX = 0.5 - cx;
    D0 = 124 * r.height / (2 * Math.tan(THREE.MathUtils.degToRad(15)) * slotH);
    bgU.uAspect.value = W / H;
    bgU.uGlowPos.value.set(cx, 1 - cy);
    return true;
  }

  function applyMode() {
    if (mode === "foot") {
      bgU.uTop.value.set(C.umber); bgU.uBot.value.set(C.umber);
      bgU.uGlow.value.set(C.sun2); bgU.uGlowAmt.value = 0.22; bgU.uGlowR.value = 0.12; bgU.uFlood.value = 0; bgU.uLeafAmt.value = bgU.uLeaves.value ? 0.55 : 0;
      memU.uOp.value = 0;
    } else {
      bgU.uGlowR.value = LOOK.glowR;
    }
  }

  /* ---- entradas: cursor (so mouse), toque, clique ---- */
  const onMove = (e) => {
    if (e.pointerType === "touch") return;
    const r = container.getBoundingClientRect();
    ptr.x = (e.clientX - r.left) / r.width * 2 - 1; ptr.y = (e.clientY - r.top) / r.height * 2 - 1; ptr.on = 1;
    const sr = slotEl.getBoundingClientRect();
    ptr.over = (e.clientX > sr.left + sr.width * 0.04 && e.clientX < sr.right - sr.width * 0.04 && e.clientY > sr.top && e.clientY < sr.bottom) ? 1 : 0;
  };
  const onLeave = () => { ptr.on = 0; ptr.over = 0; };
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);
  const onDown = (e) => {
    if (e.pointerType !== "touch" || mode !== "top" || P > 0.12) return;
    const sr = slotEl.getBoundingClientRect();
    if (e.clientX < sr.left - 20 || e.clientX > sr.right + 20 || e.clientY < sr.top - 20 || e.clientY > sr.bottom + 20) return;
    touch.down = true; touch.id = e.pointerId; touch.x0 = e.clientX; touch.lastX = e.clientX; touch.vel = 0; pressT = 1;
  };
  const onTMove = (e) => {
    if (!touch.down || e.pointerId !== touch.id) return;
    const dx = e.clientX - touch.lastX; touch.lastX = e.clientX; touch.vel = dx * 0.012; idle += dx * 0.012;
  };
  const onUp = (e) => { if (e.pointerId === touch.id) { touch.down = false; pressT = 0; } };
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointermove", onTMove, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });
  window.addEventListener("pointercancel", onUp, { passive: true });

  /* ---- loop ---- */
  function frame(now) {
    if (!active || destroyed) { raf = 0; return; }
    raf = requestAnimationFrame(frame);
    const dtRaw = (now - last) / 1000; last = now;
    const dt = Math.min(0.05, dtRaw);
    if (document.hidden) return;
    if (!layoutOk) return;

    // medicao de desempenho: media dos primeiros 2 s; se passar do limite, cai de tier
    if (measuring > 0 && firstFrame) {
      measuring -= dtRaw; if (measuring < 1.5) { fpsHist.push(dtRaw * 1000); }
      if (measuring <= 0) {
        const avg = fpsHist.reduce((a, b) => a + b, 0) / Math.max(1, fpsHist.length);
        api.avgMs = avg;
        if (!opts.noDrop && !tierDropped) {
          if (TIER === "a" && avg > 22) { setTier("b"); } else if (TIER === "b" && avg > 30) { tierDropped = true; opts.onTier && opts.onTier("c"); }
        }
      }
    }

    const settle = mode === "top" ? ss(0.0, 0.10, P) : 1;
    if (SPIN && P === 0 && mode === "top") idle += dt * (Math.PI * 2 / spinSec[TIER]) * spinMul;
    spinMul += ((ptr.over && P === 0 ? 0.3 : 1) - spinMul) * (1 - Math.exp(-dt / 0.2));
    if (touch.down) { /* arrastando: a inercia entra ao soltar */ } else if (Math.abs(touch.vel) > 0.0004) { idle += touch.vel; touch.vel *= Math.exp(-dt * 3.2); }
    const nearest = Math.round(idle / Math.PI) * Math.PI;
    let rotY = lerp(idle, nearest, settle);
    if (mode === "foot") rotY = 0;
    const k = 1 - Math.exp(-dt / 0.3);
    const fine = ptr.on && !touch.down;
    tilt.x += ((fine ? -ptr.y * 0.17 : 0) * (1 - settle * (mode === "top" ? 1 : 0.4)) - tilt.x) * k;
    tilt.y += ((fine ? ptr.x * 0.30 : 0) * (1 - settle * (mode === "top" ? 1 : 0.4)) - tilt.y) * k;
    const bob = Math.sin(now / 1000 * 1.1) * 3 * (1 - settle);
    door.rotation.set(0.10 * (mode === "top" ? 1 - ss(0.32, 0.46, P) : 1) + tilt.x + LOOK.rx, rotY + tilt.y + LOOK.ry, 0);   // 0,10 rad de inclinacao fixa: de frente liso o vidro reflete a lampada do ambiente e fica laranja chapado
    door.position.y = bob;
    // aperto do toque: escala 0,94 e volta com mola (k 220, c 14)
    pressV += (220 * ((pressT ? 0.06 : 0) - press) - 14 * pressV) * dt; press += pressV * dt;
    door.scale.setScalar(1 - Math.max(0, press));
    membrane.rotation.y = -door.rotation.y; membrane.position.z = -15 * Math.cos(door.rotation.y);   // o arco e simetrico (frente = verso), a textura do mundo nao: ela fica sempre de frente e atras do vidro

    let camZ = D0, camY = 0, vy = VY, vx = VX, fov = 30, lookY = 0;
    if (mode === "top") {
      const noon = ss(0.10, 0.28, P);
      sun.position.y = lerp(-16.2, 0, noon);
      sunU.uBright.value = 1 + 0.25 * noon;
      halo.material.opacity = 0.3 + 0.25 * noon;
      memU.uOp.value = ss(0.12, 0.26, P);
      memU.uWorld.value = worldReady ? 0.92 * ss(0.12, 0.28, P) * (1 - ss(0.56, 0.60, P)) : 0;
      memU.uWash.value = ss(0.38, 0.57, P);
      memU.uSolid.value = ss(0.56, 0.60, P);
      glass.emissive.set(C.terracotta); glass.emissiveIntensity = LOOK.emi * noon;
      bgU.uGlow.value.set(LOOK.glowA).lerp(col(LOOK.glowB), 0.5 * noon);
      bgU.uGlowAmt.value = LOOK.glowAmt + LOOK.glowNoon * noon;
      bgU.uBot.value.set(C.umber).lerp(col(LOOK.botNoon), noon);
      bgU.uLeafDark.value = LOOK.leafDark; bgU.uGlowR.value = LOOK.glowR;
      const tr = clamp((P - 0.40) / 0.20, 0, 1), after = clamp((P - 0.60) / 0.05, 0, 1);
      camZ = P < 0.60 ? lerp(D0, -14, easeIn(tr)) : lerp(-14, -60, after);
      camY = lerp(0, -30, ss(0.40, 0.56, P)); lookY = camY;
      fov = lerp(30, 40, ss(0.50, 0.60, P));
      vy = lerp(VY, 0, ss(0.40, 0.52, P)); vx = lerp(VX, 0, ss(0.40, 0.52, P));
      bgU.uFlood.value = P >= 0.60 ? 1 : 0;
    } else {
      // rodape: o sol se poe saindo por baixo da porta; o halo passa de ocre para terracota e apaga
      sun.position.y = lerp(-16.2, -86, ss(0, 1, footQ));
      sunU.uBright.value = 1 - 0.2 * footQ;
      halo.material.opacity = 0.5 * (1 - ss(0.5, 1, footQ));
      halo.material.color.set(C.sun1).lerp(col(C.sun3), footQ);
      sunLight.intensity = 1500 * (1 - ss(0.4, 1, footQ));
      glass.emissiveIntensity = 0;
      bgU.uGlowAmt.value = 0.22 * (1 - 0.7 * footQ);
    }
    camera.position.set(0, camY, camZ);
    camera.fov = fov;
    camera.lookAt(0, lookY, camZ - 300);
    camera.setViewOffset(W, H, W * vx, H * vy, W, H);
    camera.updateProjectionMatrix();
    bgU.uLeafOff.value.set(Math.sin(now / 30000) * 0.03, Math.cos(now / 26000) * 0.02);

    // brilho do cursor + reflexo especular que corre (so mouse)
    if (fine) {
      ray.setFromCamera(new THREE.Vector2(ptr.x, -ptr.y), camera);
      ray.ray.intersectPlane(plane, glow.uPointer.value);
      curLight.position.set(glow.uPointer.value.x, glow.uPointer.value.y, 120);
    }
    const gTarget = (fine && TIER === "a" ? 0.2 : 0) * (1 - settle);
    glowNow += (gTarget - glowNow) * k; glow.uGlow.value = glowNow;
    curI += ((fine && TIER === "a" ? 1 : 0) * (1 - settle * 0.5) - curI) * k; curLight.intensity = 5200 * curI;
    glow.uRim.value = TIER === "a" ? 1 : 1.25;

    if (W > 0 && H > 0) {
      renderer.render(scene, camera);          // nunca renderizar com tamanho 0 (o alvo da transmission fica incompleto)
      if (!firstFrame) { firstFrame = true; opts.onFirstFrame && opts.onFirstFrame(); }
    }
  }
  let layoutOk = false;

  function setTier(t) {
    if (t === TIER) return;
    TIER = t;
    glass.dispose(); geo.dispose();
    glass = makeGlass(t === "a"); geo = buildArchGeometry(t === "a");
    arch.material = glass; arch.geometry = geo;
    dpr = Math.min(window.devicePixelRatio || 1, dprMax[t]);
    renderer.setPixelRatio(dpr); layout(true);
    measuring = 1.8 + 1.5; fpsHist.length = 0;
    opts.onTier && opts.onTier(t, true);
  }

  const api = {
    get tier() { return TIER; },
    get dpr() { return dpr; },
    glass: () => glass,
    avgMs: 0,
    setProgress(p) { P = clamp(p, 0, 1); },
    setFootProgress(q) { footQ = clamp(q, 0, 1); },
    setMode(m, cont, slot) {
      mode = m; if (cont) container = cont; if (slot) slotEl = slot;
      if (cont && canvas.parentNode !== cont) cont.insertBefore(canvas, cont.firstChild);
      applyMode(); layoutOk = layout(true);
    },
    layout() { layoutOk = layout(false); return layoutOk; },
    start() {
      if (active || destroyed) return;
      layoutOk = layout(true); active = true; last = performance.now(); raf = requestAnimationFrame(frame);
    },
    stop() { active = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    isActive: () => active,
    renderOnce() { layoutOk = layout(true); if (layoutOk) { frameOnce(); } },
    /* imagem estatica (poster): arco de frente, sem sol, fundo transparente. Retorna um canvas 2D. */
    renderStill(size, sunOn) {
      const prev = { bg: bg.visible, sun: sun.visible, mem: membrane.visible, size: renderer.getSize(new THREE.Vector2()), pr: renderer.getPixelRatio() };
      const cam = new THREE.PerspectiveCamera(30, 1, 0.5, 4000);
      cam.position.set(0, 0, 124 / (2 * Math.tan(THREE.MathUtils.degToRad(15))) * 1.0 / 0.86);
      cam.lookAt(0, 0, 0);
      bg.visible = false; membrane.visible = false; sun.visible = !!sunOn; scene.background = null;
      door.rotation.set(0.10, 0, 0); door.position.set(0, 0, 0); door.scale.setScalar(1);
      renderer.setPixelRatio(1); renderer.setSize(size, size, false); renderer.setClearColor(0x000000, 0);
      renderer.render(scene, cam);
      const out = document.createElement("canvas"); out.width = out.height = size;
      out.getContext("2d").drawImage(renderer.domElement, 0, 0);
      bg.visible = prev.bg; membrane.visible = prev.mem; sun.visible = prev.sun;
      renderer.setPixelRatio(prev.pr); renderer.setSize(prev.size.x, prev.size.y, false);
      return out;
    },
    setSpin(v) { SPIN = !!v; },
    setRot(v) { idle = v; },
    dispose() {
      destroyed = true; api.stop();
      window.removeEventListener("pointermove", onMove); document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown); window.removeEventListener("pointermove", onTMove);
      window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
      renderer.dispose();
    },
    look: LOOK,
    THREE, scene, camera, renderer, door, sun, bgU, memU, glow, halo, curLight,
    ptrOver: () => ptr.over,
    pressNow() { pressT = 1; setTimeout(() => { pressT = 0; }, 140); }
  };
  function frameOnce() {
    const was = active; active = true; const t = performance.now();
    // um quadro, sem agendar o proximo
    const raf0 = raf; frame(t); if (raf && raf !== raf0) { cancelAnimationFrame(raf); raf = 0; }
    active = was;
  }

  canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); api.stop(); opts.onLost && opts.onLost(); }, false);
  applyMode();
  layoutOk = layout(true);
  window.__porta = api;
  return api;
}
