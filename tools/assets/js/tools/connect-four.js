import { formatNumber, initCommon } from "../common.js";

initCommon("connect-four");

const ROWS = 6;
const COLS = 7;
const CONNECT = 4;
const STORAGE_KEY = "aifreelancer.connect-four.state-v1";
const HUMAN = "R";
const CPU = "Y";
const MODE_AI = "ai";
const MODE_PVP = "pvp";

const boardNode = document.querySelector("#connect-four-board");
const columnsNode = document.querySelector("#connect-four-columns");
const turnPill = document.querySelector("#connect-four-turn-pill");
const announcementNode = document.querySelector("#connect-four-announcement");
const overlayNode = document.querySelector("#connect-four-overlay");
const overlayEyebrow = document.querySelector("#connect-four-overlay-eyebrow");
const overlayTitle = document.querySelector("#connect-four-overlay-title");
const overlayCopy = document.querySelector("#connect-four-overlay-copy");
const playAgainButton = document.querySelector("#connect-four-play-again");
const closeOverlayButton = document.querySelector("#connect-four-close-overlay");
const newGameButton = document.querySelector("#connect-four-new-game");
const resetStatsButton = document.querySelector("#connect-four-reset-stats");
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const statALabel = document.querySelector("#stat-a-label");
const statAValue = document.querySelector("#stat-a-value");
const statBLabel = document.querySelector("#stat-b-label");
const statBValue = document.querySelector("#stat-b-value");
const statCLabel = document.querySelector("#stat-c-label");
const statCValue = document.querySelector("#stat-c-value");
const statDLabel = document.querySelector("#stat-d-label");
const statDValue = document.querySelector("#stat-d-value");

const cellNodes = [];
const tokenNodes = [];
const columnButtons = [];

const state = {
  board: createBoard(),
  previousBoard: createBoard(),
  mode: MODE_AI,
  turn: HUMAN,
  over: false,
  busy: false,
  hoveredColumn: 3,
  winningCells: [],
  aiTimer: 0,
  stats: {
    ai: {
      playerWins: 0,
      cpuWins: 0,
      draws: 0,
      currentStreak: 0,
      bestStreak: 0,
    },
    pvp: {
      redWins: 0,
      goldWins: 0,
      draws: 0,
    },
  },
};

loadState();
buildBoard();
buildColumnControls();
bindEvents();
startNewGame({ announce: false });
render();

function bindEvents() {
  playAgainButton.addEventListener("click", () => startNewGame());
  closeOverlayButton.addEventListener("click", hideOverlay);
  newGameButton.addEventListener("click", () => startNewGame());
  resetStatsButton.addEventListener("click", resetStats);
  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode === MODE_PVP ? MODE_PVP : MODE_AI;
      if (mode === state.mode) {
        return;
      }
      state.mode = mode;
      persistState();
      startNewGame();
    });
  });

  boardNode.addEventListener("click", (event) => {
    const cell = event.target.closest(".cf-cell");
    if (!cell) {
      return;
    }

    dropInColumn(Number(cell.dataset.col), "board");
  });

  document.addEventListener("keydown", handleKeyDown);
  window.addEventListener("blur", pauseIfBusy);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseIfBusy();
    }
  });
}

function buildBoard() {
  boardNode.innerHTML = "";
  cellNodes.length = 0;
  tokenNodes.length = 0;

  for (let row = 0; row < ROWS; row += 1) {
    cellNodes[row] = [];
    tokenNodes[row] = [];

    for (let col = 0; col < COLS; col += 1) {
      const cell = document.createElement("div");
      cell.className = "cf-cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);

      const token = document.createElement("span");
      token.className = "cf-token";
      token.hidden = true;
      token.setAttribute("aria-hidden", "true");

      cell.append(token);
      boardNode.append(cell);
      cellNodes[row][col] = cell;
      tokenNodes[row][col] = token;
    }
  }
}

function buildColumnControls() {
  columnsNode.innerHTML = "";
  columnButtons.length = 0;

  for (let col = 0; col < COLS; col += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "column-button";
    button.dataset.column = String(col);
    button.innerHTML = `
      <span class="column-chip" aria-hidden="true"></span>
      <span>${col + 1}</span>
    `;
    button.addEventListener("click", () => dropInColumn(col, "click"));
    button.addEventListener("mouseenter", () => {
      state.hoveredColumn = col;
      render();
    });
    button.addEventListener("focus", () => {
      state.hoveredColumn = col;
      render();
    });

    columnsNode.append(button);
    columnButtons[col] = button;
  }
}

