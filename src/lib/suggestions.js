export const OTHER_FACTORS_LABEL = 'Other factors';
export const NOTHING_SIGNIFICANT_LABEL = 'Nothing significant';

const ROOT_CAUSE_SUGGESTIONS = {
  'Low energy': {
    observation: 'Energy dropped off',
    action: 'Begin with one small reset before anything else.',
  },
  'Other people': {
    observation: 'Today got pulled by interruptions',
    action: 'Protect one 30-minute block where nothing else can reach you.',
  },
  'Phone / social media': {
    observation: 'Your phone pulled attention away',
    action: 'Put one barrier between you and your phone before you start.',
  },
  Avoidance: {
    observation: 'You avoided starting what mattered',
    action: 'Start with just 5 minutes, with no pressure to finish.',
  },
  'Unplanned responsibilities': {
    observation: 'Other demands crowded the day',
    action: 'Choose one non-negotiable before the rest of the day fills up.',
  },
  'Lack of structure': {
    observation: 'The day never got a clear shape',
    action: 'Choose one time and one first step before the day begins.',
  },
  'Emotions / stress': {
    observation: 'Stress changed the shape of the day',
    action: 'Begin with one calming step before you ask more of yourself.',
  },
  [OTHER_FACTORS_LABEL]: {
    observation: 'Other factors shaped the misses today',
    action: 'Start with one small action that helps you re-engage.',
  },
};

const SUCCESS_SUGGESTIONS = {
  'I had a clear plan': {
    observation: 'A clear plan held the day together',
    action: "Set tomorrow's first move before the day starts.",
  },
  'I had enough energy': {
    observation: 'Your energy held up where it mattered',
    action: 'Begin with one small reset before anything else.',
  },
  'I protected my time': {
    observation: 'You protected the time the day needed',
    action: 'Protect one 30-minute block again tomorrow.',
  },
  'I stayed focused': {
    observation: 'You kept your attention where it mattered',
    action: 'Recreate one condition that made focus easier.',
  },
  'The day was manageable': {
    observation: 'The day stayed small enough to carry',
    action: 'Keep tomorrow small enough to carry.',
  },
  [OTHER_FACTORS_LABEL]: {
    observation: 'Something steady helped the day hold',
    action: 'Repeat one small thing that helped the day stay on track.',
  },
};

function formatPriorityLabel(count) {
  return count === 1 ? 'priority' : 'priorities';
}

function getSuccessReality(summary = {}) {
  const completedCount = summary.completedCount ?? 0;
  const total = summary.total ?? 0;

  if (!total) {
    return 'You followed through today.';
  }

  if (completedCount === total) {
    return total === 1
      ? 'You followed through on your priority.'
      : `You followed through on all ${total} priorities.`;
  }

  return `You followed through on ${completedCount} of ${total} priorities.`;
}

function getSlippedReality(summary = {}) {
  const slippedCount = summary.slippedCount ?? 0;
  const partialCount = summary.partialCount ?? 0;
  const missedCount = summary.missedCount ?? 0;

  if (slippedCount <= 0) {
    return '';
  }

  if (missedCount > 0 && partialCount > 0) {
    return `${slippedCount} ${formatPriorityLabel(slippedCount)} lost ground`;
  }

  if (missedCount > 0) {
    return slippedCount === 1
      ? '1 priority got pulled off course'
      : `${missedCount} ${formatPriorityLabel(missedCount)} got pulled off course`;
  }

  return partialCount === 1
    ? '1 priority only moved partway'
    : `${partialCount} ${formatPriorityLabel(partialCount)} only moved partway`;
}

function buildChallengeReality(rootCause, summary = {}) {
  if (isOtherFactors(rootCause)) {
    const slippedReality = getSlippedReality(summary);
    return slippedReality
      ? `${slippedReality.charAt(0).toUpperCase()}${slippedReality.slice(1)} today.`
      : 'Other factors shaped the misses today.';
  }

  const suggestion =
    ROOT_CAUSE_SUGGESTIONS[rootCause] ?? ROOT_CAUSE_SUGGESTIONS[OTHER_FACTORS_LABEL];
  const slippedReality = getSlippedReality(summary);

  if (!slippedReality) {
    return `${suggestion.observation}.`;
  }

  return `${suggestion.observation}, and ${slippedReality}.`;
}

