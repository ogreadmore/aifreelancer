import { initCommon } from "../common.js";

initCommon("stopwatch");

const stopwatchDisplay = document.querySelector("#stopwatch-display");
const stopwatchStartButton = document.querySelector("#stopwatch-start");
const stopwatchLapButton = document.querySelector("#stopwatch-lap");
const stopwatchResetButton = document.querySelector("#stopwatch-reset");
const stopwatchState = document.querySelector("#stopwatch-state");
const lapCount = document.querySelector("#lap-count");
const lapList = document.querySelector("#lap-list");

const countdownDisplay = document.querySelector("#countdown-display");
const countdownMinutes = document.querySelector("#countdown-minutes");
const countdownSeconds = document.querySelector("#countdown-seconds");
const countdownStartButton = document.querySelector("#countdown-start");
const countdownResetButton = document.querySelector("#countdown-reset");
const countdownStatus = document.querySelector("#countdown-status");
const countdownDuration = document.querySelector("#countdown-duration");

const stopwatch = {
  running: false,
  accumulatedMs: 0,
  startedAt: 0,
  laps: [],
};

const countdown = {
  running: false,
  durationMs: getCountdownInputMs(),
  remainingMs: getCountdownInputMs(),
  startedAt: 0,
  pausedRemainingMs: getCountdownInputMs(),
};

let animationFrame = 0;

stopwatchStartButton.addEventListener("click", toggleStopwatch);
stopwatchLapButton.addEventListener("click", addLap);
stopwatchResetButton.addEventListener("click", resetStopwatch);

countdownStartButton.addEventListener("click", toggleCountdown);
countdownResetButton.addEventListener("click", resetCountdown);

[countdownMinutes, countdownSeconds].forEach((input) => {
  input.addEventListener("input", () => {
    if (!countdown.running) {
      const nextDuration = getCountdownInputMs();
      countdown.durationMs = nextDuration;
      countdown.remainingMs = nextDuration;
      countdown.pausedRemainingMs = nextDuration;
      renderCountdown();
    }
  });
});

document.querySelectorAll("[data-countdown-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    countdownMinutes.value = button.dataset.countdownPreset;
    countdownSeconds.value = "0";
    resetCountdown();
  });
});

renderStopwatch();
renderCountdown();
renderLaps();

function toggleStopwatch() {
  if (stopwatch.running) {
    stopwatch.accumulatedMs = getStopwatchElapsedMs();
    stopwatch.running = false;
    stopwatchState.textContent = "Paused";
    stopwatchStartButton.textContent = "Resume";
    stopLoopIfIdle();
    renderStopwatch();
    return;
  }

  stopwatch.running = true;
  stopwatch.startedAt = performance.now();
  stopwatchState.textContent = stopwatch.accumulatedMs ? "Resumed" : "Running";
  stopwatchStartButton.textContent = "Pause";
  ensureLoop();
}

function addLap() {
  if (!stopwatch.running) {
    return;
  }

  const totalMs = getStopwatchElapsedMs();
  const latestTotal = stopwatch.laps[0]?.totalMs ?? 0;

  stopwatch.laps.unshift({
    number: stopwatch.laps.length + 1,
    totalMs,
    splitMs: totalMs - latestTotal,
  });

  renderLaps();
}

function resetStopwatch() {
  stopwatch.running = false;
  stopwatch.accumulatedMs = 0;
  stopwatch.startedAt = 0;
  stopwatch.laps = [];
  stopwatchState.textContent = "Ready";
  stopwatchStartButton.textContent = "Start";
  renderStopwatch();
  renderLaps();
  stopLoopIfIdle();
}

function getStopwatchElapsedMs() {
  if (!stopwatch.running) {
    return stopwatch.accumulatedMs;
  }

  return stopwatch.accumulatedMs + (performance.now() - stopwatch.startedAt);
}

