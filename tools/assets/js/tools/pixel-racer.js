import { formatNumber, initCommon } from "../common.js";

initCommon("pixel-racer");

const canvas = document.querySelector("#pixel-racer-canvas");
const context = canvas.getContext("2d", { alpha: false });
const statusNode = document.querySelector("#game-status");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const overlay = document.querySelector("#intro-overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const overlayStartButton = document.querySelector("#overlay-start");
const overlayControlsButton = document.querySelector("#overlay-controls");
const metric1Label = document.querySelector("#overlay-metric-1-label");
const metric1Value = document.querySelector("#overlay-metric-1-value");
const metric2Label = document.querySelector("#overlay-metric-2-label");
const metric2Value = document.querySelector("#overlay-metric-2-value");
const metric3Label = document.querySelector("#overlay-metric-3-label");
const metric3Value = document.querySelector("#overlay-metric-3-value");
const scoreNode = document.querySelector("#score-value");
const distanceNode = document.querySelector("#distance-value");
const speedNode = document.querySelector("#speed-value");
const bestNode = document.querySelector("#best-value");
const briefingNode = document.querySelector("#briefing-copy");
const laneHintNode = document.querySelector("#lane-hint");
const steerButtons = [...document.querySelectorAll("[data-steer]")];
const actionButtons = [...document.querySelectorAll("[data-action]")];

const STORAGE_KEY = "aifreelancer.pixel-racer.best-score";
const LANE_COUNT = 4;
const START_LANE_INDEX = 1;
const ROAD_DEPTH = 180;
const BASE_SPEED_KPH = 64;
const MAX_SPEED_KPH = 210;
const LANE_CHANGE_TIME = 0.14;
const ROAD_MARKER_SPACING = 12;
const PARTICLE_PALETTE = ["#ffd166", "#ff8c5a", "#ff4f7a", "#64f0ff", "#fef6d2"];

const obstacleKinds = [
  {
    name: "sedan",
    body: "#ff6b7d",
    accent: "#ffe8b0",
    roof: "#0e1322",
    widthScale: 0.82,
    heightScale: 0.88,
    hitWidth: 0.34,
    hitDepth: 8.5,
    stripe: false,
  },
  {
    name: "coupe",
    body: "#ffd166",
    accent: "#fff4c9",
    roof: "#091020",
    widthScale: 0.76,
    heightScale: 0.8,
    hitWidth: 0.31,
    hitDepth: 7.8,
    stripe: false,
  },
  {
    name: "van",
    body: "#64f0ff",
    accent: "#dbfff8",
    roof: "#10182a",
    widthScale: 0.93,
    heightScale: 1.04,
    hitWidth: 0.39,
    hitDepth: 9.8,
    stripe: false,
  },
  {
    name: "truck",
    body: "#a98aff",
    accent: "#ffeaff",
    roof: "#121527",
    widthScale: 1.04,
    heightScale: 1.14,
    hitWidth: 0.44,
    hitDepth: 10.8,
    stripe: true,
  },
];

const state = {
  phase: "ready",
  width: 0,
  height: 0,
  dpr: 1,
  score: 0,
  distance: 0,
  speed: BASE_SPEED_KPH,
  best: readBestScore(),
  dodges: 0,
  spawnTimer: 0.75,
  flash: 0,
  shake: 0,
  time: 0,
  stars: createStars(92),
  skyline: createSkyline(),
  particles: [],
  obstacles: [],
  player: {
    laneIndex: START_LANE_INDEX,
    lanePosition: START_LANE_INDEX + 0.5,
    fromPosition: START_LANE_INDEX + 0.5,
    toPosition: START_LANE_INDEX + 0.5,
    progress: 1,
  },
};

let animationFrame = 0;
let resizeObserver = null;

startButton.addEventListener("click", handlePrimaryAction);
overlayStartButton.addEventListener("click", handlePrimaryAction);
overlayControlsButton.addEventListener("click", focusControls);
canvas.addEventListener("click", handleCanvasClick);
window.addEventListener("keydown", handleKeyDown, { passive: false });
window.addEventListener("blur", pauseIfRunning);
document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("resize", handleResize, { passive: true });

steerButtons.forEach((button) => {
  const direction = button.dataset.steer === "left" ? -1 : 1;
  bindRepeatButton(button, () => steer(direction));
});

actionButtons.forEach((button) => {
  if (button.dataset.action === "pause") {
    button.addEventListener("click", togglePause);
  } else if (button.dataset.action === "restart") {
    button.addEventListener("click", restartGame);
  }
});

if ("ResizeObserver" in window) {
  resizeObserver = new ResizeObserver(() => handleResize());
  resizeObserver.observe(canvas);
}

handleResize();
syncHud();
applyPhaseUi();
drawFrame(0);
animationFrame = requestAnimationFrame(tick);

function readBestScore() {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY) || 0);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeBestScore(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Ignore storage failures.
  }
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function choose(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function formatMeters(value) {
  return `${formatNumber(Math.round(value))} m`;
}

function formatSpeed(value) {
  return `${formatNumber(Math.round(value))} kph`;
}

function createStars(count) {
  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: randomRange(0.02, 0.52),
    size: randomRange(0.7, 2.2),
    layer: Math.floor(randomRange(0, 3)),
    phase: randomRange(0, Math.PI * 2),
  }));
}

