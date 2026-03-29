const STORAGE_KEY = "ilo-stage-progress-save";
const STAGE_THRESHOLDS = [1000, 10000, 100000, 1000000, 10000000];
const AUTO_UNLOCK_THOUGHTS = 10;
const AUTO_CONNECTION_INTERVAL_MS = 2000;

const state = {
  connections: 0,
  thoughts: 0,
  numbersGenerated: 0,
  switchStates: new Array(14).fill(0),
  activeWireCount: 4,
  musicEnabled: false,
  sfxEnabled: true,
  autoUnlocked: false,
  currentTrackIndex: -1
};

const thoughtWords = [
  "signal", "echo", "spark", "memory", "light", "dream", "pulse", "seed",
  "pattern", "voice", "thread", "lattice", "glow", "origin", "current",
  "shiver", "trace", "tremor", "vector", "horizon"
];

const musicTracks = [
  "ilo-music-sprout-01.mp3",
  "ilo-music-sprout-02.mp3",
  "ilo-music-sprout-03.mp3",
  "ilo-music-sprout-04.mp3"
];

const sfxTracks = [
  "ilo-sfx-zap-01.mp3",
  "ilo-sfx-zap-02.mp3",
  "ilo-sfx-zap-03.mp3",
  "ilo-sfx-zap-04.mp3",
  "ilo-sfx-zap-05.mp3",
  "ilo-sfx-zap-06.mp3"
];

const connectionsCountEl = document.getElementById("connections-count");
const thoughtsCountEl = document.getElementById("thoughts-count");
const numbersCountEl = document.getElementById("numbers-count");
const consoleOutputEl = document.getElementById("console-output");
const progressFillEl = document.getElementById("progress-fill");
const progressPercentEl = document.getElementById("progress-percent");
const linkProgressTextEl = document.getElementById("link-progress-text");
const stageProgressLabelEl = document.getElementById("stage-progress-label");
const linksTotalEl = document.getElementById("links-total");
const autoRateEl = document.getElementById("auto-rate");

const generateConnectionBtn = document.getElementById("generate-connection-btn");
const generateThoughtBtn = document.getElementById("generate-thought-btn");
const generateNumberBtn = document.getElementById("generate-number-btn");
const musicToggleBtn = document.getElementById("music-toggle-btn");
const sfxToggleBtn = document.getElementById("sfx-toggle-btn");
const saveBtn = document.getElementById("save-btn");
const newGameBtn = document.getElementById("new-game-btn");

const backgroundWiresEl = document.getElementById("background-wires");
const wirePulseEl = document.getElementById("wire-pulse");
const wirePaths = Array.from(document.querySelectorAll(".wire-path"));
const switchButtons = document.querySelectorAll(".bit-switch");

const stagePanels = [
  document.getElementById("stage-1-panel"),
  document.getElementById("stage-2-panel"),
  document.getElementById("stage-3-panel"),
  document.getElementById("stage-4-panel"),
  document.getElementById("stage-5-panel")
];

const stageContents = [
  document.querySelector("#stage-1-panel .stage-content"),
  document.getElementById("stage-2-content"),
  document.getElementById("stage-3-content"),
  document.getElementById("stage-4-content"),
  document.getElementById("stage-5-content")
];

const musicAudio = new Audio();
musicAudio.preload = "auto";
musicAudio.volume = 0.7;

let autoConnectionTimer = null;

function getLinksTotal() {
  return state.connections + state.thoughts + state.numbersGenerated;
}

function getCurrentStageIndex() {
  const links = getLinksTotal();

  if (links >= STAGE_THRESHOLDS[4]) return 4;
  if (links >= STAGE_THRESHOLDS[3]) return 3;
  if (links >= STAGE_THRESHOLDS[2]) return 2;
  if (links >= STAGE_THRESHOLDS[1]) return 1;
  return 0;
}

function getCurrentStageNumber() {
  return getCurrentStageIndex() + 1;
}

function getCurrentStageGoal() {
  return STAGE_THRESHOLDS[getCurrentStageIndex()];
}