function handleKeyDown(event) {
  if (event.repeat && !["ArrowLeft", "ArrowRight"].includes(event.key)) {
    return;
  }

  const key = event.key;

  if (key === "r" || key === "R") {
    event.preventDefault();
    startNewGame();
    return;
  }

  if (key === "Escape" && !overlayNode.hidden) {
    event.preventDefault();
    hideOverlay();
    return;
  }

  if ((key === "Enter" || key === " ") && !overlayNode.hidden && state.over) {
    event.preventDefault();
    startNewGame();
    return;
  }

  if (state.over || state.busy) {
    if (key === "Enter" || key === " ") {
      event.preventDefault();
    }
    return;
  }

  if (key >= "1" && key <= "7") {
    event.preventDefault();
    dropInColumn(Number(key) - 1, "keyboard");
    return;
  }

  if (key === "ArrowLeft" || key === "ArrowRight" || key === "Home" || key === "End") {
    event.preventDefault();
    if (key === "ArrowLeft") {
      moveHover(-1);
    } else if (key === "ArrowRight") {
      moveHover(1);
    } else if (key === "Home") {
      state.hoveredColumn = 0;
      render();
      setAnnouncement("Column 1 selected.");
    } else {
      state.hoveredColumn = COLS - 1;
      render();
      setAnnouncement(`Column ${COLS} selected.`);
    }
    return;
  }

  if (key === "Enter" || key === " ") {
    event.preventDefault();
    dropInColumn(state.hoveredColumn, "keyboard");
  }
}

function pauseIfBusy() {
  if (!state.busy) {
    return;
  }

  setAnnouncement("CPU is still thinking.");
  render();
}

function startNewGame({ announce = true } = {}) {
  clearTimeout(state.aiTimer);
  state.aiTimer = 0;
  state.board = createBoard();
  state.previousBoard = createBoard();
  state.turn = HUMAN;
  state.over = false;
  state.busy = false;
  state.winningCells = [];
  state.hoveredColumn = 3;
  hideOverlay();
  syncModeUI();
  render();
  if (announce) {
    setAnnouncement(state.mode === MODE_AI
      ? "Red starts. Press 1 to 7, arrow keys, or tap a column to drop."
      : "Red starts. Pass the keyboard or tap a column to begin.");
  } else {
    setAnnouncement("Red starts. Use the column buttons or number keys.");
  }

  if (state.mode === MODE_AI && state.turn === CPU) {
    scheduleAiTurn();
  }
}

function dropInColumn(column, source) {
  if (state.over || state.busy) {
    return;
  }

  if (!isHumanTurn()) {
    return;
  }

  const row = getDropRow(state.board, column);
  if (row === -1) {
    state.hoveredColumn = column;
    render();
    setAnnouncement(`Column ${column + 1} is full. Choose another lane.`);
    return;
  }

  placeToken(column, row, state.turn);

  const outcome = evaluateBoardAfterMove(row, column, state.turn);
  if (outcome) {
    finishRound(outcome.winner, outcome.line);
    return;
  }

  state.turn = otherToken(state.turn);
  state.hoveredColumn = column;
  render();
  setAnnouncement(`${tokenName(state.turn)} to move.`);

  if (state.mode === MODE_AI && state.turn === CPU) {
    scheduleAiTurn();
  }
}

function placeToken(column, row, token) {
  state.board[row][column] = token;
  state.hoveredColumn = column;
  render();
}

function scheduleAiTurn() {
  if (state.over || state.busy || state.mode !== MODE_AI || state.turn !== CPU) {
    return;
  }

  state.busy = true;
  render();
  setAnnouncement("CPU is reading the board.");
  state.aiTimer = window.setTimeout(() => {
    state.aiTimer = 0;
    if (state.over || state.mode !== MODE_AI || state.turn !== CPU) {
      state.busy = false;
      render();
      return;
    }

    const choice = chooseAiColumn();
    state.busy = false;

    if (choice === null) {
      finishRound("draw");
      return;
    }

    const row = getDropRow(state.board, choice);
    if (row === -1) {
      finishRound("draw");
      return;
    }

    placeToken(choice, row, CPU);

    const outcome = evaluateBoardAfterMove(row, choice, CPU);
    if (outcome) {
      finishRound(outcome.winner, outcome.line);
      return;
    }

    state.turn = HUMAN;
    state.hoveredColumn = choice;
    render();
    setAnnouncement("Red to move.");
  }, 420);
}

