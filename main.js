
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const redPaintMeshes = [];
let isPaintRevealPlaying = false;

// ========================================
// 01. TRACK DATA
// ========================================

const tracks = [
  {
    title: 'let me…',
    credits: {
      composed: 'shinjihang, XANI',
      lyrics: 'XANI',
      arranged: 'shinjihang',
      mixed: 'shinjihang, TOVER',
      mastered: 'TOVER'
    },
    phi: -.56,
    theta: 1.06,
    phiSpan: .69,
    thetaSpan: .51,
    file: '01-let-me.wav'
  },
  {
    title: 'a home*',
    credits: {
      composed: 'XANI, Sam Calisto',
      lyrics: 'XANI',
      arranged: 'Sam Calisto, EKO',
      mixed: 'TOVER',
      mastered: 'TOVER'
    },
    phi: .60,
    theta: 1.04,
    phiSpan: .69,
    thetaSpan: .52,
    file: '02-a-home.wav'
  },
  {
    title: 'tbh (feat. YECHAN)',
    credits: {
      composed: 'iseo, XANI, 장예찬(YECHAN)',
      lyrics: 'XANI, 장예찬(YECHAN)',
      arranged: 'iseo',
      mixed: 'TOVER',
      mastered: 'TOVER'
    },
    phi: .03,
    theta: 1.74,
    phiSpan: .60,
    thetaSpan: .60,
    file: '03-tbh.wav'
  },
  {
    title: 'try ME (feat. Naji)',
    credits: {
      composed: 'EKO, Naji, justinforthis, XANI',
      lyrics: 'XANI, Naji',
      arranged: 'EKO, Naji, justinforthis',
      mixed: 'justinforthis, TOVER, Naji',
      mastered: 'TOVER'
    },
    phi: 2.12,
    theta: 1.30,
    phiSpan: .55,
    thetaSpan: .68,
    file: '04-try-me.wav'
  },
  {
    title: '사랑은냉동실에',
    credits: {
      composed: 'XANI, Robin Cause',
      lyrics: 'XANI',
      arranged: 'Robin Cause',
      mixed: 'TOVER',
      mastered: 'TOVER'
    },
    phi: -2.10,
    theta: 1.66,
    phiSpan: .73,
    thetaSpan: .52,
    file: '05-freezer.wav'
  }
];


// ========================================
// 02. DOM ELEMENTS
// ========================================

const $ = id => document.getElementById(id);

const app = $('app');
const stage = $('stage');
const canvas = $('apple-canvas');
const fallback = $('fallback');

const introNote = $('intro-note');
const foundNote = $('found-note');
const hint = $('hint');
const introDragMini = $('intro-drag-mini');

const book = $('sticker-book');
const bookGrid = $('book-grid');
const shareBtn = $('share-btn');
const resetBtn = $('reset-btn');

const popup = $('popup');
const audio = $('audio');
const playBtn = $('play-pause');
const wipe = $('paint-wipe');

const rotateHint = $('rotate-hint');

let soundEnabled = false;

const soundIntro = $('sound-intro');
const soundToggle = $('sound-toggle');


// ========================================
// MOBILE AUDIO SESSION FIX
// ========================================

function setPlaybackAudioSession() {

  try {

    if (navigator.audioSession) {

      navigator.audioSession.type = 'playback';

      console.log(
        'Audio session:',
        navigator.audioSession.type
      );

    }

  } catch (error) {

    console.warn(
      'Audio session setting unavailable:',
      error
    );

  }
}


function setSound(enabled) {
  soundEnabled = enabled;
  if (enabled) {
    setPlaybackAudioSession();

    unlockSfxOnGesture();
  }

  syncSfxEnabled();
  

  // 음악 재생 허용 또는 음소거
  audio.muted = !enabled;

  soundIntro.hidden = true;
  soundToggle.hidden = false;

  soundToggle.textContent = enabled ? '♫' : '♪';

  soundToggle.setAttribute(
    'aria-label',
    enabled ? 'Mute sound' : 'Enable sound'
  );
}

$('sound-on').addEventListener('click', () => {
  setSound(true);
});


soundToggle.addEventListener('click', () => {
  setSound(!soundEnabled);
});

const loadingScreen = $('loading-screen');



// ========================================
// 03. THREE.JS SETUP
// ========================================

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  36, 1, .1, 100
);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance'
});

renderer.setPixelRatio(
  Math.min(devicePixelRatio || 1, 2)
);

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .92;
renderer.setClearColor(0xffffff, 0);


// ========================================
// 04. VINTAGE LIGHTING
// ========================================

scene.add(
  new THREE.AmbientLight(0xfff3dc, 1.35)
);

const key = new THREE.DirectionalLight(
  0xffebcd, 1.35
);
key.position.set(-2.8, 3.6, 4.5);
scene.add(key);

const fill = new THREE.DirectionalLight(
  0xdfe9b1, .52
);
fill.position.set(2.8, 1.4, 3);
scene.add(fill);

const top = new THREE.DirectionalLight(
  0xffe7c2, .35
);
top.position.set(0, 4.5, .5);
scene.add(top);


// ========================================
// 05. SCENE OBJECTS
// ========================================

const apple = new THREE.Group();
const introGroup = new THREE.Group();

scene.add(apple, introGroup);

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const textureLoader = new THREE.TextureLoader();

const greenMeshes = [];
const stickers = [];
const introPieces = [];
const customStickers = [];

const targetQuaternion = new THREE.Quaternion();

const axisX = new THREE.Vector3(1, 0, 0);
const axisY = new THREE.Vector3(0, 1, 0);

let ready = false;
let redTemplate = null;
let paint = null;

let introState = 'loading';

let mainCameraZ = 4.2;
let introCameraZ = 8.4;
let introScale = 1;

let introPointer = null;
let mainPointer = null;
let bookDrag = null;

let inertiaX = 0;
let inertiaY = 0;

let foundAt = 0;
let revealAt = 0;
let revealFrom = null;

let lastCheck = 0;
let lastFrame = 0;

let currentTrack = -1;

let popupTimer = 0;
let hintTimer = 0;
let wipeTimer = 0;

const audioDuration = 20;


// ========================================
// 06. GUIDE MESSAGES
// ========================================

const GUIDE = {
  intro: 'Take away the apples to find the green apple',
  found: "There's your green apple",
  peel: 'Peel a sticker to hear a track',
  collection: 'Drag stickers onto your apple'
};

function setGuide(text) {
  const el = introNote?.querySelector(
    '.intro-note-text'
  );

  if (el) el.textContent = text;

  if (introNote) introNote.hidden = false;
  if (foundNote) foundNote.hidden = true;
}

function showFound() {
  if (introNote) introNote.hidden = true;

  const el = foundNote?.querySelector(
    '.found-note-paper'
  );

  if (el) el.textContent = GUIDE.found;

  if (foundNote) foundNote.hidden = false;
}


// ========================================
// 07. RESPONSIVE CAMERA
// ========================================

function resize() {
  const { width, height } =
    stage.getBoundingClientRect();

  if (!width || !height) return;

  renderer.setSize(width, height, false);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  const correction = Math.max(
    1, 1 / camera.aspect
  );

  mainCameraZ = 4.2 * correction;
  introCameraZ = 8.4 * correction;

  if (
    ['loading', 'active', 'found']
      .includes(introState)
  ) {
    camera.position.z = introCameraZ;
  } else if (introState === 'finished') {
    camera.position.z = mainCameraZ;
  }

  camera.lookAt(0, 0, 0);
}

new ResizeObserver(resize).observe(stage);
resize();


// ========================================
// 08. SURFACE PATCH GEOMETRY
// ========================================

function makePatch(spec, model, offset = .012) {
  const steps = 20;

  const positions = [];
  const uvs = [];
  const indices = [];

  const r = new THREE.Raycaster();

  model.updateMatrixWorld(true);

  for (let j = 0; j <= steps; j++) {
    for (let i = 0; i <= steps; i++) {

      const u = i / steps;
      const v = j / steps;

      const th =
        spec.theta - (v - .5) * spec.thetaSpan;

      const ph =
        spec.phi + (u - .5) * spec.phiSpan;

      const dir = new THREE.Vector3(
        Math.sin(th) * Math.sin(ph),
        Math.cos(th),
        Math.sin(th) * Math.cos(ph)
      ).normalize();

      r.set(
        dir.clone().multiplyScalar(3),
        dir.clone().negate()
      );

      const hit = r.intersectObject(
        model, true
      )[0];

      const p = hit
        ? hit.point.clone().addScaledVector(
            dir, offset
          )
        : dir.multiplyScalar(1.05);

      positions.push(p.x, p.y, p.z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < steps; j++) {
    for (let i = 0; i < steps; i++) {

      const a = j * (steps + 1) + i;
      const b = a + 1;
      const c = a + steps + 1;

      indices.push(
        a, b, c,
        b, c + 1, c
      );
    }
  }

  const g = new THREE.BufferGeometry();

  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      positions, 3
    )
  );

  g.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      uvs, 2
    )
  );

  g.setIndex(indices);
  g.computeVertexNormals();

  return g;
}


// ========================================
// 09. RED PAINT TEXTURE
// ========================================


function makeRedPaint(model) {

  // 청사과 모델의 실제 메시 찾기
  let sourceMesh = null;

  model.traverse(obj => {
    if (obj.isMesh && !sourceMesh) {
      sourceMesh = obj;
    }
  });

  if (!sourceMesh) return;

  // 기존 빈티지 페인트 텍스처 유지
  const texture = buildPaintTexture(1024);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshPhysicalMaterial({
    map: texture,
    color: 0xffffff,

    transparent: true,
    opacity: 0.82,
    alphaTest: 0.03,

    roughness: 0.96,
    metalness: 0,
    clearcoat: 0,

    depthWrite: false,
    side: THREE.DoubleSide,

    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });

  // 원본 사과와 같은 형태의 페인트 레이어
  paint = sourceMesh.clone();

  paint.name = 'redPaint';
  paint.material = material;

  // 사과 표면보다 아주 조금 바깥쪽
  paint.scale.multiplyScalar(1.004);

  // 원래 스티커보다 뒤에 표시
  paint.renderOrder = 1;

  // 가장 중요: 실제 사과 모델에 추가
  sourceMesh.parent.add(paint);
}

