const FONT_SANS = "Source Sans 3, Arial, sans-serif";

const FIELD_LAYOUT = {
  xaxis: {
    range: [18, 232],
    zeroline: false,
    showgrid: false,
    title: "",
    showticklabels: false,
    fixedrange: true,
  },
  yaxis: {
    range: [-232, -18],
    zeroline: false,
    showgrid: false,
    title: "",
    showticklabels: false,
    fixedrange: true,
    scaleanchor: "x",
    scaleratio: 1,
  },
  margin: { l: 20, r: 20, t: 30, b: 20 },
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  showlegend: true,
  legend: { orientation: "h", x: 0, y: 1.1, font: { family: FONT_SANS } },
  shapes: [
    {
      type: "line",
      x0: 128,
      y0: -208,
      x1: 33,
      y1: -100,
      line: { color: "rgba(47,111,154,0.58)", width: 2.2 },
    },
    {
      type: "line",
      x0: 128,
      y0: -208,
      x1: 223,
      y1: -100,
      line: { color: "rgba(47,111,154,0.58)", width: 2.2 },
    },
    {
      type: "path",
      path: "M 33 -100 C 60 -15, 196 -15, 223 -100",
      line: { color: "rgba(47,111,154,0.55)", width: 2.5 },
    },
    {
      type: "path",
      path: "M 83 -155 C 106 -138, 150 -138, 173 -156",
      line: { color: "rgba(47,111,154,0.28)", width: 1.8, dash: "dot" },
    },
    {
      type: "rect",
      x0: 123.5,
      y0: -214.5,
      x1: 132.5,
      y1: -205.5,
      line: { color: "rgba(31,42,36,0.5)", width: 1 },
      fillcolor: "rgba(255,255,255,0.12)",
    },
    {
      type: "line",
      x0: 123.5,
      y0: -214.5,
      x1: 123.5,
      y1: -208,
      line: { color: "rgba(31,42,36,0.38)", width: 1 },
    },
    {
      type: "line",
      x0: 132.5,
      y0: -214.5,
      x1: 132.5,
      y1: -208,
      line: { color: "rgba(31,42,36,0.38)", width: 1 },
    },
    {
      type: "line",
      x0: 123.5,
      y0: -214.5,
      x1: 132.5,
      y1: -214.5,
      line: { color: "rgba(31,42,36,0.38)", width: 1 },
    },
  ],
};

const EVENT_TYPES = ["Out", "Single", "Double", "Advancements", "Home Run", "Other", "Triple"];
const GAME_PHASES = ["1-3 Innings", "4-6 Innings", "7-8 Innings", "9 Innings", "Extra Innings"];
const SITUATIONS = ["Bases Empty", "Runner on First", "Scoring Position", "Bases Loaded"];
const SCENARIOS = [
  "Behind by 1-3",
  "Behind by 4-6",
  "Tie",
  "Behind by 7+",
  "Lead by 1-3",
  "Lead by 4-6",
  "Lead by 7+",
];
const Y_AXIS_OPTIONS = ["avg_BA", "avg_woba", "avg_iso", "avg_hard_hit_pct"];
const PITCH_COLORS = [
  "#5b8c5a",
  "#c97c3d",
  "#7a8f5c",
  "#8f5a4a",
  "#b79b5f",
  "#6f6a4f",
  "#a96d57",
  "#4b5f67",
];
const COUNT_COLORS = [
  "#5b8c5a",
  "#c97c3d",
  "#7a8f5c",
  "#8f5a4a",
  "#b79b5f",
  "#6f6a4f",
  "#a96d57",
  "#4b5f67",
  "#b14a3d",
];

const state = {
  rows: [],
  filters: {
    dateStartIndex: 0,
    dateEndIndex: 0,
    player: "All",
    gamePhases: [...GAME_PHASES],
    situations: [...SITUATIONS],
    events: [...EVENT_TYPES],
    scenarios: [...SCENARIOS],
    yAxisVar: "avg_BA",
  },
  meta: {
    minDate: "",
    maxDate: "",
  },
};

const el = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindUI();
  loadData().catch((error) => {
    console.error(error);
    showError(error);
  });
});

function bindElements() {
  [
    "playerFilter",
    "gamePhaseFilter",
    "situationFilter",
    "eventsFilter",
    "scenarioFilter",
    "yAxisVar",
    "resetFilters",
    "loading",
    "dateStartRange",
    "dateEndRange",
    "dateStartLabel",
    "dateEndLabel",
    "dateTrack",
    "pitchChartSubtitle",
    "plateChartSubtitle",
    "sprayByStand",
    "sprayBySituation",
    "launchBySituation",
    "launchByPitch",
    "sprayByLaunch",
    "directionBox",
    "directionSpray",
    "monthlyPitchPerformance",
    "countPerformance",
  ].forEach((id) => {
    el[id] = document.getElementById(id);
  });
}

