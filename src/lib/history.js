import { formatReadableDate } from './date.js';
import {
  getDistractionLabel,
  OTHER_FACTORS_LABEL,
  getEnjoymentLabel,
  getRootCauseLabel,
  getSuccessFactorLabel,
} from './suggestions.js';

const TIME_RANK = {
  '0-1 hrs': 1,
  '1-3 hrs': 2,
  '3-5 hrs': 3,
  '5+ hrs': 4,
};

const OUTCOME_POINTS = {
  Completed: 2,
  Partially: 1,
  Missed: 0,
};

const LENS_POINTS = {
  Low: 0,
  Medium: 1,
  High: 2,
};

export const BASELINE_DAYS = 3;
export const IDENTITY_TREND_DAYS = 5;

const OTHER_PATTERN_PREFIXES = [
  'im ',
  'i am ',
  'feeling ',
  'feel ',
  'been ',
  'being ',
  'just ',
  'really ',
  'very ',
  'still ',
  'kind of ',
  'sort of ',
];

const MOVEMENT_OBJECTIVE_KEYWORDS = [
  'move your body',
  'walk',
  'run',
  'workout',
  'exercise',
  'gym',
  'stretch',
];

const CONNECTION_OBJECTIVE_KEYWORDS = [
  'be present with people',
  'people',
  'family',
  'friend',
  'partner',
  'connection',
];

