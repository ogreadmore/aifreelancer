import { formatNumber, initCommon } from "../common.js";

initCommon("word-sprint");

const STORAGE_KEY = "aifreelancer.word-sprint.stats";
const ROWS = 6;
const COLS = 5;
const KEY_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
];

const WORDS = [
  "BRAVE", "CLEAR", "CLOUD", "FRAME", "GLIDE", "GRAIN", "HEART", "LIGHT", "MARCH", "MIRTH",
  "NOBLE", "OCEAN", "PEARL", "PLANT", "PRISM", "QUEST", "RALLY", "RIVER", "ROUTE", "SHINE",
  "SOLAR", "SPARK", "SPRIG", "STONE", "STORY", "SWEEP", "TRAIL", "VIVID", "WATER", "WOVEN",
  "ALIGN", "BLOOM", "CRANE", "DREAM", "EMBER", "FABLE", "GRACE", "HOUSE", "IDEAL", "JOLLY",
  "KNACK", "LEMON", "MANGO", "NURSE", "OPERA", "PULSE", "QUIET", "ROBIN", "SCOUT", "THRUM",
];

const VALID_WORDS = new Set(WORDS);

const gridNode = document.querySelector("#word-sprint-grid");
const keyboardNode = document.querySelector("#word-sprint-keyboard");
const statusNode = document.querySelector("#word-sprint-status");
const playedNode = document.querySelector("#word-sprint-played");
const winsNode = document.querySelector("#word-sprint-wins");
const streakNode = document.querySelector("#word-sprint-streak");
const bestStreakNode = document.querySelector("#word-sprint-best-streak");
const lastSolvedNode = document.querySelector("#word-sprint-last-solved");
const modeLabelNode = document.querySelector("#word-sprint-mode-label");
const dailyButton = document.querySelector("#word-sprint-mode-daily");
const unlimitedButton = document.querySelector("#word-sprint-mode-unlimited");
const newRoundButton = document.querySelector("#word-sprint-new-round");
const revealButton = document.querySelector("#word-sprint-reveal");

const stats = loadStats();
const state = {
  mode: "daily",
  answer: "",
  guesses: Array.from({ length: ROWS }, () => ""),
  evaluations: Array.from({ length: ROWS }, () => null),
  rowIndex: 0,
  complete: false,
  revealed: false,
};

buildKeyboard();
bindEvents();
startRound(true);

function bindEvents() {
  dailyButton.addEventListener("click", () => switchMode("daily"));
  unlimitedButton.addEventListener("click", () => switchMode("unlimited"));
  newRoundButton.addEventListener("click", () => startRound(true));
  revealButton.addEventListener("click", revealAnswer);
  document.addEventListener("keydown", handleKeydown);
}

function switchMode(mode) {
  if (state.mode === mode) {
    return;
  }

  state.mode = mode;
  dailyButton.classList.toggle("is-active", mode === "daily");
  unlimitedButton.classList.toggle("is-active", mode === "unlimited");
  dailyButton.setAttribute("aria-selected", String(mode === "daily"));
  unlimitedButton.setAttribute("aria-selected", String(mode === "unlimited"));
  modeLabelNode.textContent = mode === "daily" ? "Daily" : "Unlimited";
  startRound(true);
}

function startRound(resetMessage) {
  state.answer = pickAnswer();
  state.guesses = Array.from({ length: ROWS }, () => "");
  state.evaluations = Array.from({ length: ROWS }, () => null);
  state.rowIndex = 0;
  state.complete = false;
  state.revealed = false;

  renderGrid();
  renderKeyboard();

  if (resetMessage) {
    setStatus(state.mode === "daily" ? "The daily puzzle is ready." : "Unlimited mode is ready. Take as many rounds as you want.");
  }
}