function fract(x) {
  return x - Math.floor(x);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smooth(a, b, x) {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function noise2D(x, y) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
}

function valueNoise(x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const sx = x - x0;
  const sy = y - y0;

  const n00 = noise2D(x0, y0);
  const n10 = noise2D(x1, y0);
  const n01 = noise2D(x0, y1);
  const n11 = noise2D(x1, y1);

  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);

  return lerp(ix0, ix1, sy);
}

function fbm(x, y) {
  let value = 0;
  let amp = 0.5;
  let freq = 1;

  for (let i = 0; i < 5; i++) {
    value += valueNoise(x * freq, y * freq) * amp;
    freq *= 2;
    amp *= 0.5;
  }

  return value;
}


function buildPaintTexture(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const i = (y * size + x) * 4;

      // 붓칠이 사과 전체를 감싸도록,
      // UV 전체에 큰 흐름을 주는 패턴
      const sweep1 = Math.sin((u * 1.15 + v * 2.6) * Math.PI * 1.3);
      const sweep2 = Math.sin((u * 2.1 - v * 1.35) * Math.PI * 1.1);
      const sweep3 = Math.sin((u * 0.8 + v * 3.8) * Math.PI * 0.9);

      const n1 = fbm(u * 5.2, v * 5.2);
      const n2 = fbm(u * 12.0 + 2.3, v * 12.0 + 6.7);
      const grain = valueNoise(u * 48.0, v * 48.0);

      // 기본적으로 거의 전체가 칠해져 있게
      let alpha = 0.84;

      // 넓은 붓자국 느낌
      alpha += sweep1 * 0.08;
      alpha += sweep2 * 0.06;
      alpha += sweep3 * 0.04;

      // 표면 거친 질감
      alpha += (n1 - 0.5) * 0.12;
      alpha += (n2 - 0.5) * 0.08;

      // 아주 조금씩만 초록이 비치게
      const worn =
        Math.max(0, n1 - 0.74) * 0.18 +
        Math.max(0, n2 - 0.80) * 0.12;

      alpha -= worn;

      
      // 기본적으로 붉은 물감이 진하게 칠해짐
      alpha = THREE.MathUtils.clamp(alpha, 0.90, 0.98);

      // 약 10%의 청사과 껍질이 드러나는 영역
      // 위치와 경계를 불규칙하게 처리
      const dx = (u - 0.57) / 0.23;
      const dy = (v - 0.48) / 0.15;

      const irregularEdge =
        Math.sin(u * 31 + v * 17) * 0.11 +
        Math.sin(u * 67 - v * 41) * 0.045;

      const distance = Math.hypot(dx, dy) + irregularEdge;

      // 초록색이 드러나는 부분
      const greenOpening =
        1 - smooth(0.78, 1.13, distance);

      // 물감을 제거해 원래 청사과 표면 노출
      alpha *= (1 - greenOpening * 0.99);


      // 예전 느낌의 빈티지한 빨강
      const stain = fbm(u * 8.0 + 1.7, v * 8.0 + 3.4);

      const r = THREE.MathUtils.clamp(178 + stain * 20 + grain * 10, 0, 255);
      const g = THREE.MathUtils.clamp(48 + stain * 9 + grain * 5, 0, 255);
      const b = THREE.MathUtils.clamp(44 + stain * 7 + grain * 4, 0, 255);

      data[i + 0] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = Math.floor(alpha * 255);
    }
  }

  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;

  return tex;
}


// ========================================
// 10. LOAD GREEN APPLE
// ========================================

function loadGreen() {

  new GLTFLoader().load(

    './assets/tasty_green_apple_web_2k.glb',

    ({ scene: model }) => {

      const box =
        new THREE.Box3().setFromObject(model);

      const size =
        box.getSize(new THREE.Vector3());

      const center =
        box.getCenter(new THREE.Vector3());

      const scale = 2.2 / Math.max(
        size.x, size.y, size.z
      );

      model.scale.setScalar(scale);

      model.position
        .copy(center)
        .multiplyScalar(-scale);

      apple.add(model);
      apple.updateMatrixWorld(true);


      // GREEN APPLE MATERIAL

      model.traverse(mesh => {

        if (!mesh.isMesh) return;

        greenMeshes.push(mesh);

        if (
          Array.isArray(mesh.material) ||
          !mesh.material
        ) return;

        const m = mesh.material;

        mesh.material =
          new THREE.MeshPhysicalMaterial({
            map: m.map || null,
            roughnessMap: m.roughnessMap || null,
            color: '#c8da73',
            roughness: .92,
            metalness: 0,
            clearcoat: 0
          });

        if (mesh.material.map) {
          mesh.material.map.colorSpace =
            THREE.SRGBColorSpace;
        }

        mesh.material.emissive.set('#8f9c45');
        mesh.material.emissiveIntensity = .02;
      });


      // FIVE ORIGINAL STICKERS

      tracks.forEach((t, i) => {

        const number =
          String(i + 1).padStart(2, '0');

        const tex = textureLoader.load(
          `./assets/stickers/sticker-${number}.png`
        );

        tex.colorSpace = THREE.SRGBColorSpace;

        tex.anisotropy = Math.min(
          8,
          renderer.capabilities.getMaxAnisotropy()
        );

        
        const material =
          new THREE.MeshStandardMaterial({
            map: tex,

            // 따뜻한 빈티지 색감 + 약간 낮은 명도
            color: '#eee5d5',

            transparent: true,
            alphaTest: .06,
            side: THREE.DoubleSide,
            depthWrite: false,

            // 사과 표면과 비슷한 무광 질감
            roughness: .96,
            metalness: 0
          });


        const geometry = makePatch(t, model);

        const mesh = new THREE.Mesh(
          geometry, material
        );

        mesh.userData.track = i;
        mesh.renderOrder = 2;

        apple.add(mesh);

        stickers.push({
          mesh,

          homeGeometry: geometry.clone(),

          base: Float32Array.from(
            geometry.attributes.position.array
          ),

          unlocked: false,
          peeled: false,

          fallAt: 0,
          returnAt: 0,
          returnAmount: 0,

          dragX: 0,
          dragY: 0
        });
      });


      // RED PAINT OVER GREEN APPLE

      makeRedPaint(model);

      apple.rotation.y = -.15;

      targetQuaternion.copy(
        apple.quaternion
      );

      ready = true;

      loadRed();
    },

    undefined,

    error => {
      console.error(
        'Green GLB load failed:',
        error
      );

      if (fallback) fallback.hidden = false;
      if (soundIntro) soundIntro.hidden = true;
      hideLoadingScreen();
    }
  );
}


// ========================================
// 11. LOAD RED APPLE
// ========================================

function normalizeRed(root) {

  const box =
    new THREE.Box3().setFromObject(root);

  const size =
    box.getSize(new THREE.Vector3());

  const center =
    box.getCenter(new THREE.Vector3());

  const scale = 2.2 / Math.max(
    size.x, size.y, size.z
  );

  root.scale.setScalar(scale);

  root.position
    .copy(center)
    .multiplyScalar(-scale);

  root.traverse(mesh => {

    if (
      !mesh.isMesh ||
      !mesh.material ||
      Array.isArray(mesh.material)
    ) return;

    const map = mesh.material.map || null;

    if (map) {
      map.colorSpace = THREE.SRGBColorSpace;
    }

    mesh.material =
      new THREE.MeshLambertMaterial({
        map,
        color: '#f3e3d5'
      });
  });

  const group = new THREE.Group();
  group.add(root);

  return group;
}

function loadRed() {

  new GLTFLoader().load(

    './assets/red-apple-web-2k.glb',

    gltf => {

      redTemplate = normalizeRed(
        gltf.scene
      );

      buildPile();
    },

    undefined,

    error => {

      console.warn(
        'Red GLB failed:',
        error
      );

      finishIntro();
      hideLoadingScreen();
    }
  );
}


// ========================================
// 12. RANDOM UTILITIES
// ========================================

let seed = 472819;

const random = () => {
  seed =
    (1664525 * seed + 1013904223) >>> 0;

  return seed / 4294967296;
};

const between = (a, b) =>
  a + (b - a) * random();



// ========================================
// LOADING SCREEN
// ========================================



function hideLoadingScreen() {

  if (!loadingScreen || loadingScreen.hidden) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {

      loadingScreen.classList.add('is-ready');

      setTimeout(() => {
        loadingScreen.hidden = true;
      }, 550);

    });
  });
}



// ========================================
// 13. RED APPLE PILE
// ========================================

