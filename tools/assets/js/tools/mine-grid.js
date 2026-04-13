import { initCommon } from "../common.js";

initCommon("mine-grid");

const PRESETS = [
  { id: "beginner", title: "Beginner", rows: 9, cols: 9, mines: 10 },
  { id: "standard", title: "Standard", rows: 12, cols: 12, mines: 24 },
  { id: "expert", title: "Expert", rows: 16, cols: 16, mines: 40 },
];

const STORAGE_PREFIX = "aifreelancer.mine-grid.best.";

const board = document.querySelector("#mine-grid-board");
const statusPill = document.querySelector("#status-pill");
const timeValue = document.querySelector("#time-value");
const minesLeftValue = document.querySelector("#mines-left-value");
const bestTimeValue = document.querySelector("#best-time-value");
const safeLeftValue = document.querySelector("#safe-left-value");
const presetSummary = document.querySelector("#preset-summary");
const overlay = document.querySelector("#board-overlay");
const overlayKicker = document.querySelector("#overlay-kicker");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const flagModeButton = document.querySelector("#flag-mode-button");
const restartButton = document.querySelector("#restart-button");
const presetButtons = Array.from(document.querySelectorAll("[data-preset]"));
const recordsList = document.querySelector("#records-list");

const game = {
  presetId: "beginner",
  phase: "ready",
  flagMode: false,
  rows: 9,
  cols: 9,
  mines: 10,
  cells: [],
  revealedCount: 0,
  flags: 0,
  minesPlaced: false,
  timerStart: 0,
  timerMs: 0,
  bestMs: null,
  newBest: false,
  animationFrame: 0,
};

const presetLookup = new Map(PRESETS.map((preset) => [preset.id, preset]));
const bestTimes = new Map();

window.addEventListener("keydown", handleKeyDown);
board.addEventListener("click", handleBoardClick);
board.addEventListener("contextmenu", handleBoardContextMenu);
flagModeButton.addEventListener("click", toggleFlagMode);
restartButton.addEventListener("click", restartCurrentGame);
presetButtons.forEach((button) => {
  button.addEventListener("click", () => setPreset(button.dataset.preset));
});

loadBestTimes();
setPreset(game.presetId, { preserveFlagMode: false });
renderRecords();

function setPreset(presetId, options = {}) {
  const preset = presetLookup.get(presetId) ?? PRESETS[0];
  game.presetId = preset.id;
  game.rows = preset.rows;
  game.cols = preset.cols;
  game.mines = preset.mines;
  game.phase = "ready";
  game.cells = createCells(preset.rows * preset.cols);
  game.revealedCount = 0;
  game.flags = 0;
  game.minesPlaced = false;
  game.timerStart = 0;
  game.timerMs = 0;
  game.bestMs = bestTimes.get(preset.id) ?? null;
  game.newBest = false;

  if (!options.preserveFlagMode) {
    game.flagMode = false;
  }

  stopTimer();
  updatePresetControls();
  renderBoard();
  syncHud();
  syncOverlay();
  renderRecords();
}

function restartCurrentGame() {
  setPreset(game.presetId, { preserveFlagMode: true });
}

function toggleFlagMode() {
  game.flagMode = !game.flagMode;
  syncControls();
  syncOverlay();
}

function handleKeyDown(event) {
  if (event.defaultPrevented) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "1") {
    event.preventDefault();
    setPreset("beginner", { preserveFlagMode: true });
    return;
  }

  if (key === "2") {
    event.preventDefault();
    setPreset("standard", { preserveFlagMode: true });
    return;
  }

  if (key === "3") {
    event.preventDefault();
    setPreset("expert", { preserveFlagMode: true });
    return;
  }

  if (key === "f") {
    event.preventDefault();
    toggleFlagMode();
    return;
  }

  if (key === "r") {
    event.preventDefault();
    restartCurrentGame();
    return;
  }
}

