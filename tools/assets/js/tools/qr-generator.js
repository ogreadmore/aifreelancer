import { escapeHtml, initCommon } from "../common.js";

initCommon("qr-generator");

const modeSelect = document.querySelector("#qr-mode");
const textInput = document.querySelector("#qr-text");
const urlInput = document.querySelector("#qr-url");
const emailAddressInput = document.querySelector("#qr-email-address");
const emailSubjectInput = document.querySelector("#qr-email-subject");
const emailBodyInput = document.querySelector("#qr-email-body");
const phoneInput = document.querySelector("#qr-phone");
const wifiSsidInput = document.querySelector("#qr-wifi-ssid");
const wifiPasswordInput = document.querySelector("#qr-wifi-password");
const wifiAuthInput = document.querySelector("#qr-wifi-auth");
const wifiHiddenInput = document.querySelector("#qr-wifi-hidden");
const sizeInput = document.querySelector("#qr-size");
const sizeValueNode = document.querySelector("#qr-size-value");
const eccInput = document.querySelector("#qr-ecc");
const darkInput = document.querySelector("#qr-dark");
const lightInput = document.querySelector("#qr-light");
const payloadOutput = document.querySelector("#qr-payload");
const statusNode = document.querySelector("#qr-status");
const sampleButton = document.querySelector("#qr-sample");
const clearButton = document.querySelector("#qr-clear");
const copyPayloadButton = document.querySelector("#qr-copy-payload");
const downloadSvgButton = document.querySelector("#qr-download-svg");
const downloadPngButton = document.querySelector("#qr-download-png");
const previewFrameNode = document.querySelector("#qr-preview-frame");
const previewEmptyNode = document.querySelector("#qr-preview-empty");
const versionNode = document.querySelector("#qr-version");
const modulesNode = document.querySelector("#qr-modules");
const bytesNode = document.querySelector("#qr-bytes");
const maskNode = document.querySelector("#qr-mask");
const versionCardNode = document.querySelector("#qr-version-card");
const maskCardNode = document.querySelector("#qr-mask-card");
const modulesCardNode = document.querySelector("#qr-modules-card");
const capacityCardNode = document.querySelector("#qr-capacity-card");

const modePanels = [...document.querySelectorAll("[data-mode-panel]")];
const textEncoder = new TextEncoder();
const LEVEL_INDEX = { L: 0, M: 1, Q: 2, H: 3 };
const LEVEL_BITS = { L: 1, M: 0, Q: 3, H: 2 };
const MODE_SAMPLES = {
  text: {
    text: "AIFreelancer.co builds local browser tools.\nNo upload, no server, no surprises.",
  },
  url: {
    url: "https://aifreelancer.co/tools/qr-generator",
  },
  email: {
    address: "hello@aifreelancer.co",
    subject: "Project question",
    body: "Hi! I found your QR Generator and want to use it on a landing page.",
  },
  phone: {
    phone: "+1 415 555 0148",
  },
  wifi: {
    ssid: "AIFreelancer Guest",
    password: "guest-network-2026",
    auth: "WPA",
    hidden: false,
  },
};

