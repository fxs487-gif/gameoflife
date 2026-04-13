import { normalizeOtherFactorsInput } from './history.js';

export const STORAGE_KEY = 'game-of-life-state';
export const SCHEMA_VERSION = 5;

const LEGACY_STORAGE_KEYS = ['game-of-life-state-v1'];

export function createEmptyState() {
  return {
    version: SCHEMA_VERSION,
    user: null,
    entries: [],
  };
}

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

function normalizeObjective(objective, index, useNeutralLensDefaults = false) {
  const label = objective?.label?.trim?.() ?? '';

  if (!label) {
    return null;
  }

  const normalizedLenses = Array.isArray(objective?.lenses)
    ? [...new Set(objective.lenses.filter(Boolean))]
    : [];
  const shouldUseNeutralRatings =
    useNeutralLensDefaults && Boolean(objective?.outcome);
  const normalizedOutcomes = Array.isArray(objective?.outcomes)
    ? [...new Set(objective.outcomes.map((value) => value?.trim?.()).filter(Boolean))]
    : [];

  return {
    id: objective?.id ?? `objective-${index + 1}`,
    label,
    section: objective?.section ?? 'Custom',
    custom: Boolean(objective?.custom),
    outcomes: normalizedOutcomes,
    lenses: normalizedLenses.length > 0 ? normalizedLenses : ['Deployment'],
    outcome: objective?.outcome ?? '',
    fulfillmentRating:
      objective?.fulfillmentRating ??
      (shouldUseNeutralRatings ? 'Medium' : ''),
    enjoymentRating:
      objective?.enjoymentRating ??
      (shouldUseNeutralRatings ? 'Medium' : ''),
    breakdownType: objective?.breakdownType ?? '',
    breakdownNote: objective?.breakdownNote ?? '',
  };
}

function normalizeEntry(entry, useNeutralLensDefaults = false) {
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
          .map((objective, index) =>
            normalizeObjective(objective, index, useNeutralLensDefaults),
          )
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
    enjoymentSignal: '',
    enjoymentText: '',
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

function getStoredStatePayload() {
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);

    if (raw) {
      return {
        raw,
        key,
      };
    }
  }

  return null;
}

function normalizeState(parsed) {
  const useNeutralLensDefaults = (parsed?.version ?? 0) < SCHEMA_VERSION;
  const rawEntries = parsed?.entries ?? [];
  const entries = Array.isArray(rawEntries)
    ? rawEntries
    : Object.values(rawEntries);
  const normalizedEntries = entries
    .filter((entry) => entry?.dateKey)
    .map((entry) => normalizeEntry(entry, useNeutralLensDefaults));
  const normalizedUser = normalizeUser(parsed?.user);
  const migratedUser =
    normalizedUser && !normalizedUser.onboardingCompletedAt && normalizedEntries.length > 0
      ? {
          ...normalizedUser,
          onboardingCompletedAt:
            normalizedUser.createdAt ||
            normalizedEntries[0]?.completedAt ||
            normalizedEntries[0]?.intentionEnteredAt ||
            'migrated',
        }
      : normalizedUser;

  return {
    version: SCHEMA_VERSION,
    user: migratedUser,
    entries: normalizedEntries,
  };
}

export function loadState() {
  if (typeof window === 'undefined') {
    return createEmptyState();
  }

  try {
    const stored = getStoredStatePayload();

    if (!stored) {
      return createEmptyState();
    }

    const parsed = JSON.parse(stored.raw);
    return normalizeState(parsed);
  } catch {
    return createEmptyState();
  }
}

export function saveState(state) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!state.user && (state.entries ?? []).length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    return;
  }

  const normalizedState = {
    version: SCHEMA_VERSION,
    user: normalizeUser(state.user),
    entries: Array.isArray(state.entries)
      ? state.entries.map(normalizeEntry)
      : [],
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedState));
  LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
}

export function clearState() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
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
