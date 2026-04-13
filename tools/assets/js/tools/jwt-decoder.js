import { escapeHtml, initCommon } from "../common.js";

initCommon("jwt-decoder");

const tokenInput = document.querySelector("#jwt-token");
const decodeButton = document.querySelector("#jwt-decode");
const sampleButton = document.querySelector("#jwt-sample");
const clearButton = document.querySelector("#jwt-clear");
const statusNode = document.querySelector("#jwt-status");

const copyButtons = {
  token: document.querySelector("#jwt-copy-token"),
  header: document.querySelector("#jwt-copy-header"),
  payload: document.querySelector("#jwt-copy-payload"),
  report: document.querySelector("#jwt-copy-report"),
  signature: document.querySelector("#jwt-copy-signature"),
  headerInline: document.querySelector("#jwt-copy-header-inline"),
  payloadInline: document.querySelector("#jwt-copy-payload-inline"),
};

const summaryNodes = {
  segments: document.querySelector("#jwt-segment-count"),
  algorithm: document.querySelector("#jwt-algorithm"),
  type: document.querySelector("#jwt-type"),
  state: document.querySelector("#jwt-state"),
};

const outputNodes = {
  header: document.querySelector("#jwt-header-output"),
  payload: document.querySelector("#jwt-payload-output"),
  signature: document.querySelector("#jwt-signature-output"),
  headerMeta: document.querySelector("#jwt-header-meta"),
  payloadMeta: document.querySelector("#jwt-payload-meta"),
  timingGrid: document.querySelector("#jwt-timing-grid"),
};

const TIMING_FIELDS = [
  { key: "iat", label: "Issued at" },
  { key: "nbf", label: "Not before" },
  { key: "exp", label: "Expires at" },
  { key: "auth_time", label: "Auth time" },
];

let lastDecoded = null;
let compareTimer = 0;

tokenInput.addEventListener("input", scheduleDecode);
decodeButton.addEventListener("click", decodeToken);
sampleButton.addEventListener("click", loadDemoToken);
clearButton.addEventListener("click", clearAll);

Object.entries(copyButtons).forEach(([key, button]) => {
  button.addEventListener("click", () => copyValue(key));
});

loadDemoToken();

function scheduleDecode() {
  window.clearTimeout(compareTimer);
  compareTimer = window.setTimeout(decodeToken, 120);
}

function loadDemoToken() {
  tokenInput.value = buildDemoToken();
  decodeToken("Loaded a demo JWT so you can see the decoder in action.");
}

function clearAll() {
  tokenInput.value = "";
  lastDecoded = null;
  renderEmptyState();
  setStatus("Paste a JWT or load the demo token to start decoding.", "idle");
}

function decodeToken(message) {
  const rawToken = normalizeToken(tokenInput.value);

  if (!rawToken) {
    lastDecoded = null;
    renderEmptyState();
    setStatus(message ?? "Paste a JWT or load the demo token to start decoding.", "idle");
    return;
  }

  const parts = rawToken.split(".");
  summaryNodes.segments.textContent = String(parts.length);

  if (parts.length !== 3) {
    lastDecoded = null;
    renderEmptyState("JWTs must contain exactly three dot-separated segments.");
    setStatus("JWTs must contain exactly three dot-separated segments.", "invalid");
    return;
  }

  const [headerSegment, payloadSegment, signatureSegment] = parts;
  const header = decodeJsonSegment(headerSegment, "header");
  const payload = decodeJsonSegment(payloadSegment, "payload");

  lastDecoded = {
    token: rawToken,
    header,
    payload,
    signature: signatureSegment,
  };

  renderSummary(header.json, payload.json);
  renderHeader(header);
  renderPayload(payload);
  renderSignature(signatureSegment);
  renderTiming(payload.json);

  if (!header.ok || !payload.ok) {
    setStatus(
      !header.ok
        ? `Header decode issue: ${header.message}`
        : `Payload decode issue: ${payload.message}`,
      "invalid",
    );
    return;
  }

  const timingState = describeTokenState(payload.json);
  const headerLabel = header.json.alg ? `Algorithm ${header.json.alg}` : "Header decoded successfully";
  setStatus(`${headerLabel}. ${timingState}. Signature is shown but not verified.`, "valid");
}

