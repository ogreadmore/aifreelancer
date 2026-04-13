import { formatNumber, initCommon } from "../common.js";

initCommon("brick-blitz");

const canvas = document.querySelector("#brick-canvas");
const stage = document.querySelector("#brick-stage");
const context = canvas.getContext("2d");

const scoreNode = document.querySelector("#brick-score");
const bestNode = document.querySelector("#brick-best");
const levelNode = document.querySelector("#brick-level");
const livesNode = document.querySelector("#brick-lives");
const comboNode = document.querySelector("#brick-combo");
const stateNode = document.querySelector("#brick-state");
const statusNode = document.querySelector("#brick-status");
const bannerNode = document.querySelector("#brick-banner");

const launchButtons = [
  document.querySelector("#brick-launch"),
  document.querySelector("#brick-launch-top"),
  document.querySelector("#brick-launch-touch"),
].filter(Boolean);

const pauseButtons = [
  document.querySelector("#brick-pause"),
  document.querySelector("#brick-pause-top"),
  document.querySelector("#brick-pause-touch"),
].filter(Boolean);

const restartButtons = [
  document.querySelector("#brick-restart"),
  document.querySelector("#brick-restart-top"),
].filter(Boolean);

const holdButtons = Array.from(document.querySelectorAll("#brick-touch-controls [data-action]"));
let resizeObserver = null;

const STORAGE_KEY = "aifreelancer.brick-blitz.best-score";
const MAX_LIVES = 5;
const MAX_BANNER_DURATION = 1700;
const WORLD_ASPECT = 0.7;
const BALL_RADIUS = 8;
const PADDLE_HEIGHT = 16;
const PADDLE_MARGIN_BOTTOM = 44;
const BRICK_GAP_X = 8;
const BRICK_GAP_Y = 8;
const BRICK_LEFT_RIGHT_MARGIN = 26;
const BRICK_TOP_MARGIN = 74;
const BRICK_COLS = 10;
const EFFECT_DURATION_MS = 12000;
const SLOW_DURATION_MS = 10000;
const COMBO_WINDOW_MS = 1200;
const POWERUP_SPEED = 132;
const POWERUP_RADIUS = 13;
const PARTICLE_CAP = 240;
const STAR_CAP = 96;
const BALL_TRAIL_CAP = 14;
const MAX_BALL_SPEED = 760;
const MIN_BALL_SPEED = 340;

const LEVEL_PATTERNS = [
  [
    "##########",
    "##########",
    "##########",
    "##########",
    "##########",
  ],
  [
    "##..##..##",
    "##########",
    "..######..",
    "##########",
    "##..##..##",
  ],
  [
    "..######..",
    ".########.",
    "##########",
    ".########.",
    "..######..",
  ],
  [
    "###....###",
    "####..####",
    "##########",
    "####..####",
    "###....###",
  ],
  [
    "..##**##..",
    ".###..###.",
    "##########",
    ".###..###.",
    "..##**##..",
  ],
  [
    "##########",
    "#..####..#",
    "##..##..##",
    "###....###",
    "####..####",
  ],
  [
    "##########",
    "#........#",
    "#.######.#",
    "#........#",
    "##########",
  ],
  [
    "##......##",
    "###....###",
    "####..####",
    "###....###",
    "##......##",
  ],
];

const state = {
  width: 0,
  height: 0,
  dpr: Math.max(1, window.devicePixelRatio || 1),
  running: true,
  paused: false,
  gameOver: false,
  level: 1,
  score: 0,
  bestScore: loadBestScore(),
  lives: 3,
  combo: 1,
  lastBrickHitAt: 0,
  levelClearAt: 0,
  banner: {
    text: "Press Space or Launch to begin",
    tone: "alert",
    visible: true,
    sticky: true,
    until: Infinity,
  },
  paddle: {
    x: 0,
    y: 0,
    width: 120,
    height: PADDLE_HEIGHT,
    baseWidth: 120,
    velocity: 0,
  },
  ball: {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    attached: true,
    speedBase: 420,
    trail: [],
  },
  bricks: [],
  particles: [],
  powerUps: [],
  stars: [],
  input: {
    left: false,
    right: false,
    pointerActive: false,
    pointerId: null,
    pointerX: 0,
  },
  effects: {
    wideUntil: 0,
    slowUntil: 0,
  },
  shake: 0,
  flash: 0,
  lastFrame: performance.now(),
  frameToken: 0,
};

bindControls();
resizeStage();
startNewGame();
requestAnimationFrame(loop);

function bindControls() {
  launchButtons.forEach((button) => {
    button.addEventListener("click", handlePrimaryAction);
  });

  pauseButtons.forEach((button) => {
    button.addEventListener("click", togglePause);
  });

  restartButtons.forEach((button) => {
    button.addEventListener("click", restartGame);
  });

  holdButtons.forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const action = button.dataset.action;
      if (action === "left") {
        state.input.left = true;
      } else if (action === "right") {
        state.input.right = true;
      }
      button.setAttribute("aria-pressed", "true");
    });

    button.addEventListener("pointerup", stopHold);
    button.addEventListener("pointercancel", stopHold);
    button.addEventListener("pointerleave", stopHold);
    button.addEventListener("lostpointercapture", stopHold);
  });

  canvas.addEventListener("pointerdown", handleCanvasPointerDown);
  canvas.addEventListener("pointermove", handleCanvasPointerMove);
  canvas.addEventListener("pointerup", releaseCanvasPointer);
  canvas.addEventListener("pointercancel", releaseCanvasPointer);
  canvas.addEventListener("pointerleave", releaseCanvasPointer);
  canvas.addEventListener("lostpointercapture", releaseCanvasPointer);

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", releaseAllInputs);
  window.addEventListener("resize", resizeStage);

  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(resizeStage);
    resizeObserver.observe(stage);
  }
}

