import { initCommon } from "../common.js";

initCommon("json-formatter");

const inputNode = document.querySelector("#json-input");
const outputNode = document.querySelector("#json-output");
const statusNode = document.querySelector("#json-status");
const charCountNode = document.querySelector("#json-char-count");
const lineCountNode = document.querySelector("#json-line-count");
const typeNode = document.querySelector("#json-type");

document.querySelector("#json-format").addEventListener("click", () => transformJson("format"));
document.querySelector("#json-minify").addEventListener("click", () => transformJson("minify"));
document.querySelector("#json-sort").addEventListener("click", () => transformJson("sort"));
document.querySelector("#json-copy").addEventListener("click", copyOutput);
document.querySelector("#json-sample").addEventListener("click", loadSample);
document.querySelector("#json-clear").addEventListener("click", clearAll);
inputNode.addEventListener("input", validateInput);

validateInput();

function transformJson(mode) {
  const parsed = parseInput();
  if (!parsed) {
    return;
  }

  const transformed = mode === "sort" ? sortKeysDeep(parsed) : parsed;
  const output = mode === "minify"
    ? JSON.stringify(transformed)
    : JSON.stringify(transformed, null, 2);

  outputNode.textContent = output;
  updateMetrics(output);
  typeNode.textContent = describeType(parsed);
  statusNode.className = "json-status is-valid";
  statusNode.textContent = mode === "format"
    ? "Valid JSON. Output has been pretty-printed."
    : mode === "minify"
      ? "Valid JSON. Output has been minified."
      : "Valid JSON. Output has been sorted alphabetically by key.";
}

function validateInput() {
  const value = inputNode.value;
  updateMetrics(value);

  if (!value.trim()) {
    outputNode.textContent = "";
    typeNode.textContent = "Unknown";
    statusNode.className = "json-status";
    statusNode.textContent = "Validation state will appear here.";
    return;
  }

  try {
    const parsed = JSON.parse(value);
    typeNode.textContent = describeType(parsed);
    statusNode.className = "json-status is-valid";
    statusNode.textContent = "Valid JSON. Choose a transform to generate formatted output.";
  } catch (error) {
    typeNode.textContent = "Invalid";
    statusNode.className = "json-status is-invalid";
    statusNode.textContent = error.message;
  }
}

function parseInput() {
  try {
    return JSON.parse(inputNode.value);
  } catch (error) {
    statusNode.className = "json-status is-invalid";
    statusNode.textContent = error.message;
    return null;
  }
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce((result, key) => {
        result[key] = sortKeysDeep(value[key]);
        return result;
      }, {});
  }

  return value;
}

async function copyOutput() {
  if (!outputNode.textContent) {
    statusNode.className = "json-status";
    statusNode.textContent = "There is no output to copy yet.";
    return;
  }

  try {
    await navigator.clipboard.writeText(outputNode.textContent);
    statusNode.className = "json-status is-valid";
    statusNode.textContent = "Output copied to your clipboard.";
  } catch {
    statusNode.className = "json-status";
    statusNode.textContent = "Clipboard copy was blocked by the browser.";
  }
}

function clearAll() {
  inputNode.value = "";
  outputNode.textContent = "";
  validateInput();
}

function loadSample() {
  inputNode.value = `{"service":"AIFreelancer Tools","categories":["Dev","Trades","Web"],"settings":{"private":true,"hosting":"GitHub Pages","started":"diff-check"}}`;
  transformJson("format");
}

function updateMetrics(value) {
  charCountNode.textContent = value.length.toString();
  lineCountNode.textContent = value ? value.split("\n").length.toString() : "0";
}

function describeType(value) {
  if (Array.isArray(value)) {
    return "Array";
  }

  if (value === null) {
    return "Null";
  }

  return typeof value === "object"
    ? "Object"
    : typeof value === "string"
      ? "String"
      : typeof value === "number"
        ? "Number"
        : typeof value === "boolean"
          ? "Boolean"
          : typeof value;
}
