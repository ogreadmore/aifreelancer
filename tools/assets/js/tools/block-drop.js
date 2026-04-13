import { formatNumber, initCommon } from "../common.js";

initCommon("block-drop");

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const PREVIEW_BOUNDS = 4;
const HOLD_LOCK_MS = 500;
const CLEAR_FLASH_MS = 180;
const STORAGE_KEY = "aifreelancer.block-drop.best-score";
const BUMP_POINTS = [0, 100, 300, 500, 800];

const PIECES = buildPieces();
const pieceTypes = Object.keys(PIECES);

const boardCanvas = document.querySelector("#block-drop-board");
const nextCanvas = document.querySelector("#block-drop-next");
const holdCanvas = document.querySelector("#block-drop-hold");
const mainActionButton = document.querySelector("#block-drop-main-action");
const restartButton = document.querySelector("#block-drop-restart");
const statusNode = document.querySelector("#block-drop-status");
const overlay = document.querySelector("#block-drop-overlay");
const overlayTitle = document.querySelector("#block-drop-overlay-title");
const overlayCopy = document.querySelector("#block-drop-overlay-copy");
const scoreNode = document.querySelector("#block-drop-score");
const bestNode = document.querySelector("#block-drop-best");
const levelNode = document.querySelector("#block-drop-level");
const linesNode = document.querySelector("#block-drop-lines");
const holdNoteNode = document.querySelector("#block-drop-hold-note");
const touchButtons = Array.from(document.querySelectorAll("[data-block-drop-action]"));

const boardContext = boardCanvas.getContext("2d");
const nextContext = nextCanvas.getContext("2d");
const holdContext = holdCanvas.getContext("2d");

const state = {
  board: createBoard(),
  bag: [],
  queue: [],
  current: null,
  holdType: null,
  canHold: true,
  score: 0,
  best: loadBestScore(),
  lines: 0,
  level: 1,
  mode: "paused",
  hasStarted: false,
  softDropActive: false,
  gravityAccumulator: 0,
  lastFrameTime: 0,
  lockDeadline: 0,
  flashUntil: 0,
  message: "Press Start or Enter to begin.",
};

mainActionButton.addEventListener("click", handleMainAction);
restartButton.addEventListener("click", restartGame);
touchButtons.forEach((button) => {
  button.addEventListener("click", () => handleTouchAction(button.dataset.blockDropAction));
});

document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);
document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("blur", handleBlur);
window.addEventListener("resize", resizeCanvases);

initializeGame();
requestAnimationFrame(tick);

function initializeGame() {
  rebuildGameState(false);
  resizeCanvases();
  renderAll(performance.now());
}

function rebuildGameState(runImmediately) {
  state.board = createBoard();
  state.bag = [];
  state.queue = [];
  refillQueue();
  state.current = spawnCurrentPiece();
  state.holdType = null;
  state.canHold = true;
  state.score = 0;
  state.lines = 0;
  state.level = 1;
  state.mode = runImmediately ? "running" : "paused";
  state.hasStarted = runImmediately;
  state.softDropActive = false;
  state.gravityAccumulator = 0;
  state.lastFrameTime = performance.now();
  state.lockDeadline = 0;
  state.flashUntil = 0;
  state.message = runImmediately ? "Stack clean rows and keep the field low." : "Press Start or Enter to begin.";

  if (!isValidPlacement(state.current, state.current.x, state.current.y, state.current.rotation)) {
    triggerGameOver();
  }

  syncHUD();
}

function handleMainAction() {
  if (state.mode === "running") {
    pauseGame();
    return;
  }

  if (state.mode === "gameover") {
    restartGame();
    return;
  }

  resumeGame();
}

function restartGame() {
  rebuildGameState(true);
  syncHUD();
  renderAll(performance.now());
}

function resumeGame() {
  if (state.mode === "gameover") {
    restartGame();
    return;
  }

  state.mode = "running";
  state.hasStarted = true;
  state.lastFrameTime = performance.now();
  state.message = "Game on. Stack carefully.";
  syncHUD();
  renderAll(performance.now());
}