function renderSummary(headerJson, payloadJson) {
  summaryNodes.algorithm.textContent = headerJson?.alg ?? "—";
  summaryNodes.type.textContent = headerJson?.typ ?? "JWT";
  summaryNodes.state.textContent = describeTokenState(payloadJson, true);
}

function renderHeader(decoded) {
  outputNodes.headerMeta.innerHTML = "";

  if (!decoded.ok) {
    outputNodes.header.textContent = decoded.displayText || "Unable to decode header.";
    outputNodes.headerMeta.innerHTML = `<span class="jwt-chip">Decode issue</span>`;
    return;
  }

  outputNodes.headerMeta.innerHTML = buildMetadataChips([
    decoded.json.alg ? `alg: ${decoded.json.alg}` : null,
    decoded.json.typ ? `typ: ${decoded.json.typ}` : null,
    decoded.json.kid ? `kid: ${decoded.json.kid}` : null,
  ]);
  outputNodes.header.textContent = decoded.pretty;
}

function renderPayload(decoded) {
  outputNodes.payloadMeta.innerHTML = "";

  if (!decoded.ok) {
    outputNodes.payload.textContent = decoded.displayText || "Unable to decode payload.";
    outputNodes.payloadMeta.innerHTML = `<span class="jwt-chip">Decode issue</span>`;
    return;
  }

  outputNodes.payloadMeta.innerHTML = buildMetadataChips([
    decoded.json.iss ? `iss: ${String(decoded.json.iss)}` : null,
    decoded.json.sub ? `sub: ${String(decoded.json.sub)}` : null,
    decoded.json.aud ? `aud: ${Array.isArray(decoded.json.aud) ? decoded.json.aud.length : 1}` : null,
    decoded.json.jti ? `jti: ${String(decoded.json.jti)}` : null,
  ]);
  outputNodes.payload.textContent = decoded.pretty;
}

function renderSignature(signature) {
  outputNodes.signature.textContent = signature || "No signature segment found.";
}

function renderTiming(payloadJson) {
  const timingEntries = TIMING_FIELDS
    .map((field) => buildTimingEntry(field, payloadJson?.[field.key]))
    .filter(Boolean);

  if (!timingEntries.length) {
    outputNodes.timingGrid.innerHTML = `<p class="jwt-empty">This token does not include exp, nbf, iat, or auth_time claims.</p>`;
    return;
  }

  outputNodes.timingGrid.innerHTML = timingEntries.join("");
}

function buildTimingEntry(field, rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return "";
  }

  const parsed = parseEpochSeconds(rawValue);
  if (!parsed.ok) {
    return `
      <article class="jwt-timing-card">
        <div class="jwt-timing-head">
          <div>
            <h3 class="jwt-timing-title">${escapeHtml(field.label)}</h3>
            <p class="jwt-timing-raw">Raw value: ${escapeHtml(String(rawValue))}</p>
          </div>
        </div>
        <div class="jwt-value-box">
          <p class="jwt-value-text">This value is not a valid epoch timestamp.</p>
        </div>
      </article>
    `;
  }

  const date = new Date(parsed.value * 1000);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const relative = formatRelative(date);
  const state = field.key === "exp"
    ? parsed.value < nowSeconds
      ? "Expired"
      : "Active"
    : field.key === "nbf"
      ? parsed.value > nowSeconds
        ? "Not yet active"
        : "Active"
      : field.key === "iat"
        ? "Issued"
        : "Observed";

  return `
    <article class="jwt-timing-card">
      <div class="jwt-timing-head">
        <div>
          <h3 class="jwt-timing-title">${escapeHtml(field.label)}</h3>
          <p class="jwt-timing-raw">Raw value: ${escapeHtml(String(parsed.value))}</p>
        </div>
        <span class="jwt-chip">${escapeHtml(state)}</span>
      </div>
      <div class="jwt-timing-grid-values">
        <div class="jwt-value-box">
          <span class="jwt-value-label">Local</span>
          <p class="jwt-value-text">${escapeHtml(formatDate(date))}</p>
        </div>
        <div class="jwt-value-box">
          <span class="jwt-value-label">UTC</span>
          <p class="jwt-value-text">${escapeHtml(formatDate(date, "UTC"))}</p>
        </div>
        <div class="jwt-value-box">
          <span class="jwt-value-label">Relative</span>
          <p class="jwt-value-text">${escapeHtml(relative)}</p>
        </div>
      </div>
    </article>
  `;
}