function formatList(labels) {
  if (labels.length === 0) {
    return '';
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(', ')}, and ${labels.at(-1)}`;
}

function lowerCaseFirst(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
}

function upperCaseFirst(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCountLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function normalizeObjectiveOutcomes(outcomes = []) {
  return Array.isArray(outcomes)
    ? [...new Set(outcomes.map((value) => value?.trim?.()).filter(Boolean))]
    : [];
}

function objectiveMatchesKeywords(objective, keywords = []) {
  const label = objective?.label?.toLowerCase?.() ?? '';

  if (!label) {
    return false;
  }

  return keywords.some((keyword) => label.includes(keyword));
}

function hasObjectiveOutcomeWithKeywords(entry, outcome, keywords = []) {
  return (entry.dailyObjectives ?? []).some(
    (objective) =>
      normalizeObjectiveOutcomes(objective.outcomes).includes(outcome) &&
      objectiveMatchesKeywords(objective, keywords),
  );
}

function getAverageAlignmentRatio(entries) {
  return average(
    entries.map((entry) => {
      const alignment = getAlignmentMetrics(entry);
      return alignment.max ? alignment.score / alignment.max : 0;
    }),
  );
}

function getAverageLensRatio(entries, key) {
  return average(entries.map((entry) => getLensMetrics(entry)[key].ratio));
}

function getOrdinalLabel(value) {
  const remainder = value % 10;
  const teen = value % 100;

  if (remainder === 1 && teen !== 11) {
    return `${value}st`;
  }

  if (remainder === 2 && teen !== 12) {
    return `${value}nd`;
  }

  if (remainder === 3 && teen !== 13) {
    return `${value}rd`;
  }

  return `${value}th`;
}

function getTrailingStatusStreak(statuses, targetStatus) {
  let streak = 0;

  for (let index = statuses.length - 1; index >= 0; index -= 1) {
    if (statuses[index] !== targetStatus) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function getLeadingStatusStreak(statuses, targetStatus) {
  let streak = 0;

  for (let index = 0; index < statuses.length; index += 1) {
    if (statuses[index] !== targetStatus) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function getTrendWindows(values) {
  if (values.length <= 1) {
    return {
      olderValues: values,
      recentValues: values,
    };
  }

  const windowSize = Math.max(1, Math.floor(values.length / 2));

  return {
    olderValues: values.slice(0, windowSize),
    recentValues: values.slice(values.length - windowSize),
  };
}

function getStatusSummary(entries) {
  const counts = new Map([
    ['Architect-led', 0],
    ['Mixed', 0],
    ['Pulled', 0],
  ]);

  entries.forEach((entry) => {
    const status = getDayStatus(entry);
    counts.set(status, (counts.get(status) ?? 0) + 1);
  });

  return [...counts.entries()].sort((left, right) => {
    const countDelta = right[1] - left[1];

    if (countDelta !== 0) {
      return countDelta;
    }

    const leftRecentIndex = entries.findIndex(
      (entry) => getDayStatus(entry) === left[0],
    );
    const rightRecentIndex = entries.findIndex(
      (entry) => getDayStatus(entry) === right[0],
    );

    return leftRecentIndex - rightRecentIndex;
  })[0][0];
}

export function normalizeOtherFactorsInput(value = '') {
  return value
    .toLowerCase()
    .replace(/[.,!?;:'"()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getOtherPatternPhrase(normalizedValue = '') {
  let phrase = normalizedValue;
  let updated = true;

  while (updated && phrase) {
    updated = false;

    for (const prefix of OTHER_PATTERN_PREFIXES) {
      if (phrase.startsWith(prefix) && phrase.length > prefix.length) {
        phrase = phrase.slice(prefix.length).trim();
        updated = true;
        break;
      }
    }
  }

  return phrase || normalizedValue;
}

function isOtherPatternMatch(left, right) {
  return left === right || left.includes(right) || right.includes(left);
}

function getRecentOtherEntries(entries, limit = 7) {
  return [...entries]
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey))
    .slice(0, limit)
    .filter(
      (entry) =>
        entry.rootCause === OTHER_FACTORS_LABEL &&
        normalizeOtherFactorsInput(
          entry.rootCauseOtherNormalized || entry.rootCauseOtherText,
        ),
    )
    .map((entry) => {
      const normalized =
        normalizeOtherFactorsInput(
          entry.rootCauseOtherNormalized || entry.rootCauseOtherText,
        );

      return {
        dateKey: entry.dateKey,
        normalized,
        phrase: getOtherPatternPhrase(normalized),
      };
    });
}

export function getRepeatedOtherPattern(entries, limit = 7) {
  const recentOtherEntries = getRecentOtherEntries(entries, limit);

  if (recentOtherEntries.length < 2) {
    return null;
  }

  const groups = [];

  recentOtherEntries.forEach((entry) => {
    const group = groups.find(
      (currentGroup) =>
        isOtherPatternMatch(entry.phrase, currentGroup.phrase) ||
        isOtherPatternMatch(entry.normalized, currentGroup.phrase),
    );

    if (group) {
      group.count += 1;
      group.dateKeys.push(entry.dateKey);
      group.normalizedValues.push(entry.normalized);

      if (
        entry.phrase.length < group.phrase.length &&
        isOtherPatternMatch(entry.phrase, group.phrase)
      ) {
        group.phrase = entry.phrase;
      }

      return;
    }

    groups.push({
      phrase: entry.phrase,
      count: 1,
      dateKeys: [entry.dateKey],
      normalizedValues: [entry.normalized],
    });
  });

  const repeatedGroup = groups
    .filter((group) => group.count >= 2)
    .sort(
      (left, right) =>
        right.count - left.count ||
        right.dateKeys[0].localeCompare(left.dateKeys[0]) ||
        left.phrase.localeCompare(right.phrase),
    )[0];

  if (!repeatedGroup) {
    return null;
  }

  return {
    phrase: upperCaseFirst(repeatedGroup.phrase),
    normalizedPhrase: repeatedGroup.phrase,
    count: repeatedGroup.count,
    windowSize: recentOtherEntries.length,
  };
}

function getTimeAlignmentMetrics(entry) {
  const intentionalRank = TIME_RANK[entry.reflection?.intentionalTime] ?? 0;
  const passiveRank = TIME_RANK[entry.reflection?.passiveTime] ?? 0;
  const total = intentionalRank + passiveRank;

  if (!total) {
    return {
      score: 0,
      max: 10,
      ratio: 0,
      filledSegments: 0,
      hasObjectiveScore: false,
    };
  }

  const score = Math.max(1, Math.min(10, Math.round((intentionalRank / total) * 10)));

  return {
    score,
    max: 10,
    ratio: intentionalRank / total,
    filledSegments: score,
    hasObjectiveScore: false,
  };
}

function calculateLegacyDayStatus(entry) {
  const intentionalRank = TIME_RANK[entry.reflection?.intentionalTime] ?? 0;
  const passiveRank = TIME_RANK[entry.reflection?.passiveTime] ?? 0;

  if (intentionalRank > passiveRank) {
    return 'Architect-led';
  }

  if (passiveRank > intentionalRank) {
    return 'Pulled';
  }

  return 'Mixed';
}

function getFilledSegments(ratio, score) {
  if (!ratio || !score) {
    return 0;
  }

  return Math.max(1, Math.min(10, Math.round(ratio * 10)));
}

function getLensLevel(ratio) {
  if (ratio >= 0.72) {
    return 'High';
  }

  if (ratio >= 0.4) {
    return 'Moderate';
  }

  return 'Low';
}

function createLensMetric(score, max, label) {
  const ratio = max ? score / max : 0;
  const normalizedScore = max ? Math.max(0, Math.round(ratio * 10)) : 0;

  return {
    label,
    score: normalizedScore,
    max: 10,
    ratio,
    filledSegments: getFilledSegments(ratio, normalizedScore),
    level: getLensLevel(ratio),
  };
}

function createNeutralLensMetric(label) {
  return {
    label,
    score: 5,
    max: 10,
    ratio: 0.5,
    filledSegments: 5,
    level: 'Moderate',
  };
}

export function getObjectiveLensRating(objective, key) {
  const value = objective?.[key] ?? '';

  if (LENS_POINTS[value] !== undefined) {
    return value;
  }

  return objective?.outcome ? 'Medium' : '';
}

export function getObjectiveSummary(entry) {
  const objectives = Array.isArray(entry.dailyObjectives)
    ? entry.dailyObjectives.filter((objective) => objective?.label)
    : [];
  const completedObjectives = objectives.filter(
    (objective) => objective.outcome === 'Completed',
  );
  const partialObjectives = objectives.filter(
    (objective) => objective.outcome === 'Partially',
  );
  const missedObjectives = objectives.filter(
    (objective) => objective.outcome === 'Missed',
  );

  return {
    objectives,
    total: objectives.length,
    completedObjectives,
    partialObjectives,
    missedObjectives,
    completedCount: completedObjectives.length,
    partialCount: partialObjectives.length,
    missedCount: missedObjectives.length,
    slippedCount: partialObjectives.length + missedObjectives.length,
  };
}

export function getEntryOutcomeSummary(entry, limit = 3) {
  const counts = new Map();

  getObjectiveSummary(entry).objectives
    .filter((objective) => objective.outcome !== 'Missed')
    .forEach((objective) => {
      const weight = objective.outcome === 'Completed' ? 2 : 1;

      normalizeObjectiveOutcomes(objective.outcomes).forEach((outcome) => {
        counts.set(outcome, (counts.get(outcome) ?? 0) + weight);
      });
    });

  const ranked = [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );

  return {
    hasOutcomes: ranked.length > 0,
    totalSelections: ranked.reduce((total, [, count]) => total + count, 0),
    counts: ranked,
    topOutcomes: ranked.slice(0, limit).map(([label]) => label),
  };
}

export function getAlignmentMetrics(entry) {
  const summary = getObjectiveSummary(entry);
  const hasObjectiveOutcomes =
    summary.total > 0 &&
    summary.objectives.every((objective) => OUTCOME_POINTS[objective.outcome] !== undefined);

  if (!hasObjectiveOutcomes) {
    return getTimeAlignmentMetrics(entry);
  }

  const score = summary.objectives.reduce(
    (total, objective) => total + OUTCOME_POINTS[objective.outcome],
    0,
  );
  const max = summary.total * 2;
  const ratio = max ? score / max : 0;

  return {
    score,
    max,
    ratio,
    filledSegments: getFilledSegments(ratio, score),
    hasObjectiveScore: true,
  };
}

export function getLensMetrics(entry) {
  const summary = getObjectiveSummary(entry);

  if (summary.total === 0) {
    const deployment = getAlignmentMetrics(entry);

    return {
      deployment: {
        ...deployment,
        label: 'Deployment',
        level: getLensLevel(deployment.ratio ?? 0),
      },
      fulfillment: createNeutralLensMetric('Fulfillment'),
      enjoyment: createNeutralLensMetric('Enjoyment'),
    };
  }

  const lensMax = summary.total * 2;
  const deployment = getAlignmentMetrics(entry);
  const fulfillmentScore = summary.objectives.reduce(
    (total, objective) =>
      total + (LENS_POINTS[getObjectiveLensRating(objective, 'fulfillmentRating')] ?? 0),
    0,
  );
  const enjoymentScore = summary.objectives.reduce(
    (total, objective) =>
      total + (LENS_POINTS[getObjectiveLensRating(objective, 'enjoymentRating')] ?? 0),
    0,
  );

  return {
    deployment: {
      ...deployment,
      label: 'Deployment',
      level: getLensLevel(deployment.ratio ?? 0),
    },
    fulfillment: createLensMetric(fulfillmentScore, lensMax, 'Fulfillment'),
    enjoyment: createLensMetric(enjoymentScore, lensMax, 'Enjoyment'),
  };
}

export function getLensInterpretation(entry) {
  const { deployment, fulfillment, enjoyment } = getLensMetrics(entry);
  const tightlyAligned =
    Math.abs(deployment.ratio - fulfillment.ratio) <= 0.12 &&
    Math.abs(deployment.ratio - enjoyment.ratio) <= 0.12 &&
    deployment.ratio >= 0.55;

  if (deployment.level === 'High' && enjoyment.level === 'Low') {
    return 'High deployment + low enjoyment';
  }

  if (deployment.level === 'High' && fulfillment.level === 'Low') {
    return 'Low fulfillment despite completion';
  }

  if (tightlyAligned) {
    return 'Balanced day';
  }

  if (fulfillment.level === 'High' && enjoyment.level === 'High') {
    return 'Meaning and enjoyment stayed strong';
  }

  if (fulfillment.level === 'High' && deployment.level === 'Low') {
    return 'What mattered felt clearer than what got finished';
  }

  if (deployment.level === 'High') {
    return 'Execution carried more of the day than meaning or enjoyment';
  }

  return 'The lenses were pulling in different directions';
}

function calculateDayStatus(entry) {
  const alignment = getAlignmentMetrics(entry);

  if (alignment.hasObjectiveScore && alignment.max > 0) {
    if (alignment.ratio >= 0.75) {
      return 'Architect-led';
    }

    if (alignment.ratio >= 0.4) {
      return 'Mixed';
    }

    return 'Pulled';
  }

  return calculateLegacyDayStatus(entry);
}

export function getDayStatus(entry) {
  return entry.dayStatus || calculateDayStatus(entry);
}

export function getDayStatusCopy(status) {
  if (status === 'Architect-led') {
    return 'Today was mostly shaped by the objectives you set.';
  }

  if (status === 'Pulled') {
    return 'Today was shaped more by what pulled you away than by the objectives you set.';
  }

  return 'Some objectives held, and some were pulled away.';
}

export function getDayStatusHeadline(status) {
  if (status === 'Architect-led') {
    return 'You stayed in control today';
  }

  if (status === 'Pulled') {
    return 'Today pulled you off course';
  }

  return 'Parts of today went your way';
}

export function getHomeStateSummary(entries, limit = 3) {
  const recentEntries = getReviewableEntries(entries).slice(0, limit);

  if (recentEntries.length === 0) {
    return {
      status: 'Mixed',
      headline: 'Starting point in progress',
      subtext: `0 of ${limit} days logged so far.`,
    };
  }

  if (recentEntries.length < limit) {
    return {
      status: 'Mixed',
      headline: 'Starting point in progress',
      subtext: `${recentEntries.length} of ${limit} days logged so far.`,
    };
  }

  const status = getStatusSummary(recentEntries);

  const architectLedCount = recentEntries.filter(
    (entry) => getDayStatus(entry) === 'Architect-led',
  ).length;

  return {
    status,
    headline:
      status === 'Architect-led'
        ? "You're in control lately"
        : status === 'Pulled'
          ? "You've been pulled off course recently"
          : 'Things have been mixed',
    subtext: `${formatCountLabel(
      architectLedCount,
      'day',
    )} of your last ${recentEntries.length} ${
      recentEntries.length === 1 ? 'day' : 'days'
    } followed through.`,
  };
}

export function getIdentityTrend(entries, limit = IDENTITY_TREND_DAYS) {
  const recentEntries = getReviewableEntries(entries).slice(0, limit).reverse();
  const sampleSize = recentEntries.length;

  if (sampleSize === 0) {
    return {
      ready: false,
      sampleSize: 0,
      state: 'Stable',
      message: "You're holding steady",
      subtext: 'Still building the pattern.',
      recentDaysLine: 'Still building the pattern from recent days.',
      detailLine: '',
      completionLine: '',
    };
  }

  const alignmentRatios = recentEntries.map((entry) => {
    const alignment = getAlignmentMetrics(entry);
    return alignment.max ? alignment.score / alignment.max : 0;
  });
  const statuses = recentEntries.map((entry) => getDayStatus(entry));
  const architectLedCount = statuses.filter(
    (status) => status === 'Architect-led',
  ).length;
  const { olderValues, recentValues } = getTrendWindows(alignmentRatios);
  const olderAverage = average(olderValues);
  const recentAverage = average(recentValues);
  const overallAverage = average(alignmentRatios);
  const range = Math.max(...alignmentRatios) - Math.min(...alignmentRatios);
  const latestScore = alignmentRatios.at(-1) ?? 0;
  const firstScore = alignmentRatios[0] ?? latestScore;
  const latestStatus = statuses.at(-1) ?? 'Mixed';
  const architectLedStreak = getTrailingStatusStreak(statuses, 'Architect-led');
  const pulledStreak = getTrailingStatusStreak(statuses, 'Pulled');
  const clearImprovement =
    sampleSize >= 3 &&
    (recentAverage - olderAverage >= 0.12 ||
      (latestScore - firstScore >= 0.18 && latestStatus !== 'Pulled'));
  const clearDecline =
    sampleSize >= 3 &&
    (olderAverage - recentAverage >= 0.12 ||
      (firstScore - latestScore >= 0.18 && latestStatus === 'Pulled') ||
      (pulledStreak >= 2 && recentAverage < olderAverage));
  const consistentHigh =
    sampleSize >= 3 && overallAverage >= 0.75 && range <= 0.18;

  let state = 'Stable';

  if (!consistentHigh && clearImprovement) {
    state = 'Improving';
  } else if (!consistentHigh && clearDecline) {
    state = 'Declining';
  }

  const message =
    state === 'Improving'
      ? "You're becoming more consistent"
      : state === 'Declining'
        ? "You've been drifting lately"
        : "You're holding steady";
  const subtext =
    state === 'Improving'
      ? 'The last few days are trending upward.'
      : state === 'Declining'
        ? "There's been some drift recently."
        : 'Your days have been consistent.';

  let completionLine = '';

  if (architectLedStreak >= 2) {
    completionLine = `This is your ${getOrdinalLabel(
      architectLedStreak,
    )} day in control.`;
  } else if (sampleSize === 1) {
    completionLine = 'This is the first day in the pattern.';
  } else if (state === 'Improving') {
    completionLine = 'This continues the upward trend.';
  } else if (state === 'Declining') {
    completionLine = "There's been some drift over the last few days.";
  } else if (sampleSize >= 3 && range > 0.18) {
    completionLine = 'This has been inconsistent over the last few days.';
  } else if (sampleSize >= 2) {
    completionLine = 'This has been steady over the last few days.';
  }

  return {
    ready: sampleSize >= 3,
    sampleSize,
    state,
    message,
    subtext,
    recentDaysLine:
      state === 'Improving'
        ? "You're becoming more consistent over the last few days."
        : state === 'Declining'
          ? 'Things have been drifting lately.'
          : 'Things have been holding steady.',
    detailLine: `${formatCountLabel(
      architectLedCount,
      'day',
    )} of your last ${sampleSize} ${
      sampleSize === 1 ? 'day' : 'days'
    } followed through.`,
    completionLine,
  };
}

export function getBaselineSummary(entries, limit = BASELINE_DAYS) {
  const baselineEntries = [...getReviewableEntries(entries)]
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
    .slice(0, limit);
  const daysCollected = baselineEntries.length;

  if (daysCollected === 0) {
    return {
      isReady: false,
      daysCollected: 0,
      status: '',
      averageScore: 0,
      breakdownPatterns: [],
      consistencyLine: '',
    };
  }

  const status = getStatusSummary(baselineEntries);
  const averageScore = Number(
    (
      baselineEntries.reduce((total, entry) => {
        const alignment = getAlignmentMetrics(entry);
        const normalizedScore = alignment.max ? (alignment.score / alignment.max) * 10 : 0;
        return total + normalizedScore;
      }, 0) / daysCollected
    ).toFixed(1),
  );
  const breakdownCounts = new Map();

  baselineEntries.forEach((entry) => {
    if (entry.noSignificantChallenges || !entry.rootCause) {
      return;
    }

    const label = getRootCauseLabel(entry.rootCause, entry.rootCauseOtherText);
    breakdownCounts.set(label, (breakdownCounts.get(label) ?? 0) + 1);
  });

  const breakdownPatterns = [...breakdownCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([label]) => label);

  const architectLedCount = baselineEntries.filter(
    (entry) => getDayStatus(entry) === 'Architect-led',
  ).length;

  return {
    isReady: daysCollected >= limit,
    daysCollected,
    status,
    averageScore,
    breakdownPatterns,
    consistencyLine: `${formatCountLabel(
      architectLedCount,
      'day',
    )} of your first ${daysCollected} ${
      daysCollected === 1 ? 'day' : 'days'
    } stayed in control.`,
  };
}

export function getBaselineStatusMessage(status) {
  if (status === 'Architect-led') {
    return "You've mostly been in control";
  }

  if (status === 'Pulled') {
    return "You've mostly been pulled off course";
  }

  return 'Things have been mixed';
}

export function getBaselineComparison(baselineStatus, currentStatus) {
  if (!baselineStatus || !currentStatus || baselineStatus === currentStatus) {
    return '';
  }

  return `You were mostly ${baselineStatus} to start. You're now trending ${currentStatus}.`;
}

