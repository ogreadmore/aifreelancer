import { initCommon } from "../common.js";

initCommon("road-hopper");

const canvas = document.querySelector("#road-canvas");
const context = canvas.getContext("2d");
const overlay = document.querySelector("#road-overlay");
const overlayKicker = document.querySelector("#road-overlay-kicker");
const overlayTitle = document.querySelector("#road-overlay-title");
const overlayCopy = document.querySelector("#road-overlay-copy");
const statusNode = document.querySelector("#road-status");
const scoreNode = document.querySelector("#road-score");
const stageNode = document.querySelector("#road-stage");
const livesNode = document.querySelector("#road-lives");
const bestNode = document.querySelector("#road-best");
const tempoNode = document.querySelector("#road-tempo");
const tempoBar = document.querySelector("#road-tempo-bar");
const messageNode = document.querySelector("#road-message");
const startButton = document.querySelector("#road-start");
const pauseButton = document.querySelector("#road-pause");
const restartButton = document.querySelector("#road-restart");
const touchPauseButton = document.querySelector('[data-road-action="pause"]');
const touchButtons = Array.from(document.querySelectorAll("[data-road-action]"));

const STORAGE_KEY = "aifreelancer.road-hopper.best-score";
const LOGICAL_WIDTH = 360;
const LOGICAL_HEIGHT = 540;
const COLS = 9;
const ROWS = 12;
const CELL_WIDTH = LOGICAL_WIDTH / COLS;
const CELL_HEIGHT = LOGICAL_HEIGHT / ROWS;
const START_COL = 4;
const START_ROW = 11;
const GOAL_ROW = 0;
const LANE_SPECS = [
  { row: 2, direction: 1, baseSpeed: 94, minDelay: 1.05, maxDelay: 1.7, pool: ["scooter", "car"] },
  { row: 3, direction: -1, baseSpeed: 104, minDelay: 0.95, maxDelay: 1.55, pool: ["car", "van"] },
  { row: 4, direction: 1, baseSpeed: 112, minDelay: 0.85, maxDelay: 1.45, pool: ["car", "truck"] },
  { row: 5, direction: -1, baseSpeed: 122, minDelay: 0.82, maxDelay: 1.4, pool: ["van", "truck"] },
  { row: 6, direction: 1, baseSpeed: 132, minDelay: 0.72, maxDelay: 1.28, pool: ["scooter", "car", "van"] },
  { row: 7, direction: -1, baseSpeed: 140, minDelay: 0.7, maxDelay: 1.22, pool: ["car", "van", "truck"] },
  { row: 8, direction: 1, baseSpeed: 152, minDelay: 0.66, maxDelay: 1.16, pool: ["car", "truck"] },
];

const VEHICLES = {
  scooter: {
    width: 26,
    height: 16,
    bodyA: "#ffd27f",
    bodyB: "#ff7d5c",
    highlight: "#fff3cf",
    glow: "rgba(255, 186, 102, 0.8)",
    windows: "#1f2434",
  },
  car: {
    width: 42,
    height: 22,
    bodyA: "#66ebff",
    bodyB: "#2f75ff",
    highlight: "#e8feff",
    glow: "rgba(102, 235, 255, 0.8)",
    windows: "#101b2f",
  },
  van: {
    width: 58,
    height: 26,
    bodyA: "#b4ff9a",
    bodyB: "#44d18f",
    highlight: "#f2fff0",
    glow: "rgba(180, 255, 154, 0.75)",
    windows: "#183321",
  },
  truck: {
    width: 82,
    height: 28,
    bodyA: "#ff9bd0",
    bodyB: "#a66cff",
    highlight: "#fff1fb",
    glow: "rgba(255, 155, 208, 0.78)",
    windows: "#271629",
  },
};

const state = {
  phase: "ready",
  score: 0,
  best: loadBestScore(),
  stage: 1,
  lives: 3,
  goalTimer: 0,
  invulnerable: 0,
  flash: 0,
  shake: 0,
  time: 0,
  lastFrame: 0,
  message: "Press Start or Space to begin the crossing.",
  vehicles: [],
  particles: [],
  lanes: createLaneState(),
  player: createPlayer(),
  resizeScale: 1,
};

