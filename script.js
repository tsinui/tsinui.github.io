document.addEventListener("DOMContentLoaded", () => {
  initReveal();
  initHero();
  initHomePages();
  initNavDrawer();
  loadPortfolio();
  loadArticles();
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

// ── Hero：捲動聯動 + 標題字母微光 ──
function initHero() {
  const hero = document.getElementById("hero");
  if (!hero) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // 把標題拆成單一字母，讓滑鼠附近的字母微微亮起來
  const brand = hero.querySelector(".hero-brand");
  let letters = [];
  if (brand && !brand.dataset.split) {
    const text = brand.textContent;
    brand.textContent = "";
    text.split(/(\s+)/).forEach((word) => {
      if (/^\s+$/.test(word)) {
        brand.append(document.createTextNode(" "));
        return;
      }
      const w = document.createElement("span");
      w.className = "hero-word";
      w.setAttribute("aria-hidden", "true");
      [...word].forEach((ch) => {
        const c = document.createElement("span");
        c.className = "hero-ch";
        c.textContent = ch;
        w.append(c);
      });
      brand.append(w);
    });
    brand.dataset.split = "1";
    letters = [...brand.querySelectorAll(".hero-ch")];
  }

  // 捲動：--hero-p 從 0（頂端）到 1（封面完全捲出畫面），用來讓標題往上飄、淡出
  const img = hero.querySelector(".site-hero-img");
  const nav = hero.querySelector(".hero-nav");
  let ticking = false;
  // 照片裡藍天的底（山稜線）大約在照片高度的 36%
  const RIDGE = 0.36;
  const measure = () => {
    // 照片用 object-fit: cover 置中顯示：算出它實際在畫面上的位置，
    // 讓標題落在「看得到的藍天」上緣和山稜線的正中間
    const ratio = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 9 / 16;
    const vw = hero.clientWidth || window.innerWidth;
    const vh = hero.clientHeight || window.innerHeight;
    const imgH = Math.max(vh, vw * ratio);
    const imgTop = (vh - imgH) / 2;
    const ridgeY = imgTop + imgH * RIDGE;
    const navVisible = nav && getComputedStyle(nav).display !== "none";
    const skyTop = Math.max(imgTop, navVisible ? nav.offsetTop + nav.offsetHeight : 0);
    hero.style.setProperty("--sky-mid", `${Math.round((skyTop + ridgeY) / 2)}px`);
  };
  const update = () => {
    const h = hero.offsetHeight || window.innerHeight;
    const p = Math.min(Math.max(window.scrollY / h, 0), 1);
    hero.style.setProperty("--hero-p", p.toFixed(4));
    hero.classList.toggle("is-scrolled", p > 0.02);
    ticking = false;
  };
  measure();
  if (img && !img.complete) img.addEventListener("load", measure, { once: true });
  window.addEventListener("resize", measure);
  if (!reduceMotion) {
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  if (reduceMotion || !finePointer) return;

  // 滑鼠：游標附近的字母微微浮起、透出柔光
  let raf = 0;
  let last = null;
  const onMove = () => {
    raf = 0;
    if (!last) return;
    letters.forEach((el) => {
      const b = el.getBoundingClientRect();
      const dx = last.clientX - (b.left + b.width / 2);
      const dy = last.clientY - (b.top + b.height / 2);
      const d = Math.hypot(dx, dy * 1.4);
      const k = Math.max(0, 1 - d / 170);
      el.style.setProperty("--k", (k * k).toFixed(3));
    });
  };
  hero.addEventListener("pointermove", (e) => {
    last = e;
    if (!raf) raf = requestAnimationFrame(onMove);
  });
  hero.addEventListener("pointerleave", () => {
    last = null;
    letters.forEach((el) => el.style.setProperty("--k", 0));
  });
}

// ── 首頁三層：封面 → Feature Story → Around the World。
//    每一層的頂端都是明確的停頓點：滾一下就整層跳到下一層或上一層。
//    （如果第二層比螢幕高，例如手機，就只保留「封面 ↔ 第二層」的跳動，其餘自由捲動）
function initHomePages() {
  if (!document.body.classList.contains("home-page")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layers = ["hero", "writing", "map"].map((id) => document.getElementById(id)).filter(Boolean);
  if (layers.length < 2) return;

  // 用 offsetTop 算位置（不受進場動畫的 transform 影響）
  const topOf = (el) => {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y;
  };
  const stops = () => {
    const list = [0, topOf(layers[1])];
    // 第二層剛好一個螢幕高時，第三層也加入停頓點
    if (layers[2] && layers[1].offsetHeight <= window.innerHeight + 4) list.push(topOf(layers[2]));
    return list;
  };

  let locked = false;
  const go = (y) => {
    locked = true;
    window.scrollTo({ top: y, behavior: "smooth" });
    setTimeout(() => (locked = false), 1000);
  };
  const TOL = 24;
  const decide = (down) => {
    const y = window.scrollY;
    const t = stops();
    const last = t[t.length - 1];
    if (y > last + TOL) return null; // 最後一層之後（頁尾）自由捲動
    const at = t.findIndex((v) => Math.abs(y - v) <= TOL);
    if (down) {
      if (at >= 0) return at < t.length - 1 ? t[at + 1] : null;
      const next = t.find((v) => v > y);
      return next ?? null;
    }
    if (at >= 0) return at > 0 ? t[at - 1] : null;
    const prev = [...t].reverse().find((v) => v < y);
    return prev ?? null;
  };
  const inLockZone = () => window.scrollY <= stops().slice(-1)[0] + TOL;

  // 滾輪在可以捲動的小區塊裡（例如國家清單）時，交給那個區塊自己捲
  const scrollsInside = (target, dy) => {
    for (let el = target; el && el !== document.body; el = el.parentElement) {
      if (!(el instanceof Element)) continue;
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
        if (dy > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
        if (dy < 0 && el.scrollTop > 0) return true;
      }
    }
    return false;
  };

  window.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) < 4) return;
    if (locked) {
      if (inLockZone()) e.preventDefault();
      return;
    }
    if (scrollsInside(e.target, e.deltaY)) return;
    const target = decide(e.deltaY > 0);
    if (target !== null) {
      e.preventDefault();
      go(target);
    }
  }, { passive: false });

  let startY = null;
  window.addEventListener("touchstart", (e) => { startY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (startY === null || locked) return;
    const dy = startY - e.changedTouches[0].clientY;
    startY = null;
    if (Math.abs(dy) < 30 || scrollsInside(e.target, dy)) return;
    const target = decide(dy > 0);
    if (target !== null) go(target);
  }, { passive: true });

  window.addEventListener("keydown", (e) => {
    if (locked || e.target.closest("input, textarea, select")) return;
    const down = ["ArrowDown", "PageDown", " "].includes(e.key);
    const up = ["ArrowUp", "PageUp"].includes(e.key);
    if (!down && !up) return;
    const target = decide(down);
    if (target !== null) {
      e.preventDefault();
      go(target);
    }
  });
}

