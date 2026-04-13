import { initCommon } from "../common.js";

initCommon("star-defender");

const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const scoreDisplay = document.querySelector("#score-display");
const livesDisplay = document.querySelector("#lives-display");
const waveDisplay = document.querySelector("#wave-display");
const highScoreDisplay = document.querySelector("#high-score-display");
const weaponDisplay = document.querySelector("#weapon-display");
const comboDisplay = document.querySelector("#combo-display");
const shieldDisplay = document.querySelector("#shield-display");
const statusDisplay = document.querySelector("#status-display");
const overlay = document.querySelector("#game-overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayEyebrow = document.querySelector("#overlay-eyebrow");
const overlayCopy = document.querySelector("#overlay-copy");
const overlayStartButton = document.querySelector("#overlay-start");
const overlayRestartButton = document.querySelector("#overlay-restart");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const moveLeftButton = document.querySelector("#move-left");
const moveRightButton = document.querySelector("#move-right");
const fireButton = document.querySelector("#fire-button");

const STORAGE_KEY = "aifreelancer.star-defender.high-score";
const LOGICAL_WIDTH = 360;
const LOGICAL_HEIGHT = 540;
const LANES = 7;
const LANE_MARGIN = 36;
const LANE_SPACING = (LOGICAL_WIDTH - LANE_MARGIN * 2) / (LANES - 1);
const PLAYER_Y = LOGICAL_HEIGHT - 68;
const TAU = Math.PI * 2;
const MAX_PARTICLES = 220;

const WAVE_PATTERNS = [
  ["1010101", "0101010", "1110111", "0011100"],
  ["1100110", "0111110", "1011101", "0100100"],
  ["0011100", "1110001", "0101010", "1110111"],
  ["1001001", "0110110", "1101101", "0011110"],
];

const state = {
  phase: "title",
  score: 0,
  highScore: loadHighScore(),
  wave: 1,
  lives: 3,
  shields: 0,
  combo: 0,
  comboTimer: 0,
  message: "Awaiting launch",
  messageTimer: 0,
  pendingWaveDelay: 0.8,
  rapidUntil: 0,
  time: 0,
  leftHeld: false,
  rightHeld: false,
  fireHeld: false,
  moveCooldown: 0,
  shake: 0,
  shakeX: 0,
  shakeY: 0,
  audioArmed: false,
};

const player = {
  lane: 3,
  x: laneCenter(3),
  y: PLAYER_Y,
  targetLane: 3,
  cooldown: 0,
  invuln: 0,
  thrust: 0,
};

const bullets = [];
const enemyBullets = [];
const enemies = [];
const explosions = [];
const pickups = [];
const stars = createStars();

let animationFrame = 0;
let lastFrameTime = performance.now();
let audioContext = null;

window.addEventListener("resize", resizeCanvas);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseMissionForBackground();
  }
});
window.addEventListener("blur", pauseMissionForBackground);

window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
canvas.addEventListener("pointerdown", onCanvasPointerDown);
startButton.addEventListener("click", startMission);
overlayStartButton.addEventListener("click", startMission);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", restartMission);
overlayRestartButton.addEventListener("click", restartMission);
moveLeftButton.addEventListener("pointerdown", () => pressControl("left", true));
moveLeftButton.addEventListener("pointerup", () => pressControl("left", false));
moveLeftButton.addEventListener("pointerleave", () => pressControl("left", false));
moveLeftButton.addEventListener("pointercancel", () => pressControl("left", false));
moveRightButton.addEventListener("pointerdown", () => pressControl("right", true));
moveRightButton.addEventListener("pointerup", () => pressControl("right", false));
moveRightButton.addEventListener("pointerleave", () => pressControl("right", false));
moveRightButton.addEventListener("pointercancel", () => pressControl("right", false));
fireButton.addEventListener("pointerdown", () => pressControl("fire", true));
fireButton.addEventListener("pointerup", () => pressControl("fire", false));
fireButton.addEventListener("pointerleave", () => pressControl("fire", false));
fireButton.addEventListener("pointercancel", () => pressControl("fire", false));

resizeCanvas();
resetMission({ keepPhase: true });
renderHud();
renderOverlay();
requestAnimationFrame(loop);

function onCanvasPointerDown() {
  ensureAudioContext();
  if (state.phase === "title" || state.phase === "gameover") {
    startMission();
    return;
  }

  if (state.phase === "paused") {
    togglePause();
  }
}

function onKeyDown(event) {
  const key = event.key.toLowerCase();
  const controls = ["arrowleft", "arrowright", " ", "spacebar", "a", "d", "p", "r", "enter"];
  if (controls.includes(key) || key === " ") {
    event.preventDefault();
  }

  ensureAudioContext();

  if (key === "arrowleft" || key === "a") {
    state.leftHeld = true;
    return;
  }

  if (key === "arrowright" || key === "d") {
    state.rightHeld = true;
    return;
  }

  if (key === " " || key === "spacebar") {
    state.fireHeld = true;
    if (state.phase === "title" || state.phase === "gameover") {
      startMission();
    }
    return;
  }

  if (key === "p" || key === "escape") {
    togglePause();
    return;
  }

  if (key === "r") {
    restartMission();
    return;
  }

  if (key === "enter" && state.phase !== "playing") {
    startMission();
  }
}

function onKeyUp(event) {
  const key = event.key.toLowerCase();

  if (key === "arrowleft" || key === "a") {
    state.leftHeld = false;
  }

  if (key === "arrowright" || key === "d") {
    state.rightHeld = false;
  }

  if (key === " " || key === "spacebar") {
    state.fireHeld = false;
  }
}

