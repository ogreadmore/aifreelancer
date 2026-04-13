import { formatNumber, initCommon } from "../common.js";

initCommon("orbit-drift");

const STORAGE_KEY = "aifreelancer-orbit-drift-high-score";
const SHIP_RADIUS = 14;
const SHIP_THRUST = 290;
const SHIP_ROTATION = 4.8;
const SHIP_MAX_SPEED = 380;
const SHIP_DRAG = 0.994;
const BULLET_SPEED = 690;
const BULLET_LIFE = 1.1;
const BULLET_RADIUS = 2.2;
const FIRE_COOLDOWN = 0.16;
const INVULNERABLE_TIME = 1.8;
const WAVE_DELAY = 1.1;
const ASTEROID_RADII = [58, 34, 20];
const ASTEROID_POINTS = [14, 12, 10];
const ASTEROID_SCORES = [20, 50, 100];
const STAR_COUNT = 160;
const MAX_BULLETS = 8;

const canvas = document.querySelector("#orbit-canvas");
const context = canvas.getContext("2d", { alpha: false });

const actionButton = document.querySelector("#orbit-action");
const restartButton = document.querySelector("#orbit-restart");
const soundButton = document.querySelector("#orbit-sound");

const scoreNode = document.querySelector("#orbit-score");
const highScoreNode = document.querySelector("#orbit-high-score");
const livesNode = document.querySelector("#orbit-lives");
const waveNode = document.querySelector("#orbit-wave");
const accuracyNode = document.querySelector("#orbit-accuracy");
const statusNode = document.querySelector("#orbit-status");
const tipNode = document.querySelector("#orbit-tip");

const holdButtons = [...document.querySelectorAll("[data-hold-control]")];

const state = {
  mode: "ready",
  width: 960,
  height: 720,
  dpr: 1,
  score: 0,
  highScore: readHighScore(),
  lives: 3,
  wave: 1,
  shots: 0,
  hits: 0,
  nextWaveAt: 0,
  shake: 0,
  exhaustAccumulator: 0,
  lastShotAt: 0,
  audioContext: null,
  soundEnabled: true,
  stars: [],
  ship: createShip(),
  bullets: [],
  asteroids: [],
  particles: [],
  time: performance.now(),
};

const controlState = {
  left: false,
  right: false,
  thrust: false,
  fire: false,
};

canvas.addEventListener("contextmenu", (event) => event.preventDefault());
actionButton.addEventListener("click", handlePrimaryAction);
restartButton.addEventListener("click", restartGame);
soundButton.addEventListener("click", toggleSound);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", handleBackgroundPause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    handleBackgroundPause();
  }
});
window.addEventListener("resize", handleResize);

holdButtons.forEach((button) => {
  const controlName = button.dataset.holdControl;

  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") {
      return;
    }

    event.preventDefault();
    primeAudio();
    if (state.mode === "ready" || state.mode === "gameover") {
      startGame();
    }

    controlState[controlName] = true;
    button.setAttribute("aria-pressed", "true");
    if (button.setPointerCapture) {
      button.setPointerCapture(event.pointerId);
    }
  });

  const stop = (event) => {
    event.preventDefault();
    controlState[controlName] = false;
    button.setAttribute("aria-pressed", "false");
  };

  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("lostpointercapture", stop);
});

handleResize();
resetGameWorld();
syncSoundButton();
requestAnimationFrame(loop);

function createShip() {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    radius: SHIP_RADIUS,
    invulnerableUntil: 0,
  };
}

