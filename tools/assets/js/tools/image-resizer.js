import { escapeHtml, formatNumber, initCommon } from "../common.js";

initCommon("image-resizer");

const chooseButton = document.querySelector("#choose-image");
const downloadButton = document.querySelector("#download-image");
const clearButton = document.querySelector("#clear-image");
const fileInput = document.querySelector("#image-file");
const dropzone = document.querySelector("#image-dropzone");
const widthInput = document.querySelector("#resize-width");
const heightInput = document.querySelector("#resize-height");
const scaleInput = document.querySelector("#resize-scale");
const lockInput = document.querySelector("#lock-aspect");
const formatInput = document.querySelector("#output-format");
const qualityInput = document.querySelector("#output-quality");
const qualityValue = document.querySelector("#quality-value");
const originalInfo = document.querySelector("#original-info");
const originalName = document.querySelector("#original-name");
const outputInfo = document.querySelector("#output-info");
const outputName = document.querySelector("#output-name");
const statusNode = document.querySelector("#resize-status");
const originalPreview = document.querySelector("#original-preview");
const outputPreview = document.querySelector("#output-preview");
const MAX_OUTPUT_DIMENSION = 8000;
const MAX_OUTPUT_PIXELS = 24_000_000;

const state = {
  file: null,
  sourceUrl: "",
  outputUrl: "",
  outputBlob: null,
  image: null,
  width: 0,
  height: 0,
  originalSize: 0,
  renderTimer: 0,
  renderToken: 0,
};

const supportedFormats = [
  { label: "PNG", mime: "image/png", extension: "png", lossy: false },
  { label: "JPEG", mime: "image/jpeg", extension: "jpg", lossy: true },
];

if (supportsMimeType("image/webp")) {
  supportedFormats.push({ label: "WebP", mime: "image/webp", extension: "webp", lossy: true });
} else {
  const webpOption = formatInput.querySelector('option[value="image/webp"]');
  webpOption?.remove();
}

const supportedMimeTypes = new Set(supportedFormats.map((format) => format.mime));

chooseButton.addEventListener("click", openFilePicker);
dropzone.addEventListener("click", openFilePicker);
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openFilePicker();
  }
});

dropzone.addEventListener("dragenter", () => dropzone.classList.add("is-active"));
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-active");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-active"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-active");
  const file = Array.from(event.dataTransfer?.files ?? []).find((item) => item.type.startsWith("image/"));
  if (file) {
    loadFile(file);
  } else {
    setStatus("No image file was found in the drop.");
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) {
    loadFile(file);
  }
  fileInput.value = "";
});

widthInput.addEventListener("input", () => handleDimensionChange("width"));
heightInput.addEventListener("input", () => handleDimensionChange("height"));
scaleInput.addEventListener("input", handleScaleChange);
lockInput.addEventListener("change", handleLockChange);
formatInput.addEventListener("change", () => {
  updateQualityState();
  scheduleRender();
});
qualityInput.addEventListener("input", () => {
  updateQualityState();
  scheduleRender();
});
downloadButton.addEventListener("click", downloadOutput);
clearButton.addEventListener("click", clearImage);
window.addEventListener("beforeunload", cleanupUrls);

updateQualityState();
resetIdleState();
setStatus("Load an image to generate a preview.");

function openFilePicker() {
  fileInput.click();
}

function loadFile(file) {
  if (!file.type.startsWith("image/")) {
    setStatus("Please choose an image file.");
    return;
  }

  cleanupUrls();

  state.file = file;
  state.originalSize = file.size;
  state.sourceUrl = URL.createObjectURL(file);

  const image = new Image();
  state.image = image;

  image.onload = () => {
    state.width = image.naturalWidth || image.width;
    state.height = image.naturalHeight || image.height;

    widthInput.value = String(state.width);
    heightInput.value = String(state.height);
    scaleInput.value = "100";
    lockInput.checked = true;

    originalName.textContent = file.name;
    originalInfo.textContent = `${state.width} × ${state.height} • ${formatBytes(file.size)}`;

    originalPreview.innerHTML = `
      <img
        src="${state.sourceUrl}"
        alt="${escapeHtml(file.name)}"
        class="preview-media"
      >
    `;

    updateQualityState();
    setStatus("Image loaded. Adjust the controls to preview a resized export.");
    scheduleRender();
  };

  image.onerror = () => {
    setStatus("The selected file could not be loaded as an image.");
    cleanupUrls();
    resetIdleState();
  };

  image.src = state.sourceUrl;
}

