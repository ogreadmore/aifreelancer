import { initCommon } from "../common.js";

initCommon("signal-memory");

const canvas = document.querySelector("#signal-memory-canvas");
const context = canvas.getContext("2d", { alpha: false });
const board = document.querySelector("#signal-memory-board");
const overlay = document.querySelector("#signal-memory-overlay");
const overlayKicker = document.querySelector("#signal-memory-overlay-kicker");
const overlayTitle = document.querySelector("#signal-memory-overlay-title");
const overlayCopy = document.querySelector("#signal-memory-overlay-copy");
const overlayBest = document.querySelector("#signal-memory-overlay-best");
const overlayScore = document.querySelector("#signal-memory-overlay-score");
const overlayRound = document.querySelector("#signal-memory-overlay-round");
const overlayStartButton = document.querySelector("#signal-memory-overlay-start");
const overlayResumeButton = document.querySelector("#signal-memory-overlay-resume");
const startButton = document.querySelector("#signal-memory-start");
const pauseButton = document.querySelector("#signal-memory-pause");
const restartButton = document.querySelector("#signal-memory-restart");
const soundTestButton = document.querySelector("#signal-memory-sound-test");
const focusButton = document.querySelector("#signal-memory-focus");
const statusNode = document.querySelector("#signal-memory-status");
const scoreNode = document.querySelector("#signal-memory-score");
const bestNode = document.querySelector("#signal-memory-best");
const roundNode = document.querySelector("#signal-memory-round");
const tempoNode = document.querySelector("#signal-memory-tempo");
const chainNode = document.querySelector("#signal-memory-chain");
const sideTitleNode = document.querySelector("#signal-memory-side-title");
const sideCopyNode = document.querySelector("#signal-memory-side-copy");
const coreReadoutNode = document.querySelector("#signal-memory-core-readout");
const coreSubtextNode = document.querySelector("#signal-memory-core-subtext");
const padButtons = Array.from(document.querySelectorAll(".signal-pad"));

const STORAGE_KEY = "aifreelancer.signal-memory.best-score";
const TAU = Math.PI * 2;
const BASE_SHOW_MS = 620;
const MIN_SHOW_MS = 220;
const INTERLUDE_MS = 420;
const PREVIEW_GAP_MS = 120;
const numberFormatter = new Intl.NumberFormat("en-US");

const SIGNALS = [
  { label: "North", code: "N", key: "ArrowUp", tone: 392, color: "#64f0ff", altKeys: ["KeyW", "Digit1"] },
  { label: "East", code: "E", key: "ArrowRight", tone: 523.25, color: "#c18dff", altKeys: ["KeyD", "Digit2"] },
  { label: "South", code: "S", key: "ArrowDown", tone: 349.23, color: "#6effac", altKeys: ["KeyS", "Digit3"] },
  { label: "West", code: "W", key: "ArrowLeft", tone: 440, color: "#ffc869", altKeys: ["KeyA", "Digit4"] },
];

const state = {
  phase: "ready",
  score: 0,
  best: loadBestScore(),
  round: 1,
  sequence: [],
  inputIndex: 0,
  showIndex: 0,
  showLit: false,
  activeSignal: null,
  showNextAt: 0,
  showDuration: BASE_SHOW_MS,
  gapDuration: Math.max(100, Math.round(BASE_SHOW_MS * 0.42)),
  interludeUntil: 0,
  flashUntil: 0,
  pauseStartedAt: 0,
  resumePhase: "ready",
  corePulse: 0.7,
  scanPhase: Math.random() * TAU,
  effects: [],
  width: 0,
  height: 0,
  dpr: 1,
  lastFrameAt: performance.now(),
  previewToken: 0,
  audioContext: null,
};

const resizeObserver = typeof ResizeObserver === "function"
  ? new ResizeObserver(() => resizeCanvas())
  : null;

startButton.addEventListener("click", handlePrimaryAction);
pauseButton.addEventListener("click", handlePrimaryAction);
restartButton.addEventListener("click", restartGame);
overlayStartButton.addEventListener("click", handlePrimaryAction);
overlayResumeButton.addEventListener("click", handlePrimaryAction);
soundTestButton.addEventListener("click", playPreviewSequence);
focusButton.addEventListener("click", focusHowToPlay);

padButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.signal);
    handlePadInput(index);
  });
});

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("blur", handleBlur);
document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("resize", resizeCanvas);