function stopHold(event) {
  const button = event.currentTarget;
  const action = button.dataset.action;
  if (action === "left") {
    state.input.left = false;
  } else if (action === "right") {
    state.input.right = false;
  }
  button.setAttribute("aria-pressed", "false");
}

function handleCanvasPointerDown(event) {
  if (!event.isPrimary) {
    return;
  }

  canvas.setPointerCapture(event.pointerId);
  state.input.pointerActive = true;
  state.input.pointerId = event.pointerId;
  state.input.pointerX = pointerToWorldX(event.clientX);
  movePaddleToPointer();
}

function handleCanvasPointerMove(event) {
  if (!state.input.pointerActive || state.input.pointerId !== event.pointerId) {
    return;
  }

  state.input.pointerX = pointerToWorldX(event.clientX);
  movePaddleToPointer();
}

function releaseCanvasPointer(event) {
  if (state.input.pointerId !== event.pointerId) {
    return;
  }

  state.input.pointerActive = false;
  state.input.pointerId = null;
}

function releaseAllInputs() {
  state.input.left = false;
  state.input.right = false;
  state.input.pointerActive = false;
  state.input.pointerId = null;

  holdButtons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
  });
}

function handleKeyDown(event) {
  if (event.repeat && (event.key === " " || event.key === "Spacebar")) {
    event.preventDefault();
    return;
  }

  switch (event.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      event.preventDefault();
      state.input.left = true;
      break;
    case "ArrowRight":
    case "d":
    case "D":
      event.preventDefault();
      state.input.right = true;
      break;
    case " ":
    case "Spacebar":
      event.preventDefault();
      handlePrimaryAction();
      break;
    case "Enter":
      event.preventDefault();
      handlePrimaryAction();
      break;
    case "p":
    case "P":
      event.preventDefault();
      togglePause();
      break;
    case "r":
    case "R":
      event.preventDefault();
      restartGame();
      break;
    default:
      break;
  }
}

function handleKeyUp(event) {
  switch (event.key) {
    case "ArrowLeft":
    case "a":
    case "A":
      state.input.left = false;
      break;
    case "ArrowRight":
    case "d":
    case "D":
      state.input.right = false;
      break;
    default:
      break;
  }
}

function handlePrimaryAction() {
  if (state.gameOver) {
    restartGame();
    return;
  }

  if (state.paused) {
    togglePause(false);
    return;
  }

  if (state.ball.attached) {
    launchBall();
    return;
  }

  togglePause();
}

function togglePause(nextPaused) {
  if (state.gameOver) {
    return;
  }

  state.paused = typeof nextPaused === "boolean" ? nextPaused : !state.paused;

  if (state.paused) {
    showBanner("Paused", "alert", Infinity, true);
    flashStatus("Paused. Press Space, P, or Pause to keep the run going.", "alert", 1400);
  } else {
    hideBanner();
    flashStatus(getStatusCopy(), "neutral", 1400);
  }

  syncButtons();
}

function restartGame() {
  state.level = 1;
  state.score = 0;
  state.lives = 3;
  state.combo = 1;
  state.lastBrickHitAt = 0;
  state.levelClearAt = 0;
  state.gameOver = false;
  state.paused = false;
  state.effects.wideUntil = 0;
  state.effects.slowUntil = 0;
  state.shake = 0;
  state.flash = 0;
  state.particles = [];
  state.powerUps = [];
  buildLevel();
  placePaddle();
  resetBallOnPaddle();
  showBanner("Press Space or Launch to begin", "alert", Infinity, true);
  flashStatus("Fresh run started. Break the opening wall and chase the combo.", "neutral", 1500);
  syncHud();
  syncButtons();
}

function startNewGame() {
  buildLevel();
  placePaddle();
  resetBallOnPaddle();
  showBanner("Press Space or Launch to begin", "alert", Infinity, true);
  flashStatus("The ball is parked on the paddle. Move, then launch.", "neutral", 1500);
  syncHud();
  syncButtons();
}

function resizeStage() {
  const computed = window.getComputedStyle(stage);
  const paddingX = (parseFloat(computed.paddingLeft) || 0) + (parseFloat(computed.paddingRight) || 0);
  const contentWidth = Math.max(280, Math.floor(stage.clientWidth - paddingX));
  const nextHeight = clamp(Math.round(contentWidth * WORLD_ASPECT), 340, 680);

  state.width = contentWidth;
  state.height = nextHeight;
  state.dpr = Math.max(1, window.devicePixelRatio || 1);

  canvas.style.width = `${contentWidth}px`;
  canvas.style.height = `${nextHeight}px`;
  canvas.width = Math.round(contentWidth * state.dpr);
  canvas.height = Math.round(nextHeight * state.dpr);
  context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

  rebuildStars();
  placePaddle();
  layoutBricks();
  clampBallToBounds();
}

function rebuildStars() {
  const count = clamp(Math.round((state.width * state.height) / 5200), 48, STAR_CAP);
  state.stars = Array.from({ length: count }, (_, index) => ({
    x: rand(0, state.width),
    y: rand(0, state.height),
    radius: rand(0.8, 2.5),
    speed: rand(10, 42) + (index % 3) * 5,
    alpha: rand(0.3, 0.95),
    twinkle: rand(0.8, 2.4),
    phase: rand(0, Math.PI * 2),
  }));
}

