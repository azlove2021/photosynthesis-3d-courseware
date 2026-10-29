/* ================= 数据 ================= */
const $ = (id) => document.getElementById(id);
const DATA = JSON.parse(document.getElementById('courseware-data').textContent);
const STAGES = DATA.stages;
const N = STAGES.length;
const QUIZ = [
  { q: '光合作用中，光反应的场所和产物分别是？', opts: ['叶绿体基质 / C₃ 和 C₅', '类囊体薄膜 / O₂、ATP、NADPH', '类囊体薄膜 / 葡萄糖和 O₂', '叶绿体基质 / ATP 和 NADPH'], a: 1,
    why: '光反应在类囊体薄膜上进行，产物是 O₂、ATP 和 NADPH；C₃、C₅ 是暗反应的中间产物。' },
  { q: '用 ¹⁸O 分别标记 H₂O 和 CO₂，结果说明光合作用释放的 O₂ 来自？', opts: ['CO₂', 'H₂O', '两者各一半', '无法判断'], a: 1,
    why: '标记水时释放的 O₂ 有放射性，标记 CO₂ 时没有——O₂ 全部来自水的光解。' },
  { q: '其他条件不变，突然遮光，短时间内 C₃ 和 C₅ 的含量变化是？', opts: ['C₃ 增多、C₅ 减少', 'C₃ 减少、C₅ 增多', '两者都增多', '两者都减少'], a: 0,
    why: '遮光后 ATP、NADPH 减少，C₃ 还原受阻而积累；C₅ 因不能被再生而减少。' }
];

/* ================= 三维场景 ================= */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, .1, 120);
scene.add(new THREE.HemisphereLight(0xffffff, 0xdff0ff, 1.05));
const dl1 = new THREE.DirectionalLight(0xffffff, .9); dl1.position.set(6, 9, 7); scene.add(dl1);
const dl2 = new THREE.DirectionalLight(0xa5f3e0, .38); dl2.position.set(-7, -4, -5); scene.add(dl2);

const COL = {
  water: 0x3B82F6, o2: 0xEF4444, co2: 0x64748B,
  atp: 0xF59E0B, nadph: 0xBE185D, sugar: 0x10B981,
  c3: 0xD97706, c5: 0x0D9488, rubisco: 0x7C5CFF, pigment: 0x22C55E
};

/* 叶绿体：双层膜 */
const outer = new THREE.Mesh(new THREE.SphereGeometry(1, 56, 36),
  new THREE.MeshPhysicalMaterial({ color: 0x6FD79A, transparent: true, opacity: .12, roughness: .25, metalness: 0, side: THREE.DoubleSide, depthWrite: false }));
outer.scale.set(5.5, 3.35, 3.35); scene.add(outer);
// 轮廓环：让椭球边界读得出来
const ringMat = new THREE.MeshBasicMaterial({ color: 0x1F8A5B, transparent: true, opacity: .34 });
const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1, .006, 6, 96), ringMat);
ring1.scale.set(5.5, 3.35, 1); scene.add(ring1);

const inner = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32),
  new THREE.MeshPhysicalMaterial({ color: 0x9BE8C0, transparent: true, opacity: .08, roughness: .3, side: THREE.DoubleSide, depthWrite: false }));
inner.scale.set(5.12, 3.02, 3.02); scene.add(inner);

/* 基质：内部薄雾 */
const stromaFog = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 22),
  new THREE.MeshBasicMaterial({ color: 0xE8FBF0, transparent: true, opacity: .07 }));
stromaFog.scale.set(5.0, 2.9, 2.9); scene.add(stromaFog);

/* 基粒：类囊体堆叠 */
const granaGroup = new THREE.Group(); scene.add(granaGroup);
const pigmentGroup = new THREE.Group(); scene.add(pigmentGroup);
const GRANA = [
  { x: -2.75, y: -0.35, z: 0.15, n: 7 },
  { x: -0.85, y: 1.15, z: -0.45, n: 6 },
  { x: -2.05, y: -1.65, z: 0.5, n: 5 },
  { x: 2.55, y: 0.95, z: -0.35, n: 6 }
];
const discMat = new THREE.MeshStandardMaterial({ color: 0x2E8B57, roughness: .52, metalness: .02 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0x0FA3A3, roughness: .45, metalness: .05, transparent: true, opacity: .8 });
GRANA.forEach(g => {
  for (let i = 0; i < g.n; i++) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(.86, .86, .075, 32), discMat);
    disc.position.set(g.x, g.y + i * .095, g.z);
    granaGroup.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.86, .012, 6, 32), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.copy(disc.position);
    granaGroup.add(rim);
  }
  // 色素复合体：贴在类囊体边缘
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const pig = new THREE.Mesh(new THREE.SphereGeometry(.085, 10, 8),
      new THREE.MeshStandardMaterial({ color: k % 3 === 0 ? 0xF59E0B : COL.pigment, roughness: .35, emissive: 0x0b3a1e, emissiveIntensity: .3 }));
    pig.position.set(g.x + Math.cos(a) * .93, g.y + (g.n - 1) * .185 * .5, g.z + Math.sin(a) * .93);
    pigmentGroup.add(pig);
  }
});

