import { initCommon } from "../common.js";

initCommon("aspect-ratio-calculator");

const presetInput = document.querySelector("#ratio-preset");
const solveFromInput = document.querySelector("#solve-from");
const sourceLabel = document.querySelector("#source-label");
const sourceValueInput = document.querySelector("#source-value");
const scaleInput = document.querySelector("#scale-multiplier");
const roundInput = document.querySelector("#round-output");
const numeratorInput = document.querySelector("#ratio-numerator");
const denominatorInput = document.querySelector("#ratio-denominator");
const customFields = document.querySelector("#custom-ratio-fields");

const sampleButton = document.querySelector("#ratio-sample");
const clearButton = document.querySelector("#ratio-clear");

const computedDimensionNode = document.querySelector("#computed-dimension");
const computedFormulaNode = document.querySelector("#computed-formula");
const scaledPairNode = document.querySelector("#scaled-pair");
const scaledNoteNode = document.querySelector("#scaled-note");
const ratioMetadataNode = document.querySelector("#ratio-metadata");
const ratioDecimalNode = document.querySelector("#ratio-decimal");
const ratioStatusNode = document.querySelector("#ratio-status");
const ratioOrientationNode = document.querySelector("#ratio-orientation");
const ratioSimplifiedNode = document.querySelector("#ratio-simplified");
const ratioDecimalValueNode = document.querySelector("#ratio-decimal-value");
const ratioScaleNode = document.querySelector("#ratio-scale");

const presets = {
  "1:1": { numerator: 1, denominator: 1 },
  "4:3": { numerator: 4, denominator: 3 },
  "16:9": { numerator: 16, denominator: 9 },
  "21:9": { numerator: 21, denominator: 9 },
  "9:16": { numerator: 9, denominator: 16 },
};

const sample = {
  preset: "16:9",
  solveFrom: "width",
  sourceValue: 1920,
  scale: 1.5,
  round: true,
  numerator: 16,
  denominator: 9,
};

const state = {
  ratioKey: "16:9",
};

presetInput.addEventListener("change", handlePresetChange);
solveFromInput.addEventListener("change", update);
sourceValueInput.addEventListener("input", update);
scaleInput.addEventListener("input", update);
roundInput.addEventListener("change", update);
numeratorInput.addEventListener("input", update);
denominatorInput.addEventListener("input", update);
sampleButton.addEventListener("click", loadSample);
clearButton.addEventListener("click", clearAll);

updatePresetVisibility();
update();

function handlePresetChange() {
  state.ratioKey = presetInput.value;
  const preset = presets[presetInput.value];
  if (preset) {
    numeratorInput.value = String(preset.numerator);
    denominatorInput.value = String(preset.denominator);
  }

  updatePresetVisibility();
  update();
}

function loadSample() {
  presetInput.value = sample.preset;
  solveFromInput.value = sample.solveFrom;
  sourceValueInput.value = String(sample.sourceValue);
  scaleInput.value = String(sample.scale);
  roundInput.checked = sample.round;
  numeratorInput.value = String(sample.numerator);
  denominatorInput.value = String(sample.denominator);
  state.ratioKey = sample.preset;
  updatePresetVisibility();
  update();
}

function clearAll() {
  presetInput.value = "16:9";
  solveFromInput.value = "width";
  sourceValueInput.value = "";
  scaleInput.value = "1";
  roundInput.checked = true;
  numeratorInput.value = "16";
  denominatorInput.value = "9";
  state.ratioKey = "16:9";
  updatePresetVisibility();
  update();
}

function updatePresetVisibility() {
  const isCustom = presetInput.value === "custom";
  customFields.style.display = isCustom ? "" : "none";
}

