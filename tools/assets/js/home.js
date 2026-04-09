import { categories, tools } from "./tool-registry.js";

const state = {
  category: "All",
  query: "",
};

const filterMount = document.querySelector("[data-filter-mount]");
const toolGrid = document.querySelector("[data-tool-grid]");
const searchInput = document.querySelector("#tool-search");

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = new Date().getFullYear();
});

document.querySelector("[data-tool-count]").textContent = tools.length.toString();

renderFilters();
renderTools();

searchInput?.addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLowerCase();
  renderTools();
});

function renderFilters() {
  if (!filterMount) {
    return;
  }

  filterMount.innerHTML = categories
    .map(
      (category) => `
        <button
          class="filter-chip"
          type="button"
          data-category="${category}"
          aria-pressed="${String(state.category === category)}"
        >
          ${category}
        </button>
      `,
    )
    .join("");

  filterMount.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderFilters();
      renderTools();
    });
  });
}

function renderTools() {
  if (!toolGrid) {
    return;
  }

  const filtered = tools.filter((tool) => matchesFilter(tool));

  if (!filtered.length) {
    toolGrid.innerHTML = `
      <article class="empty-state">
        <strong class="empty-title">No matches yet</strong>
        <p>Try a broader search term or switch back to the full tool list.</p>
      </article>
    `;
    return;
  }

  toolGrid.innerHTML = filtered
    .map(
      (tool) => `
        <a class="tool-card" href="./tools/${tool.slug}/">
          <span class="tool-category">${tool.category}</span>
          <h3>${tool.title}</h3>
          <p class="tool-desc">${tool.description}</p>
          <ul>
            ${tool.features.map((feature) => `<li>${feature}</li>`).join("")}
          </ul>
        </a>
      `,
    )
    .join("");
}

function matchesFilter(tool) {
  const categoryMatch = state.category === "All" || tool.category === state.category;
  if (!categoryMatch) {
    return false;
  }

  if (!state.query) {
    return true;
  }

  const haystack = [tool.title, tool.category, tool.description, ...tool.features]
    .join(" ")
    .toLowerCase();

  return haystack.includes(state.query);
}