function buildLevel() {
  const template = LEVEL_PATTERNS[(state.level - 1) % LEVEL_PATTERNS.length];
  const cycle = Math.floor((state.level - 1) / LEVEL_PATTERNS.length);
  const mirrored = cycle % 2 === 1;
  const baseHp = clamp(1 + Math.floor((state.level - 1) / 4), 1, 3);

  state.bricks = template.flatMap((row, rowIndex) => {
    const nextRow = mirrored ? row.split("").reverse().join("") : row;
    return nextRow.split("").flatMap((cell, colIndex) => {
      if (cell === ".") {
        return [];
      }

      const bonus = cell === "*";
      return [{
        row: rowIndex,
        col: colIndex,
        hp: clamp(baseHp + (bonus ? 1 : 0), 1, 4),
        maxHp: clamp(baseHp + (bonus ? 1 : 0), 1, 4),
        bonus,
        x: 0,
        y: 0,
        w: 0,
        h: 0,
      }];
    });
  });

  layoutBricks();
}

function layoutBricks() {
  if (!state.bricks.length) {
    return;
  }

  const rows = Math.max(...state.bricks.map((brick) => brick.row)) + 1;
  const brickWidth = (state.width - (BRICK_LEFT_RIGHT_MARGIN * 2) - (BRICK_GAP_X * (BRICK_COLS - 1))) / BRICK_COLS;
  const brickHeight = clamp(Math.round(state.height * 0.038), 22, 28);
  const startX = BRICK_LEFT_RIGHT_MARGIN;
  const startY = BRICK_TOP_MARGIN;

  state.bricks.forEach((brick) => {
    brick.w = brickWidth;
    brick.h = brickHeight;
    brick.x = startX + brick.col * (brickWidth + BRICK_GAP_X);
    brick.y = startY + brick.row * (brickHeight + BRICK_GAP_Y);
  });

  const safeTop = startY + rows * (brickHeight + BRICK_GAP_Y) + 10;
  state.paddle.y = state.height - PADDLE_MARGIN_BOTTOM;
  state.ball.radius = BALL_RADIUS;
  state.ball.speedBase = clamp(408 + (state.level - 1) * 18, MIN_BALL_SPEED, MAX_BALL_SPEED);
  state.paddle.baseWidth = clamp(state.width * 0.17, 96, 152);
  state.paddle.width = getPaddleWidth();
  state.paddle.height = PADDLE_HEIGHT;

  if (state.ball.attached) {
    resetBallOnPaddle();
  } else {
    clampBallToBounds();
  }

  state.brickCeiling = safeTop;
}

function placePaddle() {
  state.paddle.baseWidth = clamp(state.width * 0.17, 96, 152);
  state.paddle.width = getPaddleWidth();
  state.paddle.height = PADDLE_HEIGHT;
  state.paddle.y = state.height - PADDLE_MARGIN_BOTTOM;
  if (!Number.isFinite(state.paddle.x) || state.paddle.x <= 0) {
    state.paddle.x = (state.width - state.paddle.width) / 2;
  }
  state.paddle.x = clamp(state.paddle.x, 14, Math.max(14, state.width - state.paddle.width - 14));
}

function resetBallOnPaddle() {
  state.ball.attached = true;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.trail.length = 0;
  state.ball.x = state.paddle.x + (state.paddle.width / 2);
  state.ball.y = state.paddle.y - state.ball.radius - 1;
}

function launchBall() {
  if (!state.ball.attached || state.paused || state.gameOver) {
    return;
  }

  const bias = state.input.left && !state.input.right
    ? -0.35
    : state.input.right && !state.input.left
      ? 0.35
      : rand(-0.18, 0.18);
  const angle = bias * Math.PI * 0.42;
  const speed = getBallSpeed();

  state.ball.attached = false;
  state.ball.vx = Math.sin(angle) * speed;
  state.ball.vy = -Math.cos(angle) * speed;
  state.banner.visible = false;
  flashStatus("Ball launched. Keep the angle alive and chase the glow.", "neutral", 1300);
  syncButtons();
}

function getBallSpeed() {
  let speed = state.ball.speedBase;
  if (performance.now() < state.effects.slowUntil) {
    speed *= 0.82;
  }
  return clamp(speed, MIN_BALL_SPEED, MAX_BALL_SPEED);
}

function getPaddleWidth() {
  let width = state.paddle.baseWidth;
  if (performance.now() < state.effects.wideUntil) {
    width *= 1.38;
  }
  return clamp(width, 84, 176);
}

function movePaddleToPointer() {
  if (!state.input.pointerActive) {
    return;
  }

  state.paddle.x = clamp(
    state.input.pointerX - (state.paddle.width / 2),
    14,
    Math.max(14, state.width - state.paddle.width - 14),
  );

  if (state.ball.attached) {
    state.ball.x = state.paddle.x + (state.paddle.width / 2);
    state.ball.y = state.paddle.y - state.ball.radius - 1;
  }
}

function pointerToWorldX(clientX) {
  const rect = canvas.getBoundingClientRect();
  return clamp(clientX - rect.left, 0, state.width);
}

function flashStatus(message, tone = "neutral", duration = MAX_BANNER_DURATION) {
  statusNode.dataset.tone = tone;
  statusNode.textContent = message;
  if (duration === Infinity) {
    return;
  }
  window.clearTimeout(state.statusTimer);
  state.statusTimer = window.setTimeout(() => {
    statusNode.dataset.tone = "";
    statusNode.textContent = getStatusCopy();
  }, duration);
}

function showBanner(message, tone = "neutral", duration = MAX_BANNER_DURATION, sticky = false) {
  state.banner.text = message;
  state.banner.tone = tone;
  state.banner.visible = true;
  state.banner.sticky = sticky || duration === Infinity;
  state.banner.until = state.banner.sticky ? Infinity : performance.now() + duration;
  syncBanner();
}

function hideBanner() {
  state.banner.visible = false;
  state.banner.sticky = false;
  syncBanner();
}