function bindUI() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      const panel = document.getElementById(button.dataset.tab);
      if (panel) panel.classList.add("active");
    });
  });

  el.dateStartRange.addEventListener("input", () => {
    state.filters.dateStartIndex = Math.min(
      parseInt(el.dateStartRange.value, 10),
      state.filters.dateEndIndex
    );
    if (state.filters.dateStartIndex > state.filters.dateEndIndex) {
      state.filters.dateEndIndex = state.filters.dateStartIndex;
    }
    render();
  });

  el.dateEndRange.addEventListener("input", () => {
    state.filters.dateEndIndex = Math.max(
      parseInt(el.dateEndRange.value, 10),
      state.filters.dateStartIndex
    );
    if (state.filters.dateEndIndex < state.filters.dateStartIndex) {
      state.filters.dateStartIndex = state.filters.dateEndIndex;
    }
    render();
  });

  el.playerFilter.addEventListener("change", () => {
    state.filters.player = el.playerFilter.value;
    render();
  });

  document.querySelectorAll("[data-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.toggle;
      if (button.dataset.action === "all") {
        state.filters[key] = [...getFilterValues(key)];
      }
      render();
    });
  });

  document.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    const key = chip.dataset.filterKey;
    const value = chip.dataset.filterValue;
    const current = new Set(state.filters[key] || []);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    state.filters[key] = [...current];
    render();
  });

  el.yAxisVar.addEventListener("change", () => {
    state.filters.yAxisVar = el.yAxisVar.value;
    render();
  });

  el.resetFilters.addEventListener("click", () => {
    resetFilters();
    render();
  });
}

async function loadData() {
  const response = await fetch("./WSH_Batter_2019_Full.csv");
  if (!response.ok) {
    throw new Error(`Failed to load CSV: ${response.status}`);
  }
  const csvText = await response.text();
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  state.rows = parsed.data
    .map(deriveRow)
    .filter((row) => row && row.game_date);

  if (!state.rows.length) {
    throw new Error("No usable rows found after parsing.");
  }

  state.rows.sort((a, b) => a.game_date.localeCompare(b.game_date));
  state.meta.dates = uniqueSorted(state.rows.map((row) => row.game_date));
  state.meta.minDate = state.meta.dates[0];
  state.meta.maxDate = state.meta.dates[state.meta.dates.length - 1];

  bootstrapControls();
  resetFilters();
  render();
  el.loading.classList.add("hidden");
}

function bootstrapControls() {
  const players = uniqueSorted(state.rows.map((row) => row.player_name).filter(Boolean));
  fillSelect(el.playerFilter, ["All", ...players], ["All"], false);
  fillSelect(el.yAxisVar, Y_AXIS_OPTIONS, [state.filters.yAxisVar], false);
  renderChipGroup(el.gamePhaseFilter, GAME_PHASES, state.filters.gamePhases, "gamePhases");
  renderChipGroup(el.situationFilter, SITUATIONS, state.filters.situations, "situations");
  renderChipGroup(el.eventsFilter, EVENT_TYPES, state.filters.events, "events");
  renderChipGroup(el.scenarioFilter, SCENARIOS, state.filters.scenarios, "scenarios");

  el.dateStartRange.min = 0;
  el.dateStartRange.max = Math.max(state.meta.dates.length - 1, 0);
  el.dateStartRange.step = 1;
  el.dateEndRange.min = 0;
  el.dateEndRange.max = Math.max(state.meta.dates.length - 1, 0);
  el.dateEndRange.step = 1;
}

function resetFilters() {
  state.filters.dateStartIndex = 0;
  state.filters.dateEndIndex = Math.max(state.meta.dates.length - 1, 0);
  state.filters.player = "All";
  state.filters.gamePhases = [...GAME_PHASES];
  state.filters.situations = [...SITUATIONS];
  state.filters.events = [...EVENT_TYPES];
  state.filters.scenarios = [...SCENARIOS];
  state.filters.yAxisVar = "avg_BA";

  el.dateStartRange.value = String(state.filters.dateStartIndex);
  el.dateEndRange.value = String(state.filters.dateEndIndex);
  el.playerFilter.value = state.filters.player;
  el.yAxisVar.value = state.filters.yAxisVar;
  renderChipGroup(el.gamePhaseFilter, GAME_PHASES, state.filters.gamePhases, "gamePhases");
  renderChipGroup(el.situationFilter, SITUATIONS, state.filters.situations, "situations");
  renderChipGroup(el.eventsFilter, EVENT_TYPES, state.filters.events, "events");
  renderChipGroup(el.scenarioFilter, SCENARIOS, state.filters.scenarios, "scenarios");
  updateDateLabels();
}

function render() {
  const filteredRows = filterRows(state.rows, state.filters);
  const pitchSummary = summarizeByPitchMonth(filteredRows);
  const countSummary = summarizeByCountMonth(filteredRows);

  renderChipGroup(el.gamePhaseFilter, GAME_PHASES, state.filters.gamePhases, "gamePhases");
  renderChipGroup(el.situationFilter, SITUATIONS, state.filters.situations, "situations");
  renderChipGroup(el.eventsFilter, EVENT_TYPES, state.filters.events, "events");
  renderChipGroup(el.scenarioFilter, SCENARIOS, state.filters.scenarios, "scenarios");
  el.playerFilter.value = state.filters.player;

  el.pitchChartSubtitle.textContent = `Showing ${filteredRows.length} filtered rows with ${state.filters.yAxisVar} on the y-axis.`;
  el.plateChartSubtitle.textContent = `Showing ${filteredRows.length} filtered rows with ${state.filters.yAxisVar} on the y-axis.`;

  renderSprayCharts(filteredRows);
  renderLaunchCharts(filteredRows);
  renderDirectionCharts(filteredRows);
  renderMonthlyPerformance(pitchSummary, state.filters.yAxisVar);
  renderCountPerformance(countSummary, state.filters.yAxisVar);
  updateDateLabels();
}