function getStageAutoMultiplier() {
  return Math.pow(2, getCurrentStageIndex());
}

function getAutoRateText() {
  if (!state.autoUnlocked) {
    return "Rate: 0 links / sec";
  }

  const perTick = getStageAutoMultiplier();
  const perSecond = perTick / 2;
  return `Rate: ${perSecond} links / sec`;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    state.connections = parsed.connections ?? state.connections;
    state.thoughts = parsed.thoughts ?? state.thoughts;
    state.numbersGenerated = parsed.numbersGenerated ?? state.numbersGenerated;
    state.switchStates = Array.isArray(parsed.switchStates) ? parsed.switchStates : state.switchStates;
    state.activeWireCount = parsed.activeWireCount ?? state.activeWireCount;
    state.musicEnabled = parsed.musicEnabled ?? state.musicEnabled;
    state.sfxEnabled = parsed.sfxEnabled ?? state.sfxEnabled;
    state.autoUnlocked = parsed.autoUnlocked ?? state.autoUnlocked;
    state.currentTrackIndex = parsed.currentTrackIndex ?? state.currentTrackIndex;
  } catch (error) {
    console.warn("Could not load saved state.", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderWires() {
  wirePaths.forEach((path, index) => {
    path.classList.toggle("active-line", index < state.activeWireCount);
  });
}

function renderToggles() {
  musicToggleBtn.textContent = `Music: ${state.musicEnabled ? "ON" : "OFF"}`;
  sfxToggleBtn.textContent = `Sound FX: ${state.sfxEnabled ? "ON" : "OFF"}`;
  musicToggleBtn.classList.toggle("on", state.musicEnabled);
  sfxToggleBtn.classList.toggle("on", state.sfxEnabled);
}

function renderStages() {
  const stageIndex = getCurrentStageIndex();

  stagePanels.forEach((panel, index) => {
    panel.classList.toggle("completed", index <= stageIndex);
    stageContents[index].classList.toggle("visible", index <= stageIndex);
  });
}

function renderProgress() {
  const links = getLinksTotal();
  const stageGoal = getCurrentStageGoal();
  const stageNumber = getCurrentStageNumber();
  const percent = Math.min(100, Math.floor((links / stageGoal) * 100));

  stageProgressLabelEl.textContent = `Stage ${stageNumber} Progress`;
  progressFillEl.style.width = `${percent}%`;
  progressPercentEl.textContent = `${percent}%`;
  linkProgressTextEl.textContent = `${links.toLocaleString()} / ${stageGoal.toLocaleString()} links`;
}

function renderAutoStatus() {
  linksTotalEl.textContent = `Links: ${getLinksTotal().toLocaleString()}`;
  autoRateEl.textContent = getAutoRateText();
}

function render() {
  connectionsCountEl.textContent = state.connections.toLocaleString();
  thoughtsCountEl.textContent = state.thoughts.toLocaleString();
  numbersCountEl.textContent = state.numbersGenerated.toLocaleString();

  switchButtons.forEach((button, index) => {
    const isOn = state.switchStates[index] === 1;
    button.textContent = isOn ? "1" : "0";
    button.classList.toggle("on", isOn);
    button.classList.toggle("off", !isOn);
  });

  renderWires();
  renderToggles();
  renderStages();
  renderProgress();
  renderAutoStatus();
}

function addConsoleMessage(message) {
  const messageEl = document.createElement("p");
  messageEl.textContent = message;
  consoleOutputEl.prepend(messageEl);

  while (consoleOutputEl.children.length > 6) {
    consoleOutputEl.removeChild(consoleOutputEl.lastChild);
  }
}

function getRandomThoughtWord() {
  return thoughtWords[Math.floor(Math.random() * thoughtWords.length)];
}

function getRandomDigit() {
  return Math.floor(Math.random() * 10);
}

function revealMoreWires(amount = 1) {
  state.activeWireCount += amount;
  if (state.activeWireCount > wirePaths.length) {
    state.activeWireCount = wirePaths.length;
  }
}

function flashWires(colorClass) {
  backgroundWiresEl.classList.remove("flash-green", "flash-blue");
  void backgroundWiresEl.offsetWidth;
  backgroundWiresEl.classList.add(colorClass);

  setTimeout(() => {
    backgroundWiresEl.classList.remove(colorClass);
  }, 180);
}

function flashButton(button) {
  button.classList.add("flash");
  setTimeout(() => button.classList.remove("flash"), 160);
}

function highlightPath(pathIndex, color = "green") {
  const path = wirePaths[pathIndex];
  if (!path) return;

  const className = color === "blue" ? "path-highlight-blue" : "path-highlight-green";
  path.classList.add(className);
  setTimeout(() => path.classList.remove(className), 260);
}

function animatePulseAlongPath(pathIndex, color = "green") {
  const path = wirePaths[pathIndex];
  if (!path) return;

  const length = path.getTotalLength();
  const duration = 380;
  const start = performance.now();

  wirePulseEl.classList.toggle("blue", color === "blue");
  wirePulseEl.style.opacity = "1";

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const point = path.getPointAtLength(length * progress);
    wirePulseEl.setAttribute("cx", point.x);
    wirePulseEl.setAttribute("cy", point.y);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      wirePulseEl.style.opacity = "0";
    }
  }

  requestAnimationFrame(step);
}