/* Rubisco：基质中的大分子 */
const rubiscoGroup = new THREE.Group(); scene.add(rubiscoGroup);
const RUB_POS = [[2.6, -1.25, 0.7], [3.5, -0.1, -0.6], [0.2, 1.95, 0.9], [-0.6, -2.0, -0.4], [3.0, 1.55, 0.5], [-3.9, 1.5, -0.7]];
RUB_POS.forEach(([x, y, z], i) => {
  const r = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? .30 : .24, 20, 14),
    new THREE.MeshStandardMaterial({ color: COL.rubisco, roughness: .42 }));
  r.position.set(x, y, z);
  rubiscoGroup.add(r);
});

/* 两个碳池：C₅ 在左上，C₃ 在右下 */
const c5Pool = new THREE.Group(); c5Pool.position.set(1.85, 0.55, 0.5); scene.add(c5Pool);
const c3Pool = new THREE.Group(); c3Pool.position.set(0.55, -1.45, 0.35); scene.add(c3Pool);
function addHalo(g, color) {
  const h = new THREE.Mesh(new THREE.TorusGeometry(.62, .012, 6, 44),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .42 }));
  h.rotation.x = Math.PI / 2; g.add(h);
}
addHalo(c5Pool, 0x0D9488); addHalo(c3Pool, 0xD97706);
function fillPool(g, color, emissive, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * .46;
    const s = new THREE.Mesh(new THREE.SphereGeometry(.058, 10, 8),
      new THREE.MeshStandardMaterial({ color, roughness: .35, emissive, emissiveIntensity: .5 }));
    s.position.set(Math.cos(a) * rr, Math.sin(a) * rr * .62, (Math.random() - .5) * .3);
    g.add(s);
  }
}
fillPool(c5Pool, COL.c5, 0x0B5F58, 26);
fillPool(c3Pool, COL.c3, 0x7A3E00, 30);

/* 粒子流：沿曲线运动，速率由仿真驱动 */
function curveOf(pts) { return new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))); }
const PATHS = {
  water: curveOf([[-7.6, 1.5, 2.2], [-6.2, 1.0, 1.4], [-4.4, 0.4, 0.7], [-2.95, -0.1, 0.35]]),
  o2: curveOf([[-2.75, 0.35, 0.2], [-3.6, 2.1, 1.2], [-5.2, 3.2, 2.2], [-6.6, 3.9, 2.8]]),
  atp: curveOf([[-2.2, 0.55, 0.4], [-1.3, 0.0, 0.5], [-0.2, -0.7, 0.4], [0.5, -1.25, 0.35]]),
  nadph: curveOf([[-2.5, 0.15, 0.5], [-1.5, -0.35, 0.6], [-0.4, -0.95, 0.45], [0.45, -1.35, 0.35]]),
  co2: curveOf([[7.4, 1.2, 1.8], [5.8, 0.9, 1.2], [3.8, 0.7, 0.8], [2.15, 0.55, 0.55]]),
  fix: curveOf([[1.85, 0.5, 0.5], [1.5, -0.1, 0.45], [1.0, -0.9, 0.4], [0.62, -1.38, 0.35]]),
  regen: curveOf([[0.62, -1.38, 0.35], [1.05, -0.9, 0.45], [1.55, -0.2, 0.5], [1.85, 0.45, 0.5]]),
  sugar: curveOf([[0.6, -1.5, 0.3], [1.9, -2.2, 0.7], [3.9, -2.6, 1.2], [6.0, -2.4, 1.8]])
};
function makeFlow(key, color, r, count, speed, geo) {
  const g = new THREE.Group(); scene.add(g);
  const items = [];
  for (let i = 0; i < count; i++) {
    const m = geo ? new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: .35 }))
      : new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshStandardMaterial({ color, roughness: .35 }));
    m.visible = false; g.add(m);
    items.push({ m, p: i / count });
  }
  return { key, path: PATHS[key], items, speed, level: 0 };
}
const capsuleGeo = new THREE.CylinderGeometry(.042, .042, .13, 8);
const FLOWS = [
  makeFlow('water', COL.water, .065, 10, .16),
  makeFlow('o2', COL.o2, .07, 8, .2),
  makeFlow('atp', COL.atp, .05, 6, .22, capsuleGeo),
  makeFlow('nadph', COL.nadph, .058, 6, .2),
  makeFlow('co2', COL.co2, .07, 8, .18),
  makeFlow('fix', COL.c3, .055, 4, .22),
  makeFlow('regen', COL.c5, .055, 4, .2),
  makeFlow('sugar', COL.sugar, .06, 5, .16)
];

