import { escapeHtml, initCommon } from "../common.js";

initCommon("color-studio");

const colorHexInput = document.querySelector("#color-hex");
const colorPicker = document.querySelector("#color-picker");
const primarySwatch = document.querySelector("#primary-swatch");
const primaryHex = document.querySelector("#primary-hex");
const colorRgb = document.querySelector("#color-rgb");
const colorHsl = document.querySelector("#color-hsl");
const contrastLight = document.querySelector("#contrast-light");
const contrastDark = document.querySelector("#contrast-dark");
const toneGrid = document.querySelector("#tone-grid");
const colorCss = document.querySelector("#color-css");

const paletteDropzone = document.querySelector("#palette-dropzone");
const paletteGrid = document.querySelector("#palette-grid");
const paletteStatus = document.querySelector("#palette-status");

colorHexInput.addEventListener("input", () => {
  const normalized = normalizeHex(colorHexInput.value);
  if (normalized) {
    renderColor(normalized);
  }
});

colorPicker.addEventListener("input", () => {
  renderColor(colorPicker.value);
});

paletteGrid.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const swatch = target.closest("[data-palette-hex]");
  if (!swatch) {
    return;
  }

  renderColor(swatch.dataset.paletteHex);
});

paletteDropzone.addEventListener("click", () => paletteDropzone.focus());
paletteDropzone.addEventListener("dragenter", () => paletteDropzone.classList.add("is-active"));
paletteDropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  paletteDropzone.classList.add("is-active");
});
paletteDropzone.addEventListener("dragleave", () => paletteDropzone.classList.remove("is-active"));
paletteDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  paletteDropzone.classList.remove("is-active");
  handleImageFiles(Array.from(event.dataTransfer.files));
});

document.addEventListener("paste", (event) => {
  const imageFiles = Array.from(event.clipboardData?.items ?? [])
    .filter((item) => item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);

  if (imageFiles.length) {
    handleImageFiles(imageFiles);
  }
});

renderColor("#0B84FF");

function renderColor(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return;
  }

  const rgb = hexToRgb(normalized);
  const hsl = rgbToHsl(rgb);
  const contrastOnWhite = getContrastRatio(rgb, [255, 255, 255]);
  const contrastOnInk = getContrastRatio(rgb, [23, 37, 45]);
  const readableText = getContrastRatio(rgb, [255, 255, 255]) >= 4.5 ? "#FFFFFF" : "#17252D";

  colorHexInput.value = normalized;
  colorPicker.value = normalized.toLowerCase();
  primarySwatch.style.background = normalized;
  primarySwatch.style.color = readableText;
  primaryHex.textContent = normalized;
  colorRgb.textContent = `rgb(${rgb.join(", ")})`;
  colorHsl.textContent = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  contrastLight.textContent = `${contrastOnWhite.toFixed(2)}:1`;
  contrastDark.textContent = `${contrastOnInk.toFixed(2)}:1`;

  renderToneGrid(rgb);
  colorCss.textContent = [
    ":root {",
    `  --brand: ${normalized};`,
    `  --brand-rgb: ${rgb.join(", ")};`,
    `  --brand-soft: ${rgbToHex(mixRgb(rgb, [255, 255, 255], 0.72))};`,
    `  --brand-deep: ${rgbToHex(mixRgb(rgb, [23, 37, 45], 0.3))};`,
    "}",
  ].join("\n");
}