function createSkyline() {
  const makeSide = () => {
    const blocks = Array.from({ length: 10 }, (_, index) => ({
      offset: randomRange(0.02, 0.42) + index * randomRange(0.008, 0.03),
      width: randomRange(0.028, 0.072),
      height: randomRange(0.08, 0.28),
      color: choose([
        "rgba(9, 14, 27, 0.96)",
        "rgba(12, 18, 34, 0.96)",
        "rgba(16, 24, 44, 0.96)",
        "rgba(18, 16, 36, 0.96)",
      ]),
      windowGlow: Math.random() < 0.7,
    }));

    return blocks.sort((a, b) => a.offset - b.offset);
  };

  return {
    left: makeSide(),
    right: makeSide(),
  };
}

function handleResize() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width || 960));
  const height = Math.max(240, Math.round(rect.height || width * 0.5625));
  const dpr = Math.max(1, window.devicePixelRatio || 1);

  state.width = width;
  state.height = height;
  state.dpr = dpr;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.imageSmoothingEnabled = false;
}

function tick(time) {
  const delta = state.time ? Math.min(0.033, (time - state.time) / 1000) : 0;
  state.time = time;

  if (state.phase === "running") {
    updateGame(delta);
  } else {
    updateIdle(delta);
  }

  drawFrame(time);
  animationFrame = requestAnimationFrame(tick);
}

function updateIdle(delta) {
  if (delta <= 0) {
    return;
  }

  state.flash = Math.max(0, state.flash - delta * 1.6);
  state.shake = Math.max(0, state.shake - delta * 22);
  updateParticles(delta);
}

function updateGame(delta) {
  if (delta <= 0) {
    return;
  }

  updatePlayerLane(delta);

  const difficulty = clamp((state.distance / 900) + (state.dodges * 0.04), 0, 1);
  state.speed = clamp(BASE_SPEED_KPH + state.distance * 0.035 + state.dodges * 1.35, BASE_SPEED_KPH, MAX_SPEED_KPH);
  const metersPerSecond = state.speed / 3.6;

  state.distance += metersPerSecond * delta;
  state.score = Math.floor(state.distance * 11 + state.dodges * 160);

  if (state.score > state.best) {
    state.best = state.score;
    writeBestScore(state.best);
  }

  state.spawnTimer -= delta;
  if (state.spawnTimer <= 0) {
    spawnTrafficWave(difficulty);
    state.spawnTimer = Math.max(0.34, randomRange(0.72, 1.15) - difficulty * 0.42);
  }

  updateObstacles(metersPerSecond * delta);
  updateParticles(delta);

  state.flash = Math.max(0, state.flash - delta * 1.9);
  state.shake = Math.max(0, state.shake - delta * 24);

  syncHud();
}

function updatePlayerLane(delta) {
  const player = state.player;

  if (player.progress < 1) {
    player.progress = Math.min(1, player.progress + delta / LANE_CHANGE_TIME);
    const eased = easeOutCubic(player.progress);
    player.lanePosition = lerp(player.fromPosition, player.toPosition, eased);
  } else {
    player.lanePosition = player.toPosition;
  }
}

function spawnTrafficWave(difficulty) {
  const lanePool = shuffle([...Array(LANE_COUNT).keys()]);
  const count = Math.min(
    3,
    1
      + (difficulty > 0.35 && Math.random() < 0.64 ? 1 : 0)
      + (difficulty > 0.72 && Math.random() < 0.45 ? 1 : 0),
  );
  const baseDepth = ROAD_DEPTH - randomRange(8, 26);

  for (let index = 0; index < count; index += 1) {
    const laneIndex = lanePool[index];
    const kind = choose(obstacleKinds);
    state.obstacles.push({
      laneIndex,
      lanePosition: laneIndex + 0.5,
      depth: baseDepth + index * randomRange(2, 10),
      seed: Math.random() * Math.PI * 2,
      kind,
      passed: false,
    });
  }
}

