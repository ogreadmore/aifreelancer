import { escapeHtml, initCommon } from "../common.js";

initCommon("case-converter");

const inputNode = document.querySelector("#case-input");
const outputNode = document.querySelector("#case-output");
const statusNode = document.querySelector("#case-status");
const noteNode = document.querySelector("#case-active-note");
const inputCharsNode = document.querySelector("#case-input-chars");
const inputWordsNode = document.querySelector("#case-input-words");
const outputCharsNode = document.querySelector("#case-output-chars");
const outputWordsNode = document.querySelector("#case-output-words");
const modeButtonsNode = document.querySelector("#case-mode-buttons");
const conversionsNode = document.querySelector("#case-conversions");

const sampleText = `AI Freelancer Tools
Build practical utilities fast.
Use title case, camelCase, snake_case, or CONSTANT_CASE when the job calls for it.`;

const modes = [
  { id: "upper", label: "Uppercase", description: "ALL CAPS", transform: (value) => value.toUpperCase() },
  { id: "lower", label: "Lowercase", description: "all lower-case", transform: (value) => value.toLowerCase() },
  { id: "title", label: "Title Case", description: "Capitalize Each Word", transform: transformTitleCase },
  { id: "sentence", label: "Sentence Case", description: "Only the first letter starts uppercase", transform: transformSentenceCase },
  { id: "toggle", label: "Toggle Case", description: "Flip every letter", transform: transformToggleCase },
  { id: "camel", label: "camelCase", description: "developer-friendly variable names", transform: transformCamelCase },
  { id: "pascal", label: "PascalCase", description: "UpperCamelCase names", transform: transformPascalCase },
  { id: "snake", label: "snake_case", description: "underscore_separated_names", transform: transformSnakeCase },
  { id: "kebab", label: "kebab-case", description: "hyphen-separated-names", transform: transformKebabCase },
  { id: "constant", label: "CONSTANT_CASE", description: "UPPER_SNAKE_CASE values", transform: transformConstantCase },
];

const modeLookup = Object.fromEntries(modes.map((mode) => [mode.id, mode]));
let activeMode = "title";
let renderedOutputs = {};

document.querySelector("#case-copy").addEventListener("click", copyActiveOutput);
document.querySelector("#case-swap").addEventListener("click", swapInputAndOutput);
document.querySelector("#case-sample").addEventListener("click", loadSample);
document.querySelector("#case-clear").addEventListener("click", clearAll);
inputNode.addEventListener("input", renderAll);
conversionsNode.addEventListener("click", handleConversionClick);

renderModeButtons();
renderAll();

function renderModeButtons() {
  modeButtonsNode.innerHTML = modes
    .map(
      (mode) => `
        <button
          class="button ${mode.id === activeMode ? "button-primary" : "button-secondary"}"
          type="button"
          data-mode="${mode.id}"
          aria-pressed="${mode.id === activeMode ? "true" : "false"}"
        >
          ${escapeHtml(mode.label)}
        </button>
      `,
    )
    .join("");
}

function handleConversionClick(event) {
  const button = event.target.closest("[data-mode-copy]");
  if (!button) {
    const modeButton = event.target.closest("[data-mode]");
    if (!modeButton) {
      return;
    }

    activeMode = modeButton.dataset.mode;
    renderModeButtons();
    renderAll();
    return;
  }

  const mode = button.dataset.modeCopy;
  copyText(renderedOutputs[mode] ?? "", `${modeLookup[mode].label} copied to your clipboard.`);
}

async function copyActiveOutput() {
  const output = renderedOutputs[activeMode] ?? "";
  if (!output) {
    setStatus("There is no output to copy yet.");
    return;
  }

  await copyText(output, `${modeLookup[activeMode].label} output copied to your clipboard.`);
}

function swapInputAndOutput() {
  const nextInput = renderedOutputs[activeMode] ?? "";
  inputNode.value = nextInput;
  renderAll();
  setStatus(`Swapped the input with ${modeLookup[activeMode].label}.`);
}

function loadSample() {
  inputNode.value = sampleText;
  renderAll();
  setStatus("Loaded a sample text block for case conversion.");
}

function clearAll() {
  inputNode.value = "";
  renderedOutputs = {};
  renderAll();
  setStatus("Cleared the converter.");
}

function renderAll() {
  const inputValue = normalizeNewlines(inputNode.value);
  renderedOutputs = Object.fromEntries(modes.map((mode) => [mode.id, mode.transform(inputValue)]));
  const activeOutput = renderedOutputs[activeMode] ?? "";

  outputNode.textContent = activeOutput;
  noteNode.textContent = `${modeLookup[activeMode].label} is the active preview.`;

  inputCharsNode.textContent = inputValue.length.toString();
  inputWordsNode.textContent = countWords(inputValue).toString();
  outputCharsNode.textContent = activeOutput.length.toString();
  outputWordsNode.textContent = countWords(activeOutput).toString();

  conversionsNode.innerHTML = modes
    .map((mode) => renderConversionCard(mode, renderedOutputs[mode.id] ?? ""))
    .join("");
}