function playWireEffect(pathIndex, color) {
  flashWires(color === "blue" ? "flash-blue" : "flash-green");
  highlightPath(pathIndex, color);
  animatePulseAlongPath(pathIndex, color);
}

function maybeResetSwitches() {
  const allOn = state.switchStates.every(value => value === 1);
  if (!allOn) return;

  setTimeout(() => {
    state.switchStates = new Array(14).fill(0);
    addConsoleMessage("Binary field recycled. Switches reset.");
    saveState();
    render();
  }, 450);
}

function playRandomSfx() {
  if (!state.sfxEnabled) return;

  const src = sfxTracks[Math.floor(Math.random() * sfxTracks.length)];
  const sfx = new Audio(src);
  sfx.volume = 0.22;
  sfx.play().catch(() => {});
}

function playNextMusicTrack() {
  if (!state.musicEnabled) return;

  let nextIndex = Math.floor(Math.random() * musicTracks.length);

  if (musicTracks.length > 1 && nextIndex === state.currentTrackIndex) {
    nextIndex = (nextIndex + 1) % musicTracks.length;
  }

  state.currentTrackIndex = nextIndex;
  musicAudio.src = musicTracks[nextIndex];
  musicAudio.play().catch(() => {});
  saveState();
}

musicAudio.addEventListener("ended", () => {
  playNextMusicTrack();
});

function startMusicIfNeeded() {
  if (!state.musicEnabled) return;
  if (!musicAudio.src) {
    playNextMusicTrack();
    return;
  }
  musicAudio.play().catch(() => {});
}

function stopMusic() {
  musicAudio.pause();
}

function checkAutoUnlock() {
  if (state.autoUnlocked) return;

  if (state.thoughts >= AUTO_UNLOCK_THOUGHTS) {
    state.autoUnlocked = true;
    addConsoleMessage("Auto Connection protocol initiated.");
    saveState();
    render();
    ensureAutoConnectionsRunning();
  }
}

function autoGenerateConnection() {
  const amount = getStageAutoMultiplier();
  state.connections += amount;
  revealMoreWires(1);

  const pathIndex = state.connections % wirePaths.length;
  playWireEffect(pathIndex, "green");

  saveState();
  render();
}

function ensureAutoConnectionsRunning() {
  if (!state.autoUnlocked || autoConnectionTimer) return;

  autoConnectionTimer = setInterval(() => {
    autoGenerateConnection();
  }, AUTO_CONNECTION_INTERVAL_MS);
}

