// Visor 3D del modelo IFC4x3 (web-ifc + three.js, carga bajo demanda)
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import * as WebIFC from "https://cdn.jsdelivr.net/npm/web-ifc@0.0.66/web-ifc-api.js";

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
  api.SetWasmPath("https://cdn.jsdelivr.net/npm/web-ifc@0.0.66/", true);
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

  // Descarta geometrías atípicas muy alejadas del conjunto (instancias mal ubicadas por el exportador)
  const ctr = all.map(o => o.box.getCenter(new THREE.Vector3()));
  const q = (axis, p) => { const a = ctr.map(v => v[axis]).sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
  const lo = ["x", "y", "z"].map(a => q(a, 0.05)), hi = ["x", "y", "z"].map(a => q(a, 0.95));
  const pad = ["x", "y", "z"].map((a, i) => Math.max(1.5, (hi[i] - lo[i]) * 0.25));
  const groups = new Map();
  const fit = new THREE.Box3();
  all.forEach((o, i) => {
    const c = ctr[i];
    const ok = ["x", "y", "z"].every((a, k) => c[a] >= lo[k] - pad[k] && c[a] <= hi[k] + pad[k]);
    if (!ok) { o.g.dispose(); return; }
    if (Math.max(...o.box.getSize(new THREE.Vector3()).toArray()) < 15) fit.union(o.box);
    const key = [o.c.x, o.c.y, o.c.z, o.c.w].map(v => v.toFixed(2)).join(",");
    if (!groups.has(key)) groups.set(key, { c: o.c, list: [] });
    groups.get(key).list.push(o.g);
  });

  const model = new THREE.Group();
  for (const { c, list } of groups.values()) {
    const merged = mergeGeometries(list, false);
    list.forEach(l => l.dispose());
    if (!merged) continue;
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(c.x, c.y, c.z), roughness: 0.85, metalness: 0.0,
      transparent: c.w < 0.99, opacity: c.w, side: THREE.DoubleSide
    });
    model.add(new THREE.Mesh(merged, mat));
  }
  scene.add(model);

  const box = fit.isEmpty() ? new THREE.Box3().setFromObject(model) : fit;
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const R = Math.max(size.x, size.y, size.z);
  camera.near = R / 1000; camera.far = R * 100; camera.updateProjectionMatrix();
  camera.position.copy(center).add(new THREE.Vector3(R * 1.25, R * 0.95, R * 1.25));
  controls.target.copy(center);
  controls.update();

  const resize = () => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); };
  addEventListener("resize", resize);
  let on = true;
  new IntersectionObserver(es => { on = es[0].isIntersecting; }).observe(host);
  (function loop() { requestAnimationFrame(loop); if (!on) return; controls.update(); renderer.render(scene, camera); })();
  onStatus("");
}