function pauseGame() {
  if (state.mode !== "running") {
    return;
  }

  state.mode = "paused";
  state.message = "Paused. Press Start or Enter to continue.";
  state.softDropActive = false;
  state.lockDeadline = 0;
  state.lastFrameTime = performance.now();
  syncHUD();
  renderAll(performance.now());
}

function triggerGameOver() {
  state.mode = "gameover";
  state.softDropActive = false;
  state.lockDeadline = 0;
  state.hasStarted = true;
  state.message = "Stack overflow. Press Restart or Enter for a new run.";
  syncBestScore();
  syncHUD();
  renderAll(performance.now());
}

function handleVisibilityChange() {
  if (document.hidden && state.mode === "running") {
    pauseGame();
  }
}

function handleBlur() {
  if (state.mode === "running") {
    pauseGame();
  }
}

function handleKeyDown(event) {
  const key = event.code;
  const handledKeys = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowDown",
    "ArrowUp",
    "KeyX",
    "KeyZ",
    "Space",
    "ShiftLeft",
    "ShiftRight",
    "KeyC",
    "KeyP",
    "Escape",
    "Enter",
  ]);

  if (!handledKeys.has(key)) {
    return;
  }

  event.preventDefault();

  if (key === "KeyP" || key === "Escape") {
    if (state.mode === "running") {
      pauseGame();
    } else if (state.mode === "paused") {
      resumeGame();
    } else {
      restartGame();
    }
    return;
  }

  if (key === "Enter") {
    if (state.mode === "gameover") {
      restartGame();
    } else if (state.mode !== "running") {
      resumeGame();
    }
    return;
  }

  if (state.mode !== "running") {
    state.message = "Press Start or Enter to begin.";
    syncHUD();
    return;
  }

  switch (key) {
    case "ArrowLeft":
      moveCurrent(-1, 0);
      break;
    case "ArrowRight":
      moveCurrent(1, 0);
      break;
    case "ArrowDown":
      state.softDropActive = true;
      softDropStep();
      break;
    case "ArrowUp":
    case "KeyX":
      rotateCurrent(1);
      break;
    case "KeyZ":
      rotateCurrent(-1);
      break;
    case "Space":
      hardDrop();
      break;
    case "ShiftLeft":
    case "ShiftRight":
    case "KeyC":
      holdCurrentPiece();
      break;
    default:
      break;
  }

  renderAll(performance.now());
}

function handleKeyUp(event) {
  if (event.code === "ArrowDown") {
    state.softDropActive = false;
  }
}

function handleTouchAction(action) {
  if (!action) {
    return;
  }

  if (action === "pause") {
    if (state.mode === "running") {
      pauseGame();
    } else {
      resumeGame();
    }
    return;
  }

  if (state.mode !== "running") {
    state.message = "Press Start or Enter to begin.";
    syncHUD();
    renderAll(performance.now());
    return;
  }

  switch (action) {
    case "left":
      moveCurrent(-1, 0);
      break;
    case "right":
      moveCurrent(1, 0);
      break;
    case "down":
      softDropStep();
      break;
    case "rotate-cw":
      rotateCurrent(1);
      break;
    case "rotate-ccw":
      rotateCurrent(-1);
      break;
    case "drop":
      hardDrop();
      break;
    case "hold":
      holdCurrentPiece();
      break;
    default:
      break;
  }

  renderAll(performance.now());
}

function tick(now) {
  const delta = Math.min(now - state.lastFrameTime, 80);
  state.lastFrameTime = now;

  if (state.mode === "running") {
    const interval = state.softDropActive ? Math.max(45, getDropInterval(state.level) * 0.1) : getDropInterval(state.level);
    state.gravityAccumulator += delta;

    while (state.gravityAccumulator >= interval && state.mode === "running") {
      state.gravityAccumulator -= interval;
      const moved = moveCurrent(0, 1, { manual: false, awardSoftDrop: state.softDropActive });
      if (!moved) {
        if (!state.lockDeadline) {
          state.lockDeadline = now + HOLD_LOCK_MS;
        }
        break;
      }
    }

    if (state.lockDeadline && now >= state.lockDeadline && state.mode === "running") {
      lockCurrentPiece(now);
    }
  } else {
    state.gravityAccumulator = 0;
  }

  renderAll(now);
  requestAnimationFrame(tick);
}