function syncBanner() {
  const shouldShow = state.banner.visible && (state.banner.sticky || performance.now() <= state.banner.until);
  bannerNode.textContent = state.banner.text;
  bannerNode.dataset.tone = state.banner.tone;
  bannerNode.classList.toggle("is-hidden", !shouldShow);
}

function getStatusCopy() {
  if (state.gameOver) {
    return "Game over. Restart to try a new run and beat your best score.";
  }

  if (state.paused) {
    return "Paused. Press Space, P, or Pause to resume the run.";
  }

  const effectBits = [];
  const now = performance.now();

  if (now < state.effects.wideUntil) {
    effectBits.push(`Wide paddle ${describeSeconds(state.effects.wideUntil - now)}`);
  }

  if (now < state.effects.slowUntil) {
    effectBits.push(`Slow field ${describeSeconds(state.effects.slowUntil - now)}`);
  }

  if (state.ball.attached) {
    effectBits.unshift("Ball parked on the paddle. Launch when ready.");
  } else {
    effectBits.unshift("The ball is in play. Keep it alive and stay greedy for combos.");
  }

  return effectBits.join(" ");
}

function describeSeconds(ms) {
  return `${Math.max(0, Math.ceil(ms / 1000))}s`;
}

function syncHud() {
  scoreNode.textContent = formatNumber(Math.round(state.score), { maximumFractionDigits: 0 });
  bestNode.textContent = formatNumber(Math.round(state.bestScore), { maximumFractionDigits: 0 });
  levelNode.textContent = formatNumber(state.level, { maximumFractionDigits: 0 });
  livesNode.textContent = formatNumber(state.lives, { maximumFractionDigits: 0 });
  comboNode.textContent = `x${Math.max(1, Math.round(state.combo))}`;
  stateNode.textContent = state.gameOver
    ? "Game Over"
    : state.paused
      ? "Paused"
      : state.ball.attached
        ? "Ready"
        : "Playing";
}

function syncButtons() {
  const primaryLabel = state.gameOver
    ? "Restart"
      : state.paused
        ? "Resume"
        : state.ball.attached
        ? "Launch"
        : "Pause";

  launchButtons.forEach((button) => {
    button.textContent = primaryLabel;
    button.disabled = false;
  });

  pauseButtons.forEach((button) => {
    button.textContent = state.paused ? "Resume" : "Pause";
  });
}

function loseLife() {
  state.lives -= 1;
  state.combo = 1;
  state.lastBrickHitAt = 0;

  if (state.lives <= 0) {
    state.lives = 0;
    state.gameOver = true;
    state.paused = false;
    state.ball.attached = true;
    resetBallOnPaddle();
    showBanner("Game over", "danger", Infinity, true);
    flashStatus("Game over. Smash Restart or press R to try again.", "danger", 1800);
    syncHud();
    syncButtons();
    return;
  }

  resetBallOnPaddle();
  showBanner("Life lost", "alert", 1200);
  flashStatus("A life is gone, but the next ball is ready to launch.", "alert", 1400);
  syncHud();
  syncButtons();
}

function clearLevel() {
  state.score += Math.round(250 + state.level * 110);
  state.level += 1;
  state.combo = 1;
  state.lastBrickHitAt = 0;
  state.levelClearAt = performance.now() + 1200;
  state.ball.attached = true;
  resetBallOnPaddle();
  showBanner(`Level ${state.level - 1} cleared`, "alert", 1200);
  flashStatus("Level cleared. New brick wall incoming.", "alert", 1500);
  saveBestScore();
  syncHud();
  syncButtons();
}

function advanceLevel() {
  buildLevel();
  resetBallOnPaddle();
  showBanner(`Level ${state.level}`, "alert", 1400, false);
  flashStatus("New wall ready. The ball is back on the paddle.", "neutral", 1200);
  syncHud();
  syncButtons();
}

function saveBestScore() {
  if (state.score <= state.bestScore) {
    return;
  }

  state.bestScore = state.score;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Math.round(state.bestScore)));
  } catch {
    return;
  }
}

function loadBestScore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function loop(now) {
  const dt = clamp((now - state.lastFrame) / 1000, 0, 0.033);
  state.lastFrame = now;

  update(dt, now);
  render(now, dt);

  if (state.running) {
    state.frameToken = requestAnimationFrame(loop);
  }
}

function update(dt, now) {
  if (state.levelClearAt && now >= state.levelClearAt && !state.gameOver) {
    state.levelClearAt = 0;
    advanceLevel();
  }

  state.paddle.width = getPaddleWidth();
  state.paddle.height = PADDLE_HEIGHT;
  state.paddle.y = state.height - PADDLE_MARGIN_BOTTOM;

  const oldPaddleX = state.paddle.x;

  if (!state.paused && !state.gameOver) {
    if (state.input.pointerActive) {
      movePaddleToPointer();
    } else {
      const direction = (state.input.right ? 1 : 0) - (state.input.left ? 1 : 0);
      const paddleSpeed = clamp(state.width * 1.38, 620, 920);
      state.paddle.x += direction * paddleSpeed * dt;
    }
  }

  state.paddle.x = clamp(
    state.paddle.x,
    14,
    Math.max(14, state.width - state.paddle.width - 14),
  );
  state.paddle.velocity = dt > 0 ? (state.paddle.x - oldPaddleX) / dt : 0;

  if (state.ball.attached) {
    state.ball.x = state.paddle.x + (state.paddle.width / 2);
    state.ball.y = state.paddle.y - state.ball.radius - 1;
  }

  if (!state.paused && !state.gameOver && !state.ball.attached) {
    const targetSpeed = getBallSpeed();
    const steps = Math.max(1, Math.ceil((Math.max(Math.abs(state.ball.vx), Math.abs(state.ball.vy)) * dt) / 14));
    const stepDt = dt / steps;

    for (let step = 0; step < steps; step += 1) {
      state.ball.x += state.ball.vx * stepDt;
      state.ball.y += state.ball.vy * stepDt;
      state.ball.trail.unshift({ x: state.ball.x, y: state.ball.y, life: 1 });
      if (state.ball.trail.length > BALL_TRAIL_CAP) {
        state.ball.trail.length = BALL_TRAIL_CAP;
      }

      resolveWallCollisions();
      resolvePaddleCollision(targetSpeed, now);
      resolveBrickCollisions(targetSpeed, now, stepDt);
      resolvePowerUpCollisions(now);

      if (state.ball.y - state.ball.radius > state.height + 10) {
        loseLife();
        break;
      }
    }

    normalizeBallVelocity(targetSpeed);
  }

  updateParticles(dt);
  updatePowerUps(dt);
  updateEffects(now);
  updateCombo(now);
  updateStatus(now);
  updateBannerState(now);
  syncHud();
}

