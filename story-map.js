/* The Sinasera — Research story map（map.html）
 * 底圖：MapLibre GL JS（開源）。預設是衛星影像（EOX Sentinel-2 cloudless），
 *       可以切換成土地使用圖（Esri | Impact Observatory 10 m Land Cover，農地特別標出來）。
 *       另外用 OpenFreeMap（OpenStreetMap 資料）畫河流、國界和地名，AWS Open Data 高程做山影。全部不需要帳號或 API key。
 * 資料：map-data/research.json
 * 互動：點地圖上的點或清單 → 飛過去、左邊顯示故事；點空白處或 Esc → 回到世界全貌。
 *       全國尺度的故事（research.json 裡 scale: "country"）會把整個國家框起來。
 */
(() => {
  const TAG_COLORS = {
    "Food Security": "#c98a12",
    "Land Degradation": "#cf3f32",
    "Crops & Irrigation": "#8a4fbf",
    "Water Systems": "#2b8fd0",
  };
  const OTHER_COLOR = "#7a5c99";
  const EXTREME = "Extreme Events";
  // 極端事件情境：不用顏色區分，而是在點外面多畫一圈圓環
  const EXTREME_COLOR = "#2b3238";
  const tagColor = (t) => TAG_COLORS[t] || OTHER_COLOR;
  // 衛星影像上用的亮色版本：同一個色系，但更亮、更飽和，才不會被褐色、綠色的地表吃掉
  const SAT_COLORS = {
    "Food Security": "#ffc53d",
    "Land Degradation": "#ff5a4a",
    "Crops & Irrigation": "#d39bff",
    "Water Systems": "#9fdcff",
  };
  const SAT_OTHER = "#d7a6ff";
  const SAT_EXTREME = "#ffffff";

  // 一開始看到的地球：中心點；大小依畫面計算（地球直徑約佔可用空間的 88%）
  const OVERVIEW_CENTER = [25, 22];

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const flag = (iso2) =>
    iso2
      ? `<img class="map-flag" src="https://flagcdn.com/w40/${iso2}.png" srcset="https://flagcdn.com/w80/${iso2}.png 2x" width="20" height="15" alt="" loading="lazy" />`
      : "";

  // ── 土地使用圖層：Esri × Impact Observatory 的 Sentinel-2 10 公尺全球土地覆蓋（2024） ──
  // 由 Esri 的影像服務即時產生圖磚；顏色在這裡自己指定：農地用鮮明的綠色，其他類別都調淡
  const LULC = "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer/exportImage";
  const LULC_YEAR = 2024;
  const LULC_CLASSES = [
    // [資料裡的代碼, 名稱, 顏色]
    [5, "Cropland", [74, 158, 52]],
    [11, "Rangeland", [233, 227, 199]],
    [2, "Trees", [196, 208, 186]],
    [8, "Bare ground", [242, 235, 220]],
    [7, "Built area", [154, 144, 144]],
    [1, "Water", [182, 210, 220]],
    [4, "Flooded vegetation", [192, 214, 206]],
    [9, "Snow / ice", [250, 250, 250]],
    [10, "Clouds", [240, 240, 240]],
  ];
  const lulcTiles = () => {
    const rule = { rasterFunction: "Colormap", rasterFunctionArguments: { Colormap: LULC_CLASSES.map(([v, , rgb]) => [v, ...rgb]) } };
    const t0 = Date.UTC(LULC_YEAR, 0, 1);
    const t1 = Date.UTC(LULC_YEAR + 1, 0, 1) - 1000;
    return (
      `${LULC}?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true` +
      `&time=${t0},${t1}&renderingRule=${encodeURIComponent(JSON.stringify(rule))}&f=image`
    );
  };

  // ── 底圖樣式：淡淡的紙色陸地＋山影＋水，標籤很少，讓故事的點最顯眼 ──
  const OFM = "https://tiles.openfreemap.org";
  const baseStyle = {
    version: 8,
    // 平面投影（Web Mercator）。想換回地球儀，把 "mercator" 改成 "globe"
    projection: { type: "mercator" },
    glyphs: `${OFM}/fonts/{fontstack}/{range}.pbf`,
    sky: { "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 4, 0.3, 6, 0] },
    sources: {
      ofm: { type: "vector", url: `${OFM}/planet` },
      // 衛星影像：EOX 的 Sentinel-2 cloudless（去雲的全球衛星拼接圖），非商業使用免費，需標示出處
      satellite: {
        type: "raster",
        tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg"],
        tileSize: 256,
        maxzoom: 14,
        attribution:
          '<a href="https://s2maps.eu" target="_blank" rel="noopener">Sentinel-2 cloudless - https://s2maps.eu</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)',
      },
      landuse: {
        type: "raster",
        tiles: [lulcTiles()],
        tileSize: 256,
        maxzoom: 14,
        attribution:
          'Land use: <a href="https://livingatlas.arcgis.com/landcover/" target="_blank" rel="noopener">Esri | Impact Observatory, Sentinel-2 10m Land Cover</a> (CC BY 4.0)',
      },
      dem: {
        type: "raster-dem",
        tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 12,
        attribution: '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain Tiles (AWS Open Data)</a>',
      },
    },
    layers: [
      { id: "land", type: "background", paint: { "background-color": "#efe9dc" } },
      // 衛星影像在拉遠時變半透明，透出底下的米色，讓故事的點浮出來；拉近到故事地點時再變回完全不透明
      {
        id: "satellite",
        type: "raster",
        source: "satellite",
        paint: {
          "raster-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.45, 3, 0.6, 6, 1],
          "raster-saturation": -0.1,
        },
      },
      {
        id: "landcover",
        type: "fill",
        source: "ofm",
        "source-layer": "landcover",
        paint: {
          "fill-color": [
            "match",
            ["get", "class"],
            "wood", "#d3dcbc",
            "forest", "#d3dcbc",
            "grass", "#e1e3c8",
            "farmland", "#e8e4c9",
            "wetland", "#d4e2d6",
            "sand", "#f1e4c4",
            "ice", "#fbfbf8",
            "rock", "#e2ddd2",
            "#e6e3cf",
          ],
          "fill-opacity": 0.85,
        },
      },
      {
        id: "hillshade",
        type: "hillshade",
        source: "dem",
        paint: {
          "hillshade-exaggeration": ["interpolate", ["linear"], ["zoom"], 1, 0.55, 6, 0.45, 10, 0.3],
          "hillshade-shadow-color": "#6b5a45",
          "hillshade-highlight-color": "#fffaf0",
          "hillshade-accent-color": "#8c7b62",
        },
      },
      // 土地使用圖層：只在 Land use 模式顯示
      {
        id: "landuse",
        type: "raster",
        source: "landuse",
        layout: { visibility: "none" },
        paint: { "raster-opacity": 0.92 },
      },
      { id: "water", type: "fill", source: "ofm", "source-layer": "water", paint: { "fill-color": "#bcd5d6" } },
      {
        id: "rivers",
        type: "line",
        source: "ofm",
        "source-layer": "waterway",
        minzoom: 5,
        filter: ["in", ["get", "class"], ["literal", ["river", "canal"]]],
        paint: { "line-color": "#a9cacc", "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 10, 1.6] },
      },
      {
        id: "borders",
        type: "line",
        source: "ofm",
        "source-layer": "boundary",
        filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
        paint: {
          "line-color": "#9d907b",
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.4, 6, 1],
          "line-dasharray": [3, 2],
        },
      },
      {
        id: "country-labels",
        type: "symbol",
        source: "ofm",
        "source-layer": "place",
        minzoom: 2.5,
        maxzoom: 7,
        filter: ["==", ["get", "class"], "country"],
        layout: {
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-letter-spacing": 0.08,
          "text-transform": "uppercase",
        },
        paint: { "text-color": "#7d725f", "text-halo-color": "rgba(255,250,240,0.8)", "text-halo-width": 1.2 },
      },
      {
        id: "city-labels",
        type: "symbol",
        source: "ofm",
        "source-layer": "place",
        minzoom: 6,
        filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
        layout: {
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
        },
        paint: { "text-color": "#6c6352", "text-halo-color": "rgba(255,250,240,0.85)", "text-halo-width": 1.2 },
      },
    ],
  };

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.querySelector("[data-story-map]");
    if (root) init(root).catch((e) => console.error("terrain story map:", e));
  });

  async function init(root) {
    const stories = window.RESEARCH_STORIES || (await fetch("map-data/research.json").then((r) => r.json()));
    const mapEl = root.querySelector(".sm-map");
    const panel = root.querySelector(".sm-panel");
    const filterEl = root.querySelector(".sm-filters");
    const tip = root.querySelector(".sm-tip");
    const narrow = window.matchMedia("(max-width: 860px)").matches;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const map = new maplibregl.Map({
      container: mapEl,
      style: baseStyle,
      center: OVERVIEW_CENTER,
      zoom: 1.5,
      minZoom: 0.8,
      maxZoom: 12,
      attributionControl: { compact: true, customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    // 手機用雙指縮放就好；桌機在右下角放 + / − 按鈕
    if (!narrow) map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    // ── 故事的點 ──
    const placed = stories.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon));
    const geojson = {
      type: "FeatureCollection",
      features: placed.map((s) => ({
        type: "Feature",
        id: placed.indexOf(s),
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
        properties: {
          id: s.id,
          color: tagColor((s.tags || [])[0]),
          satColor: SAT_COLORS[(s.tags || [])[0]] || SAT_OTHER,
          extreme: !!s.extreme,
        },
      })),
    };
    const fid = (id) => placed.findIndex((s) => s.id === id);

    // d3 版用的 zoom 是「放大倍數」；換算成 MapLibre 的縮放等級。也可以在 research.json 加 mapZoom 直接指定
    const storyZoom = (s) => (Number.isFinite(s.mapZoom) ? s.mapZoom : 3.2 + Math.log2(s.zoom || 5));

    // ── 狀態 ──
    let tag = "All";
    let currentId = null;
    const matches = (s) => tag === "All" || (tag === EXTREME ? !!s.extreme : (s.tags || []).includes(tag));
    const visible = () => stories.filter(matches);

    const padding = () =>
      narrow
        ? { top: 40, bottom: Math.round(mapEl.clientHeight * 0.5), left: 20, right: 20 }
        : { top: 40, bottom: 40, left: Math.min(460, mapEl.clientWidth * 0.4), right: 40 };

    // 地球全貌：扣掉故事面板佔掉的地方，算出剛好放得下的縮放等級
    // （地球儀在縮放等級 z 時，直徑約 512 × 2^z ÷ π 像素）
    const overviewPadding = () =>
      narrow
        ? { top: 50, bottom: Math.round(mapEl.clientHeight * 0.45), left: 0, right: 0 }
        : { top: 0, bottom: 0, left: Math.min(460, mapEl.clientWidth * 0.4), right: 0 };
    // 世界全貌：把有人住的陸地（南緯 56° 到北緯 72°）放進故事面板旁邊的空間
    const WORLD = [[-168, -56], [180, 72]];
    const overviewCamera = () => map.cameraForBounds(WORLD, { padding: overviewPadding() }) || { center: OVERVIEW_CENTER, zoom: 1 };

    // ── 全國尺度的故事：打開時把整個國家框起來，地圖縮放到看得到整個國家 ──
    // 國界來自 world-atlas（Natural Earth 1:50m），跟首頁地圖用同一份
    const ATLAS = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
    let countryBounds = {};
    const loadCountries = async () => {
      try {
        const world = await fetch(ATLAS).then((r) => r.json());
        const fc = topojson.feature(world, world.objects.countries);
        fc.features.forEach((f) => {
          f.properties = { iso: String(f.id) };
          // 算出每個國家的範圍，用來縮放到整個國家
          let w = 180, so = 90, e = -180, n = -90;
          const walk = (c) => (typeof c[0] === "number" ? ((w = Math.min(w, c[0])), (e = Math.max(e, c[0])), (so = Math.min(so, c[1])), (n = Math.max(n, c[1]))) : c.forEach(walk));
          walk(f.geometry ? f.geometry.coordinates : []);
          countryBounds[String(f.id)] = [[w, so], [e, n]];
        });
        map.addSource("countries", { type: "geojson", data: fc });
        const before = map.getLayer("story-shadow") ? "story-shadow" : undefined;
        map.addLayer({ id: "country-focus-fill", type: "fill", source: "countries", filter: ["==", ["get", "iso"], ""], paint: { "fill-color": "#fffaf0", "fill-opacity": 0.18 } }, before);
        map.addLayer({ id: "country-focus-line", type: "line", source: "countries", filter: ["==", ["get", "iso"], ""], paint: { "line-color": "#fffaf0", "line-width": 2 } }, before);
        if (currentId) focusCountry(stories.find((x) => x.id === currentId));
      } catch (e) {
        console.warn("country outlines unavailable", e);
      }
    };
    const focusCountry = (s) => {
      if (!map.getLayer("country-focus-fill")) return;
      const iso = s && s.scale === "country" ? s.iso_n3 : "";
      const color = s ? tagColor((s.tags || [])[0]) : "#fffaf0";
      map.setFilter("country-focus-fill", ["==", ["get", "iso"], iso || ""]);
      map.setFilter("country-focus-line", ["==", ["get", "iso"], iso || ""]);
      map.setPaintProperty("country-focus-fill", "fill-color", color);
      map.setPaintProperty("country-focus-line", "line-color", color);
    };

    const flyTo = (s) => {
      // 全國尺度：縮放到整個國家（不放大到超過故事原本設定的程度）
      if (s && s.scale === "country" && countryBounds[s.iso_n3]) {
        const opts = { padding: padding(), maxZoom: storyZoom(s) + 1, duration: reduceMotion ? 0 : 2200, essential: true };
        map.fitBounds(countryBounds[s.iso_n3], opts);
        return;
      }
      const opts = s
        ? { center: [s.lon, s.lat], zoom: storyZoom(s), padding: padding() }
        : { ...overviewCamera(), padding: { top: 0, bottom: 0, left: 0, right: 0 } };
      if (reduceMotion) map.jumpTo(opts);
      else map.flyTo({ ...opts, duration: 2200, essential: true });
    };


    // ── 面板內容（跟 map.html 相同） ──
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
      panel.style.setProperty("--c", "var(--p-dark)");
      panel.innerHTML = `
        <p class="sm-index">Research map</p>
        <h2 class="sm-title">Places I have studied<span>每一個地方，都是一個讓我看得更遠的故事</span></h2>
        <p class="sm-hint">Click a point on the map, or pick a place below.</p>
        <ul class="sm-list">${visible()
          .map(
            (s) =>
              `<li><button type="button" data-id="${esc(s.id)}" style="--c:${tagColor((s.tags || [])[0])};--c2:${s.extreme ? EXTREME_COLOR : "transparent"}"><span class="sm-list-dot"></span><span class="sm-list-text"><strong>${flag(s.iso2)}${esc(s.place)}</strong><small>${esc(s.title_en)}</small></span></button></li>`
          )
          .join("")}</ul>`;
      panel.querySelectorAll("button[data-id]").forEach((b) => b.addEventListener("click", () => open(b.dataset.id)));
      panel.scrollTop = 0;
    };

    const renderStory = (s) => {
      const list = visible();
      const i = Math.max(0, list.findIndex((x) => x.id === s.id));
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
                <button type="button" data-go="${esc(prev.id)}" aria-label="Previous: ${esc(prev.title_en)}">← ${flag(prev.iso2)}${esc(prev.place)}</button>
                <span>${i + 1} / ${list.length}</span>
                <button type="button" data-go="${esc(next.id)}" aria-label="Next: ${esc(next.title_en)}">${flag(next.iso2)}${esc(next.place)} →</button>
              </div>`
            : ""
        }`;
      panel.querySelector("[data-back]").addEventListener("click", close);
      panel.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => open(b.dataset.go)));
      panel.scrollTop = 0;
    };

    const setActive = (id) => {
      placed.forEach((s, i) => map.setFeatureState({ source: "stories", id: i }, { active: s.id === id }));
    };
    const setDimmed = () => {
      placed.forEach((s, i) => map.setFeatureState({ source: "stories", id: i }, { dimmed: !matches(s) }));
    };

    function open(id) {
      const s = stories.find((x) => x.id === id);
      if (!s) return;
      currentId = id;
      root.classList.add("is-open");
      if (map.getSource("stories")) setActive(id);
      renderStory(s);
      focusCountry(s);
      flyTo(s);
    }

    function close() {
      currentId = null;
      root.classList.remove("is-open");
      if (map.getSource("stories")) setActive(null);
      renderIndex();
      focusCountry(null);
      flyTo(null);
    }

    map.on("load", () => {
      // 一打開頁面就把地球放在故事面板旁邊的空間（要等地圖載入完才能移動，不然地球儀投影會出錯）
      if (!currentId) map.jumpTo({ ...overviewCamera(), padding: { top: 0, bottom: 0, left: 0, right: 0 } });
      map.addSource("stories", { type: "geojson", data: geojson });
      // 選到的點外面的光暈
      map.addLayer({
        id: "story-halo",
        type: "circle",
        source: "stories",
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "active"], false], 16, 0],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.22,
          "circle-pitch-alignment": "map",
        },
      });
      // 衛星影像上的深色陰影，讓點從地表浮出來
      map.addLayer({
        id: "story-shadow",
        type: "circle",
        source: "stories",
        layout: { visibility: "none" },
        paint: {
          "circle-radius": 10,
          "circle-color": "#0b1418",
          "circle-blur": 0.8,
          "circle-opacity": ["case", ["boolean", ["feature-state", "dimmed"], false], 0.1, 0.55],
          "circle-pitch-alignment": "map",
        },
      });
      // 極端事件情境：點外面多一圈細圓環
      map.addLayer({
        id: "story-extreme",
        type: "circle",
        source: "stories",
        filter: ["get", "extreme"],
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "active"], false], 12, 9.5],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": EXTREME_COLOR,
          "circle-stroke-width": 1.8,
          "circle-stroke-opacity": ["case", ["boolean", ["feature-state", "dimmed"], false], 0.2, 1],
          "circle-pitch-alignment": "map",
        },
      });
      map.addLayer({
        id: "story-points",
        type: "circle",
        source: "stories",
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["feature-state", "active"], false], 7.5,
            ["boolean", ["feature-state", "hover"], false], 6.5,
            5,
          ],
          "circle-color": ["get", "color"],
          // 極端事件情境：紅色外圈
          "circle-stroke-color": "#fffaf3",
          "circle-stroke-width": 1.6,
          "circle-opacity": ["case", ["boolean", ["feature-state", "dimmed"], false], 0.2, 1],
          "circle-stroke-opacity": ["case", ["boolean", ["feature-state", "dimmed"], false], 0.2, 1],
          "circle-pitch-alignment": "map",
        },
      });

      let hovered = null;
      map.on("mousemove", "story-points", (e) => {
        const f = e.features[0];
        map.getCanvas().style.cursor = "pointer";
        if (hovered !== null && hovered !== f.id) map.setFeatureState({ source: "stories", id: hovered }, { hover: false });
        hovered = f.id;
        map.setFeatureState({ source: "stories", id: hovered }, { hover: true });
        const s = placed[f.id];
        tip.innerHTML = `<strong>${esc(s.title_en)}</strong><span>${flag(s.iso2)}${esc(s.place)}</span>`;
        tip.hidden = false;
        tip.style.transform = `translate(${e.point.x + 14}px, ${e.point.y + 14}px)`;
      });
      map.on("mouseleave", "story-points", () => {
        map.getCanvas().style.cursor = "";
        if (hovered !== null) map.setFeatureState({ source: "stories", id: hovered }, { hover: false });
        hovered = null;
        tip.hidden = true;
      });

      // 點到故事的點 → 打開；點到空白處 → 回到地球全貌（拖曳不算點擊）
      map.on("click", (e) => {
        const hit = map.queryRenderedFeatures(
          [
            [e.point.x - 6, e.point.y - 6],
            [e.point.x + 6, e.point.y + 6],
          ],
          { layers: ["story-points"] }
        )[0];
        if (hit) open(placed[hit.id].id);
        else if (currentId) close();
      });

      setDimmed();
      if (currentId) setActive(currentId);
      setBasemap("satellite");
      loadCountries();
    });

    // ── 底圖切換：地形圖／衛星影像 ──
    const LIGHT_LAYERS = ["landcover", "hillshade", "water", "rivers"];
    const switchEl = root.querySelector(".sm-basemap");
    const legendEl = root.querySelector(".sm-legend");
    const setBasemap = (mode) => {
      const sat = mode === "satellite";
      const crop = mode === "landuse";
      const apply = () => {
        map.setLayoutProperty("satellite", "visibility", sat ? "visible" : "none");
        map.setLayoutProperty("landuse", "visibility", crop ? "visible" : "none");
        // 農地模式：把底下的地表覆蓋顏色拿掉，只留山影，讓農地的綠色清楚
        map.setPaintProperty("landcover", "fill-opacity", crop ? 0 : 0.85);
        if (legendEl) legendEl.hidden = !crop;
        LIGHT_LAYERS.forEach((id) => map.setLayoutProperty(id, "visibility", sat ? "none" : "visible"));
        ["country-labels", "city-labels"].forEach((id) => {
          map.setPaintProperty(id, "text-color", sat ? "#fffaf0" : id === "country-labels" ? "#7d725f" : "#6c6352");
          map.setPaintProperty(id, "text-halo-color", sat ? "rgba(19,30,33,0.75)" : "rgba(255,250,240,0.85)");
        });
        map.setPaintProperty("borders", "line-color", sat ? "rgba(255,250,240,0.7)" : "#9d907b");
        // 故事的點：衛星影像上換成亮色、白邊加粗，底下再墊一圈深色陰影
        if (map.getLayer("story-points")) {
          // 拉遠時（衛星影像半透明、偏淡）用深一點的顏色，拉近後（影像完整）換成亮色
          const fill = sat
            ? ["interpolate", ["linear"], ["zoom"], 3, ["get", "color"], 6, ["get", "satColor"]]
            : ["get", "color"];
          map.setPaintProperty("story-points", "circle-color", fill);
          map.setPaintProperty("story-halo", "circle-color", fill);
          map.setPaintProperty("story-points", "circle-stroke-width", sat ? 2 : 1.6);
          map.setPaintProperty("story-extreme", "circle-stroke-color", sat ? ["interpolate", ["linear"], ["zoom"], 3, EXTREME_COLOR, 6, SAT_EXTREME] : EXTREME_COLOR);
          map.setLayoutProperty("story-shadow", "visibility", sat ? "visible" : "none");
        }
      };
      if (map.isStyleLoaded()) apply();
      else map.once("load", apply);
      switchEl?.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.basemap === mode)));
    };
    // 土地使用圖例：從 LULC_CLASSES 產生，農地排第一個、標粗
    const legendList = root.querySelector(".sm-legend-list");
    if (legendList) {
      legendList.innerHTML = LULC_CLASSES.filter(([v]) => v !== 10)
        .map(([v, name, rgb]) => `<li${v === 5 ? ' class="is-key"' : ""}><span style="background:rgb(${rgb.join(",")})"></span>${name}</li>`)
        .join("");
    }
    switchEl?.addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-basemap]");
      if (b) setBasemap(b.dataset.basemap);
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
      if (map.getSource("stories")) setDimmed();
      close();
    });

    renderIndex();
  }
})();