function toggleCountdown() {
  if (countdown.running) {
    countdown.pausedRemainingMs = Math.max(
      countdown.durationMs - (performance.now() - countdown.startedAt),
      0,
    );
    countdown.remainingMs = countdown.pausedRemainingMs;
    countdown.running = false;
    countdownStatus.textContent = countdown.remainingMs ? "Paused" : "Complete";
    countdownStartButton.textContent = countdown.remainingMs ? "Resume countdown" : "Start countdown";
    renderCountdown();
    stopLoopIfIdle();
    return;
  }

  const freshDuration = getCountdownInputMs();
  if (!countdown.remainingMs || countdown.remainingMs > freshDuration) {
    countdown.remainingMs = freshDuration;
    countdown.pausedRemainingMs = freshDuration;
    countdown.durationMs = freshDuration;
  }

  if (!countdown.remainingMs) {
    countdown.durationMs = freshDuration;
    countdown.remainingMs = freshDuration;
    countdown.pausedRemainingMs = freshDuration;
  }

  countdown.durationMs = getCountdownInputMs();
  countdown.startedAt = performance.now() - (countdown.durationMs - countdown.pausedRemainingMs);
  countdown.running = true;
  countdownStatus.textContent = "Running";
  countdownStartButton.textContent = "Pause countdown";
  ensureLoop();
}

function resetCountdown() {
  countdown.running = false;
  countdown.durationMs = getCountdownInputMs();
  countdown.remainingMs = countdown.durationMs;
  countdown.pausedRemainingMs = countdown.durationMs;
  countdown.startedAt = 0;
  countdownStatus.textContent = "Ready";
  countdownStartButton.textContent = "Start countdown";
  renderCountdown();
  stopLoopIfIdle();
}

function getCountdownInputMs() {
  const minutes = Number(countdownMinutes.value || 0);
  const seconds = Number(countdownSeconds.value || 0);
  return Math.max((minutes * 60 + seconds) * 1000, 0);
}

function ensureLoop() {
  if (!animationFrame) {
    animationFrame = requestAnimationFrame(tick);
  }
}

function stopLoopIfIdle() {
  if (!stopwatch.running && !countdown.running && animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
}

function tick() {
  renderStopwatch();
  renderCountdown();

  if (stopwatch.running || countdown.running) {
    animationFrame = requestAnimationFrame(tick);
  } else {
    animationFrame = 0;
  }
}

function renderStopwatch() {
  stopwatchDisplay.textContent = formatStopwatch(getStopwatchElapsedMs());
}

function renderLaps() {
  lapCount.textContent = stopwatch.laps.length.toString();

  if (!stopwatch.laps.length) {
    lapList.innerHTML = `
      <div class="empty-state">
        <strong class="empty-title">No laps yet</strong>
        <p>Start the stopwatch and capture laps to compare segments.</p>
      </div>
    `;
    return;
  }

  lapList.innerHTML = stopwatch.laps
    .map(
      (lap) => `
        <article class="lap-item">
          <div>
            <strong>Lap ${lap.number}</strong>
            <div class="helper-copy">Split ${formatStopwatch(lap.splitMs)}</div>
          </div>
          <div class="mono">${formatStopwatch(lap.totalMs)}</div>
        </article>
      `,
    )
    .join("");
}

function renderCountdown() {
  if (!countdown.running && countdown.remainingMs > 0 && countdownStatus.textContent === "Complete") {
    countdownStatus.textContent = "Ready";
  }

  if (countdown.running) {
    countdown.remainingMs = Math.max(
      countdown.durationMs - (performance.now() - countdown.startedAt),
      0,
    );
    countdown.pausedRemainingMs = countdown.remainingMs;
  }

  if (countdown.running && countdown.remainingMs <= 0) {
    countdown.running = false;
    countdown.remainingMs = 0;
    countdown.pausedRemainingMs = 0;
    countdownStatus.textContent = "Complete";
    countdownStartButton.textContent = "Start countdown";
    playBeep();
    stopLoopIfIdle();
  }

  countdownDisplay.textContent = formatCountdown(countdown.remainingMs);
  countdownDuration.textContent = describeDuration(countdown.durationMs);
}

function formatStopwatch(milliseconds) {
  const totalCentiseconds = Math.floor(milliseconds / 10);
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(totalMinutes)}:${pad(seconds)}`;
}

function describeDuration(milliseconds) {
  const totalMinutes = milliseconds / 60000;
  if (totalMinutes === 1) {
    return "1 minute";
  }

  if (Number.isInteger(totalMinutes)) {
    return `${totalMinutes} minutes`;
  }

  return `${(milliseconds / 1000).toFixed(0)} seconds`;
}

function pad(value) {
  return value.toString().padStart(2, "0");
}

function playBeep() {
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) {
      return;
    }
    const audioContext = new Context();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.06;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    countdownStatus.textContent = "Complete";
  }
}
