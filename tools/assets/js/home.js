import { escapeHtml } from "./common.js";
import { categories, tools } from "./tool-registry.js";

const GAME_CATEGORIES = new Set(["Arcade", "Puzzle"]);
const CATEGORY_ORDER = [
  "Writing",
  "Text",
  "Dev",
  "Security",
  "Imaging",
  "Web",
  "Content",
  "Marketing",
  "Time",
  "Trades",
  "Math",
];

const filterMount = document.querySelector("[data-filter-mount]");
const toolGrid = document.querySelector("[data-tool-grid]");
const arcadeGrid = document.querySelector("[data-arcade-grid]");
const popularToolsMount = document.querySelector("[data-popular-tools]");
const newToolsMount = document.querySelector("[data-new-tools]");
const quickLaunchMount = document.querySelector("[data-quick-launch]");
const toolSearchInputs = [...document.querySelectorAll("[data-tool-search]")];
const utilityCountNode = document.querySelector("[data-utility-count]");
const gameCountNode = document.querySelector("[data-game-count]");
const catalogCountNode = document.querySelector("[data-catalog-count]");

const utilityTools = tools.filter((tool) => !isGame(tool));
const arcadeTools = tools.filter((tool) => isGame(tool));
const utilityCategories = [
  "All",
  ...categories.filter((category) => category !== "All" && !GAME_CATEGORIES.has(category)),
];
const validCategories = new Set(utilityCategories);
const categoryRank = new Map(CATEGORY_ORDER.map((category, index) => [category, index]));
const popularTools = utilityTools.filter((tool) => tool.popular);
const newTools = utilityTools.filter((tool) => tool.isNew);
const popularityRank = new Map(popularTools.map((tool, index) => [tool.slug, index]));
const state = getStateFromUrl();

ensureSkipLink();

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

if (utilityCountNode) {
  utilityCountNode.textContent = utilityTools.length.toString();
}

if (gameCountNode) {
  gameCountNode.textContent = arcadeTools.length.toString();
}

toolSearchInputs.forEach((input) => {
  input.value = state.query;
  input.addEventListener("input", (event) => {
    updateQuery(event.target.value, event.target, "replace");
  });
  input.addEventListener("change", (event) => {
    updateQuery(event.target.value, event.target, "push");
  });
});

window.addEventListener("popstate", () => {
  const nextState = getStateFromUrl();
  state.category = nextState.category;
  state.query = nextState.query;
  syncSearchInputs();
  renderFilters();
  renderQuickLaunch();
  renderTools();
});

renderQuickLaunch();
renderPopularTools();
renderNewTools();
renderFilters();
renderTools();
renderArcade();

function renderQuickLaunch() {
  if (!quickLaunchMount) {
    return;
  }

  const hasActiveState = Boolean(state.query) || state.category !== "All";
  const featuredTools = hasActiveState
    ? utilityTools.filter((tool) => matchesFilter(tool)).sort(compareUtilityTools).slice(0, 6)
    : popularTools.slice(0, 5);

  if (!featuredTools.length) {
    const emptyLabel = state.query
      ? `No quick matches for “${escapeHtml(state.query)}”`
      : `No quick matches in ${escapeHtml(state.category)}`;
    quickLaunchMount.innerHTML = `
      <div class="empty-state">
        <strong class="empty-title">${emptyLabel}</strong>
        <p>Try a broader search or jump into the full catalog below.</p>
      </div>
    `;
    return;
  }

  quickLaunchMount.innerHTML = featuredTools
    .map(
      (tool) => `
        <a class="spotlight-row" href="${getToolHref(tool)}">
          <div class="spotlight-copy">
            <span class="tool-category">${escapeHtml(tool.category)}</span>
            <h3>${escapeHtml(tool.title)}</h3>
            <p>${escapeHtml(tool.description)}</p>
          </div>
          <span class="spotlight-arrow" aria-hidden="true">&rarr;</span>
        </a>
      `,
    )
    .join("");
}

