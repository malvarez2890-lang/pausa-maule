// Visor 3D del modelo IFC4x3 (web-ifc + three.js, carga bajo demanda)
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as WebIFC from "./vendor/web-ifc-api.js";

const T = (k) => (window.PM_t ? window.PM_t(k) : k);

export async function startViewer(host, url, onStatus) {
  const W = () => host.clientWidth, H = () => host.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(W(), H());
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf2f2f2);
  const camera = new THREE.PerspectiveCamera(40, W() / H(), 0.01, 100000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-1, 2, 1.2);
  scene.add(sun);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  onStatus("Iniciando motor IFC…");
  const api = new WebIFC.IfcAPI();
  api.SetWasmPath(new URL("./vendor/", import.meta.url).href, true);
  await api.Init();

  onStatus("Descargando modelo…");
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("No se pudo descargar el IFC (" + resp.status + ")");
  const data = new Uint8Array(await resp.arrayBuffer());

  onStatus("Leyendo geometría…");
  await new Promise(r => setTimeout(r, 30));
  const modelID = api.OpenModel(data);
  const all = [];
  api.StreamAllMeshes(modelID, mesh => {
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
        ng.computeBoundingBox();
        all.push({ c: pg.color, g: ng, box: ng.boundingBox.clone() });
      }
      g.delete();
    }
  });
  api.CloseModel(modelID);

  // Descarta geometrías atípicas muy alejadas del conjunto y separa terreno / edificio
  const ctr = all.map(o => o.box.getCenter(new THREE.Vector3()));
  const q = (axis, p) => { const a = ctr.map(v => v[axis]).sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
  const lo = ["x", "y", "z"].map(a => q(a, 0.05)), hi = ["x", "y", "z"].map(a => q(a, 0.95));
  const pad = ["x", "y", "z"].map((a, i) => Math.max(1.5, (hi[i] - lo[i]) * 0.25));
  const fit = new THREE.Box3();
  const parts = []; // { c, g, roof }
  all.forEach((o, i) => {
    const c = ctr[i];
    const ok = ["x", "y", "z"].every((a, k) => c[a] >= lo[k] - pad[k] && c[a] <= hi[k] + pad[k]);
    const size = o.box.getSize(new THREE.Vector3());
    if (!ok || Math.max(size.x, size.y, size.z) > 15) { o.g.dispose(); return; } // terreno u outliers
    fit.union(o.box);
    parts.push({ c: o.c, g: o.g, roofY: o.box.min.y });
  });

  // Cubierta = todo lo que parte sobre la altura de los muros (vigas + plancha)
  const topY = fit.max.y;                       // tope de la plancha de cubierta
  const roofLevel = topY - 0.31;                // vigas y plancha parten sobre este nivel
  const model = new THREE.Group();
  const layers = { body: [], roof: [] };
  for (const layer of ["body", "roof"]) {
    const groups = new Map();
    parts.filter(p => (p.roofY >= roofLevel) === (layer === "roof")).forEach(p => {
      const key = [p.c.x, p.c.y, p.c.z, p.c.w].map(v => v.toFixed(2)).join(",");
      if (!groups.has(key)) groups.set(key, { c: p.c, list: [] });
      groups.get(key).list.push(p.g);
    });
    for (const { c, list } of groups.values()) {
      const merged = mergeGeometries(list, false);
      list.forEach(l => l.dispose());
      if (!merged) continue;
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(c.x, c.y, c.z), roughness: 0.85, metalness: 0.0,
        transparent: c.w < 0.99, opacity: c.w, side: THREE.DoubleSide
      });
      const m = new THREE.Mesh(merged, mat);
      layers[layer].push(m);
      model.add(m);
    }
  }
  scene.add(model);

  const box = fit.isEmpty() ? new THREE.Box3().setFromObject(model) : fit;
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const R = Math.max(size.x, size.y, size.z);
  camera.near = R / 1000; camera.far = R * 100; camera.updateProjectionMatrix();

  // Retícula de referencia en lugar del terreno
  const grid = new THREE.GridHelper(Math.ceil(R * 3), Math.ceil(R * 3), 0xc4c4c4, 0xdcdcdc);
  grid.position.set(center.x, box.min.y - 0.01, center.z);
  scene.add(grid);

  // ---- Vistas ----
  const views = {
    iso:   { es: "Isométrica", dir: [1.25, 0.95, 1.25], d: 1 },
    plan:  { es: "Planta",     dir: [0, 2.2, 0.0001], d: 1 },
    front: { es: "Frente",     dir: [0, 0.35, 1.9], d: 1 },
    side:  { es: "Lateral",    dir: [1.9, 0.35, 0], d: 1 }
  };
  let anim = null;
  function goTo(key, instant) {
    const v = views[key];
    const to = new THREE.Vector3(center.x + v.dir[0] * R, center.y + v.dir[1] * R, center.z + v.dir[2] * R);
    if (instant) { camera.position.copy(to); controls.target.copy(center); controls.update(); return; }
    anim = { from: camera.position.clone(), to, t0: performance.now(), dur: 650 };
  }
  goTo("iso", true);

  // ---- Barra de herramientas ----
  const ui = document.createElement("div");
  ui.className = "v3d-ui";
  const btns = {};
  const mk = (id, label, onClick) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "v3d-b"; b.dataset.es = label;
    b.textContent = T(label);
    b.addEventListener("click", onClick);
    ui.appendChild(b); btns[id] = b; return b;
  };
  const setActive = k => Object.keys(views).forEach(id => btns[id].classList.toggle("on", id === k));
  Object.keys(views).forEach(k => mk(k, views[k].es, () => { goTo(k); setActive(k); }));
  setActive("iso");
  let roofOn = true;
  const roofBtn = mk("roof", "Ocultar cubierta", () => {
    roofOn = !roofOn;
    layers.roof.forEach(m => { m.visible = roofOn; });
    roofBtn.dataset.es = roofOn ? "Ocultar cubierta" : "Mostrar cubierta";
    roofBtn.textContent = T(roofBtn.dataset.es);
    roofBtn.classList.toggle("on", !roofOn);
  });
  roofBtn.classList.add("sep");
  host.parentElement.appendChild(ui);
  document.addEventListener("pm-lang", () => { Object.values(btns).forEach(b => { b.textContent = T(b.dataset.es); }); });
  controls.addEventListener("start", () => { anim = null; Object.keys(views).forEach(id => btns[id].classList.remove("on")); });

  const resize = () => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); };
  addEventListener("resize", resize);
  let on = true;
  new IntersectionObserver(es => { on = es[0].isIntersecting; }).observe(host);
  (function loop() {
    requestAnimationFrame(loop);
    if (!on) return;
    if (anim) {
      const k = Math.min(1, (performance.now() - anim.t0) / anim.dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      camera.position.lerpVectors(anim.from, anim.to, e);
      if (k >= 1) anim = null;
    }
    controls.update();
    renderer.render(scene, camera);
  })();
  onStatus("");
}
