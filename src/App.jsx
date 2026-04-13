import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  BaselineRevealScreen,
  CommitmentCheckScreen,
  CommitmentScreen,
  CompleteScreen,
  DailyObjectivesScreen,
  DayPauseScreen,
  EnjoymentReflectionScreen,
  EmotionCheckInScreen,
  EveningReflectionScreen,
  FollowUpResultScreen,
  GapScreen,
  HomeScreen,
  IntroPromiseScreen,
  LandingPageScreen,
  LateIntentPromptScreen,
  LoginScreen,
  MirrorMomentScreen,
  MorningSupportScreen,
  ObjectiveOutcomeScreen,
  RecentDayDetailScreen,
  RecentDaysScreen,
  RootCauseScreen,
  ReturnMomentScreen,
  StartingPointIntroScreen,
  StartingPointPracticeScreen,
  StartingPointReadyScreen,
  SuccessReflectionScreen,
  SuggestedShiftScreen,
} from './components/screens.jsx';
import {
  getDateKey,
  getDateKeyFromIso,
  getShiftedDateKey,
  formatReadableDate,
  isEvening,
} from './lib/date.js';
import {
  createEmptyState,
  clearState,
  createEmptyEntry,
  getEntry,
  loadState,
  removeEntry,
  saveState,
  updateEntry,
} from './lib/storage.js';
import {
  BASELINE_DAYS,
  getAlignmentMetrics,
  getBaselineComparison,
  getBaselineStatusMessage,
  getBaselineSummary,
  getCelebrationSummary,
  getDayStatusCopy,
  getDayStatusHeadline,
  getDayStatus,
  getIdentityTrend,
  getHomeStateSummary,
  getMomentumSummary,
  getRecentAlignmentSummary,
  getHistoryDescription,
  getEnjoymentPatternSummary,
  getEntryOutcomeSummary,
  getLensInterpretation,
  getLensMetrics,
  getLensPatternInsight,
  getOutcomePatternInsight,
  getObjectiveSummary,
  getPatternSummary,
  getRepeatedOtherPattern,
  getRelativeDayLabel,
  normalizeOtherFactorsInput,
  getReviewableEntries,
} from './lib/history.js';
import {
  getDistractionDisplay,
  getEnjoymentDisplay,
  getRootCauseDisplay,
  getRootCauseOptions,
  getSuccessFactorDisplay,
  getSuccessSuggestion,
  getSuggestedShift,
  getSupportPlanLabel,
  NOTHING_SIGNIFICANT_LABEL,
} from './lib/suggestions.js';
import { EVENING_HOUR } from './options.js';

const APP_ENTRY_SESSION_KEY = 'game-of-life-entry';

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s/]/g, '').trim();
}

function getObjectiveLabels(objectives = []) {
  return objectives
    .map((objective) => objective?.label?.trim())
    .filter(Boolean);
}

function getObjectiveText(objectives = []) {
  return getObjectiveLabels(objectives).join(' ');
}

function getPrimaryDistraction(objectiveText, distractions) {
  if (!distractions.length) {
    return '';
  }

  const normalizedObjectives = normalizeText(objectiveText);
  const filtered = distractions.filter((option) => {
    const normalizedOption = normalizeText(option);
    return !normalizedOption || !normalizedObjectives.includes(normalizedOption);
  });

  return filtered[0] ?? distractions[0];
}

function getSecondaryDistractions(objectiveText, distractions, primaryDistraction) {
  const normalizedObjectives = normalizeText(objectiveText);

  return distractions.filter((option) => {
    if (option === primaryDistraction) {
      return false;
    }

    const normalizedOption = normalizeText(option);
    return !normalizedOption || !normalizedObjectives.includes(normalizedOption);
  });
}

function getPendingFollowUpKey(entries, yesterdayKey) {
  return entries.find(
    (entry) =>
      entry.dateKey === yesterdayKey &&
      entry.commitmentLocked &&
      entry.smallShift &&
      !entry.followUp,
  )?.dateKey;
}

function getRecentRepeatCount(entries, predicate, limit = 7) {
  return [...entries]
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey))
    .slice(0, limit)
    .filter(predicate).length;
}

function isCompletionForDate(entry, dateKey) {
  if (!entry.completedAt) {
    return false;
  }

  return getDateKeyFromIso(entry.completedAt) === dateKey;
}

function hasObjectives(entry) {
  return Array.isArray(entry.dailyObjectives) && entry.dailyObjectives.length > 0;
}

function hasObjectiveOutcomes(entry) {
  return (
    hasObjectives(entry) &&
    entry.dailyObjectives.every(
      (objective) =>
        Boolean(objective.outcome) &&
        Boolean(objective.fulfillmentRating) &&
        Boolean(objective.enjoymentRating),
    )
  );
}