function readHighScore() {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY) || 0);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeHighScore(value) {
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

function wrapValue(value, max) {
  if (value < 0) {
    return value + max;
  }

  if (value > max) {
    return value - max;
  }

  return value;
}

function distanceSquared(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function createStars(count, width, height) {
  return Array.from({ length: count }, () => {
    const layer = Math.floor(randomRange(0, 3));
    return {
      x: randomRange(0, width),
      y: randomRange(0, height),
      size: randomRange(0.8, 2.1) + layer * 0.35,
      layer,
      phase: randomRange(0, Math.PI * 2),
      driftX: randomRange(-6, 6) * (layer + 1) * 0.12,
      driftY: randomRange(-4, 4) * (layer + 1) * 0.12,
    };
  });
}

function handleResize() {
  const rect = canvas.getBoundingClientRect();
  const nextWidth = Math.max(320, Math.round(rect.width || 960));
  const nextHeight = Math.max(240, Math.round(rect.height || nextWidth * 0.75));
  const nextDpr = Math.max(window.devicePixelRatio || 1, 1);
  const prevWidth = state.width;
  const prevHeight = state.height;

  state.width = nextWidth;
  state.height = nextHeight;
  state.dpr = nextDpr;
  canvas.width = Math.round(nextWidth * nextDpr);
  canvas.height = Math.round(nextHeight * nextDpr);
  context.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
  context.lineJoin = "round";
  context.lineCap = "round";

  if (prevWidth !== nextWidth || prevHeight !== nextHeight) {
    scaleWorld(prevWidth, prevHeight, nextWidth, nextHeight);
  }

  if (!state.stars.length) {
    state.stars = createStars(STAR_COUNT, nextWidth, nextHeight);
  }
}

function scaleWorld(prevWidth, prevHeight, nextWidth, nextHeight) {
  if (!prevWidth || !prevHeight) {
    state.ship.x = nextWidth / 2;
    state.ship.y = nextHeight / 2;
    state.stars = createStars(STAR_COUNT, nextWidth, nextHeight);
    return;
  }

  const scaleX = nextWidth / prevWidth;
  const scaleY = nextHeight / prevHeight;
  const scaleSpeed = (scaleX + scaleY) / 2;

  state.ship.x *= scaleX;
  state.ship.y *= scaleY;
  state.ship.vx *= scaleSpeed;
  state.ship.vy *= scaleSpeed;

  state.bullets.forEach((bullet) => {
    bullet.x *= scaleX;
    bullet.y *= scaleY;
    bullet.vx *= scaleSpeed;
    bullet.vy *= scaleSpeed;
  });

  state.asteroids.forEach((asteroid) => {
    asteroid.x *= scaleX;
    asteroid.y *= scaleY;
    asteroid.vx *= scaleSpeed;
    asteroid.vy *= scaleSpeed;
  });

  state.particles.forEach((particle) => {
    particle.x *= scaleX;
    particle.y *= scaleY;
    particle.vx *= scaleSpeed;
    particle.vy *= scaleSpeed;
  });

  state.stars = createStars(STAR_COUNT, nextWidth, nextHeight);
}

function syncHud() {
  scoreNode.textContent = formatNumber(state.score);
  highScoreNode.textContent = formatNumber(state.highScore);
  livesNode.textContent = String(state.lives);
  waveNode.textContent = String(state.wave);
  accuracyNode.textContent = `${getAccuracy()}%`;
  statusNode.textContent = getStatusTitle();
  tipNode.textContent = getStatusTip();
}

function syncActionButton() {
  if (state.mode === "running") {
    actionButton.textContent = "Pause";
    return;
  }

  if (state.mode === "paused") {
    actionButton.textContent = "Resume";
    return;
  }

  if (state.mode === "gameover") {
    actionButton.textContent = "Launch again";
    return;
  }

  actionButton.textContent = "Launch";
}

function syncSoundButton() {
  soundButton.textContent = state.soundEnabled ? "Sound on" : "Sound off";
  soundButton.setAttribute("aria-pressed", String(state.soundEnabled));
}

function getAccuracy() {
  if (!state.shots) {
    return 0;
  }

  return Math.round((state.hits / state.shots) * 100);
}

function getStatusTitle() {
  if (state.mode === "gameover") {
    return "Game over";
  }

  if (state.mode === "paused") {
    return "Paused";
  }

  if (state.nextWaveAt) {
    return "Wave clear";
  }

  if (state.mode === "running") {
    return `Wave ${state.wave}`;
  }

  return "Ready";
}

function getStatusTip() {
  if (state.mode === "gameover") {
    return "Restart to try again. The best run so far is already saved locally.";
  }

  if (state.mode === "paused") {
    return "Paused. Use the action button or press P to resume the run.";
  }

  if (state.nextWaveAt) {
    return "The field is clearing. The next wave will jump in automatically.";
  }

  if (state.mode === "running") {
    return "Rotate, thrust, and fire in short bursts. Smaller rocks are faster and harder to read.";
  }

  return "Press Launch to drop into the drift field, or use Space and Enter if you prefer the keyboard.";
}

function updateHighScoreIfNeeded() {
  if (state.score > state.highScore) {
    state.highScore = state.score;
    writeHighScore(state.highScore);
  }
}

function setMode(nextMode) {
  state.mode = nextMode;
  syncActionButton();
  syncHud();
}

function resetGameWorld() {
  state.mode = "ready";
  state.score = 0;
  state.lives = 3;
  state.wave = 1;
  state.shots = 0;
  state.hits = 0;
  state.nextWaveAt = 0;
  state.shake = 0;
  state.exhaustAccumulator = 0;
  state.lastShotAt = 0;
  state.ship = createShip();
  state.ship.x = state.width / 2;
  state.ship.y = state.height / 2;
  state.ship.angle = -Math.PI / 2;
  state.bullets = [];
  state.asteroids = [];
  state.particles = [];
  syncActionButton();
  syncHud();
}

function startGame() {
  resetGameWorld();
  state.mode = "running";
  state.ship.invulnerableUntil = performance.now() + INVULNERABLE_TIME * 1000;
  spawnWave();
  state.nextWaveAt = 0;
  syncActionButton();
  syncHud();
  primeAudio();
}

function restartGame() {
  startGame();
}

function handlePrimaryAction() {
  primeAudio();

  if (state.mode === "running") {
    setMode("paused");
    return;
  }

  if (state.mode === "paused") {
    setMode("running");
    return;
  }

  startGame();
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  if (state.soundEnabled) {
    primeAudio();
  }
  syncSoundButton();
}

function primeAudio() {
  if (!state.soundEnabled) {
    return;
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return;
  }

  if (!state.audioContext) {
    state.audioContext = new AudioCtor();
  }

  if (state.audioContext.state === "suspended") {
    state.audioContext.resume().catch(() => {});
  }
}

function playTone({ frequency, toFrequency, duration = 0.1, gain = 0.05, type = "sine" }) {
  if (!state.soundEnabled || !state.audioContext) {
    return;
  }

  const ctx = state.audioContext;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  const now = ctx.currentTime;

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (typeof toFrequency === "number") {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFrequency), now + duration);
  }

  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.04);
}