if (resizeObserver) {
  resizeObserver.observe(board);
}

resetRun();
resizeCanvas();
syncView();
requestAnimationFrame(loop);

function handlePrimaryAction() {
  ensureAudioContext();
  state.previewToken += 1;

  if (state.phase === "ready" || state.phase === "gameover") {
    startGame();
    return;
  }

  if (state.phase === "paused") {
    resumeGame();
    return;
  }

  pauseGame();
}

function handlePadInput(index) {
  if (!Number.isInteger(index) || index < 0 || index >= SIGNALS.length) {
    return;
  }

  if (state.phase === "ready" || state.phase === "gameover") {
    startGame();
    return;
  }

  if (state.phase !== "input") {
    return;
  }

  ensureAudioContext();

  const now = performance.now();
  const expected = state.sequence[state.inputIndex];

  if (index !== expected) {
    triggerFailure(index, now);
    return;
  }

  state.inputIndex += 1;
  state.score += 8;
  state.activeSignal = index;
  state.flashUntil = now + 170;
  state.corePulse = Math.min(2, state.corePulse + 0.25);
  pushBurst(index, 0.95);
  playSignalTone(index, 0.07, "triangle");
  vibrate([12]);
  updateBestScore(state.score);

  if (state.inputIndex >= state.sequence.length) {
    completeRound(now);
    return;
  }

  syncView();
}

function handleKeyDown(event) {
  const key = event.code;
  const handled = new Set([
    "ArrowUp",
    "ArrowRight",
    "ArrowDown",
    "ArrowLeft",
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Space",
    "Enter",
    "KeyP",
    "Escape",
    "KeyR",
  ]);

  if (!handled.has(key)) {
    return;
  }

  event.preventDefault();
  ensureAudioContext();

  if (key === "Space" || key === "Enter") {
    handlePrimaryAction();
    return;
  }

  if (key === "KeyP" || key === "Escape") {
    handlePrimaryAction();
    return;
  }

  if (key === "KeyR") {
    restartGame();
    return;
  }

  const signalIndex = keyToSignalIndex(key);
  if (signalIndex !== null) {
    handlePadInput(signalIndex);
  }
}

function handleBlur() {
  if (state.phase === "showing" || state.phase === "input" || state.phase === "interlude") {
    pauseGame();
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    handleBlur();
  }
}

