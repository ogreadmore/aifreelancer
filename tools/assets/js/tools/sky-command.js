import { initCommon } from "../common.js";

initCommon("sky-command");

const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const scoreDisplay = document.querySelector("#score-display");
const livesDisplay = document.querySelector("#lives-display");
const citiesDisplay = document.querySelector("#cities-display");
const waveDisplay = document.querySelector("#wave-display");
const highScoreDisplay = document.querySelector("#high-score-display");
const launchersDisplay = document.querySelector("#launchers-display");
const threatsDisplay = document.querySelector("#threats-display");
const comboDisplay = document.querySelector("#combo-display");
const statusDisplay = document.querySelector("#status-display");
const statusText = document.querySelector("#status-text");
const statusDot = statusDisplay.querySelector(".status-dot");
const overlay = document.querySelector("#game-overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayEyebrow = document.querySelector("#overlay-eyebrow");
const overlayCopy = document.querySelector("#overlay-copy");
const overlayStartButton = document.querySelector("#overlay-start");
const overlayRestartButton = document.querySelector("#overlay-restart");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const touchStartButton = document.querySelector("#touch-start");
const touchPauseButton = document.querySelector("#touch-pause");
const touchRestartButton = document.querySelector("#touch-restart");

const STORAGE_KEY = "aifreelancer.sky-command.high-score";
const LOGICAL_WIDTH = 540;
const LOGICAL_HEIGHT = 720;
const CORE_X = LOGICAL_WIDTH / 2;
const CORE_Y = 650;
const CITY_Y = 604;
const LAUNCHER_Y = 678;
const TAU = Math.PI * 2;
const CITY_POSITIONS = [50, 102, 154, 206, 334, 386, 438, 490];
const LAUNCHER_POSITIONS = [132, 270, 408];
const THREAT_TYPES = {
  scout: { speed: 1.14, radius: 3.4, value: 70, head: "#ffd56f", tail: "#ff8f4f" },
  warhead: { speed: 1, radius: 4.6, value: 100, head: "#ff7a85", tail: "#ffb56f" },
  heavy: { speed: 0.84, radius: 6.2, value: 150, head: "#d56bff", tail: "#78f2ff" },
};

const state = {
  phase: "title",
  score: 0,
  highScore: loadHighScore(),
  wave: 1,
  lives: 3,
  fireCooldown: 0,
  combo: 0,
  comboTimer: 0,
  message: "Awaiting command",
  messageTimer: 0,
  spawnTimer: 0,
  threatsRemaining: 0,
  waveClearTimer: 0,
  time: 0,
  shake: 0,
  shakeX: 0,
  shakeY: 0,
  pointerX: CORE_X,
  pointerY: 450,
  pointerActive: false,
  cities: createCities(),
};

const launchers = LAUNCHER_POSITIONS.map((x, index) => ({
  x,
  y: LAUNCHER_Y + (index === 1 ? 4 : 0),
}));

const threats = [];
const interceptors = [];
const blasts = [];
const particles = [];
const stars = createStars();

let audioContext = null;
let lastFrame = performance.now();

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("blur", pauseMissionForBackground);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseMissionForBackground();
  }
});
canvas.addEventListener("pointerdown", handleCanvasPointerDown);
canvas.addEventListener("pointermove", handleCanvasPointerMove);
canvas.addEventListener("pointerleave", handleCanvasPointerLeave);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
startButton.addEventListener("click", handleStartAction);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", restartMission);
overlayStartButton.addEventListener("click", handleStartAction);
overlayRestartButton.addEventListener("click", restartMission);
touchStartButton.addEventListener("click", handleStartAction);
touchPauseButton.addEventListener("click", togglePause);
touchRestartButton.addEventListener("click", restartMission);

resizeCanvas();
renderHud();
renderOverlay();
requestAnimationFrame(loop);

function loop(timestamp) {
  const delta = Math.min((timestamp - lastFrame) / 1000, 0.033);
  lastFrame = timestamp;

  state.time += delta;
  update(delta);
  draw();

  requestAnimationFrame(loop);
}

function pauseMissionForBackground() {
  state.pointerActive = false;

  if (state.phase !== "playing") {
    return;
  }

  state.phase = "paused";
  renderHud();
  renderOverlay();
}

function handleCanvasPointerDown(event) {
  event.preventDefault();
  ensureAudioContext();

  if (state.phase === "title") {
    startMission();
    return;
  }

  if (state.phase === "gameover") {
    restartMission();
    return;
  }

  if (state.phase === "paused") {
    togglePause();
    return;
  }

  const point = pointerToCanvasPoint(event);
  state.pointerX = point.x;
  state.pointerY = point.y;
  state.pointerActive = true;
  launchInterceptor(point.x, point.y);
}

function handleCanvasPointerMove(event) {
  const point = pointerToCanvasPoint(event);
  state.pointerX = point.x;
  state.pointerY = point.y;
  state.pointerActive = true;
}

