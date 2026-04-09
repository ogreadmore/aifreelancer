import { getRelatedTools } from "./tool-registry.js";

export function initCommon(currentSlug) {
  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const relatedMount = document.querySelector("[data-related-tools]");
  if (relatedMount) {
    const related = getRelatedTools(currentSlug);
    relatedMount.innerHTML = related
      .map(
        (tool) => `
          <a class="related-card" href="../${tool.slug}/">
            <span class="tool-category">${tool.category}</span>
            <h3>${tool.title}</h3>
            <p>${tool.description}</p>
          </a>
        `,
      )
      .join("");
  }
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatNumber(value, options = {}) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
}

export function setText(selector, value) {
  const node = document.querySelector(selector);
  if (node) {
    node.textContent = value;
  }
}
