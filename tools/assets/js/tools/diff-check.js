import { escapeHtml, initCommon } from "../common.js";

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

const sampleOriginal = `AIFreelancer Tools
Ship practical utilities fast.
Every tool runs locally in the browser.
Start with Diff Check and keep growing.`;

const sampleRevised = `AIFreelancer Tools
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

  const operations = diffSequence(leftLines, rightLines, areLinesEqual);
  const rows = buildRows(operations);

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

function normalizeNewlines(value) {
  return value.replaceAll("\r\n", "\n");
}

function splitLines(value) {
  return value === "" ? [] : value.split("\n");
}

function areLinesEqual(left, right) {
  return normalizeComparable(left) === normalizeComparable(right);
}

function normalizeComparable(value) {
  let nextValue = value;

  if (ignoreWhitespace.checked) {
    nextValue = nextValue.trim().replace(/\s+/g, " ");
  }

  if (ignoreCase.checked) {
    nextValue = nextValue.toLowerCase();
  }

  return nextValue;
}

function diffSequence(leftItems, rightItems, isEqual) {
  const directions = Array.from({ length: leftItems.length + 1 }, () => new Uint8Array(rightItems.length + 1));
  let previousRow = new Uint32Array(rightItems.length + 1);

  for (let leftIndex = 1; leftIndex <= leftItems.length; leftIndex += 1) {
    const currentRow = new Uint32Array(rightItems.length + 1);

    for (let rightIndex = 1; rightIndex <= rightItems.length; rightIndex += 1) {
      if (isEqual(leftItems[leftIndex - 1], rightItems[rightIndex - 1])) {
        currentRow[rightIndex] = previousRow[rightIndex - 1] + 1;
        directions[leftIndex][rightIndex] = 3;
      } else if (previousRow[rightIndex] >= currentRow[rightIndex - 1]) {
        currentRow[rightIndex] = previousRow[rightIndex];
        directions[leftIndex][rightIndex] = 1;
      } else {
        currentRow[rightIndex] = currentRow[rightIndex - 1];
        directions[leftIndex][rightIndex] = 2;
      }
    }

    previousRow = currentRow;
  }

  const operations = [];
  let leftIndex = leftItems.length;
  let rightIndex = rightItems.length;

  while (leftIndex > 0 || rightIndex > 0) {
    if (leftIndex > 0 && rightIndex > 0 && directions[leftIndex][rightIndex] === 3) {
      operations.push({
        type: "equal",
        leftValue: leftItems[leftIndex - 1],
        rightValue: rightItems[rightIndex - 1],
      });
      leftIndex -= 1;
      rightIndex -= 1;
    } else if (rightIndex > 0 && (leftIndex === 0 || directions[leftIndex][rightIndex] === 2)) {
      operations.push({
        type: "insert",
        rightValue: rightItems[rightIndex - 1],
      });
      rightIndex -= 1;
    } else {
      operations.push({
        type: "delete",
        leftValue: leftItems[leftIndex - 1],
      });
      leftIndex -= 1;
    }
  }

  return operations.reverse();
}

function buildRows(operations) {
  const rows = [];
  let leftNumber = 1;
  let rightNumber = 1;

  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index];

    if (operation.type === "equal") {
      rows.push({
        type: "equal",
        leftNumber,
        rightNumber,
        leftText: operation.leftValue,
        rightText: operation.rightValue,
      });
      leftNumber += 1;
      rightNumber += 1;
      continue;
    }

    const deleted = [];
    const inserted = [];

    while (index < operations.length && operations[index].type !== "equal") {
      if (operations[index].type === "delete") {
        deleted.push(operations[index].leftValue);
      } else {
        inserted.push(operations[index].rightValue);
      }
      index += 1;
    }

    index -= 1;

    const pairCount = Math.max(deleted.length, inserted.length);
    for (let rowIndex = 0; rowIndex < pairCount; rowIndex += 1) {
      const hasLeft = rowIndex < deleted.length;
      const hasRight = rowIndex < inserted.length;

      rows.push({
        type: hasLeft && hasRight ? "change" : hasLeft ? "delete" : "insert",
        leftNumber: hasLeft ? leftNumber : null,
        rightNumber: hasRight ? rightNumber : null,
        leftText: hasLeft ? deleted[rowIndex] : "",
        rightText: hasRight ? inserted[rowIndex] : "",
      });

      if (hasLeft) {
        leftNumber += 1;
      }

      if (hasRight) {
        rightNumber += 1;
      }
    }
  }

  return rows;
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
    const nextLeft = ignoreCase.checked ? left.toLowerCase() : left;
    const nextRight = ignoreCase.checked ? right.toLowerCase() : right;
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

function tokenize(value) {
  return value.match(/(\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_])/g) ?? [];
}
