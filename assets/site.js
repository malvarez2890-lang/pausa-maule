(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------- Idioma ES / EN ---------- */
  var EN = {
    "Talca / Región del Maule — Chile": "Talca / Maule Region — Chile",
    "Entregable Hito 01-02": "Deliverable Milestone 01-02",
    "Partido": "Concept", "Referentes": "References", "Imágenes": "Images", "Láminas": "Sheets",
    "Materialidad": "Materials", "Documentos": "Documents", "Proveedores": "Suppliers", "Modelo": "Model",
    "Habitáculo para ciclistas · Workshop BIM + IA · Método TBC": "Shelter for cyclists · BIM + AI Workshop · TBC Method",
    "Exterior — el habitáculo entre el valle y cordillera de la costa": "Exterior — the shelter between the valley and the coastal range",
    "Ver imágenes ↗": "See images ↗",
    "Habitáculo para ciclistas": "Shelter for cyclists",
    "Un punto de descanso en el corredor vitivinícola de Talca.": "A resting point on the Talca wine route.",
    "Pausa Maule es un punto de descanso para ciclistas de ruta en el corredor vitivinícola de Talca, Región del Maule. Un vacío central bajo una retícula de nueve cuadrantes ordena masa, umbral y paisaje.": "Pausa Maule is a resting point for road cyclists on the Talca wine route, Maule Region. A central void under a grid of nine quadrants organizes mass, threshold and landscape.",
    "Autor": "Author", "Redes": "Social", "Curso": "Course", "Proyecto": "Project", "Ubicación": "Location", "Programa": "Program",
    "Workshop BIM + IA · creado por": "BIM + AI Workshop · created by",
    "Habitáculo Pausa Maule": "Pausa Maule Shelter",
    "Talca, Región del Maule": "Talca, Maule Region",
    "9 recintos, 79.45 m² totales": "9 rooms, 79.45 m² total",
    "Retícula nine-square": "Nine-square grid", "Recintos modelados": "Modeled rooms", "m² área total": "m² total area", "Proveedores verificados": "Verified suppliers",
    "El partido": "The concept", "concepto sobre la grilla 3×3": "concept on the 3×3 grid",
    "El partido organiza el programa sobre una retícula de nueve cuadrantes: cuatro llenos estructurales (madera + quincha) sostienen un vacío central, el patio, donde crece un árbol a través de la cubierta.": "The concept organizes the program on a grid of nine quadrants: four structural solids (timber + quincha) hold a central void, the courtyard, where a tree grows through the roof.",
    "Acceso principal": "Main entrance", "resuelto en el cuadrante superior izquierdo, sin cruzar muros cortina.": "placed in the upper-left quadrant, without crossing curtain walls.",
    "Los": "The", "muros cortina": "curtain walls",
    "perimetrales quedaron libres de accesos tras la corrección del partido: los recorridos pasan entre los llenos, no a través de los paños vidriados.": "on the perimeter are free of entrances after the concept revision: circulation runs between the solids, not through the glazed panels.",
    "El": "The", "patio central": "central courtyard", "es el umbral entre paisaje y recinto — ahí ocurre la pausa.": "is the threshold between landscape and room — that is where the pause happens.",
    "Lámina del Partido (PDF) ↗": "Concept sheet (PDF) ↗", "llenos, vacíos, accesos y volumen principal": "solids, voids, entrances and main volume",
    "5 precedentes de Aires Mateus": "5 precedents by Aires Mateus",
    "Masa": "Mass", "Vacío": "Void", "Umbral": "Threshold", "Paisaje": "Landscape", "Recorrido": "Path",
    "Referentes Aires Mateus — contraste nine-square · 5 precedentes contrastados contra el partido de Pausa Maule · selección de 4 láminas, PDF completo de 9 páginas": "Aires Mateus references — nine-square comparison · 5 precedents compared against the Pausa Maule concept · selection of 4 sheets, full 9-page PDF",
    "Abrir PDF completo ↗": "Open full PDF ↗",
    "Imágenes del proyecto": "Project images", "renders e isométricas": "renders and isometrics",
    "Vista aérea — el patio y el árbol atravesando la cubierta": "Aerial view — the courtyard and the tree crossing the roof",
    "Interior — bebederos y descanso": "Interior — drinking fountains and rest",
    "Interior — umbral hacia el valle": "Interior — threshold toward the valley",
    "Vistas isométricas": "Isometric views",
    "Volumen, cubierta y patio": "Volume, roof and courtyard",
    "Sin cubierta — bebederos, baño, apoyo y bicicletas": "Roof removed — fountains, restroom, support and bikes",
    "Isométrica explotada — capas constructivas: cubierta, armazón, paramentos y mobiliario": "Exploded isometric — construction layers: roof, framing, walls and furniture",
    "Exterior — el habitáculo entre viñedos": "Exterior — the shelter among vineyards",
    "planimetría técnica": "technical drawings",
    "Lámina A101 — Planimetría general · planta, 4 elevaciones, 3 cortes e isométricas · 1:50": "Sheet A101 — General drawings · plan, 4 elevations, 3 sections and isometrics · 1:50",
    "Abrir PDF ↗": "Open PDF ↗",
    "verificada contra fichas de fabricante": "checked against manufacturer data sheets",
    "Sistema quincha liviana húmeda — Corporación Protierra Chile, red MINVU/DITEC.": "Light wet quincha system (cane and earth) — Corporación Protierra Chile, MINVU/DITEC network.",
    "Ver elemento ↗": "See detail ↗",
    "Pino Radiata": "Radiata Pine",
    "Pilares glulam Hilam MLE, armazón dimensionado y montantes Arauco. Los paneles del muro cortina quedan vacíos (celosía).": "Hilam MLE glulam columns, dimensioned timber framing and Arauco mullions. Curtain wall panels are left empty (lattice).",
    "Plancha ondulada sobre estructura de madera — Cubiertas Nacionales CN-1020.": "Corrugated sheet over a timber structure — Cubiertas Nacionales CN-1020.",
    "Hormigón": "Concrete",
    "Radier con fibra Melón + endurecedor superficial Sikafloor-3 QuartzTop. El mismo hormigón armado forma las 16 zapatas aisladas bajo los pilares.": "Fiber-reinforced Melón slab + Sikafloor-3 QuartzTop surface hardener. The same reinforced concrete forms the 16 isolated footings under the columns.",
    "Documentos técnicos": "Technical documents", "reglas, PEB, NDI y parámetros": "rules, BEP, LOIN and parameters",
    "Reglas de Trabajo BIM": "BIM Working Rules",
    "Resumen del Estándar PlanBIM Chile aplicado a Pausa Maule · Paso 01": "Summary of the PlanBIM Chile Standard applied to Pausa Maule · Step 01",
    "Especificación Técnica": "Technical Specification",
    "Materiales, fichas de fabricante, categorías cerradas": "Materials, manufacturer data sheets, closed categories",
    "PEB Preliminar": "Preliminary BEP", "Plan de Ejecución BIM — etapa preliminar": "BIM Execution Plan — preliminary stage",
    "PEB Completado": "Completed BEP", "9 recintos, nombre/número/nivel/área/perímetro": "9 rooms, name/number/level/area/perimeter",
    "Tabla NDI": "LOIN Table", "Niveles de Desarrollo de la Información": "Levels of Information Need",
    "Parámetros Compartidos": "Shared Parameters", "Grupo NDI2 — parámetros compartidos del proyecto": "NDI2 group — project shared parameters",
    "12 proveedores verificados": "12 verified suppliers", "Fichas de Proveedores": "Supplier Data Sheets",
    "12 proveedores verificados · contacto, sitio web, ficha técnica": "12 verified suppliers · contact, website, data sheet",
    "Elemento": "Element", "Empresa": "Company", "Producto": "Product", "Sitio web": "Website",
    "Muro / Quincha": "Wall / Quincha", "Sistema Quincha Liviana Húmeda": "Light Wet Quincha System",
    "Cubierta": "Roof", "Panel Ondulado CN-1020": "CN-1020 Corrugated Panel",
    "Radier y zapatas": "Slab and footings", "Hormigón con Fibra": "Fiber-Reinforced Concrete",
    "Radier pulido": "Polished slab",
    "Pilar estructural": "Structural column", "Madera Laminada Encolada MLE 20c": "Glued Laminated Timber MLE 20c",
    "Armazón": "Framing", "Construcción Premium MSD": "Premium MSD Construction",
    "Muro cortina — montante": "Curtain wall — mullion", "Pino Radiata Cepillado": "Planed Radiata Pine",
    "Muro cortina — panel": "Curtain wall — panel",
    "Panel vacío (celosía) — ficha de referencia: MSD Revestimiento Machihembrado": "Empty panel (lattice) — reference sheet: MSD Tongue-and-Groove Cladding",
    "Puerta": "Door", "Puerta Pino Radiata Italia 80×210": "Italia Radiata Pine Door 80×210",
    "Herrajes": "Hardware", "Häfele (vía El Carpintero)": "Häfele (via El Carpintero)", "Bisagras y cerraduras": "Hinges and locks",
    "Sanitarios": "Sanitary ware", "New Valencia a Muro / Lavamanos Ciro": "New Valencia wall-hung / Ciro washbasin",
    "Abastecimiento local": "Local supply", "Distribución general": "General distribution",
    "Descargar documentos e imágenes": "Download documents and images",
    "Referentes, proveedores, documentos técnicos, láminas e imágenes — no incluye el modelo Revit ni el IFC (ver punto 08).": "References, suppliers, technical documents, sheets and images — does not include the Revit model or the IFC (see section 08).",
    "↓ Descargar todo (.zip, 35 MB)": "↓ Download all (.zip, 35 MB)",
    "Modelo Revit": "Revit model",
    "Elementos totales": "Total elements", "Tipos": "Types", "Familias": "Families", "Categorías": "Categories", "Vistas": "Views",
    "Niveles principales + subniveles": "Main levels + sublevels",
    "Modelo BIM del habitáculo Pausa Maule · 214 MB": "BIM model of the Pausa Maule shelter · 214 MB",
    "Descargar ↓": "Download ↓",
    "Modelo BIM del habitáculo Pausa Maule · 214 MB · descarga con aprobación del autor": "BIM model of the Pausa Maule shelter · 214 MB · download requires author approval",
    "Solicitar acceso ↗": "Request access ↗",
    "Export IFC4X3_ADD2 · MVD CoordinationView · 4,5 MB": "IFC4X3_ADD2 export · MVD CoordinationView · 4.5 MB",
    "· Workshop BIM + IA por": "· BIM + AI Workshop by",
    "· Pausa Maule — Habitáculo ciclista": "· Pausa Maule — Cyclist shelter",
    "Entregable Hito 01-02 ·": "Deliverable Milestone 01-02 ·",
    "Visor 3D": "3D viewer", "Cantidades del modelo": "Model quantities", "Archivos del modelo": "Model files",
    "Cargar visor 3D": "Load 3D viewer",
    "Se descarga el IFC4x3 (4,5 MB) y se muestra en el navegador. Arrastra para girar, usa la rueda para acercar y mantén presionada la rueda (botón central) para desplazar la vista, como en Revit.": "Downloads the IFC4x3 file (4.5 MB) and shows it in the browser. Drag to orbit, use the wheel to zoom and hold the wheel (middle button) to pan, as in Revit.",
    "Cantidades obtenidas del modelo Revit.": "Quantities taken from the Revit model.",
    "Categoría": "Category", "Tipo": "Type", "Cant.": "Qty", "Medida": "Measure",
    "Volver arriba": "Back to top", "Cerrar": "Close", "Anterior": "Previous", "Siguiente": "Next",
    "Abrir original ↗": "Open original ↗",
    "Cargando…": "Loading…",
    "Cimentación estructural": "Structural foundation", "Suelos": "Floors", "Cubiertas": "Roofs", "Armazón estructural": "Structural framing", "Capas": "Layers", "Color": "Color", "Corte": "Cut", "Medir": "Measure", "Explotar": "Explode", "Juntar": "Assemble", "Mostrar todo": "Show all", "Original": "Original", "Estructural / no estructural": "Structural / non-structural", "Exterior / interior": "Exterior / interior", "Horizontal (altura)": "Horizontal (height)", "Vertical (ancho)": "Vertical (width)", "Vertical (fondo)": "Vertical (depth)", "Invertir": "Flip", "Quitar corte": "Remove cut", "Buscar tipo o categoría…": "Search type or category…", "piezas": "parts", "Haz clic en dos puntos del modelo para medir": "Click two points on the model to measure", "Distancia": "Distance", "horizontal": "horizontal", "vertical": "vertical", "Sin dato": "No data", "No estructural": "Non-structural", "Interior": "Interior", "Otros": "Others", "Derecha": "Right", "Izquierda": "Left", "Superior": "Top", "Inferior": "Bottom", "Frontal": "Front", "Posterior": "Back", "Realista": "Realistic", "Original (IFC)": "Original (IFC)", "Colores de materiales": "Material colors", "Restaurar colores": "Reset colors", "Maqueta": "Model", "Recintos": "Rooms", "Baño 1": "Restroom 1", "Baño 2": "Restroom 2", "Zona apoyo": "Support zone", "Zona de descanso 1": "Rest zone 1", "Zona de descanso 2": "Rest zone 2", "Estacionamiento bicicletas": "Bicycle parking", "Bebederos": "Drinking fountains", "Patio": "Courtyard", "Pasillo": "Corridor",
    "Ajustar": "Fit", "Pantalla completa": "Fullscreen", "Arrastra para mover · haz clic y usa la rueda para acercar · doble clic para ampliar": "Drag to move · click and use the wheel to zoom · double-click to enlarge",
    "Haz clic en una fila para verla en el visor 3D.": "Click a row to see it in the 3D viewer.", "Descargar Excel (.xlsx) ↓": "Download Excel (.xlsx) ↓", "Descargar CSV ↓": "Download CSV ↓",
    "Cambiar entre modo claro y oscuro": "Switch between light and dark mode", "Haz clic en una pieza para ver su ficha": "Click a part to see its data sheet", "Sin ficha en el modelo": "No data sheet in the model", "Familia": "Family", "Material": "Material", "Materiales": "Materials", "Estructural": "Structural", "Exterior": "Exterior", "Nivel": "Level", "Área": "Area", "Volumen": "Volume", "Longitud": "Length", "Ficha de fabricante": "Manufacturer data sheet", "ID de Revit": "Revit ID", "Sí": "Yes", "No": "No",
    "Desliza la tabla para ver todas las columnas →": "Swipe the table to see all columns →",
    "Isométrica": "Isometric", "Planta": "Plan", "Frente": "Front", "Lateral": "Side", "Ocultar cubierta": "Hide roof", "Mostrar cubierta": "Show roof",
    "Tu navegador tiene WebGL desactivado o no disponible, por eso no se puede mostrar el visor 3D. Puedes descargar el IFC y abrirlo en tu programa BIM.": "Your browser has WebGL disabled or unavailable, so the 3D viewer cannot be shown. You can download the IFC and open it in your BIM software.",
    "Muros": "Walls", "Muros cortina": "Curtain walls", "Montantes de muro cortina": "Curtain wall mullions",
    "Paneles de muro cortina": "Curtain wall panels", "Puertas": "Doors", "Pilares estructurales": "Structural columns",
    "Armazón principal": "Main framing", "Armazón secundario": "Secondary framing", "Zapatas aisladas": "Isolated footings",
    "Radier estructural": "Structural slab", "Recintos": "Rooms", "Empty (celosía)": "Empty (lattice)", "9 recintos": "9 rooms",
    "Iniciando motor IFC…": "Starting IFC engine…", "Descargando modelo…": "Downloading model…", "Leyendo geometría…": "Reading geometry…",
    "No se pudo cargar el visor 3D. Puedes descargar el IFC y abrirlo en tu programa BIM.": "The 3D viewer could not be loaded. You can download the IFC and open it in your BIM software."
  };
  var CUR = "es", nodes = [], attrs = [];
  function collect() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode && n.parentNode.nodeName;
        if (p === "SCRIPT" || p === "STYLE" || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = w.nextNode())) nodes.push({ n: n, es: n.nodeValue });
    $$("[alt],[aria-label],[title]").forEach(function (e) {
      ["alt", "aria-label", "title"].forEach(function (a) {
        if (e.hasAttribute(a)) attrs.push({ e: e, a: a, es: e.getAttribute(a) });
      });
    });
  }
  function tr(s, lang) {
    if (lang === "es") return s;
    var m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), key = m[2].replace(/\s+/g, " ");
    return EN[key] ? m[1] + EN[key] + m[3] : s;
  }
  var titleES = document.title;
  function setLang(l) {
    CUR = l;
    nodes.forEach(function (o) { o.n.nodeValue = tr(o.es, l); });
    attrs.forEach(function (o) { o.e.setAttribute(o.a, tr(o.es, l)); });
    document.documentElement.lang = l;
    document.dispatchEvent(new CustomEvent("pm-lang"));
    document.title = l === "en" ? "Pausa Maule — Deliverable Milestone 01-02" : titleES;
    $$("[data-l]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-l") === l); });
    store.set("pm-lang", l);
  }
  window.PM_t = function (k) { return CUR === "en" && EN[k] ? EN[k] : k; };

  /* ---------- Lightbox ---------- */
  var items = [], idx = 0, lb;
  function buildLB() {
    lb = document.createElement("div");
    lb.id = "lb";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.innerHTML = "<button class=\"lbx\" data-a=\"close\" aria-label=\"Cerrar\">✕</button>" +
      "<button class=\"lbn lbp\" data-a=\"prev\" aria-label=\"Anterior\">←</button>" +
      "<button class=\"lbn lbq\" data-a=\"next\" aria-label=\"Siguiente\">→</button>" +
      "<figure><img alt=\"\"><figcaption><span class=\"lbc\"></span><span class=\"lbo\"></span></figcaption></figure>";
    document.body.appendChild(lb);
    lb.addEventListener("click", function (e) {
      var a = e.target.getAttribute && e.target.getAttribute("data-a");
      if (a === "close" || e.target === lb || e.target.tagName === "FIGURE") close();
      else if (a === "prev") go(-1);
      else if (a === "next") go(1);
    });
    var x0 = null;
    lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      x0 = null;
    });
  }
  function show() {
    var it = items[idx], img = $("img", lb);
    img.src = it.src;
    img.alt = it.cap;
    $(".lbc", lb).textContent = String(idx + 1).padStart(2, "0") + " / " + String(items.length).padStart(2, "0") + "  ·  " + it.cap;
    $(".lbo", lb).innerHTML = "<a href=\"" + it.full + "\" target=\"_blank\" rel=\"noopener\">" + PM_t("Abrir original ↗") + "</a>";
    [idx - 1, idx + 1].forEach(function (j) { if (items[j]) { var p = new Image(); p.src = items[j].src; } });
  }
  function open(i) {
    if (!lb) buildLB();
    idx = i; show();
    lb.classList.add("on");
    document.documentElement.style.overflow = "hidden";
  }
  function close() { lb.classList.remove("on"); document.documentElement.style.overflow = ""; }
  function go(d) { idx = (idx + d + items.length) % items.length; show(); }
  function capOf(a) {
    var fc = $("figcaption", a), h3 = $("h3", a);
    return (fc ? fc.textContent : h3 ? h3.textContent : "").trim();
  }
  function initLB() {
    $$("a[data-lb]").forEach(function (a) {
      items.push({ src: a.getAttribute("data-lb"), full: a.getAttribute("data-full") || a.getAttribute("href"), cap: capOf(a), el: a });
      a.addEventListener("click", function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        var k = items.findIndex(function (x) { return x.el === a; });
        items[k].cap = capOf(a);
        open(k);
      });
    });
    addEventListener("keydown", function (e) {
      if (!lb || !lb.classList.contains("on")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    });
  }

  /* ---------- Barra fija, sección activa, volver arriba ---------- */
  function initBar() {
    var bar = $("#bar"), up = $("#up"), secs = $$("section.sec[id]"), links = $$("#bar nav a");
    function onScroll() {
      var y = scrollY, vh = innerHeight, cur = null;
      bar.classList.toggle("show", y > vh * 0.55);
      up.classList.toggle("show", y > vh * 1.2);
      secs.forEach(function (s) { if (s.getBoundingClientRect().top <= vh * 0.3) cur = s.id; });
      links.forEach(function (a) { a.classList.toggle("act", a.getAttribute("href") === "#" + cur); });
      var act = $("#bar nav a.act"), nv = $("#bar nav");
      if (act && bar.classList.contains("show") && nv.scrollWidth > nv.clientWidth) {
        var l = act.offsetLeft - 20;
        if (Math.abs(nv.scrollLeft - l) > 40) nv.scrollTo({ left: l, behavior: "smooth" });
      }
    }
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    up.addEventListener("click", function () { scrollTo({ top: 0, behavior: "smooth" }); });
  }

  /* ---------- Visor IFC (delegado: funciona aunque falle otra inicializacion) ---------- */
  var viewerStarted = false;
  function hasWebGL() {
    try { var c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; }
  }
  function loadViewer(btn) {
    if (viewerStarted) return;
    var host = $("#v3d"), st = $("#v3d-status");
    var show = function (t) { st.textContent = t ? PM_t(t) : ""; st.style.display = t ? "block" : "none"; };
    var fail = function (msg, detail) {
      host.classList.add("run"); btn.style.display = "none";
      st.style.display = "block"; st.textContent = PM_t(msg);
      if (detail) { var d = document.createElement("small"); d.style.cssText = "display:block;margin-top:10px;font-size:13px;opacity:.7"; d.textContent = detail; st.appendChild(d); }
      viewerStarted = false;
    };
    viewerStarted = true;
    if (!hasWebGL()) { fail("Tu navegador tiene WebGL desactivado o no disponible, por eso no se puede mostrar el visor 3D. Puedes descargar el IFC y abrirlo en tu programa BIM."); return; }
    btn.style.display = "none";
    host.classList.add("run");
    show("Cargando…");
    try { host.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
    var slow = setTimeout(function () { if (viewerStarted && st.style.display === "block" && !$("#v3d-canvas canvas")) st.setAttribute("data-slow", "1"); }, 15000);
    try {
      import("./ifc-viewer.js?v=33").then(function (m) {
        return m.startViewer($("#v3d-canvas"), "05_Modelo_IFC/HAB_ARQ_MODELO_R01_IFC4x3.ifc", show);
      }).catch(function (err) {
        console.error(err); clearTimeout(slow);
        fail("No se pudo cargar el visor 3D. Puedes descargar el IFC y abrirlo en tu programa BIM.", String(err && err.message ? err.message : err));
      });
    } catch (err) {
      fail("No se pudo cargar el visor 3D. Puedes descargar el IFC y abrirlo en tu programa BIM.", String(err && err.message ? err.message : err));
    }
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("#v3d-load") : null;
    if (b) { e.preventDefault(); loadViewer(b); }
  });

  /* ---------- Zoom de la lámina ---------- */
  function initZoom() {
    $$(".zoomer").forEach(function (z) {
      var stage = $(".zoom-stage", z), img = $("img", stage), hi = z.getAttribute("data-hi"), hiLoaded = false;
      var asp = 4769 / 3368, s = 1, x = 0, y = 0, bw = 0, bh = 0, act = false;
      var pts = {}, last = null, pinch = 0;
      function base() {
        var cw = z.clientWidth, ch = z.clientHeight;
        bw = Math.min(cw, ch * asp); bh = bw / asp;
        stage.style.width = bw + "px"; stage.style.height = bh + "px";
      }
      function clamp() {
        var cw = z.clientWidth, ch = z.clientHeight, w = bw * s, h = bh * s;
        x = w <= cw ? (cw - w) / 2 : Math.min(0, Math.max(cw - w, x));
        y = h <= ch ? (ch - h) / 2 : Math.min(0, Math.max(ch - h, y));
      }
      function apply() {
        clamp();
        stage.style.transform = "translate(" + x + "px," + y + "px) scale(" + s + ")";
        if (s > 1.35 && !hiLoaded) { hiLoaded = true; var im = new Image(); im.onload = function () { img.src = hi; }; im.src = hi; }
      }
      function fit() { base(); s = 1; x = (z.clientWidth - bw) / 2; y = (z.clientHeight - bh) / 2; apply(); }
      function zoomAt(f, cx, cy) {
        var ns = Math.max(1, Math.min(8, s * f)); f = ns / s;
        x = cx - (cx - x) * f; y = cy - (cy - y) * f; s = ns; apply();
      }
      var rect = function () { return z.getBoundingClientRect(); };
      z.addEventListener("wheel", function (e) {
        if (!act && !e.ctrlKey) return;
        e.preventDefault();
        var r = rect(); zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
      }, { passive: false });
      z.addEventListener("pointerdown", function (e) {
        if (e.target.closest(".zoom-ui")) return;
        act = true; z.classList.add("act");
        pts[e.pointerId] = { x: e.clientX, y: e.clientY }; last = { x: e.clientX, y: e.clientY };
        try { z.setPointerCapture(e.pointerId); } catch (er) {}
        z.classList.add("drag");
      });
      z.addEventListener("pointermove", function (e) {
        if (!pts[e.pointerId]) return;
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(pts);
        if (ids.length === 2) {
          var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinch) { var r = rect(); zoomAt(d / pinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); }
          pinch = d;
        } else if (last) { x += e.clientX - last.x; y += e.clientY - last.y; apply(); }
        last = { x: e.clientX, y: e.clientY };
      });
      var up = function (e) { delete pts[e.pointerId]; pinch = 0; last = Object.keys(pts).length ? last : null; z.classList.remove("drag"); };
      z.addEventListener("pointerup", up); z.addEventListener("pointercancel", up);
      z.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { act = false; z.classList.remove("act"); } });
      z.addEventListener("dblclick", function (e) {
        if (e.target.closest(".zoom-ui")) return;
        var r = rect(); if (s > 1.2) fit(); else zoomAt(3, e.clientX - r.left, e.clientY - r.top);
      });
      $(".zoom-ui", z).addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        var a = b.getAttribute("data-z"), cx = z.clientWidth / 2, cy = z.clientHeight / 2;
        if (a === "in") zoomAt(1.6, cx, cy); else if (a === "out") zoomAt(1 / 1.6, cx, cy); else if (a === "fit") fit();
        else if (a === "full") { if (document.fullscreenElement) document.exitFullscreen(); else if (z.requestFullscreen) z.requestFullscreen(); }
      });
      document.addEventListener("fullscreenchange", fit);
      addEventListener("resize", fit);
      if (img.complete) fit(); else img.addEventListener("load", fit);
    });
  }

  /* ---------- Tabla de cantidades ↔ visor 3D ---------- */
  function initQty() {
    var rows = $$("tr.qrow"); if (!rows.length) return;
    var cur = null;
    function withApi(cb) {
      if (window.PM_viewerApi) return cb(window.PM_viewerApi);
      var b = $("#v3d-load"); if (b && b.style.display !== "none") b.click();
      var n = 0;
      (function wait() { if (window.PM_viewerApi) return cb(window.PM_viewerApi); if (++n < 90) setTimeout(wait, 500); })();
    }
    rows.forEach(function (r) {
      r.tabIndex = 0; r.setAttribute("role", "button");
      function go() {
        var q = r.getAttribute("data-q"), was = r === cur;
        rows.forEach(function (x) { x.classList.remove("on"); });
        withApi(function (a) {
          if (was) { cur = null; a.clear(); a.rooms(false); return; }
          cur = r; r.classList.add("on");
          if (q === "@rooms") { a.clear(); a.rooms(true); } else { a.rooms(false); a.focus(q); }
          var v = $("#v3d"); if (v) v.scrollIntoView({ behavior: "smooth", block: "center" });
        });
      }
      r.addEventListener("click", go);
      r.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
  }

  /* ---------- Modo oscuro ---------- */
  function setTheme(t) {
    if (t === "dark") document.documentElement.setAttribute("data-theme", "dark"); else document.documentElement.removeAttribute("data-theme");
    store.set("pm-theme", t);
    $$("[data-theme-toggle]").forEach(function (b) { b.textContent = t === "dark" ? "☀" : "☾"; });
    var m = $("meta[name=theme-color]"); if (m) m.setAttribute("content", t === "dark" ? "#000000" : "#ffffff");
  }
  // Transición suave: un velo del color de destino aparece, se cambia el tema por debajo y el velo se desvanece.
  function swapTheme(t) {
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) { setTheme(t); return; }
    var X = t === "dark" ? "#000" : "#fff", invX = X === "#000" ? "#fff" : "#000";
    var now = document.documentElement.getAttribute("data-theme") === "dark";
    var ov = document.createElement("div"); ov.className = "theme-fade";
    ov.style.background = now ? invX : X; ov.style.opacity = "0";
    document.body.appendChild(ov);
    requestAnimationFrame(function () { requestAnimationFrame(function () { ov.style.opacity = "1"; }); });
    setTimeout(function () {
      setTheme(t);
      ov.style.background = t === "dark" ? invX : X; // el filtro de la página invierte el velo en modo oscuro
      ov.getBoundingClientRect();
      ov.style.transition = "opacity .4s ease"; ov.style.opacity = "0";
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 480);
    }, 260);
  }

  function initTheme() {
    var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    setTheme(cur);
    $$("[data-theme-toggle]").forEach(function (b) { b.addEventListener("click", function () { cur = cur === "dark" ? "light" : "dark"; swapTheme(cur); }); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    try { collect(); } catch (e) { console.error(e); }
    $$("[data-l]").forEach(function (b) { b.addEventListener("click", function () { setLang(b.getAttribute("data-l")); }); });
    setLang(store.get("pm-lang") === "en" ? "en" : "es");
    [initTheme, initLB, initBar, initZoom, initQty].forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
  });
})();