function getObjectiveScore(objectives) {
  return objectives.reduce((total, objective) => {
    if (objective.outcome === 'Completed') {
      return total + 2;
    }

    if (objective.outcome === 'Partially') {
      return total + 1;
    }

    return total;
  }, 0);
}

function hasEnjoymentReflection(entry) {
  return Boolean(entry.enjoymentSignal || entry.enjoymentText?.trim());
}

function formatInlineList(items = []) {
  if (items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function getWorkedTodayMoments(entry, summary, enjoymentDisplay) {
  const moments = [];

  if (enjoymentDisplay) {
    moments.push({
      label: 'What felt right',
      value: enjoymentDisplay,
    });
  }

  if (entry.noSignificantChallenges && entry.successFactor) {
    moments.push({
      label: 'What held the day together',
      value: getSuccessFactorDisplay(entry.successFactor, entry.successNote),
    });
  } else if (summary.completedObjectives.length > 0) {
    moments.push({
      label: 'What still landed',
      value: formatInlineList(
        summary.completedObjectives.slice(0, 2).map((objective) => objective.label),
      ),
    });
  }

  return moments.slice(0, 2);
}

function getFlowScreen({ state, todayEntry, now, pendingFollowUpKey, override }) {
  const todayKey = getDateKey(now);

  if (override) {
    return override;
  }

  if (!state.user?.name) {
    return 'login';
  }

  if (pendingFollowUpKey) {
    return 'return-moment';
  }

  if (isCompletionForDate(todayEntry, todayKey)) {
    return 'complete';
  }

  if (!hasObjectives(todayEntry)) {
    return isEvening(now, EVENING_HOUR) ? 'late-intent-prompt' : 'morning';
  }

  if (!todayEntry.morningSupportStrategy && !todayEntry.morningSupportCustomText) {
    return 'morning-support';
  }

  if (!hasObjectiveOutcomes(todayEntry)) {
    return isEvening(now, EVENING_HOUR) ? 'objective-outcomes' : 'day-pause';
  }

  if (!todayEntry.reflection) {
    return isEvening(now, EVENING_HOUR) ? 'evening' : 'day-pause';
  }

  if (!hasEnjoymentReflection(todayEntry)) {
    return 'enjoyment';
  }

  if (!todayEntry.mirrorSeen) {
    return 'mirror';
  }

  if (!todayEntry.gapSeen) {
    return 'gap';
  }

  if (!todayEntry.emotion) {
    return 'emotion';
  }

  if (todayEntry.noSignificantChallenges && !todayEntry.successFactor) {
    return 'success-reflection';
  }

  if (!todayEntry.noSignificantChallenges && !todayEntry.rootCause) {
    return 'root-cause';
  }

  if (!todayEntry.smallShift) {
    return 'suggested-shift';
  }

  if (!todayEntry.commitmentLocked) {
    return 'commitment';
  }

  return 'complete';
}

function getCurrentScreen({ state, flowScreen, dashboardDismissed, override }) {
  if (override) {
    return override;
  }

  if (!state.user?.name) {
    return 'intro-promise';
  }

  if (!state.user.onboardingCompletedAt) {
    return 'intro-promise';
  }

  if (
    state.user.baseline?.status &&
    !state.user.baseline.revealedAt &&
    flowScreen !== 'complete'
  ) {
    return 'baseline-reveal';
  }

  if (!dashboardDismissed) {
    return 'home';
  }

  return flowScreen;
}

function getFrameClassName(screen, status) {
  const atmosphericScreens = new Set([
    'landing',
    'home',
    'mirror',
    'gap',
    'suggested-shift',
    'complete',
  ]);
  const normalizedStatus = (status || 'Mixed').toLowerCase();

  return [
    'app-frame',
    `screen-${screen}`,
    `state-${normalizedStatus}`,
    atmosphericScreens.has(screen) ? 'is-atmospheric' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export default function App() {
  const [state, setState] = useState(() => loadState());
  const [now, setNow] = useState(() => new Date());
  const [screenOverride, setScreenOverride] = useState(null);
  const [selectedHistoryDateKey, setSelectedHistoryDateKey] = useState('');
  const [dashboardDismissed, setDashboardDismissed] = useState(false);
  const [hasEnteredApp, setHasEnteredApp] = useState(() => {
    try {
      return window.sessionStorage.getItem(APP_ENTRY_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    try {
      if (hasEnteredApp) {
        window.sessionStorage.setItem(APP_ENTRY_SESSION_KEY, 'true');
      } else {
        window.sessionStorage.removeItem(APP_ENTRY_SESSION_KEY);
      }
    } catch {
      // Ignore session storage issues and keep the app usable.
    }
  }, [hasEnteredApp]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const todayKey = getDateKey(now);
  const yesterdayKey = getShiftedDateKey(now, -1);
  const todayEntry = getEntry(state.entries, todayKey);
  const todayObjectives = todayEntry.dailyObjectives ?? [];
  const pendingFollowUpKey = getPendingFollowUpKey(state.entries, yesterdayKey);
  const pendingFollowUpEntry = pendingFollowUpKey
    ? getEntry(state.entries, pendingFollowUpKey)
    : createEmptyEntry('');
  const yesterdayEntry = getEntry(state.entries, yesterdayKey);
  const yesterdayObjectives = getObjectiveLabels(yesterdayEntry.dailyObjectives ?? []);
  const reviewableEntries = getReviewableEntries(state.entries);
  const selectedHistoryEntry = selectedHistoryDateKey
    ? getEntry(state.entries, selectedHistoryDateKey)
    : createEmptyEntry('');
  const baselineSummary = getBaselineSummary(state.entries, BASELINE_DAYS);
  const patternSummary = getPatternSummary(reviewableEntries);
  const enjoymentPatternSummary = getEnjoymentPatternSummary(reviewableEntries);
  const lensPatternInsight = getLensPatternInsight(reviewableEntries);
  const outcomePatternInsight = getOutcomePatternInsight(reviewableEntries);
  const homeStateSummary = getHomeStateSummary(state.entries);
  const identityTrend = getIdentityTrend(state.entries);
  const recentAlignment = getRecentAlignmentSummary(state.entries);
  const celebration = getCelebrationSummary(state.entries);
  const repeatedOtherPattern = getRepeatedOtherPattern(reviewableEntries);
  const currentOtherPattern = getRepeatedOtherPattern(state.entries);
  const flowScreen = getFlowScreen({
    state,
    todayEntry,
    now,
    pendingFollowUpKey,
    override: screenOverride,
  });
  const currentScreen = getCurrentScreen({
    state,
    flowScreen,
    dashboardDismissed,
    override: screenOverride,
  });

  const objectiveSummary = getObjectiveSummary(todayEntry);
  const objectiveText = getObjectiveText(todayObjectives);
  const primaryDistraction = getPrimaryDistraction(
    objectiveText,
    todayEntry.reflection?.distractions ?? [],
  );
  const noSignificantChallenges = todayEntry.noSignificantChallenges;
  const secondaryDistractions = getSecondaryDistractions(
    objectiveText,
    todayEntry.reflection?.distractions ?? [],
    primaryDistraction,
  );
  const rootCauseOptions = getRootCauseOptions(
    todayEntry.reflection?.distractions ?? [],
  );
  const currentBreakdownRepeatCount =
    !noSignificantChallenges &&
    todayEntry.rootCause &&
    todayEntry.rootCause !== 'Other factors'
      ? getRecentRepeatCount(
          state.entries,
          (entry) =>
            !entry.noSignificantChallenges && Boolean(entry.rootCause) && entry.rootCause === todayEntry.rootCause,
        )
      : 0;
  const currentSuccessRepeatCount =
    noSignificantChallenges && todayEntry.successFactor
      ? getRecentRepeatCount(
          state.entries,
          (entry) =>
            entry.noSignificantChallenges &&
            Boolean(entry.successFactor) &&
            entry.successFactor === todayEntry.successFactor,
        )
      : 0;
  const currentOtherRepeatNotice =
    todayEntry.rootCause === 'Other factors' &&
    todayEntry.rootCauseOtherNormalized &&
    currentOtherPattern?.count >= 2 &&
    currentOtherPattern.normalizedPhrase &&
    (() => {
      const currentNote =
        todayEntry.rootCauseOtherNormalized ||
        normalizeOtherFactorsInput(todayEntry.rootCauseOtherText);
      return (
        currentNote.includes(currentOtherPattern.normalizedPhrase) ||
        currentOtherPattern.normalizedPhrase.includes(currentNote)
      );
    })()
      ? 'This has been showing up a few times.'
      : '';
  const currentBreakdownPatternLine = currentOtherRepeatNotice
    ? currentOtherRepeatNotice
    : currentBreakdownRepeatCount >= 2
      ? 'This keeps coming up.'
      : '';
  const currentSuccessPatternLine =
    currentSuccessRepeatCount >= 2 ? 'This has helped more than once.' : '';
  const suggestedShift = noSignificantChallenges
    ? getSuccessSuggestion({
        successFactor: todayEntry.successFactor,
        objectiveSummary,
        patternLine: currentSuccessPatternLine,
      })
    : getSuggestedShift({
        rootCause: todayEntry.rootCause,
        objectiveSummary,
        patternLine: currentBreakdownPatternLine,
      });
  const rootCauseLabel = noSignificantChallenges
    ? getSuccessFactorDisplay(todayEntry.successFactor, todayEntry.successNote)
    : getRootCauseDisplay(todayEntry.rootCause, todayEntry.rootCauseOtherText);
  const todayEnjoymentDisplay = hasEnjoymentReflection(todayEntry)
    ? getEnjoymentDisplay(todayEntry.enjoymentSignal, todayEntry.enjoymentText)
    : null;
  const formattedPrimaryDistraction = getDistractionDisplay(
    primaryDistraction,
    todayEntry.reflection?.notes ?? '',
  );
  const formattedSecondaryDistractions = secondaryDistractions.map((distraction) =>
    getDistractionDisplay(distraction, todayEntry.reflection?.notes ?? ''),
  );
  const slippedObjectives = [
    ...objectiveSummary.partialObjectives,
    ...objectiveSummary.missedObjectives,
  ].map((objective) => objective.label);
  const workedTodayMoments = getWorkedTodayMoments(
    todayEntry,
    objectiveSummary,
    todayEnjoymentDisplay,
  );
  const todayOutcomeSummary = getEntryOutcomeSummary(todayEntry);
  const todayLensMetrics = getLensMetrics(todayEntry);
  const todayLensInterpretation = getLensInterpretation(todayEntry);
  const todayStatus = getDayStatus(todayEntry);
  const alignment = getAlignmentMetrics(todayEntry);
  const momentumSummary = getMomentumSummary(state.entries);
  const hasHistory = reviewableEntries.length > 0;
  const dashboardPatternText = repeatedOtherPattern?.phrase ?? '';
  const homeTrend = identityTrend.ready ? identityTrend : null;
  const homeComparisonLine =
    state.user?.baseline?.revealedAt && baselineSummary.isReady
      ? getBaselineComparison(state.user.baseline.status, homeStateSummary.status)
      : '';
  const homeFocusActionLabel = todayObjectives.length > 0 ? 'Continue' : 'Set your objectives';
  const homePrimaryActionLabel =
    flowScreen === 'objective-outcomes' || flowScreen === 'evening'
      ? 'Start reflection'
      : 'Continue today';
  const frameStatus = currentScreen === 'home' ? homeStateSummary.status : todayStatus;
  const activeScreen = hasEnteredApp ? currentScreen : 'landing';
  const activeFrameStatus = hasEnteredApp ? frameStatus : homeStateSummary.status;
  const navigationKey = useMemo(
    () =>
      [
        activeScreen,
        activeScreen === 'recent-day-detail' ? selectedHistoryDateKey || 'none' : 'base',
        activeScreen === 'recent-days' ? reviewableEntries.length : 'stable',
        activeScreen === 'complete' ? todayEntry.completedAt || 'open' : 'flowing',
        todayKey,
      ].join(':'),
    [
      activeScreen,
      reviewableEntries.length,
      selectedHistoryDateKey,
      todayEntry.completedAt,
      todayKey,
    ],
  );

  useLayoutEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();

    const animationFrame = window.requestAnimationFrame(() => {
      resetScroll();
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [navigationKey]);

  useEffect(() => {
    if (!state.user?.name || !state.user.onboardingCompletedAt || !baselineSummary.isReady) {
      return;
    }

    const currentBaseline = state.user.baseline ?? {};
    const nextBreakdownKey = baselineSummary.breakdownPatterns.join('|');
    const currentBreakdownKey = (currentBaseline.breakdownPatterns ?? []).join('|');

    if (
      currentBaseline.status === baselineSummary.status &&
      currentBaseline.averageScore === baselineSummary.averageScore &&
      currentBaseline.daysCollected === baselineSummary.daysCollected &&
      currentBaseline.consistencyLine === baselineSummary.consistencyLine &&
      currentBreakdownKey === nextBreakdownKey
    ) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      user: {
        ...currentState.user,
        baseline: {
          ...(currentState.user?.baseline ?? {}),
          ...baselineSummary,
          calculatedAt:
            currentState.user?.baseline?.calculatedAt || new Date().toISOString(),
          revealedAt: currentState.user?.baseline?.revealedAt ?? '',
        },
      },
    }));
  }, [
    baselineSummary.averageScore,
    baselineSummary.consistencyLine,
    baselineSummary.daysCollected,
    baselineSummary.isReady,
    baselineSummary.status,
    baselineSummary.breakdownPatterns,
    state.user,
  ]);

  function patchEntry(dateKey, patch) {
    setState((currentState) => ({
      ...currentState,
      entries: updateEntry(currentState.entries, dateKey, patch),
    }));
  }

  function handleSaveObjectives({ dailyObjectives }, lateEntry = false) {
    patchEntry(todayKey, (entry) => ({
      ...entry,
      dailyObjectives: dailyObjectives.map((objective) => ({
        ...objective,
        outcomes: Array.isArray(objective.outcomes)
          ? [...new Set(objective.outcomes.map((value) => value?.trim?.()).filter(Boolean))]
          : [],
        lenses: objective.lenses?.length ? objective.lenses : ['Deployment'],
        outcome: '',
        fulfillmentRating: '',
        enjoymentRating: '',
      })),
      objectiveScore: 0,
      objectiveMaxScore: 0,
      intentionText: '',
      focusCategories: [],
      morningSupportStrategy: '',
      morningSupportCustomText: '',
      intentionEnteredAt: new Date().toISOString(),
      intentionEnteredLate: lateEntry,
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
      dayStatus: '',
      completedAt: '',
    }));

    setScreenOverride(null);
  }

  function handleSaveMorningSupport({
    morningSupportStrategy,
    morningSupportCustomText,
  }) {
    patchEntry(todayKey, {
      morningSupportStrategy,
      morningSupportCustomText,
    });
    setScreenOverride(null);
  }

  function handleSaveObjectiveOutcomes(dailyObjectives) {
    patchEntry(todayKey, (entry) => {
      const nextEntry = {
        ...entry,
        dailyObjectives,
        objectiveScore: getObjectiveScore(dailyObjectives),
        objectiveMaxScore: dailyObjectives.length * 2,
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
        dayStatus: '',
        completedAt: '',
      };

      return {
        ...nextEntry,
        dayStatus: getDayStatus(nextEntry),
      };
    });

    setScreenOverride('evening');
  }

  function handleSaveReflection(reflection) {
    const nextNoSignificantChallenges = reflection.distractions.includes(
      NOTHING_SIGNIFICANT_LABEL,
    );

    patchEntry(todayKey, (entry) => {
      const nextEntry = {
        ...entry,
        reflection,
        noSignificantChallenges: nextNoSignificantChallenges,
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
        completedAt: '',
      };

      return {
        ...nextEntry,
        dayStatus: getDayStatus(nextEntry),
      };
    });
    setScreenOverride(null);
  }

  function handleSaveEnjoyment({ enjoymentSignal, enjoymentText }) {
    patchEntry(todayKey, {
      enjoymentSignal,
      enjoymentText,
    });
    setScreenOverride(null);
  }

  function handleSaveRootCause({
    rootCause,
    rootCauseOtherText,
    rootCauseReasoning,
  }) {
    const nextSuggestion = getSuggestedShift({
      rootCause,
      objectiveSummary,
    }).action;

    patchEntry(todayKey, (entry) => ({
      ...entry,
      rootCause,
      rootCauseOtherText,
      rootCauseOtherNormalized: normalizeOtherFactorsInput(rootCauseOtherText),
      rootCauseReasoning,
      suggestedShift: nextSuggestion,
      shiftSource: '',
      smallShift: '',
      commitmentWindow: '',
      commitmentLocked: false,
      completedAt: '',
    }));
    setScreenOverride(null);
  }

  function handleSaveSuccessReflection({ successFactor, successNote }) {
    const nextSuggestion = getSuccessSuggestion({
      successFactor,
      objectiveSummary,
    }).action;

    patchEntry(todayKey, (entry) => ({
      ...entry,
      successFactor,
      successNote,
      suggestedShift: nextSuggestion,
      shiftSource: '',
      smallShift: '',
      commitmentWindow: '',
      commitmentLocked: false,
      completedAt: '',
    }));
    setScreenOverride(null);
  }

  function handleUseSuggestedShift(action) {
    patchEntry(todayKey, {
      suggestedShift: action,
      smallShift: action,
      shiftSource: 'suggested',
    });
    setScreenOverride(null);
  }

  function handleUseCustomShift(action, suggestionAction) {
    patchEntry(todayKey, {
      suggestedShift: suggestionAction,
      smallShift: action,
      shiftSource: 'custom',
    });
    setScreenOverride(null);
  }

  function openRecentDays() {
    setSelectedHistoryDateKey('');
    setScreenOverride('recent-days');
  }

  function openRecentDay(dateKey) {
    setSelectedHistoryDateKey(dateKey);
    setScreenOverride('recent-day-detail');
  }

  function handleStartOver() {
    setState((currentState) => ({
      ...currentState,
      entries: removeEntry(currentState.entries, todayKey),
    }));
    setDashboardDismissed(false);
    setScreenOverride(null);
    setSelectedHistoryDateKey('');
  }

  function handleResetAllData() {
    clearState();
    setState(createEmptyState());
    setDashboardDismissed(false);
    setScreenOverride(null);
    setSelectedHistoryDateKey('');
  }

  function continueFromHome() {
    setDashboardDismissed(true);
    setScreenOverride(null);
  }

  function renderScreen() {
    switch (currentScreen) {
      case 'intro-promise':
        return (
          <IntroPromiseScreen
            onContinue={() =>
              setScreenOverride(state.user?.name ? 'starting-point-intro' : 'login')
            }
          />
        );

      case 'login':
        return (
          <LoginScreen
            onSubmit={(name) => {
              setState((currentState) => ({
                ...currentState,
                user: {
                  name,
                  createdAt:
                    currentState.user?.createdAt ?? new Date().toISOString(),
                  onboardingCompletedAt: '',
                  startingSelfPerception: '',
                  baseline: {
                    daysCollected: 0,
                    status: '',
                    averageScore: 0,
                    breakdownPatterns: [],
                    consistencyLine: '',
                    calculatedAt: '',
                    revealedAt: '',
                  },
                },
              }));
              setDashboardDismissed(false);
              setScreenOverride('starting-point-intro');
            }}
          />
        );

      case 'starting-point-intro':
        return (
          <StartingPointIntroScreen
            onContinue={() => setScreenOverride('starting-point-practice')}
          />
        );

      case 'starting-point-practice':
        return (
          <StartingPointPracticeScreen
            initialFeeling={state.user.startingSelfPerception}
            onContinue={(startingSelfPerception) => {
              setState((currentState) => ({
                ...currentState,
                user: {
                  ...currentState.user,
                  startingSelfPerception,
                },
              }));
              setScreenOverride('starting-point-ready');
            }}
          />
        );

      case 'starting-point-ready':
        return (
          <StartingPointReadyScreen
            onStart={() => {
              setState((currentState) => ({
                ...currentState,
                user: {
                  ...currentState.user,
                  onboardingCompletedAt:
                    currentState.user?.onboardingCompletedAt || new Date().toISOString(),
                },
              }));
              setDashboardDismissed(false);
              setScreenOverride(null);
            }}
          />
        );

      case 'baseline-reveal':
        return (
          <BaselineRevealScreen
            status={state.user.baseline.status}
            message={getBaselineStatusMessage(state.user.baseline.status)}
            averageScore={state.user.baseline.averageScore}
            breakdownPatterns={state.user.baseline.breakdownPatterns}
            consistencyLine={state.user.baseline.consistencyLine}
            selfPerception={state.user.startingSelfPerception}
            onContinue={() => {
              setState((currentState) => ({
                ...currentState,
                user: {
                  ...currentState.user,
                  baseline: {
                    ...(currentState.user?.baseline ?? {}),
                    revealedAt:
                      currentState.user?.baseline?.revealedAt || new Date().toISOString(),
                  },
                },
              }));
              setDashboardDismissed(false);
              setScreenOverride(null);
            }}
          />
        );

      case 'home':
        return (
          <HomeScreen
            name={state.user.name}
            momentum={homeStateSummary}
            trend={homeTrend}
            energy={recentAlignment}
            trendDetailLine={homeTrend ? homeStateSummary.subtext : ''}
            comparisonLine={homeComparisonLine}
            objectives={getObjectiveLabels(todayObjectives)}
            carryoverAction={pendingFollowUpEntry.smallShift}
            repeatedPattern={dashboardPatternText}
            focusActionLabel={homeFocusActionLabel}
            primaryActionLabel={homePrimaryActionLabel}
            onFocusAction={continueFromHome}
            onCarryoverAction={continueFromHome}
            onPrimaryAction={continueFromHome}
            onViewHistory={hasHistory ? openRecentDays : null}
          />
        );

      case 'morning':
        return (
          <DailyObjectivesScreen
            name={state.user.name}
            initialObjectives={todayObjectives}
            previousObjectives={yesterdayObjectives}
            onSubmit={(payload) => handleSaveObjectives(payload, false)}
          />
        );

      case 'late-intent-prompt':
        return (
          <LateIntentPromptScreen
            name={state.user.name}
            onContinue={() => setScreenOverride('late-morning')}
          />
        );

      case 'late-morning':
        return (
          <DailyObjectivesScreen
            name={state.user.name}
            initialObjectives={todayObjectives}
            previousObjectives={yesterdayObjectives}
            onSubmit={(payload) => handleSaveObjectives(payload, true)}
            lateEntry
          />
        );

      case 'morning-support':
        return (
          <MorningSupportScreen
            name={state.user.name}
            initialStrategy={todayEntry.morningSupportStrategy}
            initialCustomText={todayEntry.morningSupportCustomText}
            onSubmit={handleSaveMorningSupport}
          />
        );

      case 'day-pause':
        return (
          <DayPauseScreen
            name={state.user.name}
            objectives={getObjectiveLabels(todayObjectives)}
            onReflectNow={() =>
              setScreenOverride(
                hasObjectiveOutcomes(todayEntry) ? 'evening' : 'objective-outcomes',
              )
            }
            onEdit={() => setScreenOverride('morning')}
            onViewHistory={hasHistory ? openRecentDays : null}
          />
        );

      case 'objective-outcomes':
        return (
          <ObjectiveOutcomeScreen
            name={state.user.name}
            objectives={todayObjectives}
            onSubmit={handleSaveObjectiveOutcomes}
          />
        );

      case 'evening':
        return (
          <EveningReflectionScreen
            name={state.user.name}
            objectives={todayObjectives}
            alignment={alignment}
            initialReflection={todayEntry.reflection}
            onSubmit={handleSaveReflection}
          />
        );

      case 'enjoyment':
        return (
          <EnjoymentReflectionScreen
            initialSignal={todayEntry.enjoymentSignal}
            initialText={todayEntry.enjoymentText}
            onSubmit={handleSaveEnjoyment}
          />
        );

      case 'mirror':
        return (
          <MirrorMomentScreen
            objectives={getObjectiveLabels(todayObjectives)}
            completedCount={objectiveSummary.completedCount}
            partialCount={objectiveSummary.partialCount}
            missedCount={objectiveSummary.missedCount}
            primaryDistraction={formattedPrimaryDistraction}
            secondaryDistractions={formattedSecondaryDistractions}
            noSignificantChallenges={noSignificantChallenges}
            onContinue={() =>
              patchEntry(todayKey, {
                mirrorSeen: true,
              })
            }
          />
        );

      case 'gap':
        return (
          <GapScreen
            objectives={getObjectiveLabels(todayObjectives)}
            slippedCount={objectiveSummary.slippedCount}
            gapText={formattedPrimaryDistraction}
            onContinue={() =>
              patchEntry(todayKey, {
                gapSeen: true,
              })
            }
          />
        );

      case 'emotion':
        return (
          <EmotionCheckInScreen
            initialEmotion={todayEntry.emotion}
            onSubmit={(emotion) =>
              patchEntry(todayKey, {
                emotion,
              })
            }
          />
        );

      case 'success-reflection':
        return (
          <SuccessReflectionScreen
            initialFactor={todayEntry.successFactor}
            initialNote={todayEntry.successNote}
            onSubmit={handleSaveSuccessReflection}
          />
        );

      case 'root-cause':
        return (
          <RootCauseScreen
            options={rootCauseOptions}
            affectedObjectives={slippedObjectives}
            initialCause={todayEntry.rootCause}
            initialOtherText={todayEntry.rootCauseOtherText}
            initialReasoning={todayEntry.rootCauseReasoning}
            onSubmit={handleSaveRootCause}
          />
        );

      case 'suggested-shift':
        return (
          <SuggestedShiftScreen
            variant={noSignificantChallenges ? 'success' : 'challenge'}
            rootCauseLabel={rootCauseLabel}
            workedMoments={workedTodayMoments}
            suggestion={suggestedShift}
            initialSource={todayEntry.shiftSource}
            initialCustomValue={
              todayEntry.shiftSource === 'custom' ? todayEntry.smallShift : ''
            }
            onUseSuggestion={() => handleUseSuggestedShift(suggestedShift.action)}
            onUseCustom={(action) =>
              handleUseCustomShift(action, suggestedShift.action)
            }
          />
        );

      case 'commitment':
        return (
          <CommitmentScreen
            action={todayEntry.smallShift}
            initialWindow={todayEntry.commitmentWindow}
            onEdit={() => setScreenOverride('suggested-shift')}
            onSubmit={(commitmentWindow) => {
              patchEntry(todayKey, {
                commitmentWindow,
                commitmentLocked: true,
                completedAt: new Date().toISOString(),
              });
              setScreenOverride(null);
            }}
          />
        );

      case 'return-moment':
        return (
          <ReturnMomentScreen onContinue={() => setScreenOverride('commitment-check')} />
        );

      case 'commitment-check':
        return (
          <CommitmentCheckScreen
            action={pendingFollowUpEntry.smallShift}
            onSubmit={(followUp) => {
              patchEntry(pendingFollowUpKey, {
                followUp,
              });
              setScreenOverride(
                followUp === 'Yes, I did it'
                  ? 'follow-through-win'
                  : 'follow-through-miss',
              );
            }}
          />
        );

      case 'follow-through-win':
      case 'follow-through-miss':
        return (
          <FollowUpResultScreen
            result={currentScreen === 'follow-through-win' ? 'Yes, I did it' : 'No'}
            onContinue={() => setScreenOverride(null)}
          />
        );

      case 'recent-days':
        return (
          <RecentDaysScreen
            trendSummary={identityTrend.recentDaysLine}
            patternSummary={patternSummary}
            enjoymentPatternSummary={enjoymentPatternSummary}
            repeatedOtherPattern={repeatedOtherPattern}
            lensPatternInsight={lensPatternInsight}
            outcomePatternInsight={outcomePatternInsight}
            entries={reviewableEntries.map((entry) => ({
              dateKey: entry.dateKey,
              dayLabel: getRelativeDayLabel(entry.dateKey, todayKey, yesterdayKey),
              status: getDayStatus(entry),
              description: getHistoryDescription(entry),
            }))}
            onSelectDay={openRecentDay}
            onClose={() => setScreenOverride(null)}
          />
        );

      case 'recent-day-detail':
          if (!selectedHistoryEntry.dateKey || !selectedHistoryEntry.reflection) {
            return (
              <RecentDaysScreen
                trendSummary={identityTrend.recentDaysLine}
                patternSummary={patternSummary}
                enjoymentPatternSummary={enjoymentPatternSummary}
                repeatedOtherPattern={repeatedOtherPattern}
                lensPatternInsight={lensPatternInsight}
                outcomePatternInsight={outcomePatternInsight}
                entries={reviewableEntries.map((entry) => ({
                  dateKey: entry.dateKey,
                dayLabel: getRelativeDayLabel(entry.dateKey, todayKey, yesterdayKey),
                status: getDayStatus(entry),
                description: getHistoryDescription(entry),
              }))}
              onSelectDay={openRecentDay}
              onClose={() => setScreenOverride(null)}
            />
          );
        }

        return (
          <RecentDayDetailScreen
            dayLabel={getRelativeDayLabel(
              selectedHistoryEntry.dateKey,
              todayKey,
              yesterdayKey,
            )}
            dateLabel={formatReadableDate(selectedHistoryEntry.dateKey)}
            status={getDayStatus(selectedHistoryEntry)}
            alignment={getAlignmentMetrics(selectedHistoryEntry)}
            lensMetrics={getLensMetrics(selectedHistoryEntry)}
            dayOutcomes={getEntryOutcomeSummary(selectedHistoryEntry).topOutcomes}
            objectives={selectedHistoryEntry.dailyObjectives ?? []}
            legacyIntention={selectedHistoryEntry.intentionText}
            morningSupport={getSupportPlanLabel(
              selectedHistoryEntry.morningSupportStrategy,
              selectedHistoryEntry.morningSupportCustomText,
            )}
            intentionalTime={selectedHistoryEntry.reflection?.intentionalTime ?? ''}
            passiveTime={selectedHistoryEntry.reflection?.passiveTime ?? ''}
            distractions={(selectedHistoryEntry.reflection?.distractions ?? []).map(
              (distraction) =>
                getDistractionDisplay(
                  distraction,
                  selectedHistoryEntry.reflection?.notes ?? '',
                ),
            )}
            enjoymentMoment={
              hasEnjoymentReflection(selectedHistoryEntry)
                ? getEnjoymentDisplay(
                    selectedHistoryEntry.enjoymentSignal,
                    selectedHistoryEntry.enjoymentText,
                  )
                : null
            }
            rootCause={getRootCauseDisplay(
              selectedHistoryEntry.rootCause,
              selectedHistoryEntry.rootCauseOtherText,
            )}
            successReflection={getSuccessFactorDisplay(
              selectedHistoryEntry.successFactor,
              selectedHistoryEntry.successNote,
            )}
            noSignificantChallenges={selectedHistoryEntry.noSignificantChallenges}
            committedAction={selectedHistoryEntry.smallShift}
            followUp={selectedHistoryEntry.followUp}
            onBack={() => setScreenOverride('recent-days')}
          />
        );

      case 'complete':
      default:
        return (
          <CompleteScreen
            name={state.user.name}
            dayStatus={todayStatus}
            dayStatusHeadline={getDayStatusHeadline(todayStatus)}
            dayStatusCopy={getDayStatusCopy(todayStatus)}
            alignment={alignment}
            lensMetrics={todayLensMetrics}
            lensInterpretation={todayLensInterpretation}
            dailyOutcomeSummary={todayOutcomeSummary}
            trendLine={identityTrend.completionLine || momentumSummary}
            celebration={celebration}
            enjoymentMoment={todayEnjoymentDisplay}
            smallShift={todayEntry.smallShift}
            commitmentWindow={todayEntry.commitmentWindow}
            onViewHistory={hasHistory ? openRecentDays : null}
            onStartOver={handleStartOver}
            onResetAllData={handleResetAllData}
          />
        );
    }
  }

  return (
    <div className={getFrameClassName(activeScreen, activeFrameStatus)}>
      <div key={navigationKey} className="screen-transition-layer">
        {hasEnteredApp ? (
          renderScreen()
        ) : (
          <LandingPageScreen onEnterApp={() => setHasEnteredApp(true)} />
        )}
      </div>
    </div>
  );
}