function handleBoardClick(event) {
  const cellButton = event.target.closest("[data-index]");
  if (!cellButton) {
    return;
  }

  const index = Number(cellButton.dataset.index);
  if (!Number.isFinite(index)) {
    return;
  }

  if (game.phase === "won" || game.phase === "lost") {
    return;
  }

  const cell = game.cells[index];
  if (!cell) {
    return;
  }

  if (game.flagMode) {
    toggleFlag(index);
    return;
  }

  if (cell.revealed || cell.flagged) {
    return;
  }

  revealCell(index);
}

function handleBoardContextMenu(event) {
  const cellButton = event.target.closest("[data-index]");
  if (!cellButton) {
    return;
  }

  event.preventDefault();

  if (game.phase === "won" || game.phase === "lost") {
    return;
  }

  const index = Number(cellButton.dataset.index);
  if (Number.isFinite(index)) {
    toggleFlag(index);
  }
}

function createCells(total) {
  return Array.from({ length: total }, () => ({
    mine: false,
    revealed: false,
    flagged: false,
    adjacent: 0,
    exploded: false,
    wrongFlag: false,
  }));
}

function revealCell(index) {
  if (game.phase === "ready") {
    placeMines(index);
    game.phase = "running";
    game.timerStart = performance.now();
    ensureTimer();
    syncOverlay();
  }

  const cell = game.cells[index];
  if (!cell || cell.revealed || cell.flagged) {
    return;
  }

  if (cell.mine) {
    loseGame(index);
    return;
  }

  floodReveal(index);
  if (checkWin()) {
    winGame();
    return;
  }

  renderBoard();
  syncHud();
}

function floodReveal(startIndex) {
  const stack = [startIndex];

  while (stack.length) {
    const index = stack.pop();
    const cell = game.cells[index];
    if (!cell || cell.revealed || cell.flagged) {
      continue;
    }

    cell.revealed = true;
    game.revealedCount += 1;

    if (cell.adjacent === 0) {
      for (const neighbor of getNeighbors(index)) {
        const neighborCell = game.cells[neighbor];
        if (neighborCell && !neighborCell.revealed && !neighborCell.flagged && !neighborCell.mine) {
          stack.push(neighbor);
        }
      }
    }
  }
}

function toggleFlag(index) {
  const cell = game.cells[index];
  if (!cell || cell.revealed || game.phase === "won" || game.phase === "lost") {
    return;
  }

  cell.flagged = !cell.flagged;
  game.flags += cell.flagged ? 1 : -1;
  renderBoard();
  syncHud();
}

function placeMines(openIndex) {
  const safeZone = new Set(getProtectedIndices(openIndex));
  const candidates = [];

  for (let index = 0; index < game.cells.length; index += 1) {
    if (!safeZone.has(index)) {
      candidates.push(index);
    }
  }

  shuffleInPlace(candidates);

  for (let mineIndex = 0; mineIndex < game.mines; mineIndex += 1) {
    game.cells[candidates[mineIndex]].mine = true;
  }

  for (let index = 0; index < game.cells.length; index += 1) {
    if (game.cells[index].mine) {
      continue;
    }
    game.cells[index].adjacent = getNeighbors(index).reduce((count, neighbor) => {
      return count + (game.cells[neighbor]?.mine ? 1 : 0);
    }, 0);
  }

  game.minesPlaced = true;
}

function getProtectedIndices(index) {
  const protectedIndices = new Set([index]);
  for (const neighbor of getNeighbors(index)) {
    protectedIndices.add(neighbor);
  }
  return protectedIndices;
}

function getNeighbors(index) {
  const neighbors = [];
  const row = Math.floor(index / game.cols);
  const col = index % game.cols;

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (!rowOffset && !colOffset) {
        continue;
      }

      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow < 0 || nextCol < 0 || nextRow >= game.rows || nextCol >= game.cols) {
        continue;
      }

      neighbors.push(nextRow * game.cols + nextCol);
    }
  }

  return neighbors;
}

function checkWin() {
  return game.revealedCount === game.cells.length - game.mines;
}