function handleCanvasPointerLeave() {
  state.pointerActive = false;
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  const launchKeys = [" ", "spacebar", "enter"];

  if (["p", "escape", "r", ...launchKeys].includes(key) || event.key === " ") {
    event.preventDefault();
  }

  ensureAudioContext();

  if (key === "p" || key === "escape") {
    togglePause();
    return;
  }

  if (key === "r") {
    restartMission();
    return;
  }

  if (launchKeys.includes(key) || event.key === " ") {
    if (state.phase === "title") {
      startMission();
      return;
    }

    if (state.phase === "gameover") {
      restartMission();
      return;
    }

    if (state.phase === "paused") {
      togglePause();
      return;
    }

    launchInterceptor(state.pointerX, state.pointerY);
  }
}

function startMission() {
  ensureAudioContext();
  resetMission();
  state.phase = "playing";
  beginWave(1);
  setMessage("Wave 1 inbound", 1.4);
  renderHud();
  renderOverlay();
}

function handleStartAction() {
  if (state.phase === "paused") {
    togglePause();
    return;
  }

  if (state.phase === "playing") {
    return;
  }

  startMission();
}

function restartMission() {
  ensureAudioContext();
  resetMission();
  state.phase = "playing";
  beginWave(1);
  setMessage("Fresh command cycle", 1.2);
  renderHud();
  renderOverlay();
}

function togglePause() {
  if (state.phase === "title") {
    startMission();
    return;
  }

  if (state.phase === "gameover") {
    restartMission();
    return;
  }

  if (state.phase === "paused") {
    state.phase = "playing";
    setMessage(state.cities.some((city) => city.alive) ? `Wave ${state.wave}` : "Last stand", 0.85);
  } else if (state.phase === "playing") {
    state.phase = "paused";
  }

  renderHud();
  renderOverlay();
}

function resetMission() {
  state.phase = "title";
  state.score = 0;
  state.wave = 1;
  state.lives = 3;
  state.fireCooldown = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.message = "Awaiting command";
  state.messageTimer = 0;
  state.spawnTimer = 0;
  state.threatsRemaining = 0;
  state.waveClearTimer = 0;
  state.shake = 0;
  state.shakeX = 0;
  state.shakeY = 0;
  state.pointerX = CORE_X;
  state.pointerY = 450;
  state.pointerActive = false;
  state.cities = createCities();
  threats.length = 0;
  interceptors.length = 0;
  blasts.length = 0;
  particles.length = 0;
  renderHud();
}

function beginWave(wave) {
  state.wave = wave;
  state.threatsRemaining = computeThreatCount(wave);
  state.spawnTimer = 0.45;
  state.waveClearTimer = 0;
  setMessage(`Wave ${wave} inbound`, 1.2);
}

function computeThreatCount(wave) {
  return Math.round(8 + wave * 2.2);
}

function update(delta) {
  updateAmbient(delta);

  if (state.phase !== "playing") {
    updateParticles(delta);
    updateHud();
    return;
  }

  state.fireCooldown = Math.max(0, state.fireCooldown - delta);
  state.comboTimer = Math.max(0, state.comboTimer - delta);
  if (state.comboTimer === 0) {
    state.combo = 0;
  }

  if (state.messageTimer > 0) {
    state.messageTimer = Math.max(0, state.messageTimer - delta);
  }

  if (state.waveClearTimer > 0) {
    state.waveClearTimer = Math.max(0, state.waveClearTimer - delta);
    if (state.waveClearTimer === 0) {
      beginWave(state.wave + 1);
    }
  } else {
    state.spawnTimer = Math.max(0, state.spawnTimer - delta);
    if (state.threatsRemaining > 0 && state.spawnTimer === 0) {
      spawnThreat();
      state.threatsRemaining -= 1;
      state.spawnTimer = computeSpawnInterval(state.wave);
    }
  }

  updateLaunchers(delta);
  updateInterceptors(delta);
  updateThreats(delta);
  updateBlasts(delta);
  updateParticles(delta);
  resolveWaveProgression();
  renderHud();
}

function updateAmbient(delta) {
  for (const city of state.cities) {
    city.flash = Math.max(0, city.flash - delta);
  }

  state.shake = Math.max(0, state.shake - delta * 2.2);
  state.shakeX = Math.cos(state.time * 19.7) * state.shake * 3.5;
  state.shakeY = Math.sin(state.time * 16.1) * state.shake * 2.8;
  for (const star of stars) {
    star.y += star.speed * delta * 0.05;
    if (star.y > 740) {
      star.y = -8;
      star.x = Math.random() * LOGICAL_WIDTH;
    }
  }
}

function updateLaunchers(delta) {
  for (const launcher of launchers) {
    launcher.flash = Math.max(0, (launcher.flash ?? 0) - delta);
  }
}