const ECC_BLOCK_ROWS = `
1-L 19 7 1 19
1-M 16 10 1 16
1-Q 13 13 1 13
1-H 9 17 1 9
2-L 34 10 1 34
2-M 28 16 1 28
2-Q 22 22 1 22
2-H 16 28 1 16
3-L 55 15 1 55
3-M 44 26 1 44
3-Q 34 18 2 17
3-H 26 22 2 13
4-L 80 20 1 80
4-M 64 18 2 32
4-Q 48 26 2 24
4-H 36 16 4 9
5-L 108 26 1 108
5-M 86 24 2 43
5-Q 62 18 2 15 2 16
5-H 46 22 2 11 2 12
6-L 136 18 2 68
6-M 108 16 4 27
6-Q 76 24 4 19
6-H 60 28 4 15
7-L 156 20 2 78
7-M 124 18 4 31
7-Q 88 18 2 14 4 15
7-H 66 26 4 13 1 14
8-L 194 24 2 97
8-M 154 22 2 38 2 39
8-Q 110 22 4 18 2 19
8-H 86 26 4 14 2 15
9-L 232 30 2 116
9-M 182 22 3 36 2 37
9-Q 132 20 4 16 4 17
9-H 100 24 4 12 4 13
10-L 274 18 2 68 2 69
10-M 216 26 4 43 1 44
10-Q 154 24 6 19 2 20
10-H 122 28 6 15 2 16
11-L 324 20 4 81
11-M 254 30 1 50 4 51
11-Q 180 28 4 22 4 23
11-H 140 24 3 12 8 13
12-L 370 24 2 92 2 93
12-M 290 22 6 36 2 37
12-Q 206 26 4 20 6 21
12-H 158 28 7 14 4 15
13-L 428 26 4 107
13-M 334 22 8 37 1 38
13-Q 244 24 8 20 4 21
13-H 180 22 12 11 4 12
14-L 461 30 3 115 1 116
14-M 365 24 4 40 5 41
14-Q 261 20 11 16 5 17
14-H 197 24 11 12 5 13
15-L 523 22 5 87 1 88
15-M 415 24 5 41 5 42
15-Q 295 30 5 24 7 25
15-H 223 24 11 12 7 13
16-L 589 24 5 98 1 99
16-M 453 28 7 45 3 46
16-Q 325 24 15 19 2 20
16-H 253 30 3 15 13 16
17-L 647 28 1 107 5 108
17-M 507 28 10 46 1 47
17-Q 367 28 1 22 15 23
17-H 283 28 2 14 17 15
18-L 721 30 5 120 1 121
18-M 563 26 9 43 4 44
18-Q 397 28 17 22 1 23
18-H 313 28 2 14 19 15
19-L 795 28 3 113 4 114
19-M 627 26 3 44 11 45
19-Q 445 26 17 21 4 22
19-H 341 26 9 13 16 14
20-L 861 28 3 107 5 108
20-M 669 26 3 41 13 42
20-Q 485 30 15 24 5 25
20-H 385 28 15 15 10 16
21-L 932 28 4 116 4 117
21-M 714 26 17 42
21-Q 512 28 17 22 6 23
21-H 406 30 19 16 6 17
22-L 1006 28 2 111 7 112
22-M 782 28 17 46
22-Q 568 30 7 24 16 25
22-H 442 24 34 13
23-L 1094 30 4 121 5 122
23-M 860 28 4 47 14 48
23-Q 614 30 11 24 14 25
23-H 464 30 16 15 14 16
24-L 1174 30 6 117 4 118
24-M 914 28 6 45 14 46
24-Q 664 30 11 24 16 25
24-H 514 30 30 16 2 17
25-L 1276 26 8 106 4 107
25-M 1000 28 8 47 13 48
25-Q 718 30 7 24 22 25
25-H 538 30 22 15 13 16
26-L 1370 28 10 114 2 115
26-M 1062 28 19 46 4 47
26-Q 754 28 28 22 6 23
26-H 596 30 33 16 4 17
27-L 1468 30 8 122 4 123
27-M 1128 28 22 45 3 46
27-Q 808 30 8 23 26 24
27-H 628 30 12 15 28 16
28-L 1531 30 3 117 10 118
28-M 1193 28 3 45 23 46
28-Q 871 30 4 24 31 25
28-H 661 30 11 15 31 16
29-L 1631 30 7 116 7 117
29-M 1267 28 21 45 7 46
29-Q 911 30 1 23 37 24
29-H 701 30 19 15 26 16
30-L 1735 30 5 115 10 116
30-M 1373 28 19 47 10 48
30-Q 985 30 15 24 25 25
30-H 745 30 23 15 25 16
31-L 1843 30 13 115 3 116
31-M 1455 28 2 46 29 47
31-Q 1033 30 42 24 1 25
31-H 793 30 23 15 28 16
32-L 1955 30 17 115
32-M 1541 28 10 46 23 47
32-Q 1115 30 10 24 35 25
32-H 845 30 19 15 35 16
33-L 2071 30 17 115 1 116
33-M 1631 28 14 46 21 47
33-Q 1171 30 29 24 19 25
33-H 901 30 11 15 46 16
34-L 2191 30 13 115 6 116
34-M 1725 28 14 46 23 47
34-Q 1231 30 44 24 7 25
34-H 961 30 59 16 1 17
35-L 2306 30 12 121 7 122
35-M 1812 28 12 47 26 48
35-Q 1286 30 39 24 14 25
35-H 986 30 22 15 41 16
36-L 2434 30 6 121 14 122
36-M 1914 28 6 47 34 48
36-Q 1354 30 46 24 10 25
36-H 1054 30 2 15 64 16
37-L 2566 30 17 122 4 123
37-M 1992 28 29 46 14 47
37-Q 1426 30 49 24 10 25
37-H 1096 30 24 15 46 16
38-L 2702 30 4 122 18 123
38-M 2102 28 13 46 32 47
38-Q 1502 30 48 24 14 25
38-H 1142 30 42 15 32 16
39-L 2812 30 20 117 4 118
39-M 2216 28 40 47 7 48
39-Q 1582 30 43 24 22 25
39-H 1222 30 10 15 67 16
40-L 2956 30 19 118 6 119
40-M 2334 28 18 47 31 48
40-Q 1666 30 34 24 34 25
40-H 1276 30 20 15 61 16
`;