function finishRound(winner, line = []) {
  clearTimeout(state.aiTimer);
  state.aiTimer = 0;
  state.over = true;
  state.busy = false;
  state.winningCells = line;
  recordOutcome(winner);
  render();

  if (winner === "draw") {
    showOverlay("Draw board", "The grid filled up without a winner. Run it back and look for a tighter lane.");
    setAnnouncement("The round ended in a draw.");
    return;
  }

  if (winner === HUMAN) {
    showOverlay("Red wins", state.mode === MODE_AI
      ? "You connected four first. The board closes cleanly when the line lands."
      : "Red found the line. Pass the board back and see if yellow can answer next round.");
    setAnnouncement(state.mode === MODE_AI ? "You won this round." : "Red won this round.");
    return;
  }

  showOverlay("Gold wins", state.mode === MODE_AI
    ? "The CPU found a clean line and closed the game."
    : "Gold connected four. Reset and keep the duel moving.");
  setAnnouncement(state.mode === MODE_AI ? "CPU won this round." : "Gold won this round.");
}

function showOverlay(title, copy) {
  overlayEyebrow.textContent = "Round over";
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  overlayNode.hidden = false;
}

function hideOverlay() {
  overlayNode.hidden = true;
}

function evaluateBoardAfterMove(row, column, token) {
  const line = getWinningLine(state.board, row, column, token);
  if (line) {
    return { winner: token, line };
  }

  if (isBoardFull(state.board)) {
    return { winner: "draw", line: [] };
  }

  return null;
}

function recordOutcome(winner) {
  if (state.mode === MODE_AI) {
    const stats = state.stats.ai;

    if (winner === HUMAN) {
      stats.playerWins += 1;
      stats.currentStreak += 1;
      stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    } else if (winner === CPU) {
      stats.cpuWins += 1;
      stats.currentStreak = 0;
    } else {
      stats.draws += 1;
      stats.currentStreak = 0;
    }
  } else {
    const stats = state.stats.pvp;
    if (winner === HUMAN) {
      stats.redWins += 1;
    } else if (winner === CPU) {
      stats.goldWins += 1;
    } else {
      stats.draws += 1;
    }
  }

  persistState();
}

function resetStats() {
  state.stats = {
    ai: {
      playerWins: 0,
      cpuWins: 0,
      draws: 0,
      currentStreak: 0,
      bestStreak: 0,
    },
    pvp: {
      redWins: 0,
      goldWins: 0,
      draws: 0,
    },
  };
  persistState();
  render();
  setAnnouncement("Local stats reset.");
}

function render() {
  renderBoard();
  renderControls();
  renderTurnState();
  renderStats();
  renderModeButtons();
}

function renderBoard() {
  const winningSet = new Set(state.winningCells.map(([row, col]) => `${row}:${col}`));

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = cellNodes[row][col];
      const token = tokenNodes[row][col];
      const value = state.board[row][col];
      const previousValue = state.previousBoard[row][col];
      const isWinning = winningSet.has(`${row}:${col}`);

      cell.classList.toggle("is-hovered", !state.over && state.hoveredColumn === col && !value);
      cell.classList.toggle("is-winning", isWinning);

      token.className = "cf-token";
      token.hidden = !value;

      if (value === HUMAN) {
        token.classList.add("is-red");
      } else if (value === CPU) {
        token.classList.add("is-gold");
      }

      if (value && previousValue !== value) {
        token.classList.add("is-dropping");
        token.addEventListener("animationend", () => {
          token.classList.remove("is-dropping");
        }, { once: true });
      }

      if (isWinning && value) {
        token.classList.add("is-winning");
      }
    }
  }

  state.previousBoard = cloneBoard(state.board);
}