/* 环境微粒 */
const dust = new THREE.Group();
for (let i = 0; i < 60; i++) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(.018, 6, 4),
    new THREE.MeshBasicMaterial({ color: 0x2F9E6B, transparent: true, opacity: .18 }));
  s.position.set(Math.random() * 9 - 4.5, Math.random() * 5 - 2.5, Math.random() * 4 - 2);
  dust.add(s);
}
scene.add(dust);

/* ================= 相机 ================= */
const CAM = [
  { p: [0.0, 2.2, 19.5], t: [0, 0, 0] },
  { p: [-2.7, 1.5, 8.4], t: [-2.75, -0.05, 0.2] },
  { p: [-2.7, 0.9, 7.2], t: [-2.75, -0.15, 0.2] },
  { p: [-2.0, 1.1, 7.8], t: [-1.7, 0.0, 0.35] },
  { p: [2.6, 1.9, 8.8], t: [1.5, 0.0, 0.5] },
  { p: [1.4, 0.7, 8.4], t: [0.9, -0.55, 0.4] },
  { p: [1.1, 1.6, 9.2], t: [1.0, -0.35, 0.45] },
  { p: [0.0, 2.6, 17.2], t: [0, -0.1, 0] },
  { p: [0.0, 2.2, 19.5], t: [0, 0, 0] }
];
const camPos = new THREE.Vector3(...CAM[0].p);
const camTgt = new THREE.Vector3(...CAM[0].t);
camera.position.copy(camPos); camera.lookAt(camTgt);

/*__INTERACT__*/

/* ================= 结构说明（点选） ================= */
const PICK_INFO = {
  outer: { name: '叶绿体（双层膜）', tag: '场所', desc: '外面包着外膜和内膜两层膜，把光合作用需要的环境围起来。膜上有选择透过性，CO₂ 和 O₂ 可以自由扩散进出。', tip: '叶绿体是绿色植物进行光合作用的细胞器；蓝细菌没有叶绿体但也能光合。' },
  stroma: { name: '叶绿体基质', tag: '场所', desc: '内膜以内的液体空间，暗反应（碳反应）在这里进行。基质中有 Rubisco 等酶，也有 DNA 和核糖体。', tip: '叶绿体基质 ≠ 细胞质基质，别混。' },
  grana: { name: '类囊体（基粒）', tag: '场所', desc: '一摞摞扁平囊状结构堆叠成基粒，极大扩展了膜面积。光反应就发生在类囊体薄膜上。', tip: '基粒不是一个细胞器，是类囊体堆叠形成的结构。' },
  pigment: { name: '色素复合体', tag: '捕光', desc: '嵌在类囊体薄膜上的叶绿素和类胡萝卜素，像天线一样捕获光能。叶绿素主要吸收红光和蓝紫光，类胡萝卜素主要吸收蓝紫光。', tip: '绿光吸收最少被反射，所以叶片呈绿色。' },
  rubisco: { name: 'Rubisco', tag: '酶', desc: '基质中含量最多的酶，催化 CO₂ 与 C₅ 结合生成两分子 C₃，也就是二氧化碳的固定。', tip: 'Rubisco 也是地球上最丰富的蛋白质之一。' },
  c5: { name: 'C₅（五碳化合物）', tag: '受体', desc: 'CO₂ 的受体。CO₂ + C₅ → 2C₃；它被消耗后，又由 C₃ 还原的产物再生回来，循环才能闭合。', tip: '突然断 CO₂ 时 C₅ 不能被消耗，反而积累。' },
  c3: { name: 'C₃（三碳化合物）', tag: '中间产物', desc: 'CO₂ 固定后生成的第一个有机物。它接受 ATP 的能量和 NADPH 的氢被还原，一部分变成糖，一部分回去再生 C₅。', tip: '突然黑暗时 C₃ 还原受阻，C₃ 会积累。' },
  atp: { name: 'ATP', tag: '供能', desc: '光反应在类囊体薄膜上把 ADP 和 Pi 合成 ATP，为 C₃ 的还原提供能量。', tip: 'ATP 只供能，不供氢。' },
  nadph: { name: 'NADPH', tag: '供氢', desc: 'NADP⁺ 接受水光解产生的 H⁺ 和电子形成 NADPH，是 C₃ 还原时的还原剂。', tip: 'NADPH 既带能量又带氢，和 ATP 分工不同。' }
};
regPick(outer, 'outer');
regPick(inner, 'stroma');
regPick(granaGroup, 'grana');
regPick(pigmentGroup, 'pigment');
regPick(rubiscoGroup, 'rubisco');
regPick(c5Pool, 'c5');
regPick(c3Pool, 'c3');
regPick(FLOWS[2].items[0].m.parent, 'atp');
regPick(FLOWS[3].items[0].m.parent, 'nadph');

