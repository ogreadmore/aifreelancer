import { initCommon } from "../common.js";

initCommon("paddle-duel");

const canvas = document.querySelector("#paddle-court");
const context = canvas.getContext("2d");
const statusNode = document.querySelector("#game-status");
const messageNode = document.querySelector("#game-message");
const primaryButton = document.querySelector("#game-primary");
const restartButton = document.querySelector("#game-restart");
const playerScoreNode = document.querySelector("#player-score");
const cpuScoreNode = document.querySelector("#cpu-score");
const rallyNode = document.querySelector("#rally-count");
const bestStreakNode = document.querySelector("#best-streak");
const difficultySelect = document.querySelector("#difficulty");
const targetScoreSelect = document.querySelector("#target-score");
const courtSpeedInput = document.querySelector("#court-speed");
const courtSpeedValue = document.querySelector("#court-speed-value");
const mobileUpButton = document.querySelector("#mobile-up");
const mobileDownButton = document.querySelector("#mobile-down");
const mobilePauseButton = document.querySelector("#mobile-pause");
const mobileRestartButton = document.querySelector("#mobile-restart");

const STORAGE_KEY = "aifreelancer-paddle-duel-settings-v1";
const BEST_STREAK_KEY = "aifreelancer-paddle-duel-best-streak-v1";
const supportedTargetScores = new Set([5, 7, 11, 15]);

const difficultyProfiles = {
  chill: {
    label: "Chill",
    aiSpeed: 360,
    reactionTime: 0.18,
    jitter: 58,
    ballBoost: 0.98,
  },
  classic: {
    label: "Classic",
    aiSpeed: 460,
    reactionTime: 0.11,
    jitter: 34,
    ballBoost: 1.05,
  },
  arcade: {
    label: "Arcade",
    aiSpeed: 555,
    reactionTime: 0.07,
    jitter: 18,
    ballBoost: 1.12,
  },
  overdrive: {
    label: "Overdrive",
    aiSpeed: 650,
    reactionTime: 0.04,
    jitter: 8,
    ballBoost: 1.2,
  },
};

const settings = loadSettings();

const game = {
  mode: "ready",
  paused: false,
  lastTime: 0,
  width: 0,
  height: 0,
  court: {
    marginX: 28,
    marginY: 32,
    netGap: 20,
    paddleWidth: 14,
    paddleHeight: 108,
    ballRadius: 8,
  },
  player: {
    x: 28,
    y: 0,
    width: 14,
    height: 108,
    velocityY: 0,
  },
  cpu: {
    x: 0,
    y: 0,
    width: 14,
    height: 108,
    velocityY: 0,
    targetCenterY: 0,
    reactionClock: 0,
  },
  ball: {
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    speed: 0,
    radius: 8,
    direction: 1,
  },
  score: {
    player: 0,
    cpu: 0,
  },
  rally: 0,
  bestStreak: readBestStreak(),
  currentStreak: 0,
  serveTimer: 0,
  serveDirection: 1,
  flash: 0,
  flashColor: "11, 132, 255",
  shake: 0,
  particles: [],
  trail: [],
  input: {
    up: false,
    down: false,
  },
};

let animationFrame = 0;
let resizeObserver = null;

syncSettingsUI();
applySettings(true);
resizeCanvas();
restartMatch();
updateHud("Ready", "Press Start or Space to launch the first serve.");
updatePrimaryLabel();
drawFrame(0);
animationFrame = requestAnimationFrame(tick);

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", () => {
  if (game.mode === "play" && !game.paused) {
    setPaused(true, "Paused while the tab lost focus.");
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.mode === "play" && !game.paused) {
    setPaused(true, "Paused while the tab is hidden.");
  }
});

if ("ResizeObserver" in window) {
  resizeObserver = new ResizeObserver(() => resizeCanvas());
  resizeObserver.observe(canvas);
}

primaryButton.addEventListener("click", handlePrimaryAction);
restartButton.addEventListener("click", restartMatch);
mobilePauseButton.addEventListener("click", handlePrimaryAction);
mobileRestartButton.addEventListener("click", restartMatch);

bindHoldButton(mobileUpButton, () => {
  game.input.up = true;
}, () => {
  game.input.up = false;
});

bindHoldButton(mobileDownButton, () => {
  game.input.down = true;
}, () => {
  game.input.down = false;
});