function renderConversionCard(mode, value) {
  const isActive = mode.id === activeMode;
  return `
    <article class="result-card ${isActive ? "is-active" : ""}">
      <div class="panel-head">
        <div>
          <h3>${escapeHtml(mode.label)}</h3>
          <p class="helper-copy">${escapeHtml(mode.description)}</p>
        </div>
        <div class="button-row">
          <button class="button button-secondary" type="button" data-mode-copy="${mode.id}">Copy</button>
        </div>
      </div>
      <pre class="json-output">${escapeHtml(value || "")}</pre>
    </article>
  `;
}

function setStatus(message) {
  statusNode.className = "json-status";
  statusNode.textContent = message;
}

function renderStatusCopy(text) {
  statusNode.className = "json-status is-valid";
  statusNode.textContent = text;
}

async function copyText(value, successMessage) {
  if (!value) {
    setStatus("There is no output to copy yet.");
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      fallbackCopy(value);
    }
    renderStatusCopy(successMessage);
  } catch {
    setStatus("Clipboard copy was blocked by the browser.");
  }
}

function fallbackCopy(value) {
  const tempNode = document.createElement("textarea");
  tempNode.value = value;
  tempNode.setAttribute("readonly", "true");
  tempNode.style.position = "absolute";
  tempNode.style.left = "-9999px";
  document.body.appendChild(tempNode);
  tempNode.select();
  document.execCommand("copy");
  tempNode.remove();
}

function normalizeNewlines(value) {
  return String(value).replaceAll("\r\n", "\n");
}

function countWords(value) {
  const words = extractWords(value);
  return words.length;
}

function extractWords(value) {
  const normalized = normalizeNewlines(value)
    .replace(/([\p{Ll}\p{N}])([\p{Lu}])/gu, "$1 $2")
    .replace(/([\p{Lu}]+)([\p{Lu}][\p{Ll}\p{N}])/gu, "$1 $2");

  return normalized.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) ?? [];
}

function transformTitleCase(value) {
  return transformLineByLine(value, (line) =>
    line
      .replace(/([\p{Ll}\p{N}])([\p{Lu}])/gu, "$1 $2")
      .replace(/([\p{Lu}]+)([\p{Lu}][\p{Ll}\p{N}])/gu, "$1 $2")
      .replace(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu, (match) => capitalize(match.toLocaleLowerCase())),
  );
}

function transformSentenceCase(value) {
  return transformLineByLine(value, (line) => {
    const lower = line.toLocaleLowerCase();
    return lower.replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_, leading, letter) => `${leading}${letter.toLocaleUpperCase()}`);
  });
}

function transformToggleCase(value) {
  return transformLineByLine(value, (line) =>
    Array.from(line)
      .map((character) => {
        const upper = character.toUpperCase();
        const lower = character.toLowerCase();
        if (upper === lower) {
          return character;
        }
        return character === upper ? lower : upper;
      })
      .join(""),
  );
}

function transformCamelCase(value) {
  return transformWordsByLine(value, (words) =>
    words
      .map((word, index) => (index === 0 ? word.toLowerCase() : capitalize(word.toLowerCase())))
      .join(""),
  );
}

function transformPascalCase(value) {
  return transformWordsByLine(value, (words) =>
    words.map((word) => capitalize(word.toLowerCase())).join(""),
  );
}

function transformSnakeCase(value) {
  return transformWordsByLine(value, (words) =>
    words.map((word) => word.toLowerCase()).join("_"),
  );
}

function transformKebabCase(value) {
  return transformWordsByLine(value, (words) =>
    words.map((word) => word.toLowerCase()).join("-"),
  );
}

function transformConstantCase(value) {
  return transformWordsByLine(value, (words) =>
    words.map((word) => word.toUpperCase()).join("_"),
  );
}

function transformWordsByLine(value, transformWords) {
  return transformLineByLine(value, (line) => {
    const words = extractWords(line).map((word) => word.toLowerCase());
    if (!words.length) {
      return "";
    }

    return transformWords(words);
  });
}

function transformLineByLine(value, transformLine) {
  const normalized = normalizeNewlines(value);
  if (!normalized) {
    return "";
  }

  return normalized
    .split("\n")
    .map((line) => transformLine(line))
    .join("\n");
}

function capitalize(value) {
  if (!value) {
    return value;
  }

  const [first, ...rest] = Array.from(value);
  return `${first.toLocaleUpperCase()}${rest.join("")}`;
}