function buildPile() {

  if (!ready || !redTemplate) return;

  seed = 472819;

  introGroup.clear();
  introPieces.length = 0;
  introGroup.visible = true;

  const viewH =
    2 * introCameraZ *
    Math.tan(
      THREE.MathUtils.degToRad(camera.fov) / 2
    );

  const viewW = viewH * camera.aspect;

  const d = camera.aspect < .85
    ? viewW / 3.9
    : viewH / 4.05;

  introScale = d / 2.2;

  const stepX = d * .78;
  const stepY = d * .70;

  const cols =
    Math.ceil(viewW / stepX) + 3;

  const rows =
    Math.ceil(viewH / stepY) + 3;

  apple.scale.setScalar(introScale);
  apple.position.set(0, 0, -.1);
  apple.visible = true;

  if (paint) {
    paint.visible = true;
    paint.material.opacity = 1;
  }


  function addRed(x, y, z) {

    const root = redTemplate.clone(true);
    const id = introPieces.length;

    root.scale.setScalar(introScale);
    root.position.set(x, y, z);

    const flip = random() < .17;

    root.rotation.set(
      flip
        ? Math.PI + between(-.22, .22)
        : between(-.4, .42),

      between(-.9, .9),
      between(-.32, .32)
    );

    const meshes = [];

    root.traverse(mesh => {

      if (mesh.isMesh) {
        mesh.userData.pileIndex = id;
        meshes.push(mesh);
      }
    });

    introGroup.add(root);

    introPieces.push({
      root,
      meshes,
      gone: false,

      velocity: new THREE.Vector3(),
      spin: between(-3, 3),

      revealFrom: null,
      revealTo: null
    });
  }


  // BACK LAYER

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {

      addRed(

        (col - (cols - 1) / 2) * stepX
          + (row % 2) * stepX * .36
          + between(-.18, .18) * d,

        ((rows - 1) / 2 - row) * stepY
          + between(-.16, .16) * d,

        -1.12 + between(-.09, .08)
      );
    }
  }


  // MIDDLE LAYER

  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {

      if (random() < .22) continue;

      const x =
        (col - (cols - 2) / 2) * stepX
        + (row % 2 ? -.25 : .22) * d
        + between(-.23, .23) * d;

      const y =
        ((rows - 2) / 2 - row) * stepY
        + between(-.19, .19) * d;

      if (Math.hypot(x, y) < d * .42) {
        continue;
      }

      addRed(
        x, y,
        -.52 + between(-.07, .12)
      );
    }
  }


  // FRONT LAYER

  const front = [
    [-.43, .33],
    [.41, .25],
    [-.37, -.37],
    [.39, -.35],
    [-1.42, .15],
    [1.36, -.12],
    [-.96, -1.17],
    [.97, -1.13],
    [-1.20, 1.22],
    [1.14, 1.18]
  ];

  for (const [u, v] of front) {

    addRed(

      u * d + between(-.09, .09) * d,

      v * d + between(-.08, .08) * d,

      .28 + between(-.04, .07)
    );
  }

  introState = 'active';

  app.classList.add('is-intro');
  app.classList.remove('is-revealing');

  setGuide(GUIDE.intro);
  hideLoadingScreen();
}

// ========================================
// INTRO APPLE DRAG CUE
// ========================================

let introCuePiece = null;
let introCueOrigin = null;
let introCueStartedAt = 0;
let introCueDone = false;

function stopIntroDragCue() {
  if (introCuePiece && introCueOrigin && !introCuePiece.gone) {
    introCuePiece.root.position.copy(introCueOrigin);
  }

  hideIntroDragMini();

  introCueDone = true;
  introCuePiece = null;
  introCueOrigin = null;
}


function updateIntroDragCue(now) {

  if (
    introState !== 'active' ||
    !soundIntro.hidden ||
    introPointer ||
    introCueDone
  ) return;

  if (!introCuePiece) {

    introCuePiece = introPieces.at(-10);

    if (!introCuePiece) return;

    introCueOrigin =
      introCuePiece.root.position.clone();

    introCueStartedAt = now;
  }

  const elapsed = now - introCueStartedAt;

  // 시작 전 잠깐 기다리기
  if (elapsed < 500) return;
  showIntroDragMini();

  // 전체 모션 시간
  const duration = 2400;

  const t = Math.min(
    (elapsed - 500) / duration,
    1
  );

  // 부드러운 가속과 감속
  const easeInOut = x =>
    x < .5
      ? 4 * x * x * x
      : 1 - Math.pow(-2 * x + 2, 3) / 2;

  let movement = 0;

  if (t < .28) {

    // 첫 번째: 천천히 출발 → 가속 → 감속
    movement = easeInOut(t / .28);

  } else if (t < .52) {

    // 자연스럽게 제자리로 돌아오기
    movement = 1 - easeInOut(
      (t - .28) / .24
    );

  } else if (t < .62) {

    // 잠깐 정지
    movement = 0;

  } else if (t < .79) {

    // 두 번째: 조금 더 작은 움직임
    movement = .55 * easeInOut(
      (t - .62) / .17
    );

  } else {

    // 천천히 마무리
    movement = .55 * (
      1 - easeInOut((t - .79) / .21)
    );
  }

  const distance = introScale * 2.2;

  introCuePiece.root.position.set(
    introCueOrigin.x + movement * distance * .20,
    introCueOrigin.y + movement * distance * .035,
    introCueOrigin.z
  );

  // DRAG LABEL FOLLOWS THE MOVING APPLE

  scene.updateMatrixWorld(true);

  const worldPos = introCuePiece.root.getWorldPosition(
    new THREE.Vector3()
  );

  const screenPos = worldPos.clone().project(camera);

  const rect = stage.getBoundingClientRect();

  const x = (screenPos.x + 1) * .5 * rect.width;
  const y = (1 - screenPos.y) * .5 * rect.height;

  // 사과의 화면상 크기에 따라 라벨 위치 조정
  const radiusPx =
    introScale * 1.1 *
    rect.height *
    camera.projectionMatrix.elements[5] /
    (2 * Math.max(.1, camera.position.z - worldPos.z));

  // 사과의 오른쪽 위에 배치
  introDragMini.style.left =
    `${x + radiusPx * .40}px`;

  introDragMini.style.top =
    `${y - radiusPx * .45}px`;

  showIntroDragMini();

  if (t >= 1) {
    stopIntroDragCue();
  }
}

function showIntroDragMini() {
  introDragMini?.classList.add('is-visible');
}

function hideIntroDragMini() {
  introDragMini?.classList.remove('is-visible');
}

// ========================================
// 14. RAYCASTING
// ========================================

function rayFromPointer(e) {

  const r = canvas.getBoundingClientRect();

  ndc.set(
    (e.clientX - r.left) / r.width * 2 - 1,

    -(e.clientY - r.top) / r.height * 2 + 1
  );

  scene.updateMatrixWorld(true);

  raycaster.setFromCamera(ndc, camera);
}

function pickRed(e) {

  rayFromPointer(e);

  const candidates = introPieces

    .filter(p =>
      p.root.visible && !p.gone
    )

    .flatMap(p => p.meshes);

  const hit = raycaster.intersectObjects(
    candidates, false
  )[0];

  return hit
    ? introPieces[
        hit.object.userData.pileIndex
      ]
    : null;
}

function worldDrag(dx, dy) {

  const h =
    2 * camera.position.z *
    Math.tan(
      THREE.MathUtils.degToRad(camera.fov) / 2
    );

  return new THREE.Vector3(
    dx * h / stage.clientHeight,
    -dy * h / stage.clientHeight,
    0
  );
}

function removeRed(piece, dx, dy) {

  if (piece.gone) return;

  piece.gone = true;

  piece.velocity.copy(
    worldDrag(dx, dy).multiplyScalar(2.2)
  );

  piece.velocity.y += .6;

  piece.spin = between(-3.8, 3.8);
  void playSfx('drop');
}


// ========================================
// 15. GREEN APPLE DISCOVERY
// ========================================

const samples = [
  new THREE.Vector2(0, 0)
];

for (const r of [.4, .72, .88]) {
  for (let k = 0; k < 12; k++) {

    const a = k * Math.PI / 6;

    samples.push(
      new THREE.Vector2(
        Math.cos(a) * r,
        Math.sin(a) * r
      )
    );
  }
}

function projection(object) {

  const pos = object.getWorldPosition(
    new THREE.Vector3()
  );

  const p = pos.clone().project(camera);
  const h = stage.clientHeight;

  const radius =
    object.getWorldScale(
      new THREE.Vector3()
    ).x * 1.04;

  return {
    x: p.x * stage.clientWidth / 2,
    y: p.y * h / 2,

    r:
      radius * h *
      camera.projectionMatrix.elements[5] /
      (
        2 * Math.max(
          .1,
          camera.position.z - pos.z
        )
      ),

    z: pos.z
  };
}

function greenExposure() {

  if (!ready) return 0;

  scene.updateMatrixWorld(true);

  const c = projection(apple);

  const fronts = introPieces

    .filter(p =>
      p.root.visible &&
      p.root.position.z > apple.position.z + .1
    )

    .map(p => projection(p.root));

  let visible = 0;
  let centreOpen = false;

  samples.forEach((s, i) => {

    const x = c.x + s.x * c.r * .92;
    const y = c.y + s.y * c.r * .92;

    const covered = fronts.some(r =>

      Math.hypot(
        r.x - x,
        r.y - y
      ) < r.r * .81
    );

    if (!covered) visible++;

    if (i === 0) {
      centreOpen = !covered;
    }
  });

  return centreOpen
    ? visible / samples.length
    : 0;
}

function checkDiscovery(now) {

  if (
    introState !== 'active' ||
    introPointer ||
    now - lastCheck < 190
  ) return;

  lastCheck = now;

  if (greenExposure() < .76) return;

  introState = 'found';
  foundAt = now;

  showFound();
}


// ========================================
// 16. PAINT WIPE TRANSITION
// ========================================


function showWipe() {

  if (!wipe) return;

  clearTimeout(wipeTimer);

  wipe.hidden = false;

  // CSS와 동일한 클래스 사용
  wipe.classList.remove('is-active');

  // 애니메이션 재시작
  void wipe.offsetWidth;

  wipe.classList.add('is-active');

  wipeTimer = setTimeout(() => {

    wipe.classList.remove('is-active');
    wipe.hidden = true;

  }, 1500);
}


function startReveal(
  now = performance.now()
) {

  if (
    !ready ||
    introState === 'revealing' ||
    introState === 'finished'
  ) return;

  introState = 'revealing';

  revealAt = now;

  revealFrom = {
    z: camera.position.z,
    scale: apple.scale.x,
    position: apple.position.clone()
  };

  app.classList.add('is-revealing');

  setGuide(GUIDE.peel);

  showWipe();
  void playSfx('found');

  introPieces.forEach(p => {

    p.revealFrom =
      p.root.position.clone();

    const direction = new THREE.Vector3(
      p.root.position.x + .08,
      p.root.position.y + .04,
      -.15
    ).normalize();

    p.revealTo =
      p.root.position.clone()
        .addScaledVector(direction, 6.5);
  });
}