let animationFrame = 0;
let resizeObserver = null;
let swipeState = null;

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", handleBlur);
document.addEventListener("visibilitychange", handleVisibilityChange);

canvas.addEventListener("pointerdown", handleCanvasPointerDown);
canvas.addEventListener("pointermove", handleCanvasPointerMove);
canvas.addEventListener("pointerup", handleCanvasPointerUp);
canvas.addEventListener("pointercancel", clearSwipeState);
canvas.addEventListener("pointerleave", clearSwipeState);

startButton.addEventListener("click", startOrResumeGame);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", restartGame);

if ("ResizeObserver" in window) {
  resizeObserver = new ResizeObserver(() => resizeCanvas());
  resizeObserver.observe(canvas);
}

touchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.roadAction;
    if (action === "up") {
      hop(0, -1, true);
    } else if (action === "down") {
      hop(0, 1, true);
    } else if (action === "left") {
      hop(-1, 0, true);
    } else if (action === "right") {
      hop(1, 0, true);
    } else if (action === "pause") {
      togglePause();
    } else if (action === "restart") {
      restartGame();
    }
  });
});

resizeCanvas();
syncInterface();
renderScene();
animationFrame = requestAnimationFrame(tick);

function createLaneState() {
  return LANE_SPECS.map((spec) => ({
    ...spec,
    spawnTimer: randomBetween(spec.minDelay, spec.maxDelay),
  }));
}

function createPlayer() {
  return {
    col: START_COL,
    row: START_ROW,
    fromCol: START_COL,
    fromRow: START_ROW,
    toCol: START_COL,
    toRow: START_ROW,
    progress: 1,
    bob: 0,
  };
}

function loadBestScore() {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Best score persistence is optional.
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  state.resizeScale = width / LOGICAL_WIDTH;
  context.setTransform(state.resizeScale, 0, 0, state.resizeScale, 0, 0);
}

function tick(now) {
  if (!state.lastFrame) {
    state.lastFrame = now;
  }

  const delta = Math.min(0.032, (now - state.lastFrame) / 1000);
  state.lastFrame = now;

  update(delta);
  renderScene(now);
  animationFrame = requestAnimationFrame(tick);
}

function update(delta) {
  if (state.phase === "running") {
    state.time += delta;
    state.flash = Math.max(0, state.flash - delta * 1.8);
    state.shake = Math.max(0, state.shake - delta * 2.8);
    state.invulnerable = Math.max(0, state.invulnerable - delta);
    state.player.bob = Math.min(1, state.player.bob + delta * 6.5);

    if (state.player.progress < 1) {
      state.player.progress = Math.min(1, state.player.progress + delta * 8.6);
      if (state.player.progress >= 1) {
        state.player.fromCol = state.player.toCol;
        state.player.fromRow = state.player.toRow;
      }
    }

    if (state.goalTimer > 0) {
      state.goalTimer = Math.max(0, state.goalTimer - delta);
      if (state.goalTimer === 0) {
        advanceStage();
      }
    } else {
      updateTraffic(delta);
      updateParticles(delta);
      checkCollisions();
    }
  } else {
    state.flash = Math.max(0, state.flash - delta * 1.25);
    state.shake = Math.max(0, state.shake - delta * 2.2);
    updateParticles(delta * 0.5);
  }

  syncInterface();
}

function updateTraffic(delta) {
  const tempoMultiplier = getTempoMultiplier();

  state.lanes.forEach((lane) => {
    lane.spawnTimer -= delta;
    if (lane.spawnTimer <= 0) {
      spawnVehicle(lane, tempoMultiplier);
      lane.spawnTimer = randomBetween(lane.minDelay, lane.maxDelay) / Math.max(0.58, tempoMultiplier);
    }
  });

  state.vehicles = state.vehicles.filter((vehicle) => {
    vehicle.x += vehicle.speed * delta;
    return vehicle.x > -160 && vehicle.x < LOGICAL_WIDTH + 160;
  });
}