function pressControl(action, pressed) {
  ensureAudioContext();

  if (action === "left") {
    state.leftHeld = pressed;
    if (pressed && state.phase !== "playing") {
      startMission();
    }
    return;
  }

  if (action === "right") {
    state.rightHeld = pressed;
    if (pressed && state.phase !== "playing") {
      startMission();
    }
    return;
  }

  if (action === "fire") {
    state.fireHeld = pressed;
    if (pressed && (state.phase === "title" || state.phase === "gameover")) {
      startMission();
    }
  }
}

function startMission() {
  ensureAudioContext();
  resetMission({ keepPhase: false });
  state.phase = "playing";
  state.message = `Wave ${state.wave}`;
  state.messageTimer = 1.2;
  setOverlay("Mission launched", "Star Defender", "Hold the line and clear the incoming wave.", false);
  renderHud();
  renderOverlay();
}

function restartMission() {
  ensureAudioContext();
  resetMission({ keepPhase: false });
  state.phase = "playing";
  state.message = `Wave ${state.wave}`;
  state.messageTimer = 1.2;
  setOverlay("Mission relaunched", "Star Defender", "Fresh run. Press P to pause at any time.", false);
  renderHud();
  renderOverlay();
}

function pauseMissionForBackground() {
  state.leftHeld = false;
  state.rightHeld = false;
  state.fireHeld = false;

  if (state.phase !== "playing") {
    return;
  }

  state.phase = "paused";
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
    state.message = `Wave ${state.wave}`;
    state.messageTimer = 0.8;
    setOverlay("", "", "", true);
  } else if (state.phase === "playing") {
    state.phase = "paused";
    setOverlay("Paused", "Paused", "Take a breath, then press P or Resume to get back in the fight.", false);
    overlayStartButton.textContent = "Resume";
  }

  renderHud();
  renderOverlay();
}

function resetMission({ keepPhase }) {
  state.score = 0;
  state.wave = 1;
  state.lives = 3;
  state.shields = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.message = "Awaiting launch";
  state.messageTimer = 0;
  state.pendingWaveDelay = 0.8;
  state.rapidUntil = 0;
  state.time = 0;
  state.leftHeld = false;
  state.rightHeld = false;
  state.fireHeld = false;
  state.moveCooldown = 0;
  state.shake = 0;
  state.shakeX = 0;
  state.shakeY = 0;
  bullets.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  explosions.length = 0;
  pickups.length = 0;
  state.phase = "title";
  player.lane = 3;
  player.targetLane = 3;
  player.x = laneCenter(3);
  player.y = PLAYER_Y;
  player.cooldown = 0;
  player.invuln = 0;
  player.thrust = 0;
  if (!keepPhase) {
    queueWave(1);
  }
  renderHud();
  setOverlay("Ready for launch", "Star Defender", "Press Start, Enter, or Space to begin.", false);
}

function queueWave(waveNumber) {
  state.wave = waveNumber;

  if (waveNumber % 5 === 0) {
    enqueueBossWave(waveNumber);
  } else {
    enqueueFormationWave(waveNumber);
  }

  state.pendingWaveDelay = 1.0;
  state.message = waveNumber % 5 === 0 ? "Carrier incoming" : `Wave ${waveNumber}`;
  state.messageTimer = 1.35;
  renderHud();
}

function enqueueFormationWave(waveNumber) {
  const rows = Math.min(4, 2 + Math.floor((waveNumber - 1) / 2));
  const patternSet = WAVE_PATTERNS[(waveNumber - 1) % WAVE_PATTERNS.length];
  const difficulty = 1 + waveNumber * 0.18;
  const queue = [];

  for (let row = 0; row < rows; row += 1) {
    const pattern = patternSet[(row + waveNumber) % patternSet.length];
    const stagger = 0.18 + row * 0.23;
    const laneShift = ((waveNumber + row) % 3) - 1;

    for (let lane = 0; lane < pattern.length; lane += 1) {
      if (pattern[lane] !== "1") {
        continue;
      }

      const shiftedLane = clamp(lane + laneShift, 0, LANES - 1);
      queue.push(createEnemySpawn({
        type: chooseEnemyType(waveNumber, row),
        lane: shiftedLane,
        row,
        delay: stagger + lane * 0.03 + Math.random() * 0.08,
        difficulty,
      }));
    }
  }

  queue.sort((a, b) => a.delay - b.delay);
  enemies.push(...queue.map((spec) => createQueuedEnemy(spec)));
}

function enqueueBossWave(waveNumber) {
  const difficulty = 1.25 + waveNumber * 0.16;
  const queue = [
    createEnemySpawn({
      type: "carrier",
      lane: 3,
      row: 0,
      delay: 0.55,
      difficulty,
    }),
    createEnemySpawn({
      type: "drone",
      lane: 1,
      row: 1,
      delay: 1.1,
      difficulty,
    }),
    createEnemySpawn({
      type: "drone",
      lane: 5,
      row: 1,
      delay: 1.25,
      difficulty,
    }),
  ];

  queue.sort((a, b) => a.delay - b.delay);
  enemies.push(...queue.map((spec) => createQueuedEnemy(spec)));
}

function createEnemySpawn({ type, lane, row, delay, difficulty }) {
  const spec = {
    type,
    lane,
    row,
    delay,
    difficulty,
  };

  if (type === "carrier") {
    return {
      ...spec,
      health: Math.round(14 + difficulty * 4),
      value: 750 + Math.round(difficulty * 80),
      width: 78,
      height: 32,
      entrySpeed: 90 + difficulty * 8,
      marchSpeed: 10 + difficulty * 1.5,
      drift: 46,
      driftSpeed: 1.2,
      fireRate: 0.82,
      bulletSpeed: 210,
      pattern: "boss",
    };
  }

  const isShielded = type === "shield";
  const isSweeper = type === "sweeper";

  return {
    ...spec,
    health: isShielded ? 2 : 1,
    value: isShielded ? 120 : isSweeper ? 160 : 85,
    width: isShielded ? 22 : 18,
    height: isShielded ? 18 : 16,
    entrySpeed: 120 + difficulty * 10,
    marchSpeed: (isSweeper ? 22 : 16) + difficulty * 3,
    drift: isSweeper ? 18 + difficulty * 1.8 : 8 + difficulty,
    driftSpeed: isSweeper ? 1.7 : 1.15,
    fireRate: isShielded ? 1.5 : isSweeper ? 1.1 : 1.85,
    bulletSpeed: isSweeper ? 230 : 190,
    pattern: type,
  };
}