function updateObstacles(distanceStep) {
  const player = state.player;

  for (const obstacle of state.obstacles) {
    obstacle.depth -= distanceStep;

    const laneGap = Math.abs(player.lanePosition - obstacle.lanePosition);
    const hitWindow = obstacle.kind.hitWidth;
    const collisionDepth = obstacle.kind.hitDepth;

    if (
      obstacle.depth <= collisionDepth &&
      obstacle.depth >= -7 &&
      laneGap < hitWindow
    ) {
      crash(obstacle);
      return;
    }

    if (!obstacle.passed && obstacle.depth < -10) {
      obstacle.passed = true;
      state.dodges += 1;
      const point = projectObstacle(obstacle);
      spawnSparks(point.x, point.y, 6, obstacle.kind.accent, 520);
      state.flash = Math.min(0.22, state.flash + 0.06);
    }
  }

  state.obstacles = state.obstacles.filter((obstacle) => obstacle.depth > -24);
}

function updateParticles(delta) {
  for (const particle of state.particles) {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= 0.985;
    particle.vy *= 0.985;
    particle.life -= delta;
  }

  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function spawnSparks(x, y, count, color, power) {
  for (let index = 0; index < count; index += 1) {
    const angle = randomRange(-Math.PI * 1.25, Math.PI * 0.25);
    const speed = randomRange(power * 0.35, power);
    state.particles.push({
      x: x + randomRange(-6, 6),
      y: y + randomRange(-6, 6),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randomRange(0.22, 0.58),
      size: randomRange(2, 5),
      color,
    });
  }
}

function crash(obstacle) {
  const point = projectObstacle(obstacle);
  spawnSparks(point.x, point.y, 18, "#ff4f7a", 680);
  state.flash = 0.45;
  state.shake = 14;
  state.phase = "gameover";
  applyPhaseUi();
  syncHud();
}

function moveLane(direction) {
  if (!direction) {
    return;
  }

  if (state.phase === "ready") {
    startGame();
  } else if (state.phase === "paused") {
    resumeGame();
  } else if (state.phase === "gameover") {
    restartGame();
    return;
  }

  const player = state.player;
  const currentIndex = clamp(Math.round(player.lanePosition - 0.5), 0, LANE_COUNT - 1);
  const nextIndex = clamp(currentIndex + direction, 0, LANE_COUNT - 1);

  if (nextIndex === currentIndex && player.progress >= 1) {
    return;
  }

  player.laneIndex = nextIndex;
  player.fromPosition = player.lanePosition;
  player.toPosition = nextIndex + 0.5;
  player.progress = 0;
}

function steer(direction) {
  moveLane(direction);
}

function handlePrimaryAction() {
  if (state.phase === "ready") {
    startGame();
    return;
  }

  if (state.phase === "paused") {
    resumeGame();
    return;
  }

  if (state.phase === "running") {
    restartGame();
    return;
  }

  restartGame();
}

function togglePause() {
  if (state.phase === "ready") {
    startGame();
    return;
  }

  if (state.phase === "paused") {
    resumeGame();
    return;
  }

  if (state.phase === "gameover") {
    restartGame();
    return;
  }

  pauseGame();
}

function startGame() {
  if (state.phase === "running") {
    return;
  }

  if (state.phase === "gameover") {
    restartGame();
    return;
  }

  state.phase = "running";
  state.time = 0;
  applyPhaseUi();
}

function resumeGame() {
  if (state.phase !== "paused") {
    return;
  }

  state.phase = "running";
  state.time = 0;
  applyPhaseUi();
}

function pauseGame() {
  if (state.phase !== "running") {
    return;
  }

  state.phase = "paused";
  state.time = 0;
  applyPhaseUi();
}

function restartGame() {
  state.phase = "running";
  state.score = 0;
  state.distance = 0;
  state.speed = BASE_SPEED_KPH;
  state.dodges = 0;
  state.spawnTimer = 0.78;
  state.flash = 0;
  state.shake = 0;
  state.particles = [];
  state.obstacles = [];
  state.player.laneIndex = START_LANE_INDEX;
  state.player.lanePosition = START_LANE_INDEX + 0.5;
  state.player.fromPosition = START_LANE_INDEX + 0.5;
  state.player.toPosition = START_LANE_INDEX + 0.5;
  state.player.progress = 1;
  state.time = 0;
  applyPhaseUi();
  syncHud();
}

function pauseIfRunning() {
  if (state.phase === "running") {
    pauseGame();
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    pauseIfRunning();
  }
}

function handleCanvasClick() {
  if (state.phase === "ready") {
    startGame();
  } else if (state.phase === "paused") {
    resumeGame();
  }
}

function focusControls() {
  document.querySelector("#lane-hint")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  const steerKeys = ["arrowleft", "arrowright", "a", "d"];
  const controlKeys = ["arrowleft", "arrowright", "a", "d", " ", "spacebar", "enter", "p", "r"];

  if (controlKeys.includes(key)) {
    event.preventDefault();
  }

  if (key === " " || key === "spacebar" || key === "enter") {
    handlePrimaryAction();
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

  if (steerKeys.includes(key)) {
    if (key === "arrowleft" || key === "a") {
      moveLane(-1);
    } else {
      moveLane(1);
    }

    if (state.phase === "ready") {
      startGame();
    }
  }
}

function bindRepeatButton(button, action) {
  let repeatTimer = 0;

  const stop = (event) => {
    if (event) {
      event.preventDefault();
    }

    if (repeatTimer) {
      window.clearInterval(repeatTimer);
      repeatTimer = 0;
    }

    button.setAttribute("aria-pressed", "false");
  };

  button.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();

    if (state.phase === "ready") {
      startGame();
    } else if (state.phase === "paused") {
      resumeGame();
    } else if (state.phase === "gameover") {
      restartGame();
    }

    action();
    if (repeatTimer) {
      window.clearInterval(repeatTimer);
    }

    button.setAttribute("aria-pressed", "true");
    repeatTimer = window.setInterval(() => {
      if (state.phase === "running") {
        action();
      }
    }, 115);

    if (button.setPointerCapture) {
      button.setPointerCapture(event.pointerId);
    }
  });

  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("lostpointercapture", stop);
}