// ── 卡片微光：記錄游標在卡片上的位置，給 CSS 畫柔光 ──
function initCardGlow() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest && e.target.closest(".home-feature-card, .story-card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });
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
        <a class="portfolio-card${item.archived ? " is-archived" : ""}" href="${item.url}">
          <p class="portfolio-card-date">${item.archived ? '<span class="portfolio-card-badge">典藏</span>' : item.date}</p>
          <h3 class="portfolio-card-title">${item.title}</h3>
          <p class="portfolio-card-desc">${item.description}</p>
          <span class="portfolio-card-cta">${{ dashboard: "Launch dashboard →", tool: "Open tool →" }[item.type] || "Read analysis →"}</span>
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
    <img src="${leadImg}" alt="${lead.imageAlt}"${lead.imagePosition ? ` style="object-position:${lead.imagePosition}"` : ""} />
    <div class="home-feature-card-overlay"></div>
    <div class="home-feature-card-content">
      ${leadOtherTagsHtml}
      <h2 class="home-feature-card-title">${lead.title}</h2>
      ${lead.excerpt || lead.titleZh ? `<p class="home-feature-card-sub">${lead.excerpt || lead.titleZh}</p>` : ""}
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
      <img src="${imgSrc}" alt="${a.imageAlt}"${a.imagePosition ? ` style="object-position:${a.imagePosition}"` : ""} />
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

// ── Articles：互動時間軸 ──
// 日期從卡片移到時間軸上；依年份分段。捲動時軸線跟著填滿、經過的節點亮起，
// 目前讀到的那一篇會放大、卡片依序滑入。
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function renderArchive(container, articles, root) {
  let lastYear = null;
  const rows = articles.map((a) => {
    const href = articleHref(a, root);
    const target = articleTarget(a);
    const [y, m, d] = String(a.date).split("-");
    const yearRow = y !== lastYear ? `<div class="tl-year"><span>${y}</span></div>` : "";
    lastYear = y;
    // 中文長標題在逗號後換行
    const title = String(a.title).replace(/，/g, "，<br>");
    // 摘要：文章開頭的一兩句話（黑體）；沒有的話用描述，但跟標題重複時不顯示
    let excerpt = a.excerpt || a.description || "";
    if (!a.excerpt && excerpt && (a.title.includes(excerpt) || excerpt.includes(a.title))) excerpt = "";
    const tags = (a.tags || []).map((t) => `<span class="tag">${t}</span>`).join("");
    return `${yearRow}
    <article class="tl-item">
      <time class="tl-date" datetime="${a.date}">
        <span class="tl-month">${MONTHS[(+m || 1) - 1]}</span>
        <span class="tl-day">${+d || ""}</span>
      </time>
      <span class="tl-dot" aria-hidden="true"></span>
      <a class="tl-card" href="${href}"${target}>
        <div class="tl-card-copy">
          <div class="tl-tags">${tags}</div>
          <h3 class="tl-title">${title}</h3>
          ${excerpt ? `<p class="tl-excerpt">${excerpt}</p>` : ""}
        </div>
        <div class="tl-card-media"><img src="${a.image}" alt="${a.imageAlt || ""}" loading="lazy"${a.imagePosition ? ` style="object-position:${a.imagePosition}"` : ""} /></div>
      </a>
    </article>`;
  });

  container.innerHTML = `
    <div class="timeline">
      <div class="tl-rail" aria-hidden="true"><div class="tl-progress"></div></div>
      ${rows.join("\n")}
    </div>`;
  initTimeline(container.querySelector(".timeline"));
}

function initTimeline(tl) {
  if (!tl) return;
  const items = [...tl.querySelectorAll(".tl-item")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 卡片進入畫面時滑入
  if (!reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add("is-in"));
  }

  // 軸線填滿到畫面中線；經過中線的節點亮起，最後一個經過的是「目前這篇」
  let ticking = false;
  const update = () => {
    ticking = false;
    const mid = window.innerHeight * 0.5;
    const r = tl.getBoundingClientRect();
    const p = Math.min(Math.max((mid - r.top) / Math.max(r.height, 1), 0), 1);
    tl.style.setProperty("--tl-p", p.toFixed(4));
    let current = null;
    items.forEach((el) => {
      const dot = el.querySelector(".tl-dot").getBoundingClientRect();
      const past = dot.top + dot.height / 2 <= mid;
      el.classList.toggle("is-past", past);
      if (past) current = el;
    });
    if (!current && items.length) current = items[0];
    items.forEach((el) => el.classList.toggle("is-current", el === current));
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}