function createQueuedEnemy(spec) {
  const baseX = laneCenter(spec.lane);
  return {
    ...spec,
    x: spec.type === "carrier" ? baseX : baseX,
    y: -60 - spec.row * 34,
    baseX,
    targetY: spec.type === "carrier" ? 92 : 82 + spec.row * 45,
    health: spec.health,
    maxHealth: spec.health,
    active: false,
    spawned: false,
    spawnDelay: spec.delay,
    fireCooldown: 0.8 + Math.random() * 0.9,
    phase: Math.random() * TAU,
    breach: false,
    flash: 0,
    bob: Math.random() * TAU,
  };
}

function chooseEnemyType(waveNumber, row) {
  const roll = Math.random();
  if (waveNumber >= 5 && roll > 0.74) {
    return "sweeper";
  }

  if (waveNumber >= 3 && roll > 0.55) {
    return row % 2 === 0 ? "shield" : "drone";
  }

  return roll > 0.72 ? "shield" : "drone";
}

function createStars() {
  const count = 96;
  return Array.from({ length: count }, () => ({
    x: Math.random() * LOGICAL_WIDTH,
    y: Math.random() * LOGICAL_HEIGHT,
    speed: 10 + Math.random() * 45,
    size: 0.6 + Math.random() * 1.8,
    twinkle: Math.random() * TAU,
    hue: Math.random() > 0.82 ? 185 + Math.random() * 40 : 210 + Math.random() * 20,
  }));
}

function loop(now) {
  const delta = Math.min((now - lastFrameTime) / 1000, 0.033);
  lastFrameTime = now;
  update(delta);
  render();
  animationFrame = requestAnimationFrame(loop);
}

function update(delta) {
  state.time += delta;
  state.shake = Math.max(state.shake - delta * 6, 0);
  state.shakeX = state.shake ? Math.sin(state.time * 42) * state.shake * 1.7 : 0;
  state.shakeY = state.shake ? Math.cos(state.time * 39) * state.shake * 1.2 : 0;
  state.moveCooldown = Math.max(state.moveCooldown - delta, 0);
  state.comboTimer = Math.max(state.comboTimer - delta, 0);
  state.messageTimer = Math.max(state.messageTimer - delta, 0);
  state.rapidUntil = Math.max(state.rapidUntil - delta, 0);

  if (player.cooldown > 0) {
    player.cooldown = Math.max(player.cooldown - delta, 0);
  }

  if (player.invuln > 0) {
    player.invuln = Math.max(player.invuln - delta, 0);
  }

  if (state.phase === "playing") {
    handleMovement(delta);
    handleFire();
    updateSpawnQueue(delta);
    updateEnemies(delta);
    updateBullets(delta);
    updateEnemyBullets(delta);
    updatePickups(delta);
    updateExplosions(delta);
    updateStarfield(delta);
    updateWaveProgress(delta);
    updateComboTimer();
    updatePlayerPosition(delta);
    updateHud();
    maybeAdvanceWave();
    maybeGameOver();
    renderOverlay();
  } else {
    updateStarfield(delta * 0.45);
    updateIdleEffects(delta);
  }
}

function handleMovement(delta) {
  if (state.leftHeld && !state.rightHeld && state.moveCooldown <= 0) {
    movePlayer(-1);
  } else if (state.rightHeld && !state.leftHeld && state.moveCooldown <= 0) {
    movePlayer(1);
  }
}

function movePlayer(direction) {
  player.targetLane = clamp(player.targetLane + direction, 0, LANES - 1);
  state.moveCooldown = 0.12;
  player.thrust = 0.14;
  if (state.phase !== "playing") {
    return;
  }
  playTone(direction < 0 ? 242 : 286, "triangle", 0.05, 0.03, direction < 0 ? 180 : 220);
}

function handleFire() {
  if (!state.fireHeld) {
    return;
  }

  if (player.cooldown > 0) {
    return;
  }

  shootPlayerBullet();
}

function shootPlayerBullet() {
  const rapid = state.rapidUntil > 0;
  const speed = rapid ? 520 : 430;
  const cooldown = rapid ? 0.11 : 0.22;

  bullets.push({
    x: player.x,
    y: player.y - 18,
    vy: -speed,
    radius: rapid ? 4 : 3,
    life: 1.7,
  });

  player.cooldown = cooldown;
  player.thrust = 0.24;
  playTone(rapid ? 986 : 860, "square", rapid ? 0.04 : 0.05, rapid ? 0.03 : 0.028, rapid ? 1380 : 1180);
}

function updateSpawnQueue(delta) {
  for (const enemy of enemies) {
    if (enemy.spawnDelay > 0) {
      enemy.spawnDelay = Math.max(enemy.spawnDelay - delta, 0);
      if (enemy.spawnDelay === 0) {
        enemy.spawned = true;
        enemy.active = true;
      }
    }
  }
}

