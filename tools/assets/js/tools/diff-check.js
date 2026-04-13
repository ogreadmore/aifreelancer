import { escapeHtml, initCommon } from "../common.js";
import {
  buildRows,
  createLineComparator,
  diffSequence,
  normalizeComparable,
  normalizeNewlines,
  splitLines,
  tokenize,
} from "../lib/diff-engine.js";

initCommon("diff-check");

const leftInput = document.querySelector("#diff-left");
const rightInput = document.querySelector("#diff-right");
const compareButton = document.querySelector("#diff-compare");
const swapButton = document.querySelector("#diff-swap");
const sampleButton = document.querySelector("#diff-sample");
const clearButton = document.querySelector("#diff-clear");
const ignoreWhitespace = document.querySelector("#diff-ignore-whitespace");
const ignoreCase = document.querySelector("#diff-ignore-case");
const hideUnchanged = document.querySelector("#diff-hide-unchanged");
const resultsMount = document.querySelector("#diff-results");
const summaryNodes = {
  unchanged: document.querySelector("#summary-unchanged"),
  changed: document.querySelector("#summary-changed"),
  added: document.querySelector("#summary-added"),
  removed: document.querySelector("#summary-removed"),
};

const MAX_COMPARE_CELLS = 4_000_000;
let compareTimer = 0;

const sampleOriginal = `AI Freelancer Tools
Ship practical utilities fast.
Every tool runs locally in the browser.
Start with Diff Check and keep growing.`;

const sampleRevised = `AI Freelancer Tools
Ship practical utilities faster.
Every tool runs locally in the browser.
Start with Diff Check, then add the next tools as you need them.
Keep the useful stuff inside your own brand.`;

[leftInput, rightInput].forEach((field) => {
  field.addEventListener("input", scheduleCompare);
});

[ignoreWhitespace, ignoreCase, hideUnchanged].forEach((field) => {
  field.addEventListener("change", runCompare);
});

compareButton.addEventListener("click", runCompare);
swapButton.addEventListener("click", swapSides);
sampleButton.addEventListener("click", loadSample);
clearButton.addEventListener("click", clearAll);

renderEmpty();

function loadSample() {
  leftInput.value = sampleOriginal;
  rightInput.value = sampleRevised;
  runCompare();
}

function clearAll() {
  leftInput.value = "";
  rightInput.value = "";
  renderEmpty();
}

function swapSides() {
  const nextLeft = rightInput.value;
  rightInput.value = leftInput.value;
  leftInput.value = nextLeft;
  runCompare();
}

function scheduleCompare() {
  window.clearTimeout(compareTimer);
  compareTimer = window.setTimeout(runCompare, 180);
}

function runCompare() {
  const leftText = normalizeNewlines(leftInput.value);
  const rightText = normalizeNewlines(rightInput.value);

  if (!leftText && !rightText) {
    renderEmpty();
    return;
  }

  const leftLines = splitLines(leftText);
  const rightLines = splitLines(rightText);

  if (leftLines.length * rightLines.length > MAX_COMPARE_CELLS) {
    resultsMount.innerHTML = `
      <div class="empty-state">
        <strong class="empty-title">Comparison is too large for live browser diffing</strong>
        <p>Try trimming the input or comparing smaller sections at a time.</p>
      </div>
    `;
    setSummary({ unchanged: 0, changed: 0, added: 0, removed: 0 });
    return;
  }

  const operations = diffSequence(leftLines, rightLines, createLineComparator(getCompareOptions()));
  const rows = buildRows(operations, getCompareOptions());

  setSummary({
    unchanged: rows.filter((row) => row.type === "equal").length,
    changed: rows.filter((row) => row.type === "change").length,
    added: rows.filter((row) => row.type === "insert").length,
    removed: rows.filter((row) => row.type === "delete").length,
  });

  renderRows(rows);
}

