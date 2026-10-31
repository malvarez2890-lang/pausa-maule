(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* Texto: la página está solo en español */
  window.PM_t = function (k) { return k; };

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
      import("./ifc-viewer.js?v=39").then(function (m) {
        return m.startViewer($("#v3d-canvas"), "05_Modelo_IFC/HAB_ARQ_MODELO_R01_IFC4x3.ifc?v=20261030", show);
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
      var asp = 4768 / 2956, s = 1, x = 0, y = 0, bw = 0, bh = 0, act = false;
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
    [initTheme, initLB, initBar, initZoom, initQty].forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
  });
})();