function handleDimensionChange(source) {
  if (!state.image) {
    return;
  }

  const width = parsePositiveInteger(widthInput.value);
  const height = parsePositiveInteger(heightInput.value);

  if (!width || !height) {
    setStatus("Width and height must both be positive whole numbers.");
    downloadButton.disabled = true;
    return;
  }

  if (source === "width" && lockInput.checked) {
    heightInput.value = String(Math.max(1, Math.round((width / state.width) * state.height)));
  } else if (source === "height" && lockInput.checked) {
    widthInput.value = String(Math.max(1, Math.round((height / state.height) * state.width)));
  }

  const nextWidth = parsePositiveInteger(widthInput.value) ?? width;
  const nextHeight = parsePositiveInteger(heightInput.value) ?? height;
  scaleInput.value = source === "height"
    ? String(Math.max(1, Math.round((nextHeight / state.height) * 100)))
    : String(Math.max(1, Math.round((nextWidth / state.width) * 100)));

  setStatus("Dimensions updated. A new preview will be rendered.");
  scheduleRender();
}

function handleScaleChange() {
  if (!state.image) {
    return;
  }

  const scale = parsePositiveInteger(scaleInput.value);
  if (!scale) {
    setStatus("Scale percentage must be a positive whole number.");
    downloadButton.disabled = true;
    return;
  }

  const clampedScale = Math.min(1000, scale);
  const nextWidth = Math.max(1, Math.round(state.width * (clampedScale / 100)));
  const nextHeight = Math.max(1, Math.round(state.height * (clampedScale / 100)));

  widthInput.value = String(nextWidth);
  heightInput.value = String(nextHeight);
  scaleInput.value = String(clampedScale);
  setStatus("Scale updated. A new preview will be rendered.");
  scheduleRender();
}

function handleLockChange() {
  if (!state.image) {
    return;
  }

  if (lockInput.checked) {
    const width = parsePositiveInteger(widthInput.value);
    if (width) {
      heightInput.value = String(Math.max(1, Math.round((width / state.width) * state.height)));
    }
  }

  setStatus(lockInput.checked ? "Aspect ratio locked." : "Aspect ratio unlocked.");
  scheduleRender();
}

function scheduleRender() {
  clearTimeout(state.renderTimer);
  downloadButton.disabled = true;
  state.renderTimer = window.setTimeout(() => {
    renderOutput();
  }, 80);
}

async function renderOutput() {
  if (!state.image) {
    return;
  }

  const token = ++state.renderToken;
  const width = parsePositiveInteger(widthInput.value);
  const height = parsePositiveInteger(heightInput.value);
  if (!width || !height) {
    outputPreview.innerHTML = `
      <div class="empty-state">
        <strong class="empty-title">Invalid dimensions</strong>
        <p>Enter positive whole numbers for width and height.</p>
      </div>
    `;
    outputInfo.textContent = "Waiting";
    outputName.textContent = "Fix the dimensions to generate an export.";
    downloadButton.disabled = true;
    return;
  }

  if (width > MAX_OUTPUT_DIMENSION || height > MAX_OUTPUT_DIMENSION || width * height > MAX_OUTPUT_PIXELS) {
    outputPreview.innerHTML = `
      <div class="empty-state">
        <strong class="empty-title">Output is too large</strong>
        <p>Keep the render under ${formatNumber(MAX_OUTPUT_PIXELS / 1_000_000, { maximumFractionDigits: 0 })} megapixels and below ${MAX_OUTPUT_DIMENSION.toLocaleString("en-US")} pixels on each side.</p>
      </div>
    `;
    outputInfo.textContent = "Too large";
    outputName.textContent = "Reduce the dimensions to generate an export.";
    downloadButton.disabled = true;
    setStatus("The requested image size is too large for safe in-browser rendering.");
    return;
  }

  const format = supportedMimeTypes.has(formatInput.value) ? formatInput.value : "image/png";
  const quality = Math.max(0.01, Math.min(1, (parsePositiveInteger(qualityInput.value) ?? 92) / 100));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    setStatus("Canvas rendering is not available in this browser.");
    return;
  }

  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  if (format === "image/jpeg") {
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, width, height);
  }

  context.drawImage(state.image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, format, supportedFormats.find((item) => item.mime === format)?.lossy ? quality : undefined);
  if (!blob) {
    setStatus(`The browser could not export ${formatLabel(format)}.`);
    downloadButton.disabled = true;
    return;
  }

  const nextUrl = URL.createObjectURL(blob);
  if (token !== state.renderToken) {
    URL.revokeObjectURL(nextUrl);
    return;
  }

  if (state.outputUrl) {
    URL.revokeObjectURL(state.outputUrl);
  }

  state.outputBlob = blob;
  state.outputUrl = nextUrl;

  const extension = supportedFormats.find((item) => item.mime === format)?.extension ?? "png";
  const outputFileName = buildDownloadName(state.file?.name ?? "image", width, height, extension);

  outputPreview.innerHTML = `
    <img
      src="${nextUrl}"
      alt="${escapeHtml(outputFileName)}"
      class="preview-media"
    >
  `;
  outputInfo.textContent = `${width} × ${height} • ${formatLabel(format)} • ${formatBytes(blob.size)}`;
  outputName.textContent = outputFileName;
  downloadButton.disabled = false;
  setStatus(`Ready to download ${formatLabel(format)} at ${width} × ${height}.`);
}