function applyPhaseUi() {
  const phase = state.phase;

  if (phase === "running") {
    overlay.classList.add("is-hidden");
    statusNode.textContent = "Racing";
    startButton.textContent = "Restart";
    pauseButton.textContent = "Pause";
    updateBriefing(
      "Running at full speed. Keep your lane changes sharp and stay ahead of the traffic clusters.",
      `Current lane: ${state.player.laneIndex + 1} of ${LANE_COUNT}. Dodges: ${formatNumber(state.dodges)}.`,
    );
    return;
  }

  overlay.classList.remove("is-hidden");

  if (phase === "ready") {
    statusNode.textContent = "Ready";
    overlayTitle.textContent = "Pixel Racer";
    overlayCopy.textContent = "Slip between lanes, avoid the traffic clusters, and let the speed climb while the skyline flashes by.";
    setOverlayMetric(metric1Label, metric1Value, "Steer", "A / D");
    setOverlayMetric(metric2Label, metric2Value, "Pause", "P");
    setOverlayMetric(metric3Label, metric3Value, "Restart", "R");
    overlayStartButton.textContent = "Start now";
    overlayControlsButton.textContent = "See controls";
    startButton.textContent = "Start run";
    pauseButton.textContent = "Pause";
    updateBriefing(
      "Hit Start, then steer hard left or right and hold your nerve when the traffic fans out.",
      "Quick taps beat long holds. The road gets meaner the longer you survive.",
    );
    return;
  }

  if (phase === "paused") {
    statusNode.textContent = "Paused";
    overlayTitle.textContent = "Paused";
    overlayCopy.textContent = `The highway is frozen at ${formatMeters(state.distance)}. Resume when you're ready to jump back in.`;
    setOverlayMetric(metric1Label, metric1Value, "Resume", "Space");
    setOverlayMetric(metric2Label, metric2Value, "Restart", "R");
    setOverlayMetric(metric3Label, metric3Value, "Steer", "Left / Right");
    overlayStartButton.textContent = "Resume";
    overlayControlsButton.textContent = "Track tips";
    startButton.textContent = "Resume";
    pauseButton.textContent = "Resume";
    updateBriefing(
      `Paused at ${formatMeters(state.distance)}. Take a breath, then unfreeze the lane.`,
      "If you restart, the road resets instantly and keeps your best score intact.",
    );
    return;
  }

  statusNode.textContent = "Crashed";
  overlayTitle.textContent = "Crash landed";
  overlayCopy.textContent = `You reached ${formatMeters(state.distance)} and scored ${formatNumber(state.score)}. Your local best is ${formatNumber(state.best)}.`;
  setOverlayMetric(metric1Label, metric1Value, "Score", formatNumber(state.score));
  setOverlayMetric(metric2Label, metric2Value, "Distance", formatMeters(state.distance));
  setOverlayMetric(metric3Label, metric3Value, "Best", formatNumber(state.best));
  overlayStartButton.textContent = "Race again";
  overlayControlsButton.textContent = "Controls";
  startButton.textContent = "Race again";
  pauseButton.textContent = "Restart";
  updateBriefing(
    "You clipped traffic. Study the lane pattern, then run it back and push farther next time.",
    "The next lap is always cleaner when you commit to a lane change early.",
  );
}