function updateCombo(now) {
  if (!state.lastBrickHitAt) {
    state.combo = 1;
    return;
  }

  if (!state.ball.attached && now - state.lastBrickHitAt > COMBO_WINDOW_MS * 1.65 && state.combo > 1) {
    state.combo = 1;
  }
}

function updateStatus(now) {
  let message = getStatusCopy();

  if (state.gameOver) {
    message = "Game over. Restart when you are ready for another run.";
  } else if (state.paused) {
    message = "Paused. Press Space, P, or the Pause button to resume.";
  } else if (state.ball.attached) {
    message = "Ball ready. Move the paddle and launch when the angle looks right.";
  }

  const effectMessages = [];

  if (now < state.effects.wideUntil) {
    effectMessages.push(`Wide paddle active for ${describeSeconds(state.effects.wideUntil - now)}.`);
  }

  if (now < state.effects.slowUntil) {
    effectMessages.push(`Slow field active for ${describeSeconds(state.effects.slowUntil - now)}.`);
  }

  if (effectMessages.length) {
    message += ` ${effectMessages.join(" ")}`;
  }

  statusNode.dataset.tone = state.gameOver ? "danger" : state.paused ? "alert" : "neutral";
  statusNode.textContent = message;
}

function updateBannerState(now) {
  if (!state.banner.sticky && state.banner.visible && now > state.banner.until) {
    state.banner.visible = false;
  }

  syncBanner();
}

function updateEffects(now) {
  if (now >= state.effects.wideUntil && state.paddle.width !== state.paddle.baseWidth) {
    state.paddle.width = getPaddleWidth();
  }
}

