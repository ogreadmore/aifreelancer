import { initCommon } from "../common.js";

initCommon("neon-snake");

const canvas = document.querySelector("#neon-snake-canvas");
const context = canvas.getContext("2d", { alpha: false });
const overlay = document.querySelector("#intro-overlay");
const introTitle = document.querySelector("#intro-title");
const introCopy = document.querySelector("#intro-copy");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const controlsButton = document.querySelector("#controls-button");
const focusButton = document.querySelector("#focus-button");
const statusPill = document.querySelector("#game-status");
const scoreValue = document.querySelector("#score-value");
const bestValue = document.querySelector("#best-value");
const speedValue = document.querySelector("#speed-value");
const lengthValue = document.querySelector("#length-value");
const touchButtons = document.querySelectorAll("[data-direction], [data-action]");

const STORAGE_KEY = "aifreelancer.neon-snake.best";
const BOARD_SIZE = 24;
const BOARD_CELLS = BOARD_SIZE * BOARD_SIZE;
const BASE_INTERVAL = 150;
const MIN_INTERVAL = 68;

const palette = {
  bgA: "#061022",
  bgB: "#050714",
  grid: "rgba(255,255,255,0.06)",
  glow: "rgba(0, 229, 255, 0.45)",
  snakeHead: "#f7fcff",
  snakeBody: "#00e5ff",
  snakeTail: "#ff33cc",
  apple: "#7dff9a",
  appleCore: "#ffffff",
  text: "#eef4ff",
};

const game = {
  phase: "ready",
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  snake: [],
  apple: { x: 0, y: 0 },
  score: 0,
  best: loadBestScore(),
  won: false,
  speed: 0,
  intervalMs: BASE_INTERVAL,
  accumulator: 0,
  lastFrame: 0,
  shake: 0,
  pulse: 0,
  particles: [],
  stars: createStars(96),
  board: {
    cell: 0,
    sizePx: 0,
    offsetX: 0,
    offsetY: 0,
  },
};

let animationFrame = 0;

window.addEventListener("keydown", handleKeyDown, { passive: false });
window.addEventListener("resize", scheduleResize, { passive: true });
canvas.addEventListener("click", () => {
  if (game.phase === "ready") {
    startRun();
  } else if (game.phase === "paused") {
    resumeRun();
  }
});

startButton.addEventListener("click", startRun);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", restartGame);
controlsButton.addEventListener("click", focusHelp);
focusButton.addEventListener("click", focusHelp);

touchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.direction) {
      requestDirection(button.dataset.direction);
      if (game.phase === "ready") {
        startRun();
      }
      return;
    }

    if (button.dataset.action === "pause") {
      togglePause();
      return;
    }

    if (button.dataset.action === "restart") {
      restartGame();
      return;
    }

    if (button.dataset.action === "focus") {
      focusHelp();
    }
  });
});

resetGame({ autoStart: false });
resizeCanvas();
requestAnimationFrame(tick);

function resetGame({ autoStart }) {
  game.phase = autoStart ? "running" : "ready";
  game.direction = { x: 1, y: 0 };
  game.nextDirection = { x: 1, y: 0 };
  game.snake = [
    { x: 10, y: 12 },
    { x: 9, y: 12 },
    { x: 8, y: 12 },
    { x: 7, y: 12 },
  ];
  game.apple = spawnApple();
  game.score = 0;
  game.won = false;
  game.speed = getSpeedFromScore(0);
  game.intervalMs = getStepInterval(0);
  game.accumulator = 0;
  game.lastFrame = 0;
  game.shake = 0;
  game.pulse = 0;
  game.particles = [];

  updateBestScore(0);
  syncOverlay();
  syncHud();
  setStatus(autoStart ? "Running" : "Ready");
  pauseButton.textContent = "Pause";
}

function startRun() {
  if (game.phase === "running") {
    return;
  }

  if (game.phase === "gameover") {
    resetGame({ autoStart: true });
    return;
  }

  game.phase = "running";
  game.accumulator = 0;
  game.lastFrame = 0;
  setStatus("Running");
  pauseButton.textContent = "Pause";
  syncOverlay();
}

function resumeRun() {
  if (game.phase !== "paused") {
    return;
  }

  game.phase = "running";
  game.accumulator = 0;
  game.lastFrame = 0;
  setStatus("Running");
  pauseButton.textContent = "Pause";
  syncOverlay();
}