difficultySelect.addEventListener("change", () => {
  settings.difficulty = difficultySelect.value;
  persistSettings();
  applySettings();
  if (game.mode === "ready") {
    updateHud("Ready", `Difficulty set to ${difficultyProfiles[settings.difficulty].label}.`);
  } else {
    updateHud(statusLabel(), `Difficulty set to ${difficultyProfiles[settings.difficulty].label}.`);
  }
});

targetScoreSelect.addEventListener("change", () => {
  settings.targetScore = clamp(Number(targetScoreSelect.value) || 7, 3, 21);
  persistSettings();
  updateHud(statusLabel(), `First to ${settings.targetScore} points.`);
});

courtSpeedInput.addEventListener("input", () => {
  settings.courtSpeed = clamp(Number(courtSpeedInput.value) || 105, 80, 160);
  persistSettings();
  applySettings();
  courtSpeedValue.textContent = `${settings.courtSpeed}% pace`;
  if (game.mode === "ready") {
    updateHud("Ready", `Court speed set to ${settings.courtSpeed}% pace.`);
  }
});

function loadSettings() {
  const fallback = {
    difficulty: "classic",
    targetScore: 7,
    courtSpeed: 105,
  };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    const parsedTargetScore = Number(parsed.targetScore);
    return {
      difficulty: difficultyProfiles[parsed.difficulty] ? parsed.difficulty : fallback.difficulty,
      targetScore: supportedTargetScores.has(parsedTargetScore) ? parsedTargetScore : fallback.targetScore,
      courtSpeed: clamp(Number(parsed.courtSpeed) || fallback.courtSpeed, 80, 160),
    };
  } catch {
    return fallback;
  }
}

function persistSettings() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private contexts; the game still works.
  }
}

function readBestStreak() {
  try {
    return clamp(Number(window.localStorage.getItem(BEST_STREAK_KEY)) || 0, 0, 999);
  } catch {
    return 0;
  }
}

function writeBestStreak(value) {
  try {
    window.localStorage.setItem(BEST_STREAK_KEY, String(value));
  } catch {
    // Ignore storage errors silently.
  }
}

function syncSettingsUI() {
  difficultySelect.value = settings.difficulty;
  targetScoreSelect.value = String(settings.targetScore);
  courtSpeedInput.value = String(settings.courtSpeed);
  courtSpeedValue.textContent = `${settings.courtSpeed}% pace`;
  bestStreakNode.textContent = String(game.bestStreak);
}

function applySettings(skipMessage = false) {
  const profile = difficultyProfiles[settings.difficulty] ?? difficultyProfiles.classic;
  const pace = settings.courtSpeed / 100;

  game.court.marginX = 28;
  game.court.marginY = 30;
  game.court.netGap = 20;

  game.court.paddleHeight = 84;
  game.court.paddleWidth = 14;
  game.court.ballRadius = 8;

  game.player.width = game.court.paddleWidth;
  game.player.height = game.court.paddleHeight;
  game.cpu.width = game.court.paddleWidth;
  game.cpu.height = game.court.paddleHeight;
  game.ball.radius = game.court.ballRadius;

  game.player.speed = 620 * pace;
  game.cpu.speed = profile.aiSpeed * pace;
  game.ball.baseSpeed = 430 * profile.ballBoost * pace;
  game.ball.maxSpeed = 920 * pace;
  game.cpu.reactionClock = 0;

  if (!skipMessage && game.mode === "ready") {
    updateHud("Ready", `Pace set to ${settings.courtSpeed}% with ${profile.label} AI.`);
  }
}