function getFilterValues(key) {
  switch (key) {
    case "gamePhases":
      return GAME_PHASES;
    case "situations":
      return SITUATIONS;
    case "events":
      return EVENT_TYPES;
    case "scenarios":
      return SCENARIOS;
    default:
      return [];
  }
}

function deriveRow(raw) {
  const gameDate = raw.game_date || "";
  if (!gameDate) return null;

  const launchSpeed = toNumber(raw.launch_speed);
  const launchAngle = toNumber(raw.launch_angle);
  const hcX = toNumber(raw.hc_x);
  const hcY = toNumber(raw.hc_y);
  const balls = toInteger(raw.balls);
  const strikes = toInteger(raw.strikes);
  const inning = toInteger(raw.inning);
  const batScoreDiff = toNumber(raw.bat_score_diff);
  const deltaRunExp = toNumber(raw.delta_run_exp);
  const wobaValue = toNumber(raw.woba_value);
  const isoValue = toNumber(raw.iso_value);
  const pitchName = raw.pitch_name || "Unknown";
  const events = raw.events || "";
  const stand = raw.stand || "Unknown";

  const situation = classifySituation(raw.on_1b, raw.on_2b, raw.on_3b);
  const gamePhase = classifyGamePhase(inning);
  const count = `${Number.isFinite(balls) ? balls : ""}-${Number.isFinite(strikes) ? strikes : ""}`;
  const hardHit = Number.isFinite(launchSpeed) && launchSpeed >= 95 ? "Hard Hit" : "No";
  const spray = computeSpray(hcX, hcY);
  const batLocation = classifyBatLocation(spray.angle);
  const batDirection = classifyBatDirection(stand, batLocation);
  const eventType = classifyEventType(events);
  const scenario = classifyScenario(batScoreDiff);

  return {
    player_name: raw.player_name || "Unknown",
    stand,
    game_date: gameDate,
    month: gameDate.slice(0, 7),
    events,
    bb_type: raw.bb_type || "",
    count,
    situation,
    outs_when_up: toInteger(raw.outs_when_up),
    game_phase: gamePhase,
    bat_score_diff: batScoreDiff,
    pitch_name: pitchName,
    hc_x: hcX,
    hc_y: hcY,
    launch_speed: launchSpeed,
    launch_angle: launchAngle,
    hard_hit: hardHit,
    woba_value: wobaValue,
    iso_value: isoValue,
    delta_run_exp: deltaRunExp,
    delta_home_win_exp: toNumber(raw.delta_home_win_exp),
    spray_angle: spray.angle,
    bat_location: batLocation,
    bat_direction: batDirection,
    event_type: eventType,
    scenario,
    is_hit: ["Single", "Double", "Triple", "Home Run"].includes(eventType) ? 1 : 0,
    is_at_bat: isAtBat(events, eventType) ? 1 : 0,
  };
}

function isAtBat(eventName, eventType) {
  const excluded = new Set([
    "walk",
    "intent_walk",
    "hit_by_pitch",
    "sac_fly",
    "sac_bunt",
    "truncated_pa",
    "catcher_interf",
  ]);
  if (excluded.has(eventName)) return false;
  if (eventType === "Advancements") {
    return false;
  }
  return true;
}

function classifySituation(on1, on2, on3) {
  const first = isPresent(on1);
  const second = isPresent(on2);
  const third = isPresent(on3);
  if (!first && !second && !third) return "Bases Empty";
  if (first && !second && !third) return "Runner on First";
  if (first && second && third) return "Bases Loaded";
  if (second || third) return "Scoring Position";
  return "Other";
}

function classifyGamePhase(inning) {
  if (inning >= 1 && inning <= 3) return "1-3 Innings";
  if (inning >= 4 && inning <= 6) return "4-6 Innings";
  if (inning >= 7 && inning <= 8) return "7-8 Innings";
  if (inning === 9) return "9 Innings";
  if (inning > 9) return "Extra Innings";
  return "Unknown";
}

function classifyEventType(events) {
  switch (events) {
    case "single":
      return "Single";
    case "double":
      return "Double";
    case "triple":
      return "Triple";
    case "home_run":
      return "Home Run";
    case "strikeout":
    case "field_out":
    case "force_out":
    case "strikeout_double_play":
    case "double_play":
    case "sac_fly_double_play":
    case "grounded_into_double_play":
    case "fielders_choice_out":
      return "Out";
    case "sac_fly":
    case "sac_bunt":
    case "hit_by_pitch":
    case "walk":
    case "truncated_pa":
      return "Advancements";
    case "field_error":
    case "fielders_choice":
      return "Other";
    default:
      return "Unknown";
  }
}