function pickAnswer() {
  if (state.mode === "daily") {
    const now = new Date();
    const dayNumber = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
    return WORDS[dayNumber % WORDS.length];
  }

  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function handleKeydown(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  const key = event.key.toUpperCase();

  if (key === "ENTER") {
    event.preventDefault();
    submitGuess();
    return;
  }

  if (key === "BACKSPACE") {
    event.preventDefault();
    removeLetter();
    return;
  }

  if (/^[A-Z]$/.test(key)) {
    event.preventDefault();
    addLetter(key);
  }
}

function buildKeyboard() {
  keyboardNode.innerHTML = "";

  for (const row of KEY_ROWS) {
    const rowNode = document.createElement("div");
    rowNode.className = "word-key-row";

    row.forEach((label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "word-key";
      button.textContent = label === "BACK" ? "Back" : label;
      button.dataset.key = label;
      if (label === "ENTER" || label === "BACK") {
        button.dataset.size = "wide";
      }
      button.addEventListener("click", () => {
        if (label === "ENTER") {
          submitGuess();
        } else if (label === "BACK") {
          removeLetter();
        } else {
          addLetter(label);
        }
      });
      rowNode.append(button);
    });

    keyboardNode.append(rowNode);
  }
}

function addLetter(letter) {
  if (state.complete) {
    return;
  }

  const current = state.guesses[state.rowIndex];
  if (current.length >= COLS) {
    return;
  }

  state.guesses[state.rowIndex] = current + letter;
  renderGrid();
}

function removeLetter() {
  if (state.complete) {
    return;
  }

  const current = state.guesses[state.rowIndex];
  state.guesses[state.rowIndex] = current.slice(0, -1);
  renderGrid();
}

function submitGuess() {
  if (state.complete) {
    return;
  }

  const guess = state.guesses[state.rowIndex];

  if (guess.length !== COLS) {
    setStatus("Finish the five-letter word before submitting.");
    return;
  }

  if (!VALID_WORDS.has(guess)) {
    setStatus("That word is not in the built-in list.");
    return;
  }

  const evaluation = evaluateGuess(guess, state.answer);
  state.evaluations[state.rowIndex] = evaluation;

  if (guess === state.answer) {
    state.complete = true;
    recordWin(state.rowIndex + 1);
    renderGrid();
    renderKeyboard();
    setStatus(`Solved in ${state.rowIndex + 1} ${state.rowIndex === 0 ? "guess" : "guesses"}.`);
    return;
  }

  state.rowIndex += 1;

  if (state.rowIndex >= ROWS) {
    state.complete = true;
    recordLoss();
    renderGrid();
    renderKeyboard();
    setStatus(`Out of guesses. The word was ${state.answer}.`);
    return;
  }

  renderGrid();
  renderKeyboard();
  setStatus(`${ROWS - state.rowIndex} guesses remaining.`);
}

function evaluateGuess(guess, answer) {
  const result = Array(COLS).fill("miss");
  const answerLetters = answer.split("");
  const guessLetters = guess.split("");

  guessLetters.forEach((letter, index) => {
    if (answerLetters[index] === letter) {
      result[index] = "correct";
      answerLetters[index] = null;
      guessLetters[index] = null;
    }
  });

  guessLetters.forEach((letter, index) => {
    if (!letter) {
      return;
    }
    const matchIndex = answerLetters.indexOf(letter);
    if (matchIndex !== -1) {
      result[index] = "present";
      answerLetters[matchIndex] = null;
    }
  });

  return result;
}

function revealAnswer() {
  if (state.complete) {
    setStatus(`The answer is ${state.answer}. Start a new round when you want another one.`);
    return;
  }

  state.complete = true;
  state.revealed = true;
  recordLoss();
  renderGrid();
  renderKeyboard();
  setStatus(`Round revealed. The answer was ${state.answer}.`);
}

function renderGrid() {
  gridNode.innerHTML = "";

  for (let rowIndex = 0; rowIndex < ROWS; rowIndex += 1) {
    const rowNode = document.createElement("div");
    rowNode.className = "word-row";

    const letters = state.guesses[rowIndex].split("");
    const evaluation = state.evaluations[rowIndex];

    for (let colIndex = 0; colIndex < COLS; colIndex += 1) {
      const cell = document.createElement("div");
      cell.className = "word-cell";

      const letter = letters[colIndex] || "";
      cell.textContent = letter;

      if (letter) {
        cell.classList.add("is-filled");
      }

      if (evaluation?.[colIndex]) {
        cell.classList.add(`is-${evaluation[colIndex]}`);
      }

      rowNode.append(cell);
    }

    gridNode.append(rowNode);
  }
}

function renderKeyboard() {
  const priority = { miss: 1, present: 2, correct: 3 };
  const statuses = new Map();

  state.evaluations.forEach((evaluation, rowIndex) => {
    if (!evaluation) {
      return;
    }

    const guess = state.guesses[rowIndex];
    guess.split("").forEach((letter, letterIndex) => {
      const status = evaluation[letterIndex];
      const current = statuses.get(letter);
      if (!current || priority[status] > priority[current]) {
        statuses.set(letter, status);
      }
    });
  });

  keyboardNode.querySelectorAll(".word-key").forEach((button) => {
    button.classList.remove("is-correct", "is-present", "is-miss");
    const key = button.dataset.key;
    if (key.length !== 1) {
      return;
    }
    const status = statuses.get(key);
    if (status) {
      button.classList.add(`is-${status}`);
    }
  });

  syncStats();
}

function recordWin(guessesUsed) {
  stats.played += 1;
  stats.wins += 1;
  stats.streak += 1;
  stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
  stats.lastSolved = String(guessesUsed);
  saveStats();
}

function recordLoss() {
  stats.played += 1;
  stats.streak = 0;
  stats.lastSolved = "-";
  saveStats();
}

function syncStats() {
  playedNode.textContent = formatNumber(stats.played);
  winsNode.textContent = formatNumber(stats.wins);
  streakNode.textContent = formatNumber(stats.streak);
  bestStreakNode.textContent = formatNumber(stats.bestStreak);
  lastSolvedNode.textContent = stats.lastSolved;
}

function setStatus(message) {
  statusNode.textContent = message;
}

function loadStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      played: Number(raw.played) || 0,
      wins: Number(raw.wins) || 0,
      streak: Number(raw.streak) || 0,
      bestStreak: Number(raw.bestStreak) || 0,
      lastSolved: typeof raw.lastSolved === "string" ? raw.lastSolved : "-",
    };
  } catch {
    return { played: 0, wins: 0, streak: 0, bestStreak: 0, lastSolved: "-" };
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  syncStats();
}