function finishIntro() {

  introState = 'finished';

  introGroup.visible = false;

  apple.visible = true;
  apple.position.set(0, 0, 0);
  apple.scale.setScalar(1);

  if (paint) {
    paint.visible = false;
    paint.material.opacity = 0;
  }

  camera.position.z = mainCameraZ;
  camera.lookAt(0, 0, 0);

  app.classList.remove(
    'is-intro',
    'is-revealing'
  );

  if (foundNote) foundNote.hidden = true;

  setGuide(GUIDE.peel);

  if (book) book.hidden = false;

  renderBook();

  // 회전 안내 먼저
  showRotateHint();

  // 회전 안내가 사라진 뒤 스티커 힌트
  setTimeout(startPeelCue, 1200);
}

// ========================================
// ROTATION GUIDE
// ========================================

let rotateHintStartTimer = 0;
let rotateHintEndTimer = 0;

function showRotateHint() {

  clearTimeout(rotateHintStartTimer);
  clearTimeout(rotateHintEndTimer);

  rotateHintStartTimer = setTimeout(() => {

    if (
      introState !== 'finished' ||
      appleTouched ||
      !popup.hidden
    ) return;

    rotateHint.hidden = false;

    rotateHintEndTimer = setTimeout(() => {
      rotateHint.hidden = true;
    }, 1800);

  }, 500);
}

function hideRotateHint() {
  clearTimeout(rotateHintStartTimer);
  clearTimeout(rotateHintEndTimer);

  rotateHint.hidden = true;
}

// ========================================
// 17. FIND STICKER
// ========================================

function pickSticker(e) {

  rayFromPointer(e);

  const targets = stickers
    .filter(s => !s.peeled)
    .map(s => s.mesh)
    .concat(greenMeshes);

  const hit = raycaster.intersectObjects(
    targets, false
  )[0];

  return (
    hit &&
    Number.isInteger(hit.object.userData.track)
  )
    ? hit.object.userData.track
    : -1;
}


// ========================================
// 18. PEEL DEFORMATION
// ========================================

function bendSticker(s, amount, dx, dy) {

  const pos =
    s.mesh.geometry.attributes.position;

  const uv =
    s.mesh.geometry.attributes.uv;

  const horizontal =
    Math.abs(dx) >= Math.abs(dy);

  const positive = horizontal
    ? dx >= 0
    : dy <= 0;

  const dir = new THREE.Vector3(
    dx, -dy, 0
  );

  if (dir.lengthSq()) {
    dir.normalize().applyQuaternion(
      apple.quaternion.clone().invert()
    );
  }

  for (let i = 0; i < pos.count; i++) {

    const u = horizontal
      ? uv.getX(i)
      : uv.getY(i);

    const edge = positive
      ? u
      : 1 - u;

    const lifted =
      THREE.MathUtils.smoothstep(
        edge,
        1 - amount * 1.15 - .16,
        1 - amount * 1.15 + .12
      );

    const x = s.base[i * 3];
    const y = s.base[i * 3 + 1];
    const z = s.base[i * 3 + 2];

    const n = new THREE.Vector3(
      x, y * .35, z
    ).normalize();

    const h =
      lifted * (.04 + .29 * amount)
      + .045 * Math.sin(Math.PI * lifted);

    const shift =
      amount * .34 * lifted;

    pos.setXYZ(
      i,

      x + n.x * h + dir.x * shift,
      y + n.y * h + dir.y * shift,
      z + n.z * h + dir.z * shift
    );
  }

  pos.needsUpdate = true;

  s.mesh.geometry.computeVertexNormals();

  s.dragX = dx;
  s.dragY = dy;
}

function restoreSticker(s) {

  const a =
    s.mesh.geometry.attributes.position;

  a.array.set(s.base);
  a.needsUpdate = true;

  s.mesh.geometry.computeVertexNormals();

  s.mesh.position.set(0, 0, 0);
  s.mesh.rotation.set(0, 0, 0);

  s.mesh.visible = true;
  s.mesh.material.opacity = 1;
}

// ========================================
// FIRST PEEL HINT
// ========================================

let peelCueActive = false;
let peelCueStart = 0;
let peelCueShown = false;
let appleTouched = false;

function startPeelCue() {
  if (peelCueShown) return;

  peelCueShown = true;

  setTimeout(() => {
    if (
      introState !== 'finished' ||
      appleTouched ||
      !stickers[0] ||
      stickers[0].peeled
    ) return;

    peelCueActive = true;
    peelCueStart = performance.now();
  }, 800);
}

function stopPeelCue() {
  if (!peelCueActive) return;

  peelCueActive = false;

  if (stickers[0] && !stickers[0].peeled) {
    restoreSticker(stickers[0]);
  }
}

function updatePeelCue(now) {
  if (!peelCueActive) return;

  const t = Math.min(
    1,
    (now - peelCueStart) / 1600
  );

  if (t >= 1) {
    stopPeelCue();
    return;
  }

  // 두 번 아주 살짝 들렸다 붙음
  const lift =
    Math.pow(Math.sin(t * Math.PI * 2), 2)
    * (1 - t)
    * 0.20;

  bendSticker(
    stickers[0],
    lift,
    30,
    -12
  );
}


// ========================================
// 19. SMOOTH ROTATION
// ========================================

function rotateApple(dx, dy) {

  targetQuaternion.premultiply(
    new THREE.Quaternion().setFromAxisAngle(
      axisY,
      dx * .009
    )
  );

  targetQuaternion.premultiply(
    new THREE.Quaternion().setFromAxisAngle(
      axisX,
      dy * .009
    )
  ).normalize();

  inertiaX = dx * .009;
  inertiaY = dy * .009;
}


// ========================================
// 20. MAIN POINTER EVENTS
// ========================================

canvas.addEventListener(
  'pointerdown',
  e => {

    if (
      !ready ||
      introPointer ||
      mainPointer ||
      !popup.hidden
    ) return;


    // INTRO DRAG

    if (introState === 'active') {

      const piece = pickRed(e);

      if (!piece) return;
      unlockSfxOnGesture();
      
      stopIntroDragCue();

      e.preventDefault();

      canvas.setPointerCapture(e.pointerId);

      introPointer = {
        id: e.pointerId,
        piece,

        x: e.clientX,
        y: e.clientY,

        start: piece.root.position.clone()
      };

      return;
    }


    // MAIN APPLE

    if (introState !== 'finished') return;

    hideRotateHint();

    e.preventDefault();

    canvas.setPointerCapture(e.pointerId);
    appleTouched = true;
    stopPeelCue();

    const index = pickSticker(e);

    inertiaX = 0;
    inertiaY = 0;

    targetQuaternion.copy(
      apple.quaternion
    );

    mainPointer = {
      id: e.pointerId,
      index,

      x: e.clientX,
      y: e.clientY,

      prevX: e.clientX,
      prevY: e.clientY,

      moved: false,
      amount: 0
    };

    if (index >= 0) {
      stickers[index].returnAt = 0;
    }
  }
);


canvas.addEventListener(
  'pointermove',
  e => {

    // RED APPLE DRAG

    if (
      introPointer &&
      e.pointerId === introPointer.id
    ) {

      introPointer.piece.root.position
        .copy(introPointer.start)
        .add(
          worldDrag(
            e.clientX - introPointer.x,
            e.clientY - introPointer.y
          )
        );

      return;
    }


    // HOVER

    if (!mainPointer) {

      if (
        introState === 'finished' &&
        e.pointerType !== 'touch'
      ) {

        canvas.style.cursor =
          pickSticker(e) >= 0
            ? 'pointer'
            : 'grab';
      }

      return;
    }


    if (mainPointer.id !== e.pointerId) {
      return;
    }

    const p = mainPointer;

    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;

    if (Math.hypot(dx, dy) > 5) {
      p.moved = true;
    }

    if (p.index >= 0 && p.moved) {

      p.amount = Math.min(
        1,
        Math.hypot(dx, dy) /
          Math.max(
            105,
            stage.clientWidth * .26
          )
      );

      bendSticker(
        stickers[p.index],
        p.amount,
        dx,
        dy
      );

    } else if (
      p.index < 0 &&
      p.moved
    ) {

      rotateApple(
        e.clientX - p.prevX,
        e.clientY - p.prevY
      );
    }

    p.prevX = e.clientX;
    p.prevY = e.clientY;
  }
);


// ========================================
// 21. POINTER RELEASE
// ========================================

function onRelease(e) {

  if (
    introPointer &&
    introPointer.id === e.pointerId
  ) {

    const p = introPointer;

    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;

    if (Math.hypot(dx, dy) > 32) {
      removeRed(p.piece, dx, dy);
    } else {
      p.piece.root.position.copy(p.start);
    }

    if (
      canvas.hasPointerCapture(e.pointerId)
    ) {
      canvas.releasePointerCapture(
        e.pointerId
      );
    }

    introPointer = null;
    return;
  }


  if (
    !mainPointer ||
    mainPointer.id !== e.pointerId
  ) return;

  const p = mainPointer;

  if (p.index >= 0) {

    const s = stickers[p.index];

    if (
      p.moved &&
      p.amount >= .6
    ) {

      s.peeled = true;
      s.unlocked = true;

      s.fallAt = performance.now();

      renderBook();
      void playSfx('peel');
      startPreview(p.index);

      clearTimeout(popupTimer);

      popupTimer = setTimeout(
        () => openPopup(p.index),
        820
      );

      if (stickers.every(x => x.unlocked)) {
        setGuide(GUIDE.collection);
        bookCuePending = true;
      }

    } else if (p.moved) {

      s.returnAt = performance.now();
      s.returnAmount = p.amount;

    } else {

      showHint();
    }
  }

  if (
    canvas.hasPointerCapture(e.pointerId)
  ) {
    canvas.releasePointerCapture(
      e.pointerId
    );
  }

  mainPointer = null;
}

canvas.addEventListener(
  'pointerup',
  onRelease
);