function resizeCanvas() {
  const previousWidth = game.width || 960;
  const previousHeight = game.height || 600;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  const nextWidth = Math.max(320, Math.round(rect.width * dpr));
  const nextHeight = Math.max(220, Math.round(rect.height * dpr));

  if (!nextWidth || !nextHeight) {
    return;
  }

  canvas.width = nextWidth;
  canvas.height = nextHeight;
  game.width = nextWidth;
  game.height = nextHeight;

  const scaleX = previousWidth ? nextWidth / previousWidth : 1;
  const scaleY = previousHeight ? nextHeight / previousHeight : 1;

  game.court.marginX = clamp(Math.round(nextWidth * 0.045), 22, 40);
  game.court.marginY = clamp(Math.round(nextHeight * 0.07), 24, 52);
  game.court.netGap = clamp(Math.round(nextHeight * 0.03), 16, 30);
  game.court.paddleHeight = clamp(Math.round(nextHeight * 0.19), 82, 132);
  game.court.paddleWidth = clamp(Math.round(nextWidth * 0.015), 10, 16);
  game.court.ballRadius = clamp(Math.round(Math.min(nextWidth, nextHeight) * 0.013), 6, 10);

  game.player.width = game.court.paddleWidth;
  game.player.height = game.court.paddleHeight;
  game.cpu.width = game.court.paddleWidth;
  game.cpu.height = game.court.paddleHeight;
  game.ball.radius = game.court.ballRadius;

  game.player.x = game.court.marginX;
  game.cpu.x = nextWidth - game.court.marginX - game.cpu.width;

  if (game.player.y) {
    game.player.y = clamp(game.player.y * scaleY, game.court.marginY, nextHeight - game.court.marginY - game.player.height);
  } else {
    game.player.y = centerY(game.height, game.player.height);
  }

  if (game.cpu.y) {
    game.cpu.y = clamp(game.cpu.y * scaleY, game.court.marginY, nextHeight - game.court.marginY - game.cpu.height);
  } else {
    game.cpu.y = centerY(game.height, game.cpu.height);
  }

  if (game.ball.x || game.ball.y) {
    game.ball.x = clamp(game.ball.x * scaleX, game.court.marginX + game.ball.radius, nextWidth - game.court.marginX - game.ball.radius);
    game.ball.y = clamp(game.ball.y * scaleY, game.court.marginY + game.ball.radius, nextHeight - game.court.marginY - game.ball.radius);
  } else {
    game.ball.x = nextWidth / 2;
    game.ball.y = nextHeight / 2;
  }

  game.ball.velocityX *= scaleX;
  game.ball.velocityY *= scaleY;
  game.ball.maxSpeed = 920 * (settings.courtSpeed / 100);
  game.ball.baseSpeed = 430 * difficultyProfiles[settings.difficulty].ballBoost * (settings.courtSpeed / 100);

  if (!game.paused) {
    game.cpu.targetCenterY = game.height / 2;
  }
}

function tick(now) {
  const dt = game.lastTime ? Math.min((now - game.lastTime) / 1000, 0.033) : 0;
  game.lastTime = now;

  update(dt);
  drawFrame(now);
  animationFrame = requestAnimationFrame(tick);
}

function update(dt) {
  if (!game.paused) {
    if (game.mode === "serve") {
      game.serveTimer -= dt;
      if (game.serveTimer <= 0) {
        launchBall(game.serveDirection);
      } else {
        game.ball.x = game.width / 2;
        game.ball.y = game.height / 2;
      }
    } else if (game.mode === "play") {
      updatePlayer(dt);
      updateCpu(dt);
      updateBall(dt);
    }
  }

  updateParticles(dt);

  game.flash = Math.max(0, game.flash - dt * 1.8);
  game.shake = Math.max(0, game.shake - dt * 2.6);

  syncDynamicHud();
}

function updatePlayer(dt) {
  const previousY = game.player.y;
  const direction = (game.input.down ? 1 : 0) - (game.input.up ? 1 : 0);

  game.player.y += direction * game.player.speed * dt;
  game.player.y = clamp(game.player.y, game.court.marginY, game.height - game.court.marginY - game.player.height);
  game.player.velocityY = dt > 0 ? (game.player.y - previousY) / dt : 0;
}

function updateCpu(dt) {
  const previousY = game.cpu.y;
  const profile = difficultyProfiles[settings.difficulty] ?? difficultyProfiles.classic;

  game.cpu.reactionClock -= dt;
  if (game.cpu.reactionClock <= 0) {
    game.cpu.targetCenterY = predictCpuTarget(profile);
    game.cpu.reactionClock = profile.reactionTime;
  }

  const desiredTop = clamp(
    game.cpu.targetCenterY - game.cpu.height / 2,
    game.court.marginY,
    game.height - game.court.marginY - game.cpu.height,
  );
  const delta = desiredTop - game.cpu.y;
  const maxStep = game.cpu.speed * dt;

  if (Math.abs(delta) <= maxStep) {
    game.cpu.y = desiredTop;
  } else {
    game.cpu.y += Math.sign(delta) * maxStep;
  }

  game.cpu.velocityY = dt > 0 ? (game.cpu.y - previousY) / dt : 0;
}

