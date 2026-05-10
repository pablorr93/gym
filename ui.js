(function () {
  const {
    rootGroups,
    childGroups,
    exercisesForGroup,
    activeExercisesForGroup,
    separatedExercisesForGroup,
    entriesForExercise,
    findGroup,
    findExercise,
    groupLabel,
    totalTrackedKg,
    completionRatio,
    recentEntries,
    isWeightHistoryEntry,
    formatKg,
    formatKgCompact,
    formatDate,
    formatDateTime,
    clamp,
    uniqueIndexes,
    suggestNextWeight,
    escapeHtml,
    escapeAttribute,
  } = window.GymData;

  function renderApp(state) {
    return `
      <div class="app-shell">
        <main class="page">${renderCurrentTab(state)}</main>
        ${state.currentTab === "routine" ? renderFab() : ""}
        ${renderBottomNav(state.currentTab)}
        ${renderModal(state)}
      </div>
    `;
  }

  function renderCurrentTab(state) {
    switch (state.currentTab) {
      case "progress":
        return renderProgressPage(state);
      case "settings":
        return renderSettingsPage();
      case "routine":
      default:
        return renderRoutinePage(state);
    }
  }

  function renderRoutinePage(state) {
    const roots = rootGroups(state.storage);

    return `
      <section class="hero routine-hero">
        <div>
          <div class="routine-lockup">
            <span class="eyebrow">Gym Progress</span>
            <h1 class="sr-only">Rutina</h1>
            <img class="routine-logo" src="./assets/prr-header.png" alt="PRR" />
          </div>
        </div>
        <article class="glass-card" style="--glow: rgba(139, 232, 78, 0.12);">
          <div class="card-body">
            ${renderRestTimers(state)}
          </div>
        </article>
      </section>

      <section class="section-stack" data-group-list-parent="">
        ${roots.length ? roots.map((group) => renderGroupSection(state, group, 0)).join("") : renderEmptyState("Todavia no hay grupos en tu rutina.", "Usa el boton Anadir para crear el primer bloque muscular.")}
      </section>
    `;
  }

  function renderProgressPage(state) {
    return `
      <section class="hero progress-hero">
        <div>
          <span class="eyebrow">Progreso</span>
          <h1 class="hero-title">Historial & Progreso</h1>
        </div>
      </section>

      <section class="progress-grid">
        <div>
          ${renderProgressGainCard(state)}
        </div>
        <div>
          ${renderHistoryPanel(state)}
          ${renderOverviewCard(state)}
        </div>
      </section>
    `;
  }

  function renderSettingsPage() {
    return `
      <section class="hero">
        <div>
          <span class="eyebrow">Ajustes</span>
          <h1 class="hero-title">Control simple para una primera version limpia.</h1>
          <p class="hero-copy">
            Igual que en la app original, la web guarda los datos solo en local y permite restaurar la plantilla inicial cuando quieras.
          </p>
        </div>
      </section>

      <section class="settings-list">
        <article class="glass-card settings-card" style="--glow: rgba(139, 232, 78, 0.08);">
          <div class="card-body">
            <h2 class="card-title">Datos locales</h2>
            <p class="card-copy">Tus ejercicios, pesos e historico se guardan solo en este navegador mediante <code>localStorage</code>.</p>
          </div>
        </article>
        <article class="glass-card settings-card" style="--glow: rgba(255, 217, 92, 0.08);">
          <div class="card-body">
            <h2 class="card-title">Reiniciar plantilla</h2>
            <p class="card-copy">Restaura la estructura inicial inspirada en la rutina del proyecto Flutter.</p>
            <div class="page-actions">
              <button class="ghost-button" data-action="reset-seed">Restaurar datos semilla</button>
            </div>
          </div>
        </article>
      </section>
    `;
  }

  function renderGroupSection(state, group, depth) {
    const children = childGroups(state.storage, group.id);
    const exercises = exercisesForGroup(state.storage, group.id);
    const activeExercises = activeExercisesForGroup(state.storage, group.id);
    const separatedExercises = separatedExercisesForGroup(state.storage, group.id);
    const hasContent = children.length > 0 || exercises.length > 0;
    const total = activeExercises.reduce((sum, item) => sum + item.currentKg, 0);

    return `
      <div
        class="group-shell"
        style="--depth: ${depth};"
        draggable="true"
        data-drag-group-id="${group.id}"
        data-parent-group-id="${group.parentId || ""}"
      >
        <article class="glass-card group-card" style="--glow: ${depth === 0 ? "rgba(139, 232, 78, 0.08)" : "rgba(255, 217, 92, 0.08)"};">
          <div class="card-body">
            <div
              class="group-header"
              data-action="toggle-group"
              data-group-id="${group.id}"
              role="button"
              tabindex="0"
              aria-expanded="${group.isExpanded ? "true" : "false"}"
            >
              <button
                class="group-toggle"
                style="--rotation: ${group.isExpanded ? "90deg" : "0deg"};"
                data-action="toggle-group"
                data-group-id="${group.id}"
                ${hasContent ? "" : "disabled"}
                aria-label="Expandir grupo"
              >></button>
              <h2 class="group-title">${escapeHtml(group.name)}</h2>
              <div class="group-menu-wrap">
                <button
                  class="group-menu-button"
                  type="button"
                  data-action="toggle-group-menu"
                  data-group-id="${group.id}"
                  aria-label="Abrir acciones del grupo"
                  aria-expanded="${state.openGroupMenuId === group.id ? "true" : "false"}"
                >+</button>
                ${
                  state.openGroupMenuId === group.id
                    ? `
                      <div class="group-actions" role="menu">
                        <button class="chip-button" data-action="open-group-editor" data-group-id="${group.id}">Editar</button>
                        <button class="chip-button is-exercise-action" data-action="open-exercise-editor" data-group-id="${group.id}">Ejercicio</button>
                        <button class="chip-button is-subgroup-action" data-action="open-group-editor" data-parent-id="${group.id}">Subgrupo</button>
                        <button class="danger-button" data-action="delete-group" data-group-id="${group.id}">Eliminar</button>
                      </div>
                    `
                    : ""
                }
              </div>
            </div>
            ${
              group.isExpanded
                ? `
                  <div class="group-content">
                    ${
                      exercises.length
                        ? `
                          ${renderExerciseDropSection("En uso", group.id, "active", activeExercises)}
                        `
                        : ""
                    }
                    <div class="child-group-list" data-group-list-parent="${group.id}">${children.map((child) => renderGroupSection(state, child, depth + 1)).join("")}</div>
                    ${exercises.length ? renderExerciseDropSection("Apartados", group.id, "separated", separatedExercises) : ""}
                    ${!hasContent ? renderEmptyState("Todavia no hay ejercicios en este bloque.", "Puedes crear subgrupos o ejercicios desde aqui.") : ""}
                  </div>
                `
                : ""
            }
            ${group.isExpanded && activeExercises.length ? `<p class="subtle-note">Peso activo en este bloque: ${formatKg(total)}</p>` : ""}
          </div>
        </article>
      </div>
    `;
  }

  function renderExerciseCard(exercise) {
    const ready = exercise.readyToIncrease;
    const gainedKg = Math.max(0, Number(exercise.currentKg || 0) - Number(exercise.initialKg ?? exercise.currentKg ?? 0));
    const stepKg = Math.max(0, Number(exercise.nextKg || 0) - Number(exercise.currentKg || 0));
    const progress = stepKg <= 0 ? 0 : clamp(gainedKg / (stepKg * 10), 0, 1);

    return `
      <article
        class="exercise-card ${exercise.isSeparated ? "is-separated" : ""}"
        draggable="true"
        data-drag-exercise-id="${exercise.id}"
        style="
          --exercise-border: ${ready ? "rgba(139, 232, 78, 0.45)" : "rgba(255, 255, 255, 0.14)"};
          --exercise-glow: ${ready ? "rgba(139, 232, 78, 0.12)" : "rgba(23, 27, 32, 0.96)"};
        "
      >
        <div class="exercise-card-click" data-action="open-exercise-editor" data-exercise-id="${exercise.id}" role="button" tabindex="0">
          <div class="exercise-header">
            <div style="flex: 1;">
              <div class="exercise-title-row">
                <h3 class="exercise-title">${escapeHtml(exercise.name)}</h3>
              </div>
            </div>
            <button
              class="ready-toggle"
              type="button"
              data-action="toggle-ready"
              data-exercise-id="${exercise.id}"
              style="
                --ready-start: ${ready ? "var(--accent-strong)" : "rgba(29, 35, 41, 1)"};
                --ready-end: ${ready ? "var(--accent)" : "rgba(23, 27, 32, 1)"};
                --ready-fg: ${ready ? "#020202" : "var(--muted)"};
                --ready-border: ${ready ? "rgba(185, 244, 74, 0.55)" : "rgba(255, 255, 255, 0.14)"};
                --ready-shadow: ${ready ? "0 0 24px rgba(139, 232, 78, 0.32)" : "none"};
              "
              aria-label="Marcar listo para subir"
            >&rarr;</button>
          </div>
          <div class="badge-wrap">
            <button
              class="mini-badge is-weight"
              type="button"
              data-action="apply-next-direct"
              data-exercise-id="${exercise.id}"
              style="--badge-color: var(--accent);"
              aria-label="Aplicar siguiente peso"
            >${formatKg(exercise.currentKg)}&nbsp; ->&nbsp; ${formatKg(exercise.nextKg)}</button>
            <button
              class="status-weight-badge"
              type="button"
              data-action="toggle-ready"
              data-exercise-id="${exercise.id}"
              style="--status-weight-color: ${ready ? "var(--accent-warm)" : "var(--accent)"};"
              aria-label="Cambiar estado de subida"
            >
              <span>${formatKg(exercise.currentKg)}</span>
            </button>
          </div>
          ${
            exercise.notes
              ? `
                <div class="exercise-note-card">
                  <span>Notas</span>
                  <p>${escapeHtml(exercise.notes)}</p>
                </div>
              `
              : ""
          }
          <div class="exercise-footer">
            <div class="progress-track" style="--value: ${progress};"><span></span></div>
            <strong class="progress-gain ${gainedKg === 0 ? "is-zero" : ""}">${formatSignedKg(gainedKg)}</strong>
          </div>
        </div>
      </article>
    `;
  }

  function renderExerciseDropSection(title, groupId, section, exercises) {
    const isSeparated = section === "separated";
    const isEmpty = exercises.length === 0;

    return `
      <div class="exercise-drop-section ${isSeparated ? "is-separated-zone" : ""}" data-drop-section="${section}" data-drop-group-id="${groupId}">
        <div class="section-separator">
          <span>${escapeHtml(title)}</span>
        </div>
        <div class="exercise-list ${isEmpty ? "is-empty" : ""}">
          ${exercises.map(renderExerciseCard).join("")}
          ${isEmpty ? `<div class="drop-placeholder">${isSeparated ? "Sin ejercicios apartados" : "Sin ejercicios en uso"}</div>` : ""}
        </div>
      </div>
    `;
  }

  function renderProgressGainCard(state) {
    const items = progressGainItems(state.storage);

    return `
      <article class="glass-card featured-card gain-card" style="--glow: rgba(139, 232, 78, 0.08);">
        <div class="card-body">
          <h2 class="card-title">Progreso por ejercicio</h2>
          <p class="section-copy">Kg ganados desde el peso inicial en ejercicios que ya han subido.</p>
          <div class="chart-card">${renderProgressGainChart(items)}</div>
        </div>
      </article>
    `;
  }

  function renderOverviewCard(state) {
    return `
      <article class="glass-card progress-card overview-card" style="--glow: rgba(255, 217, 92, 0.12);">
        <div class="card-body">
          <p class="section-copy">Vista general</p>
          <div class="summary-weight">${Math.round(completionRatio(state.storage) * 100)}%</div>
          <p class="card-copy">de tus ejercicios estan marcados como listos para subir</p>
          <div class="card-grid metrics">
            ${renderMetricPill("Entradas en historial", String(recentEntries(state.storage, state.storage.entries.length).length), "var(--accent-strong)")}
            ${renderMetricPill("Peso activo total", formatKgCompact(totalTrackedKg(state.storage)), "var(--accent-warm)")}
          </div>
        </div>
      </article>
    `;
  }

  function renderHistoryPanel(state) {
    const entries = recentEntries(state.storage, state.storage.entries.length);

    return `
      <section class="history-section">
        <article class="glass-card progress-card history-card" style="--glow: rgba(255, 217, 92, 0.08);">
          <div class="card-body">
            <h2 class="card-title">Historial de cambios</h2>
            <p class="section-copy">Todos los cambios reales de peso registrados en tus ejercicios.</p>
            <div class="history-list rank-list">
              ${entries.length ? entries.map((entry) => renderHistoryEntry(state, entry)).join("") : renderEmptyState("Sin historial todavia.", "Los cambios de peso apareceran aqui.")}
            </div>
          </div>
        </article>
      </section>
    `;
  }

  function renderHistoryEntry(state, entry) {
    const exercise = findExercise(state.storage, entry.exerciseId);
    const exerciseName = exercise ? exercise.name : "Ejercicio eliminado";
    const movement = entry.fromKg == null ? formatKg(entry.toKg || 0) : `${formatKg(entry.fromKg)} -> ${formatKg(entry.toKg || entry.fromKg)}`;

    return `
      <article class="glass-card history-entry" data-history-entry-id="${escapeAttribute(entry.id)}" style="--glow: rgba(255, 217, 92, 0.06);">
        <div class="card-body progress-rank">
          <div class="rank-meta">
            <h3 class="exercise-title">${escapeHtml(exerciseName)}</h3>
            <p class="card-copy">${escapeHtml(entryLabel(entry))}</p>
          </div>
          <div class="rank-gap history-meta">
            <strong>${escapeHtml(movement)}</strong>
            <span class="muted">${escapeHtml(formatDateTime(entry.createdAt))}</span>
          </div>
        </div>
      </article>
    `;
  }

  function entryLabel(entry) {
    if (entry.note) {
      return entry.note;
    }

    switch (entry.type) {
      case "manualEdit":
        return "Edicion manual";
      case "appliedNextWeight":
        return "Subida aplicada";
      case "toggledReady":
        return "Cambio de estado";
      case "createdExercise":
        return "Ejercicio creado";
      default:
        return "Cambio registrado";
    }
  }

  function progressGainItems(storage) {
    return [...storage.exercises]
      .filter((exercise) => !exercise.isSeparated)
      .map((exercise) => {
        const initialKg = Number(exercise.initialKg ?? exercise.currentKg ?? 0);
        const currentKg = Number(exercise.currentKg ?? 0);
        return {
          id: exercise.id,
          name: exercise.name,
          groupName: groupLabel(storage, findGroup(storage, exercise.groupId) || { name: "Sin grupo" }),
          initialKg,
          currentKg,
          gainedKg: Math.max(0, currentKg - initialKg),
        };
      })
      .filter((exercise) => exercise.gainedKg > 0)
      .sort((a, b) => b.gainedKg - a.gainedKg || a.name.localeCompare(b.name, "es"));
  }

  function renderProgressGainChart(items) {
    if (!items.length) {
      return renderEmptyState("Todavia no hay subidas registradas.", "Cuando un ejercicio supere su peso inicial, aparecera aqui.");
    }

    const maxGain = Math.max(...items.map((item) => item.gainedKg));

    return `
      <div class="gain-chart" role="img" aria-label="Grafica de kilos ganados por ejercicio">
        ${items
          .map((item) => {
            const value = maxGain > 0 ? clamp(item.gainedKg / maxGain, 0, 1) : 0;
            return `
              <div class="gain-row">
                <div class="gain-row-head">
                  <span>${escapeHtml(item.name)}</span>
                  <strong>${escapeHtml(formatSignedKg(item.gainedKg))}</strong>
                </div>
                <p class="gain-group">${escapeHtml(item.groupName)}</p>
                <div class="gain-track" style="--value: ${value};"><span></span></div>
                <p class="gain-meta">${escapeHtml(formatKg(item.initialKg))} -> ${escapeHtml(formatKg(item.currentKg))}</p>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderExerciseChart(storage, exerciseId) {
    const entries = entriesForExercise(storage, exerciseId).filter(
      (entry) =>
        entry.toKg != null &&
        (entry.type === "createdExercise" || (isWeightHistoryEntry(entry) && entry.metric !== "nextKg")),
    );
    if (!entries.length) {
      return renderEmptyState("Sin datos suficientes para la grafica.", "La linea aparecera cuando el ejercicio tenga historial con pesos.");
    }

    const width = 620;
    const height = 220;
    const padding = { top: 18, right: 16, bottom: 36, left: 42 };
    const values = entries.map((entry) => Number(entry.toKg));
    let min = Math.min(...values);
    let max = Math.max(...values);

    if (min === max) {
      min -= 1;
      max += 1;
    }

    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const xStep = entries.length === 1 ? 0 : innerWidth / (entries.length - 1);

    const points = entries.map((entry, index) => {
      const x = padding.left + index * xStep;
      const ratio = (Number(entry.toKg) - min) / (max - min);
      const y = padding.top + innerHeight - ratio * innerHeight;
      return { x, y, label: formatDate(entry.createdAt), value: Number(entry.toKg) };
    });

    const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
    const areaPoints = [
      `${points[0].x},${height - padding.bottom}`,
      ...points.map((point) => `${point.x},${point.y}`),
      `${points[points.length - 1].x},${height - padding.bottom}`,
    ].join(" ");

    const yTicks = Array.from({ length: 4 }, (_, index) => {
      const value = min + ((max - min) * index) / 3;
      const y = padding.top + innerHeight - (innerHeight * index) / 3;
      return { value, y };
    });

    const labelIndexes = uniqueIndexes([0, Math.floor((entries.length - 1) / 2), entries.length - 1]);

    return `
      <div class="chart-wrap">
        <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafica de progreso del ejercicio">
          ${yTicks
            .map(
              (tick) => `
                <line class="chart-grid" x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}"></line>
                <text class="chart-label" x="6" y="${tick.y + 4}">${formatKgCompact(tick.value)}</text>
              `,
            )
            .join("")}
          <polygon class="chart-area" points="${areaPoints}"></polygon>
          <polyline class="chart-line" points="${linePoints}"></polyline>
          ${points.map((point) => `<circle class="chart-dot" cx="${point.x}" cy="${point.y}" r="4"></circle>`).join("")}
          ${labelIndexes
            .map((index) => {
              const point = points[index];
              return `<text class="chart-label" x="${point.x}" y="${height - 10}" text-anchor="middle">${point.label}</text>`;
            })
            .join("")}
        </svg>
      </div>
    `;
  }

  function renderMetricPill(label, value, color) {
    return `
      <div class="metric-pill" style="--metric: ${color};">
        <span class="metric-value">${escapeHtml(value)}</span>
        <span class="label-copy">${escapeHtml(label)}</span>
      </div>
    `;
  }

  function renderRestTimers(state) {
    const timers = Array.isArray(state.restTimers) && state.restTimers.length ? state.restTimers : [30, 60, 90, 120];
    const restTimer = state.restTimer || {};

    return `
      <div class="rest-timer-panel" aria-label="Temporizadores de descanso">
        ${timers
          .map((seconds, index) => {
            const isActive = restTimer.running && restTimer.duration === seconds;
            const isCompleted = restTimer.completed && restTimer.duration === seconds;
            const label = isActive || isCompleted ? formatTimer(restTimer.remaining) : formatTimer(seconds);
            return `
              <button
                class="rest-timer-button ${isActive || isCompleted ? "is-active" : ""}"
                type="button"
                data-action="start-rest-timer"
                data-timer-index="${index}"
                data-seconds="${seconds}"
                aria-label="Temporizador de ${formatTimer(seconds)}"
              >${label}</button>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function formatTimer(seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function renderMiniBadge(label, color, extraClass = "") {
    return `<span class="mini-badge ${extraClass}" style="--badge-color: ${color};">${escapeHtml(label)}</span>`;
  }

  function formatSignedKg(value) {
    return `+ ${formatKgCompact(value)} Kg`;
  }

  function renderEmptyState(title, copy) {
    return `
      <div class="empty-state">
        <strong>${escapeHtml(title)}</strong>
        <p class="empty-copy" style="margin-bottom: 0;">${escapeHtml(copy)}</p>
      </div>
    `;
  }

  function renderFab() {
    return `<button class="fab" data-action="open-quick-create">+ Anadir</button>`;
  }

  function renderBottomNav(currentTab) {
    return `
      <nav class="bottom-nav" aria-label="Navegacion principal">
        ${renderNavButton(currentTab, "routine", renderRoutineIcon(), "Rutina")}
        ${renderNavButton(currentTab, "progress", renderChecklistIcon(), "Progreso")}
        ${renderNavButton(currentTab, "settings", "⚙", "Ajustes")}
      </nav>
    `;
  }

  function renderRoutineIcon() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 9.2v5.6" />
        <path d="M6 7.5v9" />
        <path d="M9 10.5v3" />
        <path d="M9 12h6" />
        <path d="M15 10.5v3" />
        <path d="M18 7.5v9" />
        <path d="M21 9.2v5.6" />
      </svg>
    `;
  }

  function renderChecklistIcon() {
    return `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="4" y="3.8" width="16" height="16.8" rx="3" />
        <path d="M8 8.2l1.3 1.3 2.5-2.7" />
        <path d="M13.5 8.5h3.3" />
        <path d="M8 13l1.3 1.3 2.5-2.7" />
        <path d="M13.5 13.3h3.3" />
        <path d="M8 17.6h2.8" />
        <path d="M13.5 17.6h3.3" />
      </svg>
    `;
  }

  function renderNavButton(currentTab, tab, icon, label) {
    const isActive = currentTab === tab;
    return `
      <button class="nav-button ${isActive ? "is-active" : ""}" data-action="switch-tab" data-tab="${tab}">
        <span class="nav-icon">${icon}</span>
        <span class="nav-label ${isActive ? "is-active" : ""}">${label}</span>
      </button>
    `;
  }

  function renderModal(state) {
    if (!state.modal) {
      return "";
    }

    return `
      <div class="modal-backdrop" data-overlay-close="true">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-content">${renderModalContent(state)}</div>
        </div>
      </div>
    `;
  }

  function renderModalContent(state) {
    switch (state.modal.type) {
      case "quick-create":
        return renderQuickCreateModal();
      case "group-editor":
        return renderGroupModal(state);
      case "exercise-editor":
        return renderExerciseModal(state);
      case "apply-next":
        return renderApplyNextModal(state);
      case "rest-timer-editor":
        return renderRestTimerModal(state);
      default:
        return "";
    }
  }

  function renderQuickCreateModal() {
    return `
      <div class="modal-header">
        <div>
          <h2 class="modal-title">Crear rapido</h2>
          <p class="section-copy">Selecciona que quieres anadir a la rutina.</p>
        </div>
        <button class="icon-button" data-action="close-modal" aria-label="Cerrar modal">x</button>
      </div>
      <div class="option-list">
        <button class="option-button" data-action="quick-create-group">
          <span class="option-icon">[]</span>
          <span>
            <strong class="option-title">Nuevo grupo</strong>
            <p class="option-copy">Crea un bloque muscular raiz o un nuevo bloque de trabajo.</p>
          </span>
        </button>
        <button class="option-button" data-action="quick-create-exercise">
          <span class="option-icon">KG</span>
          <span>
            <strong class="option-title">Nuevo ejercicio</strong>
            <p class="option-copy">Anade un movimiento con peso actual, siguiente objetivo y notas.</p>
          </span>
        </button>
      </div>
    `;
  }

  function renderGroupModal(state) {
    const group = state.modal.groupId ? findGroup(state.storage, state.modal.groupId) : null;

    return `
      <div class="modal-header">
        <div>
          <h2 class="modal-title">${group ? "Editar grupo" : "Nuevo grupo"}</h2>
          <p class="section-copy">${group ? "Actualiza el nombre del bloque." : "Crea un nuevo grupo en la rutina."}</p>
        </div>
        <button class="icon-button" data-action="close-modal" aria-label="Cerrar modal">x</button>
      </div>
      <form class="modal-form" data-form="group-editor">
        <div class="field">
          <label for="group-name">Nombre del grupo</label>
          <input id="group-name" name="name" type="text" value="${group ? escapeAttribute(group.name) : ""}" required />
        </div>
        <div class="modal-actions">
          <button class="primary-button" type="submit">Guardar</button>
        </div>
      </form>
    `;
  }

  function renderExerciseModal(state) {
    const exercise = state.modal.exerciseId ? findExercise(state.storage, state.modal.exerciseId) : null;
    const groups = exerciseTargetGroups(state.storage);
    const selectedGroupId = exercise?.groupId || state.modal.initialGroupId || "";
    const initialKg = exercise?.initialKg ?? exercise?.currentKg ?? "";
    const increment = exercise ? Math.max(0, Number(exercise.nextKg) - Number(exercise.currentKg)) : "";

    return `
      <div class="modal-header">
        <div>
          <h2 class="modal-title">${exercise ? "Editar ejercicio" : "Nuevo ejercicio"}</h2>
          <p class="section-copy">${exercise ? "Ajusta pesos, notas y estado." : "Anade un nuevo ejercicio al grupo que toque."}</p>
        </div>
        <button class="icon-button" data-action="close-modal" aria-label="Cerrar modal">x</button>
      </div>
      <form class="modal-form" data-form="exercise-editor">
        <div class="field">
          <label for="exercise-group">Grupo</label>
          <select id="exercise-group" name="groupId" required>
            <option value="">Selecciona un grupo</option>
            ${groups
              .map((group) => {
                const isSelected = group.id === selectedGroupId ? "selected" : "";
                return `<option value="${group.id}" ${isSelected}>${escapeHtml(groupLabel(state.storage, group))}</option>`;
              })
              .join("")}
          </select>
        </div>
        <div class="field">
          <label for="exercise-name">Nombre del ejercicio</label>
          <input id="exercise-name" name="name" type="text" value="${exercise ? escapeAttribute(exercise.name) : ""}" required />
        </div>
        <div class="field">
          <label for="exercise-initial">Peso inicial (Kg)</label>
          <input id="exercise-initial" name="initialKg" type="text" inputmode="decimal" value="${exercise ? escapeAttribute(formatKgCompact(initialKg)) : ""}" required />
        </div>
        <div class="form-row cols-2">
          <div class="field">
            <label for="exercise-current">Peso actual (Kg)</label>
            <input id="exercise-current" name="currentKg" type="text" inputmode="decimal" value="${exercise ? escapeAttribute(formatKgCompact(exercise.currentKg)) : ""}" required />
          </div>
          <div class="field">
            <label for="exercise-next">Subida (+ Kg)</label>
            <input id="exercise-next" name="nextKg" type="text" inputmode="decimal" value="${exercise ? escapeAttribute(formatKgCompact(increment)) : "2.5"}" required />
          </div>
        </div>
        <div class="field">
          <label for="exercise-notes">Notas</label>
          <textarea id="exercise-notes" name="notes">${exercise ? escapeHtml(exercise.notes) : ""}</textarea>
        </div>
        <label class="switch">
          <span class="switch-label">
            <strong>Listo para subir</strong>
            <p class="switch-copy">Solo marca el estado, no aplica la subida automaticamente.</p>
          </span>
          <input name="readyToIncrease" type="checkbox" ${exercise?.readyToIncrease ? "checked" : ""} />
        </label>
        <div class="modal-actions">
          <button class="primary-button" type="submit">Guardar ejercicio</button>
          ${
            exercise
              ? `
                <button class="ghost-button" type="button" data-action="open-apply-next" data-exercise-id="${exercise.id}">Aplicar siguiente peso</button>
                <button class="danger-button" type="button" data-action="delete-exercise" data-exercise-id="${exercise.id}">Eliminar ejercicio</button>
              `
              : ""
          }
        </div>
      </form>
    `;
  }

  function exerciseTargetGroups(storage) {
    function walk(groups) {
      return groups.flatMap((group) => [group, ...walk(childGroups(storage, group.id))]);
    }

    return walk(rootGroups(storage));
  }

  function renderApplyNextModal(state) {
    const exercise = findExercise(state.storage, state.modal.exerciseId);
    if (!exercise) {
      return "";
    }
    const increment = Math.max(0, Number(exercise.nextKg) - Number(exercise.currentKg));

    return `
      <div class="modal-header">
        <div>
          <h2 class="modal-title">Aplicar subida</h2>
          <p class="section-copy">El peso actual pasara a ${formatKg(exercise.nextKg)} y aqui defines cuanto se sumara despues.</p>
        </div>
        <button class="icon-button" data-action="close-modal" aria-label="Cerrar modal">x</button>
      </div>
      <form class="modal-form" data-form="apply-next">
        <div class="field">
          <label for="new-next-kg">Nueva subida (+ Kg)</label>
          <input id="new-next-kg" name="newNextKg" type="text" inputmode="decimal" value="${escapeAttribute(formatKgCompact(increment || suggestNextWeight(0)))}" required />
        </div>
        <div class="modal-actions">
          <button class="primary-button" type="submit">Aplicar</button>
        </div>
      </form>
    `;
  }

  function renderRestTimerModal(state) {
    const seconds = Number(state.modal.seconds) || 30;

    return `
      <div class="modal-header">
        <div>
          <h2 class="modal-title">Editar temporizador</h2>
          <p class="section-copy">Cambia cuanto quieres que cuente hacia atras.</p>
        </div>
        <button class="icon-button" data-action="close-modal" aria-label="Cerrar modal">x</button>
      </div>
      <form class="modal-form" data-form="rest-timer-editor">
        <div class="field">
          <label for="rest-timer-value">Tiempo</label>
          <input id="rest-timer-value" name="timerValue" type="text" inputmode="numeric" value="${formatTimer(seconds)}" placeholder="00:45" required />
        </div>
        <div class="modal-actions">
          <button class="primary-button" type="submit">Guardar cambio</button>
        </div>
      </form>
    `;
  }

  window.GymUI = {
    renderApp,
  };
})();