canvas.addEventListener(
  'pointercancel',
  e => {

    if (
      introPointer?.id === e.pointerId
    ) {
      introPointer.piece.root.position.copy(
        introPointer.start
      );

      introPointer = null;
    }

    if (
      mainPointer?.id === e.pointerId
    ) {

      if (mainPointer.index >= 0) {
        restoreSticker(
          stickers[mainPointer.index]
        );
      }

      mainPointer = null;
    }
  }
);




 // ========================================
 // 22. SOUND EFFECTS
 // ========================================

 const SFX = {

   drop: {
     url: './assets/sfx/apple-drop.wav',
     offset: 0,
     duration: 1.1,
     volume: 1.15
   },

   found: {
     url: './assets/sfx/apple-found.mp3',
     offset: 0,
     duration: 0.72,
     volume: 1.6
   },

   peel: {
     url: './assets/sfx/sticker-peel.mp3',
     offset: 1.0,
     duration: 0.8,
     volume: 0.14
   },

   stick: {
     url: './assets/sfx/sticker-stick.wav',
     offset: 0,
     duration: 0.35,
     volume: 0.38
   },

   camera: {
     url: './assets/sfx/camera-click.wav',
     offset: 0,
     duration: 1.0,
     volume: 0.18
   }

 };


 let sfxContext = null;
 let sfxMasterGain = null;

 const sfxBuffers = new Map();
 const sfxLoading = new Map();


 // AUDIO CONTEXT

 function getSfxContext() {

   if (sfxContext) return sfxContext;

   const Context =
     window.AudioContext ||
     window.webkitAudioContext;

   if (!Context) return null;

   sfxContext = new Context();

   sfxMasterGain = sfxContext.createGain();

   sfxMasterGain.gain.value =
     soundEnabled ? 1 : 0;

   sfxMasterGain.connect(
     sfxContext.destination
   );

   return sfxContext;
 }


 // ========================================
 // MOBILE AUDIO UNLOCK
 // ========================================

 function unlockSfxOnGesture() {

   if (!soundEnabled) return;

   const ctx = getSfxContext();

   if (!ctx) return;

   if (ctx.state === 'running') return;

   // 사용자 터치 동작 안에서 즉시 활성화
   void ctx.resume().catch(error => {
     console.warn('Audio unlock failed:', error);
   });

   // 무음 버퍼로 모바일 오디오 시작 허용
   const silentBuffer = ctx.createBuffer(
     1,
     128,
     ctx.sampleRate
   );

   const source = ctx.createBufferSource();

   source.buffer = silentBuffer;
   source.connect(sfxMasterGain);

   source.start(0);

   source.onended = () => {
     source.disconnect();
   };
 }



 // LOAD AND DECODE AUDIO

 function loadSfxBuffer(name) {

   if (!SFX[name]) {
     return Promise.reject(
       new Error(`Unknown SFX: ${name}`)
     );
   }

   if (sfxBuffers.has(name)) {
     return Promise.resolve(
       sfxBuffers.get(name)
     );
   }

   if (sfxLoading.has(name)) {
     return sfxLoading.get(name);
   }

   const ctx = getSfxContext();

   if (!ctx) {
     return Promise.reject(
       new Error('Web Audio API unsupported')
     );
   }

   const pending = (async () => {

     const response = await fetch(
       SFX[name].url
     );

     if (!response.ok) {
       throw new Error(
         `${name}: HTTP ${response.status}`
       );
     }

     const encoded =
       await response.arrayBuffer();

     const buffer =
       await ctx.decodeAudioData(encoded);

     sfxBuffers.set(name, buffer);

     return buffer;

   })();

   sfxLoading.set(name, pending);

   pending.catch(() => {
     sfxLoading.delete(name);
   });

   return pending;
 }


 // SOUND ON / OFF

 function syncSfxEnabled() {

   if (!soundEnabled && !sfxContext) {
     return;
   }

   const ctx = getSfxContext();

   if (!ctx) return;

   sfxMasterGain.gain.setValueAtTime(
     soundEnabled ? 1 : 0,
     ctx.currentTime
   );

   if (soundEnabled) {

     void ctx.resume().catch(console.warn);

     // Sound on을 누르면 효과음 미리 로드
     for (const name of Object.keys(SFX)) {

       void loadSfxBuffer(name).catch(error => {
         console.warn(
           'SFX preload failed:',
           error
         );
       });

     }
   }
 }


 // PLAY SOUND EFFECT

 async function playSfx(name) {

   if (!soundEnabled || !SFX[name]) {
     return;
   }

   const config = SFX[name];

   const ctx = getSfxContext();

   if (!ctx) return;

   try {

     const buffer =
       await loadSfxBuffer(name);

     if (!soundEnabled) return;

     if (ctx.state !== 'running') {
       await ctx.resume();
     }

     // 재생 시작점
     const offset = Math.min(
       Math.max(0, config.offset),
       Math.max(0, buffer.duration - .01)
     );

     // 재생 길이
     const duration = Math.min(
       config.duration,
       buffer.duration - offset
     );

     if (duration <= 0) return;


     const source =
       ctx.createBufferSource();

     const gain =
       ctx.createGain();

     source.buffer = buffer;

     source.connect(gain);
     gain.connect(sfxMasterGain);


     const now = ctx.currentTime;

     // 앞뒤 아주 짧은 페이드
     const fade = Math.min(
       .02,
       duration / 4
     );

     gain.gain.setValueAtTime(0, now);

     gain.gain.linearRampToValueAtTime(
       config.volume,
       now + fade
     );

     gain.gain.setValueAtTime(
       config.volume,
       now + duration - fade
     );

     gain.gain.linearRampToValueAtTime(
       0,
       now + duration
     );


     // 지정한 구간만 재생
     source.start(
       now,
       offset,
       duration
     );

     source.onended = () => {
       source.disconnect();
       gain.disconnect();
     };

   } catch (error) {

     console.warn(
       `Failed to play ${name}:`,
       error
     );

   }
 }


// ========================================
// 23. HINT
// ========================================

function showHint() {

  if (!hint) return;

  hint.hidden = false;

  clearTimeout(hintTimer);

  hintTimer = setTimeout(
    () => hint.hidden = true,
    1300
  );
}


// ========================================
// 24. AUDIO PREVIEW
// ========================================

function startPreview(index) {

  currentTrack = index;

  audio.pause();

  audio.src =
    `./assets/audio/${tracks[index].file}`;

  audio.load();

  playBtn.textContent = '▶';

  audio.onloadedmetadata = () => {
    audio.currentTime = 0;
  };

  audio.play()
    .then(() => {
      playBtn.textContent = 'Ⅱ';
    })
    .catch(error => {
      console.warn(
        'Use play button to start audio:',
        error
      );
    });
}


// ========================================
// 25. POPUP
// ========================================

function openPopup(index) {

  const track = tracks[index];

  const n =
    String(index + 1).padStart(2, '0');

  $('popup-back').src =
    `./assets/sticker-backs/back-${n}.png`;

  const title = $('popup-title');

  title.textContent = track.title;

  title.classList.toggle(
    'ko-title',
    /[가-힣]/.test(track.title)
  );

  popup.dataset.track = index + 1;

  $('popup-index').textContent =
    `NO.${index + 1}`;


  // CREDITS

  const creditRoot = $('popup-credits');

  creditRoot.replaceChildren();

  const fields = [
    ['composed', 'composed by'],
    ['lyrics', 'lyrics by'],
    ['arranged', 'arranged by'],
    ['mixed', 'mixed by'],
    ['mastered', 'mastered by']
  ];

  for (const [key, label] of fields) {

    const row =
      document.createElement('div');

    const role =
      document.createElement('span');

    const names =
      document.createElement('span');

    row.className = 'credit-row';

    role.className = 'credit-role';
    names.className = 'credit-names';

    role.textContent = label;
    names.textContent =
      track.credits[key] || '';

    row.append(role, names);

    creditRoot.appendChild(row);
  }


  popup.hidden = false;

  $('popup-close').focus();
}

let bookCuePending = false;
let bookCuePlayed = false;

function playBookCue() {
  if (bookCuePlayed || !allCollected()) return;

  bookCuePlayed = true;

  const item = bookGrid.querySelector(
    '.book-item.is-unlocked'
  );

  if (!item) return;

  item.classList.remove('collection-nudge');

  void item.offsetWidth;

  item.classList.add('collection-nudge');

  setTimeout(() => {
    item.classList.remove('collection-nudge');
  }, 1700);
}

function closePopup() {

  popup.hidden = true;

  audio.pause();
  playBtn.textContent = '▶';

  clearTimeout(popupTimer);
  if (bookCuePending) {
    bookCuePending = false;

    setTimeout(() => {
      playBookCue();
    }, 350);
  }
}

$('popup-close').addEventListener(
  'click',
  closePopup
);

popup.addEventListener('click', e => {

  if (e.target === popup) {
    closePopup();
  }
});

document.addEventListener(
  'keydown',
  e => {

    if (
      e.key === 'Escape' &&
      !popup.hidden
    ) {
      closePopup();
    }
  }
);


// ========================================
// 26. AUDIO CONTROLS
// ========================================

playBtn.addEventListener('click', () => {

  if (currentTrack < 0) return;

  if (!audio.paused) {

    audio.pause();
    playBtn.textContent = '▶';

    return;
  }

  if (
    audio.currentTime >= audioDuration - .1
  ) {
    audio.currentTime = 0;
  }

  audio.play()
    .then(() => {
      playBtn.textContent = 'Ⅱ';
    })
    .catch(console.warn);
});

audio.addEventListener(
  'timeupdate',
  () => {

    if (
      currentTrack >= 0 &&
      audio.currentTime >= audioDuration
    ) {
      audio.pause();
      playBtn.textContent = '▶';
    }
  }
);

audio.addEventListener('error', () => {

  playBtn.textContent = '▶';

  console.warn(
    'Audio missing:',
    audio.currentSrc
  );
});


