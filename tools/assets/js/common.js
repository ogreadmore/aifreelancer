import { getRelatedTools, tools } from "./tool-registry.js";

export function initCommon(currentSlug) {
  ensureSkipLink();

  const currentTool = tools.find((tool) => tool.slug === currentSlug);

  document.querySelectorAll("[data-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

  const pageNav = document.querySelector(".page-nav");
  if (pageNav && currentTool) {
    const siblingTool = getRelatedTools(currentSlug).find((tool) => tool.category === currentTool.category)
      ?? getRelatedTools(currentSlug)[0]
      ?? null;

    const navItems = [
      { href: "../../", label: "All tools" },
      {
        href: `../../?category=${encodeURIComponent(currentTool.category)}#tool-directory`,
        label: currentTool.category,
      },
    ];

    if (siblingTool) {
      navItems.push({
        href: `../${encodeURIComponent(siblingTool.slug)}/`,
        label: siblingTool.title,
      });
    }

    pageNav.innerHTML = navItems
      .map(
        (item) => `<a href="${item.href}">${escapeHtml(item.label)}</a>`,
      )
      .join("");
  }

  const relatedMount = document.querySelector("[data-related-tools]");
  if (relatedMount) {
    const related = getRelatedTools(currentSlug);
    relatedMount.innerHTML = related
      .map(
        (tool) => `
          <a class="related-card" href="../${encodeURIComponent(tool.slug)}/">
            <span class="tool-category">${escapeHtml(tool.category)}</span>
            <h3>${escapeHtml(tool.title)}</h3>
            <p>${escapeHtml(tool.description)}</p>
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