function playShotSound() {
  playTone({ frequency: 780, toFrequency: 620, duration: 0.06, gain: 0.04, type: "square" });
}

function playExplosionSound() {
  playTone({ frequency: 150, toFrequency: 55, duration: 0.18, gain: 0.08, type: "sawtooth" });
}

function playWaveSound() {
  playTone({ frequency: 220, toFrequency: 440, duration: 0.16, gain: 0.03, type: "triangle" });
}

function handleKeyDown(event) {
  if (isTypingTarget(event.target)) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "p") {
    event.preventDefault();
    handlePrimaryAction();
    return;
  }

  if (key === "r") {
    event.preventDefault();
    restartGame();
    return;
  }

  if (key === " " || key === "enter") {
    event.preventDefault();
    if (state.mode === "running") {
      controlState.fire = true;
      return;
    }

    handlePrimaryAction();
    if (state.mode === "running") {
      controlState.fire = true;
    }
    return;
  }

  if (key === "arrowleft" || key === "a") {
    event.preventDefault();
    if (state.mode === "ready" || state.mode === "gameover") {
      startGame();
    }
    if (state.mode === "running") {
      controlState.left = true;
    }
    return;
  }

  if (key === "arrowright" || key === "d") {
    event.preventDefault();
    if (state.mode === "ready" || state.mode === "gameover") {
      startGame();
    }
    if (state.mode === "running") {
      controlState.right = true;
    }
    return;
  }

  if (key === "arrowup" || key === "w") {
    event.preventDefault();
    if (state.mode === "ready" || state.mode === "gameover") {
      startGame();
    }
    if (state.mode === "running") {
      controlState.thrust = true;
    }
  }
}

function handleKeyUp(event) {
  if (isTypingTarget(event.target)) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === " " || key === "enter") {
    controlState.fire = false;
    return;
  }

  if (key === "arrowleft" || key === "a") {
    controlState.left = false;
    return;
  }

  if (key === "arrowright" || key === "d") {
    controlState.right = false;
    return;
  }

  if (key === "arrowup" || key === "w") {
    controlState.thrust = false;
  }
}

