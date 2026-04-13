import { escapeHtml, formatNumber, initCommon } from "../common.js";

initCommon("image-compressor");

const chooseButton = document.querySelector("#choose-image");
const downloadButton = document.querySelector("#download-image");
const clearButton = document.querySelector("#clear-image");
const fileInput = document.querySelector("#image-file");
const dropzone = document.querySelector("#image-dropzone");
const formatInput = document.querySelector("#output-format");
const qualityInput = document.querySelector("#output-quality");
const qualityValue = document.querySelector("#quality-value");
const limitDimensionsInput = document.querySelector("#limit-dimensions");
const maxDimensionInput = document.querySelector("#max-dimension");
const compressionNote = document.querySelector("#compression-note");
const originalInfo = document.querySelector("#original-info");
const originalName = document.querySelector("#original-name");
const outputInfo = document.querySelector("#output-info");
const outputName = document.querySelector("#output-name");
const savingsInfo = document.querySelector("#savings-info");
const savingsNote = document.querySelector("#savings-note");
const statusNode = document.querySelector("#compress-status");
const originalPreview = document.querySelector("#original-preview");
const outputPreview = document.querySelector("#output-preview");

const MAX_OUTPUT_DIMENSION = 8192;
const MAX_OUTPUT_PIXELS = 24_000_000;

const state = {
  file: null,
  sourceUrl: "",
  outputUrl: "",
  outputBlob: null,
  image: null,
  width: 0,
  height: 0,
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

document.addEventListener("paste", (event) => {
  const clipboardFiles = Array.from(event.clipboardData?.items ?? [])
    .filter((item) => item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);

  if (clipboardFiles.length) {
    loadFile(clipboardFiles[0]);
  }
});

formatInput.addEventListener("change", () => {
  updateQualityState();
  scheduleRender();
});
qualityInput.addEventListener("input", () => {
  updateQualityState();
  scheduleRender();
});
limitDimensionsInput.addEventListener("change", scheduleRender);
maxDimensionInput.addEventListener("input", scheduleRender);
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
  if (!file?.type?.startsWith("image/")) {
    setStatus("Please choose an image file.");
    return;
  }

  cleanupUrls();

  state.file = file;
  state.sourceUrl = URL.createObjectURL(file);

  const image = new Image();
  state.image = image;

  image.onload = () => {
    state.width = image.naturalWidth || image.width;
    state.height = image.naturalHeight || image.height;

    originalInfo.textContent = `${state.width} × ${state.height} • ${formatBytes(file.size)}`;
    originalName.textContent = file.name;
    originalPreview.innerHTML = `
      <img
        src="${state.sourceUrl}"
        alt="${escapeHtml(file.name)}"
        class="preview-media"
      >
    `;

    updateQualityState();
    setStatus("Image loaded. Adjust the format, quality, or max dimension to recompress it.");
    scheduleRender();
  };

  image.onerror = () => {
    setStatus("The selected file could not be loaded as an image.");
    cleanupUrls();
    resetIdleState();
  };

  image.src = state.sourceUrl;
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
  const format = supportedMimeTypes.has(formatInput.value) ? formatInput.value : "image/png";
  const quality = Math.max(0.01, Math.min(1, (parsePositiveInteger(qualityInput.value) ?? 82) / 100));
  const { width, height } = resolveOutputDimensions();

  if (!width || !height) {
    outputPreview.innerHTML = `
      <div class="empty-state">
        <strong class="empty-title">Invalid dimensions</strong>
        <p>Load an image and choose a valid max dimension to generate a preview.</p>
      </div>
    `;
    outputInfo.textContent = "Waiting";
    outputName.textContent = "Fix the image settings to generate an export.";
    savingsInfo.textContent = "—";
    savingsNote.textContent = "The compressor is waiting on a valid image size.";
    setStatus("The output dimensions are invalid.");
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
    savingsInfo.textContent = "—";
    savingsNote.textContent = "The requested render would be too large for a safe browser canvas.";
    setStatus("The requested image size is too large for safe in-browser rendering.");
    return;
  }

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

  const blob = await canvasToBlob(
    canvas,
    format,
    supportedFormats.find((item) => item.mime === format)?.lossy ? quality : undefined,
  );

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
  const sourceSize = state.file?.size ?? 0;

  outputPreview.innerHTML = `
    <img
      src="${nextUrl}"
      alt="${escapeHtml(outputFileName)}"
      class="preview-media"
    >
  `;
  originalInfo.textContent = `${state.width} × ${state.height} • ${formatBytes(sourceSize)}`;
  outputInfo.textContent = `${width} × ${height} • ${formatLabel(format)} • ${formatBytes(blob.size)}`;
  outputName.textContent = outputFileName;
  savingsInfo.textContent = formatSavings(sourceSize, blob.size);
  savingsNote.textContent = buildSavingsNote(sourceSize, blob.size, width, height, format);
  downloadButton.disabled = false;
  setStatus(`Ready to download ${outputFileName}.`);
}