function updateInterceptors(delta) {
  for (let index = interceptors.length - 1; index >= 0; index -= 1) {
    const interceptor = interceptors[index];
    interceptor.elapsed += delta;

    const progress = Math.min(1, interceptor.elapsed / interceptor.duration);
    const eased = easeOutCubic(progress);
    interceptor.x = lerp(interceptor.startX, interceptor.targetX, eased);
    interceptor.y = lerp(interceptor.startY, interceptor.targetY, eased);
    interceptor.trail.push({ x: interceptor.x, y: interceptor.y });
    if (interceptor.trail.length > 10) {
      interceptor.trail.shift();
    }

    if (progress >= 1) {
      detonateInterceptor(index);
    }
  }
}

function updateThreats(delta) {
  for (let index = threats.length - 1; index >= 0; index -= 1) {
    const threat = threats[index];
    threat.elapsed += delta;
    const progress = Math.min(1, threat.elapsed / threat.duration);
    const wobbleScale = 1 - progress;
    const sway = Math.sin(progress * TAU * threat.wobbleFrequency + threat.wobblePhase) * threat.wobble * wobbleScale;
    const drift = Math.cos(progress * TAU * (threat.wobbleFrequency * 0.62) + threat.wobblePhase) * threat.wobble * 0.18 * wobbleScale;
    threat.x = lerp(threat.startX, threat.targetX, progress) + sway;
    threat.y = lerp(threat.startY, threat.targetY, progress) + drift;
    threat.trail.push({ x: threat.x, y: threat.y });
    if (threat.trail.length > 12) {
      threat.trail.shift();
    }

    if (progress >= 1) {
      threatImpact(threat, index);
    }
  }
}

function updateBlasts(delta) {
  for (let index = blasts.length - 1; index >= 0; index -= 1) {
    const blast = blasts[index];
    blast.age += delta;
    blast.radius = Math.min(blast.maxRadius, blast.radius + blast.growth * delta);
    blast.alpha = Math.max(0, 1 - blast.age / blast.duration);

    for (let threatIndex = threats.length - 1; threatIndex >= 0; threatIndex -= 1) {
      const threat = threats[threatIndex];
      if (!threat.alive) {
        continue;
      }

      const distance = Math.hypot(threat.x - blast.x, threat.y - blast.y);
      if (distance <= blast.radius + threat.radius * 0.8) {
        destroyThreat(threat, blast);
      }
    }

    if (blast.age >= blast.duration) {
      blasts.splice(index, 1);
    }
  }
}

function updateParticles(delta) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.age += delta;
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vx *= particle.drag;
    particle.vy *= particle.drag;
    particle.vy += particle.gravity * delta;
    particle.alpha = Math.max(0, 1 - particle.age / particle.life);

    if (particle.age >= particle.life) {
      particles.splice(index, 1);
    }
  }
}

function resolveWaveProgression() {
  if (state.phase !== "playing") {
    return;
  }

  if (state.waveClearTimer > 0) {
    return;
  }

  if (state.threatsRemaining === 0 && threats.length === 0 && interceptors.length === 0 && blasts.length === 0) {
    const bonus = Math.round(180 + state.wave * 90 + countAliveCities() * 35 + state.lives * 120);
    state.score += bonus;
    saveHighScore();
    setMessage(`Wave ${state.wave} cleared +${bonus}`, 1.45);
    state.waveClearTimer = 1.6;
  }
}

function spawnThreat() {
  const kind = chooseThreatKind(state.wave);
  const target = chooseTarget();
  const origin = chooseSpawnOrigin(target.x);
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const profile = THREAT_TYPES[kind];
  const speed = (88 + state.wave * 8) * profile.speed * randomRange(0.92, 1.12);
  const duration = distance / speed;

  threats.push({
    kind,
    colorHead: profile.head,
    colorTail: profile.tail,
    radius: profile.radius,
    value: profile.value,
    startX: origin.x,
    startY: origin.y,
    targetX: target.x,
    targetY: target.y,
    targetType: target.type,
    targetIndex: target.index,
    x: origin.x,
    y: origin.y,
    elapsed: 0,
    duration,
    wobble: randomRange(12, 28) * (kind === "heavy" ? 1.15 : 1),
    wobbleFrequency: randomRange(1.1, 2.6),
    wobblePhase: randomRange(0, TAU),
    alive: true,
    trail: [],
  });
}

function chooseThreatKind(wave) {
  const roll = Math.random();
  if (wave >= 5 && roll < 0.18) {
    return "heavy";
  }

  if (wave >= 2 && roll < 0.4) {
    return "scout";
  }

  if (roll < 0.22) {
    return "heavy";
  }

  return "warhead";
}

function chooseTarget() {
  const aliveCities = state.cities
    .map((city, index) => ({ city, index }))
    .filter(({ city }) => city.alive);

  if (aliveCities.length > 0) {
    const coreChance = Math.min(0.18 + state.wave * 0.015, 0.42);
    if (Math.random() > coreChance) {
      const slot = aliveCities[Math.floor(Math.random() * aliveCities.length)];
      return { type: "city", index: slot.index, x: slot.city.x, y: slot.city.y };
    }
  }

  const bias = randomRange(-32, 32);
  return { type: "core", index: -1, x: CORE_X + bias, y: CORE_Y };
}

