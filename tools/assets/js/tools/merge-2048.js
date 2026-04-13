import { formatNumber, initCommon } from "../common.js";

initCommon("merge-2048");

const SIZE = 4;
const STORAGE_KEY = "aifreelancer.merge-2048.best";
const GAP = 10;

const boardNode = document.querySelector("#merge-2048-board");
const tileLayer = document.querySelector("#merge-2048-tile-layer");
const scoreNode = document.querySelector("#merge-2048-score");
const bestNode = document.querySelector("#merge-2048-best");
const topTileNode = document.querySelector("#merge-2048-top-tile");
const movesNode = document.querySelector("#merge-2048-moves");
const statusNode = document.querySelector("#merge-2048-status");
const overlay = document.querySelector("#merge-2048-overlay");
const overlayTitle = document.querySelector("#merge-2048-overlay-title");
const overlayCopy = document.querySelector("#merge-2048-overlay-copy");
const overlayAction = document.querySelector("#merge-2048-overlay-action");
const newGameButton = document.querySelector("#merge-2048-new-game");
const keepGoingButton = document.querySelector("#merge-2048-keep-going");

const state = {
  grid: createEmptyGrid(),
  score: 0,
  best: loadBest(),
  moves: 0,
  won: false,
  over: false,
  keepGoing: false,
  pendingClasses: new Map(),
  touchStart: null,
};

overlayAction.addEventListener("click", hideOverlay);
newGameButton.addEventListener("click", resetGame);
keepGoingButton.addEventListener("click", () => {
  state.keepGoing = true;
  keepGoingButton.hidden = true;
  hideOverlay();
  setStatus("Keep going. The run is still alive.");
});

document.addEventListener("keydown", handleKeyDown);
boardNode.addEventListener("pointerdown", handlePointerDown);
boardNode.addEventListener("pointerup", handlePointerUp);
boardNode.addEventListener("pointercancel", clearTouchStart);
boardNode.addEventListener("pointerleave", clearTouchStart);
window.addEventListener("resize", render);

resetGame();

function resetGame() {
  state.grid = createEmptyGrid();
  state.score = 0;
  state.moves = 0;
  state.won = false;
  state.over = false;
  state.keepGoing = false;
  state.pendingClasses = new Map();

  addRandomTile();
  addRandomTile();
  keepGoingButton.hidden = true;
  showOverlay("Ready to merge?", "Use arrow keys or swipe anywhere on the board to start shaping the run.", "Start playing");
  syncHud();
  render();
  setStatus("Fresh board. Build slowly and keep your corner stable.");
}

function handleKeyDown(event) {
  const directions = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };

  if (event.key === "n" || event.key === "N") {
    event.preventDefault();
    resetGame();
    return;
  }

  if (event.key === "Enter" && !overlay.hidden) {
    event.preventDefault();
    hideOverlay();
    return;
  }

  const direction = directions[event.key];
  if (!direction) {
    return;
  }

  event.preventDefault();
  hideOverlay();

  if (state.over) {
    setStatus("That run is over. Start a new board to keep playing.");
    return;
  }

  performMove(direction);
}

function handlePointerDown(event) {
  state.touchStart = { x: event.clientX, y: event.clientY };
}

function handlePointerUp(event) {
  if (!state.touchStart) {
    return;
  }

  const dx = event.clientX - state.touchStart.x;
  const dy = event.clientY - state.touchStart.y;
  clearTouchStart();

  if (Math.hypot(dx, dy) < 24) {
    return;
  }

  hideOverlay();

  if (Math.abs(dx) > Math.abs(dy)) {
    performMove(dx > 0 ? "right" : "left");
  } else {
    performMove(dy > 0 ? "down" : "up");
  }
}

function clearTouchStart() {
  state.touchStart = null;
}

function performMove(direction) {
  if (state.over) {
    return;
  }

  state.pendingClasses = new Map();

  const lines = buildLines(direction);
  let changed = false;

  for (const line of lines) {
    const values = line.map(({ row, col }) => state.grid[row][col]);
    const collapsed = collapse(values);
    collapsed.values.forEach((value, index) => {
      const { row, col } = line[index];
      if (state.grid[row][col] !== value) {
        changed = true;
      }
      state.grid[row][col] = value;
    });
  }

  if (!changed) {
    setStatus("No merge there. Try preserving one clean corner.");
    render();
    return;
  }

  addRandomTile();
  state.moves += 1;
  state.best = Math.max(state.best, state.score);
  saveBest(state.best);

  if (!state.won && getTopTile() >= 2048) {
    state.won = true;
    keepGoingButton.hidden = false;
    showOverlay("2048 reached", "You hit the milestone. Claim the win or press keep going to chase a bigger board.", "Continue");
  } else if (!canMove()) {
    state.over = true;
    showOverlay("Board locked", "No moves left. Start a new game and take another shot.", "Review board");
  }

  syncHud();
  render();
  setStatus(getStatusMessage(direction));
}