async function downloadOutput() {
  if (!state.outputBlob || !state.outputUrl) {
    setStatus("Generate an output image before downloading.");
    return;
  }

  const format = supportedMimeTypes.has(formatInput.value) ? formatInput.value : "image/png";
  const extension = supportedFormats.find((item) => item.mime === format)?.extension ?? "png";
  const width = parsePositiveInteger(widthInput.value) ?? state.width;
  const height = parsePositiveInteger(heightInput.value) ?? state.height;
  const downloadName = buildDownloadName(state.file?.name ?? "image", width, height, extension);

  const anchor = document.createElement("a");
  anchor.href = state.outputUrl;
  anchor.download = downloadName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  setStatus(`Downloaded ${downloadName}.`);
}

function clearImage() {
  cleanupUrls();
  resetIdleState();
  setStatus("Image cleared. Choose another file to begin again.");
}

function cleanupUrls() {
  clearTimeout(state.renderTimer);
  state.renderToken += 1;

  if (state.sourceUrl) {
    URL.revokeObjectURL(state.sourceUrl);
  }

  if (state.outputUrl) {
    URL.revokeObjectURL(state.outputUrl);
  }

  state.file = null;
  state.sourceUrl = "";
  state.outputUrl = "";
  state.outputBlob = null;
  state.image = null;
  state.width = 0;
  state.height = 0;
}

function resetIdleState() {
  widthInput.value = "0";
  heightInput.value = "0";
  scaleInput.value = "100";
  lockInput.checked = true;
  qualityInput.value = "92";
  qualityValue.textContent = "92%";
  updateQualityState();
  downloadButton.disabled = true;
  originalInfo.textContent = "No image loaded";
  originalName.textContent = "Choose an image to begin.";
  outputInfo.textContent = "Waiting";
  outputName.textContent = "The download name updates with the current settings.";
  originalPreview.innerHTML = `
    <div class="empty-state">
      <strong class="empty-title">No image yet</strong>
      <p>Load a file to inspect the source image.</p>
    </div>
  `;
  outputPreview.innerHTML = `
    <div class="empty-state">
      <strong class="empty-title">No output yet</strong>
      <p>Adjust the controls to generate a resized export.</p>
    </div>
  `;
}

function updateQualityState() {
  const format = supportedMimeTypes.has(formatInput.value) ? formatInput.value : "image/png";
  const lossy = supportedFormats.find((item) => item.mime === format)?.lossy ?? false;
  qualityInput.disabled = !lossy;
  qualityValue.textContent = `${qualityInput.value}%`;
}

function setStatus(message) {
  statusNode.textContent = message;
}

function parsePositiveInteger(value) {
  const number = Number.parseInt(String(value), 10);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function formatLabel(format) {
  return supportedFormats.find((item) => item.mime === format)?.label ?? "PNG";
}

function buildDownloadName(originalName, width, height, extension) {
  const baseName = originalName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "image";

  return `${baseName}-${width}x${height}.${extension}`;
}

function formatBytes(bytes) {
  if (!bytes) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function supportsMimeType(mimeType) {
  const canvas = document.createElement("canvas");
  return canvas.toDataURL(mimeType).startsWith(`data:${mimeType}`);
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}
