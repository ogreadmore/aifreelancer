import { escapeHtml, initCommon } from "../common.js";

initCommon("url-inspector");

const sourceInput = document.querySelector("#url-source");
const statusNode = document.querySelector("#url-status");
const previewNode = document.querySelector("#url-preview");
const querySummaryNode = document.querySelector("#url-query-summary");
const paramsEmptyNode = document.querySelector("#url-params-empty");
const paramsGridNode = document.querySelector("#url-params-grid");
const pathSegmentsNode = document.querySelector("#url-path-segments");

const copyButtons = {
  full: document.querySelector("#url-copy-full"),
  origin: document.querySelector("#url-copy-origin"),
  path: document.querySelector("#url-copy-path"),
  query: document.querySelector("#url-copy-query"),
  hash: document.querySelector("#url-copy-hash"),
  report: document.querySelector("#url-copy-report"),
  built: document.querySelector("#url-copy-built"),
};

const fieldInputs = {
  protocol: document.querySelector("#url-protocol"),
  username: document.querySelector("#url-username"),
  password: document.querySelector("#url-password"),
  hostname: document.querySelector("#url-hostname"),
  port: document.querySelector("#url-port"),
  pathname: document.querySelector("#url-pathname-input"),
  search: document.querySelector("#url-search"),
  hash: document.querySelector("#url-hash-input"),
};

const summaryNodes = {
  origin: document.querySelector("#url-origin"),
  pathname: document.querySelector("#url-pathname"),
  queryCount: document.querySelector("#url-query-count"),
  repeatedCount: document.querySelector("#url-repeated-count"),
  hash: document.querySelector("#url-hash"),
  depth: document.querySelector("#url-depth"),
};

const buttons = {
  parse: document.querySelector("#url-parse"),
  rebuild: document.querySelector("#url-rebuild"),
  clear: document.querySelector("#url-clear"),
  sample1: document.querySelector("#url-sample-1"),
  sample2: document.querySelector("#url-sample-2"),
  sample3: document.querySelector("#url-sample-3"),
};

const SAMPLE_URLS = [
  "https://aifreelancer.co/tools/url-inspector?ref=homepage&ref=brand&mode=preview#fields",
  "https://example.com/products/widget%20pro?utm_source=newsletter&utm_medium=email&utm_source=social&encoded=hello%20world#section-2",
  "//docs.example.org/a/b/c?name=Taylor%20O.&name=Codex&lang=en&lang=fr#top",
];

const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);

const state = {
  timer: 0,
  currentUrl: null,
  currentReport: null,
};

sourceInput.addEventListener("input", scheduleParse);
buttons.parse.addEventListener("click", parseFromSource);
buttons.rebuild.addEventListener("click", rebuildFromParts);
buttons.clear.addEventListener("click", clearAll);
buttons.sample1.addEventListener("click", () => loadSample(0));
buttons.sample2.addEventListener("click", () => loadSample(1));
buttons.sample3.addEventListener("click", () => loadSample(2));

Object.entries(copyButtons).forEach(([key, button]) => {
  button.addEventListener("click", () => copyCurrentValue(key));
});

Object.values(fieldInputs).forEach((input) => {
  input.addEventListener("input", scheduleRebuild);
});

renderEmptyState();
setStatus("Paste a URL or load a sample to start inspecting it locally.");

function scheduleParse() {
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(parseFromSource, 120);
}

function scheduleRebuild() {
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(rebuildFromParts, 120);
}

function parseFromSource() {
  const raw = sourceInput.value.trim();

  if (!raw) {
    state.currentUrl = null;
    state.currentReport = null;
    renderEmptyState();
    setStatus("Paste a URL or load a sample to start inspecting it locally.");
    return;
  }

  try {
    const url = parseUrl(raw);
    applyUrlToFields(url);
    renderUrl(url, "Parsed URL successfully.");
  } catch (error) {
    state.currentUrl = null;
    state.currentReport = null;
    renderEmptyState(error.message);
    setStatus(error.message, "is-invalid");
  }
}

function rebuildFromParts() {
  try {
    const url = buildUrlFromParts();
    sourceInput.value = url.toString();
    renderUrl(url, "URL rebuilt from the editable parts.");
  } catch (error) {
    state.currentUrl = null;
    state.currentReport = null;
    renderEmptyState(error.message);
    setStatus(error.message, "is-invalid");
  }
}

