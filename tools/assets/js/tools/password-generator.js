import { escapeHtml, initCommon } from "../common.js";

initCommon("password-generator");

const lengthInput = document.querySelector("#password-length");
const countInput = document.querySelector("#password-count");
const lowercaseInput = document.querySelector("#password-lowercase");
const uppercaseInput = document.querySelector("#password-uppercase");
const numbersInput = document.querySelector("#password-numbers");
const symbolsInput = document.querySelector("#password-symbols");
const ambiguousInput = document.querySelector("#password-ambiguous");
const generateButton = document.querySelector("#password-generate");
const copyAllButton = document.querySelector("#password-copy-all");
const sampleButton = document.querySelector("#password-sample");
const resetButton = document.querySelector("#password-reset");
const statusNode = document.querySelector("#password-status");
const strengthNode = document.querySelector("#password-strength");
const strengthNoteNode = document.querySelector("#password-strength-note");
const strengthFillNode = document.querySelector("#password-strength-fill");
const poolNode = document.querySelector("#password-pool");
const poolNoteNode = document.querySelector("#password-pool-note");
const entropyNode = document.querySelector("#password-entropy");
const entropyNoteNode = document.querySelector("#password-entropy-note");
const setsNode = document.querySelector("#password-sets");
const setsNoteNode = document.querySelector("#password-sets-note");
const resultsNode = document.querySelector("#password-results");

const CHARACTER_SETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?/<>~",
};

const AMBIGUOUS = new Set(["0", "O", "o", "1", "I", "l", "L", "|"]);

let currentPasswords = [];
let updateTimer = 0;

[lengthInput, countInput, lowercaseInput, uppercaseInput, numbersInput, symbolsInput, ambiguousInput].forEach((field) => {
  field.addEventListener("input", scheduleUpdate);
  field.addEventListener("change", scheduleUpdate);
});

generateButton.addEventListener("click", generatePasswords);
copyAllButton.addEventListener("click", copyAllPasswords);
sampleButton.addEventListener("click", loadSample);
resetButton.addEventListener("click", resetForm);

generatePasswords();

function scheduleUpdate() {
  window.clearTimeout(updateTimer);
  updateTimer = window.setTimeout(generatePasswords, 120);
}

function generatePasswords() {
  const options = getOptions();
  const activeSets = getActiveSets(options);

  if (!activeSets.length) {
    currentPasswords = [];
    renderEmpty("Select at least one character set to generate passwords.");
    updateStrength({ length: options.length, poolSize: 0, setCount: 0, ambiguous: options.excludeAmbiguous });
    return;
  }

  const effectiveLength = Math.max(options.length, activeSets.length);
  const passwords = [];

  for (let index = 0; index < options.count; index += 1) {
    passwords.push(generatePassword(effectiveLength, activeSets, options.excludeAmbiguous));
  }

  currentPasswords = passwords;
  renderPasswords(passwords);
  updateStrength({
    length: effectiveLength,
    poolSize: getPoolSize(activeSets),
    setCount: activeSets.length,
    ambiguous: options.excludeAmbiguous,
  });

  if (effectiveLength !== options.length) {
    setStatus(`Length raised to ${effectiveLength} so each selected set is represented at least once.`);
  } else {
    setStatus(`Generated ${passwords.length} password${passwords.length === 1 ? "" : "s"} locally with crypto randomness.`);
  }
}

function getOptions() {
  const length = clampNumber(lengthInput.value, 8, 128, 16);
  const count = clampNumber(countInput.value, 1, 20, 6);

  lengthInput.value = String(length);
  countInput.value = String(count);

  return {
    length,
    count,
    useLowercase: lowercaseInput.checked,
    useUppercase: uppercaseInput.checked,
    useNumbers: numbersInput.checked,
    useSymbols: symbolsInput.checked,
    excludeAmbiguous: ambiguousInput.checked,
  };
}

function getActiveSets(options) {
  const sets = [];
  const filtered = options.excludeAmbiguous ? filterAmbiguous : (value) => value;

  if (options.useLowercase) {
    sets.push({ name: "lowercase", chars: filtered(CHARACTER_SETS.lowercase) });
  }

  if (options.useUppercase) {
    sets.push({ name: "uppercase", chars: filtered(CHARACTER_SETS.uppercase) });
  }

  if (options.useNumbers) {
    sets.push({ name: "numbers", chars: filtered(CHARACTER_SETS.numbers) });
  }

  if (options.useSymbols) {
    sets.push({ name: "symbols", chars: filtered(CHARACTER_SETS.symbols) });
  }

  return sets.filter((set) => set.chars.length > 0);
}

function filterAmbiguous(value) {
  return [...value].filter((char) => !AMBIGUOUS.has(char)).join("");
}

