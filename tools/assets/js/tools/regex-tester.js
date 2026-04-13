import { escapeHtml, initCommon } from "../common.js";

initCommon("regex-tester");

const patternInput = document.querySelector("#regex-pattern");
const flagsInput = document.querySelector("#regex-flags");
const replacementInput = document.querySelector("#regex-replacement");
const textInput = document.querySelector("#regex-text");
const sampleButton = document.querySelector("#regex-sample");
const clearButton = document.querySelector("#regex-clear");
const samplesMount = document.querySelector("#regex-samples");
const statusNode = document.querySelector("#regex-status");
const matchCountNode = document.querySelector("#regex-match-count");
const captureCountNode = document.querySelector("#regex-capture-count");
const firstIndexNode = document.querySelector("#regex-first-index");
const previewLengthNode = document.querySelector("#regex-preview-length");
const matchesNode = document.querySelector("#regex-matches");
const previewNode = document.querySelector("#regex-preview");

const FLAG_ORDER = ["d", "g", "i", "m", "s", "u", "v", "y"];
const VALID_FLAGS = new Set(FLAG_ORDER);

const SAMPLES = {
  email: {
    pattern: "[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+",
    flags: "g",
    replacement: "<$&>",
    text: "Reach support@aifreelancer.co or hello@example.org.\nAlso try team+ops@studio.dev.",
    status: "Email addresses are highlighted and wrapped with angle brackets.",
  },
  url: {
    pattern: "https?:\\/\\/[^\n\\s)]+",
    flags: "g",
    replacement: "[$&]",
    text: "Open https://aifreelancer.co and https://github.com/openai.\nSkip the trailing punctuation.",
    status: "URLs are wrapped in brackets so you can see the match boundaries.",
  },
  hex: {
    pattern: "#(?:[0-9a-fA-F]{3}){1,2}\\b",
    flags: "g",
    replacement: "$&",
    text: "Palette: #0f62fe, #ff7a59, #222, and #C8D1E2.",
    status: "Hex colors are matched in short and long form.",
  },
  phone: {
    pattern: "(?:\\+1[-.\\s]?)?(?:\\(?\\d{3}\\)?[-.\\s]?)\\d{3}[-.\\s]?\\d{4}",
    flags: "g",
    replacement: "($&)",
    text: "Call 415-555-0134 or (212) 555-0198 for the demo line.",
    status: "Phone numbers are highlighted with optional country codes and separators.",
  },
  "swap-name": {
    pattern: "\\b([A-Z][a-z]+)\\s+([A-Z][a-z]+)\\b",
    flags: "g",
    replacement: "$2, $1",
    text: "Ada Lovelace collaborated with Grace Hopper on the plan.",
    status: "Captured first and last names are swapped in the preview.",
  },
};

let renderTimer = 0;

[patternInput, flagsInput, replacementInput, textInput].forEach((field) => {
  field.addEventListener("input", scheduleRender);
});

sampleButton.addEventListener("click", () => loadSample("email"));
clearButton.addEventListener("click", clearAll);
samplesMount.addEventListener("click", handleSampleClick);

loadSample("email");

function handleSampleClick(event) {
  const button = event.target.closest("[data-sample]");
  if (!button) {
    return;
  }

  loadSample(button.dataset.sample);
}

function loadSample(sampleKey) {
  const sample = SAMPLES[sampleKey];
  if (!sample) {
    return;
  }

  patternInput.value = sample.pattern;
  flagsInput.value = sample.flags;
  replacementInput.value = sample.replacement;
  textInput.value = sample.text;
  render(sample.status);
}

function clearAll() {
  patternInput.value = "";
  flagsInput.value = "";
  replacementInput.value = "";
  textInput.value = "";
  render("Enter a pattern and some text to see live matches.");
}

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(() => render(), 120);
}

function render(forcedStatus) {
  const pattern = patternInput.value;
  const text = textInput.value;
  const replacement = replacementInput.value;

  if (!pattern.trim()) {
    showIdleState(forcedStatus ?? "Enter a pattern and some text to see live matches.");
    return;
  }

  let regex;
  let flags;
  try {
    ({ regex, flags } = compileRegex(pattern, flagsInput.value));
  } catch (error) {
    showError(error.message);
    return;
  }

  const matches = collectMatches(regex, text);
  const captureCount = matches[0]?.captures.length ?? 0;
  const preview = text.replace(new RegExp(pattern, flags), replacement);

  matchCountNode.textContent = matches.length.toString();
  captureCountNode.textContent = captureCount.toString();
  firstIndexNode.textContent = matches[0] ? matches[0].index.toString() : "—";
  previewLengthNode.textContent = preview.length.toString();
  if (!text) {
    previewNode.textContent = "Paste test text to preview the replacement output.";
  } else if (preview.length) {
    previewNode.textContent = preview;
  } else {
    previewNode.textContent = "The replacement preview is empty because the rule removed all text.";
  }

  if (!text) {
    updateStatus(forcedStatus ?? "Pattern is valid. Add test text to see live matches and replacement output.");
  } else if (!matches.length) {
    updateStatus(forcedStatus ?? "Pattern is valid, but it does not match the current text.");
  } else {
    updateStatus(
      forcedStatus ?? `Pattern is valid. Found ${matches.length} match${matches.length === 1 ? "" : "es"} and updated the replacement preview locally.`,
      true,
    );
  }

  renderMatches(matches);
}