function renderPopularTools() {
  if (!popularToolsMount) {
    return;
  }

  popularToolsMount.innerHTML = popularTools
    .map((tool) => renderUtilityItem(tool, 3))
    .join("");
}

function renderNewTools() {
  if (!newToolsMount) {
    return;
  }

  const latestTools = newTools
    .slice()
    .sort(compareUtilityTools)
    .slice(0, 8);

  if (!latestTools.length) {
    newToolsMount.innerHTML = `
      <article class="empty-state">
        <strong class="empty-title">New additions are on the way</strong>
        <p>The shared catalog updates here as fresh utilities are added.</p>
      </article>
    `;
    return;
  }

  newToolsMount.innerHTML = latestTools
    .map((tool) => renderUtilityItem(tool, 2, { includeNewBadge: true }))
    .join("");
}

function renderFilters(focusCategory = "") {
  if (!filterMount) {
    return;
  }

  filterMount.innerHTML = utilityCategories
    .map((category) => {
      const label = category === "All" ? "All tools" : category;
      return `
        <button
          class="filter-chip"
          type="button"
          data-category="${category}"
          aria-pressed="${String(state.category === category)}"
        >
          ${label}
        </button>
      `;
    })
    .join("");

  filterMount.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      syncUrlState("push");
      renderFilters(button.dataset.category);
      renderQuickLaunch();
      renderTools();
    });
  });

  if (focusCategory) {
    filterMount.querySelector(`[data-category="${CSS.escape(focusCategory)}"]`)?.focus();
  }
}

function renderTools() {
  if (!toolGrid) {
    return;
  }

  const filtered = utilityTools
    .filter((tool) => matchesFilter(tool))
    .sort(compareUtilityTools);

  if (catalogCountNode) {
    const scope = state.category === "All" ? "all public tools" : `${state.category.toLowerCase()} tools`;
    const querySummary = state.query ? ` for “${state.query.trim()}”` : "";
    catalogCountNode.textContent = `Showing ${filtered.length} of ${utilityTools.length} ${scope}${querySummary}.`;
  }

  if (!filtered.length) {
    toolGrid.innerHTML = `
      <article class="empty-state">
        <strong class="empty-title">No matching tools yet</strong>
        <p>Try a broader term or switch back to the full public catalog.</p>
      </article>
    `;
    return;
  }

  toolGrid.innerHTML = filtered
    .map((tool) => renderUtilityItem(tool, 2))
    .join("");
}

function renderArcade() {
  if (!arcadeGrid) {
    return;
  }

  arcadeGrid.innerHTML = arcadeTools
    .slice()
    .sort((left, right) => left.title.localeCompare(right.title))
    .map(
      (tool) => `
        <a class="related-card" href="${getToolHref(tool)}">
          <span class="tool-category">${escapeHtml(tool.category === "Puzzle" ? "Game" : tool.category)}</span>
          <h3>${escapeHtml(tool.title)}</h3>
          <p>${escapeHtml(tool.description)}</p>
        </a>
      `,
    )
    .join("");
}

function renderUtilityItem(tool, featureCount, options = {}) {
  const badges = [];
  if (options.includeNewBadge) {
    badges.push('<span class="utility-feature">New</span>');
  }

  const featureMarkup = tool.features
    .slice(0, featureCount)
    .map((feature) => `<span class="utility-feature">${escapeHtml(feature)}</span>`)
    .join("");

  return `
    <a class="utility-item" href="${getToolHref(tool)}">
      <div class="utility-meta">
        <span class="tool-category">${escapeHtml(tool.category)}</span>
        <h3 class="utility-name">${escapeHtml(tool.title)}</h3>
        <div class="utility-features">
          ${badges.join("")}${featureMarkup}
        </div>
      </div>
      <p class="utility-desc">${escapeHtml(tool.description)}</p>
    </a>
  `;
}