const STRUCT_LIST = [
  ['outer', '#86E0A8'], ['stroma', '#C7F5DC'], ['grana', '#2F9E6B'], ['pigment', '#22C55E'],
  ['rubisco', '#7C5CFF'], ['c3', '#D97706'], ['c5', '#0D9488'], ['atp', '#F59E0B'], ['nadph', '#BE185D']
];
STRUCT_LIST.forEach(([id, color]) => {
  const b = document.createElement('button');
  b.className = 'st'; b.dataset.pick = id;
  b.innerHTML = `<i style="background:${color}"></i>${PICK_INFO[id].name.replace(/（.*?）/g, '')}`;
  b.onclick = () => { selectPick(id); focusPick(id); };
  document.getElementById('structs').appendChild(b);
});

/* ================= 状态与仿真 ================= */
let t = 0, targetT = 0, curStep = 0, auto = false, voiceOn = true, speed = 1;
const lerp = (a, b, k) => a + (b - a) * k;
let lastDt = 1 / 60;

/* 「动手试一试」自动判定 */
const stepTried = [];
function markTried() {
  if (curStep < 0 || stepTried[curStep]) return;
  stepTried[curStep] = true;
  const chip = document.getElementById('tryState');
  if (chip) { chip.textContent = '已完成'; chip.className = 'chip on'; }
}
function refreshTryChip() {
  const chip = document.getElementById('tryState');
  if (!chip) return;
  const done = !!stepTried[curStep];
  chip.textContent = done ? '已完成' : '还没动手';
  chip.className = 'chip' + (done ? ' on' : '');
}

/* 蓄水池 + 流速模型：pool += inRate - outRate */
const sim = {
  light: 1200, co2: 400,
  c3: 55, c5: 45, nadph: 55, atp: 55,
  v1: 0, vFix: 0, vRed: 0, mut: ''
};
const clamp01 = v => Math.max(0, Math.min(100, v));

function stepSim(dt) {
  const lf = sim.light / (sim.light + 350);
  const cf = sim.co2 / (sim.co2 + 250);
  // 光反应：光照越强越快；ATP/NADPH 越满越慢（ADP、NADP⁺ 不够）
  sim.v1 = 34 * lf * Math.max(0, 1 - sim.nadph / 130) * Math.max(0, 1 - sim.atp / 150);
  // 固定：受 CO₂ 与 C₅ 限制
  sim.vFix = 12 * cf * (sim.c5 / (sim.c5 + 20));
  // 还原：受 C₃、ATP、NADPH 限制（对 ATP/NADPH 线性敏感，停光后能迅速掉下来）
  sim.vRed = 46 * (sim.c3 / (sim.c3 + 20)) * (sim.atp / 100) * (sim.nadph / 100);
  const k = .8;
  sim.c3 = clamp01(sim.c3 + (2 * sim.vFix - sim.vRed) * dt * k);
  sim.c5 = clamp01(sim.c5 + (0.5 * sim.vRed - sim.vFix) * dt * k);
  sim.nadph = clamp01(sim.nadph + (sim.v1 * .9 - sim.vRed * .8) * dt * k);
  sim.atp = clamp01(sim.atp + (sim.v1 * 1.0 - sim.vRed * .9) * dt * k);
}

/* 每步的默认条件与初始液位 */
const STEP_ENV = [
  { light: 1200, co2: 400 },
  { light: 1600, co2: 400 },
  { light: 2000, co2: 400 },
  { light: 1800, co2: 400 },
  { light: 1400, co2: 800 },
  { light: 1400, co2: 400 },
  { light: 1400, co2: 400 },
  { light: 1200, co2: 400 },
  { light: 1200, co2: 400 }
];

function applyEnv(i) {
  const env = STEP_ENV[i] || STEP_ENV[0];
  sim.light = env.light; sim.co2 = env.co2;
  const m = STAGES[i].metrics;
  sim.c3 = m[0].value; sim.c5 = m[1].value; sim.nadph = m[2].value; sim.atp = m[3].value;
  sim.mut = '';
  const ls = document.getElementById('light'), cs = document.getElementById('co2');
  if (ls) ls.value = sim.light;
  if (cs) cs.value = sim.co2;
  syncEnvLabels();
  const note = document.getElementById('mutNote');
  if (note) { note.hidden = true; note.className = 'mutnote'; }
}
function syncEnvLabels() {
  const lv = document.getElementById('lightVal'), cv = document.getElementById('co2Val');
  if (lv) lv.textContent = sim.light + ' lux';
  if (cv) cv.textContent = sim.co2 + ' ppm';
}