function updateBriefing(primaryText, secondaryText) {
  briefingNode.textContent = primaryText;
  laneHintNode.textContent = secondaryText;
}

function setOverlayMetric(labelNode, valueNode, label, value) {
  labelNode.textContent = label;
  valueNode.textContent = value;
}

function syncHud() {
  scoreNode.textContent = formatNumber(state.score);
  distanceNode.textContent = formatMeters(state.distance);
  speedNode.textContent = formatSpeed(state.speed);
  bestNode.textContent = formatNumber(state.best);
}

function roadGeometry() {
  const horizonY = state.height * 0.16;
  const bottomY = state.height * 0.96;
  const topWidth = state.width * 0.16;
  const bottomWidth = state.width * 0.88;

  return {
    horizonY,
    bottomY,
    topWidth,
    bottomWidth,
    centerX: state.width / 2,
  };
}

function projectDepth(depth) {
  const geometry = roadGeometry();
  const normalized = clamp(depth / ROAD_DEPTH, 0, 1);
  const remaining = 1 - normalized;
  const curve = Math.pow(remaining, 1.55);

  return {
    ...geometry,
    normalized,
    remaining,
    curve,
    y: geometry.horizonY + curve * (geometry.bottomY - geometry.horizonY),
    width: geometry.topWidth + curve * (geometry.bottomWidth - geometry.topWidth),
    scale: 0.28 + curve * 0.98,
    alpha: 0.2 + curve * 0.8,
  };
}

function laneX(lanePosition, depth) {
  const projection = projectDepth(depth);
  const laneOffset = (lanePosition / LANE_COUNT) * 2 - 1;
  const jitter = Math.sin(state.distance * 0.03 + depth * 0.07 + lanePosition) * 1.35;
  return projection.centerX + laneOffset * (projection.width * 0.5) + jitter;
}

function projectLane(lanePosition, depth) {
  const projection = projectDepth(depth);
  return {
    ...projection,
    x: laneX(lanePosition, depth),
  };
}

function projectObstacle(obstacle) {
  return projectLane(obstacle.lanePosition, obstacle.depth);
}

function drawFrame(time) {
  if (!state.width || !state.height) {
    return;
  }

  const geometry = roadGeometry();
  const shakeX = state.shake > 0 ? Math.sin(time * 0.043) * state.shake : 0;
  const shakeY = state.shake > 0 ? Math.cos(time * 0.038) * state.shake * 0.4 : 0;

  context.save();
  context.translate(shakeX, shakeY);

  drawBackground(geometry, time);
  drawHorizon(geometry, time);
  drawRoad(geometry);
  drawObstacles();
  drawPlayer();
  drawParticles();
  drawFlash();

  context.restore();
}

function drawBackground(geometry, time) {
  const sky = context.createLinearGradient(0, 0, 0, state.height);
  sky.addColorStop(0, "#07111f");
  sky.addColorStop(0.48, "#1b1024");
  sky.addColorStop(0.76, "#0e1220");
  sky.addColorStop(1, "#05070d");
  context.fillStyle = sky;
  context.fillRect(0, 0, state.width, state.height);

  const haze = context.createRadialGradient(
    geometry.centerX,
    geometry.horizonY + 4,
    8,
    geometry.centerX,
    geometry.horizonY + 6,
    state.height * 0.46,
  );
  haze.addColorStop(0, "rgba(255, 178, 88, 0.38)");
  haze.addColorStop(0.42, "rgba(255, 79, 122, 0.14)");
  haze.addColorStop(1, "rgba(255, 79, 122, 0)");
  context.fillStyle = haze;
  context.fillRect(0, 0, state.width, state.height);

  drawStars(time);

  const leftGlow = context.createLinearGradient(0, geometry.horizonY, geometry.centerX, geometry.bottomY);
  leftGlow.addColorStop(0, "rgba(100, 240, 255, 0.08)");
  leftGlow.addColorStop(1, "rgba(100, 240, 255, 0)");
  context.fillStyle = leftGlow;
  context.fillRect(0, 0, geometry.centerX, state.height);
}

