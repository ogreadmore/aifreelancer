import { initCommon } from "../common.js";

initCommon("encoding-lab");

const inputNode = document.querySelector("#encoding-input");
const outputNode = document.querySelector("#encoding-output");
const statusNode = document.querySelector("#encoding-status");
const modeNode = document.querySelector("#encoding-mode");
const inputCountNode = document.querySelector("#encoding-input-count");
const outputCountNode = document.querySelector("#encoding-output-count");
const pairCountNode = document.querySelector("#encoding-pair-count");
const plusAsSpaceNode = document.querySelector("#encoding-plus-as-space");

const state = {
  activeAction: "",
  timer: 0,
};

const SAMPLE_TEXT = "https://aifreelancer.co/tools/encoding-lab?name=AIFreelancer%20Tools&tags=dev&tags=browser&html=%3Cstrong%3EFast%3C%2Fstrong%3E";

const ACTIONS = {
  urlEncode: {
    label: "URL encoded",
    run: (value) => encodeURIComponent(value),
    status: "URL encoded with UTF-8-safe percent escapes.",
  },
  urlDecode: {
    label: "URL decoded",
    run: (value) => decodeUrl(value, plusAsSpaceNode.checked),
    status: "URL decoded successfully.",
  },
  base64Encode: {
    label: "Base64 encoded",
    run: (value) => encodeBase64(value),
    status: "Base64 encoded with Unicode support.",
  },
  base64Decode: {
    label: "Base64 decoded",
    run: (value) => decodeBase64(value),
    status: "Base64 decoded successfully.",
  },
  htmlEscape: {
    label: "HTML escaped",
    run: (value) => escapeHtml(value),
    status: "HTML characters were escaped for safe display.",
  },
  htmlUnescape: {
    label: "HTML unescaped",
    run: (value) => unescapeHtml(value),
    status: "HTML entities were decoded.",
  },
  parseQuery: {
    label: "Query parsed",
    run: (value) => parseQueryString(value),
    status: "Query string parsed into a pretty JSON summary.",
  },
};

document.querySelector("#encoding-url-encode").addEventListener("click", () => runAction("urlEncode"));
document.querySelector("#encoding-url-decode").addEventListener("click", () => runAction("urlDecode"));
document.querySelector("#encoding-base64-encode").addEventListener("click", () => runAction("base64Encode"));
document.querySelector("#encoding-base64-decode").addEventListener("click", () => runAction("base64Decode"));
document.querySelector("#encoding-html-escape").addEventListener("click", () => runAction("htmlEscape"));
document.querySelector("#encoding-html-unescape").addEventListener("click", () => runAction("htmlUnescape"));
document.querySelector("#encoding-parse-query").addEventListener("click", () => runAction("parseQuery"));
document.querySelector("#encoding-copy-input").addEventListener("click", () => copyText(inputNode.value, "Input copied to your clipboard."));
document.querySelector("#encoding-copy-output").addEventListener("click", copyOutput);
document.querySelector("#encoding-sample").addEventListener("click", loadSample);
document.querySelector("#encoding-clear").addEventListener("click", clearAll);
inputNode.addEventListener("input", scheduleRefresh);
plusAsSpaceNode.addEventListener("change", refreshCurrentAction);

setEmptyState();
updateMetrics("", "", 0);

function runAction(actionName) {
  state.activeAction = actionName;
  const action = ACTIONS[actionName];
  const rawValue = inputNode.value;

  if (!rawValue.trim()) {
    updateMetrics("", "", 0);
    setEmptyState(action.label);
    return;
  }

  try {
    const result = action.run(rawValue);
    if (typeof result === "string") {
      outputNode.textContent = result;
      updateMetrics(rawValue, result, actionName === "parseQuery" ? countQueryPairs(rawValue).totalPairs : 0);
      setStatus(action.status, "is-valid");
      modeNode.textContent = action.label;
      return;
    }

    outputNode.textContent = result.output;
    updateMetrics(rawValue, result.output, result.totalPairs);
    modeNode.textContent = action.label;
    setStatus(result.status || action.status, "is-valid");
    return;
  } catch (error) {
    outputNode.textContent = "";
    updateMetrics(rawValue, "", 0);
    modeNode.textContent = action.label;
    setStatus(error.message, "is-invalid");
  }
}

function scheduleRefresh() {
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(() => {
    if (state.activeAction) {
      runAction(state.activeAction);
      return;
    }

    updateMetrics(inputNode.value, outputNode.textContent, 0);
    if (!inputNode.value.trim()) {
      setEmptyState();
    }
  }, 140);
}

function refreshCurrentAction() {
  if (state.activeAction) {
    runAction(state.activeAction);
  }
}

function loadSample() {
  inputNode.value = SAMPLE_TEXT;
  runAction("parseQuery");
}