const BLOCK_TABLE = buildBlockTable(ECC_BLOCK_ROWS);
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
const GENERATOR_CACHE = new Map();

initGaloisField();

const state = {
  timer: 0,
  current: null,
};

function setNodeText(node, value) {
  if (node) {
    node.textContent = value;
  }
}

const editableFields = [
  modeSelect,
  textInput,
  urlInput,
  emailAddressInput,
  emailSubjectInput,
  emailBodyInput,
  phoneInput,
  wifiSsidInput,
  wifiPasswordInput,
  wifiAuthInput,
  wifiHiddenInput,
  sizeInput,
  eccInput,
  darkInput,
  lightInput,
];

editableFields.forEach((field) => {
  field.addEventListener("input", scheduleRender);
  field.addEventListener("change", scheduleRender);
});

modeSelect.addEventListener("change", () => {
  updateModePanels();
});

sampleButton.addEventListener("click", loadSample);
clearButton.addEventListener("click", clearAll);
copyPayloadButton.addEventListener("click", copyPayload);
downloadSvgButton.addEventListener("click", downloadSvg);
downloadPngButton.addEventListener("click", downloadPng);

modeSelect.value = "url";
updateModePanels();
loadSample();

function scheduleRender() {
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(renderCurrent, 120);
}

function updateModePanels() {
  const mode = modeSelect.value;
  modePanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.modePanel === mode);
  });
}

function loadSample() {
  const mode = modeSelect.value;
  const sample = MODE_SAMPLES[mode];

  if (mode === "text") {
    textInput.value = sample.text;
  } else if (mode === "url") {
    urlInput.value = sample.url;
  } else if (mode === "email") {
    emailAddressInput.value = sample.address;
    emailSubjectInput.value = sample.subject;
    emailBodyInput.value = sample.body;
  } else if (mode === "phone") {
    phoneInput.value = sample.phone;
  } else if (mode === "wifi") {
    wifiSsidInput.value = sample.ssid;
    wifiPasswordInput.value = sample.password;
    wifiAuthInput.value = sample.auth;
    wifiHiddenInput.checked = sample.hidden;
  }

  renderCurrent();
}

function clearAll() {
  textInput.value = "";
  urlInput.value = "";
  emailAddressInput.value = "";
  emailSubjectInput.value = "";
  emailBodyInput.value = "";
  phoneInput.value = "";
  wifiSsidInput.value = "";
  wifiPasswordInput.value = "";
  wifiAuthInput.value = "WPA";
  wifiHiddenInput.checked = false;
  renderEmpty("Pick a payload type or load a sample to start.");
  setStatus("Pick a payload type or load a sample to start.");
}

function renderCurrent() {
  try {
    const payload = buildPayload();

    if (!payload) {
      renderEmpty("Enter a payload to generate a QR code.");
      setStatus("Enter a payload to generate a QR code.");
      return;
    }

    const payloadBytes = textEncoder.encode(payload);
    const ecLevel = eccInput.value;
    const version = selectVersion(payloadBytes.length, ecLevel);
    const blockInfo = BLOCK_TABLE[version - 1][LEVEL_INDEX[ecLevel]];
    const dataCodewords = encodeDataCodewords(payloadBytes, version, blockInfo.totalData);
    const { matrix, mask } = buildFinalMatrix(version, dataCodewords, ecLevel);
    const exportSize = clampNumber(sizeInput.value, 192, 1024, 320);
    const darkColor = darkInput.value;
    const lightColor = lightInput.value;
    const svg = matrixToSvg(matrix, exportSize, darkColor, lightColor, payload);

    state.current = {
      payload,
      payloadBytes,
      version,
      mask,
      matrix,
      exportSize,
      darkColor,
      lightColor,
      svg,
      capacity: getByteModeCapacity(version, ecLevel),
      ecLevel,
    };

    renderPreview(svg, darkColor, lightColor);
    renderStats(state.current);
    renderPayload(payload);
    setStatus(`Generated a version ${version} QR code with error correction ${ecLevel}.`);
  } catch (error) {
    state.current = null;
    renderEmpty(error.message || "Could not generate a QR code from the current fields.");
    setStatus(error.message || "Could not generate a QR code from the current fields.");
  }
}