function chooseSpawnOrigin(targetX) {
  const edgeRoll = Math.random();
  if (edgeRoll < 0.58) {
    return { x: randomRange(10, LOGICAL_WIDTH - 10), y: -18 };
  }

  if (edgeRoll < 0.79) {
    return { x: -18, y: randomRange(28, 260) };
  }

  return { x: LOGICAL_WIDTH + 18, y: randomRange(28, 260) };
}

function launchInterceptor(targetX, targetY) {
  if (state.phase !== "playing" || state.fireCooldown > 0) {
    return;
  }

  const launcher = getNearestLauncher(targetX);
  const originX = launcher.x;
  const originY = launcher.y;
  const dx = targetX - originX;
  const dy = targetY - originY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const speed = 620 + state.wave * 10;
  const duration = distance / speed;

  interceptors.push({
    startX: originX,
    startY: originY,
    targetX,
    targetY,
    x: originX,
    y: originY,
    elapsed: 0,
    duration,
    trail: [],
    launcherIndex: launchers.indexOf(launcher),
  });

  launcher.flash = 0.2;
  state.fireCooldown = 0.18;
  state.pointerX = targetX;
  state.pointerY = targetY;
  state.pointerActive = true;
  addParticles(originX, originY, 10, "#7af5ff", "#ffcf68", 220, 32);
}

function detonateInterceptor(index) {
  const interceptor = interceptors[index];
  if (!interceptor) {
    return;
  }

  addBlast(interceptor.targetX, interceptor.targetY);
  addParticles(interceptor.targetX, interceptor.targetY, 18, "#88f7ff", "#fef2a3", 280, 52);
  interceptors.splice(index, 1);
}

function addBlast(x, y) {
  blasts.push({
    x,
    y,
    radius: 6,
    maxRadius: 92 + state.wave * 1.8,
    growth: 250,
    duration: 0.62,
    age: 0,
    alpha: 1,
  });
}

function threatImpact(threat, index) {
  if (!threat.alive) {
    return;
  }

  threat.alive = false;
  threats.splice(index, 1);

  if (threat.targetType === "city") {
    const city = state.cities[threat.targetIndex];
    if (city && city.alive) {
      city.alive = false;
      city.flash = 0.45;
      state.shake = Math.max(state.shake, 0.42);
      state.score = Math.max(0, state.score - 25);
      state.message = countAliveCities() === 0 ? "Skyline lost" : "Skyport breached";
      state.messageTimer = 1.15;
      addParticles(city.x, city.y, 22, "#ff7b76", "#ffcc7a", 220, 62);
      if (countAliveCities() === 0) {
        setMessage("Last stand", 1.35);
      }
      renderHud();
      return;
    }

    if (countAliveCities() === 0) {
      damageCore(threat.x, threat.y);
      return;
    }

    addParticles(threat.x, threat.y, 6, "#ffaf6f", "#ffd98a", 120, 24);
    return;
  }

  damageCore(threat.x, threat.y);
}

function destroyThreat(threat, blast) {
  if (!threat.alive) {
    return;
  }

  threat.alive = false;
  const index = threats.indexOf(threat);
  if (index >= 0) {
    threats.splice(index, 1);
  }

  const comboBonus = state.combo > 0 ? state.combo : 0;
  const base = threat.value + state.wave * 8;
  const awarded = Math.round(base * (1 + Math.min(comboBonus, 8) * 0.08));
  state.score += awarded;
  state.combo = comboBonus + 1;
  state.comboTimer = 1.05;
  state.shake = Math.max(state.shake, 0.14 + threat.radius * 0.02);
  addParticles(threat.x, threat.y, 14, threat.colorHead, threat.colorTail, 160, 46);
  addBlastPulse(threat.x, threat.y, threat.colorHead, blast.alpha);
  saveHighScore();
  renderHud();
}

function damageCore(x, y) {
  state.lives -= 1;
  state.shake = Math.max(state.shake, 0.58);
  state.message = state.lives > 0 ? "Core hit" : "Core breached";
  state.messageTimer = 1.2;
  addParticles(x, y, 28, "#ff8a74", "#ffd56f", 260, 72);
  addBlastPulse(x, y, "#ff8a74", 1);
  renderHud();

  if (state.lives <= 0) {
    endMission();
  }
}

function endMission() {
  state.phase = "gameover";
  saveHighScore();
  renderHud();
  renderOverlay();
}

function addBlastPulse(x, y, color, strength = 1) {
  particles.push({
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.45,
    age: 0,
    alpha: 1,
    drag: 1,
    gravity: 0,
    kind: "pulse",
    color,
    radius: 12 + strength * 8,
  });
}

function addParticles(x, y, count, colorA, colorB, speed = 160, life = 0.6) {
  for (let index = 0; index < count; index += 1) {
    const angle = randomRange(0, TAU);
    const magnitude = randomRange(speed * 0.25, speed);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * magnitude,
      vy: Math.sin(angle) * magnitude,
      life: life * randomRange(0.72, 1.2),
      age: 0,
      alpha: 1,
      drag: randomRange(0.88, 0.96),
      gravity: randomRange(38, 82),
      kind: "spark",
      color: Math.random() > 0.5 ? colorA : colorB,
      radius: randomRange(1.2, 2.8),
    });
  }
}