function drawStars(time) {
  for (const star of state.stars) {
    const twinkle = 0.5 + Math.sin(time * 0.0012 + star.phase) * 0.5;
    const alpha = (0.18 + star.layer * 0.12) * twinkle;
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    const x = star.x * state.width + Math.sin(time * 0.00014 + star.phase) * star.layer * 1.5;
    const y = star.y * state.height * 0.78;
    context.fillRect(x, y, star.size, star.size);
  }
}

function drawHorizon(geometry, time) {
  const sunX = geometry.centerX;
  const sunY = geometry.horizonY + 10;
  const sunRadius = state.height * 0.12;
  const sun = context.createRadialGradient(sunX, sunY, sunRadius * 0.1, sunX, sunY, sunRadius * 1.7);
  sun.addColorStop(0, "rgba(255, 242, 198, 0.96)");
  sun.addColorStop(0.28, "rgba(255, 178, 88, 0.42)");
  sun.addColorStop(1, "rgba(255, 79, 122, 0)");
  context.fillStyle = sun;
  context.beginPath();
  context.arc(sunX, sunY, sunRadius * 1.7, 0, Math.PI * 2);
  context.fill();

  const skylineShift = (state.distance * 0.018) % (state.width * 0.08);
  const leftBase = geometry.centerX - geometry.bottomWidth * 0.56;
  const rightBase = geometry.centerX + geometry.bottomWidth * 0.56;

  drawSkylineSide(state.skyline.left, leftBase - skylineShift * 0.35, -1, geometry);
  drawSkylineSide(state.skyline.right, rightBase + skylineShift * 0.35, 1, geometry);

  context.fillStyle = "rgba(255, 178, 88, 0.2)";
  context.fillRect(0, geometry.horizonY + 6, state.width, 2);
}

function drawSkylineSide(blocks, anchorX, direction, geometry) {
  for (const block of blocks) {
    const width = block.width * state.width * 0.5;
    const height = block.height * state.height * 0.58;
    const offset = block.offset * state.width * 0.18;
    const x = direction < 0
      ? anchorX - offset - width
      : anchorX + offset;
    const y = geometry.horizonY + 6 - height;

    if (direction < 0 && x + width < 0) {
      continue;
    }

    if (direction > 0 && x > state.width) {
      continue;
    }

    context.fillStyle = block.color;
    context.fillRect(x, y, width, height);

    if (block.windowGlow) {
      context.fillStyle = "rgba(255, 178, 88, 0.18)";
      context.fillRect(x + width * 0.14, y + height * 0.18, width * 0.56, height * 0.18);
    }

    context.fillStyle = direction < 0 ? "rgba(100, 240, 255, 0.08)" : "rgba(255, 79, 122, 0.08)";
    context.fillRect(x, y, width, 3);
  }
}

function drawRoad(geometry) {
  const road = context.createLinearGradient(0, geometry.horizonY, 0, geometry.bottomY);
  road.addColorStop(0, "#1a2134");
  road.addColorStop(0.5, "#0f1422");
  road.addColorStop(1, "#070a11");

  context.fillStyle = road;
  context.beginPath();
  context.moveTo(geometry.centerX - geometry.topWidth * 0.5, geometry.horizonY);
  context.lineTo(geometry.centerX + geometry.topWidth * 0.5, geometry.horizonY);
  context.lineTo(geometry.centerX + geometry.bottomWidth * 0.5, geometry.bottomY);
  context.lineTo(geometry.centerX - geometry.bottomWidth * 0.5, geometry.bottomY);
  context.closePath();
  context.fill();

  context.fillStyle = "rgba(100, 240, 255, 0.05)";
  context.beginPath();
  context.moveTo(geometry.centerX - geometry.topWidth * 0.5, geometry.horizonY);
  context.lineTo(geometry.centerX, geometry.bottomY);
  context.lineTo(geometry.centerX - geometry.bottomWidth * 0.5, geometry.bottomY);
  context.closePath();
  context.fill();

  context.fillStyle = "rgba(255, 79, 122, 0.05)";
  context.beginPath();
  context.moveTo(geometry.centerX + geometry.topWidth * 0.5, geometry.horizonY);
  context.lineTo(geometry.centerX + geometry.bottomWidth * 0.5, geometry.bottomY);
  context.lineTo(geometry.centerX, geometry.bottomY);
  context.closePath();
  context.fill();

  drawRoadEdges(geometry);
  drawLaneMarkers(geometry);
  drawSurfaceTexture(geometry);
}