function focusHowToPlay() {
  document.querySelector(".signal-note-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function startGame() {
  ensureAudioContext();
  state.previewToken += 1;
  resetRun();
  state.phase = "showing";
  state.showNextAt = performance.now() + 380;
  state.corePulse = 1.1;
  setCore("Round 1", "Watch the first pulse");
  syncView();
}

function restartGame() {
  state.previewToken += 1;
  startGame();
}

function pauseGame() {
  if (state.phase !== "showing" && state.phase !== "input" && state.phase !== "interlude") {
    if (state.phase === "ready" || state.phase === "gameover") {
      startGame();
    }
    return;
  }

  state.resumePhase = state.phase;
  state.pauseStartedAt = performance.now();
  state.phase = "paused";
  state.corePulse = 0.55;
  syncView();
}

function resumeGame() {
  if (state.phase !== "paused") {
    return;
  }

  const pausedFor = performance.now() - state.pauseStartedAt;

  if (state.showNextAt) {
    state.showNextAt += pausedFor;
  }

  if (state.interludeUntil) {
    state.interludeUntil += pausedFor;
  }

  if (state.flashUntil) {
    state.flashUntil += pausedFor;
  }

  state.phase = state.resumePhase;
  state.resumePhase = "input";
  state.pauseStartedAt = 0;
  state.corePulse = Math.max(state.corePulse, 0.8);
  syncView();
}

function completeRound(now) {
  state.score += 40 + state.round * 12;
  updateBestScore(state.score);
  state.round += 1;
  state.sequence.push(randomSignal());
  state.inputIndex = 0;
  state.showIndex = 0;
  state.showLit = false;
  state.activeSignal = null;
  state.flashUntil = 0;
  state.showDuration = getShowDuration(state.round);
  state.gapDuration = getGapDuration(state.showDuration);
  state.interludeUntil = now + INTERLUDE_MS;
  state.phase = "interlude";
  state.corePulse = 1.2;
  pushBurst(null, 1.4, "#64f0ff", true);
  vibrate([18, 18, 26]);
  setCore(`Round ${state.round}`, "New signal added");
  syncView();
}

function triggerFailure(index, now) {
  state.activeSignal = index;
  state.showLit = false;
  state.flashUntil = now + 260;
  state.phase = "gameover";
  state.corePulse = 1.5;
  pushBurst(index, 1.45);
  playFailureTone();
  vibrate([40, 28, 90]);
  updateBestScore(state.score);
  setCore("Lost", `Reached round ${state.round}`);
  syncView();
}

function resetRun() {
  state.phase = "ready";
  state.score = 0;
  state.round = 1;
  state.sequence = [randomSignal()];
  state.inputIndex = 0;
  state.showIndex = 0;
  state.showLit = false;
  state.activeSignal = null;
  state.showNextAt = 0;
  state.showDuration = getShowDuration(1);
  state.gapDuration = getGapDuration(state.showDuration);
  state.interludeUntil = 0;
  state.flashUntil = 0;
  state.pauseStartedAt = 0;
  state.resumePhase = "ready";
  state.corePulse = 0.7;
  state.scanPhase = Math.random() * TAU;
  state.effects = [];
  setCore("Ready", "Tap Start");
}

function loop(now) {
  const previousFrameAt = state.lastFrameAt;
  const delta = Math.min(0.05, Math.max(0, (now - previousFrameAt) / 1000 || 0));
  state.lastFrameAt = now;

  updatePlayback(now, delta);
  updateEffects(delta);
  drawScene(now);

  requestAnimationFrame(loop);
}

function updatePlayback(now, delta) {
  state.scanPhase = (state.scanPhase + 0.45 * delta) % TAU;
  state.corePulse = Math.max(0, state.corePulse - 0.85 * delta);

  if (state.phase === "showing") {
    if (!state.showNextAt) {
      state.showNextAt = now + 320;
      return;
    }

    if (now < state.showNextAt) {
      return;
    }

    if (state.showLit) {
      state.showLit = false;
      state.activeSignal = null;
      state.showIndex += 1;

      if (state.showIndex >= state.sequence.length) {
        state.phase = "input";
        state.inputIndex = 0;
        setCore(`Round ${state.round}`, "Your turn");
        syncView();
      } else {
        state.showNextAt = now + state.gapDuration;
      }

      return;
    }

    const signalIndex = state.sequence[state.showIndex];
    state.activeSignal = signalIndex;
    state.showLit = true;
    state.flashUntil = now + state.showDuration;
    state.showNextAt = now + state.showDuration;
    state.corePulse = Math.min(2, state.corePulse + 0.18);
    pushBurst(signalIndex, 0.55);
    playSignalTone(signalIndex, 0.06, "sine");
    return;
  }

  if (state.phase === "interlude" && now >= state.interludeUntil) {
    state.phase = "showing";
    state.showIndex = 0;
    state.showLit = false;
    state.activeSignal = null;
    state.showNextAt = now + 300;
    state.showDuration = getShowDuration(state.round);
    state.gapDuration = getGapDuration(state.showDuration);
    setCore(`Round ${state.round}`, "Watch closely");
    syncView();
    return;
  }

  if (state.phase === "input" && state.flashUntil && now >= state.flashUntil) {
    state.flashUntil = 0;
    if (state.activeSignal !== null) {
      state.activeSignal = null;
    }
  }
}

function updateEffects(delta) {
  state.effects.forEach((effect) => {
    effect.life -= delta;

    if (effect.type === "particle") {
      effect.x += effect.vx * delta;
      effect.y += effect.vy * delta;
      effect.vx *= Math.pow(effect.drag, delta * 60);
      effect.vy *= Math.pow(effect.drag, delta * 60);
    }
  });

  state.effects = state.effects.filter((effect) => effect.life > 0);
}

function drawScene(now) {
  const width = state.width || 960;
  const height = state.height || 720;
  context.clearRect(0, 0, width, height);

  const background = context.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#061020");
  background.addColorStop(0.52, "#081223");
  background.addColorStop(1, state.phase === "gameover" ? "#1a0d14" : "#050815");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const layout = getLayout(width, height);
  drawGrid(layout);
  drawConduits(layout, now);
  drawWaveform(width, height, now);
  drawSignalGlow(layout, now);
  drawEffects(layout, now);
  drawVignette(width, height);
}

function drawGrid(layout) {
  const { width, height } = layout;

  context.save();
  context.globalAlpha = 0.35;
  context.strokeStyle = "rgba(255,255,255,0.045)";
  context.lineWidth = 1;

  for (let x = layout.inset; x <= width - layout.inset; x += layout.gridStep) {
    context.beginPath();
    context.moveTo(x, layout.inset);
    context.lineTo(x, height - layout.inset);
    context.stroke();
  }

  for (let y = layout.inset; y <= height - layout.inset; y += layout.gridStep) {
    context.beginPath();
    context.moveTo(layout.inset, y);
    context.lineTo(width - layout.inset, y);
    context.stroke();
  }

  context.restore();
}

function drawConduits(layout, now) {
  const { core, centers } = layout;
  const pulse = 0.6 + Math.sin(now * 0.0024) * 0.15;

  context.save();
  context.lineCap = "round";

  centers.forEach((center, index) => {
    const signal = SIGNALS[index];
    context.strokeStyle = `rgba(${hexToRgb(signal.color)}, ${0.12 + pulse * 0.12})`;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(core.x, core.y);
    context.lineTo(center.x, center.y);
    context.stroke();
  });

  context.strokeStyle = "rgba(100, 240, 255, 0.18)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(core.x, core.y, core.radius + 14, 0, TAU);
  context.stroke();

  context.strokeStyle = "rgba(255, 255, 255, 0.06)";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(core.x, core.y, core.radius + 32, 0, TAU);
  context.stroke();

  context.restore();
}

function drawWaveform(width, height, now) {
  const baseY = height * 0.84;
  const amplitude = 10 + state.corePulse * 12 + (state.phase === "gameover" ? 6 : 0);
  const hue = state.phase === "gameover" ? "rgba(255, 110, 130, 0.65)" : "rgba(100, 240, 255, 0.6)";

  context.save();
  context.strokeStyle = hue;
  context.lineWidth = 2;
  context.shadowColor = hue;
  context.shadowBlur = 16;
  context.beginPath();

  for (let x = 0; x <= width; x += 6) {
    const signal = Math.sin(x * 0.03 + now * 0.004) * 0.55
      + Math.sin(x * 0.11 + now * 0.002) * 0.18;
    const y = baseY + signal * amplitude;
    if (x === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.stroke();
  context.restore();
}

function drawSignalGlow(layout, now) {
  const litIndex = state.activeSignal;
  if (litIndex === null) {
    return;
  }

  const center = layout.centers[litIndex];
  const color = SIGNALS[litIndex].color;
  const isLit = state.showLit || (state.flashUntil && now < state.flashUntil) || state.phase === "gameover";
  const alpha = isLit ? 0.9 : 0.45;
  const radius = layout.cellRadius * 0.55 + Math.max(0, state.corePulse) * 12;

  const gradient = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius * 1.6);
  gradient.addColorStop(0, withAlpha(color, alpha));
  gradient.addColorStop(0.55, withAlpha(color, alpha * 0.3));
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  context.save();
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(center.x, center.y, radius * 1.45, 0, TAU);
  context.fill();

  context.strokeStyle = withAlpha(color, alpha);
  context.lineWidth = 4;
  context.shadowColor = withAlpha(color, alpha);
  context.shadowBlur = 22;
  context.beginPath();
  context.arc(center.x, center.y, radius * 0.98, 0, TAU);
  context.stroke();
  context.restore();
}

function drawEffects(layout, now) {
  context.save();

  state.effects.forEach((effect) => {
    const progress = 1 - effect.life / effect.maxLife;
    const alpha = Math.max(0, effect.life / effect.maxLife);

    if (effect.type === "ring") {
      const radius = effect.maxRadius * progress;
      context.strokeStyle = withAlpha(effect.color, alpha * 0.8);
      context.lineWidth = 2 + effect.strength * 1.6;
      context.shadowColor = effect.color;
      context.shadowBlur = 16;
      context.beginPath();
      context.arc(effect.x, effect.y, radius, 0, TAU);
      context.stroke();
      return;
    }

    context.fillStyle = withAlpha(effect.color, alpha);
    context.shadowColor = effect.color;
    context.shadowBlur = 8;
    context.beginPath();
    context.arc(effect.x, effect.y, effect.size * (1 - progress * 0.4), 0, TAU);
    context.fill();
  });

  context.restore();
}

function drawVignette(width, height) {
  const vignette = context.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.18, width / 2, height / 2, Math.max(width, height) * 0.68);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.38)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

function pushBurst(signalIndex, intensity = 1, fallbackColor = null, centered = false) {
  const layout = getLayout(state.width || 960, state.height || 720);
  const origin = centered || signalIndex === null ? layout.core : layout.centers[signalIndex];
  const color = fallbackColor || (signalIndex !== null ? SIGNALS[signalIndex].color : "#64f0ff");
  const particleCount = Math.max(8, Math.round(12 * intensity));

  for (let index = 0; index < particleCount; index += 1) {
    const angle = randomRange(0, TAU);
    const speed = randomRange(70, 240) * intensity;
    state.effects.push({
      type: "particle",
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.42 + Math.random() * 0.28,
      maxLife: 0.42 + Math.random() * 0.28,
      color,
      size: randomRange(1.3, 3.2) * intensity,
      drag: 0.985,
    });
  }

  state.effects.push({
    type: "ring",
    x: origin.x,
    y: origin.y,
    life: 0.5,
    maxLife: 0.5,
    maxRadius: Math.max(42, Math.min(state.width || 960, state.height || 720) * 0.24),
    color,
    strength: intensity,
  });

  state.effects = state.effects.slice(-140);
  state.corePulse = Math.min(2, state.corePulse + 0.55 * intensity);
}

function playSignalTone(index, gainValue = 0.065, waveType = "sine") {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  const signal = SIGNALS[index];
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = waveType;
  oscillator.frequency.value = signal.tone;
  envelope.gain.value = 0.0001;

  oscillator.connect(envelope);
  envelope.connect(context.destination);

  const start = context.currentTime;
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainValue), start + 0.02);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
  oscillator.start(start);
  oscillator.stop(start + 0.2);
}