function classifyScenario(scoreDiff) {
  if (!Number.isFinite(scoreDiff)) return "Unknown";
  if (scoreDiff === 0) return "Tie";
  if (scoreDiff > 0 && scoreDiff <= 3) return "Lead by 1-3";
  if (scoreDiff > 3 && scoreDiff <= 6) return "Lead by 4-6";
  if (scoreDiff > 6) return "Lead by 7+";
  if (scoreDiff < 0 && scoreDiff >= -3) return "Behind by 1-3";
  if (scoreDiff < -3 && scoreDiff >= -6) return "Behind by 4-6";
  if (scoreDiff < -6) return "Behind by 7+";
  return "Unknown";
}

function computeSpray(hcX, hcY) {
  if (!Number.isFinite(hcX) || !Number.isFinite(hcY)) {
    return { angle: null };
  }
  const dx = hcX - 130;
  const dy = 210 - hcY;
  const original = Math.atan(dy / dx) * (180 / Math.PI);
  const angle =
    original < 0 ? -(90 - Math.abs(original)) : 90 - Math.abs(original);
  return { angle };
}

function classifyBatLocation(angle) {
  if (!Number.isFinite(angle)) return "Unknown";
  if (angle <= -30) return "Left";
  if (angle > -30 && angle <= -15) return "Left-Center";
  if (angle > -15 && angle <= 0) return "Center-Left";
  if (angle > 0 && angle <= 15) return "Center-Right";
  if (angle > 15 && angle <= 30) return "Right-Center";
  return "Right";
}

function classifyBatDirection(stand, location) {
  if (location === "Unknown") return "Unknown";
  if (location === "Center-Left" || location === "Center-Right") return "Center";
  if (stand === "L" && (location === "Right" || location === "Right-Center")) return "Pull";
  if (stand === "L" && (location === "Left" || location === "Left-Center")) return "Opposite";
  if (stand === "R" && (location === "Left" || location === "Left-Center")) return "Pull";
  if (stand === "R" && (location === "Right" || location === "Right-Center")) return "Opposite";
  return "Unknown";
}

function filterRows(rows, filters) {
  const startDate = state.meta.dates?.[filters.dateStartIndex] || state.meta.minDate;
  const endDate = state.meta.dates?.[filters.dateEndIndex] || state.meta.maxDate;
  return rows.filter((row) => {
    if (startDate && row.game_date < startDate) return false;
    if (endDate && row.game_date > endDate) return false;
    if (filters.player && filters.player !== "All" && row.player_name !== filters.player) return false;
    if (filters.gamePhases.length && !filters.gamePhases.includes(row.game_phase)) return false;
    if (filters.situations.length && !filters.situations.includes(row.situation)) return false;
    if (filters.events.length && !filters.events.includes(row.event_type)) return false;
    if (filters.scenarios.length && !filters.scenarios.includes(row.scenario)) return false;
    return true;
  });
}

function summarizeByPitchMonth(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = `${row.pitch_name}|||${row.month}`;
    if (!map.has(key)) {
      map.set(key, {
        pitch_name: row.pitch_name,
        month: row.month,
        counts: 0,
        total_hits: 0,
        total_at_bats: 0,
        woba_sum: 0,
        woba_n: 0,
        iso_sum: 0,
        iso_n: 0,
        hard_hit_count: 0,
      });
    }
    const bucket = map.get(key);
    bucket.counts += 1;
    bucket.total_hits += row.is_hit;
    bucket.total_at_bats += row.is_at_bat;
    if (Number.isFinite(row.woba_value)) {
      bucket.woba_sum += row.woba_value;
      bucket.woba_n += 1;
    }
    if (Number.isFinite(row.iso_value)) {
      bucket.iso_sum += row.iso_value;
      bucket.iso_n += 1;
    }
    bucket.hard_hit_count += row.hard_hit === "Hard Hit" ? 1 : 0;
  });

  return [...map.values()]
    .map((bucket) => {
      const avg_BA = bucket.total_at_bats > 0 ? bucket.total_hits / bucket.total_at_bats : null;
      const avg_woba = bucket.woba_n > 0 ? bucket.woba_sum / bucket.woba_n : null;
      const avg_iso = bucket.iso_n > 0 ? bucket.iso_sum / bucket.iso_n : null;
      const avg_hard_hit_pct = bucket.counts > 0 ? bucket.hard_hit_count / bucket.counts : null;

      return {
        ...bucket,
        avg_BA,
        avg_woba,
        avg_iso,
        avg_hard_hit_pct,
        hover_text: [
          `Pitch Type: ${bucket.pitch_name}`,
          `Month: ${bucket.month}`,
          `Count: ${bucket.counts}`,
          `Avg BA: ${formatMaybe(avg_BA)}`,
          `Avg Hard Hit%: ${formatMaybe(avg_hard_hit_pct, 1)}`,
          `Avg wOBA: ${formatMaybe(avg_woba)}`,
          `Avg ISO: ${formatMaybe(avg_iso)}`,
        ].join("<br>"),
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month) || a.pitch_name.localeCompare(b.pitch_name));
}