function showIdleState(message) {
  matchCountNode.textContent = "0";
  captureCountNode.textContent = "0";
  firstIndexNode.textContent = "—";
  previewLengthNode.textContent = "0";
  previewNode.textContent = "Paste test text to preview the replacement output.";
  matchesNode.innerHTML = `
    <div class="empty-state">
      <strong class="empty-title">No matches yet</strong>
      <p>Paste text or load a sample to see the matching rows appear here.</p>
    </div>
  `;
  updateStatus(message);
}

function showError(message) {
  matchCountNode.textContent = "0";
  captureCountNode.textContent = "0";
  firstIndexNode.textContent = "—";
  previewLengthNode.textContent = "0";
  previewNode.textContent = "Fix the regex pattern to see a replacement preview.";
  matchesNode.innerHTML = `
    <div class="empty-state">
      <strong class="empty-title">Pattern error</strong>
      <p>The browser could not compile this regular expression.</p>
    </div>
  `;
  statusNode.className = "json-status is-invalid";
  statusNode.textContent = message;
}

function updateStatus(message, isValid = false) {
  statusNode.className = isValid ? "json-status is-valid" : "json-status";
  statusNode.textContent = message;
}

function compileRegex(pattern, rawFlags) {
  const flags = normalizeFlags(rawFlags);
  return {
    regex: new RegExp(pattern, flags),
    flags,
  };
}

function normalizeFlags(rawFlags) {
  const cleaned = (rawFlags || "").toLowerCase().replace(/\s+/g, "");
  const seen = new Set();
  const normalized = [];

  for (const flag of cleaned) {
    if (!VALID_FLAGS.has(flag)) {
      throw new Error(`Unsupported flag "${flag}". Use standard JavaScript flags like d, g, i, m, s, u, v, and y.`);
    }

    if (!seen.has(flag)) {
      seen.add(flag);
      normalized.push(flag);
    }
  }

  return FLAG_ORDER.filter((flag) => normalized.includes(flag)).join("");
}

function collectMatches(regex, text) {
  if (!text) {
    return [];
  }

  if (regex.global) {
    return Array.from(text.matchAll(regex), buildMatchRecord);
  }

  const match = regex.exec(text);
  return match ? [buildMatchRecord(match)] : [];
}

function buildMatchRecord(match) {
  return {
    text: match[0],
    index: match.index ?? 0,
    captures: match.slice(1),
    groups: match.groups ?? null,
  };
}

function renderMatches(matches) {
  if (!matches.length) {
    matchesNode.innerHTML = `
      <div class="empty-state">
        <strong class="empty-title">No visible matches</strong>
        <p>The regex compiled successfully, but nothing matched the current test text.</p>
      </div>
    `;
    return;
  }

  matchesNode.innerHTML = matches
    .map((match, index) => {
      const captureRows = match.captures.length
        ? match.captures
            .map(
              (capture, captureIndex) => `
                <div class="helper-copy"><strong>Group ${captureIndex + 1}:</strong> ${capture === undefined ? "<span class=\"mono\">undefined</span>" : `<span class=\"mono\">${escapeHtml(capture)}</span>`}</div>
              `,
            )
            .join("")
        : `<p class="helper-copy">No capture groups for this match.</p>`;

      const namedGroups = match.groups
        ? `<pre class="code-snippet stack-space-md">${escapeHtml(JSON.stringify(match.groups, null, 2))}</pre>`
        : "";

      return `
        <article class="result-card">
          <h3>Match ${index + 1}</h3>
          <p class="result-number mono mono-wrap-soft">${escapeHtml(match.text)}</p>
          <p class="helper-copy">Index ${match.index} · Length ${match.text.length}</p>
          <div class="panel stack-space-md">
            ${captureRows}
          </div>
          ${namedGroups}
        </article>
      `;
    })
    .join("");
}
