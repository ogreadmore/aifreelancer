import { initCommon } from "../common.js";

initCommon("csv-json-converter");

const inputNode = document.querySelector("#converter-input");
const outputNode = document.querySelector("#converter-output");
const statusNode = document.querySelector("#converter-status");
const sourceCountNode = document.querySelector("#converter-source-count");
const fieldCountNode = document.querySelector("#converter-field-count");
const outputLinesNode = document.querySelector("#converter-output-lines");
const outputCharsNode = document.querySelector("#converter-output-chars");
const guidanceNode = document.querySelector("#converter-guidance");
const modeLabelNode = document.querySelector("#converter-mode-label");
const csvModeButton = document.querySelector("#converter-mode-csv");
const jsonModeButton = document.querySelector("#converter-mode-json");
const sampleCsvButton = document.querySelector("#converter-sample-csv");
const sampleJsonButton = document.querySelector("#converter-sample-json");
const copyButton = document.querySelector("#converter-copy");
const downloadButton = document.querySelector("#converter-download");
const clearButton = document.querySelector("#converter-clear");

const CSV_SAMPLE = `name,role,notes,active
"Taylor","Founder","Uses tools to keep projects moving",true
"Jordan","Operator","Writes a multiline note
with a second line",false
"Rae","Designer","Comma, quote ""and"" newline",true`;

const JSON_SAMPLE = `[
  {
    "name": "Taylor",
    "role": "Founder",
    "notes": "Uses tools to keep projects moving",
    "active": true
  },
  {
    "name": "Jordan",
    "role": "Operator",
    "notes": "Writes a multiline note\\nand wants the exporter to survive it",
    "active": false
  },
  {
    "name": "Rae",
    "role": "Designer",
    "notes": "Comma, quote \\"and\\" newline",
    "active": true
  }
]`;

const state = {
  mode: "csv-to-json",
  timer: 0,
  outputText: "",
  outputFilename: "csv-json-converter.json",
};

csvModeButton.addEventListener("click", () => setMode("csv-to-json"));
jsonModeButton.addEventListener("click", () => setMode("json-to-csv"));
sampleCsvButton.addEventListener("click", loadCsvSample);
sampleJsonButton.addEventListener("click", loadJsonSample);
copyButton.addEventListener("click", copyOutput);
downloadButton.addEventListener("click", downloadOutput);
clearButton.addEventListener("click", clearAll);
inputNode.addEventListener("input", scheduleConvert);

setMode("csv-to-json", { convert: false });
setEmptyState();
updateMetrics("", "", "");

function setMode(mode, { convert = true } = {}) {
  state.mode = mode;
  const isCsvMode = mode === "csv-to-json";

  csvModeButton.className = isCsvMode ? "button button-primary" : "button button-secondary";
  jsonModeButton.className = isCsvMode ? "button button-secondary" : "button button-primary";
  csvModeButton.setAttribute("aria-pressed", String(isCsvMode));
  jsonModeButton.setAttribute("aria-pressed", String(!isCsvMode));
  modeLabelNode.textContent = isCsvMode ? "CSV → JSON" : "JSON → CSV";
  guidanceNode.textContent = isCsvMode
    ? "CSV mode expects a header row. CSV rows become a JSON array of objects."
    : "JSON mode expects an array of objects. Each object becomes one CSV row.";
  inputNode.placeholder = isCsvMode
    ? 'name,role,notes\n"Taylor","Founder","Quoted cells stay together."'
    : '[{"name":"Taylor","role":"Founder","notes":"JSON array of objects"}]';

  if (convert) {
    convertCurrentInput();
  }
}

function scheduleConvert() {
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(() => {
    convertCurrentInput();
  }, 150);
}

function convertCurrentInput() {
  const rawValue = inputNode.value;

  if (!rawValue.trim()) {
    setEmptyState();
    return;
  }

  try {
    const result = state.mode === "csv-to-json"
      ? convertCsvToJson(rawValue)
      : convertJsonToCsv(rawValue);

    state.outputText = result.output;
    state.outputFilename = result.filename;
    outputNode.textContent = result.output;
    copyButton.disabled = !result.output;
    downloadButton.disabled = !result.output;
    updateMetrics(result.sourceCount, result.fieldCount, result.output);
    setStatus(result.status, "is-valid");
  } catch (error) {
    state.outputText = "";
    state.outputFilename = state.mode === "csv-to-json" ? "csv-json-converter.json" : "csv-json-converter.csv";
    outputNode.textContent = "";
    copyButton.disabled = true;
    downloadButton.disabled = true;
    updateMetrics("", "", "");
    setStatus(error.message, "is-invalid");
  }
}