function createCities() {
  return CITY_POSITIONS.map((x, index) => ({
    x,
    y: CITY_Y + (index % 2 === 0 ? 3 : 0),
    alive: true,
    flash: 0,
    height: index % 3 === 0 ? 26 : 22,
  }));
}

function createStars() {
  return Array.from({ length: 130 }, () => ({
    x: Math.random() * LOGICAL_WIDTH,
    y: Math.random() * LOGICAL_HEIGHT,
    radius: randomRange(0.8, 2.2),
    speed: randomRange(16, 42),
    alpha: randomRange(0.28, 0.95),
    hue: Math.random() > 0.7 ? "#ffe8b0" : "#d4f7ff",
  }));
}

function draw() {
  context.setTransform(canvas.width / LOGICAL_WIDTH, 0, 0, canvas.height / LOGICAL_HEIGHT, 0, 0);
  context.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  context.save();
  context.translate(state.shakeX, state.shakeY);

  drawBackground();
  drawThreatTrails();
  drawCities();
  drawLaunchers();
  drawThreatBodies();
  drawInterceptors();
  drawBlasts();
  drawParticles();
  drawReticle();
  drawBannerText();

  context.restore();
}

function drawBackground() {
  const sky = context.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  sky.addColorStop(0, "#071221");
  sky.addColorStop(0.45, "#0c1730");
  sky.addColorStop(0.76, state.cities.every((city) => !city.alive) ? "#2d1730" : "#1d1c36");
  sky.addColorStop(1, "#0b0c14");
  context.fillStyle = sky;
  context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  const horizonGlow = context.createRadialGradient(CORE_X, CORE_Y + 24, 20, CORE_X, CORE_Y + 24, 270);
  horizonGlow.addColorStop(0, state.cities.every((city) => !city.alive) ? "rgba(255, 92, 126, 0.28)" : "rgba(255, 176, 98, 0.22)");
  horizonGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = horizonGlow;
  context.fillRect(0, 450, LOGICAL_WIDTH, 270);

  drawAurora();
  drawStars();
  drawHorizon();
}

function drawAurora() {
  context.save();
  context.globalCompositeOperation = "screen";
  const bands = [
    { x: 120, y: 130, w: 250, h: 70, color: "rgba(94, 230, 255, 0.14)" },
    { x: 250, y: 110, w: 220, h: 58, color: "rgba(255, 132, 112, 0.12)" },
    { x: 140, y: 170, w: 290, h: 78, color: "rgba(167, 114, 255, 0.1)" },
  ];

  for (const band of bands) {
    const gradient = context.createLinearGradient(band.x, band.y, band.x + band.w, band.y + band.h);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.5, band.color);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(band.x, band.y, band.w, band.h, -0.2, 0, TAU);
    context.fill();
  }
  context.restore();
}

function drawStars() {
  for (const star of stars) {
    context.save();
    context.globalAlpha = star.alpha;
    context.fillStyle = star.hue;
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, TAU);
    context.fill();
    context.restore();
  }
}

function drawHorizon() {
  context.save();
  const baseGlow = context.createLinearGradient(0, 560, 0, LOGICAL_HEIGHT);
  baseGlow.addColorStop(0, "rgba(255, 176, 92, 0.2)");
  baseGlow.addColorStop(0.3, "rgba(60, 70, 98, 0.12)");
  baseGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = baseGlow;
  context.fillRect(0, 560, LOGICAL_WIDTH, 160);

  context.fillStyle = "rgba(5, 10, 18, 0.96)";
  context.beginPath();
  context.moveTo(0, 612);
  context.lineTo(30, 592);
  context.lineTo(64, 604);
  context.lineTo(110, 580);
  context.lineTo(156, 604);
  context.lineTo(212, 586);
  context.lineTo(264, 608);
  context.lineTo(326, 584);
  context.lineTo(382, 604);
  context.lineTo(442, 582);
  context.lineTo(500, 606);
  context.lineTo(540, 594);
  context.lineTo(540, 720);
  context.lineTo(0, 720);
  context.closePath();
  context.fill();

  context.strokeStyle = "rgba(255, 196, 118, 0.08)";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(0, 611);
  context.lineTo(540, 611);
  context.stroke();
  context.restore();
}

function drawCities() {
  for (const city of state.cities) {
    if (city.alive) {
      drawCity(city);
    } else {
      drawRubble(city);
    }
  }

  drawCore();
}