/* ================= 每帧渲染 ================= */
function apply(tt, now) {
  const i0 = Math.max(0, Math.min(N - 1, Math.floor(tt)));
  const i1 = Math.max(0, Math.min(N - 1, Math.ceil(tt)));
  const k = tt - i0;
  const a0 = STAGES[i0].metrics, a1 = STAGES[i1].metrics;

  // 光强影响类囊体发光
  const glow = Math.min(1, sim.light / 2000);
  discMat.emissive = discMat.emissive || new THREE.Color(0x000000);
  discMat.emissive.setRGB(.01 + glow * .07, .05 + glow * .13, .02 + glow * .06);

  // 粒子流：速率归一化
  const n1 = Math.min(1, sim.v1 / 12), nFix = Math.min(1, sim.vFix / 6), nRed = Math.min(1, sim.vRed / 13);
  const lvl = { water: n1, o2: n1, atp: n1, nadph: n1, co2: nFix, fix: nFix, regen: nRed * .8, sugar: nRed * .6 };
  FLOWS.forEach(f => {
    f.level += ((lvl[f.key] || 0) - f.level) * Math.min(1, lastDt * 4);
    f.items.forEach((it, idx) => {
      const on = f.level > .04;
      it.m.visible = on;
      if (!on) return;
      it.p += lastDt * f.speed * (.35 + f.level * 1.1);
      if (it.p > 1) it.p -= 1;
      const pt = f.path.getPointAt(Math.min(.999, it.p));
      it.m.position.copy(pt);
      if (f.key === 'atp') it.m.rotation.z = Math.PI / 2 + Math.sin(now * .002 + idx) * .3;
    });
  });

  // 碳池可见数量随液位
  c3Pool.children.forEach((s, i) => { s.visible = i < Math.round(sim.c3 / 100 * c3Pool.children.length); });
  c5Pool.children.forEach((s, i) => { s.visible = i < Math.round(sim.c5 / 100 * c5Pool.children.length); });

  // 色素随光强微微脉动
  const pulse = .3 + glow * .5 + Math.sin(now * .0016) * .08;
  pigmentGroup.children.forEach((p, i) => {
    p.material.emissiveIntensity = pulse;
    p.position.y += Math.sin(now * .001 + i) * .00025;
  });

  rubiscoGroup.rotation.y = Math.sin(now * .00018) * .12;
  dust.rotation.y = now * .00002;

  // 相机
  const p0 = CAM[i0].p, p1 = CAM[i1].p;
  const gp = new THREE.Vector3(lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k), lerp(p0[2], p1[2], k));
  const g0 = CAM[i0].t, g1 = CAM[i1].t;
  const gt = new THREE.Vector3(lerp(g0[0], g1[0], k), lerp(g0[1], g1[1], k), lerp(g0[2], g1[2], k));
  const kk = 1 - Math.pow(.0005, lastDt);
  camPos.lerp(gp, kk); camTgt.lerp(gt, kk);
  if (view.auto) { camera.position.copy(camPos); camera.lookAt(camTgt); }
}

/* ================= 标签 ================= */
const labelBox = document.getElementById('labels');
const LABELS = [
  { text: '叶绿体', pos: () => new THREE.Vector3(-3.4, 2.45, 0), show: () => true },
  { text: '类囊体（基粒）', pos: () => new THREE.Vector3(-2.75, 1.15, 0.2), show: () => true },
  { text: '基质', pos: () => new THREE.Vector3(3.4, 1.9, 0), show: () => true },
  { text: '色素', pos: () => new THREE.Vector3(-2.75, 0.1, 1.1), show: () => true },
  { text: 'Rubisco', pos: () => new THREE.Vector3(1.9, -0.5, 0.7), show: () => true },
  { text: 'H₂O', pos: () => new THREE.Vector3(-5.6, 1.5, 1.4), show: () => sim.v1 > .4 },
  { text: 'O₂', pos: () => new THREE.Vector3(-4.6, 2.8, 1.9), show: () => sim.v1 > .4 },
  { text: 'CO₂', pos: () => new THREE.Vector3(6.2, 1.0, 1.6), show: () => sim.vFix > .3 },
  { text: 'ATP · NADPH', pos: () => new THREE.Vector3(-1.3, 0.55, 0.9), show: () => sim.v1 > .4 },
  { text: 'C₃', pos: () => new THREE.Vector3(0.55, -2.25, 0.35), show: () => true },
  { text: 'C₅', pos: () => new THREE.Vector3(1.35, 0.75, 0.55), show: () => true }
].map(L => {
  const el = document.createElement('div'); el.className = 'tag'; el.textContent = L.text;
  labelBox.appendChild(el); return { ...L, el };
});
const _v = new THREE.Vector3();
function updateLabels() {
  LABELS.forEach(L => {
    if (!L.show()) { L.el.style.display = 'none'; return; }
    _v.copy(L.pos()); _v.project(camera);
    if (_v.z > 1) { L.el.style.display = 'none'; return; }
    const px = (_v.x * .5 + .5) * innerWidth, py = (-_v.y * .5 + .5) * innerHeight;
    if (py < 150 || py > innerHeight - 90) { L.el.style.display = 'none'; return; }
    L.el.style.display = 'block';
    L.el.style.left = px + 'px';
    L.el.style.top = py + 'px';
  });
}

