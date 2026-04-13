import { formatNumber, initCommon } from "../common.js";

initCommon("brick-calculator");

const systemInput = document.querySelector("#brick-system");
const formatInput = document.querySelector("#brick-format");
const lengthInput = document.querySelector("#brick-length");
const heightInput = document.querySelector("#brick-height");
const openingsInput = document.querySelector("#brick-openings");
const jointInput = document.querySelector("#brick-joint");
const wasteInput = document.querySelector("#brick-waste");
const layersInput = document.querySelector("#brick-layers");
const sampleButton = document.querySelector("#brick-sample");

const resultArea = document.querySelector("#result-area");
const resultUnits = document.querySelector("#result-units");
const resultCourses = document.querySelector("#result-courses");
const resultCourseUnits = document.querySelector("#result-course-units");
const resultPallets = document.querySelector("#result-pallets");
const resultMortar = document.querySelector("#result-mortar");

const labels = {
  length: document.querySelector("#brick-length-label"),
  height: document.querySelector("#brick-height-label"),
  openings: document.querySelector("#brick-openings-label"),
  joint: document.querySelector("#brick-joint-label"),
};

const masonryFormats = {
  modular: {
    label: "Modular brick",
    actualLengthIn: 7.625,
    actualHeightIn: 2.25,
    depthIn: 3.625,
    pallet: 500,
  },
  queen: {
    label: "Queen brick",
    actualLengthIn: 7.625,
    actualHeightIn: 2.75,
    depthIn: 3.625,
    pallet: 500,
  },
  king: {
    label: "King brick",
    actualLengthIn: 9.625,
    actualHeightIn: 2.625,
    depthIn: 3.625,
    pallet: 350,
  },
  cmu8: {
    label: "8 in CMU block",
    actualLengthIn: 15.625,
    actualHeightIn: 7.625,
    depthIn: 7.625,
    pallet: 90,
  },
  cmu12: {
    label: "12 in CMU block",
    actualLengthIn: 15.625,
    actualHeightIn: 7.625,
    depthIn: 11.625,
    pallet: 60,
  },
};

let currentSystem = systemInput.value;

formatInput.innerHTML = Object.entries(masonryFormats)
  .map(([value, format]) => `<option value="${value}">${format.label}</option>`)
  .join("");

formatInput.value = "modular";

[systemInput, formatInput, lengthInput, heightInput, openingsInput, jointInput, wasteInput, layersInput]
  .forEach((input) => input.addEventListener("input", updateEstimate));

systemInput.addEventListener("change", handleSystemChange);
sampleButton.addEventListener("click", loadSampleWall);

updateUnitLabels();
updateEstimate();

function handleSystemChange() {
  const nextSystem = systemInput.value;
  if (nextSystem !== currentSystem) {
    convertInputs(currentSystem, nextSystem);
    currentSystem = nextSystem;
  }

  updateUnitLabels();
  updateEstimate();
}

function convertInputs(fromSystem, toSystem) {
  const length = Number(lengthInput.value || 0);
  const height = Number(heightInput.value || 0);
  const openings = Number(openingsInput.value || 0);
  const joint = Number(jointInput.value || 0);

  if (fromSystem === "imperial" && toSystem === "metric") {
    lengthInput.value = (length * 0.3048).toFixed(3);
    heightInput.value = (height * 0.3048).toFixed(3);
    openingsInput.value = (openings * 0.092903).toFixed(3);
    jointInput.value = (joint * 25.4).toFixed(1);
  } else if (fromSystem === "metric" && toSystem === "imperial") {
    lengthInput.value = (length / 0.3048).toFixed(2);
    heightInput.value = (height / 0.3048).toFixed(2);
    openingsInput.value = (openings / 0.092903).toFixed(2);
    jointInput.value = (joint / 25.4).toFixed(3);
  }
}

function loadSampleWall() {
  formatInput.value = "modular";
  wasteInput.value = "8";
  layersInput.value = "1";

  if (systemInput.value === "imperial") {
    lengthInput.value = "24";
    heightInput.value = "8";
    openingsInput.value = "12";
    jointInput.value = "0.375";
  } else {
    lengthInput.value = "7.315";
    heightInput.value = "2.438";
    openingsInput.value = "1.115";
    jointInput.value = "9.5";
  }

  updateEstimate();
}