function drawCity(city) {
  context.save();
  context.translate(city.x, city.y);
  const pulse = 0.5 + Math.sin(state.time * 4 + city.x * 0.02) * 0.1;
  const glowAlpha = city.flash > 0 ? city.flash * 0.9 : 0.12 + pulse * 0.08;
  const width = 22;
  const height = city.height + 8;

  context.globalCompositeOperation = "screen";
  const glow = context.createRadialGradient(0, -8, 4, 0, -6, 36);
  glow.addColorStop(0, `rgba(255, 211, 127, ${glowAlpha})`);
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.ellipse(0, -6, 34, 16, 0, 0, TAU);
  context.fill();
  context.globalCompositeOperation = "source-over";

  context.fillStyle = "rgba(26, 32, 51, 0.96)";
  context.beginPath();
  context.roundRect(-width * 0.8, -height, width * 1.6, height, 7);
  context.fill();

  const roof = context.createLinearGradient(0, -height, 0, 0);
  roof.addColorStop(0, "rgba(255, 214, 121, 0.92)");
  roof.addColorStop(1, "rgba(255, 152, 94, 0.55)");
  context.fillStyle = roof;
  context.beginPath();
  context.moveTo(-14, -height + 6);
  context.lineTo(0, -height - 10);
  context.lineTo(14, -height + 6);
  context.closePath();
  context.fill();

  context.fillStyle = "rgba(130, 208, 255, 0.72)";
  context.fillRect(-8, -height + 10, 4, 8);
  context.fillRect(4, -height + 10, 4, 8);
  context.fillRect(-2, -height + 20, 4, 5);
  context.restore();
}

function drawRubble(city) {
  context.save();
  context.translate(city.x, city.y);
  context.globalAlpha = 0.9;
  context.fillStyle = "rgba(9, 13, 20, 0.92)";
  context.fillRect(-13, -6, 26, 8);
  context.fillStyle = "rgba(63, 68, 82, 0.75)";
  context.fillRect(-7, -13, 14, 7);
  context.strokeStyle = "rgba(255, 128, 102, 0.2)";
  context.beginPath();
  context.moveTo(-12, -2);
  context.lineTo(12, -2);
  context.stroke();
  context.restore();
}

function drawCore() {
  const coreAlive = state.lives > 0;
  context.save();
  context.translate(CORE_X, CORE_Y + 4);
  const pulse = 0.5 + Math.sin(state.time * 3.2) * 0.12;
  const coreGlow = context.createRadialGradient(0, -8, 6, 0, -8, 58);
  coreGlow.addColorStop(0, coreAlive ? `rgba(127, 240, 255, ${0.22 + pulse * 0.2})` : "rgba(255, 116, 109, 0.2)");
  coreGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = coreGlow;
  context.beginPath();
  context.arc(0, -4, 56, 0, TAU);
  context.fill();

  context.fillStyle = coreAlive ? "rgba(22, 32, 54, 0.98)" : "rgba(42, 18, 23, 0.98)";
  context.beginPath();
  context.roundRect(-34, -54, 68, 58, 16);
  context.fill();

  context.fillStyle = coreAlive ? "rgba(130, 226, 255, 0.9)" : "rgba(255, 126, 116, 0.9)";
  context.fillRect(-16, -39, 32, 8);
  context.fillRect(-10, -24, 20, 8);

  context.strokeStyle = coreAlive ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 196, 160, 0.16)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(-27, -14);
  context.lineTo(27, -14);
  context.stroke();

  context.fillStyle = coreAlive ? "rgba(255, 209, 128, 0.95)" : "rgba(255, 159, 149, 0.9)";
  context.fillRect(-2, -62, 4, 10);
  context.fillRect(-6, -68, 12, 5);
  context.restore();
}

function drawLaunchers() {
  context.save();
  for (const launcher of launchers) {
    const flash = launcher.flash ?? 0;
    context.save();
    context.translate(launcher.x, launcher.y);
    const glow = context.createRadialGradient(0, -4, 2, 0, -4, 28);
    glow.addColorStop(0, `rgba(130, 236, 255, ${0.18 + flash * 0.75})`);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, -6, 28, 0, TAU);
    context.fill();

    context.fillStyle = "rgba(18, 26, 41, 0.98)";
    context.beginPath();
    context.roundRect(-16, -14, 32, 16, 6);
    context.fill();
    context.fillStyle = flash > 0 ? "rgba(133, 243, 255, 0.92)" : "rgba(252, 177, 109, 0.9)";
    context.fillRect(-3, -26, 6, 12);
    context.fillRect(-9, -8, 18, 4);
    context.restore();
  }
  context.restore();
}

function drawThreatTrails() {
  for (const threat of threats) {
    if (threat.trail.length < 2) {
      continue;
    }

    context.save();
    context.lineCap = "round";
    context.globalCompositeOperation = "screen";
    const gradient = context.createLinearGradient(threat.trail[0].x, threat.trail[0].y, threat.x, threat.y);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.02)");
    gradient.addColorStop(1, threat.colorTail);
    context.strokeStyle = gradient;
    context.lineWidth = threat.radius * 1.2;
    context.beginPath();
    context.moveTo(threat.trail[0].x, threat.trail[0].y);
    for (let index = 1; index < threat.trail.length; index += 1) {
      context.lineTo(threat.trail[index].x, threat.trail[index].y);
    }
    context.stroke();
    context.restore();
  }
}