// ========================================
// 27. COLLECTION
// ========================================

function allCollected() {

  return (
    stickers.length === tracks.length &&
    stickers.every(s => s.unlocked)
  );
}

function renderBook() {

  if (!bookGrid) return;


  // CREATE FIVE SLOTS

  if (!bookGrid.children.length) {

    tracks.forEach((t, i) => {

      const button =
        document.createElement('button');

      button.type = 'button';
      button.className = 'book-item';
      button.dataset.track = i;

      button.setAttribute(
        'aria-label',
        `${t.title} sticker`
      );

      const thumb =
        document.createElement('span');

      const img =
        document.createElement('img');

      thumb.className = 'book-thumb';

      img.alt = '';
      img.draggable = false;

      thumb.appendChild(img);
      button.appendChild(thumb);

      bookGrid.appendChild(button);
    });
  }


  // UPDATE FRONT / BACK

  [...bookGrid.children].forEach(
    (button, i) => {

      const unlocked =
        stickers[i]?.unlocked === true;

      const n =
        String(i + 1).padStart(2, '0');

      button.querySelector('img').src =
        unlocked
          ? `./assets/stickers/sticker-${n}.png`
          : `./assets/sticker-backs/back-${n}.png`;

      button.disabled = !unlocked;

      button.classList.toggle(
        'is-unlocked',
        unlocked
      );
    }
  );

  shareBtn.hidden = !allCollected();
}


// ========================================
// 28. FIND APPLE SURFACE
// ========================================

function appleHit(x, y) {

  if (introState !== 'finished') {
    return null;
  }

  const r = canvas.getBoundingClientRect();

  if (
    x < r.left ||
    x > r.right ||
    y < r.top ||
    y > r.bottom
  ) return null;

  rayFromPointer({
    clientX: x,
    clientY: y
  });

  return raycaster.intersectObjects(
    greenMeshes, false
  )[0] || null;
}


// ========================================
// 29. CREATE STICKER COPY
// ========================================


function getOriginalStickerSize(index) {

  const geometry = stickers[index].homeGeometry;
  const pos = geometry.attributes.position;

  // 원본 스티커의 표면 격자 크기
  const side = Math.round(Math.sqrt(pos.count));
  const middle = Math.floor(side / 2);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();

  let width = 0;
  let height = 0;

  // 원본 스티커의 가로 표면 길이
  for (let i = 1; i < side; i++) {

    a.fromBufferAttribute(
      pos,
      middle * side + i - 1
    );

    b.fromBufferAttribute(
      pos,
      middle * side + i
    );

    width += a.distanceTo(b);
  }

  // 원본 스티커의 세로 표면 길이
  for (let j = 1; j < side; j++) {

    a.fromBufferAttribute(
      pos,
      (j - 1) * side + middle
    );

    b.fromBufferAttribute(
      pos,
      j * side + middle
    );

    height += a.distanceTo(b);
  }

  return { width, height };
}


function makeStamp(index) {

  // 원본 스티커와 동일한 표면 크기 사용
  const { width, height } =
    getOriginalStickerSize(index);

  const geometry = new THREE.PlaneGeometry(
    width,
    height
  );

  // 원본과 동일한 텍스처, 색감, 재질 사용
  const material =
    stickers[index].mesh.material.clone();

  // 드래그 중에는 살짝 투명하게
  material.transparent = true;
  material.opacity = .78;
  material.depthWrite = false;

  const mesh = new THREE.Mesh(
    geometry,
    material
  );

  mesh.renderOrder = 8;
  mesh.visible = false;

  apple.add(mesh);

  return mesh;
}



// ========================================
// 30. SURFACE NORMAL
// ========================================

function hitNormal(hit) {

  const world = hit.face.normal.clone()
    .applyMatrix3(
      new THREE.Matrix3().getNormalMatrix(
        hit.object.matrixWorld
      )
    )
    .normalize();

  const local = world.applyQuaternion(
    apple.getWorldQuaternion(
      new THREE.Quaternion()
    ).invert()
  ).normalize();

  const at = apple.worldToLocal(
    hit.point.clone()
  );

  if (local.dot(at) < 0) {
    local.negate();
  }

  return { at, local };
}


// ========================================
// 31. DRAG PREVIEW ON APPLE
// ========================================

function previewStamp(mesh, hit) {

  const { at, local } = hitNormal(hit);

  mesh.position
    .copy(at)
    .addScaledVector(local, .032);

  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    local
  );

  mesh.visible = true;
}


// ========================================
// 32. CURVED STICKER PLACEMENT
// ========================================

function placeCurvedStamp(mesh, hit) {

  const old = mesh.geometry;

  const width = old.parameters.width;
  const height = old.parameters.height;

  const { at, local } = hitNormal(hit);

  const guide = Math.abs(local.y) > .9
    ? new THREE.Vector3(0, 0, 1)
    : new THREE.Vector3(0, 1, 0);

  const right = new THREE.Vector3()
    .crossVectors(guide, local)
    .normalize();

  const up = new THREE.Vector3()
    .crossVectors(local, right)
    .normalize();

  const dir = local.clone()
    .transformDirection(apple.matrixWorld)
    .negate();

  const ray = new THREE.Raycaster();

  const divisions = 14;

  const positions = [];
  const uvs = [];
  const indices = [];


  for (let j = 0; j <= divisions; j++) {
    for (let i = 0; i <= divisions; i++) {

      const u = i / divisions;
      const v = j / divisions;

      const sample = at.clone()

        .addScaledVector(
          right,
          (u - .5) * width
        )

        .addScaledVector(
          up,
          (v - .5) * height
        );

      const origin = sample.clone()
        .addScaledVector(local, 1.6);

      ray.set(
        apple.localToWorld(origin),
        dir
      );

      const h = ray.intersectObjects(
        greenMeshes, false
      )[0];

      const point = h

        ? apple.worldToLocal(
            h.point.clone()
          ).addScaledVector(local, .016)

        : sample.addScaledVector(
            local, .016
          );

      positions.push(
        point.x,
        point.y,
        point.z
      );

      uvs.push(u, v);
    }
  }


  for (let j = 0; j < divisions; j++) {
    for (let i = 0; i < divisions; i++) {

      const a =
        j * (divisions + 1) + i;

      const b = a + 1;
      const c = a + divisions + 1;

      indices.push(
        a, b, c,
        b, c + 1, c
      );
    }
  }


  const g = new THREE.BufferGeometry();

  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      positions, 3
    )
  );

  g.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(
      uvs, 2
    )
  );

  g.setIndex(indices);
  g.computeVertexNormals();


  // PLANE → CURVED MESH

  old.dispose();

  mesh.geometry = g;

  mesh.position.set(0, 0, 0);
  mesh.quaternion.identity();

  mesh.material.opacity = 1;
  mesh.visible = true;

  mesh.material.polygonOffset = true;
  mesh.material.polygonOffsetFactor = -1;
  mesh.material.polygonOffsetUnits = -1;

  customStickers.push(mesh);


  // 부착 애니메이션 시작
  mesh.userData.pressAnimation = {
    start: performance.now(),
    center: at.clone(),
    normal: local.clone(),
    base: Float32Array.from(
      mesh.geometry.attributes.position.array
    )
  };

  // 효과음이 연결된 경우
  if (typeof playSfx === 'function') {
    playSfx('stick');
  }

}


// ========================================
// 33. COLLECTION DRAG EVENTS
// ========================================

function cleanupDrag() {

  if (!bookDrag) return;

  bookDrag.ghost?.remove();

  if (bookDrag.preview) {

    apple.remove(bookDrag.preview);

    bookDrag.preview.geometry.dispose();
    bookDrag.preview.material.dispose();
  }

  bookDrag = null;
}


bookGrid.addEventListener(
  'pointerdown',
  e => {

    const button = e.target.closest(
      '.book-item'
    );

    if (!button || button.disabled) return;

    if (
      e.pointerType === 'mouse' &&
      e.button !== 0
    ) return;

    e.preventDefault();

    button.setPointerCapture(
      e.pointerId
    );

    bookDrag = {
      id: e.pointerId,

      index: Number(
        button.dataset.track
      ),

      x: e.clientX,
      y: e.clientY,

      moved: false,
      preview: null,
      ghost: null,

      canPlace: allCollected()
    };
  }
);


// ========================================
// 34. DRAG PREVIEW
// ========================================

window.addEventListener(
  'pointermove',
  e => {

    if (
      !bookDrag ||
      e.pointerId !== bookDrag.id
    ) return;

    const d = bookDrag;

    if (
      Math.hypot(
        e.clientX - d.x,
        e.clientY - d.y
      ) > 7
    ) {
      d.moved = true;
    }

    if (
      !d.moved ||
      !d.canPlace
    ) return;


    // DOM IMAGE GHOST

    if (!d.ghost) {

      d.ghost = document.createElement('img');

      d.ghost.className =
        'book-drag-ghost';

      d.ghost.src =
        `./assets/stickers/sticker-${String(d.index + 1).padStart(2, '0')}.png`;

      d.ghost.draggable = false;

      document.body.appendChild(
        d.ghost
      );
    }

    d.ghost.style.left =
      `${e.clientX}px`;

    d.ghost.style.top =
      `${e.clientY}px`;


    // 3D POSITION PREVIEW

    const hit = appleHit(
      e.clientX,
      e.clientY
    );

    if (hit) {

      if (!d.preview) {
        d.preview = makeStamp(d.index);
      }

      previewStamp(d.preview, hit);

      d.ghost.style.visibility =
        'hidden';

    } else {

      d.ghost.style.visibility =
        'visible';

      if (d.preview) {
        d.preview.visible = false;
      }
    }
  }
);


// ========================================
// 35. FINISH COLLECTION DRAG
// ========================================