function updateUnitLabels() {
  if (systemInput.value === "imperial") {
    labels.length.textContent = "Wall length (ft)";
    labels.height.textContent = "Wall height (ft)";
    labels.openings.textContent = "Openings area (sq ft)";
    labels.joint.textContent = "Mortar joint (in)";
  } else {
    labels.length.textContent = "Wall length (m)";
    labels.height.textContent = "Wall height (m)";
    labels.openings.textContent = "Openings area (sq m)";
    labels.joint.textContent = "Mortar joint (mm)";
  }
}

function updateEstimate() {
  const format = masonryFormats[formatInput.value];
  const wasteFactor = Math.max(readFiniteNumber(wasteInput.value, 0), 0) / 100;
  const layers = Math.max(readFiniteNumber(layersInput.value, 1), 1);
  const jointIn = systemInput.value === "imperial"
    ? Math.max(readFiniteNumber(jointInput.value, 0), 0)
    : Math.max(readFiniteNumber(jointInput.value, 0), 0) / 25.4;

  const wallLengthFt = systemInput.value === "imperial"
    ? Math.max(readFiniteNumber(lengthInput.value, 0), 0)
    : Math.max(readFiniteNumber(lengthInput.value, 0), 0) / 0.3048;

  const wallHeightFt = systemInput.value === "imperial"
    ? Math.max(readFiniteNumber(heightInput.value, 0), 0)
    : Math.max(readFiniteNumber(heightInput.value, 0), 0) / 0.3048;

  const openingsSqFt = systemInput.value === "imperial"
    ? Math.max(readFiniteNumber(openingsInput.value, 0), 0)
    : Math.max(readFiniteNumber(openingsInput.value, 0), 0) / 0.092903;

  const netAreaSqFt = Math.max(wallLengthFt * wallHeightFt - openingsSqFt, 0);
  const wallLengthIn = wallLengthFt * 12;
  const wallHeightIn = wallHeightFt * 12;
  const nominalLengthIn = format.actualLengthIn + jointIn;
  const nominalHeightIn = format.actualHeightIn + jointIn;
  const unitsPerSqFt = 144 / (nominalLengthIn * nominalHeightIn);
  const rawUnits = netAreaSqFt * unitsPerSqFt * layers;
  const totalUnits = Math.ceil(rawUnits * (1 + wasteFactor));
  const courses = nominalHeightIn ? wallHeightIn / nominalHeightIn : 0;
  const unitsPerCourse = nominalLengthIn ? (wallLengthIn / nominalLengthIn) * layers : 0;
  const pallets = Math.ceil(totalUnits / format.pallet);

  const wallVolumeFt3 = netAreaSqFt * (format.depthIn / 12) * layers;
  const unitVolumeFt3 = (format.actualLengthIn * format.actualHeightIn * format.depthIn) / 1728;
  const mortarVolumeFt3 = Math.max(wallVolumeFt3 - rawUnits * unitVolumeFt3, 0);
  const mortarVolumeYd3 = mortarVolumeFt3 / 27;

  resultArea.innerHTML = systemInput.value === "imperial"
    ? `${formatNumber(netAreaSqFt)} sq ft`
    : `${formatNumber(netAreaSqFt * 0.092903)} sq m`;
  resultUnits.textContent = formatNumber(totalUnits, { maximumFractionDigits: 0 });
  resultCourses.textContent = formatNumber(Math.ceil(courses), { maximumFractionDigits: 0 });
  resultCourseUnits.textContent = formatNumber(Math.ceil(unitsPerCourse), { maximumFractionDigits: 0 });
  resultPallets.textContent = formatNumber(pallets, { maximumFractionDigits: 0 });
  resultMortar.innerHTML = systemInput.value === "imperial"
    ? `${formatNumber(mortarVolumeYd3)} yd&sup3;`
    : `${formatNumber(mortarVolumeFt3 * 0.0283168)} m&sup3;`;
}

function readFiniteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