function getToolHref(tool) {
  return `./tools/${encodeURIComponent(tool.slug)}/`;
}

function matchesFilter(tool) {
  const categoryMatch = state.category === "All" || tool.category === state.category;
  if (!categoryMatch) {
    return false;
  }

  return matchesSearch(tool);
}

function compareUtilityTools(left, right) {
  const leftSearchRank = getSearchRank(left);
  const rightSearchRank = getSearchRank(right);
  if (leftSearchRank !== rightSearchRank) {
    return rightSearchRank - leftSearchRank;
  }

  const leftPopularity = popularityRank.has(left.slug) ? popularityRank.get(left.slug) : Number.MAX_SAFE_INTEGER;
  const rightPopularity = popularityRank.has(right.slug) ? popularityRank.get(right.slug) : Number.MAX_SAFE_INTEGER;
  if (leftPopularity !== rightPopularity) {
    return leftPopularity - rightPopularity;
  }

  const leftCategory = categoryRank.has(left.category) ? categoryRank.get(left.category) : Number.MAX_SAFE_INTEGER;
  const rightCategory = categoryRank.has(right.category) ? categoryRank.get(right.category) : Number.MAX_SAFE_INTEGER;
  if (leftCategory !== rightCategory) {
    return leftCategory - rightCategory;
  }

  return left.title.localeCompare(right.title);
}

function isGame(tool) {
  return tool.type === "game" || GAME_CATEGORIES.has(tool.category);
}

function matchesSearch(tool) {
  const query = state.query.trim().toLowerCase();
  if (!query) {
    return true;
  }

  const haystack = [tool.title, tool.category, tool.description, ...tool.features]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function getSearchRank(tool) {
  const query = state.query.trim().toLowerCase();
  if (!query) {
    return 0;
  }

  const title = tool.title.toLowerCase();
  const category = tool.category.toLowerCase();
  const description = tool.description.toLowerCase();
  const featureMatch = tool.features.some((feature) => feature.toLowerCase().includes(query));

  let score = tool.popular ? 12 : 0;

  if (title === query) {
    score += 120;
  } else if (title.startsWith(query)) {
    score += 90;
  } else if (title.includes(query)) {
    score += 72;
  }

  if (category === query) {
    score += 56;
  } else if (category.includes(query)) {
    score += 32;
  }

  if (featureMatch) {
    score += 24;
  }

  if (description.includes(query)) {
    score += 14;
  }

  return score;
}

function getStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const category = validCategories.has(params.get("category")) ? params.get("category") : "All";
  const query = (params.get("q") ?? "").trim();
  return { category, query };
}

function updateQuery(value, sourceInput, historyMode = "replace") {
  state.query = value.trim();
  syncSearchInputs(sourceInput);
  syncUrlState(historyMode);
  renderQuickLaunch();
  renderTools();
}

function syncSearchInputs(sourceInput) {
  toolSearchInputs.forEach((input) => {
    if (input !== sourceInput && input.value !== state.query) {
      input.value = state.query;
    }
  });
}

function syncUrlState(historyMode = "replace") {
  const params = new URLSearchParams(window.location.search);

  if (state.category === "All") {
    params.delete("category");
  } else {
    params.set("category", state.category);
  }

  if (state.query) {
    params.set("q", state.query);
  } else {
    params.delete("q");
  }

  const search = params.toString();
  const nextUrl = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl === currentUrl) {
    return;
  }

  if (historyMode === "push") {
    window.history.pushState(null, "", nextUrl);
    return;
  }

  window.history.replaceState(null, "", nextUrl);
}

function ensureSkipLink() {
  const main = document.querySelector("main");
  if (!main) {
    return;
  }

  if (!main.id) {
    main.id = "main-content";
  }

  if (document.querySelector(".skip-link")) {
    return;
  }

  const link = document.createElement("a");
  link.className = "skip-link";
  link.href = `#${main.id}`;
  link.textContent = "Skip to content";
  document.body.prepend(link);
}