function collapse(values) {
  const compact = values.filter(Boolean);
  const merged = [];

  for (let index = 0; index < compact.length; index += 1) {
    const current = compact[index];
    const next = compact[index + 1];

    if (next && current === next) {
      const mergedValue = current * 2;
      merged.push(mergedValue);
      state.score += mergedValue;
      state.pendingClasses.set(merged.length - 1, "is-merged");
      index += 1;
    } else {
      merged.push(current);
    }
  }

  while (merged.length < SIZE) {
    merged.push(0);
  }

  return { values: merged };
}

function buildLines(direction) {
  const lines = [];

  if (direction === "left" || direction === "right") {
    for (let row = 0; row < SIZE; row += 1) {
      const line = [];
      for (let col = 0; col < SIZE; col += 1) {
        line.push({ row, col: direction === "left" ? col : SIZE - 1 - col });
      }
      lines.push(line);
    }
  } else {
    for (let col = 0; col < SIZE; col += 1) {
      const line = [];
      for (let row = 0; row < SIZE; row += 1) {
        line.push({ row: direction === "up" ? row : SIZE - 1 - row, col });
      }
      lines.push(line);
    }
  }

  return lines;
}

function addRandomTile() {
  const open = [];

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (!state.grid[row][col]) {
        open.push({ row, col });
      }
    }
  }

  if (!open.length) {
    return;
  }

  const slot = open[Math.floor(Math.random() * open.length)];
  state.grid[slot.row][slot.col] = Math.random() < 0.9 ? 2 : 4;
}

function canMove() {
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const value = state.grid[row][col];
      if (!value) {
        return true;
      }
      if (col + 1 < SIZE && state.grid[row][col + 1] === value) {
        return true;
      }
      if (row + 1 < SIZE && state.grid[row + 1][col] === value) {
        return true;
      }
    }
  }

  return false;
}

function render() {
  const bounds = boardNode.getBoundingClientRect();
  const tileSize = (bounds.width - GAP * (SIZE - 1) - 20) / SIZE;

  tileLayer.innerHTML = "";

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const value = state.grid[row][col];
      if (!value) {
        continue;
      }

      const tile = document.createElement("div");
      tile.className = "merge-tile";
      tile.textContent = String(value);
      tile.style.width = `${tileSize}px`;
      tile.style.height = `${tileSize}px`;
      tile.style.left = `${col * (tileSize + GAP)}px`;
      tile.style.top = `${row * (tileSize + GAP)}px`;
      tile.style.fontSize = `${Math.max(1.1, 2.1 - String(value).length * 0.18)}rem`;

      const visual = getTileVisual(value);
      tile.style.background = visual.background;
      tile.style.color = visual.color;

      if (state.pendingClasses.get(col) === "is-merged") {
        tile.classList.add("is-merged");
      } else if (value <= 4) {
        tile.classList.add("is-new");
      }

      tileLayer.append(tile);
    }
  }

  syncHud();
}

function syncHud() {
  scoreNode.textContent = formatNumber(state.score);
  bestNode.textContent = formatNumber(state.best);
  topTileNode.textContent = formatNumber(getTopTile());
  movesNode.textContent = formatNumber(state.moves);
}

function getTopTile() {
  return Math.max(...state.grid.flat().filter(Boolean), 2);
}

function showOverlay(title, copy, actionLabel) {
  overlay.hidden = false;
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  overlayAction.textContent = actionLabel;
}

function hideOverlay() {
  overlay.hidden = true;
}

function setStatus(message) {
  statusNode.textContent = message;
}

function getStatusMessage(direction) {
  const messages = {
    up: "Board moved up. Keep the stack disciplined.",
    down: "Board moved down. Make sure you gained something for it.",
    left: "Board moved left. Good if your anchor lives there.",
    right: "Board moved right. Watch for clutter in the center.",
  };
  return messages[direction];
}

function getTileVisual(value) {
  const palette = {
    2: { background: "#fdf1e3", color: "#5f4a38" },
    4: { background: "#f9e3c7", color: "#5e4431" },
    8: { background: "linear-gradient(135deg, #f9bf70, #f4a24d)", color: "#fff" },
    16: { background: "linear-gradient(135deg, #f79f63, #ef7c4d)", color: "#fff" },
    32: { background: "linear-gradient(135deg, #f98379, #ef6461)", color: "#fff" },
    64: { background: "linear-gradient(135deg, #ee6b83, #d95c9f)", color: "#fff" },
    128: { background: "linear-gradient(135deg, #78b9ff, #609dff)", color: "#fff" },
    256: { background: "linear-gradient(135deg, #65cfff, #4caaf5)", color: "#fff" },
    512: { background: "linear-gradient(135deg, #66dcbf, #43bb9c)", color: "#fff" },
    1024: { background: "linear-gradient(135deg, #3d2f4f, #5e4c7f)", color: "#fff" },
    2048: { background: "linear-gradient(135deg, #1d1b2f, #40304e)", color: "#fff" },
  };

  return palette[value] || { background: "linear-gradient(135deg, #101828, #2f3f56)", color: "#fff" };
}

function createEmptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function loadBest() {
  const raw = Number(localStorage.getItem(STORAGE_KEY) || 0);
  return Number.isFinite(raw) ? raw : 0;
}

function saveBest(value) {
  localStorage.setItem(STORAGE_KEY, String(value));
}