/* ================= 图表 ================= */
const SERIES = STAGES.map(s => s.rate);
function drawChart(i) {
  const c = document.getElementById('chart');
  if (!c) return;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = c.clientWidth || 300, h = c.clientHeight || 78;
  c.width = w * dpr; c.height = h * dpr;
  const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const padL = 22, padR = 6, padT = 6, padB = 12;
  const maxV = Math.max(...SERIES, 10);
  const x = k => padL + (w - padL - padR) * (k / (SERIES.length - 1));
  const y = v => h - padB - (h - padT - padB) * (v / maxV);
  ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1;
  [0, maxV / 2, maxV].forEach(v => {
    ctx.beginPath(); ctx.moveTo(padL, y(v)); ctx.lineTo(w - padR, y(v)); ctx.stroke();
    ctx.fillStyle = '#a8b3c4'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(v)), padL - 3, y(v) + 3);
  });
  ctx.beginPath(); ctx.strokeStyle = '#2F9E6B'; ctx.lineWidth = 2;
  SERIES.forEach((v, j) => { j ? ctx.lineTo(x(j), y(v)) : ctx.moveTo(x(j), y(v)); });
  ctx.stroke();
  ctx.lineTo(x(SERIES.length - 1), h - padB); ctx.lineTo(x(0), h - padB); ctx.closePath();
  ctx.fillStyle = 'rgba(47,158,107,.10)'; ctx.fill();
  SERIES.forEach((v, j) => {
    ctx.beginPath(); ctx.fillStyle = j === i ? '#7C5CFF' : '#2F9E6B';
    ctx.arc(x(j), y(v), j === i ? 3.4 : 2, 0, 7); ctx.fill();
  });
  const el = document.getElementById('chartVal');
  if (el) el.textContent = SERIES[i] + '';
}

/*__VOICE__*/

/* ================= UI ================= */
function setStepUI(i) {
  const s = STAGES[i];
  document.getElementById('stepNo').textContent = i + 1;
  document.getElementById('qTitle').textContent = s.question;
  document.getElementById('scene').textContent = s.summary;
  document.getElementById('instruction').textContent = s.instruction;
  document.getElementById('expect').textContent = s.expect;
  document.getElementById('conclusion').textContent = s.conclusion;
  document.getElementById('conclusion').hidden = true;
  document.getElementById('conclusionHint').hidden = false;
  document.getElementById('points').innerHTML = s.events.map(x => '<li>' + x + '</li>').join('');
  document.getElementById('warnText').textContent = s.warning;
  document.getElementById('examText').textContent = s.exam || '';
  document.getElementById('eqText').textContent = s.eq;
  document.getElementById('cur').textContent = i + 1;
  refreshTryChip();

  const m = s.metrics;
  const ro = document.getElementById('roO2'), rf = document.getElementById('roFix');
  if (ro) ro.textContent = Math.round(SERIES[i]);
  if (rf) rf.textContent = Math.round(m[0].value * .8);

  document.querySelectorAll('.step').forEach((b, j) => {
    b.classList.toggle('on', j === i);
    b.classList.toggle('done', j < i);
  });
  const ch = document.querySelectorAll('.chain .item');
  const map = [0, 1, 2, 2, 3, 3, 3, 2, 4];
  ch.forEach((el, j) => el.classList.toggle('on', j === map[i]));
  drawChart(i);
}

function goStep(i) {
  i = Math.max(0, Math.min(N - 1, i));
  cancelVoice();
  curStep = i; targetT = i;
  applyEnv(i);
  setStepUI(i);
  clearPick();
  resumeAuto();
  if (document.body.classList.contains('cinema')) updateCineBar();
  if (voiceOn && voiceReady && synth) setTimeout(() => { if (targetT === i) speakStage(i); }, 350);
}

/* 步骤条 */
STAGES.forEach((s, i) => {
  const b = document.createElement('button');
  b.className = 'step';
  b.innerHTML = `<span class="n">${i + 1}</span><span>${s.short}</span>`;
  b.onclick = () => goStep(i);
  document.getElementById('steps').appendChild(b);
});
document.getElementById('total').textContent = N;

/* 单元 */
const UNITS = [{ name: '叶绿体', i: 0 }, { name: '光反应', i: 1 }, { name: '暗反应', i: 4 }, { name: '突变', i: 7 }];
UNITS.forEach((u, j) => {
  const b = document.createElement('button');
  b.className = 'unit';
  b.textContent = `${['①', '②', '③', '④'][j]} ${u.name}`;
  b.onclick = () => goStep(u.i);
  document.getElementById('units').appendChild(b);
});