export function getMomentumSummary(entries, limit = 3) {
  const recentEntries = getReviewableEntries(entries).slice(0, limit);

  if (recentEntries.length === 0) {
    return '';
  }

  if (recentEntries.length === 1) {
    return 'This is the first day in the pattern.';
  }

  const architectLedCount = recentEntries.filter(
    (entry) => getDayStatus(entry) === 'Architect-led',
  ).length;

  return `You've been in control ${architectLedCount} of the last ${recentEntries.length} days.`;
}

export function getRecentAlignmentSummary(entries, limit = 3) {
  const recentEntries = getReviewableEntries(entries).slice(0, limit);

  if (recentEntries.length === 0) {
    return {
      score: 0,
      max: 10,
      ratio: 0,
      filledSegments: 0,
    };
  }

  const averageRatio =
    recentEntries.reduce((total, entry) => {
      const alignment = getAlignmentMetrics(entry);
      return total + (alignment.max ? alignment.score / alignment.max : 0);
    }, 0) / recentEntries.length;
  const score = Math.max(1, Math.min(10, Math.round(averageRatio * 10)));

  return {
    score,
    max: 10,
    ratio: averageRatio,
    filledSegments: getFilledSegments(averageRatio, score),
  };
}

export function getCelebrationSummary(entries, weeklyLimit = 7) {
  const recentEntries = getReviewableEntries(entries);

  if (recentEntries.length === 0) {
    return {
      isStrongDay: false,
      primaryMessage: '',
      subtext: '',
      alignmentLine: '',
      enjoymentMoment: '',
      reinforcement: '',
      streakLine: '',
      weeklyLine: '',
    };
  }

  const todayEntry = recentEntries[0];
  const todayStatus = getDayStatus(todayEntry);
  const todayAlignment = getAlignmentMetrics(todayEntry);
  const isStrongDay =
    todayStatus === 'Architect-led' ||
    (todayAlignment.max > 0 && todayAlignment.score / todayAlignment.max >= 0.75);

  if (!isStrongDay) {
    return {
      isStrongDay: false,
      primaryMessage: '',
      subtext: '',
      alignmentLine: '',
      enjoymentMoment: '',
      reinforcement: '',
      streakLine: '',
      weeklyLine: '',
    };
  }

  const statuses = recentEntries.map((entry) => getDayStatus(entry));
  const architectLedStreak = getLeadingStatusStreak(statuses, 'Architect-led');
  const recentArchitectLedCount = recentEntries
    .slice(0, weeklyLimit)
    .filter((entry) => getDayStatus(entry) === 'Architect-led').length;
  const enjoymentMoment = getEnjoymentLabel(
    todayEntry.enjoymentSignal,
    todayEntry.enjoymentText,
  );

  return {
    isStrongDay: true,
    primaryMessage: 'You stayed in control today.',
    subtext: 'You followed through on what mattered.',
    alignmentLine: enjoymentMoment
      ? "You didn't just stay in control. You felt it."
      : 'Parts of your day actually felt right.',
    enjoymentMoment,
    reinforcement: 'This is how control gets built.',
    streakLine:
      architectLedStreak >= 2 ? `${architectLedStreak} days in a row.` : '',
    weeklyLine:
      recentArchitectLedCount >= 3
        ? "You've been showing up for yourself this week."
        : '',
  };
}