window.addEventListener(
  'pointerup',
  e => {

    if (
      !bookDrag ||
      e.pointerId !== bookDrag.id
    ) return;

    const d = bookDrag;


    if (
      !d.moved ||
      !d.canPlace
    ) {

      // CLICK → LISTEN AGAIN

      startPreview(d.index);
      openPopup(d.index);

    } else {

      // DRAG → RE-STICK

      const hit = appleHit(
        e.clientX,
        e.clientY
      );

      if (hit) {

        const mesh =
          d.preview || makeStamp(d.index);

        placeCurvedStamp(mesh, hit);

        d.preview = null;
      }
    }

    cleanupDrag();
  }
);

window.addEventListener(
  'pointercancel',
  e => {

    if (
      bookDrag?.id === e.pointerId
    ) {
      cleanupDrag();
    }
  }
);


// ========================================
// 36. RESET
// ========================================

resetBtn.addEventListener('click', () => {

  closePopup();

  currentTrack = -1;

  // REMOVE CUSTOM COPIES

  for (const s of customStickers) {

    apple.remove(s);

    s.geometry.dispose();
    s.material.dispose();
  }

  customStickers.length = 0;


  // RESTORE ORIGINAL FIVE

  stickers.forEach(s => {

    s.mesh.geometry.dispose();

    s.mesh.geometry =
      s.homeGeometry.clone();

    s.base = Float32Array.from(
      s.mesh.geometry.attributes.position.array
    );

    s.peeled = false;
    s.unlocked = false;

    s.fallAt = 0;
    s.returnAt = 0;

    restoreSticker(s);
  });

  renderBook();
  setGuide(GUIDE.peel);
});



 // ========================================
 // 37. SHARE CUSTOM APPLE PNG
 // ========================================

 // 공유용 이미지
 const shareFrame = new Image();
 shareFrame.src = './assets/frame.png';

 const shareBgPhoto = new Image();
 shareBgPhoto.src = './assets/cover-photo.png';

 const shareTitleArt = new Image();
 shareTitleArt.src = './assets/greenapple-title.png';

 const sharePolaroidTexture = new Image();
 sharePolaroidTexture.src = './assets/polaroid-texture.jpg';


 async function shareApple() {

   if (!allCollected()) return;

   const images = [
     shareFrame,
     shareBgPhoto,
     shareTitleArt,
     sharePolaroidTexture
   ];

   if (
     images.some(img =>
       !img.complete || !img.naturalWidth
     )
   ) {
     alert('공유용 이미지 assets 경로를 확인해 주세요.');
     return;
   }
   void playSfx('camera');

   shareBtn.disabled = true;

   try {

     // ====================================
     // 1. 3D APPLE CAPTURE
     // ====================================

     const renderWidth = 840;
     const renderHeight = 860;

     let applePhoto;
     let target = null;

     const previousTarget =
       renderer.getRenderTarget();

     const previousIntro = introGroup.visible;
     const previousPaint = paint?.visible;

     const previousColor = renderer
       .getClearColor(new THREE.Color())
       .clone();

     const previousAlpha =
       renderer.getClearAlpha();


     try {

       target = new THREE.WebGLRenderTarget(
         renderWidth,
         renderHeight,
         {
           format: THREE.RGBAFormat,
           type: THREE.UnsignedByteType,
           depthBuffer: true,
           stencilBuffer: false
         }
       );

       target.texture.colorSpace =
         THREE.SRGBColorSpace;

       const exportCamera = camera.clone();

       exportCamera.aspect =
         renderWidth / renderHeight;

       exportCamera.position.set(0, 0, 4.0);
       exportCamera.lookAt(0, 0, 0);
       exportCamera.updateProjectionMatrix();

       introGroup.visible = false;

       if (paint) {
         paint.visible = false;
       }

       renderer.setRenderTarget(target);
       renderer.setClearColor(0xffffff, 0);
       renderer.clear(true, true, true);

       renderer.render(scene, exportCamera);


       // WebGL 픽셀 추출
       const pixels = new Uint8Array(
         renderWidth * renderHeight * 4
       );

       renderer.readRenderTargetPixels(
         target,
         0,
         0,
         renderWidth,
         renderHeight,
         pixels
       );


       // WebGL Y축 뒤집기
       const flipped =
         new Uint8ClampedArray(pixels.length);

       const rowSize = renderWidth * 4;

       for (let y = 0; y < renderHeight; y++) {

         const from =
           (renderHeight - 1 - y) * rowSize;

         flipped.set(
           pixels.subarray(from, from + rowSize),
           y * rowSize
         );
       }


       applePhoto = document.createElement('canvas');

       applePhoto.width = renderWidth;
       applePhoto.height = renderHeight;

       applePhoto.getContext('2d').putImageData(
         new ImageData(
           flipped,
           renderWidth,
           renderHeight
         ),
         0,
         0
       );

     } finally {

       // 렌더러 원래 상태 복원
       renderer.setRenderTarget(previousTarget);

       renderer.setClearColor(
         previousColor,
         previousAlpha
       );

       introGroup.visible = previousIntro;

       if (paint) {
         paint.visible = previousPaint;
       }

       target?.dispose();
     }


     // ====================================
     // 2. STORY CANVAS
     // ====================================

     const W = 1080;
     const H = 1920;

     const story = document.createElement('canvas');

     story.width = W;
     story.height = H;

     const ctx = story.getContext('2d');

     // 기본 배경색
     ctx.fillStyle = '#f2ead9';
     ctx.fillRect(0, 0, W, H);


     // ====================================
     // 3. POLAROID SIZE
     // ====================================

     // 중앙 폴라로이드 크기
     const frameWidth = 860;

     const frameHeight =
       frameWidth *
       shareFrame.naturalHeight /
       shareFrame.naturalWidth;

     const frameX =
       (W - frameWidth) / 2;

     const frameY =
       (H - frameHeight) / 2;


     // 배경 폴라로이드도 동일한 너비
     const coverWidth = frameWidth;

     const coverHeight =
       coverWidth *
       shareBgPhoto.naturalHeight /
       shareBgPhoto.naturalWidth;


     // ====================================
     // 4. BACKGROUND POLAROID COLLAGE
     // ====================================

     // 매번 동일한 랜덤 배치
     let scatterSeed = 31971;

     const rnd = () => {

       scatterSeed = (
         Math.imul(scatterSeed, 1664525)
         + 1013904223
       ) >>> 0;

       return scatterSeed / 4294967296;
     };


     const positions = [
       [-120, -120],
       [680, -100],
       [1200, 170],

       [-360, 300],
       [250, 230],
       [940, 370],

       [-80, 670],
       [620, 710],
       [1230, 770],

       [-350, 1040],
       [280, 1070],
       [980, 1140],

       [-130, 1440],
       [530, 1380],
       [1230, 1520],

       [-340, 1740],
       [260, 1790],
       [950, 1850],

       [-100, 2120],
       [710, 2100]
     ];


     // 배경 앨범 커버 20장
     for (const [baseX, baseY] of positions) {

       const x =
         baseX + (rnd() - .5) * 240;

       const y =
         baseY + (rnd() - .5) * 220;

       const angle =
         (rnd() - .5) * Math.PI * .34;


       ctx.save();

       ctx.translate(x, y);
       ctx.rotate(angle);

       ctx.globalAlpha = .95;

       ctx.drawImage(
         shareBgPhoto,
         -coverWidth / 2,
         -coverHeight / 2,
         coverWidth,
         coverHeight
       );

       // 중요: 매번 회전/이동 복원
       ctx.restore();
     }


     // ====================================
     // 5. TRACING PAPER BACKGROUND
     // ====================================

     // 배경 앨범 커버에만 적용
     ctx.fillStyle =
       'rgba(247, 240, 221, .46)';

     ctx.fillRect(0, 0, W, H);


     // 아주 약한 빈티지 종이 질감
     for (let i = 0; i < 6500; i++) {

       ctx.fillStyle = rnd() > .5
         ? 'rgba(97,77,56,.035)'
         : 'rgba(255,255,255,.075)';

       ctx.fillRect(
         rnd() * W,
         rnd() * H,
         1,
         1
       );
     }


     // ====================================
     // 6. CENTER APPLE PHOTO
     // ====================================

     // frame.png 원본 548×640 기준
     const photoX =
       frameX + frameWidth * (67 / 548);

     const photoY =
       frameY + frameHeight * (61 / 640);

     const photoW =
       frameWidth * (419 / 548);

     const photoH =
       frameHeight * (433 / 640);


     ctx.save();

     ctx.beginPath();

     ctx.rect(
       photoX,
       photoY,
       photoW,
       photoH
     );

     ctx.clip();


     // 사진 안쪽 배경
     ctx.fillStyle = '#f2ead9';

     ctx.fillRect(
       photoX,
       photoY,
       photoW,
       photoH
     );


     // 웹 화면과 같은 CSS 색감
     const screenFilter =
       getComputedStyle(canvas).filter;

     ctx.filter =
       screenFilter && screenFilter !== 'none'
         ? screenFilter
         : 'none';

     ctx.imageSmoothingEnabled = true;
     ctx.imageSmoothingQuality = 'high';


     // 청사과 렌더링
     ctx.drawImage(
       applePhoto,
       photoX,
       photoY,
       photoW,
       photoH
     );

     ctx.filter = 'none';


     // ====================================
     // 6.5 APPLE PHOTO TEXTURE
     // ====================================

     // 프레임이 아닌 사진 내부에만 질감 적용
     ctx.save();

     ctx.globalAlpha = .08;
     ctx.globalCompositeOperation = 'multiply';

     ctx.drawImage(
       sharePolaroidTexture,
       photoX,
       photoY,
       photoW,
       photoH
     );

     ctx.restore();

     // 사진 클리핑 완전히 종료
     ctx.restore();


     // ====================================
     // 7. ORIGINAL POLAROID FRAME
     // ====================================

     ctx.save();

     ctx.shadowColor =
       'rgba(48,35,24,.26)';

     ctx.shadowBlur = 25;
     ctx.shadowOffsetY = 13;

     ctx.drawImage(
       shareFrame,
       frameX,
       frameY,
       frameWidth,
       frameHeight
     );

     ctx.restore();


     // ====================================
     // 8. GREEN APPLE TYPOGRAPHY
     // ====================================

     const footerTop =
       frameY + frameHeight * (507 / 640);

     const footerHeight =
       frameHeight * (112 / 640);


     // PNG 투명 여백 제외
     const tempCanvas =
       document.createElement('canvas');

     tempCanvas.width =
       shareTitleArt.naturalWidth;

     tempCanvas.height =
       shareTitleArt.naturalHeight;

     const tempCtx = tempCanvas.getContext(
       '2d',
       { willReadFrequently: true }
     );

     tempCtx.drawImage(
       shareTitleArt,
       0,
       0
     );

     const data = tempCtx.getImageData(
       0,
       0,
       tempCanvas.width,
       tempCanvas.height
     ).data;


     let minX = tempCanvas.width;
     let minY = tempCanvas.height;
     let maxX = -1;
     let maxY = -1;


     for (let y = 0; y < tempCanvas.height; y++) {

       for (let x = 0; x < tempCanvas.width; x++) {

         const alpha =
           data[(y * tempCanvas.width + x) * 4 + 3];

         if (alpha <= 20) continue;

         minX = Math.min(minX, x);
         minY = Math.min(minY, y);
         maxX = Math.max(maxX, x);
         maxY = Math.max(maxY, y);
       }
     }


     const hasContent =
       maxX >= minX && maxY >= minY;

     const sourceX =
       hasContent ? minX : 0;

     const sourceY =
       hasContent ? minY : 0;

     const sourceW = hasContent
       ? maxX - minX + 1
       : tempCanvas.width;

     const sourceH = hasContent
       ? maxY - minY + 1
       : tempCanvas.height;


     // 타이포 크기와 위치 조절
     const maxW = frameWidth * .70;
     const maxH = footerHeight * .62;

     const titleOffsetX = 0;
     const titleOffsetY = -20;


     const titleScale = Math.min(
       maxW / sourceW,
       maxH / sourceH
     );

     const titleW =
       sourceW * titleScale;

     const titleH =
       sourceH * titleScale;


     ctx.save();

     ctx.globalAlpha = .94;

     ctx.drawImage(
       shareTitleArt,

       sourceX,
       sourceY,
       sourceW,
       sourceH,

       frameX + (frameWidth - titleW) / 2
         + titleOffsetX,

       footerTop + (footerHeight - titleH) / 2
         + titleOffsetY,

       titleW,
       titleH
     );

     ctx.restore();


     // ====================================
     // 9. CREATE PNG
     // ====================================

     const blob = await new Promise(resolve =>
       story.toBlob(resolve, 'image/png')
     );

     if (!blob) {
       throw new Error('PNG 생성 실패');
     }

     const file = new File(
       [blob],
       'my-green-apple-polaroid.png',
       { type: 'image/png' }
     );


     // ====================================
     // 10. MOBILE SHARE
     // ====================================

     if (
       navigator.share &&
       navigator.canShare?.({ files: [file] })
     ) {

       try {

         await navigator.share({
           files: [file],
           title: 'GREEN APPLE'
         });

         return;

       } catch (error) {

         if (error.name === 'AbortError') {
           return;
         }

         console.warn(
           'Mobile share failed:',
           error
         );
       }
     }


     // ====================================
     // 11. DOWNLOAD FALLBACK
     // ====================================

     const url = URL.createObjectURL(blob);

     const link = document.createElement('a');

     link.href = url;
     link.download = file.name;

     document.body.appendChild(link);
     link.click();
     link.remove();

     setTimeout(() => {
       URL.revokeObjectURL(url);
     }, 1500);


   } catch (error) {

     console.error('Share image error:', error);

     alert(
       '공유 이미지를 생성하지 못했어요. 콘솔을 확인해 주세요.'
     );

   } finally {

     shareBtn.disabled = false;
   }
 }


 shareBtn.addEventListener(
   'click',
   shareApple
 );