function spawnVehicle(lane, tempoMultiplier) {
  const variantKey = lane.pool[Math.floor(Math.random() * lane.pool.length)];
  const variant = VEHICLES[variantKey];
  const width = variant.width + randomBetween(-4, 8);
  const height = variant.height;
  const verticalInset = (CELL_HEIGHT - height) / 2;
  const y = lane.row * CELL_HEIGHT + verticalInset;
  const direction = lane.direction;
  const speed = lane.baseSpeed * tempoMultiplier * randomBetween(0.92, 1.08) * direction;
  const x = direction > 0
    ? -width - randomBetween(28, 120)
    : LOGICAL_WIDTH + randomBetween(28, 120);

  state.vehicles.push({
    laneRow: lane.row,
    direction,
    x,
    y,
    width,
    height,
    speed,
    variantKey,
    wobble: Math.random() * Math.PI * 2,
  });
}

function updateParticles(delta) {
  const remaining = [];

  for (const particle of state.particles) {
    particle.life -= delta;
    if (particle.life <= 0) {
      continue;
    }

    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += particle.gravity * delta;
    particle.vx *= Math.pow(0.985, delta * 60);
    remaining.push(particle);
  }

  state.particles = remaining;
}

function checkCollisions() {
  if (state.invulnerable > 0 || state.goalTimer > 0) {
    return;
  }

  const hitbox = getPlayerHitbox();
  for (const vehicle of state.vehicles) {
    if (rectsOverlap(hitbox, getVehicleHitbox(vehicle))) {
      loseLife(vehicle);
      break;
    }
  }
}

function loseLife(vehicle) {
  state.lives -= 1;
  state.shake = 0.38;
  state.flash = 0.28;
  state.invulnerable = 1.15;
  burst(vehicle.x + vehicle.width / 2, vehicle.y + vehicle.height / 2, ["#ffe18a", "#ff9d5c", "#ff6f9c"], 24, 1.1);

  if (state.lives <= 0) {
    state.lives = 0;
    state.phase = "gameover";
    state.message = `Traffic wins. Final score: ${formatInt(state.score)}.`;
    updateBestScore();
    syncInterface();
    syncOverlay();
    return;
  }

  state.message = `Crashed. ${state.lives} lives left.`;
  resetPlayer();
  syncInterface();
}

function advanceStage() {
  const bonus = 125 + state.stage * 30;
  state.score += bonus;
  state.stage += 1;
  state.flash = 0.34;
  state.message = `Stage ${state.stage} unlocked. +${bonus} points.`;
  burst(
    LOGICAL_WIDTH / 2,
    CELL_HEIGHT * 0.55,
    ["#ffe18a", "#ff9d5c", "#58dcff"],
    20,
    0.85,
  );
  resetPlayer();
  state.invulnerable = 0.8;
  updateBestScore();
  syncOverlay();
  syncInterface();
}

function burst(x, y, palette, count, force = 1) {
  for (let index = 0; index < count; index += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(34, 150) * force;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - randomBetween(8, 36),
      gravity: randomBetween(60, 130),
      life: randomBetween(0.28, 0.72),
      size: randomBetween(1.5, 3.4) * force,
      color: palette[Math.floor(Math.random() * palette.length)],
    });
  }
}

function resetPlayer() {
  state.player.col = START_COL;
  state.player.row = START_ROW;
  state.player.fromCol = START_COL;
  state.player.fromRow = START_ROW;
  state.player.toCol = START_COL;
  state.player.toRow = START_ROW;
  state.player.progress = 1;
  state.player.bob = 0;
}

function updateBestScore() {
  if (state.score > state.best) {
    state.best = state.score;
    saveBestScore(state.best);
  }
}