function convertCsvToJson(rawValue) {
  const rows = parseCsv(rawValue);

  if (!rows.length) {
    throw new Error("Paste CSV data with a header row to convert it to JSON.");
  }

  const rawHeaders = rows[0].map((value) => String(value ?? ""));
  const dataRows = rows.slice(1);
  const { headers, renamedCount } = normalizeHeaders(rawHeaders);
  const maxColumns = Math.max(headers.length, ...dataRows.map((row) => row.length), 0);

  while (headers.length < maxColumns) {
    headers.push(`column_${headers.length + 1}`);
  }

  const records = dataRows.map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });
    return record;
  });

  const missingCellRows = dataRows.filter((row) => row.length < headers.length).length;
  const widerRows = dataRows.filter((row) => row.length > rawHeaders.length).length;
  const notes = [];

  if (renamedCount > 0) {
    notes.push(`${renamedCount} duplicate or blank header${renamedCount === 1 ? "" : "s"} were normalized.`);
  }

  if (widerRows > 0) {
    notes.push(`${widerRows} row${widerRows === 1 ? "" : "s"} had extra cells and the header row was extended.`);
  }

  if (missingCellRows > 0) {
    notes.push("Missing cells were padded with empty strings.");
  }

  const output = JSON.stringify(records, null, 2);
  const notesText = notes.length ? ` ${notes.join(" ")}` : "";
  const status = dataRows.length
    ? `Converted ${dataRows.length} row${dataRows.length === 1 ? "" : "s"} into ${records.length} JSON object${records.length === 1 ? "" : "s"} with ${headers.length} column${headers.length === 1 ? "" : "s"}.${notesText}`
    : `CSV headers were found, but there were no data rows. The JSON output is an empty array.`;

  return {
    output,
    filename: "csv-json-converter.json",
    sourceCount: dataRows.length,
    fieldCount: headers.length,
    status,
  };
}

function convertJsonToCsv(rawValue) {
  let parsed;

  try {
    parsed = JSON.parse(normalizeNewlines(rawValue).trim());
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("JSON must be an array of objects.");
  }

  if (!parsed.length) {
    return {
      output: "",
      filename: "csv-json-converter.csv",
      sourceCount: 0,
      fieldCount: 0,
      status: "JSON array is empty, so there is nothing to export to CSV.",
    };
  }

  const records = parsed.map((entry, index) => {
    if (entry === null || Array.isArray(entry) || typeof entry !== "object") {
      throw new Error(`Item ${index + 1} is not an object.`);
    }

    return entry;
  });

  const headers = [];
  const seenHeaders = new Set();

  records.forEach((record) => {
    Object.keys(record).forEach((key) => {
      if (seenHeaders.has(key)) {
        return;
      }

      seenHeaders.add(key);
      headers.push(key);
    });
  });

  if (!headers.length) {
    throw new Error("The objects do not contain any keys to export.");
  }

  let blankValues = 0;
  let nestedValues = 0;

  const rows = [
    headers,
    ...records.map((record) => headers.map((header) => {
      const value = record[header];

      if (value == null) {
        blankValues += 1;
        return "";
      }

      if (typeof value === "object") {
        nestedValues += 1;
        return JSON.stringify(value);
      }

      return String(value);
    })),
  ];

  const output = rows.map(renderCsvRow).join("\n");
  const notes = [];

  if (blankValues > 0) {
    notes.push("Missing values were exported as blank cells.");
  }

  if (nestedValues > 0) {
    notes.push("Nested values were JSON-stringified inside cells.");
  }

  const notesText = notes.length ? ` ${notes.join(" ")}` : "";
  return {
    output,
    filename: "csv-json-converter.csv",
    sourceCount: records.length,
    fieldCount: headers.length,
    status: `Converted ${records.length} object${records.length === 1 ? "" : "s"} into CSV with ${headers.length} column${headers.length === 1 ? "" : "s"}.${notesText}`,
  };
}