function summarizeByCountMonth(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = `${row.count}|||${row.month}`;
    if (!map.has(key)) {
      map.set(key, {
        count: row.count,
        month: row.month,
        counts: 0,
        total_hits: 0,
        total_at_bats: 0,
        woba_sum: 0,
        woba_n: 0,
        iso_sum: 0,
        iso_n: 0,
        hard_hit_count: 0,
      });
    }
    const bucket = map.get(key);
    bucket.counts += 1;
    bucket.total_hits += row.is_hit;
    bucket.total_at_bats += row.is_at_bat;
    if (Number.isFinite(row.woba_value)) {
      bucket.woba_sum += row.woba_value;
      bucket.woba_n += 1;
    }
    if (Number.isFinite(row.iso_value)) {
      bucket.iso_sum += row.iso_value;
      bucket.iso_n += 1;
    }
    bucket.hard_hit_count += row.hard_hit === "Hard Hit" ? 1 : 0;
  });

  return [...map.values()]
    .map((bucket) => {
      const avg_BA = bucket.total_at_bats > 0 ? bucket.total_hits / bucket.total_at_bats : null;
      const avg_woba = bucket.woba_n > 0 ? bucket.woba_sum / bucket.woba_n : null;
      const avg_iso = bucket.iso_n > 0 ? bucket.iso_sum / bucket.iso_n : null;
      const avg_hard_hit_pct = bucket.counts > 0 ? bucket.hard_hit_count / bucket.counts : null;

      return {
        ...bucket,
        avg_BA,
        avg_woba,
        avg_iso,
        avg_hard_hit_pct,
        hover_text: [
          `Pitch Count: ${bucket.count}`,
          `Month: ${bucket.month}`,
          `Numbers: ${bucket.counts}`,
          `Avg BA: ${formatMaybe(avg_BA)}`,
          `Avg Hard Hit%: ${formatMaybe(avg_hard_hit_pct, 1)}`,
          `Avg wOBA: ${formatMaybe(avg_woba)}`,
          `Avg ISO: ${formatMaybe(avg_iso)}`,
        ].join("<br>"),
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month) || a.count.localeCompare(b.count));
}

function renderSprayCharts(rows) {
  const byStand = groupBy(rows, (row) => row.stand || "Unknown");
  const standTraces = buildScatterTraces(byStand, {
    xKey: "hc_x",
    yKey: "hc_y",
    colorPalette: PITCH_COLORS,
    transformY: (value) => (Number.isFinite(value) ? -value : value),
    hoverBuilder: (row) =>
      [
        `Player: ${row.player_name}`,
        `Date: ${row.game_date}`,
        `Pitch: ${row.pitch_name}`,
        `Event: ${row.event_type}`,
        `Result: ${row.events}`,
        `Launch Speed: ${formatMaybe(row.launch_speed, 1)} mph`,
        `Launch Angle: ${formatMaybe(row.launch_angle, 1)}°`,
        `Situation: ${row.situation}`,
        `Count: ${row.count}`,
        `Direction: ${row.bat_direction}`,
        `Hard Hit: ${row.hard_hit}`,
      ].join("<br>"),
  });
  Plotly.react(
    el.sprayByStand,
    standTraces,
    {
      ...FIELD_LAYOUT,
      margin: { l: 10, r: 10, t: 10, b: 10 },
      xaxis: { ...FIELD_LAYOUT.xaxis, title: "" },
      yaxis: { ...FIELD_LAYOUT.yaxis, title: "" },
      legend: { orientation: "h", x: 0, y: 1.08 },
    },
    plotConfig()
  );

  const bySituation = groupBy(rows, (row) => row.situation || "Unknown");
  const situationTraces = buildScatterTraces(bySituation, {
    xKey: "hc_x",
    yKey: "hc_y",
    colorPalette: PITCH_COLORS,
    transformY: (value) => (Number.isFinite(value) ? -value : value),
    hoverBuilder: (row) =>
      [
        `Player: ${row.player_name}`,
        `Date: ${row.game_date}`,
        `Pitch: ${row.pitch_name}`,
        `Event: ${row.event_type}`,
        `Result: ${row.events}`,
        `Launch Speed: ${formatMaybe(row.launch_speed, 1)} mph`,
        `Launch Angle: ${formatMaybe(row.launch_angle, 1)}°`,
        `Situation: ${row.situation}`,
        `Count: ${row.count}`,
        `Direction: ${row.bat_direction}`,
        `Hard Hit: ${row.hard_hit}`,
      ].join("<br>"),
  });
  Plotly.react(
    el.sprayBySituation,
    situationTraces,
    {
      ...FIELD_LAYOUT,
      margin: { l: 10, r: 10, t: 10, b: 10 },
      xaxis: { ...FIELD_LAYOUT.xaxis, title: "" },
      yaxis: { ...FIELD_LAYOUT.yaxis, title: "" },
      legend: { orientation: "h", x: 0, y: 1.08 },
    },
    plotConfig()
  );
}