function startOrResumeGame() {
  if (state.phase === "gameover") {
    restartGame();
    return;
  }

  if (state.phase === "paused") {
    state.phase = "running";
    state.message = "Back on the road.";
    state.lastFrame = performance.now();
    syncOverlay();
    syncInterface();
    return;
  }

  if (state.phase === "ready") {
    state.phase = "running";
    state.message = "Cross the road and keep moving.";
    state.lastFrame = performance.now();
    syncOverlay();
    syncInterface();
  }
}

function togglePause() {
  if (state.phase === "ready") {
    startOrResumeGame();
    return;
  }

  if (state.phase === "gameover") {
    restartGame();
    return;
  }

  if (state.phase === "running") {
    state.phase = "paused";
    state.message = "Paused. Press Pause or Space to continue.";
    syncOverlay();
    syncInterface();
    return;
  }

  if (state.phase === "paused") {
    state.phase = "running";
    state.message = "Back on the road.";
    state.lastFrame = performance.now();
    syncOverlay();
    syncInterface();
  }
}

function restartGame() {
  state.phase = "running";
  state.score = 0;
  state.stage = 1;
  state.lives = 3;
  state.goalTimer = 0;
  state.invulnerable = 0.75;
  state.flash = 0.32;
  state.shake = 0;
  state.time = 0;
  state.message = "Fresh run. Cross to the top curb.";
  state.vehicles = [];
  state.particles = [];
  state.lanes = createLaneState();
  state.player = createPlayer();
  state.lastFrame = performance.now();
  syncOverlay();
  syncInterface();
}

function handleKeyDown(event) {
  const key = event.code;
  const keys = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "Space",
    "KeyP",
    "KeyR",
    "Enter",
    "Escape",
  ]);

  if (!keys.has(key)) {
    return;
  }

  event.preventDefault();

  if (key === "Space") {
    togglePause();
    return;
  }

  if (key === "KeyP" || key === "Escape") {
    togglePause();
    return;
  }

  if (key === "KeyR") {
    restartGame();
    return;
  }

  if (key === "Enter") {
    startOrResumeGame();
    return;
  }

  if (key === "ArrowUp" || key === "KeyW") {
    hop(0, -1, true);
  } else if (key === "ArrowDown" || key === "KeyS") {
    hop(0, 1, true);
  } else if (key === "ArrowLeft" || key === "KeyA") {
    hop(-1, 0, true);
  } else if (key === "ArrowRight" || key === "KeyD") {
    hop(1, 0, true);
  }
}

function handleKeyUp() {
  // No held movement in Road Hopper, but the handler keeps the input model
  // symmetric with the other arcade tools in this repo.
}

function handleBlur() {
  if (state.phase === "running") {
    state.phase = "paused";
    state.message = "Paused while the window lost focus.";
    syncOverlay();
    syncInterface();
  }
}

function handleVisibilityChange() {
  if (document.hidden && state.phase === "running") {
    state.phase = "paused";
    state.message = "Paused while the tab is hidden.";
    syncOverlay();
    syncInterface();
  }
}

function handleCanvasPointerDown(event) {
  canvas.focus({ preventScroll: true });
  swipeState = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    startedAt: performance.now(),
    moved: false,
  };
  canvas.setPointerCapture(event.pointerId);
}

function handleCanvasPointerMove(event) {
  if (!swipeState || swipeState.pointerId !== event.pointerId) {
    return;
  }

  const dx = event.clientX - swipeState.x;
  const dy = event.clientY - swipeState.y;
  if (Math.hypot(dx, dy) > 20) {
    swipeState.moved = true;
  }
}

function handleCanvasPointerUp(event) {
  if (!swipeState || swipeState.pointerId !== event.pointerId) {
    return;
  }

  const dx = event.clientX - swipeState.x;
  const dy = event.clientY - swipeState.y;
  const distance = Math.hypot(dx, dy);

  if (distance > 24) {
    if (Math.abs(dx) > Math.abs(dy)) {
      hop(dx > 0 ? 1 : -1, 0, true);
    } else {
      hop(0, dy > 0 ? 1 : -1, true);
    }
  } else if (state.phase === "running") {
    hop(0, -1, true);
  } else {
    startOrResumeGame();
  }

  clearSwipeState();
}