function updateParticles(dt) {
  if (!state.particles.length) {
    return;
  }

  state.particles.forEach((particle) => {
    particle.life -= dt * particle.decay;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += particle.gravity * dt;
  });

  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function updatePowerUps(dt) {
  if (!state.powerUps.length) {
    return;
  }

  state.powerUps.forEach((powerUp) => {
    powerUp.y += powerUp.speed * dt;
    powerUp.spin += dt * 3.8;
  });

  state.powerUps = state.powerUps.filter((powerUp) => powerUp.y - powerUp.radius <= state.height + 18);
}

function resolveWallCollisions() {
  if (state.ball.x - state.ball.radius <= 0) {
    state.ball.x = state.ball.radius + 0.1;
    state.ball.vx = Math.abs(state.ball.vx);
  }

  if (state.ball.x + state.ball.radius >= state.width) {
    state.ball.x = state.width - state.ball.radius - 0.1;
    state.ball.vx = -Math.abs(state.ball.vx);
  }

  if (state.ball.y - state.ball.radius <= 0) {
    state.ball.y = state.ball.radius + 0.1;
    state.ball.vy = Math.abs(state.ball.vy);
  }
}

function resolvePaddleCollision(targetSpeed) {
  if (state.ball.vy <= 0) {
    return;
  }

  const paddle = state.paddle;
  const ball = state.ball;
  const paddleTop = paddle.y;
  const paddleLeft = paddle.x;
  const paddleRight = paddle.x + paddle.width;
  const intersectsX = ball.x + ball.radius >= paddleLeft && ball.x - ball.radius <= paddleRight;
  const intersectsY = ball.y + ball.radius >= paddleTop && ball.y - ball.radius <= paddleTop + paddle.height;

  if (!intersectsX || !intersectsY) {
    return;
  }

  ball.y = paddleTop - ball.radius - 0.2;
  const relative = clamp((ball.x - (paddleLeft + paddle.width / 2)) / (paddle.width / 2), -1, 1);
  const paddleInfluence = clamp(paddle.velocity / 820, -0.35, 0.35);
  const angle = clamp(relative * 0.96 + paddleInfluence, -0.96, 0.96) * (Math.PI / 2.5);

  ball.vx = Math.sin(angle) * targetSpeed;
  ball.vy = -Math.cos(angle) * targetSpeed;
  normalizeBallVelocity(targetSpeed);
  state.shake = Math.min(12, state.shake + 2.5);
  state.flash = Math.min(1, state.flash + 0.2);
  state.combo = 1;
  state.lastBrickHitAt = 0;
  syncButtons();
}

function resolveBrickCollisions(targetSpeed, now, stepDt) {
  const ball = state.ball;

  for (let index = 0; index < state.bricks.length; index += 1) {
    const brick = state.bricks[index];
    if (brick.hp <= 0 || !circleIntersectsRect(ball, brick)) {
      continue;
    }

    const previousX = ball.x - (ball.vx * stepDt);
    const previousY = ball.y - (ball.vy * stepDt);
    const fromLeft = previousX < brick.x;
    const fromRight = previousX > brick.x + brick.w;
    const fromTop = previousY < brick.y;
    const fromBottom = previousY > brick.y + brick.h;

    if (fromLeft || fromRight) {
      ball.vx *= -1;
    } else if (fromTop || fromBottom) {
      ball.vy *= -1;
    } else if (Math.abs(ball.vx) > Math.abs(ball.vy)) {
      ball.vx *= -1;
    } else {
      ball.vy *= -1;
    }

    ball.x = clamp(ball.x, brick.x - ball.radius - 0.4, brick.x + brick.w + ball.radius + 0.4);
    ball.y = clamp(ball.y, brick.y - ball.radius - 0.4, brick.y + brick.h + ball.radius + 0.4);

    brick.hp -= 1;
    hitBrick(brick, now);
    normalizeBallVelocity(targetSpeed);
    break;
  }

  if (state.bricks.every((brick) => brick.hp <= 0)) {
    clearLevel();
  }
}

function resolvePowerUpCollisions(now) {
  if (!state.powerUps.length) {
    return;
  }

  const paddle = state.paddle;
  const paddleRect = {
    x: paddle.x,
    y: paddle.y,
    w: paddle.width,
    h: paddle.height,
  };

  for (let index = state.powerUps.length - 1; index >= 0; index -= 1) {
    const powerUp = state.powerUps[index];
    const intersects = circleIntersectsRect(powerUp, paddleRect);
    if (!intersects) {
      continue;
    }

    state.powerUps.splice(index, 1);
    applyPowerUp(powerUp.type, now);
  }
}

function applyPowerUp(type, now) {
  switch (type) {
    case "wide":
      state.effects.wideUntil = Math.max(state.effects.wideUntil, now) + EFFECT_DURATION_MS;
      showBanner("Wide paddle engaged", "alert", 1000);
      flashStatus("Wide paddle engaged. You have more room to save the run.", "alert", 1200);
      break;
    case "slow":
      state.effects.slowUntil = Math.max(state.effects.slowUntil, now) + SLOW_DURATION_MS;
      showBanner("Slow field activated", "alert", 1000);
      flashStatus("Slow field activated. The ball is easier to read for a few seconds.", "alert", 1200);
      break;
    case "life":
      state.lives = Math.min(MAX_LIVES, state.lives + 1);
      showBanner("Extra life collected", "alert", 1000);
      flashStatus("Extra life collected. That safety net could matter later.", "alert", 1200);
      break;
    case "bonus":
      state.score += 500;
      showBanner("Bonus score", "neutral", 900);
      flashStatus("Bonus score collected from a glowing brick.", "neutral", 900);
      break;
    default:
      break;
  }

  saveBestScore();
  syncHud();
}

function hitBrick(brick, now) {
  const comboWindow = now - state.lastBrickHitAt <= COMBO_WINDOW_MS;
  state.combo = comboWindow ? Math.min(9, state.combo + 1) : 1;
  state.lastBrickHitAt = now;
  state.shake = Math.min(14, state.shake + 3.2);
  state.flash = Math.min(1, state.flash + 0.16);

  const scoreBase = brick.bonus ? 220 : 95 + (brick.maxHp - brick.hp) * 50 + Math.max(0, state.level - 1) * 10;
  const comboMultiplier = Math.max(1, state.combo);
  const points = Math.round(scoreBase * comboMultiplier);
  state.score += points;

  if (brick.hp <= 0) {
    createImpact(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.bonus ? "#ffd166" : null, brick.bonus);
    if (brick.bonus || Math.random() < 0.22 + Math.min(0.08, state.level * 0.01)) {
      spawnPowerUp(brick.x + brick.w / 2, brick.y + brick.h / 2, choosePowerUpType(brick));
    }
  } else {
    createImpact(brick.x + brick.w / 2, brick.y + brick.h / 2, "#6bf0ff", false);
  }

  saveBestScore();
  if (brick.bonus || state.combo >= 3 && state.combo % 3 === 0) {
    showBanner(`${state.combo}x combo`, "alert", 700);
  }
  if (brick.bonus) {
    flashStatus("A bonus brick popped. Watch for the glowing drop.", "alert", 1000);
  }
}

function choosePowerUpType(brick) {
  if (brick.bonus) {
    return Math.random() < 0.5 ? "wide" : "slow";
  }

  const roll = Math.random();
  if (roll < 0.42) {
    return "wide";
  }
  if (roll < 0.78) {
    return "slow";
  }
  if (roll < 0.92) {
    return "life";
  }
  return "bonus";
}

function createImpact(x, y, color = null, bonus = false) {
  const sparks = bonus ? 22 : 14;
  for (let index = 0; index < sparks; index += 1) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(60, bonus ? 200 : 160);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: bonus ? rand(0.7, 1.15) : rand(0.45, 0.9),
      decay: bonus ? rand(0.85, 1.35) : rand(1.0, 1.65),
      gravity: rand(120, 230),
      radius: rand(1.5, bonus ? 3.2 : 2.4),
      color: color || (bonus ? "#ffd166" : "rgba(106, 240, 255, 0.95)"),
    });
  }

  if (state.particles.length > PARTICLE_CAP) {
    state.particles.splice(0, state.particles.length - PARTICLE_CAP);
  }
}

function spawnPowerUp(x, y, type) {
  const label = type === "wide" ? "W" : type === "slow" ? "S" : type === "life" ? "+1" : "B";
  state.powerUps.push({
    x,
    y,
    radius: POWERUP_RADIUS,
    speed: POWERUP_SPEED + rand(-12, 16),
    type,
    label,
    spin: rand(0, Math.PI * 2),
  });
}

