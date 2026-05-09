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
  } = window.GymData;

  const state = {
    currentTab: "routine",
    modal: null,
    storage: loadStorage(),
    openGroupMenuId: null,
    draggingExerciseId: null,
    draggingGroupId: null,
    touchDrag: null,
    pendingTouchDrag: null,
    longPressTimer: null,
    autoScrollFrame: null,
    historyPressTimer: null,
    historyPressTarget: null,
    suppressClickUntil: 0,
    modalHistoryActive: false,
  };

  const app = document.querySelector("#app");

  if (!window.history.state?.gymApp) {
    window.history.replaceState({ gymApp: true }, "", window.location.href);
  }

  function render() {
    app.innerHTML = window.GymUI.renderApp(state);
  }

  function persist(storage) {
    state.storage = storage;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
    render();
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
    if (Date.now() < state.suppressClickUntil && event.target.closest(".exercise-card, .group-shell")) {
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
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    highlightDropPlacement(placement);
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
      scheduleTouchAutoScroll();
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
    scheduleTouchAutoScroll();
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
    document.querySelectorAll(".child-group-list.is-over, .section-stack.is-over").forEach((section) => section.classList.remove("is-over"));
    document.querySelectorAll(".exercise-card.is-drop-before").forEach((card) => card.classList.remove("is-drop-before"));
    document.querySelectorAll(".group-shell.is-group-drop-before, .group-shell.is-exercise-drop-target").forEach((group) => {
      group.classList.remove("is-group-drop-before", "is-exercise-drop-target");
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
    clearTouchAutoScroll();
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

  function autoScrollForTouch(y) {
    const edge = 92;
    const maxStep = 18;
    let delta = 0;
    if (y < edge) {
      delta = -Math.max(6, Math.round(((edge - y) / edge) * maxStep));
    } else if (y > window.innerHeight - edge) {
      delta = Math.max(6, Math.round(((y - (window.innerHeight - edge)) / edge) * maxStep));
    }

    if (!delta) {
      return false;
    }

    const scroller = document.scrollingElement || document.documentElement;
    scroller.scrollTop += delta;
    return true;
  }

  function scheduleTouchAutoScroll() {
    if (state.autoScrollFrame || !state.touchDrag) {
      return;
    }

    const tick = () => {
      state.autoScrollFrame = null;
      if (!state.touchDrag) {
        return;
      }

      const didScroll = autoScrollForTouch(state.touchDrag.y);
      highlightDropPlacement(getActiveDropPlacement(state.touchDrag.x, state.touchDrag.y));
      if (didScroll) {
        state.autoScrollFrame = window.requestAnimationFrame(tick);
      }
    };

    state.autoScrollFrame = window.requestAnimationFrame(tick);
  }

  function clearTouchAutoScroll() {
    if (state.autoScrollFrame) {
      window.cancelAnimationFrame(state.autoScrollFrame);
      state.autoScrollFrame = null;
    }
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  render();
})();