function clearAll() {
  state.activeAction = "";
  inputNode.value = "";
  outputNode.textContent = "";
  plusAsSpaceNode.checked = true;
  modeNode.textContent = "Idle";
  updateMetrics("", "", 0);
  setEmptyState();
}

async function copyOutput() {
  if (!outputNode.textContent) {
    setStatus("There is no output to copy yet.", "");
    return;
  }

  await copyText(outputNode.textContent, "Output copied to your clipboard.");
}

async function copyText(text, successMessage) {
  if (!text) {
    setStatus("There is no text to copy yet.", "");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus(successMessage, "is-valid");
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    temp.setAttribute("readonly", "");
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    const copied = document.execCommand("copy");
    temp.remove();

    if (copied) {
      setStatus(successMessage, "is-valid");
      return;
    }

    setStatus("Clipboard copy was blocked by the browser.", "");
  }
}

function setEmptyState(label = "") {
  outputNode.textContent = "";
  modeNode.textContent = label || "Idle";
  updateMetrics(inputNode.value, "", 0);
  setStatus(label ? `Paste text, then use ${label.toLowerCase()} to preview the result.` : "Pick a transform to start encoding or decoding.", "");
}

function setStatus(message, tone) {
  statusNode.className = tone ? `json-status ${tone}` : "json-status";
  statusNode.textContent = message;
}

function updateMetrics(inputValue, outputValue, pairCount) {
  inputCountNode.textContent = inputValue.length.toString();
  outputCountNode.textContent = outputValue.length.toString();
  pairCountNode.textContent = pairCount.toString();
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function decodeBase64(value) {
  const normalized = value.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");

  if (!normalized) {
    throw new Error("Paste a Base64 string to decode.");
  }

  const padded = normalized.length % 4 === 0
    ? normalized
    : `${normalized}${"=".repeat(4 - (normalized.length % 4))}`;

  let binary;

  try {
    binary = atob(padded);
  } catch {
    throw new Error("That does not look like valid Base64.");
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("The decoded bytes are not valid UTF-8 text.");
  }
}

function decodeUrl(value, plusAsSpace) {
  if (!value.trim()) {
    throw new Error("Paste a URL-encoded value to decode.");
  }

  const source = plusAsSpace ? value.replace(/\+/g, " ") : value;
  try {
    return decodeURIComponent(source);
  } catch {
    throw new Error("That value is not valid percent-encoded text.");
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unescapeHtml(value) {
  return value.replace(/&(?:#\d+|#x[\da-f]+|[a-z][a-z0-9]+);/giu, (entity) => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = entity;
    return textarea.value;
  });
}

function parseQueryString(value) {
  const raw = value.trim();
  if (!raw) {
    throw new Error("Paste a query string or URL to pretty-parse it.");
  }

  const query = extractQueryString(raw);
  if (!query) {
    throw new Error("No query string was found in the current input.");
  }

  const pairs = query.split("&").filter(Boolean).map((pair) => {
    const equalsIndex = pair.indexOf("=");
    const keyPart = equalsIndex >= 0 ? pair.slice(0, equalsIndex) : pair;
    const valuePart = equalsIndex >= 0 ? pair.slice(equalsIndex + 1) : "";
    return {
      key: decodeQueryComponent(keyPart),
      value: decodeQueryComponent(valuePart),
    };
  });

  const params = {};
  pairs.forEach(({ key, value: pairValue }) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      params[key] = Array.isArray(params[key]) ? [...params[key], pairValue] : [params[key], pairValue];
      return;
    }

    params[key] = pairValue;
  });

  const uniqueKeys = Object.keys(params).length;
  const output = JSON.stringify({
    source: raw.includes("?") ? "URL query string" : "Query string",
    query,
    pairs,
    params,
  }, null, 2);

  return {
    output,
    totalPairs: pairs.length,
    status: `Parsed ${pairs.length} pair${pairs.length === 1 ? "" : "s"} across ${uniqueKeys} unique key${uniqueKeys === 1 ? "" : "s"}.`,
  };
}

function extractQueryString(raw) {
  if (raw.includes("?")) {
    return raw.split("?").slice(1).join("?").split("#")[0].trim().replace(/^\?/, "");
  }

  return raw.replace(/^\?/, "");
}

function decodeQueryComponent(value) {
  const source = plusAsSpaceNode.checked ? value.replace(/\+/g, " ") : value;
  try {
    return decodeURIComponent(source);
  } catch {
    throw new Error(`Malformed query component: ${value}`);
  }
}

function countQueryPairs(value) {
  try {
    const query = extractQueryString(value.trim());
    if (!query) {
      return { totalPairs: 0 };
    }

    return { totalPairs: query.split("&").filter(Boolean).length };
  } catch {
    return { totalPairs: 0 };
  }
}
