import { escapeHtml, initCommon } from "../common.js";

initCommon("slug-generator");

const inputNode = document.querySelector("#slug-input");
const prefixNode = document.querySelector("#slug-prefix");
const separatorNode = document.querySelector("#slug-separator");
const lowercaseNode = document.querySelector("#slug-lowercase");
const stripAccentsNode = document.querySelector("#slug-strip-accents");
const cleanupPunctuationNode = document.querySelector("#slug-cleanup-punctuation");
const batchModeNode = document.querySelector("#slug-batch-mode");
const generateButton = document.querySelector("#slug-generate");
const copySlugButton = document.querySelector("#slug-copy-slug");
const copyUrlButton = document.querySelector("#slug-copy-url");
const sampleButton = document.querySelector("#slug-sample");
const clearButton = document.querySelector("#slug-clear");
const currentSlugNode = document.querySelector("#slug-current");
const fragmentNode = document.querySelector("#slug-fragment");
const urlNode = document.querySelector("#slug-url");
const countNode = document.querySelector("#slug-count");
const batchResultsNode = document.querySelector("#slug-batch-results");
const statusNode = document.querySelector("#slug-status");

let latestResults = [];

[
  inputNode,
  prefixNode,
  separatorNode,
  lowercaseNode,
  stripAccentsNode,
  cleanupPunctuationNode,
  batchModeNode,
].forEach((node) => {
  const eventName = node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement ? "input" : "change";
  node.addEventListener(eventName, render);
});

generateButton.addEventListener("click", render);
copySlugButton.addEventListener("click", () => copyOutput("slug"));
copyUrlButton.addEventListener("click", () => copyOutput("url"));
sampleButton.addEventListener("click", loadSample);
clearButton.addEventListener("click", clearAll);

batchResultsNode.addEventListener("click", handleBatchCopy);

render();

function render() {
  const text = normalizeNewlines(inputNode.value);
  const options = getOptions();
  latestResults = buildResults(text, options);

  if (!text.trim()) {
    renderEmpty();
    return;
  }

  if (!latestResults.length) {
    renderNoResults(options.batchMode);
    return;
  }

  const firstResult = latestResults[0];
  currentSlugNode.textContent = firstResult?.slug || "—";
  fragmentNode.textContent = firstResult ? buildPathFragment(firstResult.slug, options.prefix) : "—";
  urlNode.textContent = firstResult ? buildFullUrl(firstResult.slug, options.prefix) : "—";
  countNode.textContent = latestResults.length.toString();

  copySlugButton.textContent = options.batchMode ? "Copy all slugs" : "Copy slug";
  copyUrlButton.textContent = options.batchMode ? "Copy all URLs" : "Copy URL";

  batchResultsNode.innerHTML = latestResults
    .map((result) => renderResultCard(result, options))
    .join("");

  statusNode.textContent = options.batchMode
    ? `Generated ${latestResults.length} slug${latestResults.length === 1 ? "" : "s"} in batch mode.`
    : "Generated a single slug from the full input.";
}

function renderEmpty() {
  latestResults = [];
  currentSlugNode.textContent = "—";
  fragmentNode.textContent = "—";
  urlNode.textContent = "—";
  countNode.textContent = "0";
  copySlugButton.textContent = "Copy slug";
  copyUrlButton.textContent = "Copy URL";
  batchResultsNode.innerHTML = `
    <div class="empty-state">
      <strong class="empty-title">No slugs yet</strong>
      <p>Paste text above or load the sample to see clean URL slugs and preview links.</p>
    </div>
  `;
  statusNode.textContent = "Ready to generate slugs.";
}

function renderNoResults(batchMode) {
  currentSlugNode.textContent = "—";
  fragmentNode.textContent = "—";
  urlNode.textContent = "—";
  countNode.textContent = "0";
  copySlugButton.textContent = batchMode ? "Copy all slugs" : "Copy slug";
  copyUrlButton.textContent = batchMode ? "Copy all URLs" : "Copy URL";
  batchResultsNode.innerHTML = `
    <div class="empty-state">
      <strong class="empty-title">Nothing to slug</strong>
      <p>The current input only contains characters that were stripped by your active settings.</p>
    </div>
  `;
  statusNode.textContent = "No slug output was generated with the current settings.";
}

function buildResults(text, options) {
  if (!text.trim()) {
    return [];
  }

  if (!options.batchMode) {
    const slug = slugify(text, options);
    return slug ? [{ source: text.trim(), slug }] : [];
  }

  return normalizeNewlines(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const slug = slugify(line, options);
      return slug
        ? {
            source: line,
            slug,
          }
        : null;
    })
    .filter(Boolean);
}