function isTypingTarget(target) {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

function releaseAllControls() {
  controlState.left = false;
  controlState.right = false;
  controlState.thrust = false;
  controlState.fire = false;
  holdButtons.forEach((button) => button.setAttribute("aria-pressed", "false"));
}

function handleBackgroundPause() {
  releaseAllControls();
  if (state.mode === "running") {
    setMode("paused");
  }
}

function loop(now) {
  const dt = Math.min((now - state.time) / 1000, 0.033);
  state.time = now;

  if (state.mode === "running") {
    updateShip(dt, now);
    updateBullets(dt, now);
    updateAsteroids(dt);
    updateCollisions(now);

    if (state.nextWaveAt && now >= state.nextWaveAt) {
      state.wave += 1;
      state.nextWaveAt = 0;
      spawnWave();
      state.ship.invulnerableUntil = now + INVULNERABLE_TIME * 0.7 * 1000;
      playWaveSound();
      state.shake = Math.max(state.shake, 4);
    }
  }

  updateParticles(dt);
  updateStars(dt);
  updateOverlayMotion(dt);
  render(now);
  syncHud();
  requestAnimationFrame(loop);
}

function updateOverlayMotion(dt) {
  state.shake = Math.max(0, state.shake - dt * 16);
}

function updateStars(dt) {
  state.stars.forEach((star) => {
    star.x += star.driftX * dt;
    star.y += star.driftY * dt;
    star.phase += dt * (0.8 + star.layer * 0.45);
    if (star.x < 0) {
      star.x += state.width;
    } else if (star.x > state.width) {
      star.x -= state.width;
    }
    if (star.y < 0) {
      star.y += state.height;
    } else if (star.y > state.height) {
      star.y -= state.height;
    }
  });
}

function updateShip(dt, now) {
  if (controlState.left) {
    state.ship.angle -= SHIP_ROTATION * dt;
  }

  if (controlState.right) {
    state.ship.angle += SHIP_ROTATION * dt;
  }

  state.ship.thrusting = Boolean(controlState.thrust);
  if (controlState.thrust) {
    const accelX = Math.cos(state.ship.angle) * SHIP_THRUST * dt;
    const accelY = Math.sin(state.ship.angle) * SHIP_THRUST * dt;
    state.ship.vx += accelX;
    state.ship.vy += accelY;
    state.exhaustAccumulator += dt;
    while (state.exhaustAccumulator >= 0.03) {
      spawnExhaustParticle(now);
      state.exhaustAccumulator -= 0.03;
    }
  } else {
    state.exhaustAccumulator = 0;
  }

  const speed = Math.hypot(state.ship.vx, state.ship.vy);
  if (speed > SHIP_MAX_SPEED) {
    const ratio = SHIP_MAX_SPEED / speed;
    state.ship.vx *= ratio;
    state.ship.vy *= ratio;
  }

  state.ship.vx *= Math.pow(SHIP_DRAG, dt * 60);
  state.ship.vy *= Math.pow(SHIP_DRAG, dt * 60);

  state.ship.x += state.ship.vx * dt;
  state.ship.y += state.ship.vy * dt;
  wrapEntity(state.ship);

  if (controlState.fire && now - state.lastShotAt >= FIRE_COOLDOWN * 1000 && state.bullets.length < MAX_BULLETS) {
    fireBullet(now);
  }
}

function fireBullet(now) {
  state.lastShotAt = now;
  state.shots += 1;

  const noseX = state.ship.x + Math.cos(state.ship.angle) * (state.ship.radius + 4);
  const noseY = state.ship.y + Math.sin(state.ship.angle) * (state.ship.radius + 4);

  state.bullets.push({
    x: noseX,
    y: noseY,
    vx: state.ship.vx + Math.cos(state.ship.angle) * BULLET_SPEED,
    vy: state.ship.vy + Math.sin(state.ship.angle) * BULLET_SPEED,
    life: BULLET_LIFE,
    radius: BULLET_RADIUS,
    angle: state.ship.angle,
  });

  playShotSound();
  state.shake = Math.max(state.shake, 1.5);
}

function updateBullets(dt, now) {
  state.bullets.forEach((bullet) => {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    wrapEntity(bullet);
  });

  state.bullets = state.bullets.filter((bullet) => bullet.life > 0);
}

function updateAsteroids(dt) {
  state.asteroids.forEach((asteroid) => {
    asteroid.x += asteroid.vx * dt;
    asteroid.y += asteroid.vy * dt;
    asteroid.angle += asteroid.spin * dt;
    wrapEntity(asteroid);
  });
}

function updateCollisions(now) {
  const remainingBullets = [];
  const hitAsteroids = new Set();

  for (const bullet of state.bullets) {
    let bulletHit = false;

    for (let index = 0; index < state.asteroids.length; index += 1) {
      const asteroid = state.asteroids[index];
      if (hitAsteroids.has(index)) {
        continue;
      }

      const hitRadius = bullet.radius + asteroid.radius;
      if (distanceSquared(bullet.x, bullet.y, asteroid.x, asteroid.y) <= hitRadius * hitRadius) {
        bulletHit = true;
        hitAsteroids.add(index);
        break;
      }
    }

    if (!bulletHit) {
      remainingBullets.push(bullet);
    }
  }

  if (hitAsteroids.size) {
    const nextAsteroids = [];

    state.asteroids.forEach((asteroid, index) => {
      if (!hitAsteroids.has(index)) {
        nextAsteroids.push(asteroid);
        return;
      }

      state.hits += 1;
      state.score += ASTEROID_SCORES[asteroid.level] ?? 20;
      updateHighScoreIfNeeded();
      spawnExplosion(
        asteroid.x,
        asteroid.y,
        asteroid.level === 0 ? 26 : asteroid.level === 1 ? 18 : 12,
        asteroid.level === 0 ? 120 : 90,
        asteroid.level === 0 ? "rgba(242, 185, 75, 1)" : "rgba(17, 168, 154, 1)",
      );
      state.shake = Math.min(state.shake + 4 + asteroid.level * 1.5, 14);

      if (asteroid.level < ASTEROID_RADII.length - 1) {
        nextAsteroids.push(createAsteroid(asteroid.level + 1, asteroid.x, asteroid.y, true));
        nextAsteroids.push(createAsteroid(asteroid.level + 1, asteroid.x, asteroid.y, true));
      }
    });

    state.asteroids = nextAsteroids;
    state.bullets = remainingBullets;
    playExplosionSound();
  }

  if (state.ship.invulnerableUntil <= now) {
    for (const asteroid of state.asteroids) {
      const hitRadius = asteroid.radius + state.ship.radius;
      if (distanceSquared(state.ship.x, state.ship.y, asteroid.x, asteroid.y) <= hitRadius * hitRadius) {
        triggerShipHit(now);
        break;
      }
    }
  }

  if (!state.asteroids.length && state.mode === "running" && !state.nextWaveAt) {
    state.nextWaveAt = now + WAVE_DELAY * 1000;
  }
}

function triggerShipHit(now) {
  state.lives -= 1;
  state.bullets = [];
  state.nextWaveAt = 0;
  state.ship.vx = 0;
  state.ship.vy = 0;
  state.ship.angle = -Math.PI / 2;
  state.ship.x = state.width / 2;
  state.ship.y = state.height / 2;
  state.ship.invulnerableUntil = now + INVULNERABLE_TIME * 1000;
  state.shake = Math.min(state.shake + 8, 14);
  spawnExplosion(state.ship.x, state.ship.y, 34, 180, "rgba(245, 83, 79, 1)");
  playExplosionSound();

  if (state.lives <= 0) {
    state.lives = 0;
    state.mode = "gameover";
    updateHighScoreIfNeeded();
    state.nextWaveAt = 0;
    controlState.left = false;
    controlState.right = false;
    controlState.thrust = false;
    controlState.fire = false;
    syncActionButton();
  }
}

function wrapEntity(entity) {
  const radius = entity.radius || 0;

  if (entity.x < -radius) {
    entity.x = state.width + radius;
  } else if (entity.x > state.width + radius) {
    entity.x = -radius;
  }

  if (entity.y < -radius) {
    entity.y = state.height + radius;
  } else if (entity.y > state.height + radius) {
    entity.y = -radius;
  }
}

function spawnWave() {
  const count = Math.min(4 + state.wave, 12);
  state.asteroids = [];

  for (let index = 0; index < count; index += 1) {
    state.asteroids.push(createAsteroid(0));
  }

  state.ship.invulnerableUntil = performance.now() + INVULNERABLE_TIME * 1000;
  playWaveSound();
}

function createAsteroid(level, x, y, splitOrigin = false) {
  const radius = ASTEROID_RADII[level];
  const sides = ASTEROID_POINTS[level];
  const jitter = Array.from({ length: sides }, () => randomRange(0.72, 1.18));
  const origin = splitOrigin
    ? {
        x,
        y,
      }
    : pickEdgeSpawnPoint(radius);
  const directionToCenter = Math.atan2(state.height / 2 - origin.y, state.width / 2 - origin.x);
  const speed = randomRange(48, 86) + state.wave * 4 + level * 8;

  return {
    level,
    x: origin.x,
    y: origin.y,
    vx: Math.cos(directionToCenter + randomRange(-0.9, 0.9)) * speed,
    vy: Math.sin(directionToCenter + randomRange(-0.9, 0.9)) * speed,
    angle: randomRange(0, Math.PI * 2),
    spin: randomRange(-1.4, 1.4),
    radius,
    points: jitter,
  };
}

function pickEdgeSpawnPoint(radius) {
  const edge = Math.floor(randomRange(0, 4));
  const inset = radius + 24;

  if (edge === 0) {
    return {
      x: randomRange(0, state.width),
      y: -inset,
    };
  }

  if (edge === 1) {
    return {
      x: state.width + inset,
      y: randomRange(0, state.height),
    };
  }

  if (edge === 2) {
    return {
      x: randomRange(0, state.width),
      y: state.height + inset,
    };
  }

  return {
    x: -inset,
    y: randomRange(0, state.height),
  };
}

function spawnExhaustParticle(now) {
  const tailX = state.ship.x - Math.cos(state.ship.angle) * (state.ship.radius + 1);
  const tailY = state.ship.y - Math.sin(state.ship.angle) * (state.ship.radius + 1);
  const driftAngle = state.ship.angle + Math.PI + randomRange(-0.55, 0.55);
  const driftSpeed = randomRange(16, 80);

  state.particles.push({
    x: tailX,
    y: tailY,
    vx: Math.cos(driftAngle) * driftSpeed + state.ship.vx * 0.15,
    vy: Math.sin(driftAngle) * driftSpeed + state.ship.vy * 0.15,
    life: 0.42,
    maxLife: 0.42,
    size: randomRange(1.4, 3.2),
    color: "rgba(255, 181, 88, 1)",
    rotation: randomRange(0, Math.PI * 2),
    spin: randomRange(-7, 7),
    glow: 14,
  });

  if (now % 3 < 0.03) {
    state.shake = Math.max(state.shake, 0.4);
  }
}

function spawnExplosion(x, y, count, speed, color) {
  for (let index = 0; index < count; index += 1) {
    const angle = randomRange(0, Math.PI * 2);
    const particleSpeed = randomRange(speed * 0.25, speed);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * particleSpeed,
      vy: Math.sin(angle) * particleSpeed,
      life: randomRange(0.38, 0.95),
      maxLife: randomRange(0.38, 0.95),
      size: randomRange(1.6, 3.8),
      color,
      rotation: randomRange(0, Math.PI * 2),
      spin: randomRange(-8, 8),
      glow: 10,
    });
  }
}