function renderRows(rows) {
  const visibleRows = hideUnchanged.checked
    ? rows.filter((row) => row.type !== "equal")
    : rows;

  if (!visibleRows.length) {
    resultsMount.innerHTML = `
      <div class="empty-state">
        <strong class="empty-title">No visible differences</strong>
        <p>The current inputs match under your active comparison settings.</p>
      </div>
    `;
    return;
  }

  resultsMount.innerHTML = visibleRows.map(renderRow).join("");
}

function renderRow(row) {
  const inlineDiff = row.type === "change"
    ? getInlineDiff(row.leftText, row.rightText)
    : {
        leftHtml: renderPlainLine(row.leftText, row.type === "insert"),
        rightHtml: renderPlainLine(row.rightText, row.type === "delete"),
      };

  return `
    <article class="diff-row diff-row--${row.type}">
      ${renderPane({
        side: "left",
        lineNumber: row.leftNumber,
        html: inlineDiff.leftHtml,
      })}
      ${renderPane({
        side: "right",
        lineNumber: row.rightNumber,
        html: inlineDiff.rightHtml,
      })}
    </article>
  `;
}

function renderPane({ side, lineNumber, html }) {
  return `
    <div class="diff-pane diff-pane--${side}">
      <div class="diff-gutter">${lineNumber ?? ""}</div>
      <div class="diff-code">${html}</div>
    </div>
  `;
}

function renderPlainLine(value, isMissing) {
  if (isMissing) {
    return `<span class="ghost-line">No line</span>`;
  }

  if (value === "") {
    return `<span class="ghost-line">Blank line</span>`;
  }

  return escapeHtml(value);
}

function renderEmpty() {
  resultsMount.innerHTML = `
    <div class="empty-state">
      <strong class="empty-title">Nothing to compare yet</strong>
      <p>Paste two versions above or load the sample text to see the diff viewer in action.</p>
    </div>
  `;
  setSummary({ unchanged: 0, changed: 0, added: 0, removed: 0 });
}

function setSummary(counts) {
  summaryNodes.unchanged.textContent = counts.unchanged.toString();
  summaryNodes.changed.textContent = counts.changed.toString();
  summaryNodes.added.textContent = counts.added.toString();
  summaryNodes.removed.textContent = counts.removed.toString();
}

function getInlineDiff(leftText, rightText) {
  const leftTokens = tokenize(leftText);
  const rightTokens = tokenize(rightText);

  if (!leftTokens.length || !rightTokens.length || leftTokens.length * rightTokens.length > 25_000) {
    return {
      leftHtml: renderPlainLine(leftText, false),
      rightHtml: renderPlainLine(rightText, false),
    };
  }

  const operations = diffSequence(leftTokens, rightTokens, (left, right) => {
    const nextLeft = normalizeComparable(left, {
      ignoreCase: ignoreCase.checked,
      ignoreWhitespace: ignoreWhitespace.checked,
    });
    const nextRight = normalizeComparable(right, {
      ignoreCase: ignoreCase.checked,
      ignoreWhitespace: ignoreWhitespace.checked,
    });
    return nextLeft === nextRight;
  });

  const leftParts = [];
  const rightParts = [];

  operations.forEach((operation) => {
    if (operation.type === "equal") {
      leftParts.push(renderToken(operation.leftValue, "token-neutral"));
      rightParts.push(renderToken(operation.rightValue, "token-neutral"));
      return;
    }

    if (operation.type === "delete") {
      leftParts.push(renderToken(operation.leftValue, "token-delete"));
      return;
    }

    rightParts.push(renderToken(operation.rightValue, "token-insert"));
  });

  return {
    leftHtml: leftParts.join("") || `<span class="ghost-line">No line</span>`,
    rightHtml: rightParts.join("") || `<span class="ghost-line">No line</span>`,
  };
}

function renderToken(value, className) {
  return `<span class="${className}">${escapeHtml(value)}</span>`;
}

function getCompareOptions() {
  return {
    ignoreWhitespace: ignoreWhitespace.checked,
    ignoreCase: ignoreCase.checked,
  };
}
