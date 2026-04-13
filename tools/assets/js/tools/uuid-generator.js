import { escapeHtml, initCommon } from "../common.js";

initCommon("uuid-generator");

const countInput = document.querySelector("#uuid-count");
const uppercaseInput = document.querySelector("#uuid-uppercase");
const hyphenlessInput = document.querySelector("#uuid-hyphenless");
const generateButton = document.querySelector("#uuid-generate");
const copyAllButton = document.querySelector("#uuid-copy-all");
const sampleButton = document.querySelector("#uuid-sample");
const clearButton = document.querySelector("#uuid-clear");
const statusNode = document.querySelector("#uuid-status");
const previewNode = document.querySelector("#uuid-preview");
const resultsNode = document.querySelector("#uuid-results");

let currentUuids = [];
let updateTimer = 0;

[countInput, uppercaseInput, hyphenlessInput].forEach((field) => {
  const eventName = field instanceof HTMLInputElement && field.type === "number" ? "input" : "change";
  field.addEventListener(eventName, scheduleUpdate);
});

generateButton.addEventListener("click", generateUuids);
copyAllButton.addEventListener("click", copyAllUuids);
sampleButton.addEventListener("click", loadSample);
clearButton.addEventListener("click", clearAll);

generateUuids();

function scheduleUpdate() {
  window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(generateUuids, 100);
}

function generateUuids() {
  const options = getOptions();
  const count = clampNumber(countInput.value, 1, 20, 1);
  const uuids = [];

  for (let index = 0; index < count; index += 1) {
    uuids.push(formatUuid(generateUuidV4(), options));
  }

  currentUuids = uuids;
  renderResults(uuids, options);
  setStatus(`Generated ${uuids.length} UUID${uuids.length === 1 ? "" : "s"} locally with browser crypto APIs.`);
}

function getOptions() {
  return {
    uppercase: uppercaseInput.checked,
    hyphenless: hyphenlessInput.checked,
  };
}

function generateUuidV4() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function formatUuid(raw, options) {
  const output = options.hyphenless ? raw.replaceAll("-", "") : raw;
  return options.uppercase ? output.toUpperCase() : output;
}

function renderResults(uuids, options) {
  if (!uuids.length) {
    resultsNode.innerHTML = `
      <div class="empty-state">
        <strong class="empty-title">No UUIDs to show</strong>
        <p>Generate a value to see the dashed or hyphenless output.</p>
      </div>
    `;
    previewNode.textContent = options.hyphenless
      ? "xxxxxxxxxxxx4xxx yxxxxxxxxxxxxxxx".replace(/\s+/g, "")
      : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    return;
  }

  previewNode.textContent = options.hyphenless
    ? "xxxxxxxxxxxx4xxx yxxxxxxxxxxxxxxx".replace(/\s+/g, "")
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

  resultsNode.innerHTML = uuids
    .map((uuid, index) => `
      <article class="result-card">
        <h3>UUID ${index + 1}</h3>
        <p class="result-number mono mono-wrap">${escapeHtml(uuid)}</p>
        <div class="button-row">
          <button class="button button-secondary" type="button" data-copy-index="${index}">Copy</button>
        </div>
      </article>
    `)
    .join("");

  resultsNode.querySelectorAll("[data-copy-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.copyIndex);
      copyText(currentUuids[index], `UUID ${index + 1}`);
    });
  });
}

async function copyAllUuids() {
  if (!currentUuids.length) {
    setStatus("Generate UUIDs first before copying them.");
    return;
  }

  await copyText(currentUuids.join("\n"), "All UUIDs");
}

async function copyText(text, label) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.setAttribute("readonly", "true");
      temp.style.position = "fixed";
      temp.style.top = "-9999px";
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
    }

    setStatus(`${label} copied to your clipboard.`);
  } catch {
    setStatus("Clipboard copy was blocked by the browser.");
  }
}

function loadSample() {
  countInput.value = "4";
  uppercaseInput.checked = true;
  hyphenlessInput.checked = false;
  generateUuids();
}

function clearAll() {
  countInput.value = "1";
  uppercaseInput.checked = false;
  hyphenlessInput.checked = false;
  currentUuids = [];
  renderResults([], getOptions());
  setStatus("Ready to generate UUID v4 values locally.");
}

function setStatus(message) {
  statusNode.textContent = message;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}