/* 按钮 */
document.getElementById('next').onclick = () => goStep(curStep + 1);
document.getElementById('prev').onclick = () => goStep(curStep - 1);
document.getElementById('reveal').onclick = () => {
  document.getElementById('conclusion').hidden = false;
  document.getElementById('conclusionHint').hidden = true;
  markTried();
};
document.getElementById('resetStep').onclick = () => {
  document.getElementById('conclusion').hidden = true;
  document.getElementById('conclusionHint').hidden = false;
  stepTried[curStep] = false;
  refreshTryChip();
};

/* 实验台：两个滑块 + 三个突变按钮 */
document.getElementById('light').oninput = e => {
  sim.light = +e.target.value; sim.mut = ''; syncEnvLabels(); markTried();
  const note = document.getElementById('mutNote'); if (note) note.hidden = true;
};
document.getElementById('co2').oninput = e => {
  sim.co2 = +e.target.value; sim.mut = ''; syncEnvLabels(); markTried();
  const note = document.getElementById('mutNote'); if (note) note.hidden = true;
};
function mutate(kind) {
  const note = document.getElementById('mutNote');
  sim.mut = kind;
  if (kind === 'dark') {
    sim.light = 0;
    if (note) { note.hidden = false; note.className = 'mutnote'; note.textContent = '突然黑暗：光反应停止 → ATP、NADPH 减少 → C₃ 还原受阻。盯住 C₃ 和 C₅。'; }
  } else if (kind === 'noco2') {
    sim.co2 = 0;
    if (note) { note.hidden = false; note.className = 'mutnote cool'; note.textContent = '突然断 CO₂：固定停止 → C₃ 不再生成，C₅ 不再被消耗。盯住 C₃ 和 C₅。'; }
  }
  syncEnvLabels(); markTried();
}
document.getElementById('btnDark').onclick = () => mutate('dark');
document.getElementById('btnNoCO2').onclick = () => mutate('noco2');
document.getElementById('btnResetSim').onclick = () => { applyEnv(curStep); markTried(); };

document.getElementById('voiceBtn').onclick = e => {
  voiceOn = !voiceOn;
  e.currentTarget.classList.toggle('on', voiceOn);
  e.currentTarget.textContent = voiceOn ? '语音 V' : '语音关';
  if (!voiceOn) cancelVoice(); else if (voiceReady) speakStage(curStep);
};
document.getElementById('autoBtn').onclick = e => {
  auto = !auto;
  e.currentTarget.classList.toggle('on', auto);
  e.currentTarget.textContent = auto ? '自动讲课中' : '自动讲课';
};

/* 面板 / 影院 / 视角 / 选中卡 */
document.getElementById('tgLeft').onclick = () => togglePanel('l');
document.getElementById('tgRight').onclick = () => togglePanel('r');
document.getElementById('tgCinema').onclick = () => setCinema(!document.body.classList.contains('cinema'));
document.getElementById('cineExit').onclick = () => setCinema(false);
document.getElementById('cinePrev').onclick = () => goStep(curStep - 1);
document.getElementById('cineNext').onclick = () => goStep(curStep + 1);
document.getElementById('cineVoice').onclick = () => document.getElementById('voiceBtn').click();
document.getElementById('cineFull').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
document.getElementById('pcClose').onclick = clearPick;
document.getElementById('vIn').onclick = () => zoomBy(1 / 1.15);
document.getElementById('vOut').onclick = () => zoomBy(1.15);
document.getElementById('vReset').onclick = () => { clearPick(); resumeAuto(); toast('已回到本步预设视角'); };
document.getElementById('vSpin').onclick = e => { view.spin = !view.spin; e.currentTarget.classList.toggle('on', view.spin); };
syncPanelBtns();
narrowMQ.addEventListener('change', syncPanelBtns);
setTimeout(() => toast('拖拽旋转 · 滚轮缩放 · 点结构看说明 · 右栏可做突变实验'), 900);

/* 考核 */
function openQuiz() {
  const body = document.getElementById('quizBody'); body.innerHTML = '';
  QUIZ.forEach((q, i) => {
    const d = document.createElement('div'); d.className = 'q';
    d.innerHTML = `<b>${i + 1}. ${q.q}</b>` + q.opts.map((o, j) =>
      `<label class="opt"><input type="radio" name="q${i}" value="${j}"> ${o}</label>`).join('') +
      `<div class="why" id="why${i}" hidden></div>`;
    body.appendChild(d);
  });
  document.getElementById('quizScore').textContent = '0';
  document.getElementById('quiz').hidden = false;
}
function closeQuiz() { document.getElementById('quiz').hidden = true; }
document.getElementById('quizBtn').onclick = openQuiz;
document.getElementById('quizClose').onclick = closeQuiz;
document.getElementById('helpBtn').onclick = () => { document.getElementById('help').hidden = false; };
document.getElementById('helpClose').onclick = () => { document.getElementById('help').hidden = true; };
document.getElementById('quizSubmit').onclick = () => {
  let score = 0;
  QUIZ.forEach((q, i) => {
    const sel = document.querySelector(`input[name="q${i}"]:checked`);
    const why = document.getElementById('why' + i);
    const ok = sel && +sel.value === q.a;
    if (ok) score++;
    why.hidden = false;
    why.className = 'why ' + (ok ? 'ok' : 'bad');
    why.textContent = (ok ? '✓ 正确。' : '✗ 正确答案：' + q.opts[q.a] + '。') + q.why;
  });
  document.getElementById('quizScore').textContent = score;
  document.getElementById('score').textContent = score;
};

