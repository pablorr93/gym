(function () {
  const {
    STORAGE_KEY,
    loadStorage,
    findGroup,
    findExercise,
    toggleGroupExpanded,
    toggleReadyToIncrease,
    saveGroup,
    saveExercise,
    applyNextWeight,
    moveExercise,
    moveGroup,
    deleteExercise,
    deleteHistoryEntry,
    deleteGroup,
    resetToSeed,
    parseWeight,
    clamp,
  } = window.GymData;

  const REST_TIMER_SLOTS_KEY = "gym_rest_timer_slots_v1";
  const OLD_REST_TIMERS_KEY = "gym_rest_timers_v1";
  const GITHUB_CLOUD_KEY = "gym_github_cloud_v1";
  const GITHUB_CLOUD_FILE = "gym-progress-cloud.json";
  const SPOTIFY_PLAYLIST_URI = "spotify:playlist:0Cs4HkwhV0jmmDBpnVYjJK";
  const SPOTIFY_PLAYLIST_URL = "https://open.spotify.com/playlist/0Cs4HkwhV0jmmDBpnVYjJK?si=f13c0fa115ea4cdb";
  const AUTO_SCROLL_DEAD_ZONE_RATIO = 0.5;
  const AUTO_SCROLL_MAX_SPEED = 14;
  const DEFAULT_REST_TIMERS = [30, 60, 90, 120];
  const TIMER_FLASH_COUNT = 60;
  const TIMER_FLASH_DURATION_MS = 360;
  const TIMER_SOUND_VOLUME = 0.55;
  const TIMER_SOUND_REPEAT_DELAY_MS = 100;
  const TIMER_SOUND_SOURCES = [
    "./assets/sounds/timer-complete.mp3",
    "./assets/sounds/timer-complete.wav",
    "./assets/sounds/timer-complete.ogg",
    "./assets/sounds/timer.mp3",
    "./assets/sounds/timer.wav",
    "./assets/sounds/timer.ogg",
  ];

  const state = {
    currentTab: "routine",
    modal: null,
    storage: loadStorage(),
    restTimers: loadRestTimerSlots(),
    openGroupMenuId: null,
    draggingExerciseId: null,
    draggingGroupId: null,
    touchDrag: null,
    pendingTouchDrag: null,
    longPressTimer: null,
    autoScrollFrame: null,
    autoScrollSpeed: 0,
    autoScrollContainer: null,
    autoScrollPointerX: 0,
    autoScrollPointerY: 0,
    historyPressTimer: null,
    historyPressTarget: null,
    restTimerPressTimer: null,
    restTimerPressTarget: null,
    suppressTimerClickUntil: 0,
    suppressSpotifyClickUntil: 0,
    timerFlashTimeout: null,
    suppressClickUntil: 0,
    modalHistoryActive: false,
    cloudConfig: loadGithubCloudConfig(),
    tabScroll: {
      routine: { page: 0, hasSaved: false },
      progress: { page: 0, gain: 0, history: 0, hasSaved: false },
      settings: { page: 0, hasSaved: false },
    },
    restTimer: {
      duration: 0,
      remaining: 0,
      endsAt: 0,
      running: false,
      completed: false,
    },
  };

  const app = document.querySelector("#app");
  let restTimerInterval = null;
  let timerCompleteAudio = null;
  let timerSoundPrimed = false;
  let timerSoundActive = false;
  let timerSoundPlayCount = 0;
  let timerSoundRunId = 0;
  let timerSoundDelayTimeout = null;
  let timerAudioContext = null;
  let timerAlarmBuffer = null;
  let timerScheduledSource = null;
  let timerScheduledGain = null;
  let timerScheduledRunId = 0;

  if (!window.history.state?.gymApp) {
    window.history.replaceState({ gymApp: true }, "", window.location.href);
  }

  function render() {
    app.innerHTML = window.GymUI.renderApp(state);
  }

  function saveCurrentTabViewState() {
    const pageScroller = document.scrollingElement || document.documentElement;
    const current = state.currentTab;

    if (!state.tabScroll[current]) {
      return;
    }

    state.tabScroll[current] = {
      ...state.tabScroll[current],
      page: pageScroller.scrollTop,
      hasSaved: true,
    };

    if (current === "progress") {
      state.tabScroll.progress.gain = document.querySelector(".gain-chart")?.scrollTop || 0;
      state.tabScroll.progress.history = document.querySelector(".history-list")?.scrollTop || 0;
    }
  }

  function restoreCurrentTabViewState() {
    const saved = state.tabScroll[state.currentTab];
    if (!saved?.hasSaved) {
      return;
    }

    window.requestAnimationFrame(() => {
      const pageScroller = document.scrollingElement || document.documentElement;

      pageScroller.scrollTop = saved.page;
      if (state.currentTab === "progress") {
        const gainList = document.querySelector(".gain-chart");
        const historyList = document.querySelector(".history-list");
        if (gainList) {
          gainList.scrollTop = saved.gain || 0;
        }
        if (historyList) {
          historyList.scrollTop = saved.history || 0;
        }
      }
    });
  }

  function persist(storage) {
    state.storage = storage;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    render();
  }

  function persistSilently(storage) {
    state.storage = storage;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  }

  function expandGroupPath(storage, groupId) {
    const expandedIds = new Set();
    let group = findGroup(storage, groupId);

    while (group) {
      expandedIds.add(group.id);
      group = group.parentId ? findGroup(storage, group.parentId) : null;
    }

    if (!expandedIds.size) {
      return storage;
    }

    return {
      ...storage,
      groups: storage.groups.map((item) =>
        expandedIds.has(item.id) ? { ...item, isExpanded: true } : item,
      ),
    };
  }

  function focusExerciseCard(exerciseId) {
    const target = document.querySelector(`[data-drag-exercise-id="${exerciseId}"]`);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("is-focus-target");
    window.setTimeout(() => {
      target.classList.remove("is-focus-target");
    }, 1700);
  }

  function openModal(modal) {
    if (!state.modal && !state.modalHistoryActive) {
      window.history.pushState({ gymApp: true, modal: true }, "", window.location.href);
      state.modalHistoryActive = true;
    }
    state.modal = modal;
    render();
  }

  function closeModal(options = {}) {
    state.modal = null;
    if (state.modalHistoryActive && !options.fromHistory) {
      state.modalHistoryActive = false;
      window.history.back();
    } else if (options.fromHistory) {
      state.modalHistoryActive = false;
    }
    render();
  }

  function confirmAction(message) {
    return window.confirm(message);
  }

  function openSpotifyPlaylist() {
    if (isTimerAlarmActive()) {
      stopExpiredRestTimerAlarm();
      return;
    }

    let didLeavePage = false;
    const cancelFallback = () => {
      didLeavePage = true;
    };

    window.addEventListener("pagehide", cancelFallback, { once: true });
    window.addEventListener("blur", cancelFallback, { once: true });
    window.location.href = SPOTIFY_PLAYLIST_URI;

    window.setTimeout(() => {
      window.removeEventListener("pagehide", cancelFallback);
      window.removeEventListener("blur", cancelFallback);
      if (!didLeavePage) {
        window.open(SPOTIFY_PLAYLIST_URL, "_blank", "noopener,noreferrer");
      }
    }, 900);
  }

  function loadRestTimerSlots() {
    try {
      window.localStorage.removeItem(OLD_REST_TIMERS_KEY);
      const raw = window.localStorage.getItem(REST_TIMER_SLOTS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return normalizeRestTimerSlots(parsed);
    } catch (error) {
      return DEFAULT_REST_TIMERS;
    }
  }

  function saveRestTimerSlot(index, seconds) {
    const nextTimers = [...state.restTimers];
    nextTimers[index] = seconds;
    state.restTimers = normalizeRestTimerSlots(nextTimers);
    window.localStorage.setItem(REST_TIMER_SLOTS_KEY, JSON.stringify(state.restTimers));
    render();
  }

  function normalizeRestTimerSlots(timers) {
    const source = Array.isArray(timers) && timers.length ? timers : DEFAULT_REST_TIMERS;
    return DEFAULT_REST_TIMERS.map((fallback, index) => {
      const seconds = Math.floor(Number(source[index]) || 0);
      return seconds > 0 && seconds <= 5999 ? seconds : fallback;
    });
  }

  function loadGithubCloudConfig() {
    try {
      const raw = window.localStorage.getItem(GITHUB_CLOUD_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        owner: String(parsed.owner || ""),
        repo: String(parsed.repo || ""),
        branch: String(parsed.branch || "main"),
        path: String(parsed.path || "gym-progress"),
        token: String(parsed.token || ""),
      };
    } catch (error) {
      return { owner: "", repo: "", branch: "main", path: "gym-progress", token: "" };
    }
  }

  function saveGithubCloudConfig(config) {
    state.cloudConfig = {
      owner: config.owner.trim(),
      repo: config.repo.trim(),
      branch: config.branch.trim() || "main",
      path: normalizeGithubPath(config.path),
      token: config.token.trim(),
    };
    window.localStorage.setItem(GITHUB_CLOUD_KEY, JSON.stringify(state.cloudConfig));
  }

  function normalizeGithubPath(path) {
    return String(path || "gym-progress")
      .trim()
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/+/g, "/");
  }

  function githubCloudReady() {
    const { owner, repo, branch, path, token } = state.cloudConfig;
    return Boolean(owner && repo && branch && path && token);
  }

  function githubCloudApiUrl() {
    const { owner, repo, path } = state.cloudConfig;
    const filePath = `${normalizeGithubPath(path)}/${GITHUB_CLOUD_FILE}`;
    const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");
    return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
  }

  function textToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }

  function base64ToText(base64) {
    const binary = window.atob(base64.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  async function githubRequest(url, options = {}) {
    const response = await window.fetch(url, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${state.cloudConfig.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {}),
      },
    });

    if (!response.ok && response.status !== 404) {
      const details = await response.text();
      throw new Error(details || `GitHub respondio con estado ${response.status}.`);
    }

    return response;
  }

  function cloudExportPayload() {
    return {
      app: "gym-progress-web",
      version: 1,
      exportedAt: new Date().toISOString(),
      storage: state.storage,
      restTimers: state.restTimers,
    };
  }

  async function saveCloudBackup() {
    if (!githubCloudReady()) {
      window.alert("Configura primero la carpeta de GitHub.");
      openModal({ type: "cloud-settings" });
      return;
    }

    const url = `${githubCloudApiUrl()}?ref=${encodeURIComponent(state.cloudConfig.branch)}`;
    const existing = await githubRequest(url);
    const existingJson = existing.status === 404 ? null : await existing.json();
    const body = {
      message: "Guardar copia de Gym Progress",
      branch: state.cloudConfig.branch,
      content: textToBase64(JSON.stringify(cloudExportPayload(), null, 2)),
      ...(existingJson?.sha ? { sha: existingJson.sha } : {}),
    };

    await githubRequest(githubCloudApiUrl(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    window.alert("Datos guardados en GitHub.");
  }

  async function loadCloudBackup() {
    if (!githubCloudReady()) {
      window.alert("Configura primero la carpeta de GitHub.");
      openModal({ type: "cloud-settings" });
      return;
    }

    if (!confirmAction("Se cargara la copia de GitHub y sustituira los datos locales actuales. Continuar?")) {
      return;
    }

    const response = await githubRequest(`${githubCloudApiUrl()}?ref=${encodeURIComponent(state.cloudConfig.branch)}`);
    if (response.status === 404) {
      window.alert("No se encontro ninguna copia en esa carpeta.");
      return;
    }

    const file = await response.json();
    const payload = JSON.parse(base64ToText(file.content || ""));
    if (!payload.storage || !Array.isArray(payload.storage.groups) || !Array.isArray(payload.storage.exercises)) {
      window.alert("El archivo de GitHub no parece ser una copia valida de Gym Progress.");
      return;
    }

    state.storage = payload.storage;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.storage));
    if (Array.isArray(payload.restTimers)) {
      state.restTimers = normalizeRestTimerSlots(payload.restTimers);
      window.localStorage.setItem(REST_TIMER_SLOTS_KEY, JSON.stringify(state.restTimers));
    }
    render();
    window.alert("Datos cargados desde GitHub.");
  }

  function parseTimerInput(value) {
    const normalized = String(value || "").trim().replace(",", ":");
    if (!normalized) {
      return null;
    }

    if (normalized.includes(":")) {
      const parts = normalized.split(":").map((part) => Number(part));
      if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part) || part < 0)) {
        return null;
      }
      const [minutes, seconds] = parts;
      if (seconds >= 60) {
        return null;
      }
      return Math.floor(minutes * 60 + seconds);
    }

    const seconds = Number(normalized);
    return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : null;
  }

  function startRestTimer(seconds) {
    const duration = Math.max(1, Math.floor(Number(seconds) || 0));
    if ((state.restTimer.running || state.restTimer.completed) && state.restTimer.duration === duration) {
      stopRestTimer();
      return;
    }

    stopTimerFlash({ render: false });
    primeTimerCompleteSound();
    state.restTimer = {
      duration,
      remaining: duration,
      endsAt: Date.now() + duration * 1000,
      running: true,
      completed: false,
    };
    prepareScheduledTimerAlarm();
    ensureRestTimerInterval();
    render();
  }

  function stopRestTimer() {
    stopTimerFlash({ render: false, resetCompleted: false });
    state.restTimer = {
      duration: 0,
      remaining: 0,
      endsAt: 0,
      running: false,
      completed: false,
    };
    clearRestTimerInterval();
    render();
  }

  function ensureRestTimerInterval() {
    if (restTimerInterval) {
      return;
    }

    restTimerInterval = window.setInterval(updateRestTimer, 250);
  }

  function updateRestTimer() {
    if (!state.restTimer.running) {
      clearRestTimerInterval();
      return;
    }

    const remaining = Math.max(0, Math.ceil((state.restTimer.endsAt - Date.now()) / 1000));
    if (remaining === state.restTimer.remaining) {
      return;
    }

    state.restTimer.remaining = remaining;

    if (remaining <= 0) {
      state.restTimer.running = false;
      state.restTimer.completed = true;
      clearRestTimerInterval();
      triggerRestTimerComplete();
    }

    render();
  }

  function updateRestTimerFromLifecycle() {
    if (!state.restTimer.running) {
      return;
    }

    updateRestTimer();
  }

  function triggerRestTimerComplete() {
    stopTimerFlash({ render: false, resetCompleted: false });
    document.body.classList.remove("timer-complete-flash");
    window.requestAnimationFrame(() => {
      document.body.classList.add("timer-complete-flash");
      state.timerFlashTimeout = window.setTimeout(stopTimerFlash, TIMER_FLASH_COUNT * TIMER_FLASH_DURATION_MS);
    });
    playTimerCompleteSound();
  }

  function getTimerCompleteAudio() {
    if (timerCompleteAudio) {
      return timerCompleteAudio;
    }

    timerCompleteAudio = new Audio();
    timerCompleteAudio.preload = "auto";
    TIMER_SOUND_SOURCES.forEach((src) => {
      const source = document.createElement("source");
      source.src = src;
      timerCompleteAudio.appendChild(source);
    });
    timerCompleteAudio.addEventListener("ended", handleTimerSoundEnded);
    return timerCompleteAudio;
  }

  function primeTimerCompleteSound() {
    if (timerSoundPrimed) {
      return;
    }

    const audio = getTimerCompleteAudio();
    audio.muted = true;
    audio.volume = 0;
    const promise = audio.play();
    if (!promise) {
        timerSoundPrimed = true;
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        audio.volume = TIMER_SOUND_VOLUME;
      return;
    }

    promise
      .then(() => {
        timerSoundPrimed = true;
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        audio.volume = TIMER_SOUND_VOLUME;
      })
      .catch(() => {
        audio.muted = false;
        audio.volume = TIMER_SOUND_VOLUME;
      });
  }

  function getTimerAudioContext() {
    if (timerAudioContext) {
      return timerAudioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    timerAudioContext = new AudioContextClass();
    return timerAudioContext;
  }

  async function loadTimerAlarmBuffer(audioContext) {
    if (timerAlarmBuffer) {
      return timerAlarmBuffer;
    }

    for (const src of TIMER_SOUND_SOURCES) {
      try {
        const response = await fetch(src);
        if (!response.ok) {
          continue;
        }
        const audioData = await response.arrayBuffer();
        timerAlarmBuffer = await audioContext.decodeAudioData(audioData);
        return timerAlarmBuffer;
      } catch (error) {
        // Try the next supported source format.
      }
    }

    return null;
  }

  function prepareScheduledTimerAlarm() {
    stopScheduledTimerAlarm();
    const audioContext = getTimerAudioContext();
    if (!audioContext || !state.restTimer.running || !state.restTimer.endsAt) {
      return;
    }

    const runId = ++timerScheduledRunId;
    const timerEndsAt = state.restTimer.endsAt;
    const resumePromise = audioContext.state === "suspended" ? audioContext.resume() : Promise.resolve();

    resumePromise
      .then(() => loadTimerAlarmBuffer(audioContext))
      .then((buffer) => {
        if (
          !buffer ||
          runId !== timerScheduledRunId ||
          !state.restTimer.running ||
          state.restTimer.endsAt !== timerEndsAt
        ) {
          return;
        }

        const delaySeconds = Math.max(0, (timerEndsAt - Date.now()) / 1000);
        const source = audioContext.createBufferSource();
        const gain = audioContext.createGain();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = TIMER_SOUND_VOLUME;
        source.connect(gain);
        gain.connect(audioContext.destination);
        source.onended = () => {
          if (timerScheduledSource === source) {
            timerScheduledSource = null;
            timerScheduledGain = null;
          }
        };
        timerScheduledSource = source;
        timerScheduledGain = gain;
        source.start(audioContext.currentTime + delaySeconds);
      })
      .catch(() => {
        // The regular HTML audio fallback still runs when the timer completes.
      });
  }

  function stopScheduledTimerAlarm() {
    timerScheduledRunId += 1;
    const source = timerScheduledSource;
    timerScheduledSource = null;
    timerScheduledGain = null;
    if (!source) {
      return;
    }

    source.onended = null;
    try {
      source.stop();
    } catch (error) {
      // Already stopped or not started yet.
    }
  }

  function playTimerCompleteSound() {
    timerSoundRunId += 1;
    timerSoundPlayCount = 0;
    timerSoundActive = true;
    if (timerScheduledSource) {
      if (!timerAudioContext || timerAudioContext.state === "running") {
        return;
      }
      stopScheduledTimerAlarm();
    }
    playTimerSoundCycle(timerSoundRunId);
  }

  function handleTimerSoundEnded() {
    if (!timerSoundActive) {
      timerSoundActive = false;
      return;
    }

    const runId = timerSoundRunId;
    timerSoundDelayTimeout = window.setTimeout(() => {
      timerSoundDelayTimeout = null;
      playTimerSoundCycle(runId);
    }, TIMER_SOUND_REPEAT_DELAY_MS);
  }

  function playTimerSoundCycle(runId) {
    if (!timerSoundActive || runId !== timerSoundRunId) {
      return;
    }

    const audio = getTimerCompleteAudio();
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    audio.volume = TIMER_SOUND_VOLUME;
    timerSoundPlayCount += 1;
    const promise = audio.play();
    if (promise) {
      promise.catch(() => {
        timerSoundActive = false;
      });
    }
  }

  function stopTimerCompleteSound() {
    timerSoundActive = false;
    timerSoundRunId += 1;
    timerSoundPlayCount = 0;
    stopScheduledTimerAlarm();
    if (timerSoundDelayTimeout) {
      window.clearTimeout(timerSoundDelayTimeout);
      timerSoundDelayTimeout = null;
    }
    if (!timerCompleteAudio) {
      return;
    }

    const audio = timerCompleteAudio;
    timerCompleteAudio = null;
    timerSoundPrimed = false;
    audio.removeEventListener("ended", handleTimerSoundEnded);
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch (error) {
      // Some mobile browsers reject seeking while releasing the media session.
    }
    audio.removeAttribute("src");
    while (audio.firstChild) {
      audio.removeChild(audio.firstChild);
    }
    audio.load();
  }

  function isTimerAlarmActive() {
    return (
      timerSoundActive ||
      state.restTimer.completed ||
      (state.restTimer.running && state.restTimer.endsAt > 0 && Date.now() >= state.restTimer.endsAt)
    );
  }

  function stopExpiredRestTimerAlarm() {
    if (state.restTimer.running && state.restTimer.endsAt > 0 && Date.now() >= state.restTimer.endsAt) {
      state.restTimer.running = false;
      state.restTimer.completed = true;
      state.restTimer.remaining = 0;
      clearRestTimerInterval();
    }

    stopTimerFlash();
  }

  function stopTimerFlash(options = {}) {
    const shouldResetCompleted = options.resetCompleted !== false;
    const shouldRender = options.render !== false;
    const hasFinishedTimer =
      !state.restTimer.running && state.restTimer.duration > 0 && (state.restTimer.completed || state.restTimer.remaining <= 0);

    document.body.classList.remove("timer-complete-flash");
    stopTimerCompleteSound();
    if (state.timerFlashTimeout) {
      window.clearTimeout(state.timerFlashTimeout);
      state.timerFlashTimeout = null;
    }

    if (shouldResetCompleted && hasFinishedTimer) {
      state.restTimer = {
        duration: 0,
        remaining: 0,
        endsAt: 0,
        running: false,
        completed: false,
      };
      if (shouldRender) {
        render();
      }
    }
  }

  function clearRestTimerInterval() {
    if (!restTimerInterval) {
      return;
    }

    window.clearInterval(restTimerInterval);
    restTimerInterval = null;
  }

  function clearRestTimerPressState() {
    if (state.restTimerPressTimer) {
      window.clearTimeout(state.restTimerPressTimer);
      state.restTimerPressTimer = null;
    }
    state.restTimerPressTarget = null;
  }

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      state.storage = loadStorage();
      render();
    }
  });

  window.addEventListener("popstate", () => {
    if (state.modal) {
      closeModal({ fromHistory: true });
    }
  });

  document.addEventListener("click", (event) => {
    if (Date.now() < state.suppressClickUntil && event.target.closest(".exercise-card, .group-shell, .history-entry")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) {
      stopTimerFlash();
      const shouldCloseMenu = state.openGroupMenuId != null;
      state.openGroupMenuId = null;
      if (event.target.matches("[data-overlay-close='true']")) {
        closeModal();
      } else if (shouldCloseMenu) {
        render();
      }
      return;
    }

    const { action } = actionEl.dataset;

    switch (action) {
      case "switch-tab": {
        const nextTab = actionEl.dataset.tab;
        if (nextTab === state.currentTab) {
          return;
        }
        saveCurrentTabViewState();
        state.currentTab = nextTab;
        state.openGroupMenuId = null;
        render();
        restoreCurrentTabViewState();
        break;
      }
      case "focus-routine-exercise": {
        event.stopPropagation();
        const exercise = findExercise(state.storage, actionEl.dataset.exerciseId);
        if (!exercise) {
          return;
        }
        saveCurrentTabViewState();
        state.currentTab = "routine";
        state.modal = null;
        state.openGroupMenuId = null;
        persistSilently(expandGroupPath(state.storage, exercise.groupId));
        render();
        window.setTimeout(() => focusExerciseCard(exercise.id), 80);
        break;
      }
      case "toggle-group":
        state.openGroupMenuId = null;
        persist(toggleGroupExpanded(state.storage, actionEl.dataset.groupId));
        break;
      case "toggle-group-menu":
        event.stopPropagation();
        state.openGroupMenuId = state.openGroupMenuId === actionEl.dataset.groupId ? null : actionEl.dataset.groupId;
        render();
        break;
      case "toggle-ready":
        event.stopPropagation();
        persist(toggleReadyToIncrease(state.storage, actionEl.dataset.exerciseId));
        break;
      case "apply-next-direct": {
        event.stopPropagation();
        const exercise = findExercise(state.storage, actionEl.dataset.exerciseId);
        if (!exercise) {
          return;
        }
        const increment = Math.max(0, Number(exercise.nextKg) - Number(exercise.currentKg)) || 2.5;
        persist(applyNextWeight(state.storage, exercise.id, Number(exercise.nextKg) + increment));
        break;
      }
      case "start-rest-timer":
        event.stopPropagation();
        if (Date.now() < state.suppressTimerClickUntil) {
          return;
        }
        startRestTimer(actionEl.dataset.seconds);
        break;
      case "stop-rest-timer":
        event.stopPropagation();
        stopRestTimer();
        break;
      case "open-quick-create":
        state.openGroupMenuId = null;
        openModal({ type: "quick-create" });
        break;
      case "quick-create-group":
        state.openGroupMenuId = null;
        openModal({ type: "group-editor", groupId: null, parentId: null });
        break;
      case "quick-create-exercise":
        state.openGroupMenuId = null;
        openModal({ type: "exercise-editor", exerciseId: null, initialGroupId: null });
        break;
      case "open-group-editor":
        state.openGroupMenuId = null;
        openModal({
          type: "group-editor",
          groupId: actionEl.dataset.groupId || null,
          parentId: actionEl.dataset.parentId || null,
        });
        break;
      case "open-exercise-editor":
        state.openGroupMenuId = null;
        openModal({
          type: "exercise-editor",
          exerciseId: actionEl.dataset.exerciseId || null,
          initialGroupId: actionEl.dataset.groupId || null,
        });
        break;
      case "open-apply-next":
        state.openGroupMenuId = null;
        openModal({ type: "apply-next", exerciseId: actionEl.dataset.exerciseId });
        break;
      case "open-cloud-settings":
        state.openGroupMenuId = null;
        openModal({ type: "cloud-settings" });
        break;
      case "cloud-save":
        event.stopPropagation();
        saveCloudBackup().catch((error) => {
          window.alert(`No se pudo guardar en GitHub: ${error.message}`);
        });
        break;
      case "cloud-load":
        event.stopPropagation();
        loadCloudBackup().catch((error) => {
          window.alert(`No se pudo cargar desde GitHub: ${error.message}`);
        });
        break;
      case "open-spotify-playlist":
        if (Date.now() < state.suppressSpotifyClickUntil || isTimerAlarmActive()) {
          event.preventDefault();
          event.stopPropagation();
          stopExpiredRestTimerAlarm();
        } else if (actionEl.tagName.toLowerCase() !== "a") {
          event.preventDefault();
          event.stopPropagation();
          openSpotifyPlaylist();
        }
        break;
      case "delete-exercise":
        if (confirmAction("Se eliminara el ejercicio y todo su historial. Quieres continuar?")) {
          const nextStorage = deleteExercise(state.storage, actionEl.dataset.exerciseId);
          state.openGroupMenuId = null;
          closeModal();
          persist(nextStorage);
        }
        break;
      case "delete-group":
        if (confirmAction("Se eliminara el grupo, sus subgrupos, ejercicios e historial asociado. Continuar?")) {
          const nextStorage = deleteGroup(state.storage, actionEl.dataset.groupId);
          state.openGroupMenuId = null;
          closeModal();
          persist(nextStorage);
        }
        break;
      case "reset-seed":
        if (confirmAction("Se restaurara la plantilla inicial de la rutina. Continuar?")) {
          const nextStorage = resetToSeed();
          state.openGroupMenuId = null;
          closeModal();
          persist(nextStorage);
        }
        break;
      case "close-modal":
        closeModal();
        break;
      default:
        break;
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    event.preventDefault();

    switch (form.dataset.form) {
      case "group-editor": {
        const name = form.elements.name.value.trim();
        if (!name) {
          window.alert("Escribe un nombre para el grupo.");
          return;
        }
        const currentGroup = state.modal.groupId ? findGroup(state.storage, state.modal.groupId) : null;
        persist(
          saveGroup(state.storage, {
            id: state.modal.groupId || null,
            name,
            parentId: currentGroup ? currentGroup.parentId : state.modal.parentId || null,
          }),
        );
        closeModal();
        break;
      }
      case "exercise-editor": {
        const initialKg = parseWeight(form.elements.initialKg.value);
        const currentKg = parseWeight(form.elements.currentKg.value);
        const nextIncrement = parseWeight(form.elements.nextKg.value);
        const payload = {
          id: state.modal.exerciseId || null,
          groupId: form.elements.groupId.value,
          name: form.elements.name.value.trim(),
          initialKg,
          currentKg,
          nextKg: currentKg != null && nextIncrement != null ? currentKg + nextIncrement : null,
          notes: form.elements.notes.value.trim(),
          readyToIncrease: form.elements.readyToIncrease.checked,
        };

        if (!payload.groupId) {
          window.alert("Selecciona un grupo.");
          return;
        }
        if (!payload.name) {
          window.alert("Escribe un nombre para el ejercicio.");
          return;
        }
        if (payload.initialKg == null || payload.currentKg == null || nextIncrement == null || payload.initialKg < 0 || payload.currentKg < 0 || nextIncrement < 0) {
          window.alert("Introduce un peso inicial, peso actual y subida validos.");
          return;
        }

        persist(saveExercise(state.storage, payload));
        closeModal();
        break;
      }
      case "apply-next": {
        const newIncrement = parseWeight(form.elements.newNextKg.value);
        const exercise = findExercise(state.storage, state.modal.exerciseId);
        if (!exercise || newIncrement == null || newIncrement < 0) {
          window.alert("Introduce una nueva subida valida.");
          return;
        }
        persist(applyNextWeight(state.storage, state.modal.exerciseId, Number(exercise.nextKg) + newIncrement));
        closeModal();
        break;
      }
      case "rest-timer-editor": {
        const seconds = parseTimerInput(form.elements.timerValue.value);
        const timerIndex = state.modal.timerIndex;
        if (!seconds) {
          window.alert("Escribe un tiempo valido, por ejemplo 00:45, 1:30 o 90.");
          return;
        }
        closeModal();
        saveRestTimerSlot(timerIndex, seconds);
        break;
      }
      case "cloud-settings": {
        const config = {
          owner: form.elements.owner.value,
          repo: form.elements.repo.value,
          branch: form.elements.branch.value,
          path: form.elements.path.value,
          token: form.elements.token.value,
        };
        if (!config.owner.trim() || !config.repo.trim() || !config.path.trim() || !config.token.trim()) {
          window.alert("Completa usuario, repositorio, carpeta y token.");
          return;
        }
        saveGithubCloudConfig(config);
        closeModal();
        render();
        break;
      }
      default:
        break;
    }
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    if (target.closest("button, input, select, textarea")) {
      return;
    }
    const openable = target.closest(".exercise-card-click");
    const groupHeader = target.closest(".group-header[data-action='toggle-group']");
    if (!openable && !groupHeader) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      (openable || groupHeader).click();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".rest-timer-button[data-action='start-rest-timer']")) {
      const hadActiveAlarm = isTimerAlarmActive();
      if (hadActiveAlarm) {
        stopExpiredRestTimerAlarm();
        if (event.target.closest("[data-action='open-spotify-playlist']")) {
          state.suppressSpotifyClickUntil = Date.now() + 900;
        }
      } else {
        stopTimerFlash();
      }
    }

    const timerButton = event.target.closest(".rest-timer-button[data-action='start-rest-timer']");
    if (!timerButton) {
      return;
    }

    const timerIndex = Number(timerButton.dataset.timerIndex);
    const seconds = Number(timerButton.dataset.seconds);
    state.restTimerPressTarget = { timerIndex, seconds };
    state.restTimerPressTimer = window.setTimeout(() => {
      state.suppressTimerClickUntil = Date.now() + 900;
      state.restTimerPressTimer = null;
      if ((state.restTimer.running || state.restTimer.completed) && state.restTimer.duration === seconds) {
        stopRestTimer();
      }
      state.openGroupMenuId = null;
      openModal({ type: "rest-timer-editor", timerIndex, seconds });
    }, 650);
  });

  document.addEventListener("pointerup", clearRestTimerPressState);
  document.addEventListener("pointercancel", clearRestTimerPressState);
  document.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".rest-timer-button[data-action='start-rest-timer']")) {
      event.preventDefault();
    }
  });

  document.addEventListener("dragstart", (event) => {
    const source = getPointerDragSource(event);
    if (!source) {
      return;
    }

    if (source.type === "exercise") {
      state.draggingExerciseId = source.id;
    } else {
      state.draggingGroupId = source.id;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", source.id);
    event.dataTransfer.setData("application/x-gym-drag-type", source.type);
    source.element.classList.add("is-dragging");
  });

  document.addEventListener("dragend", (event) => {
    event.target.closest("[data-drag-exercise-id]")?.classList.remove("is-dragging");
    event.target.closest("[data-drag-group-id]")?.classList.remove("is-dragging");
    stopAutoScrollLoop();
    clearDropHighlights();
    state.draggingExerciseId = null;
    state.draggingGroupId = null;
  });

  document.addEventListener("dragover", (event) => {
    if (!state.draggingExerciseId && !state.draggingGroupId) {
      return;
    }

    const placement = getActiveDropPlacement(event.clientX, event.clientY);
    if (!placement) {
      updateAutoScroll(event.clientY, event.clientX);
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    highlightDropPlacement(placement);
    updateAutoScroll(event.clientY, event.clientX);
  });

  document.addEventListener("dragleave", (event) => {
    const dropZone = event.target.closest("[data-drop-section], [data-group-list-parent], [data-drag-group-id]");
    if (!dropZone || (event.relatedTarget instanceof Node && dropZone.contains(event.relatedTarget))) {
      return;
    }

    clearDropHighlights();
  });

  document.addEventListener("drop", (event) => {
    const placement = getActiveDropPlacement(event.clientX, event.clientY);
    if (!placement) {
      return;
    }

    event.preventDefault();
    const type = event.dataTransfer.getData("application/x-gym-drag-type") || (state.draggingGroupId ? "group" : "exercise");
    const id = event.dataTransfer.getData("text/plain") || state.draggingExerciseId || state.draggingGroupId;
    stopAutoScrollLoop();
    clearDropHighlights();
    state.draggingExerciseId = null;
    state.draggingGroupId = null;
    applyDrop(type, id, placement);
  });

  document.addEventListener("touchstart", (event) => {
    const source = getPointerDragSource(event);
    if (!source) {
      return;
    }

    const touch = event.touches[0];
    clearLongPressTimer();
    const pending = {
      type: source.type,
      id: source.id,
      startX: touch.clientX,
      startY: touch.clientY,
      element: source.element,
    };
    state.pendingTouchDrag = pending;
    source.element.classList.add("is-touch-armed");
    state.longPressTimer = window.setTimeout(() => {
      if (state.pendingTouchDrag !== pending) {
        return;
      }
      if (pending.type === "exercise") {
        state.draggingExerciseId = pending.id;
      } else {
        state.draggingGroupId = pending.id;
      }
      state.touchDrag = {
        ...pending,
        x: pending.startX,
        y: pending.startY,
      };
      state.suppressClickUntil = Date.now() + 900;
      document.body.classList.add("is-touch-drag-active");
      pending.element.classList.remove("is-touch-armed");
      pending.element.classList.add("is-touch-dragging");
      updateAutoScroll(pending.startY, pending.startX);
      if (navigator.vibrate) {
        navigator.vibrate(18);
      }
    }, 500);
  }, { passive: false });

  document.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    if (!state.touchDrag) {
      if (state.pendingTouchDrag && movedPastThreshold(state.pendingTouchDrag, touch)) {
        clearTouchDragState();
      }
      return;
    }

    event.preventDefault();
    state.touchDrag.x = touch.clientX;
    state.touchDrag.y = touch.clientY;
    highlightDropPlacement(getActiveDropPlacement(touch.clientX, touch.clientY));
    updateAutoScroll(touch.clientY, touch.clientX);
  }, { passive: false });

  document.addEventListener("touchend", () => {
    if (!state.touchDrag) {
      clearTouchDragState();
      return;
    }

    const { type, id, x, y } = state.touchDrag;
    const placement = getActiveDropPlacement(x, y);
    clearTouchDragState();
    state.suppressClickUntil = Date.now() + 900;
    applyDrop(type, id, placement);
  });

  document.addEventListener("touchcancel", clearTouchDragState);

  document.addEventListener("pointerdown", (event) => {
    const entry = event.target.closest("[data-history-entry-id]");
    if (!entry || event.target.closest("button, input, select, textarea")) {
      return;
    }

    clearHistoryPressState();
    state.historyPressTarget = {
      entryId: entry.dataset.historyEntryId,
      startX: event.clientX,
      startY: event.clientY,
      entry,
    };
    entry.classList.add("is-pressing");
    state.historyPressTimer = window.setTimeout(() => {
      const entryId = state.historyPressTarget?.entryId;
      clearHistoryPressState();
      state.suppressClickUntil = Date.now() + 1200;
      if (entryId && confirmAction("Eliminar esta entrada del historial?")) {
        persist(deleteHistoryEntry(state.storage, entryId));
      }
      state.suppressClickUntil = Date.now() + 1200;
    }, 500);
  });

  document.addEventListener("pointermove", (event) => {
    const target = state.historyPressTarget;
    if (!target) {
      return;
    }

    if (Math.hypot(event.clientX - target.startX, event.clientY - target.startY) > 14) {
      clearHistoryPressState();
    }
  });

  document.addEventListener("pointerup", clearHistoryPressState);
  document.addEventListener("pointercancel", clearHistoryPressState);

  function getPointerDragSource(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest("button, input, select, textarea")) {
      return null;
    }

    const exerciseCard = target.closest("[data-drag-exercise-id]");
    if (exerciseCard) {
      return {
        type: "exercise",
        id: exerciseCard.dataset.dragExerciseId,
        element: exerciseCard,
      };
    }

    const groupShell = target.closest("[data-drag-group-id]");
    if (!groupShell) {
      return null;
    }

    return {
      type: "group",
      id: groupShell.dataset.dragGroupId,
      element: groupShell,
    };
  }

  function getActiveDropPlacement(x, y) {
    if (state.draggingGroupId || state.touchDrag?.type === "group") {
      return getGroupDropPlacement(x, y);
    }
    return getExerciseDropPlacement(x, y);
  }

  function getExerciseDropPlacement(x, y) {
    const element = document.elementFromPoint(x, y);
    const dropSection = element?.closest("[data-drop-section]");
    const activeExerciseId = state.draggingExerciseId || state.touchDrag?.id;
    if (dropSection) {
      const cards = [...dropSection.querySelectorAll("[data-drag-exercise-id]")]
        .filter((card) => card.dataset.dragExerciseId !== activeExerciseId);
      const beforeCard = cards.find((card) => {
        const rect = card.getBoundingClientRect();
        return y < rect.top + rect.height / 2;
      });

      return {
        type: "exercise",
        section: dropSection,
        beforeCard,
        beforeExerciseId: beforeCard?.dataset.dragExerciseId || null,
        groupId: dropSection.dataset.dropGroupId,
        isSeparated: dropSection.dataset.dropSection === "separated",
      };
    }

    const groupShell = element?.closest("[data-drag-group-id]");
    const groupId = groupShell?.dataset.dragGroupId;
    if (!groupId) {
      return null;
    }

    return {
      type: "exercise",
      groupShell,
      groupId,
      isSeparated: false,
      beforeExerciseId: null,
      beforeCard: null,
    };
  }

  function getGroupDropPlacement(x, y) {
    const element = document.elementFromPoint(x, y);
    const activeGroupId = state.draggingGroupId || state.touchDrag?.id;
    const container = element?.closest("[data-group-list-parent]");
    if (!container || !activeGroupId) {
      return null;
    }

    const targetParentId = container.dataset.groupListParent || null;
    const descendants = new Set(collectGroupShellDescendantIds(activeGroupId));
    if (targetParentId === activeGroupId || descendants.has(targetParentId)) {
      return null;
    }

    const groupShells = [...container.children].filter(
      (child) =>
        child.matches?.("[data-drag-group-id]") &&
        child.dataset.dragGroupId !== activeGroupId &&
        !descendants.has(child.dataset.dragGroupId),
    );
    const beforeGroup = groupShells.find((shell) => {
      const rect = shell.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });

    return {
      type: "group",
      container,
      targetParentId,
      beforeGroup,
      afterGroup: beforeGroup ? null : groupShells[groupShells.length - 1] || null,
      beforeGroupId: beforeGroup?.dataset.dragGroupId || null,
    };
  }

  function collectGroupShellDescendantIds(groupId) {
    const group = findGroup(state.storage, groupId);
    if (!group) {
      return [];
    }
    const children = state.storage.groups.filter((item) => item.parentId === groupId);
    return children.flatMap((child) => [child.id, ...collectGroupShellDescendantIds(child.id)]);
  }

  function highlightDropPlacement(placement) {
    clearDropHighlights();
    if (!placement) {
      return;
    }

    if (placement.type === "group") {
      placement.container.classList.add("is-over");
      if (placement.beforeGroup) {
        placement.beforeGroup.classList.add("is-group-drop-before");
      } else if (placement.afterGroup) {
        placement.afterGroup.classList.add("is-group-drop-after");
      } else {
        placement.container.classList.add("is-group-drop-end");
      }
      return;
    }

    if (placement.section) {
      placement.section.classList.add("is-over");
    }
    if (placement.groupShell) {
      placement.groupShell.classList.add("is-exercise-drop-target");
    }
    if (placement.beforeCard) {
      placement.beforeCard.classList.add("is-drop-before");
    }
  }

  function clearDropHighlights() {
    document.querySelectorAll(".exercise-drop-section.is-over").forEach((section) => section.classList.remove("is-over"));
    document.querySelectorAll(".child-group-list.is-over, .section-stack.is-over").forEach((section) => {
      section.classList.remove("is-over", "is-group-drop-end");
    });
    document.querySelectorAll(".exercise-card.is-drop-before").forEach((card) => card.classList.remove("is-drop-before"));
    document.querySelectorAll(".group-shell.is-group-drop-before, .group-shell.is-group-drop-after, .group-shell.is-exercise-drop-target").forEach((group) => {
      group.classList.remove("is-group-drop-before", "is-group-drop-after", "is-exercise-drop-target");
    });
  }

  function applyDrop(type, id, placement) {
    if (!id || !placement || placement.type !== type) {
      return;
    }

    if (type === "group") {
      persist(moveGroup(state.storage, id, placement.targetParentId, placement.beforeGroupId));
      return;
    }

    persist(moveExercise(state.storage, id, placement.groupId, placement.isSeparated, placement.beforeExerciseId));
  }

  function clearLongPressTimer() {
    if (state.longPressTimer) {
      window.clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
  }

  function clearTouchDragState() {
    clearLongPressTimer();
    stopAutoScrollLoop();
    document.querySelectorAll(".exercise-card.is-touch-armed, .exercise-card.is-touch-dragging").forEach((card) => {
      card.classList.remove("is-touch-armed", "is-touch-dragging");
    });
    document.querySelectorAll(".group-shell.is-touch-armed, .group-shell.is-touch-dragging").forEach((group) => {
      group.classList.remove("is-touch-armed", "is-touch-dragging");
    });
    document.body.classList.remove("is-touch-drag-active");
    clearDropHighlights();
    state.touchDrag = null;
    state.pendingTouchDrag = null;
    state.draggingExerciseId = null;
    state.draggingGroupId = null;
  }

  function clearHistoryPressState() {
    if (state.historyPressTimer) {
      window.clearTimeout(state.historyPressTimer);
      state.historyPressTimer = null;
    }
    state.historyPressTarget?.entry?.classList.remove("is-pressing");
    state.historyPressTarget = null;
  }

  function movedPastThreshold(pending, touch) {
    return Math.hypot(touch.clientX - pending.startX, touch.clientY - pending.startY) > 14;
  }

  function updateAutoScroll(pointerY, pointerX = window.innerWidth / 2) {
    state.autoScrollPointerX = pointerX;
    state.autoScrollPointerY = pointerY;
    state.autoScrollContainer = findAutoScrollContainer(pointerX, pointerY);
    state.autoScrollSpeed = calculateAutoScrollSpeed(state.autoScrollContainer, pointerY);

    if (state.autoScrollSpeed === 0) {
      stopAutoScrollLoop();
      return;
    }

    startAutoScrollLoop();
  }

  function startAutoScrollLoop() {
    if (state.autoScrollFrame) {
      return;
    }

    const tick = () => {
      state.autoScrollFrame = null;
      if (!state.draggingExerciseId && !state.draggingGroupId && !state.touchDrag) {
        stopAutoScrollLoop();
        return;
      }

      if (state.autoScrollSpeed === 0 || !state.autoScrollContainer) {
        stopAutoScrollLoop();
        return;
      }

      const didScroll = applyAutoScroll();
      const placement = getActiveDropPlacement(state.autoScrollPointerX, state.autoScrollPointerY);
      highlightDropPlacement(placement);
      if (didScroll) {
        state.autoScrollSpeed = calculateAutoScrollSpeed(state.autoScrollContainer, state.autoScrollPointerY);
        state.autoScrollFrame = window.requestAnimationFrame(tick);
      } else {
        stopAutoScrollLoop();
      }
    };

    state.autoScrollFrame = window.requestAnimationFrame(tick);
  }

  function stopAutoScrollLoop() {
    if (state.autoScrollFrame) {
      window.cancelAnimationFrame(state.autoScrollFrame);
      state.autoScrollFrame = null;
    }
    state.autoScrollSpeed = 0;
    state.autoScrollContainer = null;
  }

  function findAutoScrollContainer(x, y) {
    let element = document.elementFromPoint(x, y);
    while (element && element !== document.documentElement) {
      if (isScrollableY(element)) {
        return element;
      }
      element = element.parentElement;
    }

    return document.scrollingElement || document.documentElement;
  }

  function isScrollableY(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const overflowY = window.getComputedStyle(element).overflowY;
    return /(auto|scroll|overlay)/.test(overflowY) && element.scrollHeight > element.clientHeight + 1;
  }

  function calculateAutoScrollSpeed(container, pointerY) {
    if (!container) {
      return 0;
    }

    const bounds = getScrollContainerBounds(container);
    const activationSize = bounds.height * ((1 - AUTO_SCROLL_DEAD_ZONE_RATIO) / 2);
    if (activationSize <= 0) {
      return 0;
    }

    const topActivationEnd = bounds.top + activationSize;
    const bottomActivationStart = bounds.bottom - activationSize;
    let speed = 0;

    if (pointerY < topActivationEnd) {
      const ratio = clamp((topActivationEnd - pointerY) / activationSize, 0, 1);
      speed = -AUTO_SCROLL_MAX_SPEED * Math.pow(ratio, 1.55);
    } else if (pointerY > bottomActivationStart) {
      const ratio = clamp((pointerY - bottomActivationStart) / activationSize, 0, 1);
      speed = AUTO_SCROLL_MAX_SPEED * Math.pow(ratio, 1.55);
    }

    if (!canScrollContainer(container, speed)) {
      return 0;
    }

    return Math.abs(speed) < 0.2 ? 0 : speed;
  }

  function getScrollContainerBounds(container) {
    if (isDocumentScroller(container)) {
      return { top: 0, bottom: window.innerHeight, height: window.innerHeight };
    }

    const rect = container.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: rect.height };
  }

  function isDocumentScroller(container) {
    return container === document.scrollingElement || container === document.documentElement || container === document.body;
  }

  function canScrollContainer(container, speed) {
    if (!speed) {
      return false;
    }

    const maxScroll = container.scrollHeight - container.clientHeight;
    if (speed < 0) {
      return container.scrollTop > 0;
    }
    return container.scrollTop < maxScroll;
  }

  function applyAutoScroll() {
    const container = state.autoScrollContainer;
    if (!container || !state.autoScrollSpeed) {
      return false;
    }

    const previousTop = container.scrollTop;
    container.scrollTop += state.autoScrollSpeed;
    return container.scrollTop !== previousTop;
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateRestTimerFromLifecycle();
    }
  });
  window.addEventListener("focus", updateRestTimerFromLifecycle);

  render();
})();