function parseCsv(text) {
  const source = normalizeNewlines(text).replace(/^\uFEFF/, "");

  if (!source.trim()) {
    return [];
  }

  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  let afterQuote = false;
  let rowTouched = false;

  const commitCell = () => {
    row.push(cell);
    cell = "";
  };

  const commitRow = () => {
    const hasContent = rowTouched || row.some((value) => value !== "");

    if (hasContent) {
      rows.push([...row]);
    }

    row = [];
    cell = "";
    inQuotes = false;
    afterQuote = false;
    rowTouched = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inQuotes) {
      rowTouched = true;

      if (char === '"') {
        if (next === '"') {
          cell += '"';
          index += 1;
          continue;
        }

        inQuotes = false;
        afterQuote = true;
        continue;
      }

      cell += char;
      continue;
    }

    if (afterQuote) {
      if (char === " " || char === "\t") {
        continue;
      }

      if (char === ",") {
        commitCell();
        afterQuote = false;
        continue;
      }

      if (char === "\n") {
        commitCell();
        commitRow();
        continue;
      }

      if (char === "\r") {
        continue;
      }

      throw new Error("Unexpected text after a quoted CSV cell.");
    }

    if (char === '"') {
      if (cell.length === 0) {
        inQuotes = true;
        rowTouched = true;
        continue;
      }

      throw new Error("Unexpected quote inside an unquoted CSV cell.");
    }

    if (char === ",") {
      commitCell();
      rowTouched = true;
      continue;
    }

    if (char === "\n") {
      commitCell();
      commitRow();
      continue;
    }

    if (char === "\r") {
      continue;
    }

    cell += char;
    rowTouched = true;
  }

  if (inQuotes) {
    throw new Error("CSV input ended while a quoted cell was still open.");
  }

  if (afterQuote) {
    commitCell();
    afterQuote = false;
  }

  if (cell.length > 0 || rowTouched || row.length > 0) {
    commitCell();
    commitRow();
  }

  return rows;
}

function normalizeHeaders(rawHeaders) {
  const headers = [];
  const seen = new Map();
  let renamedCount = 0;

  rawHeaders.forEach((header, index) => {
    const baseHeader = header.trim() || `column_${index + 1}`;
    const nextCount = (seen.get(baseHeader) ?? 0) + 1;
    seen.set(baseHeader, nextCount);

    if (nextCount === 1) {
      headers.push(baseHeader);
      return;
    }

    renamedCount += 1;
    headers.push(`${baseHeader}_${nextCount}`);
  });

  return {
    headers,
    renamedCount,
  };
}

function renderCsvRow(cells) {
  return cells.map(escapeCsvCell).join(",");
}

function escapeCsvCell(value) {
  const text = stringifyCell(value);

  if (!text) {
    return "";
  }

  const needsQuotes = /[",\n\r]/.test(text) || /^\s|\s$/.test(text);
  const escaped = text.replaceAll('"', '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function stringifyCell(value) {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function copyOutput() {
  if (!state.outputText) {
    setStatus("There is no output to copy yet.", "");
    return;
  }

  try {
    await navigator.clipboard.writeText(state.outputText);
    setStatus("Output copied to your clipboard.", "is-valid");
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = state.outputText;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.appendChild(fallback);
    fallback.select();

    const copied = document.execCommand("copy");
    fallback.remove();

    if (copied) {
      setStatus("Output copied to your clipboard.", "is-valid");
      return;
    }

    setStatus("Clipboard copy was blocked by the browser.", "");
  }
}

async function downloadOutput() {
  if (!state.outputText) {
    setStatus("There is no output to download yet.", "");
    return;
  }

  const blob = new Blob([state.outputText], {
    type: state.mode === "csv-to-json" ? "application/json" : "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = state.outputFilename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  setStatus(`Downloaded ${state.outputFilename}.`, "is-valid");
}

function loadCsvSample() {
  inputNode.value = CSV_SAMPLE;
  setMode("csv-to-json");
}

function loadJsonSample() {
  inputNode.value = JSON_SAMPLE;
  setMode("json-to-csv");
}

function clearAll() {
  inputNode.value = "";
  setEmptyState();
}

function setEmptyState() {
  state.outputText = "";
  state.outputFilename = state.mode === "csv-to-json" ? "csv-json-converter.json" : "csv-json-converter.csv";
  outputNode.textContent = "";
  copyButton.disabled = true;
  downloadButton.disabled = true;
  updateMetrics("", "", "");
  setStatus(
    state.mode === "csv-to-json"
      ? "Paste CSV data, then convert it to JSON."
      : "Paste a JSON array of objects, then convert it to CSV.",
    "",
  );
}

function updateMetrics(sourceCount, fieldCount, outputText) {
  sourceCountNode.textContent = sourceCount === "" ? "0" : String(sourceCount);
  fieldCountNode.textContent = fieldCount === "" ? "0" : String(fieldCount);
  outputLinesNode.textContent = outputText ? outputText.split("\n").length.toString() : "0";
  outputCharsNode.textContent = outputText ? outputText.length.toString() : "0";
}

function setStatus(message, tone) {
  statusNode.className = tone ? `json-status ${tone}` : "json-status";
  statusNode.textContent = message;
}

function normalizeNewlines(value) {
  return String(value).replace(/\r\n?/g, "\n");
}
