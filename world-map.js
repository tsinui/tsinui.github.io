/* The Sinasera — 互動世界地圖（首頁 + map.html 共用）
 * 資料：map-data/places.json（去過的地方）、map-data/readings.json（讀過的東西）
 */
(() => {
  const ATLAS_110 = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
  const ATLAS_50 = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
  const W = 960;
  const H = 500;

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-map="full"]').forEach((el) =>
      initFull(el).catch((e) => console.error("world map:", e))
    );
  });

  // ── 資料 ──
  async function loadData() {
    const [places, readings] = await Promise.all([
      fetch("map-data/places.json").then((r) => r.json()),
      fetch("map-data/readings.json")
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]);
    const byId = new Map();
    const ensure = (id) => {
      id = +id;
      if (!byId.has(id)) byId.set(id, { id, name: "", nameZh: "", visited: false, readings: [] });
      return byId.get(id);
    };
    (places.visited || []).forEach((p) => {
      const c = ensure(p.id);
      Object.assign(c, p, { id: +p.id, visited: true, readings: c.readings });
    });
    (readings || []).forEach((r) => (r.countries || []).forEach((cid) => ensure(cid).readings.push(r)));
    return { places, readings: readings || [], byId };
  }

  const inLayer = (info, layer) =>
    !!info && (layer === "read" ? info.readings.length > 0 : info.visited);

  function layerList(data, layer) {
    if (layer === "read") {
      return [...data.byId.values()]
        .filter((c) => c.readings.length)
        .sort((a, b) => b.readings.length - a.readings.length);
    }
    return (data.places.visited || []).map((p) => data.byId.get(+p.id));
  }

  // 國旗：flagcdn.com 的 PNG（emoji 國旗在 Windows 上不會顯示）
  const flag = (info) =>
    info && info.iso2
      ? `<img class="map-flag" src="https://flagcdn.com/w40/${info.iso2}.png" srcset="https://flagcdn.com/w80/${info.iso2}.png 2x" width="20" height="15" alt="" loading="lazy" />`
      : "";

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ── 繪圖 ──
  function buildFeatures(world, byId) {
    const out = [];
    topojson
      .feature(world, world.objects.countries)
      .features.filter((f) => +f.id !== 10) // 南極洲
      .forEach((f) => {
        const id = +f.id;
        const name = (f.properties && f.properties.name) || "";
        const info = byId.get(id);
        if (info && !info.name) info.name = name;
        const g = f.geometry;
        if (!g) return;
        // 有資料的國家只標主要的那塊陸地（例如法屬圭亞那不上色）
        if (info && g.type === "MultiPolygon") {
          let main = 0;
          let max = -1;
          g.coordinates.forEach((c, i) => {
            const a = d3.geoArea({ type: "Polygon", coordinates: c });
            if (a > max) { max = a; main = i; }
          });
          g.coordinates.forEach((c, i) =>
            out.push({ id, name, main: i === main, feature: { type: "Feature", geometry: { type: "Polygon", coordinates: c } } })
          );
        } else {
          out.push({ id, name, main: true, feature: f });
        }
      });
    return out;
  }

  function renderMap(container, world, data, layer, label, opts = {}) {
    const features = buildFeatures(world, data.byId);
    const sphere = { type: "Sphere" };
    let w = W;
    let h = H;
    let projection;
    if (opts.cropToLand) {
      // 只框住陸地（不含南極洲）：同樣寬度下地圖變扁，南北兩端空白的海洋不顯示
      const land = { type: "FeatureCollection", features: features.map((f) => f.feature) };
      projection = d3.geoNaturalEarth1().fitWidth(W - 12, land);
      const [[, y0], [, y1]] = d3.geoPath(projection).bounds(land);
      // 上下留白要「看起來」一樣：北邊的陸地（格陵蘭、加拿大、俄羅斯）一路貼到最北，
      // 南邊的主要陸塊在南緯 43° 就結束，只有南美洲尖端再往下伸（約陸地高度的 8.5%）。
      // 所以上方留 13%、南美洲尖端下方只留 5%，上下的空白海面看起來才會一樣多。
      const lh = y1 - y0;
      const padTop = Math.round(lh * 0.13);
      const padBottom = Math.round(lh * 0.05);
      projection.translate([projection.translate()[0] + 6, projection.translate()[1] - y0 + padTop]);
      h = Math.ceil(lh + padTop + padBottom);
    } else {
      projection = d3.geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], sphere);
    }
    const path = d3.geoPath(projection);

    const svg = d3
      .select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${w} ${h}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("class", `world-svg layer-${layer}`)
      .attr("role", "img")
      .attr("aria-label", label);

    const g = svg.append("g").attr("class", "map-zoom");
    g.append("path").datum(sphere).attr("class", "sphere").attr("d", path);
    g.append("path").datum(d3.geoGraticule10()).attr("class", "graticule").attr("d", path);

    const countries = g
      .append("g")
      .attr("class", "countries")
      .selectAll("path")
      .data(features)
      .join("path")
      .attr("class", (d) => {
        const info = data.byId.get(d.id);
        const cls = ["country"];
        if (d.main && info && info.visited) cls.push("is-visited");
        if (d.main && info && info.readings.length) cls.push("is-read");
        return cls.join(" ");
      })
      .attr("data-id", (d) => d.id)
      .attr("d", (d) => path(d.feature));

    const mainOf = (id) => features.find((f) => f.id === id && f.main);
    return { svg, g, countries, path, features, mainOf, w, h };
  }

  // ── 互動：hover 光暈、tooltip、清單連動 ──
  function makeController(m, data, opts) {
    const { frame, tooltip, listEl } = opts;
    let hoverId = null;

    function tooltipHTML(id) {
      const info = data.byId.get(id);
      const f = m.mainOf(id);
      const name = (info && info.name) || (f && f.name) || "";
      if (!name) return "";
      const layer = opts.getLayer();
      const parts = [`<p class="map-tip-name">${flag(info)}${esc(name)}</p>`];
      const badges = [];
      if (info && info.visited) badges.push('<span class="map-badge is-visited">Visited</span>');
      if (info && info.readings.length) badges.push(`<span class="map-badge is-read">Read · ${info.readings.length}</span>`);
      if (badges.length) parts.push(`<p class="map-tip-badges">${badges.join("")}</p>`);
      if (info && info.cities && info.cities.length) parts.push(`<p class="map-tip-line">${esc(info.cities.join("、"))}</p>`);
      if (info && info.note) parts.push(`<p class="map-tip-note">${esc(info.note)}</p>`);
      if (!inLayer(info, layer)) parts.push(`<p class="map-tip-muted">${layer === "read" ? "Nothing read yet" : "Not visited yet"}</p>`);
      else if (opts.hint) parts.push(`<p class="map-tip-hint">${esc(opts.hint)}</p>`);
      return parts.join("");
    }

    function placeTooltip(clientX, clientY) {
      if (!tooltip) return;
      const r = frame.getBoundingClientRect();
      let x = clientX - r.left + 14;
      let y = clientY - r.top + 14;
      const tw = tooltip.offsetWidth;
      const th = tooltip.offsetHeight;
      if (x + tw > r.width - 4) x = clientX - r.left - tw - 14;
      if (y + th > r.height - 4) y = clientY - r.top - th - 14;
      tooltip.style.transform = `translate(${Math.max(4, x)}px, ${Math.max(4, y)}px)`;
    }

    function setHover(id, point) {
      hoverId = id;
      const info = data.byId.get(id);
      const active = inLayer(info, opts.getLayer());
      m.svg.classed("has-hover", active);
      m.countries.classed("is-hover", (d) => d.id === id && (active ? d.main : true));
      m.countries.filter((d) => d.id === id).raise();
      if (listEl) {
        listEl.querySelectorAll("[data-id]").forEach((el) => el.classList.toggle("is-active", +el.dataset.id === id));
      }
      if (tooltip) {
        const html = tooltipHTML(id);
        if (!html) return clearHover();
        tooltip.innerHTML = html;
        tooltip.hidden = false;
        tooltip.classList.toggle("is-active", active);
        if (point) placeTooltip(point.x, point.y);
      }
    }

    function clearHover() {
      hoverId = null;
      m.svg.classed("has-hover", false);
      m.countries.classed("is-hover", false);
      if (listEl) listEl.querySelectorAll(".is-active").forEach((el) => el.classList.remove("is-active"));
      if (tooltip) tooltip.hidden = true;
    }

    // 從清單 hover：在國家中心顯示 tooltip
    function hoverFromList(id) {
      const el = m.countries.filter((d) => d.id === id && d.main).node();
      if (!el) return setHover(id, null);
      const b = el.getBoundingClientRect();
      setHover(id, { x: b.left + b.width / 2, y: b.top + b.height / 2 });
    }

    m.countries
      .on("pointerenter", (ev, d) => setHover(d.id, { x: ev.clientX, y: ev.clientY }))
      .on("pointermove", (ev, d) => {
        if (hoverId !== d.id) setHover(d.id, null);
        placeTooltip(ev.clientX, ev.clientY);
      })
      .on("pointerleave", clearHover)
      .on("click", (ev, d) => opts.onSelect && opts.onSelect(d.id, ev));

    if (listEl) {
      listEl.addEventListener("pointerover", (ev) => {
        const item = ev.target.closest("[data-id]");
        if (item) hoverFromList(+item.dataset.id);
      });
      listEl.addEventListener("pointerleave", clearHover);
      listEl.addEventListener("focusin", (ev) => {
        const item = ev.target.closest("[data-id]");
        if (item) hoverFromList(+item.dataset.id);
      });
      listEl.addEventListener("focusout", clearHover);
    }

    return { setHover, clearHover, hoverFromList };
  }

  // 進入畫面時，去過的國家依序亮起
  function drawIn(m, container, layer) {
    const cls = layer === "read" ? "is-read" : "is-visited";
    let i = 0;
    m.countries.filter(`.${cls}`).style("--i", () => i++);
    const total = i;
    const start = () => {
      container.classList.add("is-drawn");
      setTimeout(() => container.classList.add("is-settled"), total * 55 + 700);
    };
    if (!("IntersectionObserver" in window)) return start();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        start();
      }
    }, { threshold: 0.35 });
    io.observe(container);
  }

  // ── 地圖工具（首頁與 map.html 共用） ──
  async function initFull(el) {
    const frame = el.closest(".world-map-frame") || el.parentElement;
    const tooltip = frame.querySelector(".map-tooltip");
    const panel = document.getElementById("map-panel");
    const wheelHint = frame.querySelector(".map-wheel-hint");
    const isHome = el.dataset.variant === "home";
    // 首頁不改網址，也不讀網址參數
    const params = new URLSearchParams(isHome ? "" : location.search);
    const syncUrl = (fn) => {
      if (isHome) return;
      const u = new URL(location.href);
      fn(u.searchParams);
      history.replaceState(null, "", u);
    };
    let layer = params.get("layer") === "read" ? "read" : "visited";
    let selected = null;

    const data = await loadData();
    let world;
    try {
      world = await d3.json(ATLAS_50);
    } catch {
      world = await d3.json(ATLAS_110);
    }
    const m = renderMap(el, world, data, layer, "World map of places visited and read about", { cropToLand: isHome });

    // 縮放與平移
    const zoom = d3
      .zoom()
      .scaleExtent([1, 12])
      .translateExtent([[0, 0], [m.w, m.h]])
      .on("zoom", (ev) => {
        m.g.attr("transform", ev.transform);
        el.style.setProperty("--zoom-k", ev.transform.k);
      });
    // 首頁：一般滾輪留給捲動頁面，按住 ⌘/Ctrl（或觸控板捏合）才縮放；手機單指也留給捲動
    if (isHome) {
      zoom.filter((ev) => {
        if (ev.type === "wheel") return ev.ctrlKey || ev.metaKey;
        if (ev.type.startsWith("touch")) return ev.touches && ev.touches.length > 1;
        return !ev.button;
      });
      let hintTimer = 0;
      let hintShown = false;
      m.svg.on("wheel.hint", (ev) => {
        if (ev.ctrlKey || ev.metaKey || !wheelHint || hintShown) return;
        hintShown = true; // 每次載入只提示一次
        wheelHint.hidden = false;
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => (wheelHint.hidden = true), 1400);
      });
    }
    m.svg.call(zoom).on("dblclick.zoom", null);

    function zoomTo(id) {
      const f = m.mainOf(id);
      if (!f) return;
      const [[x0, y0], [x1, y1]] = m.path.bounds(f.feature);
      const k = Math.min(8, 0.55 / Math.max((x1 - x0) / m.w, (y1 - y0) / m.h));
      const t = d3.zoomIdentity.translate(m.w / 2 - (k * (x0 + x1)) / 2, m.h / 2 - (k * (y0 + y1)) / 2).scale(k);
      m.svg.transition().duration(800).ease(d3.easeCubicInOut).call(zoom.transform, t);
    }
    const resetZoom = () => m.svg.transition().duration(700).call(zoom.transform, d3.zoomIdentity);

    document.querySelectorAll("[data-zoom]").forEach((b) =>
      b.addEventListener("click", () => {
        const z = b.dataset.zoom;
        if (z === "in") m.svg.transition().duration(300).call(zoom.scaleBy, 1.6);
        else if (z === "out") m.svg.transition().duration(300).call(zoom.scaleBy, 1 / 1.6);
        else select(null);
      })
    );

    // 圖層切換
    const layerBtns = document.querySelectorAll("[data-layer]");
    layerBtns.forEach((b) => {
      b.addEventListener("click", () => setLayer(b.dataset.layer));
    });

    function setLayer(next) {
      layer = next;
      m.svg.attr("class", `world-svg layer-${layer}`);
      layerBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.layer === layer)));
      syncUrl((q) => (layer === "read" ? q.set("layer", "read") : q.delete("layer")));
      renderPanel();
    }

    function select(id) {
      selected = id;
      m.countries.classed("is-selected", (d) => id != null && d.id === id && d.main);
      if (id != null) m.countries.filter((d) => d.id === id).raise();
      syncUrl((q) => (id != null ? q.set("c", id) : q.delete("c")));
      if (id != null) zoomTo(id);
      else resetZoom();
      renderPanel();
    }

    function readingHTML(r) {
      const title = r.link
        ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a>`
        : esc(r.title);
      const meta = [r.author, r.type, r.year].filter(Boolean).map(esc).join(" · ");
      return `<li class="map-reading"><p class="map-reading-title">${title}</p>${meta ? `<p class="map-reading-meta">${meta}</p>` : ""}${r.note ? `<p class="map-reading-note">${esc(r.note)}</p>` : ""}</li>`;
    }

    function renderPanel() {
      if (!panel) return;
      if (selected != null) {
        const info = data.byId.get(selected);
        const f = m.mainOf(selected);
        const name = (info && info.name) || (f && f.name) || "Unknown";
        const badges = [];
        if (info && info.visited) badges.push('<span class="map-badge is-visited">Visited</span>');
        if (info && info.readings.length) badges.push(`<span class="map-badge is-read">Read · ${info.readings.length}</span>`);
        panel.innerHTML = `
          <button class="map-back" type="button" data-back>← All</button>
          <h2 class="map-panel-title">${flag(info)}${esc(name)}${info && info.nameZh ? `<span>${esc(info.nameZh)}</span>` : ""}</h2>
          ${badges.length ? `<p class="map-tip-badges">${badges.join("")}</p>` : `<p class="map-panel-empty">Not visited yet.</p>`}
          ${info && info.cities && info.cities.length ? `<p class="map-panel-label">City</p><p class="map-panel-text">${esc(info.cities.join("、"))}</p>` : ""}
          ${info && info.years && info.years.length ? `<p class="map-panel-label">When</p><p class="map-panel-text">${esc(info.years.join("、"))}</p>` : ""}
          ${info && info.note ? `<p class="map-panel-label">Note</p><p class="map-panel-text">${esc(info.note)}</p>` : ""}
          ${info && info.readings.length ? `<p class="map-panel-label">Reading</p><ul class="map-readings">${info.readings.map(readingHTML).join("")}</ul>` : ""}
        `;
        panel.querySelector("[data-back]").addEventListener("click", () => select(null));
        return;
      }
      const list = layerList(data, layer);
      panel.innerHTML = `
        <p class="map-panel-label">${layer === "read" ? "Reading" : "Visited"}</p>
        ${
          list.length
            ? `<ul class="map-panel-list">${list
                .map(
                  (c) =>
                    `<li><button type="button" data-id="${c.id}"><span class="map-panel-name">${flag(c)}${esc(c.name)}</span>${layer === "read" ? `<small>${c.readings.length}</small>` : ""}</button></li>`
                )
                .join("")}</ul>`
            : `<p class="map-panel-empty">Reading map coming soon.</p>`
        }
      `;
      panel.querySelectorAll("button[data-id]").forEach((b) => b.addEventListener("click", () => select(+b.dataset.id)));
    }

    makeController(m, data, {
      frame,
      tooltip,
      listEl: panel,
      getLayer: () => layer,
      onSelect: (id) => select(id),
    });

    // 點海洋：回到全部
    m.svg.on("click", (ev) => {
      if (!ev.target.classList.contains("country")) select(null);
    });

    setLayer(layer);
    drawIn(m, el, layer);
    const c = +params.get("c");
    if (c) select(c);
  }
})();