function circleIntersectsRect(circle, rect) {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return (dx * dx) + (dy * dy) <= circle.radius * circle.radius;
}

function normalizeBallVelocity(targetSpeed) {
  const speed = Math.hypot(state.ball.vx, state.ball.vy);
  if (!speed) {
    return;
  }

  const scale = targetSpeed / speed;
  state.ball.vx *= scale;
  state.ball.vy *= scale;
}

function clampBallToBounds() {
  if (!state.ball) {
    return;
  }

  state.ball.x = clamp(state.ball.x || state.width / 2, BALL_RADIUS, Math.max(BALL_RADIUS, state.width - BALL_RADIUS));
  state.ball.y = clamp(state.ball.y || state.height / 2, BALL_RADIUS, Math.max(BALL_RADIUS, state.height - BALL_RADIUS));
}

function render(now, dt) {
  context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  context.clearRect(0, 0, state.width, state.height);

  const shake = state.shake > 0 ? state.shake : 0;
  if (shake > 0.01) {
    context.save();
    context.translate(rand(-shake, shake), rand(-shake, shake));
  } else {
    context.save();
  }

  drawBackground(now, dt);
  drawBricks();
  drawParticles();
  drawPowerUps();
  drawPaddle();
  drawBall();
  drawOverlay(now, dt);

  context.restore();

  if (state.shake > 0) {
    state.shake = Math.max(0, state.shake - dt * 26);
  }

  syncBanner();
  syncButtons();
}

function drawBackground(now, dt) {
  const gradient = context.createLinearGradient(0, 0, 0, state.height);
  gradient.addColorStop(0, "#091120");
  gradient.addColorStop(0.56, "#0d1428");
  gradient.addColorStop(1, "#070b15");
  context.fillStyle = gradient;
  context.fillRect(0, 0, state.width, state.height);

  const haze = context.createRadialGradient(state.width * 0.5, state.height * 0.18, 24, state.width * 0.5, state.height * 0.24, state.width * 0.7);
  haze.addColorStop(0, "rgba(11, 132, 255, 0.16)");
  haze.addColorStop(0.42, "rgba(245, 83, 79, 0.08)");
  haze.addColorStop(1, "transparent");
  context.fillStyle = haze;
  context.fillRect(0, 0, state.width, state.height);

  context.save();
  state.stars.forEach((star) => {
    const twinkle = 0.45 + Math.sin(now / 900 * star.twinkle + star.phase) * 0.18;
    context.globalAlpha = clamp(star.alpha * twinkle, 0.14, 0.98);
    context.fillStyle = "white";
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();

    star.y += star.speed * dt;
    if (star.y > state.height + 8) {
      star.y = -8;
      star.x = rand(0, state.width);
    }
  });
  context.restore();
  context.globalAlpha = 1;
}

function drawBricks() {
  state.bricks.forEach((brick) => {
    if (brick.hp <= 0) {
      return;
    }

    const hue = (state.level * 40 + brick.row * 14 + brick.col * 6) % 360;
    const saturated = brick.bonus ? 98 : 92;
    const light = brick.maxHp > 2 ? 48 : brick.hp > 1 ? 55 : 62;
    const fill = brick.bonus
      ? "linear-gradient"
      : `hsl(${hue}, ${saturated}%, ${light}%)`;
    const gradient = context.createLinearGradient(brick.x, brick.y, brick.x + brick.w, brick.y + brick.h);
    if (brick.bonus) {
      gradient.addColorStop(0, "#ffe57a");
      gradient.addColorStop(0.5, "#ff9f1c");
      gradient.addColorStop(1, "#f5534f");
      context.shadowColor = "rgba(255, 214, 102, 0.5)";
    } else {
      gradient.addColorStop(0, `hsla(${hue}, 100%, ${Math.min(82, light + 12)}%, 1)`);
      gradient.addColorStop(0.55, fill);
      gradient.addColorStop(1, `hsla(${(hue + 22) % 360}, 90%, ${Math.max(34, light - 16)}%, 1)`);
      context.shadowColor = `hsla(${hue}, 100%, 60%, 0.34)`;
    }
    context.shadowBlur = brick.bonus ? 16 : 10;
    context.fillStyle = gradient;
    roundRect(context, brick.x, brick.y, brick.w, brick.h, 9, true, false);

    context.shadowBlur = 0;
    context.lineWidth = 1;
    context.strokeStyle = brick.bonus ? "rgba(255, 245, 185, 0.92)" : "rgba(255, 255, 255, 0.2)";
    roundRect(context, brick.x + 0.5, brick.y + 0.5, brick.w - 1, brick.h - 1, 8, false, true);

    const insetGlow = context.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.h);
    insetGlow.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    insetGlow.addColorStop(0.3, "rgba(255, 255, 255, 0.08)");
    insetGlow.addColorStop(1, "transparent");
    context.fillStyle = insetGlow;
    roundRect(context, brick.x + 2.5, brick.y + 2.5, brick.w - 5, Math.max(5, brick.h * 0.32), 6, true, false);

    if (brick.maxHp > 1) {
      context.save();
      context.font = "700 11px DM Sans, sans-serif";
      context.fillStyle = "rgba(12, 18, 28, 0.72)";
      context.textAlign = "right";
      context.textBaseline = "middle";
      context.fillText(String(brick.hp), brick.x + brick.w - 8, brick.y + brick.h / 2 + 0.5);
      context.restore();
    }
  });
}