function togglePause() {
  if (game.phase === "ready") {
    startRun();
    return;
  }

  if (game.phase === "gameover") {
    restartGame();
    return;
  }

  if (game.phase === "paused") {
    resumeRun();
    return;
  }

  game.phase = "paused";
  game.lastFrame = 0;
  setStatus("Paused");
  pauseButton.textContent = "Resume";
  syncOverlay();
}

function restartGame() {
  resetGame({ autoStart: true });
}

function focusHelp() {
  document.querySelector(".helper-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "spacebar", "p", "r", "enter"].includes(key)) {
    event.preventDefault();
  }

  if (key === " " || key === "spacebar" || key === "enter") {
    if (game.phase === "gameover") {
      restartGame();
    } else {
      togglePause();
    }
    return;
  }

  if (key === "p") {
    togglePause();
    return;
  }

  if (key === "r") {
    restartGame();
    return;
  }

  if (key === "arrowup" || key === "w") {
    requestDirection("up");
  } else if (key === "arrowdown" || key === "s") {
    requestDirection("down");
  } else if (key === "arrowleft" || key === "a") {
    requestDirection("left");
  } else if (key === "arrowright" || key === "d") {
    requestDirection("right");
  }

  if (game.phase === "ready" && ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
    startRun();
  }
}

function requestDirection(directionName) {
  const next = directionVector(directionName);
  if (!next) {
    return;
  }

  const current = game.nextDirection || game.direction;
  if (current.x + next.x === 0 && current.y + next.y === 0) {
    return;
  }

  game.nextDirection = next;
}

function directionVector(directionName) {
  switch (directionName) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    default:
      return null;
  }
}

function tick(now) {
  if (!game.lastFrame) {
    game.lastFrame = now;
  }

  const delta = Math.min(now - game.lastFrame, 48);
  game.lastFrame = now;

  if (game.phase === "running") {
    game.accumulator += delta;
    game.intervalMs = getStepInterval(game.score);
    game.speed = getSpeedFromScore(game.score);

    while (game.accumulator >= game.intervalMs && game.phase === "running") {
      stepGame();
      game.accumulator -= game.intervalMs;
    }
  } else {
    game.accumulator = 0;
    game.speed = getSpeedFromScore(game.score);
    game.intervalMs = getStepInterval(game.score);
  }

  updateParticles(delta);
  render(now);
  animationFrame = requestAnimationFrame(tick);
}

function stepGame() {
  game.direction = game.nextDirection;

  const head = game.snake[0];
  const nextHead = {
    x: head.x + game.direction.x,
    y: head.y + game.direction.y,
  };

  if (nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= BOARD_SIZE || nextHead.y >= BOARD_SIZE) {
    endGame();
    return;
  }

  const willEat = nextHead.x === game.apple.x && nextHead.y === game.apple.y;
  const collisionLimit = willEat ? game.snake.length : game.snake.length - 1;

  for (let index = 0; index < collisionLimit; index += 1) {
    const segment = game.snake[index];
    if (segment.x === nextHead.x && segment.y === nextHead.y) {
      endGame();
      return;
    }
  }

  game.snake.unshift(nextHead);

  if (willEat) {
    game.score += 1;
    game.pulse = 1;
    game.shake = 10;
    spawnBurst(nextHead);
    if (game.snake.length >= BOARD_CELLS) {
      completeRun();
      return;
    }

    game.apple = spawnApple();
    game.speed = getSpeedFromScore(game.score);
    game.intervalMs = getStepInterval(game.score);
    updateBestScore(game.score);
    syncHud();
    return;
  }

  game.snake.pop();
  syncHud();
}

function endGame() {
  game.phase = "gameover";
  game.won = false;
  game.shake = 14;
  setStatus("Game over");
  pauseButton.textContent = "Pause";
  syncOverlay();
  updateBestScore(game.score);
  burstSnake(game.snake[0]);
}

function completeRun() {
  game.phase = "gameover";
  game.won = true;
  game.shake = 18;
  setStatus("Perfect run");
  pauseButton.textContent = "Play again";
  syncOverlay();
  updateBestScore(game.score);
  burstSnake(game.snake[0]);
}