function renderControls() {
  const turnIsRed = state.turn === HUMAN;

  columnButtons.forEach((button, column) => {
    const isCurrent = column === state.hoveredColumn;
    const isDisabled = state.over || state.busy || (state.mode === MODE_AI && state.turn === CPU);
    button.disabled = isDisabled;
    button.classList.toggle("is-active", isCurrent);
    button.classList.toggle("is-red-turn", turnIsRed);
    button.classList.toggle("is-gold-turn", !turnIsRed);
    button.setAttribute("aria-label", `Drop ${turnName(state.turn)} disc in column ${column + 1}`);
    button.title = `Column ${column + 1}`;
    button.dataset.turn = turnIsRed ? HUMAN : CPU;

    const chip = button.querySelector(".column-chip");
    if (chip) {
      chip.classList.toggle("is-gold", !turnIsRed);
    }
  });
}

function renderTurnState() {
  const turnLabel = state.mode === MODE_AI && state.turn === CPU
    ? "CPU thinking"
    : `${turnName(state.turn)} to move`;
  turnPill.textContent = state.over ? "Round complete" : turnLabel;
  turnPill.classList.add("is-active");
}

function renderModeButtons() {
  modeButtons.forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function renderStats() {
  if (state.mode === MODE_AI) {
    const stats = state.stats.ai;
    statALabel.textContent = "Your wins";
    statAValue.textContent = formatNumber(stats.playerWins, { maximumFractionDigits: 0 });
    statBLabel.textContent = "CPU wins";
    statBValue.textContent = formatNumber(stats.cpuWins, { maximumFractionDigits: 0 });
    statCLabel.textContent = "Draws";
    statCValue.textContent = formatNumber(stats.draws, { maximumFractionDigits: 0 });
    statDLabel.textContent = "Best streak";
    statDValue.textContent = formatNumber(stats.bestStreak, { maximumFractionDigits: 0 });
    return;
  }

  const stats = state.stats.pvp;
  const games = stats.redWins + stats.goldWins + stats.draws;
  statALabel.textContent = "Red wins";
  statAValue.textContent = formatNumber(stats.redWins, { maximumFractionDigits: 0 });
  statBLabel.textContent = "Gold wins";
  statBValue.textContent = formatNumber(stats.goldWins, { maximumFractionDigits: 0 });
  statCLabel.textContent = "Draws";
  statCValue.textContent = formatNumber(stats.draws, { maximumFractionDigits: 0 });
  statDLabel.textContent = "Games";
  statDValue.textContent = formatNumber(games, { maximumFractionDigits: 0 });
}

function moveHover(delta) {
  const next = (state.hoveredColumn + delta + COLS) % COLS;
  state.hoveredColumn = next;
  render();
  setAnnouncement(`Column ${next + 1} selected.`);
}

function chooseAiColumn() {
  const legalColumns = getLegalColumns(state.board);
  if (!legalColumns.length) {
    return null;
  }

  const shuffled = [...legalColumns].sort(() => Math.random() - 0.5);

  for (const column of shuffled) {
    if (isWinningMove(state.board, column, CPU)) {
      return column;
    }
  }

  for (const column of shuffled) {
    if (isWinningMove(state.board, column, HUMAN)) {
      return column;
    }
  }

  let bestColumn = shuffled[0];
  let bestScore = -Infinity;

  for (const column of shuffled) {
    const score = scoreColumn(state.board, column, CPU);
    if (score > bestScore) {
      bestScore = score;
      bestColumn = column;
    }
  }

  return bestColumn;
}

function scoreColumn(board, column, token) {
  const row = getDropRow(board, column);
  if (row === -1) {
    return -Infinity;
  }

  const nextBoard = cloneBoard(board);
  nextBoard[row][column] = token;
  const opponent = otherToken(token);
  let score = 0;

  score += (3 - Math.abs(3 - column)) * 8;
  score += evaluatePosition(nextBoard, row, column, token) * 12;
  score -= countImmediateWins(nextBoard, opponent) * 90;

  if (row >= 4) {
    score += 2;
  }

  return score + Math.random() * 1.5;
}

function evaluatePosition(board, row, column, token) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  let total = 0;

  for (const [dr, dc] of directions) {
    const before = countDirection(board, row, column, token, -dr, -dc);
    const after = countDirection(board, row, column, token, dr, dc);
    const run = 1 + before + after;
    const openEnds = Number(isOpenSpot(board, row - (before + 1) * dr, column - (before + 1) * dc));
    const openEnds2 = Number(isOpenSpot(board, row + (after + 1) * dr, column + (after + 1) * dc));

    if (run >= CONNECT) {
      total += 500;
    } else if (run === CONNECT - 1) {
      total += 60;
    } else if (run === CONNECT - 2) {
      total += 16;
    } else {
      total += run * run * 3;
    }

    total += (openEnds + openEnds2) * 6;
  }

  return total;
}

