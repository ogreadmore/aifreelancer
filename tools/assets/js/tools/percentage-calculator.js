import { initCommon } from "../common.js";

initCommon("percentage-calculator");

const modeInput = document.querySelector("#percentage-mode");
const aInput = document.querySelector("#percentage-a");
const bInput = document.querySelector("#percentage-b");
const cField = document.querySelector("#percentage-c-field");
const cInput = document.querySelector("#percentage-c");

const aLabel = document.querySelector("#percentage-a-label");
const bLabel = document.querySelector("#percentage-b-label");
const cLabel = document.querySelector("#percentage-c-label");

const outputNode = document.querySelector("#percentage-output");
const formulaNode = document.querySelector("#percentage-formula");
const summaryModeNode = document.querySelector("#percentage-summary-mode");
const summaryExpressionNode = document.querySelector("#percentage-summary-expression");
const summaryResultNode = document.querySelector("#percentage-summary-result");
const summaryStatusNode = document.querySelector("#percentage-summary-status");
const plainNode = document.querySelector("#percentage-plain");
const workNode = document.querySelector("#percentage-work");
const noteNode = document.querySelector("#percentage-note");
const sampleButton = document.querySelector("#percentage-sample");
const clearButton = document.querySelector("#percentage-clear");

const sampleValues = {
  of: { a: 15, b: 200, c: 0 },
  "part-of-whole": { a: 45, b: 180, c: 0 },
  change: { a: 80, b: 100, c: 100 },
  reverse: { a: 20, b: 80, c: 0 },
};

const modeConfig = {
  of: {
    title: "X% of Y",
    aLabel: "Percent",
    bLabel: "Base value",
    cLabel: "Result",
    resultLabel: "Amount",
    cVisible: false,
    compute: ({ a, b }) => {
      const result = (a / 100) * b;
      return {
        result,
        expression: `${formatNumber(a)}% of ${formatNumber(b)}`,
        formula: `${formatNumber(a)}% of ${formatNumber(b)} = ${formatNumber(result)}`,
        work: `${formatNumber(a / 100, { maximumFractionDigits: 6 })} × ${formatNumber(b)} = ${formatNumber(result)}`,
        plain: `${numberToWords(a)} percent of ${numberToWords(b)} is ${numberToWords(result)}.`,
        note: "This is the basic percentage-of calculation.",
      };
    },
  },
  "part-of-whole": {
    title: "X is what % of Y",
    aLabel: "Part",
    bLabel: "Whole",
    cLabel: "Percent",
    resultLabel: "Percent",
    cVisible: false,
    compute: ({ a, b }) => {
      if (b === 0) {
        return {
          result: null,
          expression: `${formatNumber(a)} out of ${formatNumber(b)}`,
          formula: `Cannot calculate a percentage of zero`,
          work: `percentage = part ÷ whole × 100`,
          plain: `A percentage cannot be calculated from zero as the whole.`,
          note: "Enter a non-zero whole value to continue.",
          status: "Waiting for a non-zero whole",
        };
      }

      const result = (a / b) * 100;
      return {
        result,
        expression: `${formatNumber(a)} out of ${formatNumber(b)}`,
        formula: `${formatNumber(a)} ÷ ${formatNumber(b)} × 100 = ${formatNumber(result)}%`,
        work: `${formatNumber(a)} ÷ ${formatNumber(b)} = ${formatNumber(a / b, { maximumFractionDigits: 6 })}`,
        plain: `${numberToWords(a)} is ${numberToWords(result)} percent of ${numberToWords(b)}.`,
        note: "This is useful for ratios, scorecards, and progress checks.",
      };
    },
  },
  change: {
    title: "Percentage increase or decrease",
    aLabel: "Original value",
    bLabel: "New value",
    cLabel: "Direction",
    resultLabel: "Change",
    cVisible: false,
    compute: ({ a, b }) => {
      if (a === 0) {
        return {
          result: null,
          expression: `${formatNumber(a)} to ${formatNumber(b)}`,
          formula: `Cannot calculate percentage change from zero`,
          work: `percentage change = (new - original) ÷ original × 100`,
          plain: `Percentage change from zero is not defined.`,
          note: "Use a non-zero original value.",
          status: "Waiting for a non-zero original value",
        };
      }

      const delta = b - a;
      const result = (delta / a) * 100;
      const direction = result >= 0 ? "increase" : "decrease";
      return {
        result,
        expression: `${formatNumber(a)} to ${formatNumber(b)}`,
        formula: `${formatNumber(b)} - ${formatNumber(a)} = ${formatNumber(delta)}; ${formatNumber(delta)} ÷ ${formatNumber(a)} × 100 = ${formatNumber(result)}%`,
        work: `(${formatNumber(b)} - ${formatNumber(a)}) ÷ ${formatNumber(a)} × 100 = ${formatNumber(result)}%`,
        plain: `The value changed by ${numberToWords(Math.abs(result))} percent, which is a ${direction}.`,
        note: `A positive answer means increase; a negative answer means decrease.`,
      };
    },
  },
  reverse: {
    title: "Reverse percentage",
    aLabel: "Percent change",
    bLabel: "Final value",
    cLabel: "Original value",
    resultLabel: "Original",
    cVisible: false,
    compute: ({ a, b }) => {
      const factor = 1 + (a / 100);
      if (factor === 0) {
        return {
          result: null,
          expression: `${formatNumber(b)} with ${formatNumber(a)}% change`,
          formula: `Cannot reverse a -100% change`,
          work: `original = final ÷ (1 + rate)`,
          plain: `A -100 percent change cannot be reversed.`,
          note: "Choose a different rate.",
          status: "Waiting for a reversible rate",
        };
      }

      const result = b / factor;
      const multiplier = factor >= 1 ? "markup" : "discount";
      return {
        result,
        expression: `${formatNumber(b)} after ${formatNumber(a)}% ${multiplier}`,
        formula: `${formatNumber(b)} ÷ ${formatNumber(factor, { maximumFractionDigits: 6 })} = ${formatNumber(result)}`,
        work: `final ÷ ${(factor).toFixed(6)} = original`,
        plain: `The original value before a ${numberToWords(Math.abs(a))} percent ${multiplier} was ${numberToWords(result)}.`,
        note: "This is handy when you know the sale price but want the original price.",
      };
    },
  },
};

