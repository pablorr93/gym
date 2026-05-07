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
    leafGroups,
    groupLabel,
    totalTrackedKg,
    readyExercisesCount,
    totalExercisesCount,
    completionRatio,
    topProgressExercises,
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
          <h1 class="hero-title routine-title">Rutina</h1>
          <p class="hero-copy user-name">Pablo</p>
          </div>
        </div>
        <article class="glass-card" style="--glow: rgba(139, 232, 78, 0.12);">
          <div class="card-body">
            <p class="section-copy">Resumen de carga</p>
            <div class="summary-weight">${formatKgCompact(totalTrackedKg(state.storage))} Kg activos en ${totalExercisesCount(state.storage)} ejercicios</div>
            <div class="card-grid metrics">
              ${renderMetricPill("Listos para subir", String(readyExercisesCount(state.storage)), "var(--accent-strong)")}
              ${renderMetricPill("Bloques musculares", String(roots.length), "var(--accent-warm)")}
            </div>
          </div>
        </article>
      </section>

      <section class="section-stack">
        ${roots.length ? roots.map((group) => renderGroupSection(state, group, 0)).join("") : renderEmptyState("Todavia no hay grupos en tu rutina.", "Usa el boton Anadir para crear el primer bloque muscular.")}
      </section>
    `;
  }

  function renderProgressPage(state) {
    const featured = topProgressExercises(state.storage, 1)[0];
    const items = topProgressExercises(state.storage, 5);

    return `
      <section class="hero">
        <div>
          <span class="eyebrow">Progreso</span>
          <h1 class="hero-title">Historico y foco en la siguiente subida.</h1>
          <p class="hero-copy">
            Se mantiene el enfoque de la app: porcentaje de ejercicios listos, ejercicio destacado y una vista rapida de cuanto falta para cada objetivo.
          </p>
        </div>
        <article class="glass-card" style="--glow: rgba(255, 217, 92, 0.12);">
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
      </section>

      <section class="progress-grid">
        <div>
          ${featured ? renderFeaturedProgress(state, featured) : renderEmptyState("Sin datos suficientes.", "Crea o edita ejercicios para empezar a ver el progreso historico.")}
          <article class="glass-card progress-card" style="--glow: rgba(255, 217, 92, 0.08);">
            <div class="card-body">
              <h2 class="card-title">Top de progreso</h2>
              <p class="section-copy">Cuanto te falta para el siguiente objetivo en tus ejercicios con mayor salto.</p>
              <div class="rank-list" style="margin-top: 18px;">
                ${items.length ? items.map(renderProgressRank).join("") : renderEmptyState("No hay ejercicios todavia.", "Anade el primero desde la pestana Rutina.")}
              </div>
            </div>
          </article>
        </div>
        <div>
          ${renderHistoryPanel(state)}
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
      <div class="group-shell" style="--depth: ${depth};">
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
                        <button class="chip-button" data-action="open-group-editor" data-parent-id="${group.id}">Subgrupo</button>
                        <button class="chip-button" data-action="open-exercise-editor" data-group-id="${group.id}">Ejercicio</button>
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
                          ${renderExerciseDropSection("Apartados", group.id, "separated", separatedExercises)}
                        `
                        : ""
                    }
                    <div class="child-group-list">${children.map((child) => renderGroupSection(state, child, depth + 1)).join("")}</div>
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
    const progress = exercise.nextKg <= 0 ? 0 : clamp(exercise.currentKg / exercise.nextKg, 0, 1);

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
                ${renderMiniBadge(formatKg(exercise.currentKg), "var(--accent)", "is-current")}
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
            >${formatKgCompact(exercise.currentKg)}&nbsp; -> ${formatKgCompact(exercise.nextKg)} Kg</button>
            ${renderMiniBadge(ready ? "Listo para subir" : "Aun en progreso", ready ? "var(--accent-warm)" : "var(--muted)")}
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
            <strong>${formatKg(exercise.currentKg)}</strong>
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

  function renderFeaturedProgress(state, exercise) {
    return `
      <article class="glass-card featured-card" style="--glow: rgba(139, 232, 78, 0.08);">
        <div class="card-body">
          <h2 class="card-title">${escapeHtml(exercise.name)}</h2>
          <p class="summary-weight" style="font-size: clamp(1.8rem, 4vw, 2.6rem); margin-top: 8px;">
            ${formatKg(exercise.currentKg)} -> ${formatKg(exercise.nextKg)}
          </p>
          <div class="chart-card">${renderExerciseChart(state.storage, exercise.id)}</div>
        </div>
      </article>
    `;
  }

  function renderProgressRank(exercise) {
    const remaining = exercise.nextKg - exercise.currentKg;

    return `
      <article class="glass-card" style="--glow: rgba(255, 217, 92, 0.06);">
        <div class="card-body progress-rank">
          <div class="rank-meta">
            <h3 class="exercise-title">${escapeHtml(exercise.name)}</h3>
            <p class="card-copy">${formatKg(exercise.currentKg)} -> ${formatKg(exercise.nextKg)}</p>
          </div>
          <div class="rank-gap">
            <strong>${formatKgCompact(remaining)} Kg</strong>
            <span class="muted">hasta el siguiente</span>
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

  function renderMiniBadge(label, color, extraClass = "") {
    return `<span class="mini-badge ${extraClass}" style="--badge-color: ${color};">${escapeHtml(label)}</span>`;
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
        ${renderNavButton(currentTab, "routine", "R", "Rutina")}
        ${renderNavButton(currentTab, "progress", "P", "Progreso")}
        ${renderNavButton(currentTab, "settings", "A", "Ajustes")}
      </nav>
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
    const groups = leafGroups(state.storage);
    const selectedGroupId = exercise?.groupId || state.modal.initialGroupId || "";
    const increment = exercise ? Math.max(0, Number(exercise.nextKg) - Number(exercise.currentKg)) : "";

    return `
      <div class="modal-header">
        <div>
          <h2 class="modal-title">${exercise ? "Editar ejercicio" : "Nuevo ejercicio"}</h2>
          <p class="section-copy">${exercise ? "Ajusta pesos, notas y estado." : "Anade un nuevo ejercicio a uno de los grupos finales."}</p>
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

  window.GymUI = {
    renderApp,
  };
})();