function countDirection(board, row, column, token, dr, dc) {
  let count = 0;
  let nextRow = row + dr;
  let nextCol = column + dc;

  while (inBounds(nextRow, nextCol) && board[nextRow][nextCol] === token) {
    count += 1;
    nextRow += dr;
    nextCol += dc;
  }

  return count;
}

function isOpenSpot(board, row, column) {
  return inBounds(row, column) && board[row][column] === null;
}

function countImmediateWins(board, token) {
  let count = 0;
  for (const column of getLegalColumns(board)) {
    if (isWinningMove(board, column, token)) {
      count += 1;
    }
  }
  return count;
}

function isWinningMove(board, column, token) {
  const row = getDropRow(board, column);
  if (row === -1) {
    return false;
  }

  const nextBoard = cloneBoard(board);
  nextBoard[row][column] = token;
  return Boolean(getWinningLine(nextBoard, row, column, token));
}

function getWinningLine(board, row, column, token) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    const line = [[row, column]];
    let nextRow = row + dr;
    let nextCol = column + dc;

    while (inBounds(nextRow, nextCol) && board[nextRow][nextCol] === token) {
      line.push([nextRow, nextCol]);
      nextRow += dr;
      nextCol += dc;
    }

    nextRow = row - dr;
    nextCol = column - dc;
    while (inBounds(nextRow, nextCol) && board[nextRow][nextCol] === token) {
      line.unshift([nextRow, nextCol]);
      nextRow -= dr;
      nextCol -= dc;
    }

    if (line.length >= CONNECT) {
      return line.slice(0, CONNECT);
    }
  }

  return null;
}

function evaluateBoard(board) {
  let hasSpace = false;

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (board[row][col] === null) {
        hasSpace = true;
      }
    }
  }

  return hasSpace;
}

function getLegalColumns(board) {
  const columns = [];
  for (let col = 0; col < COLS; col += 1) {
    if (getDropRow(board, col) !== -1) {
      columns.push(col);
    }
  }
  return columns;
}

function getDropRow(board, column) {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row][column] === null) {
      return row;
    }
  }
  return -1;
}

function isBoardFull(board) {
  return !evaluateBoard(board);
}

function otherToken(token) {
  return token === HUMAN ? CPU : HUMAN;
}

function tokenName(token) {
  return token === HUMAN ? "Red" : "Gold";
}

function turnName(token) {
  if (state.mode === MODE_AI && token === CPU) {
    return "CPU";
  }
  return tokenName(token);
}

function isHumanTurn() {
  return state.mode === MODE_AI ? state.turn === HUMAN : true;
}

function setAnnouncement(message) {
  announcementNode.textContent = message;
}

function syncModeUI() {
  modeButtons.forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function persistState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mode: state.mode,
      stats: state.stats,
    }));
  } catch {
    // Local storage can be unavailable in private browsing contexts.
  }
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (parsed.mode === MODE_AI || parsed.mode === MODE_PVP) {
      state.mode = parsed.mode;
    }

    if (parsed.stats && typeof parsed.stats === "object") {
      state.stats = {
        ai: {
          playerWins: Number(parsed.stats.ai?.playerWins) || 0,
          cpuWins: Number(parsed.stats.ai?.cpuWins) || 0,
          draws: Number(parsed.stats.ai?.draws) || 0,
          currentStreak: Number(parsed.stats.ai?.currentStreak) || 0,
          bestStreak: Number(parsed.stats.ai?.bestStreak) || 0,
        },
        pvp: {
          redWins: Number(parsed.stats.pvp?.redWins) || 0,
          goldWins: Number(parsed.stats.pvp?.goldWins) || 0,
          draws: Number(parsed.stats.pvp?.draws) || 0,
        },
      };
    }
  } catch {
    // Ignore corrupt storage and fall back to defaults.
  }
}

function createBoard() {
  return Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
}

function cloneBoard(board) {
  return board.map((row) => [...row]);
}

function inBounds(row, column) {
  return row >= 0 && row < ROWS && column >= 0 && column < COLS;
}
