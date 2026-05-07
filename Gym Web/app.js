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
    deleteExercise,
    deleteHistoryEntry,
    deleteGroup,
    resetToSeed,
    parseWeight,
  } = window.GymData;

  const state = {
    currentTab: "routine",
    modal: null,
    storage: loadStorage(),
    openGroupMenuId: null,
    draggingExerciseId: null,
    touchDrag: null,
    pendingTouchDrag: null,
    longPressTimer: null,
    historyPressTimer: null,
    historyPressTarget: null,
    suppressClickUntil: 0,
  };

  const app = document.querySelector("#app");

  function render() {
    app.innerHTML = window.GymUI.renderApp(state);
  }

  function persist(storage) {
    state.storage = storage;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    render();
  }

  function openModal(modal) {
    state.modal = modal;
    render();
  }

  function closeModal() {
    state.modal = null;
    render();
  }

  function confirmAction(message) {
    return window.confirm(message);
  }

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      state.storage = loadStorage();
      render();
    }
  });

  document.addEventListener("click", (event) => {
    if (Date.now() < state.suppressClickUntil && event.target.closest(".exercise-card")) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) {
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
      case "switch-tab":
        state.currentTab = actionEl.dataset.tab;
        state.openGroupMenuId = null;
        render();
        break;
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
      case "delete-exercise":
        if (confirmAction("Se eliminara el ejercicio y todo su historial. Quieres continuar?")) {
          state.modal = null;
          state.openGroupMenuId = null;
          persist(deleteExercise(state.storage, actionEl.dataset.exerciseId));
        }
        break;
      case "delete-group":
        if (confirmAction("Se eliminara el grupo, sus subgrupos, ejercicios e historial asociado. Continuar?")) {
          state.modal = null;
          state.openGroupMenuId = null;
          persist(deleteGroup(state.storage, actionEl.dataset.groupId));
        }
        break;
      case "reset-seed":
        if (confirmAction("Se restaurara la plantilla inicial de la rutina. Continuar?")) {
          state.modal = null;
          state.openGroupMenuId = null;
          persist(resetToSeed());
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
        const currentKg = parseWeight(form.elements.currentKg.value);
        const nextIncrement = parseWeight(form.elements.nextKg.value);
        const payload = {
          id: state.modal.exerciseId || null,
          groupId: form.elements.groupId.value,
          name: form.elements.name.value.trim(),
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
        if (payload.currentKg == null || nextIncrement == null || payload.currentKg < 0 || nextIncrement < 0) {
          window.alert("Introduce un peso actual y una subida validos.");
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

  document.addEventListener("dragstart", (event) => {
    const card = event.target.closest("[data-drag-exercise-id]");
    if (!card) {
      return;
    }

    state.draggingExerciseId = card.dataset.dragExerciseId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.draggingExerciseId);
    card.classList.add("is-dragging");
  });

  document.addEventListener("dragend", (event) => {
    const card = event.target.closest("[data-drag-exercise-id]");
    if (card) {
      card.classList.remove("is-dragging");
    }
    document.querySelectorAll(".exercise-drop-section.is-over").forEach((section) => section.classList.remove("is-over"));
    document.querySelectorAll(".exercise-card.is-drop-before").forEach((card) => card.classList.remove("is-drop-before"));
    state.draggingExerciseId = null;
  });

  document.addEventListener("dragover", (event) => {
    if (!state.draggingExerciseId) {
      return;
    }

    const placement = getDropPlacement(event.clientX, event.clientY);
    if (!placement) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    highlightDropPlacement(placement);
  });

  document.addEventListener("dragleave", (event) => {
    const dropSection = event.target.closest("[data-drop-section]");
    if (!dropSection || (event.relatedTarget instanceof Node && dropSection.contains(event.relatedTarget))) {
      return;
    }

    dropSection.classList.remove("is-over");
  });

  document.addEventListener("drop", (event) => {
    const placement = getDropPlacement(event.clientX, event.clientY);
    if (!placement) {
      return;
    }

    event.preventDefault();
    const exerciseId = event.dataTransfer.getData("text/plain") || state.draggingExerciseId;
    if (!exerciseId) {
      return;
    }

    state.draggingExerciseId = null;
    clearDropHighlights();
    persist(moveExercise(state.storage, exerciseId, placement.groupId, placement.isSeparated, placement.beforeExerciseId));
  });

  document.addEventListener("touchstart", (event) => {
    const card = event.target.closest("[data-drag-exercise-id]");
    if (!card || event.target.closest("button, input, select, textarea")) {
      return;
    }

    const touch = event.touches[0];
    clearLongPressTimer();
    const pending = {
      exerciseId: card.dataset.dragExerciseId,
      startX: touch.clientX,
      startY: touch.clientY,
      card,
    };
    state.pendingTouchDrag = pending;
    card.classList.add("is-touch-armed");
    state.longPressTimer = window.setTimeout(() => {
      if (state.pendingTouchDrag !== pending) {
        return;
      }
      state.draggingExerciseId = pending.exerciseId;
      state.touchDrag = {
        ...pending,
        x: pending.startX,
        y: pending.startY,
        card,
      };
      state.suppressClickUntil = Date.now() + 900;
      card.classList.remove("is-touch-armed");
      card.classList.add("is-touch-dragging");
      if (navigator.vibrate) {
        navigator.vibrate(18);
      }
    }, 500);
  }, { passive: true });

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
    const placement = getDropPlacement(touch.clientX, touch.clientY);
    highlightDropPlacement(placement);
    autoScrollForTouch(touch.clientY);
  }, { passive: false });

  document.addEventListener("touchend", () => {
    if (!state.touchDrag) {
      clearTouchDragState();
      return;
    }

    const { exerciseId, x, y } = state.touchDrag;
    const placement = getDropPlacement(x, y);
    clearTouchDragState();
    state.suppressClickUntil = Date.now() + 900;
    if (placement) {
      persist(moveExercise(state.storage, exerciseId, placement.groupId, placement.isSeparated, placement.beforeExerciseId));
    }
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
      if (entryId && confirmAction("Eliminar esta entrada del historial?")) {
        persist(deleteHistoryEntry(state.storage, entryId));
      }
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

  function getDropPlacement(x, y) {
    const element = document.elementFromPoint(x, y);
    const dropSection = element?.closest("[data-drop-section]");
    if (!dropSection) {
      return null;
    }

    const activeExerciseId = state.draggingExerciseId || state.touchDrag?.exerciseId;
    const cards = [...dropSection.querySelectorAll("[data-drag-exercise-id]")]
      .filter((card) => card.dataset.dragExerciseId !== activeExerciseId);
    const beforeCard = cards.find((card) => {
      const rect = card.getBoundingClientRect();
      return y < rect.top + rect.height / 2;
    });

    return {
      section: dropSection,
      beforeCard,
      beforeExerciseId: beforeCard?.dataset.dragExerciseId || null,
      groupId: dropSection.dataset.dropGroupId,
      isSeparated: dropSection.dataset.dropSection === "separated",
    };
  }

  function highlightDropPlacement(placement) {
    clearDropHighlights();
    if (!placement) {
      return;
    }
    placement.section.classList.add("is-over");
    if (placement.beforeCard) {
      placement.beforeCard.classList.add("is-drop-before");
    }
  }

  function clearDropHighlights() {
    document.querySelectorAll(".exercise-drop-section.is-over").forEach((section) => section.classList.remove("is-over"));
    document.querySelectorAll(".exercise-card.is-drop-before").forEach((card) => card.classList.remove("is-drop-before"));
  }

  function clearLongPressTimer() {
    if (state.longPressTimer) {
      window.clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
  }

  function clearTouchDragState() {
    clearLongPressTimer();
    document.querySelectorAll(".exercise-card.is-touch-armed, .exercise-card.is-touch-dragging").forEach((card) => {
      card.classList.remove("is-touch-armed", "is-touch-dragging");
    });
    clearDropHighlights();
    state.touchDrag = null;
    state.pendingTouchDrag = null;
    state.draggingExerciseId = null;
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

  function autoScrollForTouch(y) {
    const edge = 74;
    const step = 18;
    if (y < edge) {
      window.scrollBy({ top: -step, behavior: "auto" });
    } else if (y > window.innerHeight - edge) {
      window.scrollBy({ top: step, behavior: "auto" });
    }
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  render();
})();