function generateConnection() {
  state.connections += 1;
  revealMoreWires(1);

  const pathIndex = state.connections % wirePaths.length;

  addConsoleMessage("Connection generated.");
  playWireEffect(pathIndex, "green");
  flashButton(generateConnectionBtn);
  playRandomSfx();

  saveState();
  render();
}

function generateThought() {
  state.thoughts += 1;
  revealMoreWires(1);

  const randomThought = getRandomThoughtWord();
  const pathIndex = (state.thoughts + 2) % wirePaths.length;

  addConsoleMessage(`Thought generated: ${randomThought}`);
  highlightPath(pathIndex, "green");
  animatePulseAlongPath(pathIndex, "green");
  flashButton(generateThoughtBtn);
  playRandomSfx();

  checkAutoUnlock();

  saveState();
  render();
}

function generateNumber() {
  state.numbersGenerated += 1;
  revealMoreWires(1);

  const randomNumber = getRandomDigit();
  const pathIndex = (state.numbersGenerated + 5) % wirePaths.length;

  addConsoleMessage(`Number generated: ${randomNumber}`);
  highlightPath(pathIndex, "green");
  animatePulseAlongPath(pathIndex, "green");
  flashButton(generateNumberBtn);
  playRandomSfx();

  saveState();
  render();
}

function activateSwitch(index, button) {
  if (state.switchStates[index] === 1) return;

  state.switchStates[index] = 1;
  state.connections += 1;
  revealMoreWires(1);

  const pathIndex = index % wirePaths.length;

  addConsoleMessage(`Switch ${index + 1} activated.`);
  playWireEffect(pathIndex, "blue");
  flashButton(button);
  playRandomSfx();

  maybeResetSwitches();
  saveState();
  render();
}

function toggleMusic() {
  state.musicEnabled = !state.musicEnabled;
  flashButton(musicToggleBtn);
  playRandomSfx();

  if (state.musicEnabled) {
    startMusicIfNeeded();
    addConsoleMessage("Music enabled.");
  } else {
    stopMusic();
    addConsoleMessage("Music disabled.");
  }

  saveState();
  render();
}

function toggleSfx() {
  state.sfxEnabled = !state.sfxEnabled;
  flashButton(sfxToggleBtn);

  if (state.sfxEnabled) {
    playRandomSfx();
    addConsoleMessage("Sound FX enabled.");
  } else {
    addConsoleMessage("Sound FX disabled.");
  }

  saveState();
  render();
}

function manualSave() {
  flashButton(saveBtn);
  playRandomSfx();
  saveState();
  addConsoleMessage("System state saved.");
}

function resetGame() {
  const confirmed = confirm("Reset Infinite Life Online progress?");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  musicAudio.pause();
  location.reload();
}

window.setTestLinks = function (targetLinks) {
  const safeLinks = Math.max(0, Math.floor(targetLinks));

  state.connections = safeLinks;
  state.thoughts = 0;
  state.numbersGenerated = 0;

  saveState();
  render();

  console.log(`Test links set to ${safeLinks.toLocaleString()}`);
};

window.setTestStage = function (stageNumber) {
  const stageTargets = {
    1: 1000,
    2: 10000,
    3: 100000,
    4: 1000000,
    5: 10000000
  };

  if (!stageTargets[stageNumber]) {
    console.warn("Use setTestStage(1), setTestStage(2), setTestStage(3), setTestStage(4), or setTestStage(5)");
    return;
  }

  window.setTestLinks(stageTargets[stageNumber]);
};

generateConnectionBtn.addEventListener("click", generateConnection);
generateThoughtBtn.addEventListener("click", generateThought);
generateNumberBtn.addEventListener("click", generateNumber);
musicToggleBtn.addEventListener("click", toggleMusic);
sfxToggleBtn.addEventListener("click", toggleSfx);
saveBtn.addEventListener("click", manualSave);
newGameBtn.addEventListener("click", resetGame);

switchButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    activateSwitch(index, button);
  });
});

loadState();
render();

if (state.autoUnlocked) {
  ensureAutoConnectionsRunning();
}

if (state.musicEnabled) {
  startMusicIfNeeded();
}