function moveCurrent(deltaX, deltaY, options = {}) {
  if (!state.current || state.mode !== "running") {
    return false;
  }

  const nextX = state.current.x + deltaX;
  const nextY = state.current.y + deltaY;
  if (!isValidPlacement(state.current, nextX, nextY, state.current.rotation)) {
    if (deltaY > 0) {
      if (!state.lockDeadline) {
        state.lockDeadline = performance.now() + HOLD_LOCK_MS;
      }
    }
    return false;
  }

  state.current.x = nextX;
  state.current.y = nextY;
  state.lockDeadline = 0;

  if (options.awardSoftDrop) {
    addScore(1);
  }

  return true;
}

function rotateCurrent(direction) {
  if (!state.current || state.mode !== "running") {
    return false;
  }

  const nextRotation = wrapRotation(state.current.rotation + direction);
  const kicks = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [-2, 0],
    [2, 0],
    [0, 1],
    [0, -2],
  ];

  for (const [kickX, kickY] of kicks) {
    const nextX = state.current.x + kickX;
    const nextY = state.current.y + kickY;
    if (isValidPlacement(state.current, nextX, nextY, nextRotation)) {
      state.current.x = nextX;
      state.current.y = nextY;
      state.current.rotation = nextRotation;
      state.lockDeadline = 0;
      return true;
    }
  }

  return false;
}

function softDropStep() {
  if (state.mode !== "running") {
    return false;
  }

  const moved = moveCurrent(0, 1, { manual: true, awardSoftDrop: true });
  if (!moved && !state.lockDeadline) {
    state.lockDeadline = performance.now() + HOLD_LOCK_MS;
  }

  return moved;
}

function hardDrop() {
  if (!state.current || state.mode !== "running") {
    return;
  }

  let distance = 0;
  while (moveCurrent(0, 1, { manual: true, awardSoftDrop: false })) {
    distance += 1;
  }

  if (distance > 0) {
    addScore(distance * 2);
    state.message = `Hard drop: ${distance} rows.`;
  } else {
    state.message = "Piece locked in place.";
  }

  lockCurrentPiece(performance.now());
}

function holdCurrentPiece() {
  if (!state.current || state.mode !== "running" || !state.canHold) {
    return;
  }

  const activeType = state.current.type;
  const hadHold = Boolean(state.holdType);
  if (state.holdType) {
    const swapType = state.holdType;
    state.holdType = activeType;
    state.current = createPiece(swapType);
  } else {
    state.holdType = activeType;
    state.current = spawnCurrentPiece();
  }

  state.canHold = false;
  state.lockDeadline = 0;
  state.gravityAccumulator = 0;
  state.message = hadHold ? "Hold swap complete." : "Piece held for later.";

  if (!isValidPlacement(state.current, state.current.x, state.current.y, state.current.rotation)) {
    triggerGameOver();
  }
}

function lockCurrentPiece(now) {
  if (!state.current || state.mode !== "running") {
    return;
  }

  const matrix = PIECES[state.current.type].rotations[state.current.rotation];
  let overflow = false;

  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (!matrix[row][col]) {
        continue;
      }

      const boardX = state.current.x + col;
      const boardY = state.current.y + row;
      if (boardY < 0) {
        overflow = true;
        continue;
      }

      if (boardY >= BOARD_HEIGHT || boardX < 0 || boardX >= BOARD_WIDTH) {
        overflow = true;
        continue;
      }

      state.board[boardY][boardX] = state.current.type;
    }
  }

  if (overflow) {
    triggerGameOver();
    return;
  }

  const clearedRows = clearCompleteLines();
  if (clearedRows > 0) {
    addScore(BUMP_POINTS[clearedRows] * state.level);
    state.lines += clearedRows;
    const previousLevel = state.level;
    state.level = Math.max(1, Math.floor(state.lines / 10) + 1);
    state.flashUntil = now + CLEAR_FLASH_MS;
    state.message = describeClear(clearedRows, previousLevel !== state.level);
  } else {
    state.message = "Piece locked. Keep building.";
  }

  state.current = spawnCurrentPiece();
  state.canHold = true;
  state.gravityAccumulator = 0;
  state.lockDeadline = 0;

  if (!isValidPlacement(state.current, state.current.x, state.current.y, state.current.rotation)) {
    triggerGameOver();
    return;
  }

  syncHUD();
}