function generatePassword(length, activeSets, excludeAmbiguous) {
  const pool = activeSets.map((set) => set.chars).join("");
  const characters = activeSets.map((set) => pickFrom(set.chars));

  while (characters.length < length) {
    characters.push(pickFrom(pool));
  }

  shuffle(characters);

  if (excludeAmbiguous) {
    for (let index = 0; index < characters.length; index += 1) {
      if (AMBIGUOUS.has(characters[index])) {
        characters[index] = pickReplacement(pool);
      }
    }
  }

  return characters.join("");
}

function pickReplacement(pool) {
  let next = pickFrom(pool);
  while (AMBIGUOUS.has(next)) {
    next = pickFrom(pool);
  }
  return next;
}

function pickFrom(value) {
  return value[randomInt(value.length)];
}

function shuffle(values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

function randomInt(max) {
  if (max <= 0) {
    return 0;
  }

  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);

  let value = 0;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);

  return value % max;
}

function getPoolSize(activeSets) {
  return activeSets.reduce((total, set) => total + set.chars.length, 0);
}

function updateStrength({ length, poolSize, setCount, ambiguous }) {
  const entropy = poolSize > 0 ? length * Math.log2(poolSize) : 0;
  const rating = getStrengthRating(entropy);
  const percent = Math.min(100, Math.max(0, Math.round((entropy / 128) * 100)));

  strengthNode.textContent = rating.label;
  strengthNoteNode.textContent = rating.note;
  strengthFillNode.style.width = `${percent}%`;
  strengthFillNode.style.opacity = poolSize > 0 ? "1" : "0.2";
  poolNode.textContent = poolSize.toLocaleString("en-US");
  entropyNode.textContent = `${Math.round(entropy)} bits`;
  setsNode.textContent = setCount.toString();

  poolNoteNode.textContent = ambiguous
    ? "Ambiguous characters are excluded, which makes the pool smaller but easier to read."
    : "Total available characters across all selected sets.";

  entropyNoteNode.textContent = poolSize > 0
    ? `Estimated from ${length} characters and a pool of ${poolSize} possibilities.`
    : "Add at least one character set to calculate entropy.";

  setsNoteNode.textContent = setCount > 0
    ? `The generator locks in ${setCount} selected set${setCount === 1 ? "" : "s"} on every password.`
    : "No sets are currently selected.";
}

function getStrengthRating(entropy) {
  if (entropy >= 100) {
    return {
      label: "Very strong",
      note: "This batch has a broad search space and is suitable for most modern account use.",
    };
  }

  if (entropy >= 80) {
    return {
      label: "Strong",
      note: "Good practical strength for everyday accounts, especially with longer lengths.",
    };
  }

  if (entropy >= 60) {
    return {
      label: "Fair",
      note: "Better than a short password, but bump the length if this protects an important account.",
    };
  }

  return {
    label: "Weak",
    note: "Short or narrow character pools should be lengthened before real use.",
  };
}

function renderPasswords(passwords) {
  if (!passwords.length) {
    renderEmpty("Nothing generated yet.");
    return;
  }

  resultsNode.innerHTML = passwords
    .map((password, index) => `
      <article class="result-card">
        <h3>Password ${index + 1}</h3>
        <p class="result-number mono mono-wrap">${escapeHtml(password)}</p>
        <div class="button-row">
          <button class="button button-secondary" type="button" data-copy-index="${index}">Copy</button>
        </div>
      </article>
    `)
    .join("");

  resultsNode.querySelectorAll("[data-copy-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.copyIndex);
      copyText(currentPasswords[index], `Password ${index + 1}`);
    });
  });
}

function renderEmpty(message) {
  resultsNode.innerHTML = `
    <div class="empty-state">
      <strong class="empty-title">No passwords to show</strong>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

async function copyAllPasswords() {
  if (!currentPasswords.length) {
    setStatus("Generate passwords first before copying them.");
    return;
  }

  await copyText(currentPasswords.join("\n"), "All passwords");
}

async function copyText(text, label) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.setAttribute("readonly", "true");
      temp.style.position = "fixed";
      temp.style.top = "-9999px";
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
    }

    setStatus(`${label} copied to your clipboard.`);
  } catch {
    setStatus("Clipboard copy was blocked by the browser.");
  }
}

function loadSample() {
  lengthInput.value = "18";
  countInput.value = "4";
  lowercaseInput.checked = true;
  uppercaseInput.checked = true;
  numbersInput.checked = true;
  symbolsInput.checked = true;
  ambiguousInput.checked = true;
  generatePasswords();
}

function resetForm() {
  lengthInput.value = "16";
  countInput.value = "6";
  lowercaseInput.checked = true;
  uppercaseInput.checked = true;
  numbersInput.checked = true;
  symbolsInput.checked = true;
  ambiguousInput.checked = false;
  generatePasswords();
}

function setStatus(message) {
  statusNode.textContent = message;
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}