function renderUrl(url, message) {
  const report = buildReport(url);
  state.currentUrl = url;
  state.currentReport = report;

  summaryNodes.origin.textContent = report.origin || "—";
  summaryNodes.pathname.textContent = report.pathname || "—";
  summaryNodes.queryCount.textContent = String(report.queryPairs.length);
  summaryNodes.repeatedCount.textContent = String(report.repeatedKeys.length);
  summaryNodes.hash.textContent = report.hash || "—";
  summaryNodes.depth.textContent = String(report.pathSegments.length);

  previewNode.textContent = report.fullUrl;
  querySummaryNode.textContent = report.queryPairs.length
    ? `${report.queryPairs.length} query pair${report.queryPairs.length === 1 ? "" : "s"} and ${report.repeatedKeys.length} repeated key${report.repeatedKeys.length === 1 ? "" : "s"} detected.`
    : "No query parameters found in the current URL.";

  renderPathSegments(report.pathSegments);
  renderQueryGroups(report.queryGroups);
  updateCopyState(report);
  setStatus(message || "URL parsed successfully.", "is-valid");
}

function renderEmptyState(message = "Load a URL to inspect its parts.") {
  summaryNodes.origin.textContent = "—";
  summaryNodes.pathname.textContent = "—";
  summaryNodes.queryCount.textContent = "0";
  summaryNodes.repeatedCount.textContent = "0";
  summaryNodes.hash.textContent = "—";
  summaryNodes.depth.textContent = "0";
  previewNode.textContent = "Paste a URL or fill in the fields to build one.";
  querySummaryNode.textContent = "No query params loaded yet.";
  pathSegmentsNode.innerHTML = `<p class="url-empty">${escapeHtml(message)}</p>`;
  paramsGridNode.innerHTML = "";
  paramsEmptyNode.style.display = "block";
  updateCopyState(null);
}

function renderPathSegments(segments) {
  if (!segments.length) {
    pathSegmentsNode.innerHTML = `<p class="url-empty">This URL has no path segments.</p>`;
    return;
  }

  pathSegmentsNode.innerHTML = segments
    .map(
      (segment, index) => `
        <span class="url-path-segment" title="Segment ${index + 1}: ${escapeHtml(segment.raw)}">
          <strong>${index + 1}</strong>
          <span>${escapeHtml(segment.decoded)}</span>
        </span>
      `,
    )
    .join("");
}

function renderQueryGroups(groups) {
  if (!groups.length) {
    paramsGridNode.innerHTML = "";
    paramsEmptyNode.style.display = "block";
    return;
  }

  paramsEmptyNode.style.display = "none";
  paramsGridNode.innerHTML = groups
    .map(
      (group) => `
        <article class="url-group-card">
          <div class="url-group-head">
            <div>
              <h3 class="url-group-title">${escapeHtml(group.key)}</h3>
              <p class="url-group-note">${group.values.length} value${group.values.length === 1 ? "" : "s"} in this group</p>
            </div>
            <span class="tool-category">${group.values.length > 1 ? "Repeated" : "Single"}</span>
          </div>
          <ul class="url-value-list">
            ${group.values
              .map(
                (value, index) => `
                  <li class="url-value-item">
                    <span class="url-value-label">Value ${index + 1}</span>
                    <p class="url-value-text mono">${escapeHtml(value === "" ? "(empty)" : value)}</p>
                  </li>
                `,
              )
              .join("")}
          </ul>
        </article>
      `,
    )
    .join("");
}

function updateCopyState(report) {
  const enabled = Boolean(report);
  copyButtons.full.disabled = !enabled;
  copyButtons.origin.disabled = !enabled;
  copyButtons.path.disabled = !enabled;
  copyButtons.query.disabled = !enabled || !report.search;
  copyButtons.hash.disabled = !enabled || !report.hash;
  copyButtons.report.disabled = !enabled;
  copyButtons.built.disabled = !enabled;
}

function applyUrlToFields(url) {
  fieldInputs.protocol.value = url.protocol || "";
  fieldInputs.username.value = url.username || "";
  fieldInputs.password.value = url.password || "";
  fieldInputs.hostname.value = url.hostname || "";
  fieldInputs.port.value = url.port || "";
  fieldInputs.pathname.value = url.pathname || "/";
  fieldInputs.search.value = url.search ? url.search.slice(1) : "";
  fieldInputs.hash.value = url.hash ? url.hash.slice(1) : "";
}

function buildUrlFromParts() {
  const protocol = normalizeProtocol(fieldInputs.protocol.value);
  const hostname = fieldInputs.hostname.value.trim();

  if (!hostname) {
    throw new Error("Enter a hostname before rebuilding the URL.");
  }

  const url = new URL(`${protocol}//${hostname}`);
  url.username = fieldInputs.username.value.trim();
  url.password = fieldInputs.password.value.trim();
  const port = fieldInputs.port.value.trim();
  if (port && !/^\d+$/.test(port)) {
    throw new Error("Port should contain digits only.");
  }

  url.port = port;
  url.pathname = normalizePathname(fieldInputs.pathname.value);
  url.search = normalizeSearch(fieldInputs.search.value);
  url.hash = normalizeHash(fieldInputs.hash.value);
  return url;
}