function describeClear(count, leveledUp) {
  const label = count === 1 ? "Single" : count === 2 ? "Double" : count === 3 ? "Triple" : "Quad";
  return leveledUp ? `${label} clear. Level up!` : `${label} clear.`;
}

function addScore(points) {
  if (!points) {
    return;
  }

  state.score += points;
  if (state.score > state.best) {
    state.best = state.score;
    saveBestScore(state.best);
  }
  syncBestScore();
}

function clearCompleteLines() {
  const nextBoard = [];
  let cleared = 0;

  for (let row = 0; row < BOARD_HEIGHT; row += 1) {
    if (state.board[row].every(Boolean)) {
      cleared += 1;
      continue;
    }

    nextBoard.push(state.board[row]);
  }

  while (nextBoard.length < BOARD_HEIGHT) {
    nextBoard.unshift(createEmptyRow());
  }

  state.board = nextBoard;
  return cleared;
}

function spawnCurrentPiece() {
  refillQueue();
  const type = state.queue.shift();
  refillQueue();
  return createPiece(type);
}

function createPiece(type) {
  return {
    type,
    rotation: 0,
    x: 3,
    y: -1,
  };
}

function refillQueue() {
  while (state.queue.length < 5) {
    state.queue.push(drawFromBag());
  }
}

function drawFromBag() {
  if (!state.bag.length) {
    state.bag = shuffle(pieceTypes);
  }

  return state.bag.pop();
}

function shuffle(values) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function createBoard() {
  return Array.from({ length: BOARD_HEIGHT }, createEmptyRow);
}

function createEmptyRow() {
  return Array.from({ length: BOARD_WIDTH }, () => null);
}

function isValidPlacement(piece, nextX, nextY, rotation) {
  if (!piece) {
    return false;
  }

  const matrix = PIECES[piece.type].rotations[wrapRotation(rotation)];
  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (!matrix[row][col]) {
        continue;
      }

      const boardX = nextX + col;
      const boardY = nextY + row;

      if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
        return false;
      }

      if (boardY >= 0 && state.board[boardY][boardX]) {
        return false;
      }
    }
  }

  return true;
}

function wrapRotation(rotation) {
  return (rotation + 4) % 4;
}

function getDropInterval(level) {
  return Math.max(90, 760 - (level - 1) * 58);
}

function renderAll(now) {
  syncHUD();
  renderBoard(now);
  renderMiniPiece(nextContext, state.queue[0], nextCanvas, "Next");
  renderMiniPiece(holdContext, state.holdType, holdCanvas, state.canHold ? "Hold" : "Locked");
}

function syncHUD() {
  scoreNode.textContent = formatNumber(state.score, { maximumFractionDigits: 0 });
  bestNode.textContent = formatNumber(state.best, { maximumFractionDigits: 0 });
  levelNode.textContent = formatNumber(state.level, { maximumFractionDigits: 0 });
  linesNode.textContent = formatNumber(state.lines, { maximumFractionDigits: 0 });

  if (state.mode === "running") {
    mainActionButton.textContent = "Pause";
    overlayTitle.textContent = "Playing";
    overlayCopy.textContent = state.message;
    overlay.hidden = true;
  } else if (state.mode === "paused") {
    mainActionButton.textContent = state.hasStarted ? "Resume" : "Start";
    overlayTitle.textContent = state.hasStarted ? "Paused" : "Ready";
    overlayCopy.textContent = state.message;
    overlay.hidden = false;
  } else {
    mainActionButton.textContent = "New game";
    overlayTitle.textContent = "Game Over";
    overlayCopy.textContent = state.message;
    overlay.hidden = false;
  }

  statusNode.textContent = state.message;
  holdNoteNode.textContent = state.canHold
    ? "Hold is ready. Use it to stash a bad draw."
    : "Hold is locked until the current piece lands.";
}