function updateEnemies(delta) {
  for (const enemy of enemies) {
    if (enemy.spawnDelay > 0) {
      continue;
    }

    enemy.flash = Math.max(enemy.flash - delta * 3, 0);
    enemy.phase += delta;

    if (enemy.type === "carrier") {
      enemy.y = approach(enemy.y, enemy.targetY, delta * enemy.entrySpeed);
      if (enemy.y >= enemy.targetY - 0.5) {
        enemy.x = LOGICAL_WIDTH / 2 + Math.sin(state.time * 0.85 + enemy.phase) * enemy.drift;
      }
      enemy.fireCooldown -= delta;
      if (enemy.fireCooldown <= 0) {
        fireEnemyBurst(enemy, 3, 0.12, 28);
        enemy.fireCooldown = 0.68;
      }
    } else {
      if (enemy.y < enemy.targetY) {
        enemy.y = approach(enemy.y, enemy.targetY, delta * enemy.entrySpeed);
      } else {
        const sway = Math.sin(state.time * enemy.driftSpeed + enemy.phase) * enemy.drift;
        enemy.x = clamp(enemy.baseX + sway, LANE_MARGIN * 0.65, LOGICAL_WIDTH - LANE_MARGIN * 0.65);
        enemy.y += enemy.marchSpeed * delta;
        enemy.fireCooldown -= delta;
        if (enemy.fireCooldown <= 0) {
          if (Math.abs(enemy.x - player.x) < 54 || Math.random() > 0.54) {
            fireEnemyBolt(enemy);
          }
          enemy.fireCooldown = enemy.fireRate + Math.random() * 0.75;
        }
      }
    }

    if (enemy.y > LOGICAL_HEIGHT + 42 && !enemy.breach) {
      enemy.breach = true;
      hurtPlayer("An invader slipped through the defense line.");
      enemy.health = 0;
    }
  }

  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    if (enemy.health <= 0) {
      awardDefeat(enemy);
      enemies.splice(index, 1);
    }
  }
}

function updateBullets(delta) {
  for (let index = bullets.length - 1; index >= 0; index -= 1) {
    const bullet = bullets[index];
    bullet.y += bullet.vy * delta;
    bullet.life -= delta;

    let hitEnemy = null;
    for (const enemy of enemies) {
      if (enemy.spawnDelay > 0 || enemy.health <= 0) {
        continue;
      }

      if (rectsOverlap(
        { x: bullet.x - bullet.radius, y: bullet.y - bullet.radius, width: bullet.radius * 2, height: bullet.radius * 2 },
        enemyHitbox(enemy),
      )) {
        hitEnemy = enemy;
        break;
      }
    }

    if (bullet.y < -20 || bullet.life <= 0 || hitEnemy) {
      bullets.splice(index, 1);
    }

    if (hitEnemy) {
      hitEnemy.health -= 1;
      hitEnemy.flash = 0.2;
      state.shake = Math.min(0.35, state.shake + 0.06);
      spawnExplosion(bullet.x, bullet.y, hitEnemy.type === "carrier" ? "#8fe8ff" : "#7af7c1", 1);
      playTone(196, "triangle", 0.08, 0.07, 88);
    }
  }
}

function updateEnemyBullets(delta) {
  for (let index = enemyBullets.length - 1; index >= 0; index -= 1) {
    const bullet = enemyBullets[index];
    bullet.x += bullet.vx * delta;
    bullet.y += bullet.vy * delta;
    bullet.life -= delta;

    if (rectsOverlap(
      { x: bullet.x - bullet.radius, y: bullet.y - bullet.radius, width: bullet.radius * 2, height: bullet.radius * 2 },
      playerHitbox(),
    )) {
      enemyBullets.splice(index, 1);
      hurtPlayer("Incoming fire breached the hull.");
      continue;
    }

    if (bullet.y > LOGICAL_HEIGHT + 24 || bullet.life <= 0) {
      enemyBullets.splice(index, 1);
    }
  }
}

function updatePickups(delta) {
  for (let index = pickups.length - 1; index >= 0; index -= 1) {
    const pickup = pickups[index];
    pickup.y += pickup.vy * delta;
    pickup.phase += delta;
    pickup.x += Math.sin(pickup.phase * 3) * 10 * delta;

    if (rectsOverlap(
      { x: pickup.x - pickup.radius, y: pickup.y - pickup.radius, width: pickup.radius * 2, height: pickup.radius * 2 },
      playerHitbox(),
    )) {
      if (pickup.type === "shield") {
        state.shields = Math.min(state.shields + 1, 3);
        state.message = "Shield collected";
        state.messageTimer = 1.1;
        playTone(520, "sine", 0.08, 0.04, 840);
      } else {
        state.rapidUntil = Math.min(state.rapidUntil + 8.5, 12);
        state.message = "Overdrive engaged";
        state.messageTimer = 1.1;
        playTone(692, "square", 0.07, 0.04, 1320);
      }

      pickups.splice(index, 1);
      renderHud();
      continue;
    }

    if (pickup.y > LOGICAL_HEIGHT + 30) {
      pickups.splice(index, 1);
    }
  }
}

function updateExplosions(delta) {
  for (let index = explosions.length - 1; index >= 0; index -= 1) {
    const explosion = explosions[index];
    explosion.life -= delta;
    explosion.radius += explosion.growth * delta;
    explosion.alpha = Math.max(explosion.life / explosion.maxLife, 0);
    explosion.particles.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vy += particle.gravity * delta;
      particle.life -= delta;
    });
    explosion.particles = explosion.particles.filter((particle) => particle.life > 0);

    if (explosion.life <= 0 && explosion.particles.length === 0) {
      explosions.splice(index, 1);
    }
  }
}

function updateStarfield(delta) {
  for (const star of stars) {
    star.y += star.speed * delta;
    star.twinkle += delta * (1.2 + star.speed / 60);
    if (star.y > LOGICAL_HEIGHT + 4) {
      star.y = -4;
      star.x = Math.random() * LOGICAL_WIDTH;
    }
  }
}