function buildSuccessReality(successFactor, summary = {}) {
  const suggestion =
    SUCCESS_SUGGESTIONS[successFactor] ?? SUCCESS_SUGGESTIONS[OTHER_FACTORS_LABEL];

  return `${getSuccessReality(summary)} ${suggestion.observation}.`;
}

export function isOtherFactors(value) {
  return value === 'Other' || value === OTHER_FACTORS_LABEL;
}

export function formatOtherFactors(note = '') {
  return OTHER_FACTORS_LABEL;
}

function createDisplayValue(text) {
  return {
    text,
    isRawInput: false,
    label: '',
    note: '',
  };
}

function createOtherFactorsDisplay(note = '') {
  const rawNote = note.trim();

  return {
    text: OTHER_FACTORS_LABEL,
    isRawInput: true,
    label: rawNote ? `${OTHER_FACTORS_LABEL}:` : OTHER_FACTORS_LABEL,
    note: rawNote,
  };
}

export function getDistractionLabel(distraction, note = '') {
  if (isOtherFactors(distraction)) {
    return formatOtherFactors(note);
  }

  return distraction;
}

export function getRootCauseOptions(distractions = []) {
  const uniqueOptions = [
    ...new Set(
      distractions
        .filter(Boolean)
        .map((option) => (isOtherFactors(option) ? OTHER_FACTORS_LABEL : option)),
    ),
  ];

  if (!uniqueOptions.includes(OTHER_FACTORS_LABEL)) {
    uniqueOptions.push(OTHER_FACTORS_LABEL);
  }

  return uniqueOptions;
}

export function getSuggestedShift({
  rootCause,
  objectiveSummary = {},
  patternLine = '',
} = {}) {
  const normalizedRootCause = isOtherFactors(rootCause)
    ? OTHER_FACTORS_LABEL
    : rootCause;
  const suggestion =
    ROOT_CAUSE_SUGGESTIONS[normalizedRootCause] ??
    ROOT_CAUSE_SUGGESTIONS[OTHER_FACTORS_LABEL];

  return {
    reality: buildChallengeReality(normalizedRootCause, objectiveSummary),
    pattern: patternLine,
    action: suggestion.action,
  };
}

export function getSuccessSuggestion({
  successFactor,
  objectiveSummary = {},
  patternLine = '',
} = {}) {
  const suggestion =
    SUCCESS_SUGGESTIONS[successFactor] ?? SUCCESS_SUGGESTIONS[OTHER_FACTORS_LABEL];

  return {
    reality: buildSuccessReality(successFactor, objectiveSummary),
    pattern: patternLine,
    action: suggestion.action,
  };
}

export function getRootCauseLabel(rootCause, otherText = '') {
  if (isOtherFactors(rootCause)) {
    return formatOtherFactors(otherText);
  }

  return rootCause;
}

export function getSuccessFactorLabel(successFactor, note = '') {
  if (isOtherFactors(successFactor)) {
    return formatOtherFactors(note);
  }

  return successFactor;
}

export function getDistractionDisplay(distraction, note = '') {
  if (isOtherFactors(distraction)) {
    return createOtherFactorsDisplay(note);
  }

  return createDisplayValue(distraction);
}

export function getRootCauseDisplay(rootCause, otherText = '') {
  if (isOtherFactors(rootCause)) {
    return createOtherFactorsDisplay(otherText);
  }

  return createDisplayValue(rootCause);
}

export function getSuccessFactorDisplay(successFactor, note = '') {
  if (isOtherFactors(successFactor)) {
    return createOtherFactorsDisplay(note);
  }

  return createDisplayValue(successFactor);
}

export function getSupportPlanLabel(strategy, customText = '') {
  if (strategy === 'Other' && customText.trim()) {
    return customText.trim();
  }

  if (!strategy && customText.trim()) {
    return customText.trim();
  }

  if (strategy && customText.trim()) {
    return `${strategy}. Also: ${customText.trim()}`;
  }

  return strategy;
}