function syncBestScore() {
  if (state.score > state.best) {
    state.best = state.score;
    saveBestScore(state.best);
  }
  bestNode.textContent = formatNumber(state.best, { maximumFractionDigits: 0 });
}

function renderBoard(now) {
  if (!boardContext || !boardCanvas.width || !boardCanvas.height) {
    return;
  }

  const width = boardCanvas.width;
  const height = boardCanvas.height;
  const cellSize = width / BOARD_WIDTH;

  boardContext.clearRect(0, 0, width, height);
  paintBoardBackground(boardContext, width, height);

  drawGrid(boardContext, cellSize, width, height);
  drawSettledCells(boardContext, cellSize);
  drawGhostPiece(boardContext, cellSize);
  drawCurrentPiece(boardContext, cellSize);

  if (state.flashUntil > now) {
    const progress = 1 - Math.max(0, (state.flashUntil - now) / CLEAR_FLASH_MS);
    boardContext.fillStyle = `rgba(100, 240, 255, ${0.06 + progress * 0.12})`;
    boardContext.fillRect(0, 0, width, height);
  }
}

function paintBoardBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#070b12");
  gradient.addColorStop(1, "#0d1320");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawGrid(ctx, cellSize, width, height) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 1;

  for (let col = 0; col <= BOARD_WIDTH; col += 1) {
    const x = col * cellSize + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let row = 0; row <= BOARD_HEIGHT; row += 1) {
    const y = row * cellSize + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSettledCells(ctx, cellSize) {
  for (let row = 0; row < BOARD_HEIGHT; row += 1) {
    for (let col = 0; col < BOARD_WIDTH; col += 1) {
      const type = state.board[row][col];
      if (!type) {
        continue;
      }

      drawCell(ctx, col, row, cellSize, PIECES[type].color, 1);
    }
  }
}

function drawGhostPiece(ctx, cellSize) {
  if (!state.current) {
    return;
  }

  let ghostY = state.current.y;
  while (isValidPlacement(state.current, state.current.x, ghostY + 1, state.current.rotation)) {
    ghostY += 1;
  }

  drawPiece(ctx, state.current, state.current.x, ghostY, cellSize, 0.24, true);
}

function drawCurrentPiece(ctx, cellSize) {
  if (!state.current) {
    return;
  }

  drawPiece(ctx, state.current, state.current.x, state.current.y, cellSize, 1, false);
}

function drawPiece(ctx, piece, x, y, cellSize, alpha, ghost) {
  const matrix = PIECES[piece.type].rotations[piece.rotation];
  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (!matrix[row][col]) {
        continue;
      }

      const boardX = x + col;
      const boardY = y + row;
      if (boardY < 0) {
        continue;
      }

      drawCell(ctx, boardX, boardY, cellSize, ghost ? "#e7f6ff" : PIECES[piece.type].color, alpha);
    }
  }
}

function drawCell(ctx, col, row, cellSize, color, alpha) {
  const x = col * cellSize;
  const y = row * cellSize;
  const size = cellSize;
  const inset = Math.max(1, Math.round(size * 0.07));
  const radius = Math.max(2, size * 0.16);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  fillRoundedRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, radius);

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  fillRoundedRect(ctx, x + inset + 1, y + inset + 1, size - inset * 2 - 2, Math.max(2, size * 0.24), radius);

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  fillRoundedRect(ctx, x + inset + 1, y + size * 0.6, size - inset * 2 - 2, size * 0.28, radius);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = Math.max(1, size * 0.05);
  ctx.strokeRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
  ctx.restore();
}