function drawThreatBodies() {
  for (const threat of threats) {
    context.save();
    context.globalCompositeOperation = "screen";
    const glow = context.createRadialGradient(threat.x, threat.y, 0, threat.x, threat.y, threat.radius * 5);
    glow.addColorStop(0, threat.colorHead);
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(threat.x, threat.y, threat.radius * 2.8, 0, TAU);
    context.fill();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = threat.colorHead;
    context.beginPath();
    context.arc(threat.x, threat.y, threat.radius, 0, TAU);
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.35)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(threat.x - threat.radius * 1.6, threat.y - threat.radius * 0.3);
    context.lineTo(threat.x + threat.radius * 1.6, threat.y + threat.radius * 0.3);
    context.stroke();
    context.restore();
  }
}

function drawInterceptors() {
  for (const interceptor of interceptors) {
    if (interceptor.trail.length > 1) {
      context.save();
      context.globalCompositeOperation = "screen";
      context.lineCap = "round";
      context.strokeStyle = "rgba(127, 245, 255, 0.86)";
      context.lineWidth = 3.5;
      context.beginPath();
      context.moveTo(interceptor.trail[0].x, interceptor.trail[0].y);
      for (let index = 1; index < interceptor.trail.length; index += 1) {
        context.lineTo(interceptor.trail[index].x, interceptor.trail[index].y);
      }
      context.stroke();

      const trailGlow = context.createLinearGradient(interceptor.startX, interceptor.startY, interceptor.x, interceptor.y);
      trailGlow.addColorStop(0, "rgba(127, 245, 255, 0)");
      trailGlow.addColorStop(1, "rgba(127, 245, 255, 0.55)");
      context.strokeStyle = trailGlow;
      context.lineWidth = 8;
      context.beginPath();
      context.moveTo(interceptor.trail[0].x, interceptor.trail[0].y);
      for (let index = 1; index < interceptor.trail.length; index += 1) {
        context.lineTo(interceptor.trail[index].x, interceptor.trail[index].y);
      }
      context.stroke();
      context.restore();
    }

    context.save();
    context.globalCompositeOperation = "screen";
    const glow = context.createRadialGradient(interceptor.x, interceptor.y, 0, interceptor.x, interceptor.y, 24);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    glow.addColorStop(0.45, "rgba(127, 245, 255, 0.92)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(interceptor.x, interceptor.y, 9, 0, TAU);
    context.fill();
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "#f9ffff";
    context.beginPath();
    context.arc(interceptor.x, interceptor.y, 2.3, 0, TAU);
    context.fill();
    context.restore();
  }
}

function drawBlasts() {
  for (const blast of blasts) {
    context.save();
    context.globalCompositeOperation = "screen";
    const inner = context.createRadialGradient(blast.x, blast.y, blast.radius * 0.18, blast.x, blast.y, blast.radius);
    inner.addColorStop(0, `rgba(255, 255, 255, ${blast.alpha * 0.9})`);
    inner.addColorStop(0.28, `rgba(140, 245, 255, ${blast.alpha * 0.5})`);
    inner.addColorStop(0.75, `rgba(255, 185, 110, ${blast.alpha * 0.22})`);
    inner.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = inner;
    context.beginPath();
    context.arc(blast.x, blast.y, blast.radius, 0, TAU);
    context.fill();

    context.strokeStyle = `rgba(255, 236, 182, ${blast.alpha})`;
    context.lineWidth = 2.4;
    context.beginPath();
    context.arc(blast.x, blast.y, Math.max(2, blast.radius * 0.86), 0, TAU);
    context.stroke();
    context.restore();
  }
}

function drawParticles() {
  for (const particle of particles) {
    context.save();
    context.globalCompositeOperation = particle.kind === "pulse" ? "screen" : "lighter";
    context.globalAlpha = particle.alpha;
    if (particle.kind === "pulse") {
      context.strokeStyle = particle.color;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius * (1 + particle.age * 1.5), 0, TAU);
      context.stroke();
    } else {
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, TAU);
      context.fill();
    }
    context.restore();
  }
}

function drawReticle() {
  if (state.phase !== "playing" && state.phase !== "paused") {
    return;
  }

  const targetX = clamp(state.pointerX, 12, LOGICAL_WIDTH - 12);
  const targetY = clamp(state.pointerY, 18, LOGICAL_HEIGHT - 18);
  const nearest = getNearestLauncher(targetX);
  const pulse = 0.65 + Math.sin(state.time * 5.5) * 0.08;

  context.save();
  context.globalCompositeOperation = "screen";
  context.strokeStyle = `rgba(255, 204, 118, ${pulse})`;
  context.lineWidth = 1.6;
  context.setLineDash([8, 8]);
  context.beginPath();
  context.moveTo(nearest.x, nearest.y);
  context.lineTo(targetX, targetY);
  context.stroke();
  context.setLineDash([]);
  context.strokeStyle = "rgba(152, 246, 255, 0.9)";
  context.lineWidth = 1.4;
  context.beginPath();
  context.arc(targetX, targetY, 18, 0, TAU);
  context.stroke();
  context.beginPath();
  context.arc(targetX, targetY, 8, 0, TAU);
  context.stroke();
  context.restore();
}