export function getHistoryDescription(entry) {
  const { total, completedCount, slippedCount } = getObjectiveSummary(entry);
  const lensMetrics = getLensMetrics(entry);
  if (entry.noSignificantChallenges) {
    return total
      ? lensMetrics.enjoyment.level === 'High'
        ? `Completed ${completedCount} of ${total} objectives with strong enjoyment`
        : `Completed ${completedCount} of ${total} objectives`
      : 'Followed through on planned priorities';
  }

  const distractions = (entry.reflection?.distractions ?? [])
    .filter(Boolean)
    .slice(0, 2)
    .map((distraction) =>
      lowerCaseFirst(getDistractionLabel(distraction, entry.reflection?.notes ?? '')),
    );
  const distractionText = formatList(distractions);
  const status = getDayStatus(entry);
  const progressText = total
    ? `Completed ${completedCount} of ${total} objectives`
    : 'Followed through on planned priorities';

  if (status === 'Pulled') {
    return distractionText
      ? `Pulled by ${distractionText}`
      : slippedCount
        ? `${slippedCount} ${slippedCount === 1 ? 'objective was' : 'objectives were'} pulled off course`
        : 'Pulled away from planned priorities';
  }

  if (status === 'Architect-led') {
    return lensMetrics.fulfillment.level === 'Low'
      ? `${progressText}. Completion outweighed meaning`
      : progressText;
  }

  return distractionText
    ? `${progressText}. Pulled by ${distractionText}`
    : progressText;
}