function updateBall(dt) {
  const ball = game.ball;
  ball.x += ball.velocityX * dt;
  ball.y += ball.velocityY * dt;

  game.trail.unshift({ x: ball.x, y: ball.y, life: 0.42 });
  if (game.trail.length > 10) {
    game.trail.pop();
  }

  const topLimit = game.court.marginY + ball.radius;
  const bottomLimit = game.height - game.court.marginY - ball.radius;

  if (ball.y <= topLimit) {
    ball.y = topLimit;
    ball.velocityY = Math.abs(ball.velocityY);
    burst(ball.x, ball.y, "11, 168, 154", 4);
  } else if (ball.y >= bottomLimit) {
    ball.y = bottomLimit;
    ball.velocityY = -Math.abs(ball.velocityY);
    burst(ball.x, ball.y, "255, 122, 31", 4);
  }

  if (ball.velocityX < 0 && intersectsPaddle(game.player)) {
    bounceFromPaddle(game.player, 1, "11, 168, 154");
  } else if (ball.velocityX > 0 && intersectsPaddle(game.cpu)) {
    bounceFromPaddle(game.cpu, -1, "245, 83, 79");
  }

  if (ball.x + ball.radius < 0) {
    scorePoint("cpu");
  } else if (ball.x - ball.radius > game.width) {
    scorePoint("player");
  }
}

function intersectsPaddle(paddle) {
  const ball = game.ball;
  const left = paddle.x;
  const right = paddle.x + paddle.width;
  const top = paddle.y;
  const bottom = paddle.y + paddle.height;

  return (
    ball.x + ball.radius >= left &&
    ball.x - ball.radius <= right &&
    ball.y + ball.radius >= top &&
    ball.y - ball.radius <= bottom
  );
}

function bounceFromPaddle(paddle, direction, color) {
  const ball = game.ball;
  const paddleCenter = paddle.y + paddle.height / 2;
  const contactPoint = (ball.y - paddleCenter) / (paddle.height / 2);
  const clampedPoint = clamp(contactPoint, -1, 1);
  const maxAngle = Math.PI * 0.33;
  const baseSpeed = Math.min(ball.speed * 1.06, game.ball.maxSpeed);
  const spin = (paddle.velocityY / 700) * 0.35;
  const angle = clampedPoint * maxAngle + spin;

  ball.speed = baseSpeed;
  ball.velocityX = Math.cos(angle) * baseSpeed * direction;
  ball.velocityY = Math.sin(angle) * baseSpeed;

  const magnitude = Math.hypot(ball.velocityX, ball.velocityY) || 1;
  ball.velocityX = (ball.velocityX / magnitude) * baseSpeed;
  ball.velocityY = (ball.velocityY / magnitude) * baseSpeed;

  ball.x = direction > 0 ? paddle.x + paddle.width + ball.radius + 1 : paddle.x - ball.radius - 1;
  ball.y = clamp(ball.y, game.court.marginY + ball.radius, game.height - game.court.marginY - ball.radius);

  game.rally += 1;
  game.flash = 0.32;
  game.shake = 0.2;
  burst(ball.x, ball.y, color, 10);
  setMessage(`Rally ${game.rally}. Keep the pressure on.`);
}

function scorePoint(winner) {
  game.mode = "serve";
  game.paused = false;
  game.rally = 0;
  game.ball.speed = game.ball.baseSpeed;
  game.ball.velocityX = 0;
  game.ball.velocityY = 0;
  game.serveTimer = 0.95;
  game.serveDirection = winner === "player" ? 1 : -1;
  game.ball.x = game.width / 2;
  game.ball.y = game.height / 2;

  if (winner === "player") {
    game.score.player += 1;
    game.flashColor = "11, 168, 154";
    game.flash = 0.38;
    game.shake = 0.26;
    burst(game.width * 0.35, game.height * 0.52, "11, 168, 154", 16);
    setMessage("Point scored. Your next serve is loading.");
    if (game.score.player >= settings.targetScore) {
      finishMatch("player");
    }
  } else {
    game.score.cpu += 1;
    game.flashColor = "245, 83, 79";
    game.flash = 0.38;
    game.shake = 0.26;
    burst(game.width * 0.65, game.height * 0.52, "245, 83, 79", 16);
    setMessage("The CPU scored. Resetting the court.");
    if (game.score.cpu >= settings.targetScore) {
      finishMatch("cpu");
    }
  }

  if (game.mode !== "over") {
    updateHud("Serving", messageNode.textContent);
  }
}