function updateParticles(dt) {
  state.particles.forEach((particle) => {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.992, dt * 60);
    particle.vy *= Math.pow(0.992, dt * 60);
    particle.rotation += particle.spin * dt;
    particle.life -= dt;
  });

  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function render(now) {
  context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  context.clearRect(0, 0, state.width, state.height);

  const shakeX = state.shake ? randomRange(-state.shake, state.shake) : 0;
  const shakeY = state.shake ? randomRange(-state.shake, state.shake) : 0;

  context.save();
  context.translate(shakeX, shakeY);
  renderBackground(now);
  renderStars(now);
  renderParticles();
  renderAsteroids();
  renderBullets();
  renderShip(now);
  renderHud();
  renderOverlay(now);
  context.restore();
}

function renderBackground(now) {
  const bg = context.createLinearGradient(0, 0, 0, state.height);
  bg.addColorStop(0, "#02050d");
  bg.addColorStop(0.55, "#050a18");
  bg.addColorStop(1, "#090e1c");
  context.fillStyle = bg;
  context.fillRect(0, 0, state.width, state.height);

  const glowTop = context.createRadialGradient(
    state.width * 0.72,
    state.height * 0.18,
    12,
    state.width * 0.72,
    state.height * 0.18,
    state.width * 0.48,
  );
  glowTop.addColorStop(0, "rgba(17, 168, 154, 0.15)");
  glowTop.addColorStop(1, "rgba(17, 168, 154, 0)");
  context.fillStyle = glowTop;
  context.fillRect(0, 0, state.width, state.height);

  const glowBottom = context.createRadialGradient(
    state.width * 0.2,
    state.height * 0.85,
    12,
    state.width * 0.2,
    state.height * 0.85,
    state.width * 0.42,
  );
  glowBottom.addColorStop(0, "rgba(255, 122, 31, 0.12)");
  glowBottom.addColorStop(1, "rgba(255, 122, 31, 0)");
  context.fillStyle = glowBottom;
  context.fillRect(0, 0, state.width, state.height);

  context.fillStyle = "rgba(255, 255, 255, 0.035)";
  for (let y = 0; y < state.height; y += 4) {
    context.fillRect(0, y, state.width, 1);
  }

  const ringAlpha = 0.07 + Math.sin(now * 0.0007) * 0.012;
  context.strokeStyle = `rgba(84, 113, 180, ${ringAlpha})`;
  context.lineWidth = 1;
  context.beginPath();
  context.ellipse(state.width * 0.5, state.height * 0.5, state.width * 0.34, state.height * 0.34, 0, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.ellipse(state.width * 0.5, state.height * 0.5, state.width * 0.2, state.height * 0.2, 0, 0, Math.PI * 2);
  context.stroke();
}

function renderStars(now) {
  context.save();
  context.globalCompositeOperation = "lighter";
  for (const star of state.stars) {
    const twinkle = 0.5 + Math.sin(now * 0.0015 + star.phase) * 0.35;
    const alpha = clamp(0.18 + twinkle * 0.4 + star.layer * 0.08, 0.1, 0.95);
    context.fillStyle = `rgba(244, 248, 255, ${alpha})`;
    context.fillRect(star.x, star.y, star.size, star.size);
    if (star.size > 2) {
      context.fillStyle = `rgba(11, 132, 255, ${alpha * 0.18})`;
      context.fillRect(star.x - 1, star.y - 1, star.size + 2, star.size + 2);
    }
  }
  context.restore();
}

function renderParticles() {
  context.save();
  context.globalCompositeOperation = "lighter";
  for (const particle of state.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    context.save();
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation);
    context.fillStyle = particle.color.replace(/,\s*1\)/, `, ${alpha})`);
    context.shadowColor = particle.color.replace(/,\s*1\)/, `, ${alpha})`);
    context.shadowBlur = particle.glow;
    context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    context.restore();
  }
  context.restore();
}