[modeInput, aInput, bInput, cInput].forEach((node) => {
  node.addEventListener("input", update);
  node.addEventListener("change", update);
});

modeInput.addEventListener("change", updateMode);
sampleButton.addEventListener("click", loadSample);
clearButton.addEventListener("click", clearAll);

updateMode();

function updateMode() {
  const config = modeConfig[modeInput.value];
  aLabel.textContent = config.aLabel;
  bLabel.textContent = config.bLabel;
  cLabel.textContent = config.cLabel;
  cField.style.display = config.cVisible ? "" : "none";
  if (!config.cVisible) {
    cInput.value = "";
  }
  summaryModeNode.textContent = config.title;
  update();
}

function loadSample() {
  const config = sampleValues[modeInput.value];
  aInput.value = config.a;
  bInput.value = config.b;
  cInput.value = config.c;
  update();
}

function clearAll() {
  aInput.value = "";
  bInput.value = "";
  cInput.value = "";
  update();
}

function update() {
  const config = modeConfig[modeInput.value];
  const a = readNumber(aInput.value);
  const b = readNumber(bInput.value);
  const c = readNumber(cInput.value);
  const state = config.compute({ a, b, c });

  summaryExpressionNode.textContent = state.expression;
  summaryResultNode.textContent = config.resultLabel;
  summaryStatusNode.textContent = state.status || "Ready";

  if (state.result === null || Number.isNaN(state.result)) {
    outputNode.textContent = "—";
  } else if (modeInput.value === "change") {
    outputNode.textContent = `${formatNumber(state.result)}%`;
  } else {
    outputNode.textContent = formatNumber(state.result);
  }

  formulaNode.textContent = state.formula;
  plainNode.textContent = state.plain;
  workNode.textContent = state.work;
  noteNode.textContent = state.note;
}

function readNumber(value) {
  if (value === "") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  const absoluteValue = Math.abs(value);
  if (absoluteValue !== 0 && (absoluteValue < 0.000001 || absoluteValue >= 1_000_000_000)) {
    return value.toExponential(4);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
    ...options,
  }).format(value);
}

function numberToWords(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "not available";
  }

  const formatted = formatNumber(value, { maximumFractionDigits: 6 });
  return formatted.replaceAll("-", "minus ").replaceAll(",", "");
}