function finishMatch(winner) {
  game.mode = "over";
  game.paused = false;
  game.ball.velocityX = 0;
  game.ball.velocityY = 0;
  game.serveTimer = 0;

  if (winner === "player") {
    game.currentStreak += 1;
    game.bestStreak = Math.max(game.bestStreak, game.currentStreak);
    writeBestStreak(game.bestStreak);
    burst(game.width * 0.5, game.height * 0.45, "11, 168, 154", 26);
    game.flashColor = "11, 168, 154";
    game.flash = 0.5;
    game.shake = 0.32;
    updateHud("You win", `Match complete. Current win streak: ${game.currentStreak}. Press Restart for a new duel.`);
  } else {
    game.currentStreak = 0;
    burst(game.width * 0.5, game.height * 0.45, "245, 83, 79", 26);
    game.flashColor = "245, 83, 79";
    game.flash = 0.5;
    game.shake = 0.32;
    updateHud("CPU wins", "Match complete. Press Restart and try another rally run.");
  }

  updatePrimaryLabel();
}

function restartMatch() {
  game.mode = "ready";
  game.paused = false;
  game.score.player = 0;
  game.score.cpu = 0;
  game.rally = 0;
  game.serveTimer = 0;
  game.serveDirection = 1;
  game.ball.speed = game.ball.baseSpeed;
  game.ball.velocityX = 0;
  game.ball.velocityY = 0;
  game.ball.x = game.width / 2;
  game.ball.y = game.height / 2;
  game.player.y = centerY(game.height, game.player.height);
  game.cpu.y = centerY(game.height, game.cpu.height);
  game.player.velocityY = 0;
  game.cpu.velocityY = 0;
  game.trail = [];
  game.particles = [];
  setMessage("Fresh court loaded. Press Start or Space to begin the next duel.");
  updateHud("Ready", messageNode.textContent);
  updatePrimaryLabel();
}

function beginServe() {
  game.mode = "serve";
  game.paused = false;
  game.rally = 0;
  game.serveTimer = 0.95;
  game.serveDirection = Math.random() > 0.5 ? 1 : -1;
  game.ball.speed = game.ball.baseSpeed;
  game.ball.velocityX = 0;
  game.ball.velocityY = 0;
  game.ball.x = game.width / 2;
  game.ball.y = game.height / 2;
  setMessage(game.serveDirection > 0 ? "Serve incoming to the right." : "Serve incoming to the left.");
  updateHud("Serving", messageNode.textContent);
  updatePrimaryLabel();
}

function launchBall(direction) {
  const normalizedDirection = direction || 1;
  const ball = game.ball;
  const angle = randomBetween(-0.28, 0.28);
  const speed = ball.baseSpeed;

  ball.speed = speed;
  ball.velocityX = Math.cos(angle) * speed * normalizedDirection;
  ball.velocityY = Math.sin(angle) * speed;

  if (Math.abs(ball.velocityY) < speed * 0.18) {
    ball.velocityY = (ball.velocityY >= 0 ? 1 : -1) * speed * 0.18;
  }

  ball.x = game.width / 2;
  ball.y = game.height / 2;
  game.mode = "play";
  game.paused = false;
  game.serveTimer = 0;
  setMessage("The rally is live. Hold the line.");
  updateHud("Playing", messageNode.textContent);
  updatePrimaryLabel();
}

function setPaused(nextPaused, customMessage = "") {
  if (game.mode === "over") {
    return;
  }

  game.paused = nextPaused;
  if (nextPaused) {
    updateHud("Paused", customMessage || "Match paused. Press Space or Resume to continue.");
  } else if (game.mode === "ready") {
    updateHud("Ready", customMessage || "Ready to start the duel.");
  } else if (game.mode === "serve") {
    updateHud("Serving", customMessage || "Serve countdown resumed.");
  } else {
    updateHud("Playing", customMessage || "Back in motion.");
  }

  updatePrimaryLabel();
}