function clearSwipeState() {
  swipeState = null;
}

function hop(dx, dy, canAutoStart = false) {
  if (state.phase === "gameover") {
    restartGame();
    return;
  }

  if (state.phase === "ready" && canAutoStart) {
    startOrResumeGame();
  } else if (state.phase === "paused" && canAutoStart) {
    startOrResumeGame();
  }

  if (state.phase !== "running" || state.goalTimer > 0) {
    return;
  }

  if (state.player.progress < 1) {
    return;
  }

  const nextCol = clamp(state.player.col + dx, 0, COLS - 1);
  const nextRow = clamp(state.player.row + dy, 0, ROWS - 1);
  if (nextCol === state.player.col && nextRow === state.player.row) {
    return;
  }

  state.player.fromCol = state.player.col;
  state.player.fromRow = state.player.row;
  state.player.toCol = nextCol;
  state.player.toRow = nextRow;
  state.player.progress = 0;
  state.player.col = nextCol;
  state.player.row = nextRow;
  state.player.bob = 0;

  const hopCenterX = cellCenterX(nextCol);
  const hopCenterY = cellCenterY(nextRow);
  burst(hopCenterX, hopCenterY + 10, ["#ffe18a", "#ff9d5c", "#58dcff"], 6, 0.55);

  if (nextRow === GOAL_ROW) {
    state.player.progress = 1;
    state.player.fromCol = nextCol;
    state.player.fromRow = nextRow;
    state.player.toCol = nextCol;
    state.player.toRow = nextRow;
    state.goalTimer = 0.48;
    state.message = `Curb secured. Stage ${state.stage + 1} is warming up.`;
    state.flash = 0.24;
    syncOverlay();
  } else {
    state.message = `Lane ${ROWS - nextRow - 1} crossed.`;
  }
}

function syncInterface() {
  scoreNode.textContent = formatInt(state.score);
  stageNode.textContent = formatInt(state.stage);
  livesNode.textContent = formatInt(state.lives);
  bestNode.textContent = formatInt(state.best);
  messageNode.textContent = state.message;
  tempoNode.textContent = `${getTempoMultiplier().toFixed(2)}x`;
  tempoBar.style.width = `${Math.min(100, 30 + (getTempoMultiplier() - 1) * 42)}%`;

  const stateLabel = (() => {
    switch (state.phase) {
      case "running":
        return `Running · Stage ${state.stage}`;
      case "paused":
        return `Paused · Score ${formatInt(state.score)}`;
      case "gameover":
        return "Game over";
      default:
        return "Ready";
    }
  })();

  statusNode.textContent = stateLabel;
  statusNode.className = `road-status ${state.phase === "running" || state.phase === "ready" ? "is-active" : ""}`;

  startButton.textContent = state.phase === "gameover"
    ? "Restart"
    : state.phase === "paused"
      ? "Resume"
      : "Start";

  pauseButton.textContent = state.phase === "paused" ? "Resume" : "Pause";
  pauseButton.disabled = state.phase === "ready" || state.phase === "gameover";
  touchPauseButton.textContent = state.phase === "paused" ? "Resume" : "Pause";
  touchPauseButton.disabled = state.phase === "ready" || state.phase === "gameover";
}

function syncOverlay() {
  const hidden = state.phase === "running";
  overlay.classList.toggle("is-hidden", hidden);

  if (state.phase === "ready") {
    overlayKicker.textContent = "Arcade run";
    overlayTitle.textContent = "Road Hopper";
    overlayCopy.textContent = "Dodge the traffic, cross the boulevard, and push your best score as the city gets meaner.";
  } else if (state.phase === "paused") {
    overlayKicker.textContent = "Paused";
    overlayTitle.textContent = "Traffic frozen";
    overlayCopy.textContent = "Press Pause, Space, or Start to get back into the crossing.";
  } else if (state.phase === "gameover") {
    overlayKicker.textContent = "Run ended";
    overlayTitle.textContent = "Road closed";
    overlayCopy.textContent = `Final score ${formatInt(state.score)}. Restart and try to beat your local best of ${formatInt(state.best)}.`;
  }
}