function updateWaveProgress(delta) {
  if (state.messageTimer <= 0 && state.phase === "playing" && state.score === 0 && state.wave === 1 && enemies.length) {
    state.message = "Hold the line";
    state.messageTimer = 0.8;
  }

  if (state.phase !== "playing") {
    return;
  }

  if (!enemies.length && pickups.length === 0 && bullets.length >= 0 && enemyBullets.length >= 0) {
    state.pendingWaveDelay -= delta;
    if (state.pendingWaveDelay <= 0) {
      const nextWave = state.wave + 1;
      queueWave(nextWave);
    }
  } else {
    state.pendingWaveDelay = 1.0;
  }
}

function updateComboTimer() {
  if (state.comboTimer <= 0 && state.combo > 0) {
    state.combo = 0;
    renderHud();
  }
}

function updatePlayerPosition(delta) {
  const desiredX = laneCenter(player.targetLane);
  player.x = approach(player.x, desiredX, delta * 16);
  player.thrust = Math.max(player.thrust - delta * 2.2, 0);
}

function updateIdleEffects(delta) {
  updatePlayerPosition(delta);
  if (state.messageTimer <= 0 && state.phase === "title") {
    state.message = "Press Start to launch";
  }
  renderHud();
}

function maybeAdvanceWave() {
  if (state.phase !== "playing") {
    return;
  }

  if (state.score > state.highScore) {
    state.highScore = state.score;
    saveHighScore(state.highScore);
  }
}

function maybeGameOver() {
  if (state.lives > 0) {
    return;
  }

  state.phase = "gameover";
  state.message = "Mission failed";
  state.messageTimer = 0;
  setOverlay("Mission failed", "Game over", "Press Restart or hit R to jump back into the fight.", false);
  playTone(120, "sawtooth", 0.35, 0.045, 50);
  renderOverlay();
  renderHud();
}

function render() {
  const scaleX = canvas.width / LOGICAL_WIDTH;
  const scaleY = canvas.height / LOGICAL_HEIGHT;
  context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  context.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  context.save();
  context.translate(state.shakeX, state.shakeY);
  drawBackground();
  drawLaneGuides();
  drawPickups();
  drawEnemyBullets();
  drawBullets();
  drawEnemies();
  drawExplosions();
  drawPlayer();
  drawBanner();
  context.restore();
}

function drawBackground() {
  const background = context.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  background.addColorStop(0, "#091120");
  background.addColorStop(0.5, "#050b16");
  background.addColorStop(1, "#02050b");
  context.fillStyle = background;
  context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  const nebula = context.createRadialGradient(80, 90, 5, 80, 90, 160);
  nebula.addColorStop(0, "rgba(90, 206, 255, 0.18)");
  nebula.addColorStop(1, "rgba(90, 206, 255, 0)");
  context.fillStyle = nebula;
  context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  const nebula2 = context.createRadialGradient(280, 160, 5, 280, 160, 180);
  nebula2.addColorStop(0, "rgba(255, 110, 196, 0.14)");
  nebula2.addColorStop(1, "rgba(255, 110, 196, 0)");
  context.fillStyle = nebula2;
  context.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  context.save();
  context.globalAlpha = 0.9;
  for (const star of stars) {
    const twinkle = 0.65 + Math.sin(star.twinkle) * 0.35;
    context.fillStyle = `hsla(${star.hue}, 100%, ${75 + twinkle * 10}%, ${0.4 + twinkle * 0.4})`;
    context.fillRect(star.x, star.y, star.size, star.size);
    if (star.size > 1.5) {
      context.fillRect(star.x - 0.9, star.y + 0.45, star.size + 1.2, 0.55);
    }
  }
  context.restore();

  context.save();
  context.globalAlpha = 0.15;
  context.strokeStyle = "#88dfff";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, 455);
  context.lineTo(LOGICAL_WIDTH, 455);
  context.stroke();
  context.restore();
}

function drawLaneGuides() {
  context.save();
  context.globalAlpha = 0.35;
  for (let lane = 0; lane < LANES; lane += 1) {
    const x = laneCenter(lane);
    context.strokeStyle = lane === player.targetLane ? "rgba(118, 241, 195, 0.35)" : "rgba(117, 197, 255, 0.12)";
    context.lineWidth = lane === player.targetLane ? 1.8 : 1;
    context.beginPath();
    context.moveTo(x, 20);
    context.lineTo(x, LOGICAL_HEIGHT - 92);
    context.stroke();
  }
  context.restore();
}

function drawPlayer() {
  const pulse = 0.55 + Math.sin(state.time * 8) * 0.12 + player.thrust;
  const blink = player.invuln > 0 ? Math.sin(state.time * 22) > 0 : true;
  if (!blink) {
    return;
  }

  context.save();
  context.translate(player.x, player.y);
  context.scale(1, 1);

  const bodyGlow = context.createRadialGradient(0, 0, 1, 0, 0, 24);
  bodyGlow.addColorStop(0, `rgba(119, 247, 202, ${0.45 + pulse * 0.2})`);
  bodyGlow.addColorStop(1, "rgba(119, 247, 202, 0)");
  context.fillStyle = bodyGlow;
  context.beginPath();
  context.arc(0, 0, 22, 0, TAU);
  context.fill();

  context.fillStyle = "#d8f8ff";
  context.strokeStyle = "#78f0ff";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, -18);
  context.lineTo(14, 9);
  context.lineTo(0, 4);
  context.lineTo(-14, 9);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#63d2ff";
  context.beginPath();
  context.moveTo(0, -8);
  context.lineTo(6, 5);
  context.lineTo(0, 8);
  context.lineTo(-6, 5);
  context.closePath();
  context.fill();

  context.save();
  context.globalAlpha = 0.8;
  context.fillStyle = "#ffef9c";
  context.beginPath();
  context.moveTo(-4, 13);
  context.lineTo(0, 22 + pulse * 5);
  context.lineTo(4, 13);
  context.closePath();
  context.fill();
  context.restore();

  if (state.shields > 0) {
    context.save();
    context.strokeStyle = "rgba(136, 255, 232, 0.55)";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, 28 + Math.sin(state.time * 4) * 1.5, 0, TAU);
    context.stroke();
    context.restore();
  }

  context.restore();
}

