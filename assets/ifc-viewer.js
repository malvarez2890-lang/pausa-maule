// Visor 3D del modelo IFC4x3 (web-ifc + three.js, carga bajo demanda)
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import * as WebIFC from "./vendor/web-ifc-api.js";

const T = (k) => (window.PM_t ? window.PM_t(k) : k);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
const fmtN = (n, d = 2) => n.toFixed(d).replace(".", ",");

const CATS = ["Muros", "Montantes de muro cortina", "Pilares estructurales", "Armazón estructural", "Cimentación estructural", "Suelos", "Cubiertas", "Puertas", "Otros"];
const EXPLODE = { "Cubiertas": 5.2, "Armazón estructural": 3.0, "Suelos": -1.9, "Cimentación estructural": -3.6 };
const MAT_COL = { "MT_PINO RADIATA": 0xc8975a, "MT_TIERRA_QUINCHA": 0x9c6b45, "MT_HORMIGON ARMADO": 0x8a8f94, "MT_HORMIGÓN PULIDO": 0xb9bdc1, "MT_PLANCHA ONDULADA ZINCALUM": 0x6d8ea3, "TBC_Madera": 0xa0693c };

// Si una pieza viene con las caras invertidas (volumen con signo negativo, p. ej. por una instancia espejada)
// se le da vuelta el sentido de los triángulos y de las normales.
function fixWinding(g) {
  const p = g.getAttribute("position"), n = g.getAttribute("normal");
  const A = new THREE.Vector3(), Bv = new THREE.Vector3(), C = new THREE.Vector3();
  let vol = 0;
  for (let i = 0; i < p.count; i += 3) {
    A.fromBufferAttribute(p, i); Bv.fromBufferAttribute(p, i + 1); C.fromBufferAttribute(p, i + 2);
    vol += A.dot(Bv.cross(C)) / 6;
  }
  if (vol >= -1e-6) return false;
  for (const at of [p, n]) {
    for (let i = 0; i < at.count; i += 3) {
      const x = at.getX(i + 1), y = at.getY(i + 1), z = at.getZ(i + 1);
      at.setXYZ(i + 1, at.getX(i + 2), at.getY(i + 2), at.getZ(i + 2));
      at.setXYZ(i + 2, x, y, z);
    }
  }
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  p.needsUpdate = true; n.needsUpdate = true;
  return true;
}

// Paleta realista por material (color, rugosidad, metal), pensada para parecerse a los renders del proyecto
const MAT_DEF = {
  "MT_PINO RADIATA":              { c: 0xcaa273, r: 0.68, m: 0.0 },
  "MT_TIERRA_QUINCHA":            { c: 0xb8a07d, r: 0.95, m: 0.0 },
  "MT_HORMIGON ARMADO":           { c: 0x9d9c97, r: 0.92, m: 0.0 },
  "MT_HORMIGÓN PULIDO":           { c: 0xaeada8, r: 0.45, m: 0.05 },
  "MT_PLANCHA ONDULADA ZINCALUM": { c: 0xb4bbc1, r: 0.45, m: 0.3 },
  "TBC_Madera":                   { c: 0xa9764b, r: 0.65, m: 0.0 },
  "M_Aluminio Grafito":           { c: 0x555a5f, r: 0.4, m: 0.7 },
  "TBC_Generico":                 { c: 0xd8d2c6, r: 0.8, m: 0.0 }
};
const matDef = name => MAT_DEF[name] || { c: 0xcfc8bd, r: 0.85, m: 0.0 };
const repMaterial = d => {
  if (!d.t) return null;
  const mats = d.t.mat || [];
  return mats.find(m => /^MT_/.test(m)) || mats.find(m => /madera/i.test(m)) || mats[0] || null;
};

function hashColor(name) {
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return new THREE.Color().setHSL((h % 360) / 360, 0.45, 0.6);
}