export function getRelativeDayLabel(dateKey, todayKey, yesterdayKey) {
  if (dateKey === todayKey) {
    return 'Today';
  }

  if (dateKey === yesterdayKey) {
    return 'Yesterday';
  }

  return formatReadableDate(dateKey);
}

export function getReviewableEntries(entries) {
  return [...entries]
    .filter((entry) => entry.reflection && entry.smallShift)
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey));
}

export function getPatternSummary(entries) {
  const counts = new Map();

  entries.forEach((entry) => {
    const label = entry.noSignificantChallenges
      ? getSuccessFactorLabel(entry.successFactor, entry.successNote)
      : getRootCauseLabel(entry.rootCause, entry.rootCauseOtherText);

    if (!label) {
      return;
    }

    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([label]) => label);
}

export function getEnjoymentPatternSummary(entries) {
  const counts = new Map();

  entries.forEach((entry) => {
    const label = getEnjoymentLabel(entry.enjoymentSignal, entry.enjoymentText);

    if (!label) {
      return;
    }

    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([label]) => label);
}

export function getLensPatternInsight(entries, limit = 5) {
  const recentEntries = getReviewableEntries(entries).slice(0, limit);

  if (recentEntries.length < 2) {
    return {
      line: '',
      sampleSize: recentEntries.length,
    };
  }

  const totals = recentEntries.reduce(
    (running, entry) => {
      const metrics = getLensMetrics(entry);

      return {
        deployment: running.deployment + metrics.deployment.ratio,
        fulfillment: running.fulfillment + metrics.fulfillment.ratio,
        enjoyment: running.enjoyment + metrics.enjoyment.ratio,
      };
    },
    {
      deployment: 0,
      fulfillment: 0,
      enjoyment: 0,
    },
  );

  const averages = {
    deployment: totals.deployment / recentEntries.length,
    fulfillment: totals.fulfillment / recentEntries.length,
    enjoyment: totals.enjoyment / recentEntries.length,
  };
  const deploymentLevel = getLensLevel(averages.deployment);
  const fulfillmentLevel = getLensLevel(averages.fulfillment);
  const enjoymentLevel = getLensLevel(averages.enjoyment);
  const balanced =
    Math.abs(averages.deployment - averages.fulfillment) <= 0.12 &&
    Math.abs(averages.deployment - averages.enjoyment) <= 0.12;

  let line = '';

  if (deploymentLevel === 'High' && enjoymentLevel === 'Low') {
    line = 'You consistently complete what you set, but enjoyment has been low.';
  } else if (deploymentLevel === 'High' && fulfillmentLevel === 'Low') {
    line = "You consistently complete tasks, but they haven't felt very meaningful.";
  } else if (
    fulfillmentLevel === 'High' &&
    enjoymentLevel === 'High' &&
    deploymentLevel === 'Moderate'
  ) {
    line = 'You feel best on days with high fulfillment and moderate deployment.';
  } else if (balanced) {
    line = 'Your recent days have been fairly balanced across deployment, fulfillment, and enjoyment.';
  } else if (fulfillmentLevel === 'High' && enjoymentLevel === 'High') {
    line = 'You tend to feel best when meaning and enjoyment stay high together.';
  } else if (deploymentLevel === 'Low' && fulfillmentLevel === 'High') {
    line = 'What matters has been clearer than what actually gets finished.';
  } else if (deploymentLevel === 'High') {
    line = 'Execution has been stronger than fulfillment or enjoyment lately.';
  } else {
    line = 'The three lenses have been uneven lately.';
  }

  return {
    line,
    sampleSize: recentEntries.length,
    deployment: createLensMetric(averages.deployment * 10, 10, 'Deployment'),
    fulfillment: createLensMetric(averages.fulfillment * 10, 10, 'Fulfillment'),
    enjoyment: createLensMetric(averages.enjoyment * 10, 10, 'Enjoyment'),
  };
}

export function getOutcomePatternInsight(entries, limit = 7) {
  const recentEntries = getReviewableEntries(entries).slice(0, limit);
  const formattedTopOutcomes = (labels) =>
    formatList(labels.map((label) => lowerCaseFirst(label)));

  if (recentEntries.length < 2) {
    return {
      line: '',
      topOutcomes: [],
      sampleSize: recentEntries.length,
    };
  }

  const counts = new Map();

  recentEntries.forEach((entry) => {
    getEntryOutcomeSummary(entry, limit).counts.forEach(([label, count]) => {
      counts.set(label, (counts.get(label) ?? 0) + count);
    });
  });

  const rankedOutcomes = [...counts.entries()].sort(
    (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
  );
  const topOutcomes = rankedOutcomes.slice(0, 3).map(([label]) => label);
  const [topOutcome, topOutcomeCount = 0] = rankedOutcomes[0] ?? [];

  if (!topOutcome || topOutcomeCount < 2) {
    return {
      line: topOutcomes.length
        ? `Lately, your objectives have been giving you ${formattedTopOutcomes(
            topOutcomes,
          )}.`
        : '',
      topOutcomes,
      sampleSize: recentEntries.length,
    };
  }

  const entriesWithTopOutcome = recentEntries.filter((entry) =>
    getEntryOutcomeSummary(entry, limit).counts.some(
      ([label]) => label === topOutcome,
    ),
  );
  const averageObjectiveCount = average(
    entriesWithTopOutcome.map((entry) => getObjectiveSummary(entry).total),
  );
  const averageAlignment = getAverageAlignmentRatio(entriesWithTopOutcome);
  const averageDeployment = getAverageLensRatio(entriesWithTopOutcome, 'deployment');
  const averageFulfillment = getAverageLensRatio(entriesWithTopOutcome, 'fulfillment');
  const averageEnjoyment = getAverageLensRatio(entriesWithTopOutcome, 'enjoyment');
  const movementShare =
    entriesWithTopOutcome.filter((entry) =>
      hasObjectiveOutcomeWithKeywords(entry, topOutcome, MOVEMENT_OBJECTIVE_KEYWORDS),
    ).length / entriesWithTopOutcome.length;
  const connectionShare =
    entriesWithTopOutcome.filter((entry) =>
      hasObjectiveOutcomeWithKeywords(entry, topOutcome, CONNECTION_OBJECTIVE_KEYWORDS),
    ).length / entriesWithTopOutcome.length;

  let line = '';

  if (topOutcome === 'More energy' && movementShare >= 0.5) {
    line = 'You gain the most energy on days with movement-based objectives.';
  } else if (
    topOutcome === 'Less stress' &&
    averageObjectiveCount <= 3.5 &&
    averageFulfillment >= 0.55
  ) {
    line = 'Your days with the least stress include fewer but more meaningful objectives.';
  } else if (topOutcome === 'Save money' && averageEnjoyment >= 0.6) {
    line = 'You consistently save money on high-enjoyment days.';
  } else if (topOutcome === 'Better focus' && averageObjectiveCount <= 3.5) {
    line = 'Better focus shows up most when the day stays narrower.';
  } else if (topOutcome === 'Progress' && averageDeployment >= 0.65) {
    line = 'Progress tends to build on days with stronger follow-through.';
  } else if (topOutcome === 'Feel better' && averageEnjoyment >= 0.6) {
    line = 'Feeling better tends to follow days with stronger enjoyment.';
  } else if (topOutcome === 'Connection' && connectionShare >= 0.5) {
    line = 'Connection shows up most on days when people stay in view.';
  } else if (topOutcome === 'Discipline' && averageDeployment >= 0.65) {
    line = 'Discipline tends to build on days with stronger follow-through.';
  } else if (averageAlignment >= 0.65) {
    line = `${topOutcome} tends to show up more on your better-aligned days.`;
  } else {
    line = `Lately, your objectives have been giving you ${formattedTopOutcomes(
      topOutcomes,
    )}.`;
  }

  return {
    line,
    topOutcomes,
    sampleSize: recentEntries.length,
  };
}