function slugify(value, options) {
  let text = normalizeNewlines(value).trim();

  if (!text) {
    return "";
  }

  if (options.stripAccents && typeof text.normalize === "function") {
    text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  text = text.replace(/['’]+/g, "");
  text = text.replace(/[_-]+/g, " ");

  if (options.cleanupPunctuation) {
    text = text.replace(/[^\p{L}\p{N}\s]+/gu, " ");
  } else {
    text = text.replace(/[^\p{L}\p{N}\s]+/gu, "");
  }

  text = text.replace(/\s+/g, " ").trim();

  if (!text) {
    return "";
  }

  if (options.lowercase) {
    text = text.toLowerCase();
  }

  return text.split(" ").join(options.separator);
}

function normalizeNewlines(value) {
  return String(value).replace(/\r\n?/g, "\n");
}

function getOptions() {
  return {
    prefix: normalizePrefix(prefixNode.value),
    separator: separatorNode.value === "underscore" ? "_" : "-",
    lowercase: lowercaseNode.checked,
    stripAccents: stripAccentsNode.checked,
    cleanupPunctuation: cleanupPunctuationNode.checked,
    batchMode: batchModeNode.checked,
  };
}

function normalizePrefix(value) {
  let prefix = String(value).trim();

  if (!prefix) {
    return "/";
  }

  prefix = prefix.replace(/\s+/g, "");

  if (!prefix.startsWith("/")) {
    prefix = `/${prefix}`;
  }

  if (!prefix.endsWith("/")) {
    prefix = `${prefix}/`;
  }

  return prefix.replace(/\/{2,}/g, "/");
}

function buildPathFragment(slug, prefix) {
  return `${prefix}${slug}`;
}

function buildFullUrl(slug, prefix) {
  const origin = window.location.origin && window.location.origin !== "null"
    ? window.location.origin
    : "https://aifreelancer.co";

  return `${origin}${buildPathFragment(slug, prefix)}`;
}

function renderResultCard(result, options) {
  const pathFragment = buildPathFragment(result.slug, options.prefix);
  const fullUrl = buildFullUrl(result.slug, options.prefix);

  return `
    <article class="result-card">
      <h3>${escapeHtml(result.source)}</h3>
      <p class="result-number">${escapeHtml(result.slug)}</p>
      <p class="helper-copy">${escapeHtml(pathFragment)}</p>
      <p class="helper-copy">${escapeHtml(fullUrl)}</p>
      <div class="button-row">
        <button class="button button-secondary" type="button" data-copy-kind="slug" data-copy-value="${escapeHtml(result.slug)}">Copy slug</button>
        <button class="button button-secondary" type="button" data-copy-kind="url" data-copy-value="${escapeHtml(fullUrl)}">Copy URL</button>
      </div>
    </article>
  `;
}

async function copyOutput(kind) {
  if (!latestResults.length) {
    statusNode.textContent = "There is no slug output to copy yet.";
    return;
  }

  const text = kind === "url"
    ? latestResults.map((result) => buildFullUrl(result.slug, getOptions().prefix)).join("\n")
    : latestResults.map((result) => result.slug).join("\n");

  try {
    await navigator.clipboard.writeText(text);
    statusNode.textContent = kind === "url"
      ? (latestResults.length > 1 ? "Full URLs copied to your clipboard." : "Full URL example copied to your clipboard.")
      : (latestResults.length > 1 ? "Slugs copied to your clipboard." : "Slug copied to your clipboard.");
  } catch {
    statusNode.textContent = "Clipboard copy was blocked by the browser.";
  }
}

async function copyValue(value, message) {
  try {
    await navigator.clipboard.writeText(value);
    statusNode.textContent = message;
  } catch {
    statusNode.textContent = "Clipboard copy was blocked by the browser.";
  }
}

function handleBatchCopy(event) {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest("[data-copy-kind][data-copy-value]");
  if (!button) {
    return;
  }

  const kind = button.dataset.copyKind;
  const value = button.dataset.copyValue || "";
  copyValue(value, kind === "url" ? "URL copied to your clipboard." : "Slug copied to your clipboard.");
}

function loadSample() {
  inputNode.value = `AI Freelancer Tools launch party!
Café au lait: a builder's guide
Trim punctuation, strip accents, and keep the slug clean
One more line for batch mode`;
  render();
}

function clearAll() {
  inputNode.value = "";
  render();
}