function playFailureTone() {
  const context = ensureAudioContext();
  if (!context) {
    return;
  }

  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(126, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(72, context.currentTime + 0.24);
  envelope.gain.value = 0.0001;
  oscillator.connect(envelope);
  envelope.connect(context.destination);
  envelope.gain.exponentialRampToValueAtTime(0.085, context.currentTime + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.32);
}

async function playPreviewSequence() {
  ensureAudioContext();
  const token = ++state.previewToken;

  for (let index = 0; index < SIGNALS.length; index += 1) {
    if (token !== state.previewToken) {
      return;
    }

    pushBurst(index, 0.4);
    playSignalTone(index, 0.055, "triangle");
    vibrate(10);
    await delay(PREVIEW_GAP_MS);
  }
}

function updateBestScore(score) {
  if (score <= state.best) {
    syncHud();
    return;
  }

  state.best = score;

  try {
    window.localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    // Ignore storage failures and keep the in-memory best score.
  }

  syncHud();
}

function syncView() {
  const bestText = formatScore(state.best);
  const scoreText = formatScore(state.score);
  const roundText = String(state.round);
  const tempoText = `${Math.round(state.showDuration)}ms`;
  const chainText = `${state.phase === "input" ? Math.min(state.inputIndex + 1, state.sequence.length) : state.inputIndex} / ${state.sequence.length}`;

  scoreNode.textContent = scoreText;
  bestNode.textContent = bestText;
  roundNode.textContent = roundText;
  tempoNode.textContent = tempoText;
  chainNode.textContent = chainText;

  overlayBest.textContent = bestText;
  overlayScore.textContent = scoreText;
  overlayRound.textContent = roundText;

  const isActiveOverlay = state.phase === "ready" || state.phase === "paused" || state.phase === "gameover";
  overlay.classList.toggle("is-hidden", !isActiveOverlay);

  overlayResumeButton.hidden = state.phase !== "paused";
  overlayStartButton.hidden = state.phase === "paused";
  overlayStartButton.textContent = state.phase === "gameover" ? "Play again" : "Start decoding";
  overlayResumeButton.textContent = "Resume";

  startButton.textContent = getPrimaryActionLabel();
  pauseButton.textContent = getSecondaryActionLabel();
  restartButton.textContent = "Restart";

  padButtons.forEach((button) => {
    button.disabled = state.phase !== "input";
    button.setAttribute("aria-pressed", "false");
  });

  const message = getPhaseMessage();
  statusNode.textContent = message.status;
  sideTitleNode.textContent = message.sideTitle;
  sideCopyNode.textContent = message.sideCopy;
  coreReadoutNode.textContent = message.coreTitle;
  coreSubtextNode.textContent = message.coreSubtext;
  overlayKicker.textContent = message.overlayKicker;
  overlayTitle.textContent = message.overlayTitle;
  overlayCopy.textContent = message.overlayCopy;
}

function syncHud() {
  overlayBest.textContent = formatScore(state.best);
  overlayScore.textContent = formatScore(state.score);
  scoreNode.textContent = formatScore(state.score);
  bestNode.textContent = formatScore(state.best);
}

function getPhaseMessage() {
  if (state.phase === "ready") {
    return {
      status: "Ready to start",
      sideTitle: "Decode the first pulse",
      sideCopy: "The sequence always begins with one signal. Tap Start or press Space to launch the round.",
      coreTitle: "Ready",
      coreSubtext: "Tap Start",
      overlayKicker: "Standby",
      overlayTitle: "Signal Memory",
      overlayCopy: "Press Start to hear the first pulse. Then repeat the growing sequence by tapping the signal pads in order.",
    };
  }

  if (state.phase === "showing") {
    return {
      status: `Playback active. Sequence ${state.sequence.length}`,
      sideTitle: "Watch the pattern",
      sideCopy: "The board is showing the next pulse chain. Keep the order in your head and wait for your turn.",
      coreTitle: `Round ${state.round}`,
      coreSubtext: "Watch closely",
      overlayKicker: "Signal stream",
      overlayTitle: "Playback engaged",
      overlayCopy: "The next signal is being displayed. Focus on the order and get ready to answer when the board goes dark.",
    };
  }

  if (state.phase === "input") {
    return {
      status: `Your turn. Step ${Math.min(state.inputIndex + 1, state.sequence.length)} of ${state.sequence.length}`,
      sideTitle: "Answer the chain",
      sideCopy: `You are on step ${Math.min(state.inputIndex + 1, state.sequence.length)} of ${state.sequence.length}. Tap the matching pad or use the keyboard.`,
      coreTitle: `Round ${state.round}`,
      coreSubtext: "Your turn",
      overlayKicker: "Input window",
      overlayTitle: "Repeat the signal",
      overlayCopy: "Tap the pads in the exact order you saw them. Every correct answer speeds the next round up a little more.",
    };
  }

  if (state.phase === "interlude") {
    return {
      status: `Round ${state.round} cleared`,
      sideTitle: "New beat loading",
      sideCopy: "You cleared that round. The next signal is being added and the tempo is tightening for the next playback.",
      coreTitle: `Round ${state.round}`,
      coreSubtext: "New beat loading",
      overlayKicker: "Uplink",
      overlayTitle: "Signal extended",
      overlayCopy: "Nice work. The chain just grew by one signal, and the next round will move a little faster.",
    };
  }

  if (state.phase === "paused") {
    return {
      status: "Paused",
      sideTitle: "Signal held",
      sideCopy: "Everything is frozen exactly where you left it. Resume to continue the same sequence and timing.",
      coreTitle: "Paused",
      coreSubtext: "Hold",
      overlayKicker: "Paused",
      overlayTitle: "Signal held",
      overlayCopy: "The sequence is frozen. Resume to continue from the exact same point, or restart if you want a fresh run.",
    };
  }

  return {
    status: `Signal lost at round ${state.round}`,
    sideTitle: "Chain broken",
    sideCopy: `You reached score ${formatScore(state.score)} on round ${state.round}. Press Restart and try to beat the local best.`,
    coreTitle: "Lost",
    coreSubtext: "Run ended",
    overlayKicker: "Signal lost",
    overlayTitle: "Chain broken",
    overlayCopy: `You reached score ${formatScore(state.score)} on round ${state.round}. Restart and chase a bigger run on this device.`,
  };
}

function getPrimaryActionLabel() {
  if (state.phase === "ready") {
    return "Start";
  }

  if (state.phase === "paused") {
    return "Resume";
  }

  if (state.phase === "gameover") {
    return "Play again";
  }

  return "Pause";
}

function getSecondaryActionLabel() {
  if (state.phase === "ready") {
    return "Start";
  }

  if (state.phase === "paused") {
    return "Resume";
  }

  if (state.phase === "gameover") {
    return "Play again";
  }

  return "Pause";
}

function setCore(title, subtext) {
  coreReadoutNode.textContent = title;
  coreSubtextNode.textContent = subtext;
}

function getShowDuration(round) {
  return Math.max(MIN_SHOW_MS, BASE_SHOW_MS - (round - 1) * 24);
}

function getGapDuration(showDuration) {
  return Math.max(90, Math.round(showDuration * 0.42));
}

function loadBestScore() {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY) || 0);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function keyToSignalIndex(code) {
  switch (code) {
    case "ArrowUp":
    case "KeyW":
    case "Digit1":
      return 0;
    case "ArrowRight":
    case "KeyD":
    case "Digit2":
      return 1;
    case "ArrowDown":
    case "KeyS":
    case "Digit3":
      return 2;
    case "ArrowLeft":
    case "KeyA":
    case "Digit4":
      return 3;
    default:
      return null;
  }
}