function renderToneGrid(rgb) {
  const tones = [
    { label: "Tint 72%", value: mixRgb(rgb, [255, 255, 255], 0.72) },
    { label: "Tint 48%", value: mixRgb(rgb, [255, 255, 255], 0.48) },
    { label: "Base", value: rgb },
    { label: "Shade 18%", value: mixRgb(rgb, [23, 37, 45], 0.18) },
    { label: "Shade 34%", value: mixRgb(rgb, [23, 37, 45], 0.34) },
  ];

  toneGrid.innerHTML = tones
    .map(({ label, value }) => {
      const hex = rgbToHex(value);
      const textColor = getContrastRatio(value, [255, 255, 255]) > 4.5 ? "#FFFFFF" : "#17252D";
      return `
        <button class="swatch" type="button" data-palette-hex="${hex}" style="background:${hex}; color:${textColor}">
          <span class="swatch-label">${escapeHtml(label)}</span>
          <strong class="swatch-value">${hex}</strong>
        </button>
      `;
    })
    .join("");
}

function handleImageFiles(files) {
  const imageFile = files.find((file) => file.type.startsWith("image/"));
  if (!imageFile) {
    paletteStatus.textContent = "No image was detected.";
    return;
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(imageFile);
  image.onload = () => {
    const palette = extractPalette(image);
    URL.revokeObjectURL(objectUrl);
    if (!palette.length) {
      paletteStatus.textContent = "The image loaded, but no strong palette could be extracted.";
      return;
    }

    paletteStatus.textContent = `Extracted ${palette.length} dominant colors.`;
    paletteGrid.innerHTML = palette
      .map(({ hex }) => {
        const rgb = hexToRgb(hex);
        const textColor = getContrastRatio(rgb, [255, 255, 255]) > 4.5 ? "#FFFFFF" : "#17252D";
        return `
          <button class="swatch" type="button" data-palette-hex="${hex}" style="background:${hex}; color:${textColor}">
            <span class="swatch-label">Palette pick</span>
            <strong class="swatch-value">${hex}</strong>
          </button>
        `;
      })
      .join("");
  };

  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    paletteStatus.textContent = "That image could not be decoded in this browser.";
  };

  image.src = objectUrl;
}

function extractPalette(image) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const maxDimension = 48;
  const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);

  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const buckets = new Map();

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];
    if (alpha < 120) {
      continue;
    }

    const red = quantizeChannel(pixels[index]);
    const green = quantizeChannel(pixels[index + 1]);
    const blue = quantizeChannel(pixels[index + 2]);
    const key = `${red},${green},${blue}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const palette = [];
  [...buckets.entries()]
    .sort((left, right) => right[1] - left[1])
    .forEach(([key]) => {
      if (palette.length >= 6) {
        return;
      }

      const rgb = key.split(",").map(Number);
      const isDistinct = palette.every((existing) => getColorDistance(existing.rgb, rgb) >= 42);
      if (isDistinct) {
        palette.push({ rgb, hex: rgbToHex(rgb) });
      }
    });

  return palette;
}

function quantizeChannel(value) {
  return Math.min(255, Math.round(value / 32) * 32);
}

function getColorDistance(left, right) {
  return Math.sqrt(
    Math.pow(left[0] - right[0], 2)
      + Math.pow(left[1] - right[1], 2)
      + Math.pow(left[2] - right[2], 2),
  );
}

function normalizeHex(value) {
  const cleaned = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    return `#${cleaned.split("").map((char) => char + char).join("").toUpperCase()}`;
  }

  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }

  return null;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex).replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex(rgb) {
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

function rgbToHsl([red, green, blue]) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));

    if (max === r) {
      hue = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      hue = 60 * ((b - r) / delta + 2);
    } else {
      hue = 60 * ((r - g) / delta + 4);
    }
  }

  if (hue < 0) {
    hue += 360;
  }

  return {
    h: Math.round(hue),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function mixRgb(source, target, amount) {
  return source.map((channel, index) =>
    Math.round(channel + (target[index] - channel) * amount),
  );
}

function getContrastRatio(left, right) {
  const leftLuminance = getLuminance(left);
  const rightLuminance = getLuminance(right);
  const lighter = Math.max(leftLuminance, rightLuminance);
  const darker = Math.min(leftLuminance, rightLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance([red, green, blue]) {
  const channels = [red, green, blue].map((value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