function buildReport(url) {
  const rawEntries = Array.from(url.searchParams.entries());
  const grouped = new Map();

  for (const [key, value] of rawEntries) {
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(value);
  }

  const queryGroups = Array.from(grouped.entries()).map(([key, values]) => ({ key, values }));
  const repeatedKeys = queryGroups.filter((group) => group.values.length > 1);
  const pathSegments = decodePathSegments(url.pathname);

  return {
    fullUrl: url.toString(),
    origin: url.origin,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    pathSegments,
    queryPairs: rawEntries,
    queryGroups,
    repeatedKeys,
    report: {
      fullUrl: url.toString(),
      origin: url.origin,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      pathSegments: pathSegments.map((segment) => segment.decoded),
      queryPairs: rawEntries.map(([key, value]) => ({ key, value })),
      queryGroups,
    },
  };
}

function copyCurrentValue(kind) {
  if (!state.currentReport) {
    setStatus("Load or rebuild a valid URL before copying.", "");
    return;
  }

  const report = state.currentReport;
  const values = {
    full: report.fullUrl,
    origin: report.origin,
    path: `${report.pathname}${report.search}${report.hash}`,
    query: report.search,
    hash: report.hash,
    report: JSON.stringify(report.report, null, 2),
    built: report.fullUrl,
  };

  const text = values[kind];
  if (!text) {
    setStatus("That part is empty on this URL.", "");
    return;
  }

  copyText(text, kind === "report" ? "Decoded report copied to your clipboard." : "Copied to your clipboard.");
}

async function copyText(text, successMessage) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.setAttribute("readonly", "");
      temp.style.position = "fixed";
      temp.style.opacity = "0";
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
    }

    setStatus(successMessage, "is-valid");
  } catch {
    setStatus("Clipboard copy was blocked by the browser.", "");
  }
}

function loadSample(index) {
  sourceInput.value = SAMPLE_URLS[index];
  parseFromSource();
}

function clearAll() {
  sourceInput.value = "";
  Object.values(fieldInputs).forEach((input) => {
    input.value = "";
  });
  state.currentUrl = null;
  state.currentReport = null;
  renderEmptyState();
  setStatus("Paste a URL or load a sample to start inspecting it locally.");
}

function parseUrl(rawValue) {
  const value = rawValue.trim();
  const candidates = [];
  const hasScheme = /^[a-z][a-z\d+\-.]*:\/\//i.test(value);
  const looksLikeProtocol = /^[a-z][a-z\d+\-.]*:/i.test(value);

  if (hasScheme) {
    candidates.push(value);
  } else if (value.startsWith("//")) {
    candidates.push(`https:${value}`);
  } else if (value.startsWith("/") || value.startsWith("?") || value.startsWith("#")) {
    candidates.push(new URL(value, getRelativeBase()).toString());
  } else if (looksLikeProtocol) {
    candidates.push(value);
  } else {
    candidates.push(`https://${value}`);
    candidates.push(new URL(value, getRelativeBase()).toString());
  }

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate, getRelativeBase());
      ensureSupportedUrl(url);
      return url;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("Paste a valid URL like https://example.com/path?query=value#hash.");
}

function getRelativeBase() {
  return window.location.origin && window.location.origin !== "null"
    ? window.location.origin
    : "https://example.com";
}

function normalizeProtocol(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "https:";
  }

  const cleaned = trimmed.replace(/:\/+$/, ":");
  if (!/^[a-z][a-z\d+\-.]*:?$/i.test(cleaned)) {
    throw new Error("Protocol should look like http or https.");
  }

  const normalized = cleaned.endsWith(":") ? cleaned : `${cleaned}:`;

  if (!SUPPORTED_PROTOCOLS.has(normalized.toLowerCase())) {
    throw new Error("Use http or https so the URL can be edited and rebuilt safely.");
  }

  return normalized;
}

function normalizePathname(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "/";
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function normalizeSearch(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("?") ? trimmed : `?${trimmed}`;
}

function normalizeHash(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function ensureSupportedUrl(url) {
  if (!SUPPORTED_PROTOCOLS.has(url.protocol.toLowerCase())) {
    throw new Error("Use a standard http or https URL for this inspector.");
  }

  if (!url.hostname) {
    throw new Error("Paste a URL with a hostname like example.com.");
  }
}

function decodePathSegments(pathname) {
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => ({
      raw: segment,
      decoded: safeDecodeURIComponent(segment),
    }));
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function setStatus(message, tone = "") {
  statusNode.className = tone ? `json-status url-status ${tone}` : "json-status url-status";
  statusNode.textContent = message;
}
