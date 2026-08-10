/* ============================================================
   EPM — 3D model engine (three.js). Builds a compact building
   massing with named, selectable objects that map to the ids in
   buildModelData. Exposes window.EPM3D for the React viewer to
   drive selection, isolate, filters, fit, and status coloring.
   Requirements 04 — real selection; heavy BIM ops simulated.
   ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const STATUS_COLOR = {
  completed:  0x2e9e6b,
  inprogress: 0x2f6fdb,
  delayed:    0xd23f3f,
  notstarted: 0x9aa3b2,
  critical:   0xe08636,
};
const DISC_COLOR = {
  Structural: 0x8792a8,
  Mechanical: 0xc98a4b,
  Electrical: 0xd0b03f,
};

let S = null;

function makeInstance(container, opts) {
  const onSelect = opts.onSelect || (() => {});
  const w = container.clientWidth || 800, h = container.clientHeight || 460;
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
  camera.position.set(14, 11, 16);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 3, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8090a0, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(12, 20, 10); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1; key.shadow.camera.far = 80;
  key.shadow.camera.left = -20; key.shadow.camera.right = 20;
  key.shadow.camera.top = 20; key.shadow.camera.bottom = -20;
  scene.add(key);
  scene.add(new THREE.DirectionalLight(0xffffff, 0.3).translateX(-10));

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64),
    new THREE.MeshStandardMaterial({ color: 0xe9edf3, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(48, 48, 0xc2cbd8, 0xd8dee8);
  grid.position.y = 0; scene.add(grid);

  // ---- named objects ----
  const meshes = {}; // id -> mesh(es) group
  const add = (id, geo, mat, pos) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    m.castShadow = true; m.receiveShadow = true;
    m.userData.id = id;
    scene.add(m); meshes[id] = m; return m;
  };
  const smat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.72, metalness: 0.05 });

  // foundation slab
  add('FND-01', new THREE.BoxGeometry(11, 0.6, 8), smat(DISC_COLOR.Structural), [0, 0.3, 0]);
  // L1 columns (group)
  const colGroup = new THREE.Group(); colGroup.userData.id = 'COL-L1';
  const cx = [-4.5, -1.5, 1.5, 4.5], cz = [-3, 3];
  cx.forEach(x => cz.forEach(z => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.5), smat(DISC_COLOR.Structural));
    c.position.set(x, 2.1, z); c.castShadow = true; c.userData.id = 'COL-L1'; colGroup.add(c);
  }));
  scene.add(colGroup); meshes['COL-L1'] = colGroup;
  // L1 slab
  add('SLB-L1', new THREE.BoxGeometry(11, 0.4, 8), smat(DISC_COLOR.Structural), [0, 3.8, 0]);
  // L2 slab
  add('SLB-L2', new THREE.BoxGeometry(11, 0.4, 8), smat(DISC_COLOR.Structural), [0, 7.4, 0]);
  // L2 columns (visual, part of SLB-L2 selection not needed) — light
  cx.forEach(x => cz.forEach(z => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.5), smat(DISC_COLOR.Structural));
    c.position.set(x, 5.7, z); c.castShadow = true; c.userData.id = 'SLB-L2'; scene.add(c);
    if (!Array.isArray(meshes['SLB-L2extra'])) meshes['SLB-L2extra'] = [];
    meshes['SLB-L2extra'].push(c);
  }));
  // duct run on L2 (hero object)
  const duct = new THREE.Mesh(new THREE.BoxGeometry(8, 0.7, 0.7), smat(DISC_COLOR.Mechanical));
  duct.position.set(0, 6.7, -2); duct.castShadow = true; duct.userData.id = 'DUCT-L2-01';
  scene.add(duct); meshes['DUCT-L2-01'] = duct;
  // electrical conduit on L2
  const cnd = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 8, 12), smat(DISC_COLOR.Electrical));
  cnd.rotation.z = Math.PI / 2; cnd.position.set(0, 6.5, 2); cnd.castShadow = true; cnd.userData.id = 'CND-L2-01';
  scene.add(cnd); meshes['CND-L2-01'] = cnd;

  const inst = {
    scene, camera, renderer, controls, meshes,
    objMeta: {}, // id -> {status, discipline}
    selId: null, colorMode: 'status', raf: 0,
    forEachMesh(id, fn) {
      const m = meshes[id]; if (!m) return;
      if (m.isGroup) m.children.forEach(fn); else fn(m);
      if (id === 'SLB-L2' && meshes['SLB-L2extra']) meshes['SLB-L2extra'].forEach(fn);
    },
  };

  // pick
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  let downX = 0, downY = 0;
  renderer.domElement.addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (Math.abs(e.clientX - downX) > 4 || Math.abs(e.clientY - downY) > 4) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(scene.children, true).find(h => h.object.userData && h.object.userData.id);
    if (hit) { API.select(hit.object.userData.id); onSelect(hit.object.userData.id); }
    else { API.clearSelect(); onSelect(null); }
  });

  function resize() {
    const nw = container.clientWidth, nh = container.clientHeight;
    if (!nw || !nh) return;
    camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh);
  }
  const ro = new ResizeObserver(resize); ro.observe(container);
  inst.ro = ro;

  (function loop() { inst.raf = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera); })();

  return inst;
}

const API = {
  create(container, opts) {
    if (S) API.dispose();
    S = makeInstance(container, opts || {});
    if (opts && opts.meta) API.setMeta(opts.meta);
    API.recolor();
    API.fit();
    return true;
  },
  setMeta(meta) { if (!S) return; S.objMeta = meta || {}; API.recolor(); },
  baseColor(id) {
    if (!S) return 0x999999;
    const meta = S.objMeta[id];
    if (S.colorMode === 'status' && meta) return STATUS_COLOR[meta.critical && meta.status !== 'completed' ? 'critical' : meta.status] || 0x9aa3b2;
    if (S.colorMode === 'discipline' && meta) return DISC_COLOR[meta.discKey] || 0x8792a8;
    return 0x8792a8;
  },
  recolor() {
    if (!S) return;
    Object.keys(S.meshes).forEach(id => {
      if (id === 'SLB-L2extra') return;
      const c = API.baseColor(id);
      S.forEachMesh(id, m => { if (m.material) { m.material.color.setHex(c); m.material.emissive && m.material.emissive.setHex(id === S.selId ? 0x2f6fdb : 0x000000); m.material.emissiveIntensity = id === S.selId ? 0.4 : 0; } });
    });
  },
  select(id) {
    if (!S) return;
    S.selId = id; API.recolor();
    S.forEachMesh(id, m => { if (m.material) { m.material.emissive.setHex(0x2f6fdb); m.material.emissiveIntensity = 0.45; } });
  },
  clearSelect() { if (!S) return; S.selId = null; API.recolor(); },
  isolate(id) {
    if (!S) return;
    Object.keys(S.meshes).forEach(k => { if (k === 'SLB-L2extra') return; S.forEachMesh(k, m => { m.visible = (k === id); }); });
  },
  showAll() { if (!S) return; Object.keys(S.meshes).forEach(k => { if (k === 'SLB-L2extra') return; S.forEachMesh(k, m => { m.visible = true; }); }); },
  filter(pred) {
    if (!S) return;
    Object.keys(S.meshes).forEach(k => { if (k === 'SLB-L2extra') return; const vis = pred(k, S.objMeta[k]); S.forEachMesh(k, m => { m.visible = vis; }); });
  },
  setColorMode(mode) { if (!S) return; S.colorMode = mode; API.recolor(); },
  fit() {
    if (!S) return;
    S.camera.position.set(14, 11, 16); S.controls.target.set(0, 3.5, 0); S.controls.update();
  },
  focus(id) {
    if (!S || !S.meshes[id]) return;
    const box = new THREE.Box3().setFromObject(S.meshes[id]);
    const c = box.getCenter(new THREE.Vector3());
    S.controls.target.copy(c);
    S.camera.position.set(c.x + 8, c.y + 6, c.z + 9);
    S.controls.update();
  },
  reset() { API.showAll(); API.clearSelect(); API.fit(); },
  dispose() {
    if (!S) return;
    cancelAnimationFrame(S.raf); S.ro && S.ro.disconnect();
    S.renderer.dispose();
    if (S.renderer.domElement.parentNode) S.renderer.domElement.parentNode.removeChild(S.renderer.domElement);
    S = null;
  },
};

window.EPM3D = API;