function winGame() {
  game.phase = "won";
  game.timerMs = performance.now() - game.timerStart;
  stopTimer();
  revealAllCells({ victory: true });
  const best = game.bestMs;
  game.newBest = best === null || game.timerMs < best;
  if (game.newBest) {
    bestTimes.set(game.presetId, game.timerMs);
    saveBestTime(game.presetId, game.timerMs);
    game.bestMs = game.timerMs;
  }
  syncOverlay();
  renderBoard();
  syncHud();
  renderRecords();
}

function loseGame(explodedIndex) {
  game.phase = "lost";
  game.timerMs = performance.now() - game.timerStart;
  stopTimer();
  revealAllCells({ victory: false, explodedIndex });
  syncOverlay();
  renderBoard();
  syncHud();
}

function revealAllCells({ victory, explodedIndex }) {
  game.cells.forEach((cell, index) => {
    cell.revealed = true;
    cell.exploded = !victory && index === explodedIndex;
    cell.wrongFlag = !victory && cell.flagged && !cell.mine;
  });

  game.revealedCount = game.cells.length - game.mines;
}

function ensureTimer() {
  if (!game.animationFrame) {
    game.animationFrame = requestAnimationFrame(tick);
  }
}

function stopTimer() {
  if (game.animationFrame) {
    cancelAnimationFrame(game.animationFrame);
    game.animationFrame = 0;
  }
}

function tick(now) {
  if (game.phase === "running") {
    game.timerMs = now - game.timerStart;
    syncHud();
    game.animationFrame = requestAnimationFrame(tick);
    return;
  }

  game.animationFrame = 0;
}

function syncHud() {
  timeValue.textContent = formatTime(game.timerMs);
  minesLeftValue.textContent = String(game.mines - game.flags);
  bestTimeValue.textContent = game.bestMs === null ? "--:--" : formatTime(game.bestMs);
  safeLeftValue.textContent = String(Math.max(game.cells.length - game.revealedCount - game.mines, 0));
  presetSummary.textContent = `${currentPreset().title} board, ${game.cols} x ${game.rows} with ${game.mines} mines`;
  syncControls();
}

