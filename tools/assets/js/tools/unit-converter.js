import { initCommon } from "../common.js";

initCommon("unit-converter");

const categoryInput = document.querySelector("#converter-category");
const valueInput = document.querySelector("#converter-value");
const fromInput = document.querySelector("#converter-from");
const toInput = document.querySelector("#converter-to");
const swapButton = document.querySelector("#converter-swap");
const outputNode = document.querySelector("#converter-output");
const expressionNode = document.querySelector("#converter-expression");
const tableBody = document.querySelector("#converter-table-body");

const converterData = {
  length: {
    label: "Length",
    defaultFrom: "meter",
    defaultTo: "foot",
    units: {
      millimeter: { label: "Millimeter", toBase: 0.001 },
      centimeter: { label: "Centimeter", toBase: 0.01 },
      meter: { label: "Meter", toBase: 1 },
      kilometer: { label: "Kilometer", toBase: 1000 },
      inch: { label: "Inch", toBase: 0.0254 },
      foot: { label: "Foot", toBase: 0.3048 },
      yard: { label: "Yard", toBase: 0.9144 },
      mile: { label: "Mile", toBase: 1609.344 },
    },
  },
  area: {
    label: "Area",
    defaultFrom: "square-foot",
    defaultTo: "square-meter",
    units: {
      "square-inch": { label: "Square inch", toBase: 0.00064516 },
      "square-foot": { label: "Square foot", toBase: 0.09290304 },
      "square-yard": { label: "Square yard", toBase: 0.83612736 },
      acre: { label: "Acre", toBase: 4046.8564224 },
      "square-meter": { label: "Square meter", toBase: 1 },
      hectare: { label: "Hectare", toBase: 10000 },
    },
  },
  volume: {
    label: "Volume",
    defaultFrom: "gallon",
    defaultTo: "liter",
    units: {
      milliliter: { label: "Milliliter", toBase: 0.001 },
      liter: { label: "Liter", toBase: 1 },
      "fluid-ounce": { label: "US fluid ounce", toBase: 0.0295735295625 },
      cup: { label: "US cup", toBase: 0.2365882365 },
      pint: { label: "US pint", toBase: 0.473176473 },
      quart: { label: "US quart", toBase: 0.946352946 },
      gallon: { label: "US gallon", toBase: 3.785411784 },
      "cubic-inch": { label: "Cubic inch", toBase: 0.016387064 },
      "cubic-foot": { label: "Cubic foot", toBase: 28.316846592 },
      "cubic-yard": { label: "Cubic yard", toBase: 764.554857984 },
    },
  },
  weight: {
    label: "Weight",
    defaultFrom: "pound",
    defaultTo: "kilogram",
    units: {
      gram: { label: "Gram", toBase: 0.001 },
      kilogram: { label: "Kilogram", toBase: 1 },
      ounce: { label: "Ounce", toBase: 0.028349523125 },
      pound: { label: "Pound", toBase: 0.45359237 },
      ton: { label: "US ton", toBase: 907.18474 },
    },
  },
  temperature: {
    label: "Temperature",
    defaultFrom: "fahrenheit",
    defaultTo: "celsius",
    units: {
      fahrenheit: { label: "Fahrenheit" },
      celsius: { label: "Celsius" },
      kelvin: { label: "Kelvin" },
    },
  },
  speed: {
    label: "Speed",
    defaultFrom: "mile-per-hour",
    defaultTo: "meter-per-second",
    units: {
      "foot-per-second": { label: "Foot per second", toBase: 0.3048 },
      "meter-per-second": { label: "Meter per second", toBase: 1 },
      "kilometer-per-hour": { label: "Kilometer per hour", toBase: 0.2777777778 },
      "mile-per-hour": { label: "Mile per hour", toBase: 0.44704 },
      knot: { label: "Knot", toBase: 0.514444 },
    },
  },
};

categoryInput.innerHTML = Object.entries(converterData)
  .map(([value, category]) => `<option value="${value}">${category.label}</option>`)
  .join("");

categoryInput.addEventListener("change", handleCategoryChange);
valueInput.addEventListener("input", updateConverter);
fromInput.addEventListener("change", updateConverter);
toInput.addEventListener("change", updateConverter);
swapButton.addEventListener("click", swapUnits);

categoryInput.value = "length";
handleCategoryChange();

function handleCategoryChange() {
  const category = converterData[categoryInput.value];
  fromInput.innerHTML = buildUnitOptions(category.units);
  toInput.innerHTML = buildUnitOptions(category.units);
  fromInput.value = category.defaultFrom;
  toInput.value = category.defaultTo;
  updateConverter();
}

function buildUnitOptions(units) {
  return Object.entries(units)
    .map(([value, unit]) => `<option value="${value}">${unit.label}</option>`)
    .join("");
}

function swapUnits() {
  const nextFrom = toInput.value;
  toInput.value = fromInput.value;
  fromInput.value = nextFrom;
  updateConverter();
}

function updateConverter() {
  const category = converterData[categoryInput.value];
  const rawValue = Number(valueInput.value || 0);
  const convertedValue = convertValue(categoryInput.value, rawValue, fromInput.value, toInput.value);

  outputNode.textContent = formatValue(convertedValue);
  expressionNode.textContent = `${formatValue(rawValue)} ${category.units[fromInput.value].label.toLowerCase()} = ${formatValue(convertedValue)} ${category.units[toInput.value].label.toLowerCase()}`;

  tableBody.innerHTML = Object.entries(category.units)
    .map(([unitKey, unit]) => {
      const unitValue = convertValue(categoryInput.value, rawValue, fromInput.value, unitKey);
      return `
        <tr>
          <td>${unit.label}</td>
          <td>${formatValue(unitValue)}</td>
        </tr>
      `;
    })
    .join("");
}

function convertValue(categoryKey, value, fromUnit, toUnit) {
  if (categoryKey === "temperature") {
    const base = toCelsius(value, fromUnit);
    return fromCelsius(base, toUnit);
  }

  const category = converterData[categoryKey];
  const baseValue = value * category.units[fromUnit].toBase;
  return baseValue / category.units[toUnit].toBase;
}

function toCelsius(value, unit) {
  if (unit === "fahrenheit") {
    return (value - 32) * (5 / 9);
  }

  if (unit === "kelvin") {
    return value - 273.15;
  }

  return value;
}

function fromCelsius(value, unit) {
  if (unit === "fahrenheit") {
    return value * (9 / 5) + 32;
  }

  if (unit === "kelvin") {
    return value + 273.15;
  }

  return value;
}

function formatValue(value) {
  const absoluteValue = Math.abs(value);
  if (absoluteValue !== 0 && (absoluteValue < 0.001 || absoluteValue >= 1_000_000)) {
    return value.toExponential(4);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 6,
  }).format(value);
}