function handlePrimaryAction() {
  if (game.mode === "over") {
    restartMatch();
    return;
  }

  if (game.paused) {
    setPaused(false);
    return;
  }

  if (game.mode === "ready") {
    beginServe();
    return;
  }

  if (game.mode === "serve") {
    launchBall(game.serveDirection);
    return;
  }

  if (game.mode === "play") {
    setPaused(true);
  }
}

function handleKeyDown(event) {
  if (event.code === "ArrowUp" || event.code === "KeyW") {
    event.preventDefault();
    game.input.up = true;
    canvas.focus();
    return;
  }

  if (event.code === "ArrowDown" || event.code === "KeyS") {
    event.preventDefault();
    game.input.down = true;
    canvas.focus();
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    handlePrimaryAction();
    canvas.focus();
    return;
  }

  if (event.code === "KeyR") {
    event.preventDefault();
    restartMatch();
    canvas.focus();
    return;
  }

  if (event.code === "Enter") {
    event.preventDefault();
    if (game.mode === "ready") {
      beginServe();
    } else if (game.mode === "serve") {
      launchBall(game.serveDirection);
    }
    canvas.focus();
  }
}

function handleKeyUp(event) {
  if (event.code === "ArrowUp" || event.code === "KeyW") {
    game.input.up = false;
  }

  if (event.code === "ArrowDown" || event.code === "KeyS") {
    game.input.down = false;
  }
}

function bindHoldButton(button, startAction, stopAction) {
  let active = false;

  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    active = true;
    startAction();
    if (button.setPointerCapture) {
      button.setPointerCapture(event.pointerId);
    }
  });

  const stop = (event) => {
    if (!active) {
      return;
    }

    active = false;
    stopAction();

    if (button.hasPointerCapture && button.hasPointerCapture(event.pointerId) && button.releasePointerCapture) {
      button.releasePointerCapture(event.pointerId);
    }
  };

  button.addEventListener("pointerup", stop);
  button.addEventListener("pointercancel", stop);
  button.addEventListener("pointerleave", stop);
}

function predictCpuTarget(profile) {
  if (game.ball.velocityX <= 0) {
    return game.height / 2;
  }

  const targetX = game.cpu.x - game.ball.radius;
  const distance = targetX - game.ball.x;
  if (distance <= 0 || game.ball.velocityX <= 0) {
    return game.height / 2;
  }

  const timeToTarget = distance / game.ball.velocityX;
  if (!Number.isFinite(timeToTarget) || timeToTarget <= 0) {
    return game.height / 2;
  }

  const top = game.court.marginY + game.ball.radius;
  const bottom = game.height - game.court.marginY - game.ball.radius;
  const range = bottom - top;
  if (range <= 0) {
    return game.height / 2;
  }

  let predicted = game.ball.y + game.ball.velocityY * timeToTarget;
  while (predicted < top || predicted > bottom) {
    if (predicted < top) {
      predicted = top + (top - predicted);
    }
    if (predicted > bottom) {
      predicted = bottom - (predicted - bottom);
    }
  }

  const jitter = randomBetween(-profile.jitter, profile.jitter);
  return clamp(predicted + jitter, game.court.marginY + game.cpu.height / 2, game.height - game.court.marginY - game.cpu.height / 2);
}

function updateParticles(dt) {
  if (!game.particles.length) {
    return;
  }

  game.particles.forEach((particle) => {
    particle.life -= dt;
    particle.x += particle.velocityX * dt;
    particle.y += particle.velocityY * dt;
    particle.velocityX *= 0.98;
    particle.velocityY *= 0.98;
  });

  game.particles = game.particles.filter((particle) => particle.life > 0);
}

function burst(x, y, color, count) {
  for (let index = 0; index < count; index += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(120, 420);
    game.particles.push({
      x,
      y,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      life: randomBetween(0.22, 0.55),
      color,
      size: randomBetween(1.2, 2.8),
    });
  }
}

function drawFrame(now) {
  const ctx = context;
  const width = game.width || canvas.width;
  const height = game.height || canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  if (game.shake > 0) {
    const shakeAmount = game.shake * 8;
    ctx.translate(randomBetween(-shakeAmount, shakeAmount), randomBetween(-shakeAmount, shakeAmount));
  }

  drawBackground(ctx, width, height);
  drawCourtGrid(ctx, width, height);
  drawNet(ctx, width, height);
  drawScoreboard(ctx, width, height);
  drawTrail(ctx);
  drawPaddle(ctx, game.player, "11, 168, 154");
  drawPaddle(ctx, game.cpu, "245, 83, 79");
  drawBall(ctx, game.ball);
  drawParticles(ctx);
  drawOverlay(ctx, width, height);
  drawScanlines(ctx, width, height);
  drawVignette(ctx, width, height);

  ctx.restore();
}

