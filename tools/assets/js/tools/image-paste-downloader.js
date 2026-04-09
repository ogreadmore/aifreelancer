import { escapeHtml, initCommon } from "../common.js";

initCommon("image-paste-downloader");

const dropzone = document.querySelector("#image-dropzone");
const prefixInput = document.querySelector("#filename-prefix");
const autoDownloadInput = document.querySelector("#auto-download");
const clearButton = document.querySelector("#clear-gallery");
const galleryGrid = document.querySelector("#gallery-grid");
const captureCount = document.querySelector("#capture-count");
const captureSize = document.querySelector("#capture-size");
const captureStatus = document.querySelector("#capture-status");

const state = {
  entries: [],
};

dropzone.addEventListener("dragenter", () => dropzone.classList.add("is-active"));
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-active");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-active"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-active");
  addFiles(Array.from(event.dataTransfer.files), "drop");
});
dropzone.addEventListener("click", () => dropzone.focus());

document.addEventListener("paste", (event) => {
  const imageFiles = Array.from(event.clipboardData?.items ?? [])
    .filter((item) => item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);

  if (imageFiles.length) {
    addFiles(imageFiles, "paste");
  }
});

clearButton.addEventListener("click", clearGallery);

galleryGrid.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const downloadButton = target.closest("[data-download-id]");
  if (!downloadButton) {
    return;
  }

  const entry = state.entries.find((item) => item.id === downloadButton.dataset.downloadId);
  if (entry) {
    downloadEntry(entry);
  }
});

render();

function addFiles(files, source) {
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));

  if (!imageFiles.length) {
    captureStatus.textContent = "No image files were detected.";
    return;
  }

  imageFiles.forEach((file, index) => {
    const entry = {
      id: `capture-${Date.now()}-${index}-${state.entries.length}`,
      url: URL.createObjectURL(file),
      name: buildFilename(file),
      size: file.size,
      type: file.type || "image/png",
      source,
      addedAt: new Date(),
    };

    state.entries.unshift(entry);

    if (autoDownloadInput.checked) {
      downloadEntry(entry);
    }
  });

  captureStatus.textContent = `${imageFiles.length} image${imageFiles.length > 1 ? "s" : ""} added from ${source}.`;
  render();
}

function buildFilename(file) {
  const prefix = sanitizePrefix(prefixInput.value);
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const extension = getExtension(file.type);
  return `${prefix}-${timestamp}-${state.entries.length + 1}.${extension}`;
}

function sanitizePrefix(value) {
  const sanitized = value.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "aifreelancer-shot";
}

function getExtension(type) {
  if (!type.includes("/")) {
    return "png";
  }

  const extension = type.split("/")[1].toLowerCase();
  return extension === "jpeg" ? "jpg" : extension || "png";
}

function clearGallery() {
  state.entries.forEach((entry) => URL.revokeObjectURL(entry.url));
  state.entries = [];
  captureStatus.textContent = "Gallery cleared.";
  render();
}

function render() {
  captureCount.textContent = state.entries.length.toString();
  captureSize.textContent = formatBytes(
    state.entries.reduce((total, entry) => total + entry.size, 0),
  );

  if (!state.entries.length) {
    galleryGrid.innerHTML = `
      <div class="empty-state">
        <strong class="empty-title">No images yet</strong>
        <p>Paste or drop an image to start building the local preview gallery.</p>
      </div>
    `;
    return;
  }

  galleryGrid.innerHTML = state.entries
    .map(
      (entry) => `
        <article class="gallery-item">
          <div class="gallery-preview">
            <img src="${entry.url}" alt="${escapeHtml(entry.name)}">
          </div>
          <div class="gallery-meta">
            <strong>${escapeHtml(entry.name)}</strong>
            <span class="helper-copy">${formatBytes(entry.size)} • ${escapeHtml(entry.type)} • ${escapeHtml(entry.source)}</span>
          </div>
          <button class="button button-secondary" type="button" data-download-id="${entry.id}">Download again</button>
        </article>
      `,
    )
    .join("");
}

function downloadEntry(entry) {
  const anchor = document.createElement("a");
  anchor.href = entry.url;
  anchor.download = entry.name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function formatBytes(bytes) {
  if (!bytes) {
    return "0 KB";
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
