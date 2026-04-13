import { initCommon } from "../common.js";

initCommon("utm-builder");

const baseUrlInput = document.querySelector("#utm-base-url");
const sourceInput = document.querySelector("#utm-source");
const mediumInput = document.querySelector("#utm-medium");
const campaignInput = document.querySelector("#utm-campaign");
const termInput = document.querySelector("#utm-term");
const contentInput = document.querySelector("#utm-content");
const copyButton = document.querySelector("#utm-copy");
const sampleButton = document.querySelector("#utm-sample");
const clearButton = document.querySelector("#utm-clear");
const statusNode = document.querySelector("#utm-status");
const activeCountNode = document.querySelector("#utm-active-count");
const previewNode = document.querySelector("#utm-preview");
const summaryBaseNode = document.querySelector("#utm-summary-base");
const summarySourceNode = document.querySelector("#utm-summary-source");
const summaryMediumNode = document.querySelector("#utm-summary-medium");
const summaryCampaignNode = document.querySelector("#utm-summary-campaign");
const summaryTermNode = document.querySelector("#utm-summary-term");
const summaryContentNode = document.querySelector("#utm-summary-content");

const state = {
  timer: 0,
  currentUrl: "",
  currentValid: false,
};

const SAMPLE = {
  baseUrl: "https://aifreelancer.co/landing-page",
  source: "newsletter",
  medium: "email",
  campaign: "spring launch 2026",
  term: "ai tools",
  content: "hero button",
};

[baseUrlInput, sourceInput, mediumInput, campaignInput, termInput, contentInput].forEach((field) => {
  field.addEventListener("input", scheduleUpdate);
});

copyButton.addEventListener("click", copyCurrentUrl);
sampleButton.addEventListener("click", loadSample);
clearButton.addEventListener("click", clearAll);

refreshPreview();

function scheduleUpdate() {
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(refreshPreview, 120);
}

function refreshPreview() {
  const fields = getFields();
  const result = buildCampaignUrl(fields);

  updateSummary(fields, result);

  if (!result.ok) {
    state.currentUrl = "";
    state.currentValid = false;
    previewNode.textContent = result.message;
    copyButton.disabled = true;
    setStatus(result.message);
    return;
  }

  state.currentUrl = result.url;
  state.currentValid = true;
  previewNode.textContent = result.url;
  copyButton.disabled = false;
  setStatus(`Ready. ${result.activeCount} UTM parameter${result.activeCount === 1 ? "" : "s"} are included in the final link.`);
}

function getFields() {
  return {
    baseUrl: baseUrlInput.value,
    source: sanitizeUtmValue(sourceInput.value),
    medium: sanitizeUtmValue(mediumInput.value),
    campaign: sanitizeUtmValue(campaignInput.value),
    term: sanitizeUtmValue(termInput.value),
    content: sanitizeUtmValue(contentInput.value),
  };
}

function buildCampaignUrl(fields) {
  const cleanedBaseUrl = sanitizeBaseUrl(fields.baseUrl);
  const trackedPairs = [
    ["utm_source", fields.source],
    ["utm_medium", fields.medium],
    ["utm_campaign", fields.campaign],
    ["utm_term", fields.term],
    ["utm_content", fields.content],
  ].filter(([, value]) => Boolean(value));

  if (!cleanedBaseUrl) {
    return {
      ok: false,
      message: "Enter a base URL to build the tracked link.",
      activeCount: trackedPairs.length,
    };
  }

  try {
    const url = new URL(cleanedBaseUrl);

    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => {
      url.searchParams.delete(key);
    });

    trackedPairs.forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return {
      ok: true,
      url: url.toString(),
      activeCount: trackedPairs.length,
    };
  } catch {
    return {
      ok: false,
      message: "Enter a valid base URL like https://example.com/landing-page.",
      activeCount: trackedPairs.length,
    };
  }
}

function updateSummary(fields, result) {
  const activeCount = result.activeCount ?? 0;
  activeCountNode.textContent = `${activeCount} of 5`;
  summaryBaseNode.textContent = formatSummaryBase(fields.baseUrl);
  summarySourceNode.textContent = fields.source || "Not set";
  summaryMediumNode.textContent = fields.medium || "Not set";
  summaryCampaignNode.textContent = fields.campaign || "Not set";
  summaryTermNode.textContent = fields.term || "Not set";
  summaryContentNode.textContent = fields.content || "Not set";
}

function formatSummaryBase(value) {
  const trimmed = sanitizeBaseUrl(value);
  if (!trimmed) {
    return "Not set";
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return trimmed;
  }
}

function sanitizeBaseUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed) || /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  return `https://${trimmed}`;
}

function sanitizeUtmValue(value) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function copyCurrentUrl() {
  if (!state.currentValid || !state.currentUrl) {
    setStatus("Build a valid URL before copying it.");
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(state.currentUrl);
    } else {
      const temp = document.createElement("textarea");
      temp.value = state.currentUrl;
      temp.setAttribute("readonly", "true");
      temp.style.position = "fixed";
      temp.style.top = "-9999px";
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
    }

    setStatus("Tracked URL copied to your clipboard.");
  } catch {
    setStatus("Clipboard copy was blocked by the browser.");
  }
}

function loadSample() {
  baseUrlInput.value = SAMPLE.baseUrl;
  sourceInput.value = SAMPLE.source;
  mediumInput.value = SAMPLE.medium;
  campaignInput.value = SAMPLE.campaign;
  termInput.value = SAMPLE.term;
  contentInput.value = SAMPLE.content;
  refreshPreview();
}

function clearAll() {
  baseUrlInput.value = "";
  sourceInput.value = "";
  mediumInput.value = "";
  campaignInput.value = "";
  termInput.value = "";
  contentInput.value = "";
  state.currentUrl = "";
  state.currentValid = false;
  previewNode.textContent = "Enter a base URL to see the live tracked link.";
  copyButton.disabled = true;
  updateSummary(getFields(), { activeCount: 0 });
  setStatus("Ready to build a tracked URL locally.");
}

function setStatus(message) {
  statusNode.textContent = message;
}
