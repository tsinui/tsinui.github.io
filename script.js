document.addEventListener("DOMContentLoaded", () => {
  initReveal();
  initHeroParallax();
  initNavDrawer();
  loadPortfolio();
  loadArticles();
  loadWorldMap();
});

function initNavDrawer() {
  const toggle = document.querySelector(".nav-toggle");
  const drawer = document.getElementById("nav-drawer");
  const backdrop = document.getElementById("nav-backdrop");
  if (!toggle || !drawer || !backdrop) return;

  // Move out of page-shell so overflow:hidden doesn't clip them
  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  function openDrawer() {
    drawer.classList.add("is-open");
    backdrop.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "關閉選單");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "開啟選單");
    document.body.style.overflow = "";
  }

  toggle.addEventListener("click", () => {
    toggle.getAttribute("aria-expanded") === "true" ? closeDrawer() : openDrawer();
  });

  backdrop.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });
}

function initHeroParallax() {
  const img = document.querySelector(".site-hero-img");
  if (!img) return;
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const progress = Math.min(window.scrollY / window.innerHeight, 1);
        const shift = progress * 12;
        img.style.setProperty("--parallax-y", `${shift}%`);
        ticking = false;
      });
      ticking = true;
    }
  });
}

function initReveal() {
  const sections = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  sections.forEach((section) => observer.observe(section));
}

async function loadPortfolio() {
  const container = document.querySelector("[data-portfolio]");
  if (!container) return;

  let sections;
  try {
    const res = await fetch("portfolio/portfolio.json");
    sections = await res.json();
  } catch {
    return;
  }

  container.innerHTML = sections.map((section) => `
    <div class="portfolio-section">
      <h2 class="portfolio-section-title">${section.sport}</h2>
      <div class="portfolio-cards">
        ${section.items.map((item) => `
        <a class="portfolio-card" href="${item.url}">
          <p class="portfolio-card-date">${item.date}</p>
          <h3 class="portfolio-card-title">${item.title}</h3>
          <p class="portfolio-card-desc">${item.description}</p>
          <span class="portfolio-card-cta">${item.type === "dashboard" ? "Launch dashboard →" : "Read analysis →"}</span>
        </a>`).join("")}
      </div>
    </div>`
  ).join("\n");
}

async function loadArticles() {
  const homeContainer = document.querySelector("[data-articles-root]");
  if (!homeContainer) return;

  const root = homeContainer.dataset.articlesRoot;
  const isArchive = homeContainer.hasAttribute("data-articles-archive");
  const jsonPath = isArchive ? "./articles.json" : "articles/articles.json";

  let articles;
  try {
    const res = await fetch(jsonPath);
    articles = await res.json();
  } catch {
    return;
  }

  // Sort by date descending
  articles.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (isArchive) {
    renderArchive(homeContainer, articles, root);
  } else {
    // Feature Story first, then rest by date
    const featureIdx = articles.findIndex(a => a.tags?.includes("Feature Story"));
    let ordered;
    if (featureIdx > 0) {
      const feature = articles.splice(featureIdx, 1)[0];
      ordered = [feature, ...articles];
    } else {
      ordered = articles;
    }
    renderHome(homeContainer, ordered, root);
  }
  // The container was empty (height 0) when IntersectionObserver first ran,
  // so re-check visibility now that content is rendered.
  if (homeContainer.getBoundingClientRect().top < window.innerHeight) {
    homeContainer.classList.add("is-visible");
  }
}