function renderMiniPiece(ctx, type, canvas, label) {
  if (!ctx) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#08101c");
  background.addColorStop(1, "#111a2c");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 1;
  for (let index = 0; index <= PREVIEW_BOUNDS; index += 1) {
    const xLine = (width / PREVIEW_BOUNDS) * index + 0.5;
    const yLine = (height / PREVIEW_BOUNDS) * index + 0.5;
    ctx.beginPath();
    ctx.moveTo(xLine, 0);
    ctx.lineTo(xLine, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, yLine);
    ctx.lineTo(width, yLine);
    ctx.stroke();
  }

  if (!type) {
    ctx.fillStyle = "rgba(237, 245, 255, 0.58)";
    ctx.font = "700 18px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label === "Locked" ? "USED" : "EMPTY", width / 2, height / 2 - 4);
    ctx.fillStyle = "rgba(237, 245, 255, 0.38)";
    ctx.font = "500 12px DM Sans, sans-serif";
    ctx.fillText(label === "Locked" ? "until you land" : "queue ready", width / 2, height / 2 + 18);
    return;
  }

  const matrix = PIECES[type].rotations[0];
  const bounds = getOccupiedBounds(matrix);
  const cellSize = Math.floor(Math.min(width / 5, height / 5));
  const pieceWidth = bounds.width * cellSize;
  const pieceHeight = bounds.height * cellSize;
  const originX = Math.floor((width - pieceWidth) / 2) - bounds.minCol * cellSize;
  const originY = Math.floor((height - pieceHeight) / 2) - bounds.minRow * cellSize;

  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (!matrix[row][col]) {
        continue;
      }

      const px = originX + col * cellSize;
      const py = originY + row * cellSize;
      drawPreviewCell(ctx, px, py, cellSize, PIECES[type].color);
    }
  }
}

function drawPreviewCell(ctx, x, y, size, color) {
  const inset = Math.max(1, Math.round(size * 0.08));
  const radius = Math.max(2, size * 0.16);

  ctx.save();
  ctx.fillStyle = color;
  fillRoundedRect(ctx, x + inset, y + inset, size - inset * 2, size - inset * 2, radius);
  ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
  fillRoundedRect(ctx, x + inset + 1, y + inset + 1, size - inset * 2 - 2, Math.max(2, size * 0.24), radius);
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  fillRoundedRect(ctx, x + inset + 1, y + size * 0.58, size - inset * 2 - 2, size * 0.3, radius);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = Math.max(1, size * 0.05);
  ctx.strokeRect(x + inset, y + inset, size - inset * 2, size - inset * 2);
  ctx.restore();
}

function getOccupiedBounds(matrix) {
  let minRow = matrix.length;
  let maxRow = -1;
  let minCol = matrix[0].length;
  let maxCol = -1;

  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (!matrix[row][col]) {
        continue;
      }

      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }
  }

  return {
    minRow,
    maxRow,
    minCol,
    maxCol,
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
  };
}

function resizeCanvases() {
  resizeCanvas(boardCanvas);
  resizeCanvas(nextCanvas);
  resizeCanvas(holdCanvas);
  renderAll(performance.now());
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width === width && canvas.height === height) {
    return;
  }

  canvas.width = width;
  canvas.height = height;
}

function fillRoundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    return;
  }

  ctx.fillRect(x, y, width, height);
}

function loadBestScore() {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY) ?? 0);
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // Local storage can be unavailable in private or restricted browsing modes.
  }
}

function buildPieces() {
  const bases = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    O: [
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    T: [
      [0, 0, 0, 0],
      [0, 1, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
    ],
    J: [
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    L: [
      [0, 0, 1, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    S: [
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    Z: [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  };

  const colors = {
    I: "#63eaf6",
    O: "#ffd45a",
    T: "#c48cff",
    J: "#6d94ff",
    L: "#ff9d4b",
    S: "#70e08d",
    Z: "#ff7f8e",
  };

  return Object.fromEntries(
    Object.entries(bases).map(([type, matrix]) => [
      type,
      {
        color: colors[type],
        rotations: buildRotations(matrix),
      },
    ]),
  );
}

function buildRotations(matrix) {
  const rotations = [matrix];
  let current = matrix;
  for (let index = 0; index < 3; index += 1) {
    current = rotateMatrix(current);
    rotations.push(current);
  }
  return rotations;
}

function rotateMatrix(matrix) {
  const size = matrix.length;
  const next = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      next[col][size - row - 1] = matrix[row][col];
    }
  }

  return next;
}