/* 键盘 */
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (e.key === 'ArrowRight') goStep(curStep + 1);
  else if (e.key === 'ArrowLeft') goStep(curStep - 1);
  else if (/^[1-9]$/.test(e.key)) goStep(+e.key - 1);
  else if (k === 'q') openQuiz();
  else if (k === 'f') { e.preventDefault(); if (e.shiftKey) { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } else setCinema(!document.body.classList.contains('cinema')); }
  else if (k === 'v') document.getElementById('voiceBtn').click();
  else if (k === 'h') togglePanel('l');
  else if (k === 'j') togglePanel('r');
  else if (k === 'r') { clearPick(); resumeAuto(); toast('已回到本步预设视角'); }
  else if (e.key === 'Escape') {
    if (document.body.classList.contains('cinema')) setCinema(false);
    else { closeQuiz(); document.getElementById('help').hidden = true; clearPick(); }
  }
});

/* 尺寸 */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  drawChart(curStep);
}
addEventListener('resize', resize);

/* 主循环 */
let last = performance.now(), autoTimer = 0, uiAcc = 0, simAcc = 0;
const SIM_DT = 1 / 60;
function loop(now) {
  const raw = (now - last) / 1000; last = now;
  const dt = Math.min(.05, raw);
  lastDt = Math.min(.25, Math.max(.008, raw || .016));
  const k = Math.min(1, dt * 6 * speed);
  t += (targetT - t) * k;
  if (Math.abs(targetT - t) < .001) t = targetT;

  // 定步长积分：与帧率无关（后台标签页 1–3fps 时不会变成慢动作）
  simAcc += Math.min(.5, raw);
  let guard = 0;
  while (simAcc >= SIM_DT && guard++ < 40) { stepSim(SIM_DT); simAcc -= SIM_DT; }
  apply(t, now);
  if (!view.auto) updateViewCamera(lastDt);
  refreshSelBox();
  updateLabels();
  renderer.render(scene, camera);

  // 中控台每 100ms 刷新一次，避免 DOM 抖动
  uiAcc += lastDt;
  if (uiAcc > .1) {
    uiAcc = 0;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = Math.round(v); };
    const bar = (id, v) => { const el = document.getElementById(id); if (el) el.style.width = Math.round(v) + '%'; };
    set('valC3', sim.c3); bar('barC3', sim.c3);
    set('valC5', sim.c5); bar('barC5', sim.c5);
    set('valNADPH', sim.nadph); bar('barNADPH', sim.nadph);
    set('valATP', sim.atp); bar('barATP', sim.atp);
    const ro = document.getElementById('roO2'), rf = document.getElementById('roFix');
    if (ro) ro.textContent = Math.round(Math.min(100, sim.v1 / 14 * 100));
    if (rf) rf.textContent = Math.round(Math.min(100, sim.vFix / 7 * 100));
    const hot = document.querySelectorAll('.pool');
    hot.forEach((p, j) => {
      const v = [sim.c3, sim.c5, sim.nadph, sim.atp][j];
      p.classList.toggle('hot', v > 82);
      p.classList.toggle('low', v < 18);
    });
  }

  if (auto && Math.abs(t - targetT) < .01 && targetT < N - 1 && !autoTimer) {
    const ok = voiceOn ? (voiceState === 'ended') : true;
    if (ok) {
      const delay = voiceOn ? 700 : 2200;
      autoTimer = setTimeout(() => { autoTimer = 0; if (auto && targetT < N - 1) goStep(targetT + 1); }, delay);
    }
  }
  requestAnimationFrame(loop);
}

/* 初始化 */
const q = new URLSearchParams(location.search);
let start = Math.min(N - 1, Math.max(0, parseFloat(q.get('t')) || 0));
if (q.get('voice') === '0') {
  voiceOn = false;
  const vb = document.getElementById('voiceBtn');
  vb.classList.remove('on'); vb.textContent = '语音关';
}
resize();
t = targetT = Math.round(start);
goStep(Math.round(start));
apply(t, performance.now());
requestAnimationFrame(loop);