function ensureAudioContext() {
  if (!state.audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    state.audioContext = new AudioContextClass();
  }

  if (state.audioContext.state === "suspended") {
    state.audioContext.resume().catch(() => {});
  }

  return state.audioContext;
}

function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function randomSignal() {
  return Math.floor(Math.random() * SIGNALS.length);
}

function formatScore(value) {
  return numberFormatter.format(Math.max(0, Math.round(value)));
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function updatePlaybackTiming(now) {
  if (state.phase === "showing") {
    state.showDuration = getShowDuration(state.round);
    state.gapDuration = getGapDuration(state.showDuration);
  }

  state.scanPhase = (state.scanPhase + 0.55 * 0.016) % TAU;
  state.corePulse = Math.max(0, state.corePulse - 0.012);

  if (state.flashUntil && now >= state.flashUntil && state.phase !== "showing") {
    state.flashUntil = 0;
    if (!state.showLit) {
      state.activeSignal = null;
    }
  }
}

function getLayout(width, height) {
  const inset = Math.max(22, Math.round(Math.min(width, height) * 0.075));
  const gap = Math.max(12, Math.round(Math.min(width, height) * 0.028));
  const innerWidth = Math.max(1, width - inset * 2);
  const innerHeight = Math.max(1, height - inset * 2);
  const cellWidth = Math.max(1, (innerWidth - gap) / 2);
  const cellHeight = Math.max(1, (innerHeight - gap) / 2);
  const cellRadius = Math.min(cellWidth, cellHeight) * 0.48;
  const core = {
    x: width / 2,
    y: height / 2,
    radius: Math.min(width, height) * 0.11 + state.corePulse * 10,
  };

  return {
    width,
    height,
    inset,
    gap,
    cellWidth,
    cellHeight,
    cellRadius,
    gridStep: Math.max(24, Math.round(Math.min(width, height) * 0.055)),
    core,
    centers: [
      { x: inset + cellWidth / 2, y: inset + cellHeight / 2 },
      { x: inset + cellWidth + gap + cellWidth / 2, y: inset + cellHeight / 2 },
      { x: inset + cellWidth / 2, y: inset + cellHeight + gap + cellHeight / 2 },
      { x: inset + cellWidth + gap + cellWidth / 2, y: inset + cellHeight + gap + cellHeight / 2 },
    ],
  };
}

function resizeCanvas() {
  const rect = board.getBoundingClientRect();
  const width = Math.max(320, Math.round(rect.width || 960));
  const height = Math.max(320, Math.round(rect.height || Math.max(540, width * 0.9)));
  const dpr = Math.max(window.devicePixelRatio || 1, 1);

  state.width = width;
  state.height = height;
  state.dpr = dpr;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.lineJoin = "round";
  context.lineCap = "round";
}

function hexToRgb(color) {
  const hex = color.replace("#", "");
  const value = hex.length === 3
    ? hex.split("").map((digit) => digit + digit).join("")
    : hex;
  const number = Number.parseInt(value, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `${red}, ${green}, ${blue}`;
}

function withAlpha(color, alpha) {
  if (color.startsWith("#")) {
    return `rgba(${hexToRgb(color)}, ${alpha})`;
  }

  return color.replace(/rgba\(([^)]+),\s*([^)]+)\)/, `rgba($1, ${alpha})`);
}

function triggerFailure(index, now) {
  state.activeSignal = index;
  state.showLit = false;
  state.flashUntil = now + 260;
  state.phase = "gameover";
  state.corePulse = 1.5;
  pushBurst(index, 1.45);
  playFailureTone();
  vibrate([40, 28, 90]);
  updateBestScore(state.score);
  setCore("Lost", `Reached round ${state.round}`);
  syncView();
}