function drawRoadEdges(geometry) {
  context.lineWidth = 3;
  context.strokeStyle = "rgba(255, 79, 122, 0.7)";
  context.beginPath();
  context.moveTo(geometry.centerX - geometry.topWidth * 0.5, geometry.horizonY);
  context.lineTo(geometry.centerX - geometry.bottomWidth * 0.5, geometry.bottomY);
  context.stroke();

  context.strokeStyle = "rgba(100, 240, 255, 0.7)";
  context.beginPath();
  context.moveTo(geometry.centerX + geometry.topWidth * 0.5, geometry.horizonY);
  context.lineTo(geometry.centerX + geometry.bottomWidth * 0.5, geometry.bottomY);
  context.stroke();
}

function drawLaneMarkers(geometry) {
  const spacing = ROAD_MARKER_SPACING;
  const offset = state.distance % spacing;

  for (let separator = 1; separator < LANE_COUNT; separator += 1) {
    for (let depth = offset; depth < ROAD_DEPTH; depth += spacing) {
      const nextDepth = Math.min(depth + spacing * 0.48, ROAD_DEPTH);
      const start = projectDepth(depth);
      const end = projectDepth(nextDepth);
      const startX = laneX(separator, depth);
      const endX = laneX(separator, nextDepth);
      const alpha = Math.min(1, start.alpha * 0.8);

      context.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      context.lineWidth = Math.max(1, start.scale * 2.8);
      context.beginPath();
      context.moveTo(startX, start.y);
      context.lineTo(endX, end.y);
      context.stroke();
    }
  }

  for (let edge = 0; edge <= LANE_COUNT; edge += LANE_COUNT) {
    for (let depth = offset * 0.7; depth < ROAD_DEPTH; depth += spacing * 1.15) {
      const nextDepth = Math.min(depth + spacing * 0.56, ROAD_DEPTH);
      const start = projectDepth(depth);
      const end = projectDepth(nextDepth);
      const startX = laneX(edge, depth);
      const endX = laneX(edge, nextDepth);

      context.strokeStyle = edge === 0
        ? "rgba(255, 79, 122, 0.55)"
        : "rgba(100, 240, 255, 0.55)";
      context.lineWidth = Math.max(1, start.scale * 2.4);
      context.beginPath();
      context.moveTo(startX, start.y);
      context.lineTo(endX, end.y);
      context.stroke();
    }
  }
}

function drawSurfaceTexture(geometry) {
  const step = 18;
  const wave = state.distance * 0.35;

  context.save();
  context.globalAlpha = 0.08;
  context.fillStyle = "rgba(255, 255, 255, 0.85)";

  for (let depth = wave % step; depth < ROAD_DEPTH; depth += step) {
    const projection = projectDepth(depth);
    const width = projection.width * 0.96;
    const height = Math.max(1, projection.scale * 1.4);
    const x = geometry.centerX - width * 0.5;

    if (projection.y < geometry.horizonY + 8) {
      continue;
    }

    context.fillRect(x, projection.y + 1, width, height);
  }

  context.restore();
}

function drawObstacles() {
  const visible = [...state.obstacles].sort((a, b) => b.depth - a.depth);

  for (const obstacle of visible) {
    const projection = projectObstacle(obstacle);
    drawVehicle(projection, obstacle.kind, false, obstacle.seed);
  }
}

function drawPlayer() {
  const projection = projectLane(state.player.lanePosition, 8);
  drawVehicle(projection, {
    body: "#64f0ff",
    accent: "#ff6d9c",
    roof: "#08111d",
    widthScale: 1.08,
    heightScale: 1.02,
    stripe: true,
  }, true, state.time * 0.001);
}

