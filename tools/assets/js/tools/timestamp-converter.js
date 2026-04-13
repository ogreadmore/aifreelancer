import { initCommon } from "../common.js";

initCommon("timestamp-converter");

const secondsInput = document.querySelector("#timestamp-seconds");
const millisecondsInput = document.querySelector("#timestamp-milliseconds");
const localInput = document.querySelector("#timestamp-local");
const utcInput = document.querySelector("#timestamp-utc");
const statusNode = document.querySelector("#timestamp-status");

const secondsOutput = document.querySelector("#timestamp-seconds-output");
const millisecondsOutput = document.querySelector("#timestamp-milliseconds-output");
const localOutput = document.querySelector("#timestamp-local-output");
const utcOutput = document.querySelector("#timestamp-utc-output");
const isoOutput = document.querySelector("#timestamp-iso-output");

const copyButtons = {
  seconds: document.querySelector("#timestamp-copy-seconds"),
  milliseconds: document.querySelector("#timestamp-copy-milliseconds"),
  local: document.querySelector("#timestamp-copy-local"),
  utc: document.querySelector("#timestamp-copy-utc"),
  iso: document.querySelector("#timestamp-copy-iso"),
};

const nowButtons = {
  seconds: document.querySelector("#timestamp-now-seconds"),
  milliseconds: document.querySelector("#timestamp-now-milliseconds"),
  local: document.querySelector("#timestamp-now-local"),
  utc: document.querySelector("#timestamp-now-utc"),
};

const fieldNodes = {
  seconds: secondsInput,
  milliseconds: millisecondsInput,
  local: localInput,
  utc: utcInput,
};

let isSynchronizing = false;

secondsInput.addEventListener("input", () => handleFieldChange("seconds"));
millisecondsInput.addEventListener("input", () => handleFieldChange("milliseconds"));
localInput.addEventListener("input", () => handleFieldChange("local"));
utcInput.addEventListener("input", () => handleFieldChange("utc"));

nowButtons.seconds.addEventListener("click", () => loadCurrentTime("Loaded the current moment as Unix seconds."));
nowButtons.milliseconds.addEventListener("click", () => loadCurrentTime("Loaded the current moment as Unix milliseconds."));
nowButtons.local.addEventListener("click", () => loadCurrentTime("Loaded the current moment as local time."));
nowButtons.utc.addEventListener("click", () => loadCurrentTime("Loaded the current moment as UTC time."));

document.querySelector("#timestamp-clear").addEventListener("click", clearAll);

Object.entries(copyButtons).forEach(([key, button]) => {
  button.addEventListener("click", () => copyValue(key));
});

loadCurrentTime("Current time is loaded by default. Edit any field or use a Now button to convert.");

function handleFieldChange(source) {
  if (isSynchronizing) {
    return;
  }

  const rawValue = fieldNodes[source].value.trim();
  if (!rawValue) {
    clearAll("Enter a Unix timestamp or date-time to begin converting.");
    return;
  }

  const parsed = parseSourceValue(source, rawValue);
  if (!parsed.ok) {
    clearOutputs();
    setStatus(parsed.message, "invalid");
    return;
  }

  syncFromDate(parsed.date, `Converted from ${describeSource(source)}.`);
}

function parseSourceValue(source, rawValue) {
  if (source === "seconds" || source === "milliseconds") {
    const numeric = parseNumericTimestamp(rawValue);
    if (!numeric.ok) {
      return numeric;
    }

    const milliseconds = source === "seconds"
      ? Math.round(numeric.value * 1000)
      : Math.round(numeric.value);

    if (!isWithinDateRange(milliseconds)) {
      return {
        ok: false,
        message: "That timestamp is outside the JavaScript Date range.",
      };
    }

    return {
      ok: true,
      date: new Date(milliseconds),
    };
  }

  const date = source === "local"
    ? new Date(rawValue)
    : new Date(`${rawValue}Z`);

  if (Number.isNaN(date.getTime())) {
    return {
      ok: false,
      message: source === "local"
        ? "Please enter a valid local date and time."
        : "Please enter a valid UTC date and time.",
    };
  }

  return {
    ok: true,
    date,
  };
}

