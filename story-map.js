/* The Sinasera — Research story map（map.html）
 * 資料：map-data/research.json
 * 互動：滿版地圖。點地圖上的點 → 地圖飛過去、左邊顯示那個地方的故事；
 *       點地圖空白處或「All stories」→ 回到全圖和地點清單。上方可以依主題篩選。
 */
(() => {
  const ATLAS_50 = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
  const ATLAS_110 = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
  const W = 960;
  const H = 500;

  // 主題顏色：之後新增主題時，在這裡加一行就好
  const TAG_COLORS = {
    "Food Security": "#c98a12",
    "Land Management": "#6f8b3a",
    "Water Systems": "#00828E",
  };
  // 情境（不是主題）：故事發生在極端事件的情境下，點的外圈畫成紅色
  const EXTREME = "Extreme Events";
  const EXTREME_COLOR = "#c2543f";
  const tagColor = (t) => TAG_COLORS[t] || "#7a5c99";

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const flag = (iso2) =>
    iso2
      ? `<img class="map-flag" src="https://flagcdn.com/w40/${iso2}.png" srcset="https://flagcdn.com/w80/${iso2}.png 2x" width="20" height="15" alt="" loading="lazy" />`
      : "";

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.querySelector("[data-story-map]");
    if (root) init(root).catch((e) => console.error("story map:", e));
  });

  async function init(root) {
    const stories = await fetch("map-data/research.json").then((r) => r.json());
    let world;
    try {
      world = await d3.json(ATLAS_50);
    } catch {
      world = await d3.json(ATLAS_110);
    }

    const mapEl = root.querySelector(".sm-map");
    const panel = root.querySelector(".sm-panel");
    const filterEl = root.querySelector(".sm-filters");
    const tip = root.querySelector(".sm-tip");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 860px)").matches;

    // ── 地圖 ──
    // 手機畫面是直的：viewBox 跟著畫面比例拉高，世界地圖放在上半部（下半部留給故事卡），
    // 點也跟著放大，不然縮小後只剩一兩個像素
    const box = mapEl.getBoundingClientRect();
    const VH = narrow ? Math.round((W * box.height) / Math.max(box.width, 1)) : H;
    const markerScale = narrow ? Math.max(1, (W / Math.max(box.width, 1)) * 0.55) : 1;
    const top = narrow ? VH * 0.3 - (W - 12) / 4 : 6;
    const projection = d3.geoNaturalEarth1().fitExtent([[6, top], [W - 6, narrow ? top + (W - 12) / 2 : H - 6]], { type: "Sphere" });
    const path = d3.geoPath(projection);
    const svg = d3
      .select(mapEl)
      .append("svg")
      .attr("viewBox", `0 0 ${W} ${VH}`)
      .attr("preserveAspectRatio", narrow ? "xMidYMid meet" : "xMidYMid slice")
      .attr("class", "sm-svg")
      .attr("role", "img")
      .attr("aria-label", "World map of research places");
    const g = svg.append("g");
    g.append("path").datum({ type: "Sphere" }).attr("class", "sm-sphere").attr("d", path);
    g.append("path").datum(d3.geoGraticule10()).attr("class", "sm-graticule").attr("d", path);
    const land = topojson.feature(world, world.objects.countries).features.filter((f) => +f.id !== 10);
    g.append("g").selectAll("path").data(land).join("path").attr("class", "sm-land").attr("d", path);

    const placed = stories.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon));
    const markers = g
      .append("g")
      .attr("class", "sm-markers")
      .selectAll("g")
      .data(placed)
      .join("g")
      .attr("class", "sm-marker")
      .attr("data-id", (d) => d.id)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => `${d.title_en}, ${d.place}`)
      .attr("transform", (d) => `translate(${projection([d.lon, d.lat])}) scale(${markerScale})`)
      .style("--c", (d) => tagColor(d.tags[0]))
      // 極端事件情境：外圈畫成紅色
      .style("--c2", (d) => (d.extreme ? EXTREME_COLOR : "#fffaf3"))
      .classed("is-extreme", (d) => !!d.extreme);
    markers.append("circle").attr("class", "sm-hit").attr("r", 10);
    markers.append("circle").attr("class", "sm-pulse").attr("r", 5.5);
    markers.append("circle").attr("class", "sm-dot").attr("r", 3.6);

    let k = 1;
    const zoom = d3
      .zoom()
      .scaleExtent([1, 14])
      .translateExtent([[0, 0], [W, VH]])
      .filter((ev) => ev.type !== "wheel" || ev.ctrlKey || ev.metaKey)
      .on("zoom", (ev) => {
        k = ev.transform.k;
        g.attr("transform", ev.transform);
        markers.attr("transform", (d) => `translate(${projection([d.lon, d.lat])}) scale(${markerScale / k})`);
      });
    svg.call(zoom).on("dblclick.zoom", null);

    const flyTo = (s) => {
      let t = d3.zoomIdentity;
      if (s && Number.isFinite(s.lat)) {
        const [x, y] = projection([s.lon, s.lat]);
        const z = s.zoom || 5;
        // 寬螢幕：地點放在畫面中間偏右，避開左邊的故事卡；手機：放在上半部，避開下方的故事卡
        const fx = narrow ? W / 2 : W * 0.63;
        const fy = narrow ? VH * 0.24 : H / 2;
        t = d3.zoomIdentity.translate(fx - z * x, fy - z * y).scale(z);
      }
      svg
        .transition()
        .duration(reduceMotion ? 0 : 1100)
        .ease(d3.easeCubicInOut)
        .call(zoom.transform, t);
    };

    // ── 狀態：目前的主題篩選、目前打開的故事 ──
    let tag = "All";
    let currentId = null;
    const matches = (s) =>
      tag === "All" || (tag === EXTREME ? !!s.extreme : (s.tags || []).includes(tag));
    const visible = () => stories.filter(matches);

    // ── 卡片內容 ──
    const tagsHtml = (s) =>
      (s.tags || []).map((t) => `<span class="sm-tag" style="--c:${tagColor(t)}">${esc(t)}</span>`).join("") +
      (s.extreme ? `<span class="sm-tag sm-tag-context" style="--c:${EXTREME_COLOR}">${EXTREME}</span>` : "");

    const sourcesHtml = (s) =>
      (s.sources || []).length
        ? `<details class="sm-sources"><summary class="sm-sources-label">Source${s.sources.length > 1 ? `s · ${s.sources.length}` : ""}</summary><ol>${s.sources
            .map((c) => `<li>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.text)}</a>` : esc(c.text)}</li>`)
            .join("")}</ol></details>`
        : "";

    const renderIndex = () => {
      const list = visible();
      panel.style.setProperty("--c", "var(--p-dark)");
      panel.innerHTML = `
        <p class="sm-index">Research map</p>
        <h2 class="sm-title">Places I have studied<span>每一個地方，都是一個讓我看得更遠的故事</span></h2>
        <p class="sm-hint">Click a point on the map, or pick a place below.</p>
        <ul class="sm-list">${list
          .map(
            (s) =>
              `<li><button type="button" data-id="${esc(s.id)}" style="--c:${tagColor(s.tags[0])};--c2:${s.extreme ? EXTREME_COLOR : "transparent"}"><span class="sm-list-dot"></span><span class="sm-list-text"><strong>${esc(s.title_en)}</strong><small>${flag(s.iso2)}${esc(s.place)}</small></span></button></li>`
          )
          .join("")}</ul>`;
      panel.querySelectorAll("button[data-id]").forEach((b) => b.addEventListener("click", () => open(b.dataset.id)));
    };

    const renderStory = (s) => {
      const list = visible();
      const i = list.findIndex((x) => x.id === s.id);
      const prev = list[(i - 1 + list.length) % list.length];
      const next = list[(i + 1) % list.length];
      panel.style.setProperty("--c", tagColor((s.tags || [])[0]));
      panel.innerHTML = `
        <button type="button" class="sm-back" data-back>← All stories</button>
        <p class="sm-place">${flag(s.iso2)}${esc(s.place)}</p>
        <h2 class="sm-title">${esc(s.title_en)}${s.title_zh ? `<span>${esc(s.title_zh)}</span>` : ""}</h2>
        <div class="sm-tags">${tagsHtml(s)}</div>
        ${s.story_zh ? `<p class="sm-story-zh">${esc(s.story_zh)}</p>` : ""}
        ${s.story_en ? `<details class="sm-en"${narrow ? "" : " open"}><summary>English</summary><p class="sm-story-en">${esc(s.story_en)}</p></details>` : ""}
        ${sourcesHtml(s)}
        ${
          list.length > 1
            ? `<div class="sm-pager">
                <button type="button" data-go="${esc(prev.id)}">← ${esc(prev.title_en)}</button>
                <span>${i + 1} / ${list.length}</span>
                <button type="button" data-go="${esc(next.id)}">${esc(next.title_en)} →</button>
              </div>`
            : ""
        }`;
      panel.querySelector("[data-back]").addEventListener("click", close);
      panel.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => open(b.dataset.go)));
      panel.scrollTop = 0;
    };

    function open(id) {
      const s = stories.find((x) => x.id === id);
      if (!s) return;
      currentId = id;
      root.classList.add("is-open");
      markers.classed("is-active", (d) => d.id === id);
      markers.filter((d) => d.id === id).raise();
      renderStory(s);
      flyTo(s);
    }

    function close() {
      currentId = null;
      root.classList.remove("is-open");
      markers.classed("is-active", false);
      renderIndex();
      flyTo(null);
    }

    // ── 地圖上的互動 ──
    markers
      .on("click", (ev, d) => {
        ev.stopPropagation();
        open(d.id);
      })
      .on("keydown", (ev, d) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          open(d.id);
        }
      })
      .on("pointerenter", (ev, d) => {
        if (!tip) return;
        tip.innerHTML = `<strong>${esc(d.title_en)}</strong><span>${flag(d.iso2)}${esc(d.place)}</span>`;
        tip.hidden = false;
      })
      .on("pointermove", (ev) => {
        if (!tip) return;
        const r = mapEl.getBoundingClientRect();
        tip.style.transform = `translate(${ev.clientX - r.left + 14}px, ${ev.clientY - r.top + 14}px)`;
      })
      .on("pointerleave", () => {
        if (tip) tip.hidden = true;
      });

    // 點地圖空白處（拖曳不算）：回到全圖
    let downAt = null;
    svg.on("pointerdown.blank", (ev) => (downAt = [ev.clientX, ev.clientY]));
    svg.on("click.blank", (ev) => {
      const moved = downAt && Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) > 5;
      if (!moved && currentId) close();
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && currentId) close();
    });

    // ── 主題篩選 ──
    const tags = Object.keys(TAG_COLORS).filter((t) => stories.some((s) => (s.tags || []).includes(t)));
    stories.forEach((s) => (s.tags || []).forEach((t) => !tags.includes(t) && tags.push(t)));
    const btn = (t, color, cls = "") =>
      `<button type="button" class="sm-filter${cls}" data-tag="${esc(t)}" aria-pressed="${t === "All"}" style="--c:${color}">${esc(t)}</button>`;
    filterEl.innerHTML =
      ["All", ...tags].map((t) => btn(t, t === "All" ? "var(--p-dark)" : tagColor(t))).join("") +
      (stories.some((s) => s.extreme) ? btn(EXTREME, EXTREME_COLOR, " sm-filter-context") : "");
    filterEl.addEventListener("click", (ev) => {
      const b = ev.target.closest(".sm-filter");
      if (!b) return;
      tag = b.dataset.tag;
      filterEl.querySelectorAll(".sm-filter").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      markers.classed("is-dimmed", (d) => !matches(d));
      close();
    });

    renderIndex();
  }
})();