function drawBannerText() {
  if (state.messageTimer <= 0 || !state.message) {
    return;
  }

  context.save();
  context.globalCompositeOperation = "screen";
  context.font = '700 22px "Source Serif 4", serif';
  context.textAlign = "center";
  context.fillStyle = "rgba(255, 236, 190, 0.9)";
  context.shadowColor = "rgba(255, 180, 90, 0.4)";
  context.shadowBlur = 18;
  context.fillText(state.message, CORE_X, 64);
  context.restore();
}

function renderHud() {
  scoreDisplay.textContent = formatNumber(state.score);
  livesDisplay.textContent = String(Math.max(0, state.lives));
  citiesDisplay.textContent = `${countAliveCities()}`;
  waveDisplay.textContent = String(state.wave);
  highScoreDisplay.textContent = formatNumber(state.highScore);
  launchersDisplay.textContent = "3";
  threatsDisplay.textContent = String(threats.length + state.threatsRemaining);
  comboDisplay.textContent = `x${Math.max(0, state.combo)}`;
  statusText.textContent = getStatusText();
  statusDot.classList.remove("is-alert", "is-danger");

  if (state.phase === "gameover" || state.lives <= 1 || countAliveCities() === 0) {
    statusDot.classList.add("is-danger");
  } else if (threats.length > 3 || state.threatsRemaining > 0) {
    statusDot.classList.add("is-alert");
  }
}

function renderOverlay() {
  if (state.phase === "playing") {
    overlay.classList.add("is-hidden");
    return;
  }

  overlay.classList.remove("is-hidden");

  if (state.phase === "title") {
    overlayEyebrow.textContent = "Retro defense";
    overlayTitle.textContent = "Sky Command";
    overlayCopy.textContent = "Tap Start or press Enter to launch the mission. Click the playfield to fire interceptors at incoming threats.";
    overlayStartButton.textContent = "Start mission";
    overlayRestartButton.textContent = "Restart";
  } else if (state.phase === "paused") {
    overlayEyebrow.textContent = "Paused";
    overlayTitle.textContent = "Hold position";
    overlayCopy.textContent = "The battlefield is frozen. Press Resume or hit P to keep defending the skyline.";
    overlayStartButton.textContent = "Resume mission";
    overlayRestartButton.textContent = "Restart";
  } else if (state.phase === "gameover") {
    overlayEyebrow.textContent = "Mission failed";
    overlayTitle.textContent = "Skyline breached";
    overlayCopy.textContent = `Final score ${formatNumber(state.score)}. Press Restart to try again and chase the high score.`;
    overlayStartButton.textContent = "Play again";
    overlayRestartButton.textContent = "Restart";
  }
}

function getStatusText() {
  if (state.phase === "title") {
    return "Awaiting command";
  }

  if (state.phase === "paused") {
    return "Paused";
  }

  if (state.phase === "gameover") {
    return "Mission failed";
  }

  if (state.waveClearTimer > 0) {
    return `Wave ${state.wave} cleared`;
  }

  if (countAliveCities() === 0) {
    return "Last stand";
  }

  if (state.threatsRemaining > 0 || threats.length > 0) {
    return `Wave ${state.wave} active`;
  }

  return "Command online";
}

function countAliveCities() {
  return state.cities.reduce((total, city) => total + (city.alive ? 1 : 0), 0);
}

function getNearestLauncher(targetX) {
  let nearest = launchers[0];
  let nearestDistance = Math.abs(targetX - nearest.x);

  for (const launcher of launchers) {
    const distance = Math.abs(targetX - launcher.x);
    if (distance < nearestDistance) {
      nearest = launcher;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function pointerToCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * LOGICAL_WIDTH;
  const y = ((event.clientY - rect.top) / rect.height) * LOGICAL_HEIGHT;
  return {
    x: clamp(x, 0, LOGICAL_WIDTH),
    y: clamp(y, 0, LOGICAL_HEIGHT),
  };
}

function computeSpawnInterval(wave) {
  return Math.max(0.26, 0.86 - wave * 0.035) * randomRange(0.8, 1.15);
}

function loadHighScore() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return Number.isFinite(Number(stored)) ? Number(stored) : 0;
  } catch {
    return 0;
  }
}

function saveHighScore() {
  if (state.score <= state.highScore) {
    return;
  }

  state.highScore = state.score;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(state.highScore));
  } catch {
    return;
  }
}

function resizeCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  context.setTransform(canvas.width / LOGICAL_WIDTH, 0, 0, canvas.height / LOGICAL_HEIGHT, 0, 0);
}

function ensureAudioContext() {
  if (audioContext) {
    return;
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (AudioCtor) {
    audioContext = new AudioCtor();
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function setMessage(text, duration = 1.1) {
  state.message = text;
  state.messageTimer = duration;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}