function drawParticles() {
  state.particles.forEach((particle) => {
    context.save();
    context.globalAlpha = Math.max(0, particle.life);
    context.shadowColor = particle.color;
    context.shadowBlur = 14;
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

function drawPowerUps() {
  state.powerUps.forEach((powerUp) => {
    const gradient = context.createRadialGradient(powerUp.x - 4, powerUp.y - 4, 3, powerUp.x, powerUp.y, powerUp.radius + 8);
    if (powerUp.type === "wide") {
      gradient.addColorStop(0, "#8afcff");
      gradient.addColorStop(0.55, "#3d95ff");
      gradient.addColorStop(1, "#0f3baa");
      context.shadowColor = "rgba(102, 228, 255, 0.42)";
    } else if (powerUp.type === "slow") {
      gradient.addColorStop(0, "#fff4b2");
      gradient.addColorStop(0.5, "#ffd166");
      gradient.addColorStop(1, "#f08c00");
      context.shadowColor = "rgba(255, 214, 102, 0.42)";
    } else if (powerUp.type === "life") {
      gradient.addColorStop(0, "#e1ffb3");
      gradient.addColorStop(0.55, "#7ef29a");
      gradient.addColorStop(1, "#219653");
      context.shadowColor = "rgba(126, 242, 154, 0.42)";
    } else {
      gradient.addColorStop(0, "#ffdfe0");
      gradient.addColorStop(0.55, "#ff8f8f");
      gradient.addColorStop(1, "#f5534f");
      context.shadowColor = "rgba(245, 83, 79, 0.42)";
    }

    context.save();
    context.shadowBlur = 16;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();

    context.save();
    context.strokeStyle = "rgba(255, 255, 255, 0.75)";
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(powerUp.x, powerUp.y, powerUp.radius - 1, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = "#0b1020";
    context.font = "800 11px DM Sans, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.translate(powerUp.x, powerUp.y);
    context.rotate(powerUp.spin);
    context.fillText(powerUp.label, 0, 0.5);
    context.restore();
  });
}

function drawPaddle() {
  const paddle = state.paddle;
  const gradient = context.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.98)");
  gradient.addColorStop(0.2, "#f8fbff");
  gradient.addColorStop(1, "#0f3baa");

  context.save();
  context.shadowColor = "rgba(11, 132, 255, 0.45)";
  context.shadowBlur = 18;
  context.fillStyle = gradient;
  roundRect(context, paddle.x, paddle.y, paddle.width, paddle.height, paddle.height / 2, true, false);
  context.shadowBlur = 0;
  context.strokeStyle = "rgba(255, 255, 255, 0.8)";
  context.lineWidth = 1;
  roundRect(context, paddle.x + 0.5, paddle.y + 0.5, paddle.width - 1, paddle.height - 1, paddle.height / 2, false, true);

  const highlight = context.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y);
  highlight.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  highlight.addColorStop(0.45, "rgba(255, 255, 255, 0.12)");
  highlight.addColorStop(1, "transparent");
  context.fillStyle = highlight;
  roundRect(context, paddle.x + 4, paddle.y + 2, Math.max(10, paddle.width - 8), Math.max(4, paddle.height * 0.34), 999, true, false);
  context.restore();
}

function drawBall() {
  const ball = state.ball;
  const trail = ball.trail;

  for (let index = trail.length - 1; index >= 0; index -= 1) {
    const point = trail[index];
    const alpha = point.life * (index / trail.length);
    context.save();
    context.globalAlpha = alpha * 0.7;
    context.fillStyle = "rgba(255, 255, 255, 0.7)";
    context.beginPath();
    context.arc(point.x, point.y, ball.radius * (0.4 + index / (trail.length * 1.5)), 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  const gradient = context.createRadialGradient(ball.x - 3, ball.y - 3, 2, ball.x, ball.y, ball.radius + 6);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.45, "#f4f9ff");
  gradient.addColorStop(1, "#6bf0ff");

  context.save();
  context.shadowColor = "rgba(107, 240, 255, 0.48)";
  context.shadowBlur = 18;
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawOverlay(now, dt) {
  if (state.paused || state.gameOver || state.ball.attached) {
    const alpha = state.paused || state.gameOver || state.ball.attached ? 1 : 0.0;
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = `rgba(245, 248, 255, ${0.08 * alpha})`;
    context.font = "800 38px Source Serif 4, serif";
    context.fillText(state.gameOver ? "GAME OVER" : state.paused ? "PAUSED" : "READY", state.width / 2, state.height * 0.5 - 12);
    context.font = "600 14px DM Sans, sans-serif";
    context.fillStyle = "rgba(234, 240, 255, 0.55)";
    const prompt = state.gameOver
      ? "Press Restart or R for another run."
      : state.paused
        ? "Press Space or P to resume."
        : "Press Space or Launch to send the ball.";
    context.fillText(prompt, state.width / 2, state.height * 0.5 + 22);
    context.restore();
  }

  if (state.flash > 0.02) {
    context.save();
    context.globalAlpha = Math.min(0.18, state.flash * 0.18);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, state.width, state.height);
    context.restore();
    state.flash = Math.max(0, state.flash - dt * 3.0);
  }
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function circleIntersectsRectWithPadding(circle, rect, padding = 0) {
  const paddedRect = {
    x: rect.x - padding,
    y: rect.y - padding,
    w: rect.w + padding * 2,
    h: rect.h + padding * 2,
  };
  return circleIntersectsRect(circle, paddedRect);
}

function updateBestIfNeeded() {
  if (state.score > state.bestScore) {
    saveBestScore();
  }
}

function updateStatusAndBest() {
  updateBestIfNeeded();
  syncHud();
}

function clampBallSpeedToEffect() {
  if (state.ball.attached) {
    return;
  }
  normalizeBallVelocity(getBallSpeed());
}

function updateGameAfterBrickHit() {
  updateBestIfNeeded();
  syncHud();
}

function noop() {}