function renderLaunchCharts(rows) {
  const bySituation = groupBy(rows, (row) => row.situation || "Unknown");
  const launchSituationTraces = [];
  let situationIndex = 0;
  for (const [name, group] of bySituation.entries()) {
    const points = group.filter((row) => isFiniteNumber(row.launch_angle) && isFiniteNumber(row.launch_speed));
    launchSituationTraces.push({
      x: points.map((row) => row.launch_angle),
      y: points.map((row) => row.launch_speed),
      type: "scatter",
      mode: "markers",
      name,
      cliponaxis: false,
      marker: { size: 6, opacity: 0.4, color: PITCH_COLORS[situationIndex % PITCH_COLORS.length] },
      hovertemplate:
        "Player: %{customdata[0]}<br>Launch Angle: %{x:.1f}<br>Launch Speed: %{y:.1f}<extra></extra>",
      customdata: points.map((row) => [row.player_name]),
    });
    const line = linearRegression(points, "launch_angle", "launch_speed");
    if (line) {
      launchSituationTraces.push({
        x: line.x,
        y: line.y,
        type: "scatter",
        mode: "lines",
        name: `${name} trend`,
        line: { color: PITCH_COLORS[situationIndex % PITCH_COLORS.length], width: 2 },
        hoverinfo: "skip",
        showlegend: false,
      });
    }
    situationIndex += 1;
  }
  Plotly.react(
    el.launchBySituation,
    launchSituationTraces,
    simpleChartLayout({
      xaxis: { title: "Launch Angle (degrees)", fixedrange: true },
      yaxis: { title: "Launch Speed (mph)", fixedrange: true },
    }),
    plotConfig()
  );

  const byPitch = groupBy(rows, (row) => row.pitch_name || "Unknown");
  const launchPitchTraces = [];
  let pitchIndex = 0;
  for (const [name, group] of byPitch.entries()) {
    const points = group.filter((row) => isFiniteNumber(row.launch_angle) && isFiniteNumber(row.launch_speed));
    launchPitchTraces.push({
      x: points.map((row) => row.launch_angle),
      y: points.map((row) => row.launch_speed),
      type: "scatter",
      mode: "markers",
      name,
      cliponaxis: false,
      marker: { size: 6, opacity: 0.4, color: PITCH_COLORS[pitchIndex % PITCH_COLORS.length] },
      hovertemplate:
        "Player: %{customdata[0]}<br>Launch Angle: %{x:.1f}<br>Launch Speed: %{y:.1f}<extra></extra>",
      customdata: points.map((row) => [row.player_name]),
    });
    const line = linearRegression(points, "launch_angle", "launch_speed");
    if (line) {
      launchPitchTraces.push({
        x: line.x,
        y: line.y,
        type: "scatter",
        mode: "lines",
        name: `${name} trend`,
        line: { color: PITCH_COLORS[pitchIndex % PITCH_COLORS.length], width: 2 },
        hoverinfo: "skip",
        showlegend: false,
      });
    }
    pitchIndex += 1;
  }
  Plotly.react(
    el.launchByPitch,
    launchPitchTraces,
    simpleChartLayout({
      xaxis: { title: "Launch Angle (degrees)", fixedrange: true },
      yaxis: { title: "Launch Speed (mph)", fixedrange: true },
    }),
    plotConfig()
  );

  const byLaunchAngle = groupBy(rows, (row) => row.stand || "Unknown");
  const launchSprayTraces = [];
  let launchIndex = 0;
  for (const [name, group] of byLaunchAngle.entries()) {
    const points = group.filter((row) => isFiniteNumber(row.hc_x) && isFiniteNumber(row.hc_y) && isFiniteNumber(row.launch_angle));
    launchSprayTraces.push({
      x: points.map((row) => row.hc_x),
      y: points.map((row) => -row.hc_y),
      type: "scatter",
      mode: "markers",
      name,
      cliponaxis: false,
      marker: {
        size: 6,
        opacity: 0.45,
        color: points.map((row) => row.launch_angle),
        colorscale: [
          [0, "#f8e39c"],
          [0.35, "#e39d46"],
          [0.7, "#c96b3e"],
          [1, "#8f3b35"],
        ],
        cmin: -40,
        cmax: 50,
        showscale: launchIndex === 0,
        colorbar:
          launchIndex === 0
            ? {
                title: "Launch angle",
                titleside: "right",
              }
            : undefined,
      },
      hovertemplate:
        "Player: %{customdata[0]}<br>Launch Angle: %{marker.color:.1f}<br>Hard Hit: %{customdata[1]}<extra></extra>",
      customdata: points.map((row) => [row.player_name, row.hard_hit]),
      showlegend: launchIndex < 3,
    });
    launchIndex += 1;
  }
  Plotly.react(
    el.sprayByLaunch,
    launchSprayTraces,
    {
      ...FIELD_LAYOUT,
      margin: { l: 10, r: 10, t: 10, b: 10 },
      xaxis: { ...FIELD_LAYOUT.xaxis, title: "" },
      yaxis: { ...FIELD_LAYOUT.yaxis, title: "" },
      legend: { orientation: "h", x: 0, y: 1.08 },
    },
    plotConfig()
  );
}

