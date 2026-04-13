import { initCommon } from "../common.js";

initCommon("list-cleaner");

const inputNode = document.querySelector("#list-cleaner-input");
const outputNode = document.querySelector("#list-cleaner-output");
const copyButton = document.querySelector("#list-cleaner-copy");
const sampleButton = document.querySelector("#list-cleaner-sample");
const clearButton = document.querySelector("#list-cleaner-clear");
const trimNode = document.querySelector("#list-cleaner-trim");
const blanksNode = document.querySelector("#list-cleaner-blanks");
const dedupeNode = document.querySelector("#list-cleaner-dedupe");
const lowercaseNode = document.querySelector("#list-cleaner-lowercase");
const uppercaseNode = document.querySelector("#list-cleaner-uppercase");
const preserveCaseNode = document.querySelector("#list-cleaner-preserve-case");
const sortNode = document.querySelector("#list-cleaner-sort");
const prefixNode = document.querySelector("#list-cleaner-prefix");
const suffixNode = document.querySelector("#list-cleaner-suffix");
const statusNode = document.querySelector("#list-cleaner-status");
const linesNode = document.querySelector("#list-cleaner-lines");
const nonEmptyNode = document.querySelector("#list-cleaner-non-empty");
const charactersNode = document.querySelector("#list-cleaner-characters");
const removedNode = document.querySelector("#list-cleaner-removed");

const sampleList = `  Zebra
apple
Banana

banana
item-10
item-2
  café  
apple`;

const naturalCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

inputNode.addEventListener("input", render);
[
  trimNode,
  blanksNode,
  dedupeNode,
  lowercaseNode,
  uppercaseNode,
  preserveCaseNode,
  sortNode,
].forEach((node) => node.addEventListener("change", render));

[prefixNode, suffixNode].forEach((node) => node.addEventListener("input", render));

copyButton.addEventListener("click", copyCleanedList);
sampleButton.addEventListener("click", loadSample);
clearButton.addEventListener("click", clearAll);

render();

function render() {
  const rawText = normalizeNewlines(inputNode.value);
  const before = analyze(rawText);
  const cleaned = cleanList(rawText);
  const afterText = cleaned.join("\n");
  const after = analyze(afterText);
  const removedCount = Math.max(0, before.lines - after.lines);
  const removedByBlankOrDedupe = Math.max(0, before.nonEmptyLines - after.lines);

  outputNode.value = afterText;
  linesNode.textContent = `${before.lines} → ${after.lines}`;
  nonEmptyNode.textContent = `${before.nonEmptyLines} → ${after.nonEmptyLines}`;
  charactersNode.textContent = `${before.characters} → ${after.characters}`;
  removedNode.textContent = `${removedCount}`;

  statusNode.textContent = buildStatus(rawText, afterText, before, after, removedByBlankOrDedupe);

  copyButton.disabled = !afterText;
}

function cleanList(value) {
  const settings = getSettings();
  let lines = splitLines(normalizeNewlines(value));

  if (settings.trim) {
    lines = lines.map((line) => line.trim());
  }

  if (settings.removeBlanks) {
    lines = lines.filter((line) => line.trim().length > 0);
  }

  if (settings.caseMode === "lower") {
    lines = lines.map((line) => line.toLowerCase());
  } else if (settings.caseMode === "upper") {
    lines = lines.map((line) => line.toUpperCase());
  }

  if (settings.prefix || settings.suffix) {
    lines = lines.map((line) => `${settings.prefix}${line}${settings.suffix}`);
  }

  if (settings.dedupe) {
    const seen = new Set();
    lines = lines.filter((line) => {
      if (seen.has(line)) {
        return false;
      }
      seen.add(line);
      return true;
    });
  }

  if (settings.sortMode !== "none") {
    lines = sortLines(lines, settings.sortMode);
  }

  return lines;
}

function getSettings() {
  return {
    trim: trimNode.checked,
    removeBlanks: blanksNode.checked,
    dedupe: dedupeNode.checked,
    caseMode: lowercaseNode.checked ? "lower" : uppercaseNode.checked ? "upper" : "preserve",
    sortMode: sortNode.value,
    prefix: prefixNode.value,
    suffix: suffixNode.value,
  };
}

function sortLines(lines, sortMode) {
  const sorted = [...lines];

  sorted.sort((left, right) => {
    const comparison = sortMode === "natural"
      ? naturalCollator.compare(left, right)
      : left.localeCompare(right, undefined, { sensitivity: "base" });

    return sortMode === "desc" ? comparison * -1 : comparison;
  });

  return sorted;
}

function analyze(value) {
  const text = normalizeNewlines(value);
  const lines = splitLines(text);
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0).length;

  return {
    lines: text ? lines.length : 0,
    nonEmptyLines,
    characters: text.length,
  };
}

function splitLines(text) {
  if (!text) {
    return [];
  }

  return text.split("\n");
}

function normalizeNewlines(value) {
  return String(value).replace(/\r\n?/g, "\n");
}

async function copyCleanedList() {
  const text = outputNode.value;

  if (!text) {
    statusNode.textContent = "There is no cleaned list to copy yet.";
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    statusNode.textContent = "Cleaned list copied to your clipboard.";
  } catch {
    statusNode.textContent = "Clipboard copy was blocked by the browser.";
  }
}

function loadSample() {
  inputNode.value = sampleList;
  render();
}

function clearAll() {
  inputNode.value = "";
  prefixNode.value = "";
  suffixNode.value = "";
  trimNode.checked = true;
  blanksNode.checked = true;
  dedupeNode.checked = true;
  preserveCaseNode.checked = true;
  sortNode.value = "none";
  render();
}

function buildStatus(rawText, afterText, before, after, removedByBlankOrDedupe) {
  if (!before.lines) {
    return "Paste a list to clean it.";
  }

  if (rawText === afterText) {
    return "No changes were needed with the current settings.";
  }

  const pieces = [];

  if (before.lines !== after.lines) {
    pieces.push(`${before.lines - after.lines} line${before.lines - after.lines === 1 ? "" : "s"} removed`);
  }

  if (removedByBlankOrDedupe > 0) {
    pieces.push(`${removedByBlankOrDedupe} non-empty line${removedByBlankOrDedupe === 1 ? "" : "s"} collapsed by the current settings`);
  }

  if (!pieces.length) {
    return "List cleaned successfully.";
  }

  return pieces.join(". ") + ".";
}