async function loadWorldMap() {
  const container = document.getElementById("world-map");
  if (!container) return;

  const visitedCountries = [
    { id: 158, name: "Taiwan" },
    { id: 344, name: "Hong Kong" },
    { id: 156, name: "China" },
    { id: 496, name: "Mongolia" },
    { id: 410, name: "South Korea" },
    { id: 392, name: "Japan" },
    { id: 792, name: "Turkey" },
    { id: 528, name: "Netherlands" },
    { id: 276, name: "Germany" },
    { id: 250, name: "France" },
    { id: 724, name: "Spain" },
    { id: 620, name: "Portugal" },
    { id: 56,  name: "Belgium" },
    { id: 40,  name: "Austria" },
    { id: 348, name: "Hungary" },
    { id: 705, name: "Slovenia" },
    { id: 616, name: "Poland" },
    { id: 246, name: "Finland" },
    { id: 428, name: "Latvia" },
    { id: 440, name: "Lithuania" },
  ];

  const visited = new Set(visitedCountries.map(c => c.id));

  // Render country list
  const listEl = document.getElementById("country-list");
  if (listEl) {
    listEl.innerHTML = visitedCountries.map(c =>
      `<span class="country-list-item">${c.name}</span>`
    ).join("") +
    `<p class="country-list-count">${visitedCountries.length} countries</p>`;
  }

  let world;
  try {
    world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
  } catch {
    return;
  }

  const width = container.clientWidth || 800;
  const height = Math.round(width * 0.5);

  const svg = d3.select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const projection = d3.geoNaturalEarth1()
    .scale(width / 6.1)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);


  const countries = topojson.feature(world, world.objects.countries);
  // Remove Antarctica
  countries.features = countries.features.filter(f => +f.id !== 10);

  // Break MultiPolygons into individual polygons so overseas territories
  // (e.g. French Guiana) don't get coloured — only the largest polygon is marked.
  const polygonData = [];
  countries.features.forEach(f => {
    const isVisited = visited.has(+f.id);
    const geom = f.geometry;
    if (geom.type === "MultiPolygon" && isVisited) {
      let maxLen = 0, mainIdx = 0;
      geom.coordinates.forEach((coords, i) => {
        if (coords[0].length > maxLen) { maxLen = coords[0].length; mainIdx = i; }
      });
      geom.coordinates.forEach((coords, i) => {
        polygonData.push({
          feat: { type: "Feature", geometry: { type: "Polygon", coordinates: coords } },
          visited: i === mainIdx,
        });
      });
    } else {
      polygonData.push({ feat: f, visited: isVisited });
    }
  });

  svg.selectAll(".country")
    .data(polygonData)
    .join("path")
    .attr("class", d => d.visited ? "country visited" : "country")
    .attr("d", d => path(d.feat));
}

function articleHref(a, root) {
  if (a.externalUrl) return a.externalUrl;
  return `${root}/${a.slug}.html`;
}

function articleTarget(a) {
  return a.externalUrl ? ' target="_blank" rel="noopener"' : '';
}

function renderHome(container, articles, root) {
  const [lead, ...rest] = articles;

  const leadHref = articleHref(lead, root);
  const leadTarget = articleTarget(lead);
  const leadImg = lead.image.replace(/^\.\.\//, "");
  const leadOtherTags = (lead.tags || []).filter(t => t !== "Feature Story");
  const leadOtherTagsHtml = leadOtherTags.map(t =>
    `<span class="story-card-tag" style="background:var(--p-teal)">${t}</span>`
  ).join("");

  const featureHtml = `
  <div class="home-feature-wrap">
    <p class="stories-section-label">Feature Story</p>
  <a class="home-feature-card" href="${leadHref}"${leadTarget}>
    <img src="${leadImg}" alt="${lead.imageAlt}" />
    <div class="home-feature-card-overlay"></div>
    <div class="home-feature-card-content">
      ${leadOtherTagsHtml}
      <h2 class="home-feature-card-title">${lead.title}</h2>
      ${lead.titleZh ? `<p class="home-feature-card-sub">${lead.titleZh}</p>` : ""}
      <p class="home-feature-card-date">${lead.date}</p>
    </div>
  </a>
  </div>`;

  const gridHtml = rest.map((a) => {
    const href = articleHref(a, root);
    const target = articleTarget(a);
    const imgSrc = a.image.replace(/^\.\.\//, "");
    const tagPills = (a.tags || [])
      .filter(t => t !== "Feature Story")
      .map(t => {
        const bg = "var(--p-teal)";
        return `<span class="story-card-tag" style="background:${bg}">${t}</span>`;
      }).join("");
    return `
    <a class="story-card" href="${href}"${target}>
      <img src="${imgSrc}" alt="${a.imageAlt}" />
      <div class="story-card-overlay"></div>
      <div class="story-card-content">
        ${tagPills}
        <h3 class="story-card-title">${a.title}</h3>
        <p class="story-card-date">${a.date}</p>
      </div>
    </a>`;
  }).join("\n");

  container.innerHTML = featureHtml + `
  <p class="stories-section-label">More stories</p>
  <div class="stories-grid">${gridHtml}</div>`;
}

function renderArchive(container, articles, root) {
  container.innerHTML = articles.map((a) => {
    const href = articleHref(a, root);
    const target = articleTarget(a);
    return `
    <article class="article-feature">
      <div class="article-feature-copy">
        <div class="article-tags">${(a.tags||[]).map(t=>`<span class="tag">${t}</span>`).join("")}</div>
        <p class="eyebrow">${a.date}</p>
        <h3><a href="${href}"${target}>${a.title}</a></h3>
        ${a.titleZh ? `<h4 class="article-title-zh">${a.titleZh}</h4>` : ""}
      </div>
      <a class="article-feature-media" href="${href}"${target} aria-label="Open ${a.title}">
        <img src="${a.image}" alt="${a.imageAlt}" />
      </a>
    </article>`;
  }).join("\n");
}