function renderDirectionCharts(rows) {
  const byDirection = groupBy(
    rows.filter((row) => row.bat_direction && row.bat_direction !== "Unknown"),
    (row) => row.bat_direction
  );
  const boxTraces = [];
  let directionIndex = 0;
  for (const [name, group] of byDirection.entries()) {
    boxTraces.push({
      y: group.map((row) => row.delta_run_exp).filter(isFiniteNumber),
      type: "box",
      name,
      boxmean: true,
      marker: { color: PITCH_COLORS[directionIndex % PITCH_COLORS.length] },
      fillcolor: PITCH_COLORS[directionIndex % PITCH_COLORS.length],
      opacity: 0.65,
      hovertemplate: "%{y:.3f}<extra></extra>",
    });
    directionIndex += 1;
  }
  Plotly.react(
    el.directionBox,
    boxTraces,
    simpleChartLayout({
      yaxis: { title: "Delta Run Expectancy", fixedrange: true },
      xaxis: { title: "Batted Direction", fixedrange: true },
    }),
    plotConfig()
  );

  const byHardHit = groupBy(rows, (row) => `${row.stand || "Unknown"} / ${row.hard_hit || "Unknown"}`);
  const sprayTraces = [];
  let hardHitIndex = 0;
  for (const [name, group] of byHardHit.entries()) {
    const points = group.filter((row) => isFiniteNumber(row.hc_x) && isFiniteNumber(row.hc_y));
    sprayTraces.push({
      x: points.map((row) => row.hc_x),
      y: points.map((row) => -row.hc_y),
      type: "scatter",
      mode: "markers",
      name,
      cliponaxis: false,
      marker: { size: 6, opacity: 0.45, color: PITCH_COLORS[hardHitIndex % PITCH_COLORS.length] },
      hovertemplate:
        "Player: %{customdata[0]}<br>Direction: %{customdata[1]}<br>Hard Hit: %{customdata[2]}<extra></extra>",
      customdata: points.map((row) => [row.player_name, row.bat_direction, row.hard_hit]),
      showlegend: hardHitIndex < 4,
    });
    hardHitIndex += 1;
  }
  Plotly.react(
    el.directionSpray,
    sprayTraces,
    {
      ...FIELD_LAYOUT,
      margin: { l: 10, r: 10, t: 10, b: 10 },
      xaxis: { ...FIELD_LAYOUT.xaxis, title: "" },
      yaxis: { ...FIELD_LAYOUT.yaxis, title: "" },
      legend: { orientation: "h", x: 0, y: 1.08 },
    },
    plotConfig()
  );
}

function renderMonthlyPerformance(summary, metric) {
  const groups = groupBy(summary, (row) => row.pitch_name || "Unknown");
  const traces = [];
  let index = 0;
  for (const [name, group] of groups.entries()) {
    traces.push({
      x: group.map((row) => row.month),
      y: group.map((row) => row[metric]),
      type: "scatter",
      mode: "lines+markers",
      name,
      line: { color: PITCH_COLORS[index % PITCH_COLORS.length], width: 2 },
      marker: { size: 7 },
      text: group.map((row) => row.hover_text),
      hovertemplate: "%{text}<extra></extra>",
    });
    index += 1;
  }
  Plotly.react(
    el.monthlyPitchPerformance,
    traces,
    simpleChartLayout({
      xaxis: { title: "Month", fixedrange: true },
      yaxis: { title: prettyMetric(metric), fixedrange: true },
    }),
    plotConfig()
  );
}

function renderCountPerformance(summary, metric) {
  const groups = groupBy(summary, (row) => row.count || "Unknown");
  const traces = [];
  let index = 0;
  for (const [name, group] of groups.entries()) {
    traces.push({
      x: group.map((row) => row.month),
      y: group.map((row) => row[metric]),
      type: "scatter",
      mode: "lines+markers",
      name,
      line: { color: COUNT_COLORS[index % COUNT_COLORS.length], width: 2 },
      marker: { size: 7 },
      text: group.map((row) => row.hover_text),
      hovertemplate: "%{text}<extra></extra>",
    });
    index += 1;
  }
  Plotly.react(
    el.countPerformance,
    traces,
    simpleChartLayout({
      xaxis: { title: "Month", fixedrange: true },
      yaxis: { title: prettyMetric(metric), fixedrange: true },
    }),
    plotConfig()
  );
}

function buildScatterTraces(groupMap, options) {
  const traces = [];
  let index = 0;
  for (const [name, group] of groupMap.entries()) {
    const points = group.filter((row) => isFiniteNumber(row[options.xKey]) && isFiniteNumber(row[options.yKey]));
    traces.push({
      x: points.map((row) => row[options.xKey]),
      y: points.map((row) => options.transformY(row[options.yKey])),
      type: "scatter",
      mode: "markers",
      name,
      cliponaxis: false,
      marker: {
        size: 7,
        opacity: 0.72,
        color: options.colorPalette[index % options.colorPalette.length],
        line: { color: "rgba(255,255,255,0.55)", width: 0.5 },
      },
      text: points.map((row) => options.hoverBuilder(row)),
      hovertemplate: "%{text}<extra></extra>",
      hoverlabel: {
        bgcolor: "rgba(63,43,34,0.95)",
        bordercolor: "rgba(255,255,255,0.24)",
        font: { color: "#fff8ef", family: FONT_SANS, size: 12 },
      },
    });
    index += 1;
  }
  return traces;
}