function render(now) {
  const { width, height } = canvas;

  context.save();
  context.clearRect(0, 0, width, height);

  drawBackdrop(now, width, height);
  drawBoardFrame(width, height);
  drawGrid(width, height, now);
  drawApple(now);
  drawSnake(now);
  drawParticles();
  drawStatusText();

  if (game.shake > 0) {
    game.shake *= 0.88;
    if (game.shake < 0.2) {
      game.shake = 0;
    }
  }

  if (game.pulse > 0) {
    game.pulse *= 0.9;
  }

  context.restore();
}

function drawBackdrop(now, width, height) {
  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, palette.bgA);
  background.addColorStop(1, palette.bgB);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const glowA = context.createRadialGradient(width * 0.28, height * 0.24, 10, width * 0.28, height * 0.24, width * 0.56);
  glowA.addColorStop(0, "rgba(0, 229, 255, 0.16)");
  glowA.addColorStop(1, "rgba(0, 229, 255, 0)");
  context.fillStyle = glowA;
  context.fillRect(0, 0, width, height);

  const glowB = context.createRadialGradient(width * 0.82, height * 0.74, 20, width * 0.82, height * 0.74, width * 0.5);
  glowB.addColorStop(0, "rgba(255, 51, 204, 0.12)");
  glowB.addColorStop(1, "rgba(255, 51, 204, 0)");
  context.fillStyle = glowB;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.8;
  game.stars.forEach((star, index) => {
    const twinkle = 0.45 + Math.sin(now * 0.0014 + index * 0.7) * 0.2;
    context.fillStyle = `rgba(246, 250, 255, ${Math.max(twinkle, 0.14)})`;
    context.beginPath();
    context.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();

  if (game.shake > 0) {
    context.translate(Math.sin(now * 0.025) * game.shake, Math.cos(now * 0.02) * (game.shake * 0.45));
  }
}

function drawBoardFrame(width, height) {
  const board = game.board;
  const x = board.offsetX;
  const y = board.offsetY;
  const size = board.sizePx;

  const frame = context.createLinearGradient(x, y, x + size, y + size);
  frame.addColorStop(0, "rgba(14, 22, 45, 0.98)");
  frame.addColorStop(1, "rgba(7, 10, 24, 0.98)");
  context.fillStyle = frame;
  roundRect(context, x, y, size, size, Math.min(board.cell * 0.35, 18));
  context.fill();

  context.save();
  context.shadowColor = palette.glow;
  context.shadowBlur = 30;
  context.strokeStyle = "rgba(0, 229, 255, 0.18)";
  context.lineWidth = 2;
  roundRect(context, x + 1, y + 1, size - 2, size - 2, Math.min(board.cell * 0.35, 18));
  context.stroke();
  context.restore();
}

function drawGrid() {
  const { cell, offsetX, offsetY, sizePx } = game.board;
  context.save();
  context.strokeStyle = palette.grid;
  context.lineWidth = 1;
  for (let index = 0; index <= BOARD_SIZE; index += 1) {
    const x = offsetX + index * cell;
    const y = offsetY + index * cell;
    context.beginPath();
    context.moveTo(x, offsetY);
    context.lineTo(x, offsetY + sizePx);
    context.stroke();

    context.beginPath();
    context.moveTo(offsetX, y);
    context.lineTo(offsetX + sizePx, y);
    context.stroke();
  }
  context.restore();
}

function drawApple(now) {
  const { cell, offsetX, offsetY } = game.board;
  const x = offsetX + game.apple.x * cell;
  const y = offsetY + game.apple.y * cell;
  const pulse = 0.72 + Math.sin(now * 0.006) * 0.12 + game.pulse * 0.35;
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  const radius = Math.max(cell * 0.44, 10);

  context.save();
  context.shadowColor = "rgba(125, 255, 154, 0.85)";
  context.shadowBlur = 24 + game.pulse * 18;

  const glow = context.createRadialGradient(cx, cy, 2, cx, cy, radius * 1.6);
  glow.addColorStop(0, "rgba(255,255,255,0.98)");
  glow.addColorStop(0.35, `rgba(125, 255, 154, ${pulse})`);
  glow.addColorStop(1, "rgba(125, 255, 154, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(cx, cy, radius * 1.6, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = palette.apple;
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = palette.appleCore;
  context.beginPath();
  context.arc(cx - radius * 0.15, cy - radius * 0.12, radius * 0.25, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawSnake(now) {
  const { cell, offsetX, offsetY } = game.board;
  const segments = game.snake;

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    const x = offsetX + segment.x * cell;
    const y = offsetY + segment.y * cell;
    const progress = index / Math.max(segments.length - 1, 1);
    const inset = Math.max(cell * 0.12, 2);
    const radius = Math.max(cell * 0.28, 8);
    const alpha = 0.45 + (1 - progress) * 0.5;
    const tint = mixColor(palette.snakeBody, palette.snakeTail, progress * 0.8);

    context.save();
    context.shadowColor = tint;
    context.shadowBlur = index === 0 ? 24 : 16;
    context.fillStyle = index === 0 ? palette.snakeHead : tint;
    context.globalAlpha = alpha;
    roundRect(context, x + inset, y + inset, cell - inset * 2, cell - inset * 2, radius);
    context.fill();
    context.restore();
  }

  const head = segments[0];
  if (head) {
    const x = offsetX + head.x * cell;
    const y = offsetY + head.y * cell;
    const centerX = x + cell / 2;
    const centerY = y + cell / 2;
    const eyeOffset = cell * 0.12;
    const eyeRadius = Math.max(cell * 0.07, 1.4);

    context.save();
    context.shadowColor = "rgba(0, 229, 255, 0.8)";
    context.shadowBlur = 14;
    context.fillStyle = "rgba(255,255,255,0.95)";
    context.beginPath();
    context.arc(centerX - eyeOffset, centerY - eyeOffset, eyeRadius, 0, Math.PI * 2);
    context.arc(centerX + eyeOffset, centerY - eyeOffset, eyeRadius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(5, 9, 20, 0.95)";
    context.beginPath();
    context.arc(centerX - eyeOffset, centerY - eyeOffset, eyeRadius * 0.4, 0, Math.PI * 2);
    context.arc(centerX + eyeOffset, centerY - eyeOffset, eyeRadius * 0.4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  if (game.pulse > 0 && head) {
    const x = offsetX + head.x * cell + cell / 2;
    const y = offsetY + head.y * cell + cell / 2;
    context.save();
    context.strokeStyle = `rgba(0, 229, 255, ${0.38 * game.pulse})`;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(x, y, cell * (0.4 + game.pulse * 0.55), 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

function drawParticles() {
  game.particles.forEach((particle) => {
    context.save();
    context.globalAlpha = particle.life;
    context.fillStyle = particle.color;
    context.shadowColor = particle.color;
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

function drawStatusText() {
  const isActive = game.phase === "running";
  if (!isActive && game.phase !== "paused") {
    return;
  }

  const label = game.phase === "paused" ? "Paused" : `Speed ${Math.max(game.speed, 0)} / sec`;
  context.save();
  context.fillStyle = "rgba(248, 251, 255, 0.86)";
  context.font = "700 14px DM Sans, system-ui, sans-serif";
  context.textBaseline = "top";
  context.fillText(label, game.board.offsetX + 18, game.board.offsetY + 14);
  context.restore();
}

function updateParticles(delta) {
  const seconds = delta / 1000;
  game.particles = game.particles.filter((particle) => particle.life > 0.03);
  game.particles.forEach((particle) => {
    particle.life -= seconds * particle.decay;
    particle.x += particle.vx * seconds;
    particle.y += particle.vy * seconds;
    particle.vx *= 0.985;
    particle.vy *= 0.985;
  });
}

function spawnBurst(point) {
  const { cell, offsetX, offsetY } = game.board;
  const originX = offsetX + point.x * cell + cell / 2;
  const originY = offsetY + point.y * cell + cell / 2;
  const colors = ["rgba(0, 229, 255, 0.95)", "rgba(255, 51, 204, 0.95)", "rgba(125, 255, 154, 0.95)"];

  for (let index = 0; index < 22; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 160;
    game.particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1.5 + Math.random() * 2.6,
      life: 0.9 + Math.random() * 0.35,
      decay: 1.3 + Math.random() * 0.75,
      color: colors[index % colors.length],
    });
  }
}

function burstSnake(point) {
  if (!point) {
    return;
  }

  spawnBurst(point);
}

function spawnApple() {
  const blocked = new Set(game.snake.map((segment) => `${segment.x}:${segment.y}`));
  let apple;

  do {
    apple = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE),
    };
  } while (blocked.has(`${apple.x}:${apple.y}`));

  return apple;
}

function loadBestScore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const score = Number.parseInt(raw ?? "0", 10);
    return Number.isFinite(score) ? score : 0;
  } catch {
    return 0;
  }
}

function updateBestScore(score) {
  if (score > game.best) {
    game.best = score;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(score));
    } catch {
      // Ignore storage failures and keep the in-memory best score.
    }
  }

  bestValue.textContent = game.best.toString();
}

function syncHud() {
  scoreValue.textContent = game.score.toString();
  bestValue.textContent = game.best.toString();
  speedValue.textContent = game.speed.toString();
  lengthValue.textContent = game.snake.length.toString();
}

function syncOverlay() {
  if (game.phase === "running") {
    overlay.classList.add("is-hidden");
    introTitle.textContent = "Neon Snake";
    introCopy.textContent = "Guide the glowing serpent through the grid, collect the synth fruit, and let the pace climb until the screen is singing.";
    startButton.textContent = "Start run";
    controlsButton.textContent = "See controls";
    return;
  }

  overlay.classList.remove("is-hidden");

  if (game.phase === "paused") {
    introTitle.textContent = "Paused";
    introCopy.textContent = "The board is frozen. Resume when you are ready to keep the run alive.";
    startButton.textContent = "Resume run";
    controlsButton.textContent = "See controls";
    return;
  }

  if (game.phase === "gameover") {
    introTitle.textContent = game.won ? "Grid complete" : "Game over";
    introCopy.textContent = game.won
      ? `You filled all ${BOARD_CELLS} cells and closed out a perfect run with ${game.score} points. The best score on this device is ${game.best}.`
      : `You reached ${game.score} points. The best score on this device is ${game.best}. Hit restart and chase the next run.`;
    startButton.textContent = "Run again";
    controlsButton.textContent = "See controls";
    return;
  }

  introTitle.textContent = "Neon Snake";
  introCopy.textContent = "Guide the glowing serpent through the grid, collect the synth fruit, and let the pace climb until the screen is singing.";
  startButton.textContent = "Start run";
  controlsButton.textContent = "See controls";
}

function setStatus(value) {
  statusPill.textContent = value;
}

function getStepInterval(score) {
  return Math.max(MIN_INTERVAL, BASE_INTERVAL - score * 4.8);
}

function getSpeedFromScore(score) {
  return Math.max(1, Math.round(1000 / getStepInterval(score)));
}

function createStars(count) {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    size: 0.6 + Math.random() * 1.8,
  }));
}

function scheduleResize() {
  resizeCanvas();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const devicePixelRatio = Math.max(window.devicePixelRatio || 1, 1);
  const width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
  const height = Math.max(1, Math.floor(rect.height * devicePixelRatio));

  canvas.width = width;
  canvas.height = height;

  const sizePx = Math.min(width, height);
  const cell = Math.floor(sizePx / BOARD_SIZE);
  const boardSizePx = cell * BOARD_SIZE;
  const offsetX = Math.floor((width - boardSizePx) / 2);
  const offsetY = Math.floor((height - boardSizePx) / 2);

  game.board.cell = cell;
  game.board.sizePx = boardSizePx;
  game.board.offsetX = offsetX;
  game.board.offsetY = offsetY;
}

function roundRect(ctx, x, y, width, height, radius) {
  const corner = Math.max(Math.min(radius, Math.min(width, height) / 2), 0);
  ctx.beginPath();
  ctx.moveTo(x + corner, y);
  ctx.arcTo(x + width, y, x + width, y + height, corner);
  ctx.arcTo(x + width, y + height, x, y + height, corner);
  ctx.arcTo(x, y + height, x, y, corner);
  ctx.arcTo(x, y, x + width, y, corner);
  ctx.closePath();
}

function mixColor(from, to, amount) {
  const start = hexToRgb(from);
  const end = hexToRgb(to);
  const mix = {
    r: Math.round(start.r + (end.r - start.r) * amount),
    g: Math.round(start.g + (end.g - start.g) * amount),
    b: Math.round(start.b + (end.b - start.b) * amount),
  };
  return `rgb(${mix.r} ${mix.g} ${mix.b})`;
}

function hexToRgb(value) {
  const stripped = value.replace("#", "");
  return {
    r: Number.parseInt(stripped.slice(0, 2), 16),
    g: Number.parseInt(stripped.slice(2, 4), 16),
    b: Number.parseInt(stripped.slice(4, 6), 16),
  };
}