function drawEnemies() {
  for (const enemy of enemies) {
    if (enemy.spawnDelay > 0) {
      continue;
    }

    context.save();
    context.translate(enemy.x, enemy.y);

    if (enemy.type === "carrier") {
      drawCarrier(enemy);
    } else if (enemy.type === "sweeper") {
      drawSweeper(enemy);
    } else if (enemy.type === "shield") {
      drawShieldEnemy(enemy);
    } else {
      drawDrone(enemy);
    }

    if (enemy.flash > 0) {
      context.globalCompositeOperation = "lighter";
      context.globalAlpha = enemy.flash;
      context.fillStyle = "#ffffff";
      context.fillRect(-enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height);
    }

    if (enemy.maxHealth > 1) {
      drawHealthBar(enemy);
    }

    context.restore();
  }
}

function drawDrone(enemy) {
  context.fillStyle = "#2ae7c8";
  context.strokeStyle = "#d9ffff";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(0, -8);
  context.lineTo(11, 0);
  context.lineTo(6, 9);
  context.lineTo(-6, 9);
  context.lineTo(-11, 0);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#0a1320";
  context.beginPath();
  context.arc(0, 2, 3.2, 0, TAU);
  context.fill();

  context.fillStyle = "rgba(108, 242, 255, 0.9)";
  context.fillRect(-13, -1, 26, 2);
}

function drawShieldEnemy(enemy) {
  context.fillStyle = "#8d7cff";
  context.strokeStyle = "#f5f0ff";
  context.lineWidth = 1.5;
  roundedRectPath(-11, -9, 22, 18, 7);
  context.fill();
  context.stroke();
  context.fillStyle = "#110c22";
  context.beginPath();
  context.arc(0, 1, 4.2, 0, TAU);
  context.fill();
}

function drawSweeper(enemy) {
  context.fillStyle = "#ffb24a";
  context.strokeStyle = "#fff0c8";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(-9, -6);
  context.lineTo(9, -2);
  context.lineTo(4, 7);
  context.lineTo(-4, 7);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "#241300";
  context.beginPath();
  context.arc(0, 0, 3, 0, TAU);
  context.fill();

  context.save();
  context.globalAlpha = 0.7;
  context.fillStyle = "#ffe18a";
  context.fillRect(-2, 8, 4, 7);
  context.restore();
}