function renderAsteroids() {
  for (const asteroid of state.asteroids) {
    const wobble = Math.sin(asteroid.angle * 0.8) * 0.03;
    context.save();
    context.translate(asteroid.x, asteroid.y);
    context.rotate(asteroid.angle);
    context.strokeStyle = "rgba(237, 242, 255, 0.88)";
    context.fillStyle = "rgba(11, 16, 28, 0.28)";
    context.lineWidth = 2.25;
    context.shadowColor = asteroid.level === 0 ? "rgba(242, 185, 75, 0.24)" : "rgba(17, 168, 154, 0.18)";
    context.shadowBlur = 10;
    context.beginPath();
    for (let index = 0; index < asteroid.points.length; index += 1) {
      const progress = (index / asteroid.points.length) * Math.PI * 2 + wobble;
      const radius = asteroid.radius * asteroid.points[index];
      const px = Math.cos(progress) * radius;
      const py = Math.sin(progress) * radius;
      if (index === 0) {
        context.moveTo(px, py);
      } else {
        context.lineTo(px, py);
      }
    }
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }
}

function renderBullets() {
  context.save();
  context.globalCompositeOperation = "lighter";
  for (const bullet of state.bullets) {
    const trailX = bullet.x - Math.cos(bullet.angle) * 8;
    const trailY = bullet.y - Math.sin(bullet.angle) * 8;
    context.strokeStyle = "rgba(242, 185, 75, 0.95)";
    context.shadowColor = "rgba(242, 185, 75, 0.85)";
    context.shadowBlur = 12;
    context.lineWidth = 2.2;
    context.beginPath();
    context.moveTo(trailX, trailY);
    context.lineTo(bullet.x, bullet.y);
    context.stroke();
    context.fillStyle = "rgba(255, 245, 224, 0.98)";
    context.beginPath();
    context.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function renderShip(now) {
  const active = state.mode !== "gameover";
  const alpha = state.ship.invulnerableUntil > now ? (Math.floor(now / 110) % 2 ? 0.32 : 0.9) : 1;
  const shipX = state.ship.x;
  const shipY = state.ship.y;
  const shipAngle = state.ship.angle;
  const shipRadius = state.ship.radius;

  if (!active) {
    return;
  }

  context.save();
  context.translate(shipX, shipY);
  context.rotate(shipAngle);
  context.globalAlpha = alpha;
  context.strokeStyle = "rgba(244, 248, 255, 0.96)";
  context.fillStyle = "rgba(7, 12, 22, 0.42)";
  context.lineWidth = 2.4;
  context.shadowColor = "rgba(11, 132, 255, 0.3)";
  context.shadowBlur = 12;

  context.beginPath();
  context.moveTo(shipRadius + 2, 0);
  context.lineTo(-shipRadius, shipRadius * 0.82);
  context.lineTo(-shipRadius * 0.35, 0);
  context.lineTo(-shipRadius, -shipRadius * 0.82);
  context.closePath();
  context.fill();
  context.stroke();

  context.beginPath();
  context.arc(0, 0, 2.4, 0, Math.PI * 2);
  context.fillStyle = "rgba(242, 185, 75, 0.92)";
  context.fill();

  if (state.ship.thrusting && state.mode === "running") {
    context.globalAlpha = 1;
    context.shadowColor = "rgba(255, 122, 31, 0.45)";
    context.shadowBlur = 18;
    context.fillStyle = "rgba(255, 122, 31, 0.92)";
    context.beginPath();
    context.moveTo(-shipRadius * 0.85, 0);
    context.lineTo(-shipRadius - randomRange(2, 8), -shipRadius * 0.34);
    context.lineTo(-shipRadius - randomRange(8, 18), 0);
    context.lineTo(-shipRadius - randomRange(2, 8), shipRadius * 0.34);
    context.closePath();
    context.fill();
  }

  if (state.ship.invulnerableUntil > now) {
    context.strokeStyle = "rgba(17, 168, 154, 0.55)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(0, 0, shipRadius + 7, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function renderHud() {
  context.save();
  context.fillStyle = "rgba(245, 248, 255, 0.92)";
  context.font = "700 14px DM Sans, sans-serif";
  context.textBaseline = "top";
  context.fillText(`SCORE ${formatNumber(state.score)}`, 18, 16);
  context.fillText(`WAVE ${state.wave}`, 18, 34);

  context.textAlign = "right";
  context.fillText(`HIGH ${formatNumber(state.highScore)}`, state.width - 18, 16);
  context.fillText(`LIVES ${state.lives}`, state.width - 18, 34);

  context.textAlign = "left";
  context.font = "600 12px DM Sans, sans-serif";
  context.fillStyle = "rgba(214, 223, 236, 0.74)";
  context.fillText(`ACCURACY ${getAccuracy()}%`, 18, state.height - 28);
  context.restore();
}

function renderOverlay(now) {
  const showOverlay = state.mode !== "running" || state.nextWaveAt;
  if (!showOverlay) {
    return;
  }

  const overlayWidth = Math.min(state.width - 48, 420);
  context.font = "500 14px DM Sans, sans-serif";
  const lines = wrapText(context, getStatusTip(), overlayWidth - 42);
  const overlayHeight = 80 + lines.length * 18;
  const x = (state.width - overlayWidth) / 2;
  const y = (state.height - overlayHeight) / 2;

  context.save();
  context.fillStyle = "rgba(3, 6, 14, 0.7)";
  drawRoundedRect(context, x, y, overlayWidth, overlayHeight, 22);
  context.fill();
  context.strokeStyle = "rgba(255, 255, 255, 0.12)";
  context.lineWidth = 1;
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(245, 248, 255, 0.98)";
  context.font = "700 30px Source Serif 4, serif";
  context.fillText(getStatusTitle(), state.width / 2, y + 32);
  context.fillStyle = "rgba(214, 223, 236, 0.86)";
  lines.forEach((line, index) => {
    context.fillText(line, state.width / 2, y + 58 + index * 18);
  });
  context.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      return;
    }

    if (line) {
      lines.push(line);
    }
    line = word;
  });

  if (line) {
    lines.push(line);
  }

  return lines.length ? lines : [text];
}