function syncFromDate(date, message) {
  const milliseconds = date.getTime();
  if (!isWithinDateRange(milliseconds)) {
    clearOutputs();
    setStatus("That date is outside the JavaScript Date range.", "invalid");
    return;
  }

  isSynchronizing = true;
  try {
    secondsInput.value = formatUnixSeconds(milliseconds);
    millisecondsInput.value = String(milliseconds);
    localInput.value = formatLocalInputValue(date);
    utcInput.value = formatUtcInputValue(date);
  } finally {
    isSynchronizing = false;
  }

  renderOutputs(date);
  setStatus(message, "valid");
}

function renderOutputs(date) {
  const milliseconds = date.getTime();

  secondsOutput.textContent = formatUnixSeconds(milliseconds);
  millisecondsOutput.textContent = String(milliseconds);
  localOutput.textContent = formatHumanDate(date);
  utcOutput.textContent = formatHumanDate(date, "UTC");
  isoOutput.textContent = date.toISOString();
}

function loadCurrentTime(message) {
  syncFromDate(new Date(), message);
}

function clearAll(message = "All fields cleared. Enter a value to convert.") {
  isSynchronizing = true;
  try {
    secondsInput.value = "";
    millisecondsInput.value = "";
    localInput.value = "";
    utcInput.value = "";
  } finally {
    isSynchronizing = false;
  }

  clearOutputs();
  setStatus(message, "idle");
}

async function copyValue(key) {
  const valueMap = {
    seconds: secondsOutput.textContent,
    milliseconds: millisecondsOutput.textContent,
    local: localOutput.textContent,
    utc: utcOutput.textContent,
    iso: isoOutput.textContent,
  };

  const value = valueMap[key];
  if (!value || value === "—") {
    setStatus("There is no value to copy yet.", "idle");
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    setStatus(`${describeCopyTarget(key)} copied to your clipboard.`, "valid");
  } catch {
    setStatus("Clipboard copy was blocked by the browser.", "idle");
  }
}

function parseNumericTimestamp(value) {
  const normalized = value.replace(/[,_\s]/g, "");
  if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) {
    return {
      ok: false,
      message: "Please enter a numeric Unix timestamp.",
    };
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric)) {
    return {
      ok: false,
      message: "That timestamp is too large to convert safely.",
    };
  }

  return {
    ok: true,
    value: numeric,
  };
}

function isWithinDateRange(milliseconds) {
  return Math.abs(milliseconds) <= 8.64e15;
}

function formatUnixSeconds(milliseconds) {
  const seconds = milliseconds / 1000;
  if (Number.isInteger(seconds)) {
    return String(seconds);
  }

  return trimTrailingZeros(seconds.toFixed(3));
}

function trimTrailingZeros(value) {
  return value.replace(/\.?0+$/, "");
}

function formatLocalInputValue(date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function clearOutputs() {
  secondsOutput.textContent = "—";
  millisecondsOutput.textContent = "—";
  localOutput.textContent = "—";
  utcOutput.textContent = "—";
  isoOutput.textContent = "—";
}

function formatUtcInputValue(date) {
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join("-") + `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function formatHumanDate(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

function setStatus(message, mode) {
  statusNode.textContent = message;
  statusNode.classList.remove("is-valid", "is-invalid");

  if (mode === "valid") {
    statusNode.classList.add("is-valid");
  } else if (mode === "invalid") {
    statusNode.classList.add("is-invalid");
  }
}

function describeSource(source) {
  return source === "seconds"
    ? "Unix seconds"
    : source === "milliseconds"
      ? "Unix milliseconds"
      : source === "local"
        ? "local date and time"
        : "UTC date and time";
}

function describeCopyTarget(key) {
  return key === "seconds"
    ? "Unix seconds"
    : key === "milliseconds"
      ? "Unix milliseconds"
      : key === "local"
        ? "Local time"
        : key === "utc"
          ? "UTC time"
          : "ISO 8601";
}

function pad(value) {
  return String(value).padStart(2, "0");
}