// ========================================
// 38. ANIMATION LOOP
// ========================================


// ========================================
// STICKER PRESS ANIMATION
// ========================================

function updateStickerPress(now) {

  for (const mesh of customStickers) {

    const press = mesh.userData.pressAnimation;

    if (!press) continue;

    const t = Math.min(
      1,
      (now - press.start) / 380
    );

    const attr =
      mesh.geometry.attributes.position;

    // 살짝 커졌다가 눌리며 원래 크기로
    const scale = t < .45
      ? THREE.MathUtils.lerp(
          1.045,
          .982,
          THREE.MathUtils.smoothstep(t, 0, .45)
        )
      : THREE.MathUtils.lerp(
          .982,
          1,
          THREE.MathUtils.smoothstep(t, .45, 1)
        );

    const height = .025 * (1 - t);

    const cx = press.center.x;
    const cy = press.center.y;
    const cz = press.center.z;

    for (let i = 0; i < attr.count; i++) {

      const k = i * 3;

      attr.setXYZ(
        i,

        cx +
          (press.base[k] - cx) * scale +
          press.normal.x * height,

        cy +
          (press.base[k + 1] - cy) * scale +
          press.normal.y * height,

        cz +
          (press.base[k + 2] - cz) * scale +
          press.normal.z * height
      );
    }

    attr.needsUpdate = true;

    if (t >= 1) {
      attr.array.set(press.base);
      attr.needsUpdate = true;

      mesh.geometry.computeBoundingSphere();

      delete mesh.userData.pressAnimation;
    }
  }
}


function animate(now) {

  requestAnimationFrame(animate);

  const dt = Math.min(
    .05,
    lastFrame
      ? (now - lastFrame) / 1000
      : 1 / 60
  );

  lastFrame = now;

  // INTRO DRAG GUIDE
  updateIntroDragCue(now);


  // RED APPLES FALL

  for (const p of introPieces) {

    if (
      !p.gone ||
      !p.root.visible
    ) continue;

    p.velocity.y -= 5.5 * dt;

    p.root.position.addScaledVector(
      p.velocity,
      dt
    );

    p.root.rotation.z += p.spin * dt;
    p.root.rotation.x += p.spin * .3 * dt;

    if (
      p.root.position.y < -12 ||
      Math.abs(p.root.position.x) > 16
    ) {
      p.root.visible = false;
    }
  }


  // DISCOVERY

  if (
    introState === 'active' &&
    !introPointer &&
    now - lastCheck > 190
  ) {
    checkDiscovery(now);
  }

  if (
    introState === 'found' &&
    now - foundAt > 800
  ) {
    startReveal(now);
  }


  // SMOOTH INTRO ZOOM

  if (
    introState === 'revealing' &&
    revealFrom
  ) {

    const t = Math.min(
      1,
      (now - revealAt) / 1900
    );

    const ease =
      t * t * (3 - 2 * t);

    camera.position.z =
      THREE.MathUtils.lerp(
        revealFrom.z,
        mainCameraZ,
        ease
      );

    apple.scale.setScalar(
      THREE.MathUtils.lerp(
        revealFrom.scale,
        1,
        ease
      )
    );

    apple.position
      .copy(revealFrom.position)
      .lerp(
        new THREE.Vector3(),
        ease
      );


    // RED PAINT FADES AWAY

    if (paint) {
      paint.material.opacity =
        Math.pow(1 - t, 1.7);
    }


    // RED APPLES MOVE AWAY

    for (const p of introPieces) {

      if (
        !p.root.visible ||
        !p.revealTo ||
        p.gone
      ) continue;

      p.root.position.lerpVectors(
        p.revealFrom,
        p.revealTo,
        ease
      );

      p.root.rotation.z += .5 * dt;
    }

    if (t >= 1) {
      finishIntro();
    }
  }


  // MAIN APPLE

  if (introState === 'finished') {

    // SMOOTH ROTATION

    if (
      !mainPointer &&
      Math.abs(inertiaX) +
      Math.abs(inertiaY) > .00004
    ) {

      targetQuaternion.premultiply(
        new THREE.Quaternion().setFromAxisAngle(
          axisY,
          inertiaX * .48
        )
      );

      targetQuaternion.premultiply(
        new THREE.Quaternion().setFromAxisAngle(
          axisX,
          inertiaY * .48
        )
      ).normalize();

      const friction = Math.exp(-8 * dt);

      inertiaX *= friction;
      inertiaY *= friction;
    }

    apple.quaternion.slerp(
      targetQuaternion,
      1 - Math.exp(-14 * dt)
    );


    // STICKER FALL / RETURN

    for (const s of stickers) {

      if (
        s.fallAt &&
        s.mesh.visible
      ) {

        const t = Math.min(
          1,
          (now - s.fallAt) / 800
        );

        const down = new THREE.Vector3(
          0, -1, 0
        ).applyQuaternion(
          apple.quaternion.clone().invert()
        );

        const forward = new THREE.Vector3(
          0, 0, 1
        ).applyQuaternion(
          apple.quaternion.clone().invert()
        );

        s.mesh.position
          .copy(
            down.multiplyScalar(
              2.4 * t * t
            )
          )
          .addScaledVector(
            forward,
            .14 * Math.sin(Math.PI * t)
          );

        s.mesh.rotation.z =
          .32 * Math.sin(Math.PI * t)
          + .8 * t;

        s.mesh.material.opacity = t < .85
          ? 1
          : Math.max(
              0,
              1 - (t - .85) / .15
            );

        if (t >= 1) {
          s.mesh.visible = false;
        }

      } else if (
        s.returnAt &&
        !s.peeled
      ) {

        const t = Math.min(
          1,
          (now - s.returnAt) / 250
        );

        bendSticker(
          s,

          s.returnAmount *
            (1 - t) ** 2,

          s.dragX,
          s.dragY
        );

        if (t >= 1) {
          s.returnAt = 0;
          restoreSticker(s);
        }
      }
    }
  }
  updatePeelCue(now);
  updateStickerPress(now);


  renderer.render(scene, camera);
}


// ========================================
// 39. START
// ========================================

requestAnimationFrame(animate);
loadGreen();