function drawCarrier(enemy) {
  context.save();
  const glow = context.createRadialGradient(0, 0, 4, 0, 0, 46);
  glow.addColorStop(0, "rgba(116, 230, 255, 0.3)");
  glow.addColorStop(1, "rgba(116, 230, 255, 0)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(0, 0, 34, 0, TAU);
  context.fill();

  context.fillStyle = "#10314e";
  context.strokeStyle = "#9ff3ff";
  context.lineWidth = 2;
  roundedRectPath(-38, -14, 76, 28, 12);
  context.fill();
  context.stroke();

  context.fillStyle = "#1b4f76";
  context.fillRect(-30, -6, 60, 12);
  context.fillStyle = "#f5fdff";
  context.fillRect(-18, -9, 36, 4);

  context.fillStyle = "#8ff3de";
  context.fillRect(-28, -18, 10, 8);
  context.fillRect(18, -18, 10, 8);

  context.fillStyle = "#1a2231";
  context.beginPath();
  context.arc(0, 0, 7, 0, TAU);
  context.fill();

  context.fillStyle = "rgba(255, 255, 255, 0.55)";
  context.beginPath();
  context.arc(-16, 2, 1.8, 0, TAU);
  context.arc(16, 2, 1.8, 0, TAU);
  context.fill();
  context.restore();
}

function drawHealthBar(enemy) {
  const width = enemy.maxHealth > 8 ? 54 : 26;
  const barY = -(enemy.height / 2) - 10;
  const ratio = Math.max(enemy.health / enemy.maxHealth, 0);
  context.save();
  context.fillStyle = "rgba(7, 13, 24, 0.92)";
  context.fillRect(-width / 2, barY, width, 4);
  context.fillStyle = ratio > 0.5 ? "#73f8c8" : ratio > 0.25 ? "#ffcb6b" : "#ff758f";
  context.fillRect(-width / 2, barY, width * ratio, 4);
  context.restore();
}

function drawBullets() {
  for (const bullet of bullets) {
    context.save();
    context.translate(bullet.x, bullet.y);
    context.globalCompositeOperation = "lighter";
    context.fillStyle = "#bafcff";
    context.shadowColor = "#7ef6ff";
    context.shadowBlur = 16;
    context.fillRect(-1.4, -11, 2.8, 22);
    context.fillStyle = "rgba(255, 255, 255, 0.8)";
    context.fillRect(-0.7, -7, 1.4, 14);
    context.restore();
  }
}

function drawEnemyBullets() {
  for (const bullet of enemyBullets) {
    context.save();
    context.translate(bullet.x, bullet.y);
    context.globalCompositeOperation = "lighter";
    context.fillStyle = bullet.type === "boss" ? "#ff86c8" : "#ffb066";
    context.shadowColor = bullet.type === "boss" ? "#ff73d4" : "#ffb066";
    context.shadowBlur = 14;
    context.beginPath();
    context.arc(0, 0, bullet.radius, 0, TAU);
    context.fill();
    context.restore();
  }
}

function drawPickups() {
  for (const pickup of pickups) {
    context.save();
    context.translate(pickup.x, pickup.y);
    context.globalCompositeOperation = "lighter";
    context.shadowBlur = 18;
    context.shadowColor = pickup.type === "shield" ? "#7af9d0" : "#ff76d2";
    context.fillStyle = pickup.type === "shield" ? "#7af9d0" : "#ff76d2";
    context.beginPath();
    context.arc(0, 0, pickup.radius, 0, TAU);
    context.fill();
    context.fillStyle = "#09101f";
    context.beginPath();
    context.arc(0, 0, pickup.radius * 0.35, 0, TAU);
    context.fill();
    context.restore();
  }
}

function drawExplosions() {
  for (const explosion of explosions) {
    context.save();
    context.globalAlpha = explosion.alpha;
    context.globalCompositeOperation = "lighter";
    context.translate(explosion.x, explosion.y);
    context.strokeStyle = explosion.color;
    context.fillStyle = explosion.color;
    context.shadowColor = explosion.color;
    context.shadowBlur = 18;
    context.beginPath();
    context.arc(0, 0, explosion.radius, 0, TAU);
    context.stroke();

    for (const particle of explosion.particles) {
      context.globalAlpha = Math.max(particle.life / particle.maxLife, 0);
      context.fillRect(particle.x, particle.y, particle.size, particle.size);
    }

    context.restore();
  }
}

function drawBanner() {
  if (state.messageTimer <= 0 && state.phase === "playing") {
    return;
  }

  const copy = state.phase === "paused"
    ? "Paused"
    : state.phase === "gameover"
      ? "Mission failed"
      : state.message;

  const alpha = state.phase === "paused" || state.phase === "gameover" ? 1 : Math.min(state.messageTimer / 1.2, 1);
  context.save();
  context.globalAlpha = alpha * 0.92;
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillStyle = "rgba(4, 7, 15, 0.58)";
  context.fillRect(54, 214, LOGICAL_WIDTH - 108, 70);
  context.strokeStyle = "rgba(135, 229, 255, 0.34)";
  context.lineWidth = 1;
  context.strokeRect(54, 214, LOGICAL_WIDTH - 108, 70);

  context.fillStyle = "#effaff";
  context.shadowColor = "rgba(120, 239, 255, 0.45)";
  context.shadowBlur = 12;
  context.font = "700 22px DM Sans, sans-serif";
  context.fillText(copy, LOGICAL_WIDTH / 2, 241);

  context.fillStyle = "#8bf4d1";
  context.shadowBlur = 0;
  context.font = "600 11px DM Sans, sans-serif";
  context.fillText(state.phase === "paused" ? "Press P to resume" : state.phase === "gameover" ? "Press Restart to relaunch" : "Clear the formation", LOGICAL_WIDTH / 2, 263);
  context.restore();
}

function spawnEnemyBullet(enemy, offsetX = 0, offsetY = 0, type = enemy.type === "carrier" ? "boss" : "drone") {
  enemyBullets.push({
    x: enemy.x + offsetX,
    y: enemy.y + offsetY,
    vx: offsetX * 0.15,
    vy: enemy.bulletSpeed,
    radius: type === "boss" ? 4.2 : 3.1,
    type,
    life: 3,
  });
}

function fireEnemyBolt(enemy) {
  spawnEnemyBullet(enemy, 0, enemy.height / 2 + 2, enemy.type === "carrier" ? "boss" : "drone");
  playTone(168, "sine", 0.05, 0.03, 82);
}

function fireEnemyBurst(enemy, count, spacing, spread) {
  for (let index = 0; index < count; index += 1) {
    const step = index - (count - 1) / 2;
    spawnEnemyBullet(enemy, step * spread, enemy.height / 2 + 2, "boss");
    if (index === 1) {
      playTone(142, "square", 0.08, 0.04, 72);
    }
  }
}

function hurtPlayer(reason) {
  if (player.invuln > 0 || state.phase !== "playing") {
    return;
  }

  if (state.shields > 0) {
    state.shields -= 1;
    player.invuln = 1.1;
    state.shake = Math.min(0.35, state.shake + 0.08);
    state.message = "Shield absorbed the hit";
    state.messageTimer = 1.2;
    spawnExplosion(player.x, player.y, "#7af8d1", 0.75);
    playTone(312, "triangle", 0.08, 0.045, 180);
    renderHud();
    return;
  }

  state.lives -= 1;
  player.invuln = 1.3;
  state.shake = Math.min(0.35, state.shake + 0.16);
  state.message = reason;
  state.messageTimer = 1.2;
  spawnExplosion(player.x, player.y, "#ff7e9a", 1.2);
  playTone(220, "sawtooth", 0.1, 0.05, 94);
  renderHud();
}

function awardDefeat(enemy) {
  const baseScore = Math.round(enemy.value);
  const bonus = state.combo > 0 ? state.combo * 6 : 0;
  state.score += baseScore + bonus;
  state.highScore = Math.max(state.highScore, state.score);
  saveHighScore(state.highScore);
  state.combo += 1;
  state.comboTimer = 1.6;
  state.message = enemy.type === "carrier" ? "Carrier destroyed" : "Target neutralized";
  state.messageTimer = 0.9;

  spawnExplosion(enemy.x, enemy.y, enemy.type === "carrier" ? "#88eaff" : enemy.type === "sweeper" ? "#ffd56d" : "#7af8d1", enemy.type === "carrier" ? 1.8 : 1);
  maybeDropPickup(enemy);
  playTone(enemy.type === "carrier" ? 136 : 252, "triangle", enemy.type === "carrier" ? 0.16 : 0.08, 0.06, enemy.type === "carrier" ? 56 : 110);
  renderHud();
}

function maybeDropPickup(enemy) {
  const chance = Math.random();
  if (chance > 0.22) {
    return;
  }

  pickups.push({
    type: chance > 0.15 ? "rapid" : "shield",
    x: enemy.x,
    y: enemy.y,
    vy: 54 + Math.random() * 12,
    radius: 7,
    phase: Math.random() * TAU,
  });
}

function spawnExplosion(x, y, color, scale) {
  const particleCount = Math.min(18 + Math.round(scale * 12), 36);
  const particles = [];

  for (let index = 0; index < particleCount; index += 1) {
    const angle = Math.random() * TAU;
    const speed = (50 + Math.random() * 150) * scale;
    particles.push({
      x: 0,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: 42 + Math.random() * 45,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.4 + Math.random() * 0.4,
      size: 1 + Math.random() * (scale * 2.2),
    });
  }

  explosions.push({
    x,
    y,
    color,
    radius: 4 * scale,
    growth: 92 * scale,
    life: 0.42 + scale * 0.2,
    maxLife: 0.42 + scale * 0.2,
    alpha: 1,
    particles,
  });
}

function updateHud() {
  scoreDisplay.textContent = formatScore(state.score);
  livesDisplay.textContent = String(state.lives);
  waveDisplay.textContent = String(state.wave);
  highScoreDisplay.textContent = formatScore(state.highScore);
  comboDisplay.textContent = `x${Math.max(1, state.combo + 1)}`;
  shieldDisplay.textContent = String(state.shields);
  weaponDisplay.innerHTML = state.rapidUntil > 0
    ? '<span class="status-dot"></span><span>Overdrive pulse</span>'
    : '<span class="status-dot"></span><span>Standard pulse</span>';

  if (state.shields > 0) {
    weaponDisplay.className = "status-pill";
    weaponDisplay.firstElementChild.className = "status-dot";
  }

  const statusText = state.phase === "title"
    ? "Awaiting launch"
    : state.phase === "paused"
      ? "Paused"
      : state.phase === "gameover"
        ? "Game over"
        : state.messageTimer > 0
          ? state.message
          : `Wave ${state.wave}`;

  statusDisplay.textContent = statusText;
}

function renderHud() {
  updateHud();
}

function renderOverlay() {
  if (state.phase === "playing") {
    overlay.classList.add("is-hidden");
    overlayStartButton.textContent = "Resume";
    overlayRestartButton.textContent = "Restart";
    return;
  }

  overlay.classList.remove("is-hidden");

  if (state.phase === "paused") {
    setOverlay("Paused", "Paused", "Press Resume, P, or Space to get back in the fight.", false);
    overlayStartButton.textContent = "Resume";
  } else if (state.phase === "gameover") {
    setOverlay("Mission failed", "Game over", "Press Restart or R to relaunch the mission.", false);
  } else {
    setOverlay("Ready for launch", "Star Defender", "Press Start, Enter, or Space to begin.", false);
  }
}

function setOverlay(eyebrow, title, copy, hidden) {
  overlayEyebrow.textContent = eyebrow;
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  overlay.classList.toggle("is-hidden", hidden);
  overlayStartButton.textContent = state.phase === "playing" ? "Resume" : "Start mission";
  overlayRestartButton.textContent = "Restart";
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = Math.max(1, Math.round(bounds.width * dpr));
  canvas.height = Math.max(1, Math.round(bounds.height * dpr));
}

function maybeApplyShake() {
  if (state.shake <= 0) {
    return;
  }
  state.shakeX = (Math.random() - 0.5) * state.shake * 2.2;
  state.shakeY = (Math.random() - 0.5) * state.shake * 1.8;
}

function updateEnemySpawnPosition(enemy, delta) {
  if (enemy.spawnDelay > 0) {
    return;
  }

  if (enemy.type === "carrier") {
    enemy.y = approach(enemy.y, enemy.targetY, delta * enemy.entrySpeed);
    if (enemy.y >= enemy.targetY - 0.4) {
      enemy.x = LOGICAL_WIDTH / 2 + Math.sin(state.time * 0.9 + enemy.phase) * enemy.drift;
    }
  }
}

function enemyHitbox(enemy) {
  return {
    x: enemy.x - enemy.width / 2,
    y: enemy.y - enemy.height / 2,
    width: enemy.width,
    height: enemy.height,
  };
}

function playerHitbox() {
  return {
    x: player.x - 13,
    y: player.y - 16,
    width: 26,
    height: 28,
  };
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function roundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function laneCenter(lane) {
  return LANE_MARGIN + lane * LANE_SPACING;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function approach(value, target, amount) {
  if (value < target) {
    return Math.min(value + amount, target);
  }

  if (value > target) {
    return Math.max(value - amount, target);
  }

  return target;
}

function formatScore(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function loadHighScore() {
  try {
    const score = Number(window.localStorage.getItem(STORAGE_KEY) || 0);
    return Number.isFinite(score) && score >= 0 ? score : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Ignore storage failures in private mode or locked-down browsers.
  }
}

function ensureAudioContext() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return;
  }

  if (!audioContext) {
    audioContext = new AudioCtor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  state.audioArmed = true;
}

function playTone(startFrequency, type, duration, gain, endFrequency = null) {
  if (!audioContext || !state.audioArmed) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, audioContext.currentTime);

  if (endFrequency !== null) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(endFrequency, 1), audioContext.currentTime + duration);
  }

  envelope.gain.setValueAtTime(0.0001, audioContext.currentTime);
  envelope.gain.exponentialRampToValueAtTime(gain, audioContext.currentTime + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.connect(envelope);
  envelope.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration + 0.03);
}
