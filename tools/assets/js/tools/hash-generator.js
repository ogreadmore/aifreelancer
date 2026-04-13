import { initCommon } from "../common.js";

initCommon("hash-generator");

const inputNode = document.querySelector("#hash-input");
const uppercaseNode = document.querySelector("#hash-uppercase");
const sampleButton = document.querySelector("#hash-sample");
const clearButton = document.querySelector("#hash-clear");
const statusNode = document.querySelector("#hash-status");
const inputCharsNode = document.querySelector("#hash-input-chars");
const inputBytesNode = document.querySelector("#hash-input-bytes");
const caseLabelNode = document.querySelector("#hash-case-label");

const outputs = [
  {
    algorithm: "SHA-1",
    outputNode: document.querySelector("#hash-sha1-output"),
    metaNode: document.querySelector("#hash-sha1-meta"),
    bits: 160,
  },
  {
    algorithm: "SHA-256",
    outputNode: document.querySelector("#hash-sha256-output"),
    metaNode: document.querySelector("#hash-sha256-meta"),
    bits: 256,
  },
  {
    algorithm: "SHA-384",
    outputNode: document.querySelector("#hash-sha384-output"),
    metaNode: document.querySelector("#hash-sha384-meta"),
    bits: 384,
  },
  {
    algorithm: "SHA-512",
    outputNode: document.querySelector("#hash-sha512-output"),
    metaNode: document.querySelector("#hash-sha512-meta"),
    bits: 512,
  },
];

const encoder = new TextEncoder();
let renderToken = 0;

sampleButton.addEventListener("click", loadSample);
clearButton.addEventListener("click", clearInput);
inputNode.addEventListener("input", renderHashes);
uppercaseNode.addEventListener("change", renderHashes);
document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", () => copyOutput(button.dataset.copyTarget));
});

if (!globalThis.crypto?.subtle) {
  statusNode.textContent = "Web Crypto is not available in this browser.";
  statusNode.className = "json-status";
  disableOutputs();
} else {
  renderHashes();
}

async function renderHashes() {
  const token = ++renderToken;
  const value = inputNode.value;
  const bytes = encoder.encode(value);
  const uppercase = uppercaseNode.checked;

  inputCharsNode.textContent = `${value.length} chars`;
  inputBytesNode.textContent = `${bytes.length} UTF-8 bytes`;
  caseLabelNode.textContent = uppercase ? "Uppercase" : "Lowercase";

  if (!value) {
    clearOutputs();
    statusNode.textContent = "Type or paste text to generate the hashes.";
    statusNode.className = "json-status";
    return;
  }

  statusNode.textContent = "Generating hashes with the browser's native Web Crypto API.";
  statusNode.className = "json-status";

  const digests = await Promise.all(
    outputs.map(async ({ algorithm }) => {
      const hashBuffer = await crypto.subtle.digest(algorithm, bytes);
      return {
        algorithm,
        value: toHex(hashBuffer, uppercase),
      };
    }),
  );

  if (token !== renderToken) {
    return;
  }

  for (const entry of digests) {
    const target = outputs.find((item) => item.algorithm === entry.algorithm);
    if (target) {
      target.outputNode.value = entry.value;
    }
  }

  statusNode.textContent = "Hashes are ready to copy.";
}

function clearInput() {
  inputNode.value = "";
  renderHashes();
  inputNode.focus();
}

function loadSample() {
  inputNode.value = "AIFreelancer.co builds useful tools.\nUTF-8 sample: café, mañana, こんにちは, 🚀";
  renderHashes();
  inputNode.focus();
}

function clearOutputs() {
  outputs.forEach(({ outputNode }) => {
    outputNode.value = "";
  });
}

function disableOutputs() {
  outputs.forEach(({ outputNode }) => {
    outputNode.value = "";
    outputNode.disabled = true;
  });
  sampleButton.disabled = true;
  clearButton.disabled = true;
  uppercaseNode.disabled = true;
}

async function copyOutput(id) {
  const outputNode = document.getElementById(id);
  if (!outputNode || !outputNode.value) {
    statusNode.textContent = "There is no hash to copy yet.";
    return;
  }

  try {
    await navigator.clipboard.writeText(outputNode.value);
    statusNode.textContent = `${id.replace("hash-", "").replace("-output", "").toUpperCase()} copied to clipboard.`;
  } catch {
    fallbackCopy(outputNode.value);
    statusNode.textContent = "Copied with the browser fallback.";
  }
}

function fallbackCopy(value) {
  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

function toHex(buffer, uppercase) {
  const bytes = new Uint8Array(buffer);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return uppercase ? hex.toUpperCase() : hex;
}