function linearRegression(rows, xKey, yKey) {
  const points = rows.filter((row) => isFiniteNumber(row[xKey]) && isFiniteNumber(row[yKey]));
  if (points.length < 2) return null;
  const xs = points.map((row) => row[xKey]);
  const ys = points.map((row) => row[yKey]);
  const n = points.length;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY);
    denominator += (xs[i] - meanX) ** 2;
  }
  if (denominator === 0) return null;
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  return {
    x: [minX, maxX],
    y: [slope * minX + intercept, slope * maxX + intercept],
  };
}

function simpleChartLayout(overrides = {}) {
  return {
    title: { text: "", font: { size: 1 } },
    margin: { l: 60, r: 20, t: 55, b: 50 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(255,255,255,0.35)",
    legend: { orientation: "h", x: 0, y: 1.12, font: { family: FONT_SANS } },
    xaxis: {
      showgrid: true,
      gridcolor: "rgba(31,42,36,0.08)",
      zeroline: false,
      fixedrange: true,
      ...overrides.xaxis,
    },
    yaxis: {
      showgrid: true,
      gridcolor: "rgba(31,42,36,0.08)",
      zeroline: false,
      fixedrange: true,
      ...overrides.yaxis,
    },
  };
}

function updateDateLabels() {
  const dates = state.meta.dates || [];
  const startDate = dates[state.filters.dateStartIndex] || state.meta.minDate || "-";
  const endDate = dates[state.filters.dateEndIndex] || state.meta.maxDate || "-";
  if (el.dateStartLabel) el.dateStartLabel.textContent = startDate;
  if (el.dateEndLabel) el.dateEndLabel.textContent = endDate;
  if (el.dateStartRange) el.dateStartRange.value = String(state.filters.dateStartIndex);
  if (el.dateEndRange) el.dateEndRange.value = String(state.filters.dateEndIndex);
  if (el.dateTrack && dates.length > 1) {
    const left = (state.filters.dateStartIndex / (dates.length - 1)) * 100;
    const right = (state.filters.dateEndIndex / (dates.length - 1)) * 100;
    el.dateTrack.style.background = `linear-gradient(90deg,
      rgba(47, 111, 154, 0.18) 0%,
      rgba(47, 111, 154, 0.18) ${left}%,
      rgba(47, 111, 154, 0.72) ${left}%,
      rgba(47, 111, 154, 0.72) ${right}%,
      rgba(47, 111, 154, 0.18) ${right}%,
      rgba(47, 111, 154, 0.18) 100%)`;
  } else if (el.dateTrack) {
    el.dateTrack.style.background = "linear-gradient(90deg, rgba(47, 111, 154, 0.22), rgba(47, 111, 154, 0.22))";
  }
}

function plotConfig() {
  return {
    displayModeBar: false,
    responsive: true,
  };
}

function groupBy(rows, getKey) {
  const map = new Map();
  rows.forEach((row) => {
    const key = getKey(row) || "Unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  });
  return map;
}

function fillSelect(selectEl, values, selectedValues, includeEmpty = true) {
  const options = includeEmpty ? [...values] : values;
  selectEl.innerHTML = options
    .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
    .join("");
  setSelectedOptions(selectEl, selectedValues);
}

function setSelectedOptions(selectEl, selectedValues) {
  const selectedSet = new Set(selectedValues);
  Array.from(selectEl.options).forEach((option) => {
    option.selected = selectedSet.has(option.value);
  });
}

function renderChipGroup(container, values, selectedValues, key) {
  if (!container) return;
  const selected = new Set(selectedValues);
  container.innerHTML = values
    .map(
      (value) => `
        <button
          type="button"
          class="chip${selected.has(value) ? " active" : ""}"
          data-filter-key="${escapeHtml(key)}"
          data-filter-value="${escapeHtml(value)}"
        >${escapeHtml(value)}</button>`
    )
    .join("");
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return NaN;
  const num = Number(value);
  return Number.isFinite(num) ? num : NaN;
}

function toInteger(value) {
  if (value === null || value === undefined || value === "") return NaN;
  const num = parseInt(value, 10);
  return Number.isFinite(num) ? num : NaN;
}

function isPresent(value) {
  return value !== null && value !== undefined && value !== "";
}

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMaybe(value, digits = 3) {
  if (!Number.isFinite(value)) return "NA";
  return value.toFixed(digits);
}

function prettyMetric(metric) {
  switch (metric) {
    case "avg_BA":
      return "Average BA";
    case "avg_woba":
      return "Average wOBA";
    case "avg_iso":
      return "Average ISO";
    case "avg_hard_hit_pct":
      return "Average Hard Hit %";
    default:
      return metric;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function showError(error) {
  el.loading.innerHTML = `
    <div class="loading-card">
      <strong>Failed to load the dashboard</strong>
      <span>${escapeHtml(error.message || String(error))}</span>
    </div>
  `;
}