function renderScene(now = performance.now()) {
  context.save();
  context.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  if (state.shake > 0) {
    const intensity = state.shake * 7;
    const offsetX = Math.sin(now * 0.06) * intensity;
    const offsetY = Math.cos(now * 0.05) * intensity * 0.6;
    context.translate(offsetX, offsetY);
  }

  drawBackground(context);
  drawRoad(context);
  drawTraffic(context);
  drawPlayer(context);
  drawParticles(context);

  if (state.flash > 0) {
    context.save();
    context.globalAlpha = state.flash * 0.4;
    context.fillStyle = "#ffe18a";
    context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    context.restore();
  }

  context.restore();
}

function drawBackground(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  sky.addColorStop(0, "#09101d");
  sky.addColorStop(0.34, "#07121f");
  sky.addColorStop(1, "#05070d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  drawCitySilhouette(ctx);

  const glow = ctx.createRadialGradient(LOGICAL_WIDTH * 0.5, 84, 10, LOGICAL_WIDTH * 0.5, 84, 180);
  glow.addColorStop(0, "rgba(255, 221, 118, 0.18)");
  glow.addColorStop(0.38, "rgba(255, 157, 92, 0.08)");
  glow.addColorStop(1, "rgba(255, 157, 92, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, 160);
}

function drawCitySilhouette(ctx) {
  const blocks = [
    { x: 0, y: 0, w: 60, h: 92, alpha: 0.42 },
    { x: 50, y: 0, w: 46, h: 72, alpha: 0.38 },
    { x: 92, y: 0, w: 48, h: 108, alpha: 0.48 },
    { x: 144, y: 0, w: 74, h: 84, alpha: 0.34 },
    { x: 208, y: 0, w: 52, h: 96, alpha: 0.4 },
    { x: 258, y: 0, w: 102, h: 78, alpha: 0.36 },
  ];

  blocks.forEach((block, index) => {
    ctx.save();
    ctx.globalAlpha = block.alpha;
    ctx.fillStyle = index % 2 === 0 ? "#0f1628" : "#0a101d";
    ctx.fillRect(block.x, block.y, block.w, block.h);
    ctx.fillStyle = "rgba(255, 221, 118, 0.18)";
    for (let windowY = 8; windowY < block.h - 10; windowY += 14) {
      for (let windowX = 8; windowX < block.w - 8; windowX += 12) {
        const seed = block.x * 0.11 + windowX * 0.23 + windowY * 0.31 + index * 0.47;
        if (Math.sin(seed) > 0.16) {
          ctx.fillRect(block.x + windowX, block.y + windowY, 4, 6);
        }
      }
    }
    ctx.restore();
  });
}

function drawRoad(ctx) {
  const topSafe = 0;
  const roadTop = CELL_HEIGHT * 1;
  const roadBottom = CELL_HEIGHT * 9;
  const bottomSafe = CELL_HEIGHT * 10;

  ctx.fillStyle = "#131a25";
  ctx.fillRect(0, topSafe, LOGICAL_WIDTH, CELL_HEIGHT);
  ctx.fillRect(0, roadTop, LOGICAL_WIDTH, roadBottom - roadTop);
  ctx.fillRect(0, bottomSafe, LOGICAL_WIDTH, LOGICAL_HEIGHT - bottomSafe);

  ctx.fillStyle = "rgba(255, 221, 118, 0.18)";
  ctx.fillRect(0, CELL_HEIGHT * 0.9, LOGICAL_WIDTH, 4);
  ctx.fillRect(0, CELL_HEIGHT * 9, LOGICAL_WIDTH, 4);

  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fillRect(0, CELL_HEIGHT * 1.05, LOGICAL_WIDTH, 1.5);
  ctx.fillRect(0, CELL_HEIGHT * 8.95, LOGICAL_WIDTH, 1.5);

  for (let row = 1; row < ROWS - 1; row += 1) {
    const y = row * CELL_HEIGHT;
    ctx.strokeStyle = row === 1 || row === 9 ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(LOGICAL_WIDTH, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.globalAlpha = 0.7;
  for (let row = 2; row <= 8; row += 1) {
    const y = row * CELL_HEIGHT + CELL_HEIGHT / 2;
    ctx.strokeStyle = row % 2 === 0 ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 221, 118, 0.18)";
    ctx.setLineDash([18, 14]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(LOGICAL_WIDTH - 14, y);
    ctx.stroke();
  }
  ctx.restore();

  drawRoadside(ctx, 0, 0, CELL_HEIGHT, true);
  drawRoadside(ctx, 0, CELL_HEIGHT * 10, CELL_HEIGHT * 2, false);
  drawLaneSign(ctx);
}

function drawRoadside(ctx, x, y, height, topSide) {
  const stripeCount = topSide ? 4 : 5;
  for (let index = 0; index < stripeCount; index += 1) {
    const width = 60 + index * 10;
    const stripeX = topSide ? 20 + index * 52 : 18 + index * 58;
    const stripeY = topSide ? y + 8 : y + 16 + index * 8;
    ctx.fillStyle = index % 2 === 0 ? "rgba(255, 221, 118, 0.12)" : "rgba(89, 223, 255, 0.1)";
    roundRect(ctx, stripeX, stripeY, width, topSide ? 10 : 8, 999);
    ctx.fill();
  }

  if (topSide) {
    ctx.fillStyle = "rgba(255, 221, 118, 0.18)";
    ctx.fillRect(0, y + height - 4, LOGICAL_WIDTH, 4);
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    ctx.fillRect(0, y, LOGICAL_WIDTH, 4);
  }
}

function drawLaneSign(ctx) {
  ctx.save();
  ctx.translate(LOGICAL_WIDTH * 0.5, 24);
  ctx.fillStyle = "rgba(10, 16, 28, 0.72)";
  roundRect(ctx, -72, -10, 144, 22, 999);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 221, 118, 0.38)";
  ctx.lineWidth = 1;
  roundRect(ctx, -72, -10, 144, 22, 999);
  ctx.stroke();
  ctx.fillStyle = "#f6fbff";
  ctx.font = "700 11px DM Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`STAGE ${formatInt(state.stage)}`, 0, 1);
  ctx.restore();
}

function drawTraffic(ctx) {
  state.vehicles.forEach((vehicle) => {
    const config = VEHICLES[vehicle.variantKey];
    const glowAlpha = 0.26 + 0.12 * Math.sin(vehicle.wobble + state.time * 8);
    ctx.save();
    ctx.shadowColor = config.glow;
    ctx.shadowBlur = 16;
    ctx.translate(vehicle.x, vehicle.y);

    const bodyGradient = ctx.createLinearGradient(0, 0, vehicle.width, vehicle.height);
    bodyGradient.addColorStop(0, config.bodyA);
    bodyGradient.addColorStop(1, config.bodyB);
    ctx.fillStyle = bodyGradient;
    roundRect(ctx, 0, 0, vehicle.width, vehicle.height, Math.min(12, vehicle.height / 2));
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
    roundRect(ctx, 4, 3, vehicle.width - 8, Math.max(4, vehicle.height * 0.32), 6);
    ctx.fill();

    ctx.fillStyle = config.windows;
    roundRect(ctx, vehicle.width * 0.22, vehicle.height * 0.28, vehicle.width * 0.34, vehicle.height * 0.32, 4);
    ctx.fill();

    ctx.fillStyle = "rgba(5, 8, 14, 0.44)";
    ctx.fillRect(vehicle.width * 0.58, vehicle.height * 0.18, vehicle.width * 0.14, vehicle.height * 0.58);

    ctx.fillStyle = config.highlight;
    if (vehicle.direction > 0) {
      ctx.fillRect(vehicle.width - 6, 4, 5, vehicle.height - 8);
      ctx.fillStyle = "rgba(255, 239, 201, 0.9)";
      ctx.fillRect(vehicle.width - 2, 5, 2, vehicle.height - 10);
    } else {
      ctx.fillRect(1, 4, 5, vehicle.height - 8);
      ctx.fillStyle = "rgba(255, 239, 201, 0.9)";
      ctx.fillRect(0, 5, 2, vehicle.height - 10);
    }

    ctx.fillStyle = "rgba(3, 5, 10, 0.78)";
    ctx.fillRect(vehicle.width * 0.12, vehicle.height - 4, vehicle.width * 0.22, 3);
    ctx.fillRect(vehicle.width * 0.66, vehicle.height - 4, vehicle.width * 0.22, 3);

    ctx.globalAlpha = glowAlpha;
    ctx.fillStyle = config.glow;
    roundRect(ctx, -4, -4, vehicle.width + 8, vehicle.height + 8, 16);
    ctx.fill();
    ctx.restore();
  });
}

function drawPlayer(ctx) {
  const x = lerp(state.player.fromCol, state.player.toCol, state.player.progress) * CELL_WIDTH;
  const y = lerp(state.player.fromRow, state.player.toRow, state.player.progress) * CELL_HEIGHT;
  const centerX = x + CELL_WIDTH / 2;
  const centerY = y + CELL_HEIGHT / 2;
  const hop = Math.sin(Math.PI * state.player.progress);
  const bob = Math.sin(state.time * 9.5) * 1.6;
  const lift = -11 * hop + bob;
  const width = 24;
  const height = 28;
  const flicker = state.invulnerable > 0 && Math.floor(state.time * 16) % 2 === 0;
  const alpha = flicker ? 0.36 : 1;

  ctx.save();
  ctx.translate(centerX, centerY + lift);
  ctx.shadowColor = flicker ? "#ffe18a" : "#58dcff";
  ctx.shadowBlur = 18;
  ctx.globalAlpha = alpha;

  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  roundRect(ctx, -width / 2 - 4, -height / 2 - 2, width + 8, height + 8, 14);
  ctx.fill();

  const body = ctx.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  body.addColorStop(0, "#ffe18a");
  body.addColorStop(0.52, "#ff9d5c");
  body.addColorStop(1, "#ff6f9c");
  ctx.fillStyle = body;
  roundRect(ctx, -width / 2, -height / 2, width, height, 12);
  ctx.fill();

  ctx.fillStyle = "#0b1020";
  roundRect(ctx, -10, -10, 20, 11, 5);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  roundRect(ctx, -8, -2, 16, 7, 4);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
  roundRect(ctx, -width / 2 + 3, -height / 2 + 3, width - 6, 6, 999);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#07111b";
  ctx.beginPath();
  ctx.arc(-8, height / 2 - 1, 3.1, 0, Math.PI * 2);
  ctx.arc(8, height / 2 - 1, 3.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParticles(ctx) {
  state.particles.forEach((particle) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 1.8));
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function getPlayerHitbox() {
  const x = lerp(state.player.fromCol, state.player.toCol, state.player.progress) * CELL_WIDTH;
  const y = lerp(state.player.fromRow, state.player.toRow, state.player.progress) * CELL_HEIGHT;
  return {
    x: x + 7,
    y: y + 8,
    width: 26,
    height: 26,
  };
}

function getVehicleHitbox(vehicle) {
  return {
    x: vehicle.x + 2,
    y: vehicle.y + 2,
    width: vehicle.width - 4,
    height: vehicle.height - 4,
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function getTempoMultiplier() {
  return 1 + (state.stage - 1) * 0.08;
}

function formatInt(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function cellCenterX(col) {
  return col * CELL_WIDTH + CELL_WIDTH / 2;
}

function cellCenterY(row) {
  return row * CELL_HEIGHT + CELL_HEIGHT / 2;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
