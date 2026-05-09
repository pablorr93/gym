(function () {
  const STORAGE_KEY = "gym_progress_storage_v1";

  function createSeedData() {
    const now = new Date().toISOString();

    const groups = [
      { id: "g_pecho", name: "Pecho", order: 0, parentId: null, isExpanded: true },
      { id: "g_brazos", name: "Brazos", order: 1, parentId: null, isExpanded: true },
      { id: "g_biceps", name: "Biceps", order: 0, parentId: "g_brazos", isExpanded: true },
      { id: "g_triceps", name: "Triceps", order: 1, parentId: "g_brazos", isExpanded: false },
      { id: "g_hombros", name: "Hombros", order: 2, parentId: null, isExpanded: false },
      { id: "g_abdomen", name: "Abdomen", order: 3, parentId: null, isExpanded: false },
      { id: "g_correccion", name: "Corregir encorv", order: 4, parentId: null, isExpanded: false },
      { id: "g_espalda_root", name: "Espalda", order: 5, parentId: null, isExpanded: true },
      { id: "g_espalda", name: "Espalda", order: 0, parentId: "g_espalda_root", isExpanded: false },
      { id: "g_lumbares", name: "Lumbares", order: 1, parentId: "g_espalda_root", isExpanded: false },
      { id: "g_inferior", name: "Inferior", order: 6, parentId: null, isExpanded: true },
      { id: "g_gemelos", name: "Gemelos", order: 0, parentId: "g_inferior", isExpanded: false },
      { id: "g_gluteos", name: "Gluteos", order: 1, parentId: "g_inferior", isExpanded: false },
    ];

    const exercises = [
      { id: "e_pecho_mancuernas", groupId: "g_pecho", name: "Pecho Mancuernas", currentKg: 18, nextKg: 20, order: 0, updatedAt: now, notes: "", readyToIncrease: false },
      { id: "e_pecho_abierto_maquina", groupId: "g_pecho", name: "Pecho Abierto Maquina", currentKg: 30, nextKg: 35, order: 1, updatedAt: now, notes: "", readyToIncrease: false },
      { id: "e_pecho_disco", groupId: "g_pecho", name: "Pecho Disco", currentKg: 10, nextKg: 12.5, order: 2, updatedAt: now, notes: "", readyToIncrease: false },
      { id: "e_biceps_barra", groupId: "g_biceps", name: "Biceps Barra", currentKg: 10, nextKg: 15, order: 0, updatedAt: now, notes: "", readyToIncrease: false },
      { id: "e_biceps_mancuernas", groupId: "g_biceps", name: "Biceps Mancuernas", currentKg: 8, nextKg: 10, order: 1, updatedAt: now, notes: "", readyToIncrease: false },
      {
        id: "e_biceps_poleas",
        groupId: "g_biceps",
        name: "Abierto Poleas",
        currentKg: 15,
        nextKg: 20,
        order: 2,
        updatedAt: now,
        notes: "2 pasos adelante, flexion hacia el exterior con codo pegado. Poleas a la altura de las munecas.",
        readyToIncrease: false,
      },
      { id: "e_triceps_cuerda", groupId: "g_triceps", name: "Triceps Cuerda", currentKg: 20, nextKg: 25, order: 0, updatedAt: now, notes: "", readyToIncrease: false },
      { id: "e_hombro_press", groupId: "g_hombros", name: "Press Hombro Maquina", currentKg: 22.5, nextKg: 25, order: 0, updatedAt: now, notes: "", readyToIncrease: false },
      { id: "e_gluteos_hip", groupId: "g_gluteos", name: "Hip Thrust", currentKg: 60, nextKg: 65, order: 0, updatedAt: now, notes: "", readyToIncrease: false },
    ].map((exercise) => ({ ...exercise, initialKg: exercise.currentKg }));

    const entries = exercises.map((exercise) => ({
      id: `log_${exercise.id}`,
      exerciseId: exercise.id,
      type: "createdExercise",
      metric: "currentKg",
      fromKg: null,
      toKg: exercise.currentKg,
      createdAt: now,
      note: "Ejercicio inicial",
    }));

    return {
      groups,
      exercises,
      entries,
      snapshot: {
        seedVersion: 1,
        createdAt: now,
      },
    };
  }

  function loadStorage() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = createSeedData();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        return seed;
      }
      const parsed = JSON.parse(raw);
      const rawEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const entries = rawEntries.filter(isStoredHistoryEntry);
      const normalizedExercises = Array.isArray(parsed.exercises)
        ? parsed.exercises.map((exercise) => normalizeExercise(exercise, entries))
        : [];
      const normalized = {
        groups: Array.isArray(parsed.groups) ? parsed.groups : [],
        exercises: normalizedExercises,
        entries,
        snapshot: parsed.snapshot || { seedVersion: 1, createdAt: new Date().toISOString() },
      };

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));

      return normalized;
    } catch (error) {
      const seed = createSeedData();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
  }

  function rootGroups(storage) {
    return [...storage.groups].filter((group) => group.parentId == null).sort(byOrder);
  }

  function childGroups(storage, parentId) {
    return [...storage.groups].filter((group) => group.parentId === parentId).sort(byOrder);
  }

  function exercisesForGroup(storage, groupId) {
    return [...storage.exercises].filter((exercise) => exercise.groupId === groupId).sort(byOrder);
  }

  function activeExercisesForGroup(storage, groupId) {
    return exercisesForGroup(storage, groupId).filter((exercise) => !exercise.isSeparated);
  }

  function separatedExercisesForGroup(storage, groupId) {
    return exercisesForGroup(storage, groupId).filter((exercise) => exercise.isSeparated);
  }

  function entriesForExercise(storage, exerciseId) {
    return [...storage.entries]
      .filter((entry) => entry.exerciseId === exerciseId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  function findGroup(storage, id) {
    return storage.groups.find((group) => group.id === id) || null;
  }

  function findExercise(storage, id) {
    return storage.exercises.find((exercise) => exercise.id === id) || null;
  }

  function leafGroups(storage) {
    return [...storage.groups]
      .filter((group) => childGroups(storage, group.id).length === 0)
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  function groupLabel(storage, group) {
    const names = [group.name];
    let current = group;

    while (current.parentId) {
      const parent = findGroup(storage, current.parentId);
      if (!parent) {
        break;
      }
      names.unshift(parent.name);
      current = parent;
    }

    return names.join(" / ");
  }

  function totalTrackedKg(storage) {
    return storage.exercises
      .filter((exercise) => !exercise.isSeparated)
      .reduce((sum, item) => sum + Number(item.currentKg || 0), 0);
  }

  function readyExercisesCount(storage) {
    return storage.exercises.filter((exercise) => exercise.readyToIncrease && !exercise.isSeparated).length;
  }

  function totalExercisesCount(storage) {
    return storage.exercises.filter((exercise) => !exercise.isSeparated).length;
  }

  function completionRatio(storage) {
    const total = totalExercisesCount(storage);
    return total ? readyExercisesCount(storage) / total : 0;
  }

  function topProgressExercises(storage, limit) {
    return [...storage.exercises]
      .filter((exercise) => !exercise.isSeparated)
      .sort((a, b) => (Number(b.nextKg) - Number(b.currentKg)) - (Number(a.nextKg) - Number(a.currentKg)))
      .slice(0, limit);
  }

  function recentEntries(storage, limit = 20) {
    return [...storage.entries]
      .filter(isWeightHistoryEntry)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  function isWeightHistoryEntry(entry) {
    return entry.type === "manualEdit" || entry.type === "appliedNextWeight";
  }

  function isStoredHistoryEntry(entry) {
    return entry.type === "createdExercise" || isWeightHistoryEntry(entry);
  }

  function toggleGroupExpanded(storage, groupId) {
    return {
      ...storage,
      groups: storage.groups.map((group) =>
        group.id === groupId ? { ...group, isExpanded: !group.isExpanded } : group,
      ),
    };
  }

  function toggleReadyToIncrease(storage, exerciseId) {
    const exercise = findExercise(storage, exerciseId);
    if (!exercise) {
      return storage;
    }

    const updated = {
      ...exercise,
      readyToIncrease: !exercise.readyToIncrease,
      updatedAt: new Date().toISOString(),
    };

    return {
      ...storage,
      exercises: storage.exercises.map((item) => (item.id === exerciseId ? updated : item)),
    };
  }

  function saveGroup(storage, payload) {
    if (payload.id) {
      return {
        ...storage,
        groups: storage.groups.map((group) =>
          group.id === payload.id ? { ...group, name: payload.name, parentId: payload.parentId } : group,
        ),
      };
    }

    const siblings = storage.groups.filter((group) => group.parentId === payload.parentId).length;
    return {
      ...storage,
      groups: [
        ...storage.groups,
        {
          id: uid(),
          name: payload.name,
          parentId: payload.parentId,
          order: siblings,
          isExpanded: false,
        },
      ],
    };
  }

  function saveExercise(storage, payload) {
    const now = new Date().toISOString();

    if (payload.id) {
      const previous = findExercise(storage, payload.id);
      if (!previous) {
        return storage;
      }

      const updated = {
        ...previous,
        groupId: payload.groupId,
        name: payload.name,
        notes: payload.notes,
        initialKg: payload.initialKg,
        currentKg: payload.currentKg,
        nextKg: payload.nextKg,
        readyToIncrease: payload.readyToIncrease,
        isSeparated: previous.isSeparated || false,
        updatedAt: now,
      };

      const entries = [...storage.entries];
      if (previous.currentKg !== payload.currentKg) {
        entries.push({
          id: uid(),
          exerciseId: payload.id,
          type: "manualEdit",
          metric: "currentKg",
          fromKg: previous.currentKg,
          toKg: payload.currentKg,
          createdAt: now,
          note: "Peso actual actualizado",
        });
      } else if (previous.nextKg !== payload.nextKg) {
        entries.push({
          id: uid(),
          exerciseId: payload.id,
          type: "manualEdit",
          metric: "nextKg",
          fromKg: previous.nextKg,
          toKg: payload.nextKg,
          createdAt: now,
          note: "Objetivo actualizado",
        });
      }

      return {
        ...storage,
        exercises: storage.exercises.map((exercise) => (exercise.id === payload.id ? updated : exercise)),
        entries,
      };
    }

    const newId = uid();
    const siblings = storage.exercises.filter((exercise) => exercise.groupId === payload.groupId).length;

    return {
      ...storage,
      exercises: [
        ...storage.exercises,
        {
          id: newId,
          groupId: payload.groupId,
          name: payload.name,
          notes: payload.notes,
          initialKg: payload.initialKg,
          currentKg: payload.currentKg,
          nextKg: payload.nextKg,
          readyToIncrease: payload.readyToIncrease,
          isSeparated: false,
          order: siblings,
          updatedAt: now,
        },
      ],
      entries: [
        ...storage.entries,
        {
          id: uid(),
          exerciseId: newId,
          type: "createdExercise",
          metric: "currentKg",
          fromKg: null,
          toKg: payload.currentKg,
          createdAt: now,
          note: "Ejercicio creado",
        },
      ],
    };
  }

  function applyNextWeight(storage, exerciseId, newNextKg) {
    const exercise = findExercise(storage, exerciseId);
    if (!exercise) {
      return storage;
    }

    const now = new Date().toISOString();
    return {
      ...storage,
      exercises: storage.exercises.map((item) =>
        item.id === exerciseId
          ? {
              ...item,
              currentKg: exercise.nextKg,
              nextKg: newNextKg,
              readyToIncrease: false,
              updatedAt: now,
            }
          : item,
      ),
      entries: [
        ...storage.entries,
        {
          id: uid(),
          exerciseId,
          type: "appliedNextWeight",
          metric: "currentKg",
          fromKg: exercise.currentKg,
          toKg: exercise.nextKg,
          createdAt: now,
          note: "Subida aplicada",
        },
      ],
    };
  }

  function setExerciseSeparated(storage, exerciseId, isSeparated) {
    const exercise = findExercise(storage, exerciseId);
    if (!exercise || Boolean(exercise.isSeparated) === isSeparated) {
      return storage;
    }

    return moveExercise(storage, exerciseId, exercise.groupId, isSeparated, null);
  }

  function moveExercise(storage, exerciseId, targetGroupId, isSeparated, beforeExerciseId = null) {
    const exercise = findExercise(storage, exerciseId);
    if (!exercise) {
      return storage;
    }

    const targetId = targetGroupId || exercise.groupId;
    const baseExercises = storage.exercises.filter((item) => item.id !== exerciseId);
    const moved = {
      ...exercise,
      groupId: targetId,
      isSeparated,
      updatedAt: new Date().toISOString(),
    };

    const targetItems = baseExercises
      .filter((item) => item.groupId === targetId && Boolean(item.isSeparated) === isSeparated)
      .sort(byOrder);
    const foundIndex = beforeExerciseId ? targetItems.findIndex((item) => item.id === beforeExerciseId) : -1;
    const insertIndex = foundIndex >= 0 ? foundIndex : targetItems.length;
    const orderedTarget = [...targetItems];
    orderedTarget.splice(insertIndex, 0, moved);

    const oldItems = baseExercises
      .filter(
        (item) =>
          item.groupId === exercise.groupId &&
          Boolean(item.isSeparated) === Boolean(exercise.isSeparated) &&
          !(item.groupId === targetId && Boolean(item.isSeparated) === isSeparated),
      )
      .sort(byOrder);

    const reordered = new Map();
    oldItems.forEach((item, index) => reordered.set(item.id, { ...item, order: index }));
    orderedTarget.forEach((item, index) => reordered.set(item.id, { ...item, order: index }));

    return {
      ...storage,
      exercises: storage.exercises.map((item) =>
        reordered.has(item.id) ? reordered.get(item.id) : item,
      ),
    };
  }

  function moveGroup(storage, groupId, targetParentId = null, beforeGroupId = null) {
    const group = findGroup(storage, groupId);
    if (!group) {
      return storage;
    }

    const targetParent = targetParentId || null;
    const oldParent = group.parentId || null;
    const descendantIds = new Set(collectDescendantGroupIds(storage, groupId));
    if (targetParent === groupId || descendantIds.has(targetParent)) {
      return storage;
    }

    const sameParent = (item, parentId) => (item.parentId || null) === parentId;
    const baseGroups = storage.groups.filter((item) => item.id !== groupId);
    const moved = {
      ...group,
      parentId: targetParent,
      updatedAt: new Date().toISOString(),
    };

    const targetItems = baseGroups.filter((item) => sameParent(item, targetParent)).sort(byOrder);
    const foundIndex = beforeGroupId ? targetItems.findIndex((item) => item.id === beforeGroupId) : -1;
    const insertIndex = foundIndex >= 0 ? foundIndex : targetItems.length;
    const orderedTarget = [...targetItems];
    orderedTarget.splice(insertIndex, 0, moved);

    const oldItems = oldParent === targetParent ? [] : baseGroups.filter((item) => sameParent(item, oldParent)).sort(byOrder);
    const reordered = new Map();
    oldItems.forEach((item, index) => reordered.set(item.id, { ...item, order: index }));
    orderedTarget.forEach((item, index) => reordered.set(item.id, { ...item, order: index }));

    return {
      ...storage,
      groups: storage.groups.map((item) => (reordered.has(item.id) ? reordered.get(item.id) : item)),
    };
  }

  function deleteExercise(storage, exerciseId) {
    return {
      ...storage,
      exercises: storage.exercises.filter((exercise) => exercise.id !== exerciseId),
      entries: storage.entries.filter((entry) => entry.exerciseId !== exerciseId),
    };
  }

  function deleteHistoryEntry(storage, entryId) {
    return {
      ...storage,
      entries: storage.entries.filter((entry) => entry.id !== entryId),
    };
  }

  function deleteGroup(storage, groupId) {
    const groupIds = new Set([groupId, ...collectDescendantGroupIds(storage, groupId)]);
    const exerciseIds = new Set(
      storage.exercises.filter((exercise) => groupIds.has(exercise.groupId)).map((exercise) => exercise.id),
    );

    return {
      ...storage,
      groups: storage.groups.filter((group) => !groupIds.has(group.id)),
      exercises: storage.exercises.filter((exercise) => !groupIds.has(exercise.groupId)),
      entries: storage.entries.filter((entry) => !exerciseIds.has(entry.exerciseId)),
    };
  }

  function collectDescendantGroupIds(storage, parentId) {
    const children = childGroups(storage, parentId);
    return children.flatMap((child) => [child.id, ...collectDescendantGroupIds(storage, child.id)]);
  }

  function resetToSeed() {
    return createSeedData();
  }

  function parseWeight(value) {
    const parsed = Number.parseFloat(String(value).replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function suggestNextWeight(value) {
    const next = Number(value) + 2.5;
    return Number.isInteger(next) ? String(next) : next.toFixed(1);
  }

  function formatKg(value) {
    const numeric = Number(value);
    return Number.isInteger(numeric) ? `${numeric.toFixed(0)} Kg` : `${numeric.toFixed(1)} Kg`;
  }

  function formatKgCompact(value) {
    const numeric = Number(value);
    return Number.isInteger(numeric) ? numeric.toFixed(0) : numeric.toFixed(1);
  }

  function formatDate(value) {
    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${date.getFullYear()}`;
  }

  function formatDateTime(value) {
    const date = new Date(value);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${formatDate(value)} ${hours}:${minutes}`;
  }

  function normalizeExercise(exercise, entries = []) {
    const initialFromHistory = entries.find(
      (entry) => entry.exerciseId === exercise.id && entry.type === "createdExercise" && entry.toKg != null,
    );
    const initialKg = Number.isFinite(Number(exercise.initialKg))
      ? Number(exercise.initialKg)
      : Number(initialFromHistory?.toKg ?? exercise.currentKg ?? 0);

    return {
      ...exercise,
      initialKg,
      isSeparated: Boolean(exercise.isSeparated),
    };
  }

  function uid() {
    return `${Date.now()}-${Math.floor(Math.random() * (1 << 20))}`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function uniqueIndexes(values) {
    return [...new Set(values.filter((value) => value >= 0))];
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll("\n", "&#10;");
  }

  function byOrder(a, b) {
    return Number(a.order) - Number(b.order);
  }

  window.GymData = {
    STORAGE_KEY,
    createSeedData,
    loadStorage,
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
    toggleGroupExpanded,
    toggleReadyToIncrease,
    saveGroup,
    saveExercise,
    applyNextWeight,
    setExerciseSeparated,
    moveExercise,
    moveGroup,
    deleteExercise,
    deleteHistoryEntry,
    deleteGroup,
    resetToSeed,
    parseWeight,
    suggestNextWeight,
    formatKg,
    formatKgCompact,
    formatDate,
    formatDateTime,
    clamp,
    uniqueIndexes,
    escapeHtml,
    escapeAttribute,
  };
})();