function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#08111c");
  gradient.addColorStop(0.5, "#071723");
  gradient.addColorStop(1, "#050c14");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(width * 0.28, height * 0.18, 0, width * 0.28, height * 0.18, Math.max(width, height) * 0.72);
  glow.addColorStop(0, "rgba(11, 168, 154, 0.12)");
  glow.addColorStop(0.42, "rgba(11, 132, 255, 0.06)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(${game.flashColor}, ${game.flash * 0.12})`;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawCourtGrid(ctx, width, height) {
  ctx.save();
  ctx.strokeStyle = "rgba(191, 239, 255, 0.07)";
  ctx.lineWidth = 1;
  const cell = Math.max(42, Math.round(Math.min(width, height) / 12));

  for (let x = 0; x <= width; x += cell) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += cell) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawNet(ctx, width, height) {
  const top = game.court.marginY;
  const bottom = height - game.court.marginY;
  const dashHeight = Math.max(16, Math.round(height * 0.045));
  const gap = game.court.netGap;
  const centerX = width / 2;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.shadowColor = "rgba(11, 132, 255, 0.55)";
  ctx.shadowBlur = 14;

  for (let y = top; y < bottom; y += dashHeight + gap) {
    ctx.fillRect(centerX - 2, y, 4, dashHeight);
  }

  ctx.restore();
}