async function downloadOutput() {
  if (!state.outputBlob || !state.outputUrl) {
    setStatus("Generate a compressed image before downloading.");
    return;
  }

  const format = supportedMimeTypes.has(formatInput.value) ? formatInput.value : "image/png";
  const extension = supportedFormats.find((item) => item.mime === format)?.extension ?? "png";
  const { width, height } = resolveOutputDimensions();
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
  originalInfo.textContent = "No image loaded";
  originalName.textContent = "Choose an image to inspect its source size.";
  outputInfo.textContent = "Waiting";
  outputName.textContent = "The filename updates with the chosen format and dimensions.";
  savingsInfo.textContent = "—";
  savingsNote.textContent = "Track the size difference after compression.";
  qualityInput.value = "82";
  qualityValue.textContent = "82%";
  limitDimensionsInput.checked = true;
  maxDimensionInput.value = "2048";
  updateQualityState();
  downloadButton.disabled = true;
  originalPreview.innerHTML = `
    <div class="empty-state">
      <strong class="empty-title">No image yet</strong>
      <p>Load a file to inspect the source image.</p>
    </div>
  `;
  outputPreview.innerHTML = `
    <div class="empty-state">
      <strong class="empty-title">No output yet</strong>
      <p>Adjust the settings to generate a compressed export.</p>
    </div>
  `;
}

function updateQualityState() {
  const format = supportedMimeTypes.has(formatInput.value) ? formatInput.value : "image/png";
  const lossy = supportedFormats.find((item) => item.mime === format)?.lossy ?? false;
  qualityInput.disabled = !lossy;
  qualityValue.textContent = `${qualityInput.value}%`;
  compressionNote.textContent = lossy
    ? "Quality applies to JPEG and WebP. PNG remains lossless and ignores the slider."
    : "PNG export is lossless in the browser and ignores the quality slider.";
}

function resolveOutputDimensions() {
  if (!state.image) {
    return { width: 0, height: 0 };
  }

  const originalWidth = state.width;
  const originalHeight = state.height;
  const longestSide = Math.max(originalWidth, originalHeight);

  if (!limitDimensionsInput.checked) {
    return { width: originalWidth, height: originalHeight };
  }

  const maxDimension = parsePositiveInteger(maxDimensionInput.value);
  if (!maxDimension) {
    return { width: 0, height: 0 };
  }

  if (longestSide <= maxDimension) {
    return { width: originalWidth, height: originalHeight };
  }

  const scale = maxDimension / longestSide;
  return {
    width: Math.max(1, Math.round(originalWidth * scale)),
    height: Math.max(1, Math.round(originalHeight * scale)),
  };
}

function formatSavings(originalSize, outputSize) {
  if (!originalSize || !outputSize) {
    return "—";
  }

  const delta = originalSize - outputSize;
  const percent = (Math.abs(delta) / originalSize) * 100;

  if (delta === 0) {
    return "No change";
  }

  return delta > 0
    ? `${formatNumber(percent, { maximumFractionDigits: 1 })}% smaller`
    : `${formatNumber(percent, { maximumFractionDigits: 1 })}% larger`;
}

function buildSavingsNote(originalSize, outputSize, width, height, format) {
  if (!originalSize || !outputSize) {
    return "The output size will appear after the browser finishes compressing the image.";
  }

  const delta = originalSize - outputSize;
  const absoluteDelta = formatBytes(Math.abs(delta));
  if (delta > 0) {
    return `${absoluteDelta} saved at ${width} × ${height} as ${formatLabel(format)}.`;
  }

  if (delta < 0) {
    return `${absoluteDelta} added compared with the original file at ${width} × ${height}.`;
  }

  return `No file size change at ${width} × ${height}.`;
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