function renderEmptyState(message = "Load a token to inspect the header, payload, and timing claims.") {
  outputNodes.headerMeta.innerHTML = "";
  outputNodes.payloadMeta.innerHTML = "";
  outputNodes.header.textContent = "Load a token to inspect the header.";
  outputNodes.payload.textContent = "Load a token to inspect the payload.";
  outputNodes.signature.textContent = "Load a token to inspect the signature segment.";
  outputNodes.timingGrid.innerHTML = `<p class="jwt-empty">${escapeHtml(message)}</p>`;
  summaryNodes.segments.textContent = "0";
  summaryNodes.algorithm.textContent = "—";
  summaryNodes.type.textContent = "—";
  summaryNodes.state.textContent = "—";
}

function setStatus(message, mode = "idle") {
  statusNode.textContent = message;
  statusNode.classList.remove("is-valid", "is-invalid");

  if (mode === "valid") {
    statusNode.classList.add("is-valid");
  } else if (mode === "invalid") {
    statusNode.classList.add("is-invalid");
  }
}

async function copyValue(key) {
  const payloadText = {
    token: lastDecoded?.token,
    header: lastDecoded?.header?.pretty,
    payload: lastDecoded?.payload?.pretty,
    report: buildReportText(),
    signature: lastDecoded?.signature,
    headerInline: lastDecoded?.header?.pretty,
    payloadInline: lastDecoded?.payload?.pretty,
  }[key];

  if (!payloadText) {
    setStatus("There is nothing to copy yet.", "idle");
    return;
  }

  try {
    await copyText(payloadText);
    setStatus(`${describeCopyLabel(key)} copied to your clipboard.`, "valid");
  } catch {
    setStatus("Clipboard copy was blocked by the browser.", "idle");
  }
}

function buildReportText() {
  if (!lastDecoded) {
    return "";
  }

  const sections = [
    "JWT Decoder report",
    `Token: ${lastDecoded.token}`,
    "",
    "Header:",
    lastDecoded.header?.pretty || "Unable to decode header.",
    "",
    "Payload:",
    lastDecoded.payload?.pretty || "Unable to decode payload.",
    "",
    "Signature:",
    lastDecoded.signature || "No signature segment found.",
  ];

  const timingLines = TIMING_FIELDS
    .map((field) => buildTimingLine(field, lastDecoded.payload?.json?.[field.key]))
    .filter(Boolean);

  if (timingLines.length) {
    sections.push("", "Timing:", ...timingLines);
  }

  return sections.join("\n");
}

function buildTimingLine(field, rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return "";
  }

  const parsed = parseEpochSeconds(rawValue);
  if (!parsed.ok) {
    return `${field.label}: ${String(rawValue)} (invalid epoch value)`;
  }

  const date = new Date(parsed.value * 1000);
  return `${field.label}: ${parsed.value} | ${formatDate(date)} | ${formatDate(date, "UTC")}`;
}