function renderPreview(svg, darkColor, lightColor) {
  previewFrameNode.style.background = lightColor;
  previewFrameNode.innerHTML = svg;
  const svgNode = previewFrameNode.querySelector("svg");
  if (svgNode) {
    svgNode.setAttribute("aria-label", "Generated QR code preview");
    svgNode.setAttribute("role", "img");
    svgNode.style.display = "block";
  }
}

function renderEmpty(message) {
  state.current = null;
  payloadOutput.value = "";
  previewFrameNode.style.background = "rgba(255, 255, 255, 0.98)";
  previewFrameNode.innerHTML = `
    <div id="qr-preview-empty" class="qr-preview-empty">
      <strong>QR preview will appear here</strong>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  copyPayloadButton.disabled = true;
  downloadSvgButton.disabled = true;
  downloadPngButton.disabled = true;
  setNodeText(versionNode, "—");
  setNodeText(modulesNode, "—");
  setNodeText(bytesNode, "0");
  setNodeText(maskNode, "—");
  setNodeText(versionCardNode, "—");
  setNodeText(maskCardNode, "—");
  setNodeText(modulesCardNode, "—");
  setNodeText(capacityCardNode, "—");
}

function renderStats(current) {
  const moduleCount = current.matrix.length;
  const moduleDisplay = `${moduleCount} × ${moduleCount}`;

  setNodeText(versionNode, `v${current.version}`);
  setNodeText(modulesNode, moduleDisplay);
  setNodeText(bytesNode, current.payloadBytes.length.toString());
  setNodeText(maskNode, `Mask ${current.mask}`);
  setNodeText(versionCardNode, `v${current.version}`);
  setNodeText(maskCardNode, `Mask ${current.mask}`);
  setNodeText(modulesCardNode, moduleDisplay);
  setNodeText(capacityCardNode, `${current.capacity} bytes`);
  sizeValueNode.textContent = `${current.exportSize} px`;
  copyPayloadButton.disabled = false;
  downloadSvgButton.disabled = false;
  downloadPngButton.disabled = false;
}

function renderPayload(payload) {
  payloadOutput.value = payload;
}

function setStatus(message) {
  statusNode.textContent = message;
}

function buildPayload() {
  const mode = modeSelect.value;

  if (mode === "text") {
    const value = textInput.value;
    return value.length ? value : "";
  }

  if (mode === "url") {
    return buildUrlPayload(urlInput.value);
  }

  if (mode === "email") {
    return buildEmailPayload();
  }

  if (mode === "phone") {
    return buildPhonePayload();
  }

  if (mode === "wifi") {
    return buildWifiPayload();
  }

  throw new Error("Choose a payload type before generating a QR code.");
}

function buildUrlPayload(value) {
  const raw = value.trim();
  if (!raw) {
    return "";
  }

  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  new URL(candidate);
  return candidate;
}

function buildEmailPayload() {
  const address = emailAddressInput.value.trim();
  if (!address) {
    return "";
  }

  const params = new URLSearchParams();
  const subject = emailSubjectInput.value.trim();
  const body = emailBodyInput.value;

  if (subject) {
    params.set("subject", subject);
  }

  if (body) {
    params.set("body", body);
  }

  const suffix = params.toString();
  return suffix ? `mailto:${address}?${suffix}` : `mailto:${address}`;
}

function buildPhonePayload() {
  const raw = phoneInput.value.trim();
  if (!raw) {
    return "";
  }

  const cleaned = raw.replace(/[^\d+#*+]/g, "");
  if (!cleaned) {
    throw new Error("Enter a phone number with at least one digit.");
  }

  return `tel:${cleaned}`;
}

function buildWifiPayload() {
  const ssid = wifiSsidInput.value.trim();
  if (!ssid) {
    return "";
  }

  const auth = wifiAuthInput.value;
  const hidden = wifiHiddenInput.checked ? "true" : "false";
  const safeSsid = escapeWifiValue(ssid);
  const safePassword = escapeWifiValue(wifiPasswordInput.value);
  const security = auth === "nopass" ? "nopass" : auth;
  const passwordSegment = auth === "nopass" ? "" : `P:${safePassword};`;

  return `WIFI:T:${security};S:${safeSsid};${passwordSegment}H:${hidden};;`;
}

function escapeWifiValue(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/:/g, "\\:")
    .replace(/"/g, '\\"');
}

function selectVersion(payloadBytesLength, ecLevel) {
  for (let version = 1; version <= 40; version += 1) {
    if (getByteModeCapacity(version, ecLevel) >= payloadBytesLength) {
      return version;
    }
  }

  const maxCapacity = getByteModeCapacity(40, ecLevel);
  throw new Error(`This payload is too large for version 40 at error correction ${ecLevel}. Try shortening it or lowering the correction level. Maximum capacity: ${maxCapacity} bytes.`);
}

function getByteModeCapacity(version, ecLevel) {
  const blockInfo = getBlockInfo(version, ecLevel);
  const countBits = version <= 9 ? 8 : 16;
  const usableBits = (blockInfo.totalData * 8) - 4 - countBits;
  return Math.max(0, Math.floor(usableBits / 8));
}

function encodeDataCodewords(payloadBytes, version, capacityBytes) {
  const bits = [];
  const countBits = version <= 9 ? 8 : 16;

  pushBits(bits, 0b0100, 4);
  pushBits(bits, payloadBytes.length, countBits);

  for (const byte of payloadBytes) {
    pushBits(bits, byte, 8);
  }

  const maxBits = capacityBytes * 8;
  if (bits.length > maxBits) {
    throw new Error("The payload does not fit in the selected version.");
  }

  pushBits(bits, 0, Math.min(4, maxBits - bits.length));
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = [];
  for (let offset = 0; offset < bits.length; offset += 8) {
    codewords.push(bitsToByte(bits, offset));
  }

  let padByte = 0;
  while (codewords.length < capacityBytes) {
    codewords.push(padByte % 2 === 0 ? 0xec : 0x11);
    padByte += 1;
  }

  return Uint8Array.from(codewords);
}

function buildCodewordStream(dataCodewords, blockInfo) {
  const blockSizes = [];

  for (const group of blockInfo.blocks) {
    for (let index = 0; index < group.count; index += 1) {
      blockSizes.push(group.dataCodewords);
    }
  }

  const dataBlocks = [];
  let offset = 0;
  for (const size of blockSizes) {
    dataBlocks.push(Array.from(dataCodewords.slice(offset, offset + size)));
    offset += size;
  }

  if (offset !== dataCodewords.length) {
    throw new Error("The QR block table does not match the encoded data length.");
  }

  const eccBlocks = dataBlocks.map((block) => computeErrorCorrection(block, blockInfo.ecCodewords));
  const codewords = [];
  const maxDataLength = Math.max(...blockSizes);

  for (let index = 0; index < maxDataLength; index += 1) {
    for (const block of dataBlocks) {
      if (index < block.length) {
        codewords.push(block[index]);
      }
    }
  }

  for (let index = 0; index < blockInfo.ecCodewords; index += 1) {
    for (const block of eccBlocks) {
      codewords.push(block[index]);
    }
  }

  return Uint8Array.from(codewords);
}

function computeErrorCorrection(dataBlock, degree) {
  const generator = getGeneratorPolynomial(degree);
  const message = new Uint8Array(dataBlock.length + degree);
  message.set(dataBlock);

  for (let index = 0; index < dataBlock.length; index += 1) {
    const factor = message[index];
    if (factor === 0) {
      continue;
    }

    for (let term = 1; term < generator.length; term += 1) {
      message[index + term] ^= gfMul(generator[term], factor);
    }
  }

  return message.slice(dataBlock.length);
}

function getGeneratorPolynomial(degree) {
  if (GENERATOR_CACHE.has(degree)) {
    return GENERATOR_CACHE.get(degree);
  }

  let polynomial = [1];
  for (let index = 0; index < degree; index += 1) {
    polynomial = multiplyPolynomials(polynomial, [1, GF_EXP[index]]);
  }

  GENERATOR_CACHE.set(degree, polynomial);
  return polynomial;
}

function multiplyPolynomials(left, right) {
  const result = new Array(left.length + right.length - 1).fill(0);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      result[leftIndex + rightIndex] ^= gfMul(left[leftIndex], right[rightIndex]);
    }
  }

  return result;
}

function gfMul(left, right) {
  if (left === 0 || right === 0) {
    return 0;
  }

  return GF_EXP[GF_LOG[left] + GF_LOG[right]];
}

function initGaloisField() {
  let value = 1;

  for (let index = 0; index < 255; index += 1) {
    GF_EXP[index] = value;
    GF_LOG[value] = index;
    value <<= 1;
    if (value & 0x100) {
      value ^= 0x11d;
    }
  }

  for (let index = 255; index < GF_EXP.length; index += 1) {
    GF_EXP[index] = GF_EXP[index - 255];
  }
}

function pushBits(bitArray, value, bitCount) {
  for (let bit = bitCount - 1; bit >= 0; bit -= 1) {
    bitArray.push((value >>> bit) & 1);
  }
}

function bitsToByte(bits, offset) {
  let value = 0;
  for (let index = 0; index < 8; index += 1) {
    value = (value << 1) | bits[offset + index];
  }
  return value;
}

function buildFinalMatrix(version, dataCodewords, ecLevel) {
  const baseMatrix = createBaseMatrix(version);
  const blockInfo = getBlockInfo(version, ecLevel);
  const codewordStream = buildCodewordStream(dataCodewords, blockInfo);
  let best = null;

  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = cloneMatrix(baseMatrix);
    placeData(candidate, codewordStream, mask);
    placeFormatBits(candidate, ecLevel, mask);

    if (version >= 7) {
      placeVersionBits(candidate, version);
    }

    const score = scoreMatrix(candidate);
    if (!best || score < best.score) {
      best = { mask, matrix: candidate, score };
    }
  }

  return { matrix: best.matrix, mask: best.mask };
}

function createBaseMatrix(version) {
  const size = version * 4 + 17;
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));

  drawFinder(matrix, 0, 0);
  drawFinder(matrix, size - 7, 0);
  drawFinder(matrix, 0, size - 7);
  drawSeparators(matrix, 0, 0);
  drawSeparators(matrix, size - 7, 0);
  drawSeparators(matrix, 0, size - 7);
  drawTiming(matrix);
  drawAlignmentPatterns(matrix, version);
  setModule(matrix, 8, size - 8, true);
  reserveFormatInfo(matrix);

  if (version >= 7) {
    reserveVersionInfo(matrix);
  }

  return matrix;
}

function drawFinder(matrix, x, y) {
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const dark = row === 0 || row === 6 || col === 0 || col === 6 || (row >= 2 && row <= 4 && col >= 2 && col <= 4);
      setModule(matrix, x + col, y + row, dark);
    }
  }
}

function drawSeparators(matrix, x, y) {
  const size = matrix.length;
  for (let row = -1; row <= 7; row += 1) {
    for (let col = -1; col <= 7; col += 1) {
      const xx = x + col;
      const yy = y + row;
      if (xx < 0 || yy < 0 || xx >= size || yy >= size) {
        continue;
      }
      if (row === -1 || row === 7 || col === -1 || col === 7) {
        setModule(matrix, xx, yy, false);
      }
    }
  }
}

function drawTiming(matrix) {
  const size = matrix.length;

  for (let index = 8; index < size - 8; index += 1) {
    const dark = index % 2 === 0;
    setModule(matrix, index, 6, dark);
    setModule(matrix, 6, index, dark);
  }
}

function drawAlignmentPatterns(matrix, version) {
  const centers = getAlignmentCenters(version);

  for (const row of centers) {
    for (const col of centers) {
      if (matrix[row]?.[col] !== null) {
        continue;
      }

      let overlapsFunctionModule = false;
      for (let dy = -2; dy <= 2 && !overlapsFunctionModule; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          if (matrix[row + dy]?.[col + dx] !== null) {
            overlapsFunctionModule = true;
            break;
          }
        }
      }

      if (overlapsFunctionModule) {
        continue;
      }

      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) {
          const dark = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
          setModule(matrix, col + dx, row + dy, dark);
        }
      }
    }
  }
}

function getAlignmentCenters(version) {
  if (version === 1) {
    return [];
  }

  const numCenters = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = numCenters === 2
    ? size - 13
    : Math.ceil((size - 13) / (numCenters - 1) / 2) * 2;
  const centers = [6];

  for (let index = numCenters - 2; index >= 0; index -= 1) {
    centers.push(size - 7 - index * step);
  }

  return centers;
}

function reserveFormatInfo(matrix) {
  const { first, second } = getFormatCoordinates(matrix.length);

  for (const [x, y] of first) {
    setModule(matrix, x, y, false);
  }

  for (const [x, y] of second) {
    setModule(matrix, x, y, false);
  }
}

function reserveVersionInfo(matrix) {
  const { topRight, bottomLeft } = getVersionCoordinates(matrix.length);

  for (const [x, y] of topRight) {
    setModule(matrix, x, y, false);
  }

  for (const [x, y] of bottomLeft) {
    setModule(matrix, x, y, false);
  }
}

function placeFormatBits(matrix, ecLevel, mask) {
  const formatBits = (buildFormatBits(ecLevel, mask) ^ 0x5412) & 0x7fff;
  const { first, second } = getFormatCoordinates(matrix.length);

  first.forEach(([x, y], index) => {
    setModule(matrix, x, y, ((formatBits >>> index) & 1) === 1);
  });

  second.forEach(([x, y], index) => {
    setModule(matrix, x, y, ((formatBits >>> index) & 1) === 1);
  });
}

function placeVersionBits(matrix, version) {
  const versionBits = buildVersionBits(version);
  const { topRight, bottomLeft } = getVersionCoordinates(matrix.length);

  topRight.forEach(([x, y], index) => {
    setModule(matrix, x, y, ((versionBits >>> index) & 1) === 1);
  });

  bottomLeft.forEach(([x, y], index) => {
    setModule(matrix, x, y, ((versionBits >>> index) & 1) === 1);
  });
}

function getFormatCoordinates(size) {
  const first = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];

  const second = [];

  for (let index = 0; index < 8; index += 1) {
    second.push([size - 1 - index, 8]);
  }

  for (let index = 8; index < 15; index += 1) {
    second.push([8, size - 15 + index]);
  }

  return { first, second };
}

function getVersionCoordinates(size) {
  const topRight = [];
  const bottomLeft = [];

  for (let index = 0; index < 18; index += 1) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    topRight.push([row, size - 11 + col]);
  }

  for (let index = 0; index < 18; index += 1) {
    const row = index % 3;
    const col = Math.floor(index / 3);
    bottomLeft.push([size - 11 + row, col]);
  }

  return { topRight, bottomLeft };
}

function buildFormatBits(ecLevel, mask) {
  const data = (LEVEL_BITS[ecLevel] << 3) | mask;
  return (data << 10) | bchRemainder(data, 0x537, 10);
}

function buildVersionBits(version) {
  return (version << 12) | bchRemainder(version, 0x1f25, 12);
}

function bchRemainder(value, generator, generatorDegree) {
  let remainder = value << generatorDegree;
  while (bitLength(remainder) - 1 >= generatorDegree) {
    const shift = bitLength(remainder) - 1 - generatorDegree;
    remainder ^= generator << shift;
  }
  return remainder;
}

function bitLength(value) {
  if (value === 0) {
    return 0;
  }
  return 32 - Math.clz32(value);
}

function placeData(matrix, codewords, mask) {
  const size = matrix.length;
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right -= 1;
    }

    for (let offset = 0; offset < size; offset += 1) {
      const row = upward ? size - 1 - offset : offset;

      for (let col = right; col >= right - 1; col -= 1) {
        if (matrix[row][col] !== null) {
          continue;
        }

        const bit = bitIndex < codewords.length * 8 ? getBit(codewords, bitIndex) : 0;
        const shouldFlip = maskCondition(mask, col, row);
        matrix[row][col] = Boolean(bit ^ (shouldFlip ? 1 : 0));
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

function getBit(bytes, bitIndex) {
  const byte = bytes[bitIndex >> 3];
  return (byte >>> (7 - (bitIndex & 7))) & 1;
}

function maskCondition(mask, x, y) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((x * y) % 2 + (x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2 + (x * y) % 3) % 2) === 0;
    case 7:
      return (((x + y) % 2 + (x * y) % 3) % 2) === 0;
    default:
      throw new Error("Unknown QR mask pattern.");
  }
}

function scoreMatrix(matrix) {
  let score = 0;
  const size = matrix.length;

  for (let row = 0; row < size; row += 1) {
    score += scoreLine(matrix[row].map(Boolean));
  }

  for (let col = 0; col < size; col += 1) {
    const line = [];
    for (let row = 0; row < size; row += 1) {
      line.push(Boolean(matrix[row][col]));
    }
    score += scoreLine(line);
  }

  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const dark = Boolean(matrix[row][col]);
      if (dark === Boolean(matrix[row][col + 1]) && dark === Boolean(matrix[row + 1][col]) && dark === Boolean(matrix[row + 1][col + 1])) {
        score += 3;
      }
    }
  }

  const pattern1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pattern2 = [false, false, false, false, true, false, true, true, true, false, true];

  for (let row = 0; row < size; row += 1) {
    score += scorePattern(matrix[row].map(Boolean), pattern1, pattern2);
  }

  for (let col = 0; col < size; col += 1) {
    const line = [];
    for (let row = 0; row < size; row += 1) {
      line.push(Boolean(matrix[row][col]));
    }
    score += scorePattern(line, pattern1, pattern2);
  }

  let darkModules = 0;
  for (const row of matrix) {
    for (const cell of row) {
      if (cell) {
        darkModules += 1;
      }
    }
  }

  const totalModules = size * size;
  const percent = (darkModules * 100) / totalModules;
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

function scoreLine(line) {
  let score = 0;
  let runColor = line[0];
  let runLength = 1;

  for (let index = 1; index < line.length; index += 1) {
    if (line[index] === runColor) {
      runLength += 1;
      continue;
    }

    if (runLength >= 5) {
      score += 3 + (runLength - 5);
    }

    runColor = line[index];
    runLength = 1;
  }

  if (runLength >= 5) {
    score += 3 + (runLength - 5);
  }

  return score;
}

function scorePattern(line, pattern1, pattern2) {
  let score = 0;

  for (let index = 0; index <= line.length - pattern1.length; index += 1) {
    if (matchesPattern(line, index, pattern1) || matchesPattern(line, index, pattern2)) {
      score += 40;
    }
  }

  return score;
}

function matchesPattern(line, offset, pattern) {
  for (let index = 0; index < pattern.length; index += 1) {
    if (line[offset + index] !== pattern[index]) {
      return false;
    }
  }
  return true;
}

function cloneMatrix(matrix) {
  return matrix.map((row) => row.slice());
}

function setModule(matrix, x, y, value) {
  if (y < 0 || y >= matrix.length || x < 0 || x >= matrix.length) {
    return;
  }
  matrix[y][x] = value;
}

function getBlockInfo(version, ecLevel) {
  return BLOCK_TABLE[version - 1][LEVEL_INDEX[ecLevel]];
}

function buildBlockTable(raw) {
  const table = Array.from({ length: 40 }, () => Array(4).fill(null));

  raw.trim().split(/\n+/).forEach((line) => {
    const parts = line.trim().split(/\s+/);
    if (!parts.length) {
      return;
    }

    const [versionLevel, totalData, ecCodewords, ...rest] = parts;
    const [versionText, levelText] = versionLevel.split("-");
    const version = Number(versionText);
    const levelIndex = LEVEL_INDEX[levelText];
    const blocks = [];

    for (let index = 0; index < rest.length; index += 2) {
      const count = Number(rest[index]);
      const dataCodewords = Number(rest[index + 1]);
      if (Number.isFinite(count) && Number.isFinite(dataCodewords)) {
        blocks.push({ count, dataCodewords });
      }
    }

    table[version - 1][levelIndex] = {
      totalData: Number(totalData),
      ecCodewords: Number(ecCodewords),
      blocks,
    };
  });

  return table;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildFilename(extension) {
  return `aifreelancer-qr.${extension}`;
}

function copyPayload() {
  if (!state.current?.payload) {
    setStatus("There is no payload to copy yet.");
    return;
  }

  copyText(state.current.payload)
    .then(() => setStatus("Payload copied to the clipboard."))
    .catch(() => setStatus("Could not access the clipboard, so the browser fallback was used."));
}

async function downloadSvg() {
  if (!state.current?.svg) {
    setStatus("Generate a QR code before downloading SVG.");
    return;
  }

  triggerDownload(state.current.svg, buildFilename("svg"), "image/svg+xml;charset=utf-8");
  setStatus("SVG download started.");
}

async function downloadPng() {
  if (!state.current?.svg) {
    setStatus("Generate a QR code before downloading PNG.");
    return;
  }

  try {
    const current = state.current;
    const blob = new Blob([current.svg], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = current.exportSize;
      canvas.height = current.exportSize;

      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        setStatus("PNG export is not available in this browser.");
        return;
      }

      context.fillStyle = current.lightColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((pngBlob) => {
        URL.revokeObjectURL(objectUrl);
        if (!pngBlob) {
          setStatus("Could not build the PNG file.");
          return;
        }

        const downloadUrl = URL.createObjectURL(pngBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = buildFilename("png");
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
        setStatus("PNG download started.");
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setStatus("PNG export failed because the QR preview could not be rasterized.");
    };

    image.src = objectUrl;
  } catch {
    setStatus("PNG export failed in this browser.");
  }
}

function copyText(value) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.append(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
  return Promise.resolve();
}

function matrixToSvg(matrix, sizePx, darkColor, lightColor, payload) {
  const quietZone = 4;
  const modules = matrix.length;
  const totalModules = modules + quietZone * 2;
  const darkRects = [];

  for (let row = 0; row < modules; row += 1) {
    for (let col = 0; col < modules; col += 1) {
      if (!matrix[row][col]) {
        continue;
      }

      darkRects.push(`<rect x="${col + quietZone}" y="${row + quietZone}" width="1" height="1"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${sizePx}" height="${sizePx}" role="img" aria-label="QR code">
  <rect width="100%" height="100%" fill="${lightColor}"/>
  <title>QR code</title>
  <desc>${escapeHtml(payload)}</desc>
  <g fill="${darkColor}" shape-rendering="crispEdges">
    ${darkRects.join("")}
  </g>
</svg>`;
}
