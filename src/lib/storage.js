import { normalizeOtherFactorsInput } from './history.js';

export const STORAGE_KEY = 'game-of-life-state-v1';

function createEmptyBaseline() {
  return {
    daysCollected: 0,
    status: '',
    averageScore: 0,
    breakdownPatterns: [],
    consistencyLine: '',
    calculatedAt: '',
    revealedAt: '',
  };
}

function normalizeUser(user) {
  if (!user?.name) {
    return null;
  }

  const baseline = {
    ...createEmptyBaseline(),
    ...(user.baseline ?? {}),
    breakdownPatterns: Array.isArray(user.baseline?.breakdownPatterns)
      ? user.baseline.breakdownPatterns.filter(Boolean)
      : [],
  };

  return {
    name: user.name,
    createdAt: user.createdAt ?? '',
    onboardingCompletedAt: user.onboardingCompletedAt ?? '',
    startingSelfPerception: user.startingSelfPerception ?? '',
    baseline,
  };
}

function normalizeObjective(objective, index) {
  const label = objective?.label?.trim?.() ?? '';

  if (!label) {
    return null;
  }

  return {
    id: objective?.id ?? `objective-${index + 1}`,
    label,
    section: objective?.section ?? 'Custom',
    custom: Boolean(objective?.custom),
    outcome: objective?.outcome ?? '',
    breakdownType: objective?.breakdownType ?? '',
    breakdownNote: objective?.breakdownNote ?? '',
  };
}

function normalizeEntry(entry) {
  const normalized = {
    ...createEmptyEntry(entry.dateKey),
    ...entry,
  };

  return {
    ...normalized,
    rootCauseOtherNormalized: normalizeOtherFactorsInput(
      normalized.rootCauseOtherNormalized || normalized.rootCauseOtherText,
    ),
    dailyObjectives: Array.isArray(normalized.dailyObjectives)
      ? normalized.dailyObjectives
          .map((objective, index) => normalizeObjective(objective, index))
          .filter(Boolean)
      : [],
  };
}

export function createEmptyEntry(dateKey) {
  return {
    dateKey,
    dailyObjectives: [],
    objectiveScore: 0,
    objectiveMaxScore: 0,
    primaryDailyBreakdown: '',
    breakdownSummarySeen: false,
    intentionText: '',
    focusCategories: [],
    morningSupportStrategy: '',
    morningSupportCustomText: '',
    intentionEnteredAt: '',
    intentionEnteredLate: false,
    reflection: null,
    noSignificantChallenges: false,
    mirrorSeen: false,
    gapSeen: false,
    emotion: '',
    rootCause: '',
    rootCauseOtherText: '',
    rootCauseOtherNormalized: '',
    rootCauseReasoning: '',
    successFactor: '',
    successNote: '',
    suggestedShift: '',
    shiftSource: '',
    smallShift: '',
    commitmentWindow: '',
    commitmentLocked: false,
    followUp: '',
    dayStatus: '',
    completedAt: '',
  };
}

export function loadState() {
  if (typeof window === 'undefined') {
    return { user: null, entries: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return { user: null, entries: [] };
    }

    const parsed = JSON.parse(raw);
    const rawEntries = parsed.entries ?? [];
    const entries = Array.isArray(rawEntries)
      ? rawEntries
      : Object.values(rawEntries);
    const normalizedEntries = entries
      .filter((entry) => entry?.dateKey)
      .map(normalizeEntry);
    const normalizedUser = normalizeUser(parsed.user);

    return {
      user:
        normalizedUser && !normalizedUser.onboardingCompletedAt && normalizedEntries.length > 0
          ? {
              ...normalizedUser,
              onboardingCompletedAt:
                normalizedUser.createdAt ||
                normalizedEntries[0]?.completedAt ||
                normalizedEntries[0]?.intentionEnteredAt ||
                'migrated',
            }
          : normalizedUser,
      entries: normalizedEntries,
    };
  } catch {
    return { user: null, entries: [] };
  }
}

export function saveState(state) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!state.user && (state.entries ?? []).length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearState() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function getEntry(entries, dateKey) {
  const currentEntry = entries.find((entry) => entry.dateKey === dateKey);

  if (!currentEntry) {
    return createEmptyEntry(dateKey);
  }

  return normalizeEntry(currentEntry);
}

export function updateEntry(entries, dateKey, updater) {
  const currentEntry = getEntry(entries, dateKey);
  const nextEntry =
    typeof updater === 'function'
      ? updater(currentEntry)
      : { ...currentEntry, ...updater };
  const existingIndex = entries.findIndex((entry) => entry.dateKey === dateKey);

  if (existingIndex === -1) {
    return [...entries, nextEntry];
  }

  return entries.map((entry, index) =>
    index === existingIndex ? nextEntry : entry,
  );
}

export function removeEntry(entries, dateKey) {
  return entries.filter((entry) => entry.dateKey !== dateKey);
}