function update() {
  const ratio = getRatio();
  const sourceValue = parseNumber(sourceValueInput.value);
  const scale = parsePositiveNumber(scaleInput.value);
  const round = roundInput.checked;
  const solveFrom = solveFromInput.value;
  const sourceLabelText = solveFrom === "width" ? "Width" : "Height";
  sourceLabel.textContent = sourceLabelText;

  if (!ratio) {
    setInvalidState("Enter a valid positive custom ratio.");
    return;
  }

  if (!(sourceValue > 0)) {
    setInvalidState(`Enter a positive ${sourceLabelText.toLowerCase()} value.`);
    return;
  }

  if (!scale) {
    setInvalidState("Enter a positive scale multiplier.");
    return;
  }

  ratioScaleNode.textContent = `${formatNumber(scale, { maximumFractionDigits: 3 })}x`;

  const rawPair = solvePair(sourceValue, ratio, solveFrom);
  const scaledPair = {
    width: rawPair.width * scale,
    height: rawPair.height * scale,
  };

  const displayPair = round
    ? {
        width: Math.round(scaledPair.width),
        height: Math.round(scaledPair.height),
      }
    : scaledPair;

  const computedValue = solveFrom === "width" ? rawPair.height : rawPair.width;
  const computedDisplay = round ? Math.round(computedValue * scale) : computedValue * scale;
  const ratioDecimal = ratio.numerator / ratio.denominator;
  const simplified = simplifyRatio(ratio.numerator, ratio.denominator);
  const orientation = getOrientation(ratio.numerator, ratio.denominator);

  computedDimensionNode.textContent = `${formatDimension(computedDisplay, round)} px`;
  computedFormulaNode.textContent = solveFrom === "width"
    ? `${formatDimension(sourceValue)} × ${ratio.denominator} ÷ ${ratio.numerator} × ${formatNumber(scale, { maximumFractionDigits: 3 })} = ${formatDimension(computedDisplay)}`
    : `${formatDimension(sourceValue)} × ${ratio.numerator} ÷ ${ratio.denominator} × ${formatNumber(scale, { maximumFractionDigits: 3 })} = ${formatDimension(computedDisplay)}`;
  scaledPairNode.textContent = `${formatDimension(displayPair.width, round)} × ${formatDimension(displayPair.height, round)} px`;
  scaledNoteNode.textContent = round
    ? "Final dimensions are rounded to the nearest whole pixel."
    : "Final dimensions keep decimal precision.";
  ratioMetadataNode.textContent = `${simplified.numerator}:${simplified.denominator}`;
  ratioDecimalNode.textContent = `${formatNumber(ratioDecimal, { maximumFractionDigits: 4 })}:1 simplified to ${simplified.numerator}:${simplified.denominator}`;
  ratioStatusNode.textContent = "Ready.";
  ratioOrientationNode.textContent = orientation;
  ratioSimplifiedNode.textContent = `${simplified.numerator}:${simplified.denominator}`;
  ratioDecimalValueNode.textContent = `${formatNumber(ratioDecimal, { maximumFractionDigits: 4 })}:1`;
}

function setInvalidState(message) {
  computedDimensionNode.textContent = "—";
  computedFormulaNode.textContent = "Waiting for valid values.";
  scaledPairNode.textContent = "—";
  scaledNoteNode.textContent = "The scale multiplier applies after the ratio solve.";
  ratioMetadataNode.textContent = "—";
  ratioDecimalNode.textContent = "—";
  ratioStatusNode.textContent = message;
  ratioOrientationNode.textContent = "—";
  ratioSimplifiedNode.textContent = "—";
  ratioDecimalValueNode.textContent = "—";
  const scale = parsePositiveNumber(scaleInput.value);
  ratioScaleNode.textContent = scale ? `${formatNumber(scale, { maximumFractionDigits: 3 })}x` : "—";
}

function getRatio() {
  if (presetInput.value !== "custom") {
    return presets[presetInput.value] ?? null;
  }

  const numerator = parsePositiveInteger(numeratorInput.value);
  const denominator = parsePositiveInteger(denominatorInput.value);

  if (!numerator || !denominator) {
    return null;
  }

  return { numerator, denominator };
}

function solvePair(sourceValue, ratio, solveFrom) {
  if (solveFrom === "width") {
    return {
      width: sourceValue,
      height: sourceValue * (ratio.denominator / ratio.numerator),
    };
  }

  return {
    width: sourceValue * (ratio.numerator / ratio.denominator),
    height: sourceValue,
  };
}

function simplifyRatio(numerator, denominator) {
  const divisor = gcd(numerator, denominator) || 1;
  return {
    numerator: numerator / divisor,
    denominator: denominator / divisor,
  };
}

function gcd(a, b) {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));

  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x;
}

function getOrientation(numerator, denominator) {
  if (numerator === denominator) {
    return "Square";
  }

  return numerator > denominator ? "Landscape" : "Portrait";
}

function parseNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parsePositiveNumber(value) {
  const number = parseNumber(value);
  return number !== null && number > 0 ? number : null;
}

function parsePositiveInteger(value) {
  const number = Number.parseInt(String(value), 10);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatNumber(value, options = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  const absoluteValue = Math.abs(value);
  if (absoluteValue !== 0 && (absoluteValue < 0.0001 || absoluteValue >= 1_000_000)) {
    return value.toExponential(4);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
    ...options,
  }).format(value);
}

function formatDimension(value, round = false) {
  if (round) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));
  }

  return formatNumber(value, { maximumFractionDigits: 4 });
}