function drawScoreboard(ctx, width, height) {
  ctx.save();
  ctx.textBaseline = "top";
  ctx.font = `800 ${Math.max(32, Math.round(height * 0.08))}px "DM Sans", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 0;
  ctx.fillText(String(game.score.player), width * 0.12, game.court.marginY * 0.5);
  ctx.textAlign = "right";
  ctx.fillText(String(game.score.cpu), width * 0.88, game.court.marginY * 0.5);

  ctx.textAlign = "center";
  ctx.font = `700 ${Math.max(11, Math.round(height * 0.026))}px "SFMono-Regular", "Roboto Mono", monospace`;
  ctx.fillStyle = "rgba(191,239,255,0.82)";
  ctx.fillText(`FIRST TO ${settings.targetScore}  •  ${difficultyProfiles[settings.difficulty].label.toUpperCase()}  •  ${settings.courtSpeed}% PACE`, width / 2, game.court.marginY * 0.54);
  ctx.restore();
}

function drawTrail(ctx) {
  const ball = game.ball;
  if (!game.trail.length) {
    return;
  }

  game.trail.forEach((point, index) => {
    const alpha = Math.max(point.life / 0.42, 0) * (1 - index / game.trail.length);
    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(2, ball.radius * (0.75 - index * 0.06)), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawPaddle(ctx, paddle, color) {
  const radius = Math.min(12, paddle.width);
  const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.width, paddle.y + paddle.height);
  gradient.addColorStop(0, `rgba(${color}, 0.92)`);
  gradient.addColorStop(1, "rgba(255,255,255,0.9)");

  ctx.save();
  ctx.shadowColor = `rgba(${color}, 0.55)`;
  ctx.shadowBlur = 18;
  ctx.fillStyle = gradient;
  roundRect(ctx, paddle.x, paddle.y, paddle.width, paddle.height, radius);
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx, ball) {
  const glow = ctx.createRadialGradient(ball.x, ball.y, ball.radius * 0.2, ball.x, ball.y, ball.radius * 5.5);
  glow.addColorStop(0, "rgba(255,255,255,1)");
  glow.addColorStop(0.22, "rgba(191,239,255,0.8)");
  glow.addColorStop(1, "rgba(191,239,255,0)");

  ctx.save();
  ctx.shadowColor = "rgba(191,239,255,0.95)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 10;
  ctx.fillStyle = "rgba(255,255,255,0.98)";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticles(ctx) {
  if (!game.particles.length) {
    return;
  }

  game.particles.forEach((particle) => {
    const alpha = clamp(particle.life / 0.55, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(${particle.color}, 1)`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function drawOverlay(ctx, width, height) {
  const mode = hudLabel();
  if (mode === "Playing") {
    return;
  }

  const title = mode === "Paused"
    ? "PAUSED"
    : mode === "Serving"
      ? "SERVE INBOUND"
      : mode === "You win"
        ? "MATCH WON"
        : mode === "CPU wins"
          ? "MATCH LOST"
          : "READY";

  const subtitle = game.mode === "over"
    ? `Current streak: ${game.currentStreak}  •  Best streak: ${game.bestStreak}`
    : game.paused
      ? "Tap Start or press Space to continue the duel."
      : game.mode === "serve"
        ? "Hold steady. The ball is about to launch."
        : "Press Start to light up the court.";

  ctx.save();
  ctx.fillStyle = "rgba(5, 10, 16, 0.34)";
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${Math.max(26, Math.round(height * 0.1))}px "DM Sans", sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.shadowColor = "rgba(11, 132, 255, 0.62)";
  ctx.shadowBlur = 18;
  ctx.fillText(title, width / 2, height / 2 - 20);
  ctx.shadowBlur = 0;
  ctx.font = `700 ${Math.max(12, Math.round(height * 0.028))}px "SFMono-Regular", "Roboto Mono", monospace`;
  ctx.fillStyle = "rgba(191,239,255,0.86)";
  ctx.fillText(subtitle, width / 2, height / 2 + 28);

  if (game.mode === "serve") {
    ctx.font = `900 ${Math.max(18, Math.round(height * 0.05))}px "DM Sans", sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.fillText(String(Math.max(1, Math.ceil(game.serveTimer))), width / 2, height / 2 - 78);
  }

  if (game.mode === "over") {
    ctx.font = `700 ${Math.max(12, Math.round(height * 0.03))}px "DM Sans", sans-serif`;
    ctx.fillText("Press Restart for another match.", width / 2, height / 2 + 58);
  }

  ctx.restore();
}

function drawScanlines(ctx, width, height) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "rgba(255,255,255,0.025)";
  for (let y = 0; y < height; y += 4) {
    ctx.fillRect(0, y, width, 1);
  }
  ctx.restore();
}

function drawVignette(ctx, width, height) {
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.18, width / 2, height / 2, Math.max(width, height) * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.7, "rgba(0,0,0,0.1)");
  vignette.addColorStop(1, "rgba(0,0,0,0.34)");
  ctx.save();
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
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

function syncDynamicHud() {
  playerScoreNode.textContent = String(game.score.player);
  cpuScoreNode.textContent = String(game.score.cpu);
  rallyNode.textContent = String(game.rally);
  bestStreakNode.textContent = String(game.bestStreak);
  updatePrimaryLabel();
}

function updateHud(label, message) {
  statusNode.textContent = label;
  if (message) {
    messageNode.textContent = message;
  }
  updatePrimaryLabel();
}

function hudLabel() {
  if (game.mode === "over") {
    return game.score.player > game.score.cpu ? "You win" : "CPU wins";
  }

  if (game.paused) {
    return "Paused";
  }

  if (game.mode === "serve") {
    return "Serving";
  }

  if (game.mode === "play") {
    return "Playing";
  }

  return "Ready";
}

function statusLabel() {
  if (game.paused) {
    return "Paused";
  }

  if (game.mode === "serve") {
    return "Serving";
  }

  if (game.mode === "play") {
    return "Playing";
  }

  if (game.mode === "over") {
    return game.score.player > game.score.cpu ? "You win" : "CPU wins";
  }

  return "Ready";
}

function setMessage(message) {
  messageNode.textContent = message;
}

function updatePrimaryLabel() {
  let label = "Start";
  if (game.mode === "over") {
    label = "Restart";
  } else if (game.paused) {
    label = "Resume";
  } else if (game.mode === "play") {
    label = "Pause";
  } else if (game.mode === "serve") {
    label = "Serve now";
  }

  primaryButton.textContent = label;
  mobilePauseButton.textContent = game.mode === "over"
    ? "Restart"
    : game.paused
      ? "Resume"
      : game.mode === "play"
        ? "Pause"
        : game.mode === "serve"
          ? "Serve"
          : "Start";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function centerY(height, elementHeight) {
  return (height - elementHeight) / 2;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