function syncControls() {
  flagModeButton.textContent = game.flagMode ? "Flag mode: on" : "Flag mode: off";
  flagModeButton.setAttribute("aria-pressed", String(game.flagMode));
  flagModeButton.classList.toggle("is-active", game.flagMode);

  presetButtons.forEach((button) => {
    const active = button.dataset.preset === game.presetId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  statusPill.className = `status-pill ${statusClassForPhase()}`.trim();
  statusPill.textContent = statusTextForPhase();
}

function updatePresetControls() {
  syncControls();
  renderRecords();
}

function syncOverlay() {
  const hidden = game.phase === "running";
  overlay.classList.toggle("is-hidden", hidden);

  if (game.phase === "running") {
    overlayKicker.textContent = "Grid online";
    overlayTitle.textContent = "Mine Grid";
    overlayCopy.textContent = "The board is open. Scan fast, mark suspicious tiles, and keep your path clean while the timer keeps moving.";
    return;
  }

  if (game.phase === "won") {
    overlayKicker.textContent = "Field cleared";
    overlayTitle.textContent = "Perfect sweep";
    overlayCopy.textContent = `You cleared the board in ${formatTime(game.timerMs)}. ${game.newBest ? "That is a new local best for this preset." : "A clean, local record-worthy run."}`;
    return;
  }

  if (game.phase === "lost") {
    overlayKicker.textContent = "Signal lost";
    overlayTitle.textContent = "Mine detonated";
    overlayCopy.textContent = "You clipped a mine. Restart and tighten the opening route, or switch presets for a different pace.";
    return;
  }

  overlayKicker.textContent = "Retro puzzle";
  overlayTitle.textContent = "Mine Grid";
  overlayCopy.textContent = "Click any tile to begin. The first scan is always safe, so the opening pocket will clear itself and give you room to route.";
}

function renderBoard() {
  board.style.setProperty("--cols", String(game.cols));
  board.style.setProperty("--rows", String(game.rows));
  board.setAttribute("aria-colcount", String(game.cols));
  board.setAttribute("aria-rowcount", String(game.rows));

  board.innerHTML = game.cells
    .map((cell, index) => {
      const classes = ["mine-cell"];
      let label = `Hidden tile row ${Math.floor(index / game.cols) + 1} column ${(index % game.cols) + 1}`;
      let content = "";
      const dataAttrs = [`data-index="${index}"`];

      if (!cell.revealed) {
        classes.push("is-hidden");
        if (cell.flagged) {
          classes.push("is-flagged");
          content = "⚑";
          label = `Flagged tile row ${Math.floor(index / game.cols) + 1} column ${(index % game.cols) + 1}`;
        }
      } else if (cell.mine) {
        classes.push("is-revealed", "is-mine");
        content = cell.exploded ? "✹" : "✶";
        label = cell.exploded
          ? `Triggered mine row ${Math.floor(index / game.cols) + 1} column ${(index % game.cols) + 1}`
          : `Mine row ${Math.floor(index / game.cols) + 1} column ${(index % game.cols) + 1}`;
      } else {
        classes.push("is-revealed");
        if (cell.adjacent === 0) {
          classes.push("is-zero");
          label = `Clear tile row ${Math.floor(index / game.cols) + 1} column ${(index % game.cols) + 1}`;
        } else {
          dataAttrs.push(`data-count="${cell.adjacent}"`);
          content = String(cell.adjacent);
          label = `${cell.adjacent} adjacent mines at row ${Math.floor(index / game.cols) + 1} column ${(index % game.cols) + 1}`;
        }
      }

      if (cell.wrongFlag) {
        classes.push("is-wrong-flag");
        content = "×";
        label = `Incorrect flag row ${Math.floor(index / game.cols) + 1} column ${(index % game.cols) + 1}`;
      }

      return `
        <button
          class="${classes.join(" ")}"
          type="button"
          role="gridcell"
          aria-label="${label}"
          ${dataAttrs.join(" ")}
        >${content}</button>
      `;
    })
    .join("");
}

function renderRecords() {
  recordsList.innerHTML = PRESETS.map((preset) => {
    const currentBest = bestTimes.get(preset.id) ?? null;
    const isActive = preset.id === game.presetId;
    return `
      <article class="record-item ${isActive ? "is-active" : ""}">
        <div>
          <strong class="record-name">${preset.title}</strong>
          <span class="record-meta">${preset.cols} x ${preset.rows} / ${preset.mines} mines</span>
        </div>
        <div class="record-time">${currentBest === null ? "--:--" : formatTime(currentBest)}</div>
      </article>
    `;
  }).join("");
}

function statusTextForPhase() {
  if (game.phase === "running") {
    return game.flagMode ? "Running - flag mode" : "Running";
  }

  if (game.phase === "won") {
    return game.newBest ? "Cleared - new best" : "Cleared";
  }

  if (game.phase === "lost") {
    return "Detonated";
  }

  return game.flagMode ? "Ready - flag mode" : "Ready";
}

function statusClassForPhase() {
  if (game.phase === "running") {
    return "is-running";
  }

  if (game.phase === "won") {
    return "is-won";
  }

  if (game.phase === "lost") {
    return "is-lost";
  }

  return "";
}

function currentPreset() {
  return presetLookup.get(game.presetId) ?? PRESETS[0];
}

function formatTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return "--:--";
  }

  const totalCentiseconds = Math.floor(ms / 10);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function shuffleInPlace(values) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
}

function loadBestTimes() {
  PRESETS.forEach((preset) => {
    bestTimes.set(preset.id, loadBestTime(preset.id));
  });
}

function loadBestTime(presetId) {
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${presetId}`);
    if (raw === null) {
      return null;
    }

    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  } catch {
    return null;
  }
}

function saveBestTime(presetId, value) {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${presetId}`, String(Math.floor(value)));
  } catch {
    // Ignore storage failures and keep the in-memory record.
  }
}