function buildMetadataChips(values) {
  return values
    .filter(Boolean)
    .map((value) => `<span class="jwt-chip">${escapeHtml(String(value))}</span>`)
    .join("");
}

function describeCopyLabel(key) {
  return key === "token"
    ? "Token"
    : key === "header"
      ? "Header JSON"
      : key === "payload"
        ? "Payload JSON"
        : key === "report"
          ? "Decoded report"
          : key === "signature"
            ? "Signature"
            : key === "headerInline"
              ? "Header JSON"
              : "Payload JSON";
}

function describeTokenState(payloadJson, short = false) {
  if (!payloadJson || typeof payloadJson !== "object") {
    return short ? "Unknown" : "No payload available";
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = parseEpochSeconds(payloadJson.exp);
  const nbf = parseEpochSeconds(payloadJson.nbf);

  if (exp.ok && exp.value < nowSeconds) {
    return short ? "Expired" : "Token is expired";
  }

  if (nbf.ok && nbf.value > nowSeconds) {
    return short ? "Pending" : "Token is not active yet";
  }

  if (exp.ok || nbf.ok) {
    return short ? "Active" : "Token is currently active";
  }

  return short ? "No timing claims" : "No timing claims found";
}

function parseEpochSeconds(value) {
  const numeric = typeof value === "string" ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(numeric)) {
    return {
      ok: false,
      value: null,
    };
  }

  return {
    ok: true,
    value: Math.trunc(numeric),
  };
}

function decodeJsonSegment(segment, label) {
  let rawText = "";
  try {
    rawText = decodeBase64Url(segment);
  } catch (error) {
    return {
      ok: false,
      label,
      message: `Unable to decode the ${label} segment: ${error.message}`,
      displayText: `Unable to decode the ${label} segment.`,
      rawText: "",
    };
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      ok: false,
      label,
      message: `The ${label} segment is empty.`,
      displayText: `The ${label} segment is empty.`,
      rawText: "",
    };
  }

  try {
    const json = JSON.parse(trimmed);
    return {
      ok: true,
      label,
      rawText: trimmed,
      json,
      pretty: JSON.stringify(json, null, 2),
    };
  } catch {
    return {
      ok: false,
      label,
      message: `The ${label} segment decoded, but it is not valid JSON.`,
      displayText: trimmed,
      rawText: trimmed,
    };
  }
}

function decodeBase64Url(segment) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const base64 = `${normalized}${padding}`;
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function normalizeToken(value) {
  return value.replace(/\s+/g, "").trim();
}

function formatDate(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

function formatRelative(date) {
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const units = [
    { unit: "year", value: 365 * 24 * 60 * 60 * 1000 },
    { unit: "month", value: 30 * 24 * 60 * 60 * 1000 },
    { unit: "day", value: 24 * 60 * 60 * 1000 },
    { unit: "hour", value: 60 * 60 * 1000 },
    { unit: "minute", value: 60 * 1000 },
    { unit: "second", value: 1000 },
  ];

  const target = units.find((entry) => absMs >= entry.value) ?? units.at(-1);
  const amount = Math.round(diffMs / target.value);
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(amount, target.unit);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back below when clipboard permissions block direct writes.
    }
  }

  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

function buildDemoToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: "aifreelancer-demo-2026",
  };
  const payload = {
    iss: "https://aifreelancer.co",
    sub: "demo-user-01",
    aud: ["aifreelancer-tools", "public-browser-tools"],
    iat: now - 90,
    nbf: now - 120,
    exp: now + 24 * 60 * 60,
    auth_time: now - 180,
    jti: "demo-jwt-2026-04-13",
    scope: "tools:read tools:use",
  };

  return [
    encodeBase64Url(JSON.stringify(header)),
    encodeBase64Url(JSON.stringify(payload)),
    encodeBase64Url("demo-signature"),
  ].join(".");
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}