function drawVehicle(projection, kind, isPlayer, seed) {
  const bodyWidth = 54 * projection.scale * kind.widthScale;
  const bodyHeight = 84 * projection.scale * kind.heightScale;
  const x = projection.x;
  const y = projection.y + (isPlayer ? 10 : 0) - bodyHeight * 0.5;
  const radius = Math.max(4, Math.min(bodyWidth, bodyHeight) * 0.18);
  const underGlow = isPlayer ? "rgba(100, 240, 255, 0.34)" : "rgba(255, 178, 88, 0.22)";

  context.save();
  context.globalCompositeOperation = "screen";
  const glow = context.createRadialGradient(x, y + bodyHeight * 0.82, 2, x, y + bodyHeight * 0.82, bodyWidth * 0.85);
  glow.addColorStop(0, underGlow);
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = glow;
  context.fillRect(x - bodyWidth, y - bodyHeight * 0.2, bodyWidth * 2, bodyHeight * 1.5);
  context.restore();

  context.save();
  context.translate(x, y);

  const shadow = context.createLinearGradient(0, 0, 0, bodyHeight);
  shadow.addColorStop(0, "rgba(0, 0, 0, 0.1)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0.44)");
  context.fillStyle = shadow;
  roundedRect(context, -bodyWidth * 0.55, bodyHeight * 0.04, bodyWidth * 1.1, bodyHeight * 0.95, radius);
  context.fill();

  context.fillStyle = kind.body;
  roundedRect(context, -bodyWidth * 0.5, -bodyHeight * 0.05, bodyWidth, bodyHeight * 0.86, radius);
  context.fill();

  context.fillStyle = kind.roof;
  roundedRect(
    context,
    -bodyWidth * 0.33,
    -bodyHeight * 0.31,
    bodyWidth * 0.66,
    bodyHeight * 0.34,
    radius * 0.6,
  );
  context.fill();

  context.fillStyle = "rgba(255, 255, 255, 0.12)";
  roundedRect(context, -bodyWidth * 0.22, -bodyHeight * 0.24, bodyWidth * 0.44, bodyHeight * 0.14, radius * 0.35);
  context.fill();

  context.fillStyle = kind.accent;
  context.fillRect(-bodyWidth * 0.34, bodyHeight * 0.22, bodyWidth * 0.68, bodyHeight * 0.08);

  if (kind.stripe) {
    context.fillStyle = "rgba(255, 255, 255, 0.22)";
    context.fillRect(-bodyWidth * 0.07, -bodyHeight * 0.34, bodyWidth * 0.14, bodyHeight * 0.78);
    context.fillStyle = "rgba(255, 79, 122, 0.28)";
    context.fillRect(-bodyWidth * 0.5, bodyHeight * 0.46, bodyWidth, bodyHeight * 0.06);
  }

  context.fillStyle = isPlayer ? "#fef6d2" : "rgba(255, 246, 210, 0.82)";
  context.fillRect(-bodyWidth * 0.42, -bodyHeight * 0.02, bodyWidth * 0.08, bodyHeight * 0.08);
  context.fillRect(bodyWidth * 0.34, -bodyHeight * 0.02, bodyWidth * 0.08, bodyHeight * 0.08);

  context.fillStyle = isPlayer ? "#ff6d9c" : "#ff8c5a";
  context.fillRect(-bodyWidth * 0.34, bodyHeight * 0.54, bodyWidth * 0.12, bodyHeight * 0.07);
  context.fillRect(bodyWidth * 0.22, bodyHeight * 0.54, bodyWidth * 0.12, bodyHeight * 0.07);

  if (isPlayer) {
    context.fillStyle = "rgba(255, 109, 156, 0.16)";
    roundedRect(context, -bodyWidth * 0.52, -bodyHeight * 0.06, bodyWidth * 1.04, bodyHeight * 0.92, radius);
    context.strokeStyle = "rgba(255, 255, 255, 0.18)";
    context.lineWidth = 2;
    context.stroke();
  } else {
    const pulse = 0.25 + Math.sin(state.time * 0.004 + seed) * 0.06;
    context.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    context.fillRect(-bodyWidth * 0.12, -bodyHeight * 0.1, bodyWidth * 0.24, bodyHeight * 0.16);
  }

  context.restore();
}

function drawParticles() {
  for (const particle of state.particles) {
    const alpha = clamp(particle.life / 0.58, 0, 1);
    context.fillStyle = particle.color;
    context.globalAlpha = alpha;
    context.fillRect(
      particle.x - particle.size * 0.5,
      particle.y - particle.size * 0.5,
      particle.size,
      particle.size,
    );
  }

  context.globalAlpha = 1;
}

function drawFlash() {
  if (state.flash <= 0) {
    return;
  }

  context.fillStyle = `rgba(255, 79, 122, ${state.flash * 0.22})`;
  context.fillRect(0, 0, state.width, state.height);
}

function roundedRect(ctx, x, y, width, height, radius) {
  const size = Math.min(radius, Math.abs(width) * 0.5, Math.abs(height) * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + size, y);
  ctx.arcTo(x + width, y, x + width, y + height, size);
  ctx.arcTo(x + width, y + height, x, y + height, size);
  ctx.arcTo(x, y + height, x, y, size);
  ctx.arcTo(x, y, x + width, y, size);
  ctx.closePath();
}