export async function startViewer(host, url, onStatus) {
  const W = () => host.clientWidth, H = () => host.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W(), H());
  renderer.localClippingEnabled = true;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  {
    const gc = document.createElement("canvas"); gc.width = 4; gc.height = 256;
    const gg = gc.getContext("2d"), gr = gg.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, "#cfe1ef"); gr.addColorStop(0.62, "#eef1ee"); gr.addColorStop(1, "#f4efe4");
    gg.fillStyle = gr; gg.fillRect(0, 0, 4, 256);
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    scene.background = gt;
  }
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  {
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  }
  const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.01, 100000);
  scene.add(new THREE.HemisphereLight(0xe9f1fa, 0xb7aa96, 0.85));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.3);
  sun.castShadow = true;
  scene.add(sun); scene.add(sun.target);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  // como en Revit: rueda = zoom, botón central = desplazar (con Mayús = girar), izquierdo/derecho = girar
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
  controls.screenSpacePanning = true;

  onStatus("Iniciando motor IFC…");
  const api = new WebIFC.IfcAPI();
  api.SetWasmPath(new URL("./vendor/", import.meta.url).href, true);
  await api.Init();

  const infoReq = fetch(new URL("./elementos.json?v=1", import.meta.url).href).then(r => r.ok ? r.json() : null).catch(() => null);

  onStatus("Descargando modelo…");
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("No se pudo descargar el IFC (" + resp.status + ")");
  const data = new Uint8Array(await resp.arrayBuffer());

  onStatus("Leyendo geometría…");
  await new Promise(r => setTimeout(r, 30));
  const modelID = api.OpenModel(data);
  const all = [];
  api.StreamAllMeshes(modelID, mesh => {
    const eid = mesh.expressID;
    const pgs = mesh.geometries;
    for (let i = 0; i < pgs.size(); i++) {
      const pg = pgs.get(i);
      const g = api.GetGeometry(modelID, pg.geometryExpressID);
      const verts = api.GetVertexArray(g.GetVertexData(), g.GetVertexDataSize());
      const idx = api.GetIndexArray(g.GetIndexData(), g.GetIndexDataSize());
      if (verts.length && idx.length) {
        const bg = new THREE.BufferGeometry();
        const buf = new THREE.InterleavedBuffer(new Float32Array(verts), 6);
        bg.setAttribute("position", new THREE.InterleavedBufferAttribute(buf, 3, 0));
        bg.setAttribute("normal", new THREE.InterleavedBufferAttribute(buf, 3, 3));
        bg.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
        bg.applyMatrix4(new THREE.Matrix4().fromArray(pg.flatTransformation));
        const ng = bg.toNonIndexed();
        bg.dispose();
        fixWinding(ng);
        const n = ng.getAttribute("position").count;
        ng.setAttribute("eid", new THREE.BufferAttribute(new Float32Array(n).fill(eid), 1));
        { const ic = new Float32Array(n * 3); for (let i = 0; i < n; i++) { ic[i * 3] = pg.color.x; ic[i * 3 + 1] = pg.color.y; ic[i * 3 + 2] = pg.color.z; } ng.setAttribute("ifc", new THREE.BufferAttribute(ic, 3)); }
        ng.computeBoundingBox();
        all.push({ eid, c: pg.color, g: ng, box: ng.boundingBox.clone() });
      }
      g.delete();
    }
  });
  // el modelo queda abierto para consultar sus datos al hacer clic

  const info = await infoReq;

  // datos por elemento (tipo, categoría, material, estructural, exterior)
  const eidData = new Map();
  const getData = eid => {
    if (eidData.has(eid)) return eidData.get(eid);
    let name = "", tag = "";
    try {
      const line = api.GetLine(modelID, eid, false);
      name = line && line.Name ? line.Name.value : "";
      tag = line && line.Tag ? String(line.Tag.value) : "";
    } catch (e) { /* sin línea */ }
    const rec = info && tag && info.el[tag] ? info.el[tag] : null;
    const t = rec ? info.types[rec[0]] : null;
    const d = { eid, tag, name, rec, t, cat: t && CATS.includes(t.cat) ? t.cat : "Otros" };
    eidData.set(eid, d);
    return d;
  };

  // Descarta geometrías atípicas muy alejadas del conjunto y separa terreno / edificio
  const ctr = all.map(o => o.box.getCenter(new THREE.Vector3()));
  const q = (axis, p) => { const a = ctr.map(v => v[axis]).sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
  const lo = ["x", "y", "z"].map(a => q(a, 0.05)), hi = ["x", "y", "z"].map(a => q(a, 0.95));
  const pad = ["x", "y", "z"].map((a, i) => Math.max(1.5, (hi[i] - lo[i]) * 0.25));
  const fit = new THREE.Box3();
  const parts = [];
  all.forEach((o, i) => {
    const c = ctr[i];
    const ok = ["x", "y", "z"].every((a, k) => c[a] >= lo[k] - pad[k] && c[a] <= hi[k] + pad[k]);
    const size = o.box.getSize(new THREE.Vector3());
    if (!ok || Math.max(size.x, size.y, size.z) > 15) { o.g.dispose(); return; } // terreno u outliers
    fit.union(o.box);
    parts.push({ eid: o.eid, c: o.c, g: o.g, minY: o.box.min.y });
  });

  // Mallas por (capa, categoría, material)
  const topY = fit.max.y;
  const roofLevel = topY - 0.31; // vigas y plancha de cubierta parten sobre este nivel
  const model = new THREE.Group();
  const meshes = [];
  {
    const groups = new Map();
    parts.forEach(p => {
      const d = getData(p.eid);
      const roofLayer = p.minY >= roofLevel;
      const mn = repMaterial(d);
      const key = [roofLayer ? 1 : 0, d.cat, mn ? "m:" + mn : "c:" + [p.c.x, p.c.y, p.c.z].map(x => x.toFixed(2)).join(","), p.c.w.toFixed(2)].join("|");
      if (!groups.has(key)) groups.set(key, { c: p.c, cat: d.cat, roofLayer, mat: mn, list: [] });
      groups.get(key).list.push(p.g);
    });
    for (const gr of groups.values()) {
      const merged = mergeGeometries(gr.list, false);
      gr.list.forEach(l => l.dispose());
      if (!merged) continue;
      const def = gr.mat ? matDef(gr.mat) : { c: new THREE.Color(gr.c.x, gr.c.y, gr.c.z).getHex(), r: 0.85, m: 0 };
      const real = new THREE.Color(def.c);
      const mat = new THREE.MeshStandardMaterial({
        color: real.clone(), roughness: def.r, metalness: def.m, envMapIntensity: 0.7,
        transparent: gr.c.w < 0.99, opacity: gr.c.w, side: THREE.DoubleSide, clipShadows: true
      });
      const m = new THREE.Mesh(merged, mat);
      m.castShadow = true; m.receiveShadow = true;
      m.userData = { cat: gr.cat, roofLayer: gr.roofLayer, matName: gr.mat, real, defColor: real.clone(), def, tr: mat.transparent, op: mat.opacity };
      meshes.push(m);
      model.add(m);
    }
  }
  scene.add(model);

  const box = fit.isEmpty() ? new THREE.Box3().setFromObject(model) : fit;
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const R = Math.max(size.x, size.y, size.z);
  camera.near = R / 1000; camera.far = R * 100; camera.updateProjectionMatrix();
  sun.position.copy(center).add(new THREE.Vector3(-0.8, 1.6, 1.1).multiplyScalar(R * 1.7));
  sun.target.position.copy(center);
  {
    const sc = sun.shadow.camera, e = R * 2.1;
    sc.left = -e; sc.right = e; sc.top = e; sc.bottom = -e; sc.near = R * 0.2; sc.far = R * 8; sc.updateProjectionMatrix();
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  }
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(R * 16, R * 16), new THREE.MeshStandardMaterial({ color: 0xcdc4b3, roughness: 1, metalness: 0, envMapIntensity: 0.4 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(center.x, box.min.y - 0.012, center.z); ground.receiveShadow = true;
  scene.add(ground);


  // ---------- estado ----------
  const catOn = Object.fromEntries(CATS.map(c => [c, true]));
  let roofOn = true, roofAuto = false;
  let colorMode = "real";
  let scaleNow = 1;
  let explodeK = 0, explodeTarget = 0, explodeFrom = 0, explodeT0 = 0;
  const clip = { on: false, axis: "y", flip: false, v: 0 };
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  let isolate = null; // Set de eids aislados
  let overlays = [];  // mallas de aislamiento
  let hl = [];        // mallas de resaltado
  let measureOn = false, mPts = [], mObjs = [];
  let current = null;

  const presentCats = CATS.filter(c => meshes.some(m => m.userData.cat === c));

  // ---------- visibilidad, clipping, color ----------
  function updateVisibility() {
    meshes.forEach(m => { m.visible = catOn[m.userData.cat] && (!m.userData.roofLayer || roofOn); });
  }
  // Relleno negro de los cortes (poché) con búfer de plantilla: paridad de superficies a lo largo de cada rayo.
  // No depende del sentido de las caras de cada pieza.
  const stencilMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc, stencilFail: THREE.InvertStencilOp, stencilZFail: THREE.InvertStencilOp, stencilZPass: THREE.InvertStencilOp });
  const capPlane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp }));
  capPlane.scale.setScalar(R * 8); capPlane.renderOrder = 1.1; capPlane.visible = false; scene.add(capPlane);
  const caps = new Map(); // malla -> gemela de plantilla
  function refreshCaps() {
    caps.forEach((tw, src) => {
      if (!clip.on || !(meshes.includes(src) || overlays.includes(src))) { scene.remove(tw); caps.delete(src); }
    });
    capPlane.visible = clip.on;
    if (!clip.on) return;
    [...meshes, ...overlays].forEach(src => {
      if (caps.has(src)) return;
      const tw = new THREE.Mesh(src.geometry, stencilMat);
      tw.renderOrder = 1;
      scene.add(tw); caps.set(src, tw);
    });
  }
  function applyClip() {
    const want = clip.on ? [clipPlane] : [];
    const mats = new Set([stencilMat]);
    scene.traverse(o => { if (o.isMesh && o.material && o !== capPlane) mats.add(o.material); });
    mats.forEach(m => {
      if ((m.clippingPlanes || []).length !== want.length) m.needsUpdate = true;
      m.clippingPlanes = want;
    });
    refreshCaps();
  }
  function updateClipPlane() {
    const s = clip.flip ? -1 : 1;
    const n = clip.axis === "y" ? new THREE.Vector3(0, -1, 0) : clip.axis === "x" ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 0, -1);
    clipPlane.normal.copy(n).multiplyScalar(s);
    clipPlane.constant = s * clip.v;
    applyClip();
  }
  function colorFor(mode, d) {
    const none = { c: new THREE.Color(0xd0d0d0), label: "Sin dato" };
    if (!d.rec) return none;
    if (mode === "mat") {
      const mats = d.t.mat || [];
      const name = mats.find(m => /^MT_/.test(m)) || mats.find(m => /madera/i.test(m)) || mats[0];
      return name ? { c: new THREE.Color(MAT_COL[name] || hashColor(name)), label: name } : none;
    }
    if (mode === "str") {
      const v = d.rec[5];
      return v === 1 ? { c: new THREE.Color(0xe4572e), label: "Estructural" } : v === 0 ? { c: new THREE.Color(0x9aa5b1), label: "No estructural" } : none;
    }
    const v = d.rec[6];
    return v === 1 ? { c: new THREE.Color(0x2e86ab), label: "Exterior" } : v === 0 ? { c: new THREE.Color(0xc9c9c9), label: "Interior" } : none;
  }
  function ensureColorAttr(m, mode) {
    const key = "col_" + mode;
    if (m.userData[key]) return m.userData[key];
    const id = m.geometry.getAttribute("eid"), arr = new Float32Array(id.count * 3);
    for (let i = 0; i < id.count; i++) { const c = colorFor(mode, getData(id.getX(i))).c; arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    m.userData[key] = new THREE.BufferAttribute(arr, 3);
    return m.userData[key];
  }
  function paint(m, mode) {
    const mt = m.material;
    if (mode === "real") { mt.vertexColors = false; mt.color.copy(m.userData.real); mt.roughness = m.userData.def.r; mt.metalness = m.userData.def.m; mt.envMapIntensity = 0.7; }
    else {
      m.geometry.setAttribute("color", mode === "orig" ? m.geometry.getAttribute("ifc") : ensureColorAttr(m, mode));
      mt.vertexColors = true; mt.color.set(0xffffff); mt.roughness = 0.85; mt.metalness = 0; mt.envMapIntensity = 0.3;
    }
    mt.needsUpdate = true;
  }
  function setColorMode(mode) {
    colorMode = mode;
    meshes.forEach(m => paint(m, mode));
    if (isolate) buildIsolation();
    renderLegend();
    if (popName === "color") openPop("color", true);
  }

  // ---------- resaltado / aislamiento ----------
  function overlayFor(test, makeMat, withColor) {
    const out = [];
    for (const m of meshes) {
      const g = m.geometry, id = g.getAttribute("eid"), p = g.getAttribute("position"), nrm = g.getAttribute("normal");
      const col = withColor && m.material.vertexColors ? g.getAttribute("color") : null;
      const pos = [], cols = [], nor = [];
      for (let i = 0; i < id.count; i += 3) {
        if (!test(id.getX(i))) continue;
        for (let k = 0; k < 3; k++) {
          pos.push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
          nor.push(nrm.getX(i + k), nrm.getY(i + k), nrm.getZ(i + k));
          if (col) cols.push(col.getX(i + k), col.getY(i + k), col.getZ(i + k));
        }
      }
      if (!pos.length) continue;
      const og = new THREE.BufferGeometry();
      og.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      og.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
      if (col) og.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
      const om = new THREE.Mesh(og, makeMat(m, !!col));
      om.userData.src = m;
      out.push(om);
    }
    return out;
  }
  function clearList(list) { list.forEach(o => { scene.remove(o); o.geometry.dispose(); o.material.dispose(); }); }
  function highlight(eid) {
    clearList(hl); hl = [];
    if (eid === null) return;
    hl = overlayFor(v => v === eid, () => new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthTest: false }), false);
    hl.forEach(o => { o.renderOrder = 5; scene.add(o); });
    applyClip();
  }
  function ghost(on) {
    meshes.forEach(m => {
      m.material.transparent = on ? true : m.userData.tr;
      m.material.opacity = on ? 0.07 : m.userData.op;
      m.material.depthWrite = !on;
      m.castShadow = !on;
      m.material.needsUpdate = true;
    });
  }
  function buildIsolation() {
    clearList(overlays); overlays = [];
    if (!isolate) return;
    overlays = overlayFor(v => isolate.has(v), (m, withCol) =>
      new THREE.MeshStandardMaterial({ color: m.material.color.clone(), vertexColors: withCol, roughness: m.material.roughness, metalness: m.material.metalness, envMapIntensity: m.material.envMapIntensity, side: THREE.DoubleSide, clipShadows: true }), true);
    overlays.forEach(o => { o.renderOrder = 2; o.castShadow = true; o.receiveShadow = true; scene.add(o); });
    applyClip();
  }
  function setIsolation(set) {
    const was = !!isolate;
    isolate = set && set.size ? set : null;
    if (isolate && !was) ghost(true);
    if (!isolate && was) ghost(false);
    buildIsolation();
  }

  // ---------- vistas ----------
  const views = {
    iso:   { es: "Isométrica", dir: [1.25, 0.95, 1.25] },
    plan:  { es: "Planta",     dir: [0, 2.2, 0.0001] },
    front: { es: "Frente",     dir: [0, 0.35, 1.9] },
    side:  { es: "Lateral",    dir: [1.9, 0.35, 0] }
  };
  let anim = null, viewKey = "iso";
  function goTo(key, instant) {
    viewKey = key;
    const v = views[key], s = R * scaleNow * Math.max(1, 0.95 / camera.aspect); // en pantallas verticales se aleja para que quepa
    const to = new THREE.Vector3(center.x + v.dir[0] * s, center.y + v.dir[1] * s, center.z + v.dir[2] * s);
    if (instant) { camera.position.copy(to); controls.target.copy(center); controls.update(); return; }
    anim = { from: camera.position.clone(), to, tFrom: controls.target.clone(), tTo: center.clone(), t0: performance.now(), dur: 650 };
  }
  goTo("iso", true);

  // ---------- interfaz ----------
  const root = host.parentElement;
  const topBox = document.createElement("div"); topBox.className = "v3d-top";
  const ui = document.createElement("div"); ui.className = "v3d-ui";
  const pop = document.createElement("div"); pop.className = "v3d-pop"; pop.hidden = true;
  topBox.appendChild(ui); topBox.appendChild(pop);
  root.appendChild(topBox);
  const btns = {};
  const mk = (id, label, onClick, cls) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "v3d-b" + (cls ? " " + cls : ""); b.dataset.es = label;
    b.textContent = T(label);
    b.addEventListener("click", onClick);
    ui.appendChild(b); btns[id] = b; return b;
  };
  const relabel = el => {
    el.querySelectorAll("[data-es]").forEach(n => { n.textContent = T(n.dataset.es); });
    el.querySelectorAll("[data-es-ph]").forEach(n => { n.placeholder = T(n.dataset.esPh); });
  };
  const setActive = k => Object.keys(views).forEach(id => btns[id].classList.toggle("on", id === k));

  function setRoof(on) {
    roofOn = on; updateVisibility();
    btns.roof.dataset.es = roofOn ? "Ocultar cubierta" : "Mostrar cubierta";
    btns.roof.textContent = T(btns.roof.dataset.es);
    btns.roof.classList.toggle("on", !roofOn);
  }
  Object.keys(views).forEach(k => mk(k, views[k].es, () => {
    goTo(k); setActive(k);
    if (k === "plan") { if (roofOn) { setRoof(false); roofAuto = true; } } else if (roofAuto) { setRoof(true); roofAuto = false; }
  }));
  setActive("iso");
  mk("roof", "Ocultar cubierta", () => { roofAuto = false; setRoof(!roofOn); }, "sep");

  // ventanas emergentes (Capas / Color / Corte)
  let popName = null;
  function openPop(name, force) {
    popName = !force && popName === name ? null : name;
    ["layers", "color", "cut"].forEach(n => btns[n].classList.toggle("open", popName === n));
    pop.hidden = !popName;
    if (!popName) return;
    pop.innerHTML = "";
    if (popName === "layers") buildLayersPop();
    if (popName === "color") buildColorPop();
    if (popName === "cut") buildCutPop();
    relabel(pop);
  }
  const row = (html) => { const d = document.createElement("label"); d.className = "v3d-row"; d.innerHTML = html; pop.appendChild(d); return d; };

  function buildLayersPop() {
    presentCats.forEach(c => {
      const r = row("<input type=\"checkbox\"" + (catOn[c] ? " checked" : "") + "><span data-es=\"" + esc(c) + "\"></span>");
      r.querySelector("input").addEventListener("change", e => { catOn[c] = e.target.checked; updateVisibility(); });
    });
    const lk = document.createElement("div"); lk.className = "v3d-links";
    lk.innerHTML = "<button type=\"button\" data-es=\"Mostrar todo\"></button>";
    lk.firstChild.addEventListener("click", () => { presentCats.forEach(c => { catOn[c] = true; }); updateVisibility(); openPop("layers", true); });
    pop.appendChild(lk);
  }
  function buildColorPop() {
    [["real", "Realista"], ["orig", "Original (IFC)"], ["str", "Estructural / no estructural"], ["ext", "Exterior / interior"]].forEach(([id, label]) => {
      const r = row("<input type=\"radio\" name=\"v3dcol\"" + (colorMode === id ? " checked" : "") + "><span data-es=\"" + esc(label) + "\"></span>");
      r.querySelector("input").addEventListener("change", () => setColorMode(id));
    });
    if (colorMode !== "real") return;
    const hd = document.createElement("div"); hd.className = "v3d-sub2"; hd.dataset.es = "Colores de materiales"; pop.appendChild(hd);
    const names = [...new Set(meshes.map(m => m.userData.matName).filter(Boolean))];
    names.forEach(n => {
      const first = meshes.find(m => m.userData.matName === n);
      const r = document.createElement("label"); r.className = "v3d-row v3d-mat";
      const inp = document.createElement("input"); inp.type = "color"; inp.value = "#" + first.userData.real.getHexString();
      const sp = document.createElement("span"); sp.textContent = n;
      r.appendChild(inp); r.appendChild(sp); pop.appendChild(r);
      inp.addEventListener("input", () => {
        meshes.forEach(m => { if (m.userData.matName === n) { m.userData.real.set(inp.value); m.material.color.copy(m.userData.real); } });
        if (isolate) buildIsolation();
      });
    });
    const lk = document.createElement("div"); lk.className = "v3d-links";
    lk.innerHTML = "<button type=\"button\" data-es=\"Restaurar colores\"></button>";
    lk.firstChild.addEventListener("click", () => {
      meshes.forEach(m => { m.userData.real.copy(m.userData.defColor); m.material.color.copy(m.userData.real); });
      if (isolate) buildIsolation();
      openPop("color", true);
    });
    pop.appendChild(lk);
  }
  function buildCutPop() {
    const rng = () => [box.min[clip.axis] - 0.05, box.max[clip.axis] + 0.05];
    const slider = document.createElement("input");
    const flipBox = document.createElement("input");
    const syncSlider = () => { const [a, b] = rng(); slider.min = a; slider.max = b; slider.value = clip.on ? clip.v : b; };
    [["y", "Horizontal (altura)"], ["x", "Vertical (ancho)"], ["z", "Vertical (fondo)"]].forEach(([id, label]) => {
      const r = row("<input type=\"radio\" name=\"v3dax\"" + (clip.axis === id ? " checked" : "") + "><span data-es=\"" + esc(label) + "\"></span>");
      r.querySelector("input").addEventListener("change", () => {
        clip.axis = id; clip.flip = false; clip.on = false; clip.v = rng()[1];
        flipBox.checked = false; syncSlider(); updateClipPlane(); btns.cut.classList.remove("on");
      });
    });
    const sr = document.createElement("div"); sr.className = "v3d-row";
    slider.type = "range"; slider.step = "0.01"; syncSlider();
    slider.addEventListener("input", () => { clip.v = parseFloat(slider.value); clip.on = true; btns.cut.classList.add("on"); updateClipPlane(); });
    sr.appendChild(slider); pop.appendChild(sr);
    const fr = document.createElement("label"); fr.className = "v3d-row";
    flipBox.type = "checkbox"; flipBox.checked = clip.flip;
    fr.appendChild(flipBox);
    const fs = document.createElement("span"); fs.dataset.es = "Invertir"; fr.appendChild(fs); pop.appendChild(fr);
    flipBox.addEventListener("change", () => { clip.flip = flipBox.checked; clip.on = true; btns.cut.classList.add("on"); updateClipPlane(); });
    const lk = document.createElement("div"); lk.className = "v3d-links";
    lk.innerHTML = "<button type=\"button\" data-es=\"Quitar corte\"></button>";
    lk.firstChild.addEventListener("click", () => {
      clip.on = false; clip.flip = false; clip.v = rng()[1]; flipBox.checked = false; syncSlider();
      btns.cut.classList.remove("on"); updateClipPlane();
    });
    pop.appendChild(lk);
  }

  mk("layers", "Capas", () => openPop("layers"), "sep");
  mk("color", "Color", () => openPop("color"));
  mk("cut", "Corte", () => openPop("cut"));
  mk("measure", "Medir", () => setMeasure(!measureOn));
  mk("explode", "Explotar", () => {
    explodeFrom = explodeK; explodeT0 = performance.now();
    explodeTarget = explodeTarget ? 0 : 1;
    btns.explode.dataset.es = explodeTarget ? "Juntar" : "Explotar";
    btns.explode.textContent = T(btns.explode.dataset.es);
    btns.explode.classList.toggle("on", !!explodeTarget);
    clearMeasure();
    scaleNow = explodeTarget ? 1.65 : 1;
    if (explodeTarget) { // al explotar siempre se muestra en isométrica y con la cubierta
      if (roofAuto) { setRoof(true); roofAuto = false; }
      viewKey = "iso"; setActive("iso");
    }
    goTo(viewKey);
  });
  controls.addEventListener("start", () => { anim = null; Object.keys(views).forEach(id => btns[id].classList.remove("on")); });


  // ---------- cubo de navegación (como el ViewCube de Revit) ----------
  const cubeBox = document.createElement("div"); cubeBox.className = "v3d-cube";
  const cubeCv = document.createElement("canvas"); cubeBox.appendChild(cubeCv);
  const cubeBtns = document.createElement("div"); cubeBtns.className = "v3d-cube-btns";
  cubeBtns.innerHTML = "<button type=\"button\" data-a=\"l\" aria-label=\"Girar a la izquierda\">⟲</button><button type=\"button\" data-a=\"h\" aria-label=\"Isométrica\">⌂</button><button type=\"button\" data-a=\"r\" aria-label=\"Girar a la derecha\">⟳</button>";
  cubeBox.appendChild(cubeBtns);
  root.appendChild(cubeBox);
  const CS = 128;
  const cubeR = new THREE.WebGLRenderer({ canvas: cubeCv, alpha: true, antialias: true });
  cubeR.setPixelRatio(Math.min(devicePixelRatio, 2)); cubeR.setSize(CS, CS, false);
  cubeCv.style.width = CS + "px"; cubeCv.style.height = CS + "px";
  const cubeScene = new THREE.Scene();
  const cubeCam = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  const FACES = ["Derecha", "Izquierda", "Superior", "Inferior", "Frontal", "Posterior"]; // +x -x +y -y +z -z
  const faceTex = (txt, rot) => {
    const c = document.createElement("canvas"); c.width = c.height = 192;
    const g = c.getContext("2d");
    g.fillStyle = "#f6f6f6"; g.fillRect(0, 0, 192, 192);
    g.strokeStyle = "#000"; g.lineWidth = 6; g.strokeRect(3, 3, 186, 186);
    g.translate(96, 96); g.rotate(rot || 0);
    g.fillStyle = "#000"; g.textAlign = "center"; g.textBaseline = "middle";
    let size = 34; g.font = "700 " + size + "px 'Barlow Condensed','Arial Narrow',Arial,sans-serif";
    const label = T(txt).toUpperCase();
    while (g.measureText(label).width > 160 && size > 14) { size -= 2; g.font = "700 " + size + "px 'Barlow Condensed','Arial Narrow',Arial,sans-serif"; }
    g.fillText(label, 0, 2);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
  };
  const cubeMats = FACES.map(f => new THREE.MeshBasicMaterial({ map: faceTex(f, f === "Superior" ? Math.PI : 0) }));
  const cubeMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), cubeMats);
  cubeScene.add(cubeMesh);
  const cubeEdges = new THREE.LineSegments(new THREE.EdgesGeometry(cubeMesh.geometry), new THREE.LineBasicMaterial({ color: 0x000000 }));
  cubeMesh.add(cubeEdges);
  const spots = [];
  const spotMat = () => new THREE.MeshBasicMaterial({ color: 0x6b7785, transparent: true, opacity: 0.22, depthWrite: false });
  const S = 0.3, O = 0.5 - S / 2 + 0.02;
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(S, S, S), spotMat()); // esquina
    m.position.set(sx * O, sy * O, sz * O); m.userData.dir = new THREE.Vector3(sx, sy, sz).normalize(); m.userData.corner = true;
    cubeMesh.add(m); spots.push(m);
  }
  const L = 1 - 2 * S - 0.06; // largo de las aristas, entre esquinas
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    const mx = new THREE.Mesh(new THREE.BoxGeometry(L, S * 0.8, S * 0.8), spotMat()); // arista paralela a X
    mx.position.set(0, a * O, b * O); mx.userData.dir = new THREE.Vector3(0, a, b).normalize();
    const my = new THREE.Mesh(new THREE.BoxGeometry(S * 0.8, L, S * 0.8), spotMat()); // paralela a Y
    my.position.set(a * O, 0, b * O); my.userData.dir = new THREE.Vector3(a, 0, b).normalize();
    const mz = new THREE.Mesh(new THREE.BoxGeometry(S * 0.8, S * 0.8, L), spotMat()); // paralela a Z
    mz.position.set(a * O, b * O, 0); mz.userData.dir = new THREE.Vector3(a, b, 0).normalize();
    for (const m of [mx, my, mz]) { cubeMesh.add(m); spots.push(m); }
  }
  const cubeLabels = () => { FACES.forEach((f, i) => { const old = cubeMats[i].map; cubeMats[i].map = faceTex(f, f === "Superior" ? Math.PI : 0); cubeMats[i].needsUpdate = true; old.dispose(); }); };
  const cubeRay = new THREE.Raycaster(), cubeNdc = new THREE.Vector2();
  const cubeHit = e => {
    const r = cubeCv.getBoundingClientRect();
    cubeNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    cubeRay.setFromCamera(cubeNdc, cubeCam);
    const hits = cubeRay.intersectObjects([...spots, cubeMesh], false);
    return hits.find(h => h.object.userData.corner) || hits[0] || null; // las esquinas tienen prioridad
  };
  const dirFromHit = p => { // cara, arista o esquina según la zona tocada
    const f = a => Math.abs(a) > 0.3 ? Math.sign(a) : 0;
    const d = new THREE.Vector3(f(p.x), f(p.y), f(p.z));
    return d.lengthSq() ? d.normalize() : null;
  };
  function snapDir(d) {
    if (Math.abs(d.x) < 1e-3 && d.y > 0.99 && Math.abs(d.z) < 1e-3) { btns.plan.click(); return; }
    Object.keys(views).forEach(id => btns[id].classList.remove("on"));
    if (roofAuto) { setRoof(true); roofAuto = false; }
    const dist = Math.max(camera.position.distanceTo(controls.target), R * 1.2);
    const to = center.clone().addScaledVector(d, dist);
    anim = { from: camera.position.clone(), to, tFrom: controls.target.clone(), tTo: center.clone(), t0: performance.now(), dur: 650 };
  }
  function spin(deg) { // gira la cámara alrededor del eje vertical que pasa por el centro
    const off = camera.position.clone().sub(center);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(deg));
    Object.keys(views).forEach(id => btns[id].classList.remove("on"));
    anim = { from: camera.position.clone(), to: center.clone().add(off), tFrom: controls.target.clone(), tTo: center.clone(), t0: performance.now(), dur: 600 };
  }
  let cubeDown = null, cubeHover = -1;
  cubeCv.addEventListener("pointerdown", e => { cubeDown = { x: e.clientX, y: e.clientY }; });
  cubeCv.addEventListener("pointerup", e => {
    if (!cubeDown) return;
    const moved = Math.hypot(e.clientX - cubeDown.x, e.clientY - cubeDown.y); cubeDown = null;
    if (moved > 6) return;
    const h = cubeHit(e); if (!h) return;
    const d = h.object.userData.dir ? h.object.userData.dir.clone() : dirFromHit(cubeMesh.worldToLocal(h.point.clone()));
    if (d) snapDir(d);
  });
  cubeCv.addEventListener("pointermove", e => {
    const h = cubeHit(e), spot = h && h.object.userData.dir ? h.object : null;
    const idx = h && !spot ? h.face.materialIndex : -1;
    const key = spot ? spot.id : idx;
    if (key === cubeHover) return;
    cubeHover = key;
    cubeMats.forEach((m, i) => m.color.set(i === idx ? 0xbfe0ff : 0xffffff));
    spots.forEach(m => { const on = m === spot; m.material.color.set(on ? 0x2f8fff : 0x6b7785); m.material.opacity = on ? 0.85 : 0.22; });
    cubeCv.style.cursor = h ? "pointer" : "";
  });
  cubeCv.addEventListener("pointerleave", () => { cubeHover = -1; cubeMats.forEach(m => m.color.set(0xffffff)); spots.forEach(m => { m.material.color.set(0x6b7785); m.material.opacity = 0.22; }); });
  cubeBtns.addEventListener("click", e => {
    const a = e.target.getAttribute && e.target.getAttribute("data-a");
    if (a === "l") spin(-90); else if (a === "r") spin(90); else if (a === "h") btns.iso.click();
  });
  const cubeDir = new THREE.Vector3();
  function renderCube() {
    cubeDir.copy(camera.position).sub(controls.target).normalize().multiplyScalar(3.6);
    cubeCam.position.copy(cubeDir); cubeCam.up.copy(camera.up); cubeCam.lookAt(0, 0, 0);
    cubeR.render(cubeScene, cubeCam);
  }

  // leyenda de colores
  const legend = document.createElement("div"); legend.className = "v3d-legend"; legend.hidden = true; root.appendChild(legend);
  function renderLegend() {
    if (colorMode === "orig" || colorMode === "real") { legend.hidden = true; return; }
    const seen = new Map();
    eidData.forEach(d => { const r = colorFor(colorMode, d); if (!seen.has(r.label)) seen.set(r.label, r.c); });
    legend.innerHTML = [...seen.entries()].map(([l, c]) => "<div><i style=\"background:#" + c.getHexString() + "\"></i><span data-es=\"" + esc(l) + "\">" + esc(T(l)) + "</span></div>").join("");
    legend.hidden = false;
  }

  // búsqueda y aislamiento
  const sbox = document.createElement("div"); sbox.className = "v3d-search";
  sbox.innerHTML = "<input type=\"search\" list=\"v3d-dl\" data-es-ph=\"Buscar tipo o categoría…\" aria-label=\"Buscar\"><datalist id=\"v3d-dl\"></datalist><span class=\"v3d-count\"></span>";
  const sin = sbox.querySelector("input"), cnt = sbox.querySelector(".v3d-count");
  const names = new Set();
  eidData.forEach(d => { if (d.t) names.add(d.t.type); });
  presentCats.forEach(c => { if (c !== "Otros") names.add(T(c)); });
  sbox.querySelector("datalist").innerHTML = [...names].sort().map(n => "<option value=\"" + esc(n) + "\">").join("");
  root.appendChild(sbox);
  let sTimer = null;
  function runSearch() {
    const qy = sin.value.trim().toLowerCase();
    if (!qy) { cnt.textContent = ""; setIsolation(null); return; }
    const set = new Set();
    eidData.forEach(d => {
      if (!d.t) return;
      const hay = [d.t.type, d.t.fam, d.t.cat, T(d.t.cat), (d.t.mat || []).join(" ")].join(" ").toLowerCase();
      if (hay.includes(qy)) set.add(d.eid);
    });
    cnt.textContent = set.size + " " + T("piezas");
    setIsolation(set);
  }
  sin.addEventListener("input", () => { clearTimeout(sTimer); sTimer = setTimeout(runSearch, 200); });
  sin.addEventListener("keydown", e => { e.stopPropagation(); });

  // ---------- medición ----------
  const mlabel = document.createElement("div"); mlabel.className = "v3d-measure"; mlabel.hidden = true; root.appendChild(mlabel);
  const mhint = document.createElement("div"); mhint.className = "v3d-mhint"; mhint.hidden = true; mhint.dataset.es = "Haz clic en dos puntos del modelo para medir"; mhint.textContent = T(mhint.dataset.es); root.appendChild(mhint);
  function clearMeasure() { mObjs.forEach(o => { scene.remove(o); o.geometry.dispose(); o.material.dispose(); }); mObjs = []; mPts = []; mlabel.hidden = true; }
  function setMeasure(on) {
    measureOn = on;
    btns.measure.classList.toggle("on", on);
    mhint.hidden = !on;
    renderer.domElement.style.cursor = on ? "crosshair" : "";
    if (!on) clearMeasure(); else select(null);
  }
  function addMeasurePoint(p) {
    if (mPts.length >= 2) clearMeasure();
    mPts.push(p.clone());
    const sm = new THREE.Mesh(new THREE.SphereGeometry(R * 0.011, 12, 12), new THREE.MeshBasicMaterial({ color: 0x000000, depthTest: false }));
    sm.position.copy(p); sm.renderOrder = 9; scene.add(sm); mObjs.push(sm);
    if (mPts.length === 2) {
      const lg = new THREE.BufferGeometry().setFromPoints(mPts);
      const ln = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0x000000, depthTest: false }));
      ln.renderOrder = 9; scene.add(ln); mObjs.push(ln);
    }
    renderMeasure();
  }
  function renderMeasure() {
    if (mPts.length < 2) { mlabel.hidden = true; return; }
    const a = mPts[0], b = mPts[1], d = a.distanceTo(b), hz = Math.hypot(b.x - a.x, b.z - a.z), vt = Math.abs(b.y - a.y);
    mlabel.innerHTML = "<b>" + esc(T("Distancia")) + ": " + fmtN(d) + " m</b><br>" + esc(T("horizontal")) + " " + fmtN(hz) + " m · " + esc(T("vertical")) + " " + fmtN(vt) + " m";
    mlabel.hidden = false;
  }
  const tmpV = new THREE.Vector3();
  function placeMeasureLabel() {
    if (mlabel.hidden || mPts.length < 2) return;
    tmpV.copy(mPts[0]).add(mPts[1]).multiplyScalar(0.5).project(camera);
    const x = (tmpV.x * 0.5 + 0.5) * W(), y = (-tmpV.y * 0.5 + 0.5) * H();
    mlabel.style.left = Math.max(8, Math.min(W() - 190, x - 90)) + "px";
    mlabel.style.top = Math.max(70, Math.min(H() - 60, y - 52)) + "px";
  }

  // ---------- selección y ficha ----------
  const hint = document.createElement("div");
  hint.className = "v3d-hint"; hint.dataset.es = "Haz clic en una pieza para ver su ficha";
  hint.textContent = T(hint.dataset.es);
  root.appendChild(hint);
  const panel = document.createElement("aside");
  panel.className = "v3d-panel"; panel.hidden = true;
  root.appendChild(panel);
  const yn = v => v === null || v === undefined ? "—" : (v ? T("Sí") : T("No"));
  const fmt = (n, u) => n > 0 ? String(n).replace(".", ",") + " " + u : null;

  function renderPanel() {
    if (!current) { panel.hidden = true; return; }
    const eid = current.eid, rec = current.rec, name = current.name;
    let h = "<button type=\"button\" class=\"v3d-x\" aria-label=\"" + esc(T("Cerrar")) + "\">✕</button>";
    if (rec) {
      const t = info.types[rec[0]];
      h += "<h4>" + esc(t.type) + "</h4><div class=\"v3d-sub\">" + esc(T(t.cat)) + (t.fam ? " · " + esc(t.fam) : "") + "</div><dl>";
      const r2 = (k, v) => { if (v) h += "<dt>" + esc(T(k)) + "</dt><dd>" + v + "</dd>"; };
      r2(t.mat.length > 1 ? "Materiales" : "Material", t.mat.length ? esc(t.mat.join(", ")) : null);
      r2("Estructural", esc(yn(rec[5])));
      r2("Exterior", esc(yn(rec[6])));
      r2("Nivel", rec[1] ? esc(rec[1]) : null);
      r2("Área", fmt(rec[2], "m²") && esc(fmt(rec[2], "m²")));
      r2("Volumen", fmt(rec[3], "m³") && esc(fmt(rec[3], "m³")));
      r2("Longitud", fmt(rec[4], "m") && esc(fmt(rec[4], "m")));
      if (t.fi) r2("Ficha de fabricante", esc(t.fi) + (t.url ? " <a href=\"" + esc(t.url) + "\" target=\"_blank\" rel=\"noopener\">↗</a>" : ""));
      h += "</dl><div class=\"v3d-id\">" + esc(T("ID de Revit")) + ": " + esc(current.tag) + "</div>";
    } else {
      h += "<h4>" + esc(name || ("#" + eid)) + "</h4><div class=\"v3d-sub\">" + esc(T("Sin ficha en el modelo")) + "</div>";
    }
    panel.innerHTML = h;
    panel.hidden = false;
    panel.querySelector(".v3d-x").addEventListener("click", () => select(null));
  }
  function select(eid) {
    if (eid === null) { current = null; highlight(null); renderPanel(); return; }
    const d = getData(eid);
    current = { eid, tag: d.tag, name: d.name, rec: d.rec };
    highlight(eid);
    renderPanel();
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  renderer.domElement.addEventListener("pointerup", e => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
    down = null;
    if (moved > 6 || dt > 600 || e.button !== 0) return;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    let hits = raycaster.intersectObjects(meshes.filter(m => m.visible), false);
    if (clip.on) hits = hits.filter(h => clipPlane.distanceToPoint(h.point) >= 0);
    if (isolate) { const sel = hits.filter(h => isolate.has(h.object.geometry.getAttribute("eid").getX(h.face.a))); if (sel.length) hits = sel; }
    const hit = hits[0];
    if (measureOn) { if (hit) addMeasurePoint(hit.point); return; }
    if (!hit) { select(null); return; }
    select(hit.object.geometry.getAttribute("eid").getX(hit.face.a));
  });
  addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (measureOn) setMeasure(false);
    else if (popName) openPop(popName);
  });

  document.addEventListener("pm-lang", () => {
    Object.values(btns).forEach(b => { b.textContent = T(b.dataset.es); });
    relabel(root);
    hint.textContent = T(hint.dataset.es);
    mhint.textContent = T(mhint.dataset.es);
    renderPanel(); renderMeasure(); cubeLabels();
    if (isolate) runSearch();
  });

  const resize = () => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); };
  addEventListener("resize", resize);
  let on = true;
  new IntersectionObserver(es => { on = es[0].isIntersecting; }).observe(host);
  updateVisibility();
  relabel(root);
  (function loop() {
    requestAnimationFrame(loop);
    if (!on) return;
    if (anim) {
      const k = Math.min(1, (performance.now() - anim.t0) / anim.dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      camera.position.lerpVectors(anim.from, anim.to, e);
      controls.target.lerpVectors(anim.tFrom, anim.tTo, e);
      if (k >= 1) anim = null;
    }
    if (explodeK !== explodeTarget) {
      const kk = Math.min(1, (performance.now() - explodeT0) / 1100); // animación por tiempo, no por cuadros
      explodeK = kk >= 1 ? explodeTarget : explodeFrom + (explodeTarget - explodeFrom) * kk;
      const e = explodeK * explodeK * (3 - 2 * explodeK);
      meshes.forEach(m => { m.position.y = (EXPLODE[m.userData.cat] || 0) * e; });
    }
    overlays.forEach(o => { o.visible = o.userData.src.visible; o.position.copy(o.userData.src.position); });
    hl.forEach(o => { o.visible = o.userData.src.visible; o.position.copy(o.userData.src.position); });
    caps.forEach((tw, src) => { tw.visible = src.visible && !(isolate && meshes.includes(src)); tw.position.copy(src.position); });
    if (clip.on) { clipPlane.coplanarPoint(capPlane.position); capPlane.lookAt(capPlane.position.x + clipPlane.normal.x, capPlane.position.y + clipPlane.normal.y, capPlane.position.z + clipPlane.normal.z); }
    controls.update();
    renderer.render(scene, camera);
    renderCube();
    placeMeasureLabel();
  })();
  onStatus("");
}
