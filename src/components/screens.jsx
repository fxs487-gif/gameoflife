import { useEffect, useState } from 'react';
import ScreenShell from './ScreenShell.jsx';
import {
  COMMITMENT_WINDOWS,
  DISTRACTION_OPTIONS,
  EMOTION_OPTIONS,
  MORNING_SUPPORT_OPTIONS,
  OBJECTIVE_SECTIONS,
  SUCCESS_REFLECTION_OPTIONS,
  TIME_OPTIONS,
} from '../options.js';

const MAX_OBJECTIVES = 6;
const STARTING_POINT_OPTIONS = [
  'In control',
  'Pulled in different directions',
  'Somewhere in between',
];

function FieldLabel({ children, helper }) {
  return (
    <label className="field-block">
      <span className="field-label">{children}</span>
      {helper ? <span className="field-helper">{helper}</span> : null}
    </label>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      className="text-input"
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      className="text-area"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

function PillGroup({ options, selected, onToggle, multiSelect = false }) {
  return (
    <div className="pill-group">
      {options.map((option) => {
        const active = multiSelect
          ? selected.includes(option)
          : selected === option;

        return (
          <button
            key={option}
            type="button"
            className={`pill ${active ? 'is-active' : ''}`.trim()}
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function InlineMessage({ children, subtle = false }) {
  return (
    <div className={`inline-message ${subtle ? 'is-subtle' : ''}`.trim()}>
      {children}
    </div>
  );
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function buildObjective(label, section, custom = false, outcome = '') {
  return {
    id: `${custom ? 'custom' : slugify(section)}-${slugify(label)}`,
    label,
    section,
    custom,
    outcome,
  };
}

function getObjectiveCounts(objectives) {
  return objectives.reduce(
    (counts, objective) => {
      if (objective.outcome === 'Completed') {
        counts.score += 2;
        counts.completed += 1;
      } else if (objective.outcome === 'Partially') {
        counts.score += 1;
        counts.partially += 1;
      } else if (objective.outcome === 'Missed') {
        counts.missed += 1;
      }

      return counts;
    },
    {
      score: 0,
      completed: 0,
      partially: 0,
      missed: 0,
    },
  );
}

function SummaryPillList({ items = [] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="summary-pill-list">
      {items.map((item) => (
        <span key={item} className="summary-pill">
          {item}
        </span>
      ))}
    </div>
  );
}

function OutcomeTag({ status }) {
  if (!status) {
    return null;
  }

  const label =
    status === 'Completed'
      ? 'Did it'
      : status === 'Partially'
        ? 'Some progress'
        : "Didn't do it";

  return (
    <span className={`outcome-tag outcome-${status.toLowerCase()}`.trim()}>
      {label}
    </span>
  );
}

function isDisplayValue(value) {
  return Boolean(value) && typeof value === 'object' && 'text' in value;
}

function DisplayValue({ value, className, rawClassName = '' }) {
  if (isDisplayValue(value) && value.isRawInput) {
    return (
      <div className={`raw-input-block ${rawClassName}`.trim()}>
        <p className={className}>{value.label}</p>
        {value.note ? <p className="raw-input-note">{value.note}</p> : null}
      </div>
    );
  }

  const text = isDisplayValue(value) ? value.text : value;
  return <p className={className}>{text}</p>;
}

function DisplayValueList({ items = [], className, rawClassName = '' }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="display-value-list">
      {items.map((item, index) => (
        <DisplayValue
          key={`${isDisplayValue(item) ? item.text : item}-${index}`}
          value={item}
          className={className}
          rawClassName={rawClassName}
        />
      ))}
    </div>
  );
}

export function LoginScreen({ onSubmit }) {
  const [name, setName] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    if (!name.trim()) {
      return;
    }

    onSubmit(name.trim());
  }

  return (
    <ScreenShell
      eyebrow="Begin"
      title="Play your day. See what actually shapes your life."
      subtitle="Most people try to improve their lives without ever seeing what's really shaping them. This helps you see it &mdash; clearly &mdash; and adjust in real time."
      className="entry-shell"
    >
      <div className="stack-xl">
        <div className="pattern-panel quiet-pattern-panel entry-panel">
          <div className="stack-sm">
            <p className="pattern-title">How it works</p>
            <div className="pattern-list">
              <p className="pattern-item">Set what matters today</p>
              <p className="pattern-item">See what actually shaped your day</p>
              <p className="pattern-item">Make one small adjustment that sticks</p>
            </div>
          </div>

          <p className="entry-tone">
            No fluff. No streak pressure. Just honest feedback - and better
            decisions.
          </p>
        </div>

        <form className="stack-lg" onSubmit={handleSubmit}>
          <div className="stack-sm">
            <FieldLabel helper="Your name stays on this device for now.">
              What should we call you?
            </FieldLabel>
            <TextInput
              value={name}
              onChange={setName}
              placeholder="Your name"
            />
          </div>

          <button className="primary-button" type="submit">
            Start your day
          </button>
        </form>
      </div>
    </ScreenShell>
  );
}

export function HomeScreen({
  name,
  momentum,
  trend = null,
  energy = { score: 0, max: 10, filledSegments: 0 },
  trendDetailLine = '',
  comparisonLine = '',
  objectives = [],
  carryoverAction = '',
  repeatedPattern = '',
  focusActionLabel,
  primaryActionLabel,
  onFocusAction,
  onCarryoverAction,
  onPrimaryAction,
  onViewHistory,
}) {
  const hasObjectives = objectives.length > 0;
  const energySegments = Array.from(
    { length: 10 },
    (_, index) => index < energy.filledSegments,
  );
  const stateCardClassName = `pattern-panel dashboard-card dashboard-state-card ${
    trend ? `trend-${trend.state.toLowerCase()}` : `status-${momentum.status.toLowerCase().trim()}`
  }`;
  const stateTagClassName = trend
    ? `trend-tag trend-${trend.state.toLowerCase()}`
    : `status-tag status-${momentum.status.toLowerCase()}`;
  const stateTagLabel = trend ? trend.state : momentum.status;
  const stateTitle = trend ? 'Current direction' : 'Current state';
  const stateHeadline = trend ? trend.message : momentum.headline;
  const stateSubtext = trend ? trend.subtext : momentum.subtext;

  return (
    <ScreenShell
      eyebrow={`Good morning, ${name}.`}
      title="Game of Life"
      subtitle="Let's pick up where you left off."
      className="home-shell"
    >
      <div className="stack-xl">
        <div className={stateCardClassName}>
          <div className="history-item-top">
            <p className="pattern-title">{stateTitle}</p>
            <span className={stateTagClassName}>{stateTagLabel}</span>
          </div>
          <p className="dashboard-state-headline">{stateHeadline}</p>
          <p className="pattern-body">{stateSubtext}</p>
          <div
            className="dashboard-energy"
            aria-label={`Life energy ${energy.score} out of ${energy.max}`}
          >
            <div className="alignment-copy-row">
              <p className="alignment-label">Life energy</p>
              <p className="dashboard-energy-score">
                {energy.score} / {energy.max}
              </p>
            </div>
            <div className="alignment-meter alignment-meter-hero" aria-hidden="true">
              {energySegments.map((filled, index) => (
                <span
                  key={index}
                  className={`alignment-segment ${filled ? 'is-filled' : ''}`.trim()}
                  style={{ '--segment-index': index }}
                >
                  <span className="alignment-segment-fill" />
                </span>
              ))}
            </div>
          </div>
          {trendDetailLine ? <p className="quiet-line">{trendDetailLine}</p> : null}
          {comparisonLine ? <p className="quiet-line">{comparisonLine}</p> : null}
        </div>

        <div className="pattern-panel dashboard-card">
          <p className="pattern-title">
            {hasObjectives ? "Today, you're focused on:" : 'What matters today?'}
          </p>
          {hasObjectives ? (
            <SummaryPillList items={objectives} />
          ) : (
            <p className="pattern-body">No objectives set yet.</p>
          )}
          <button className="utility-button dashboard-inline-action" type="button" onClick={onFocusAction}>
            {focusActionLabel}
          </button>
        </div>

        {carryoverAction ? (
          <div className="pattern-panel quiet-pattern-panel dashboard-card">
            <p className="pattern-title">Carryover</p>
            <p className="pattern-body">Yesterday, you said:</p>
            <p className="dashboard-carryover-text">{carryoverAction}</p>
            <button className="utility-button dashboard-inline-action" type="button" onClick={onCarryoverAction}>
              Did you follow through?
            </button>
          </div>
        ) : null}

        {repeatedPattern ? (
          <div className="pattern-panel quiet-pattern-panel dashboard-card dashboard-signal-card">
            <p className="pattern-title">Pattern signal</p>
            <p className="pattern-body">This has been showing up: {repeatedPattern}</p>
          </div>
        ) : null}

        <div className="button-stack">
          <button className="primary-button" type="button" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
          {onViewHistory ? (
            <button className="utility-button" type="button" onClick={onViewHistory}>
              Recent days
            </button>
          ) : null}
        </div>
      </div>
    </ScreenShell>
  );
}

export function StartingPointIntroScreen({ onContinue }) {
  return (
    <ScreenShell
      eyebrow="Starting point"
      title="Let's get a starting point"
      subtitle="No pressure to change anything yet. Just show up as you normally would."
    >
      <button className="primary-button" type="button" onClick={onContinue}>
        Continue
      </button>
    </ScreenShell>
  );
}

export function StartingPointPracticeScreen({
  initialFeeling = '',
  onContinue,
}) {
  const [feeling, setFeeling] = useState(initialFeeling);

  return (
    <ScreenShell
      eyebrow="Starting point"
      title="For the next few days:"
      subtitle="Let the pattern come from what actually happens."
    >
      <div className="stack-xl">
        <div className="pattern-panel">
          <p className="pattern-item">Set what matters</p>
          <p className="pattern-item">Check what actually happens</p>
          <p className="pattern-item">Be honest</p>
        </div>

        <div className="stack-sm">
          <FieldLabel helper="Optional">
            What do you feel like most days right now?
          </FieldLabel>
          <PillGroup
            options={STARTING_POINT_OPTIONS}
            selected={feeling}
            onToggle={setFeeling}
          />
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={() => onContinue(feeling)}
        >
          Continue
        </button>
      </div>
    </ScreenShell>
  );
}

export function StartingPointReadyScreen({ onStart }) {
  return (
    <ScreenShell
      eyebrow="Starting point"
      title="We'll show you the pattern"
      subtitle="Give it a few honest days. Then you'll have something real to compare against."
    >
      <button className="primary-button" type="button" onClick={onStart}>
        Start
      </button>
    </ScreenShell>
  );
}

export function BaselineRevealScreen({
  status,
  message,
  averageScore,
  breakdownPatterns = [],
  consistencyLine = '',
  selfPerception = '',
  onContinue,
}) {
  return (
    <ScreenShell
      eyebrow="Starting point"
      title="Here's how your days have been going"
      subtitle="This is your starting pattern, based on what actually happened."
    >
      <div className="stack-xl">
        <div className={`status-panel status-${status.toLowerCase()}`}>
          <span className={`status-tag status-${status.toLowerCase()}`}>{status}</span>
          <p className="result-headline">{message}</p>
          <p className="status-panel-copy">Average alignment: {averageScore} / 10</p>
        </div>

        {breakdownPatterns.length > 0 ? (
          <div className="pattern-panel quiet-pattern-panel">
            <p className="pattern-title">Most common pulls</p>
            <div className="pattern-list">
              {breakdownPatterns.map((pattern) => (
                <p key={pattern} className="pattern-item">
                  {pattern}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {consistencyLine ? (
          <p className="quiet-line">{consistencyLine}</p>
        ) : null}

        {selfPerception ? (
          <p className="quiet-line">
            You said most days feel: {selfPerception}
          </p>
        ) : null}

        <button className="primary-button" type="button" onClick={onContinue}>
          Continue
        </button>
      </div>
    </ScreenShell>
  );
}

export function DailyObjectivesScreen({
  name,
  initialObjectives = [],
  previousObjectives = [],
  onSubmit,
  lateEntry = false,
}) {
  const [objectives, setObjectives] = useState(
    initialObjectives.map((objective) =>
      buildObjective(
        objective.label,
        objective.section ?? 'Custom',
        Boolean(objective.custom),
        '',
      ),
    ),
  );
  const [customObjective, setCustomObjective] = useState('');
  const selectedLabels = objectives.map((objective) => objective.label);
  const atLimit = objectives.length >= MAX_OBJECTIVES;

  function toggleObjective(option, section) {
    setObjectives((current) => {
      const exists = current.some((objective) => objective.label === option);

      if (exists) {
        return current.filter((objective) => objective.label !== option);
      }

      if (current.length >= MAX_OBJECTIVES) {
        return current;
      }

      return [...current, buildObjective(option, section)];
    });
  }

  function addCustomObjective() {
    const trimmed = customObjective.trim();

    if (!trimmed) {
      return;
    }

    setObjectives((current) => {
      if (
        current.length >= MAX_OBJECTIVES ||
        current.some((objective) => objective.label.toLowerCase() === trimmed.toLowerCase())
      ) {
        return current;
      }

      return [...current, buildObjective(trimmed, 'Custom', true)];
    });
    setCustomObjective('');
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (objectives.length === 0) {
      return;
    }

    onSubmit({
      dailyObjectives: objectives,
    });
  }

  return (
    <ScreenShell
      eyebrow={lateEntry ? `Later today, ${name}` : `Welcome back, ${name}.`}
      title="What matters today?"
      subtitle={
        lateEntry
          ? "Choose up to 6 - this is your day, even if you're naming it late."
          : "Choose up to 6 - this is your day."
      }
    >
      <form className="stack-xl" onSubmit={handleSubmit}>
        <div className="stack-sm">
          <div className="section-heading">
            <FieldLabel helper={`${objectives.length} / ${MAX_OBJECTIVES}`}>
              Today's objectives
            </FieldLabel>
          </div>
          <SummaryPillList items={selectedLabels} />
          <p className="field-helper">
            Select from the lists below. Tap a selected item again to remove it.
          </p>
        </div>

        {previousObjectives.length > 0 ? (
          <InlineMessage subtle>
            <span className="quote-label">Yesterday, you focused on:</span>
            <SummaryPillList items={previousObjectives} />
          </InlineMessage>
        ) : null}

        {OBJECTIVE_SECTIONS.map((section) => (
          <div key={section.title} className="stack-sm">
            <FieldLabel>{section.title}</FieldLabel>
            <PillGroup
              options={section.options}
              selected={selectedLabels}
              onToggle={(option) => toggleObjective(option, section.title)}
              multiSelect
            />
          </div>
        ))}

        <div className="stack-sm">
          <FieldLabel helper="Optional">Add a custom objective</FieldLabel>
          <TextInput
            value={customObjective}
            onChange={setCustomObjective}
            placeholder="Add one more thing that matters today"
          />
          <button
            className="secondary-button"
            type="button"
            onClick={addCustomObjective}
            disabled={atLimit}
          >
            Add custom item
          </button>
          {atLimit ? (
            <p className="field-helper">You've reached the 6-objective limit.</p>
          ) : null}
        </div>

        <button className="primary-button" type="submit">
          {lateEntry ? 'Save and continue' : 'Save objectives'}
        </button>
      </form>
    </ScreenShell>
  );
}

export function MorningSupportScreen({
  name,
  initialStrategy,
  initialCustomText,
  onSubmit,
}) {
  const [strategy, setStrategy] = useState(initialStrategy);
  const [customText, setCustomText] = useState(initialCustomText);

  function handleSubmit(event) {
    event.preventDefault();

    if (!strategy && !customText.trim()) {
      return;
    }

    if (strategy === 'Other' && !customText.trim()) {
      return;
    }

    onSubmit({
      morningSupportStrategy: strategy,
      morningSupportCustomText: customText.trim(),
    });
  }

  return (
    <ScreenShell
      eyebrow={`Morning structure, ${name}`}
      title="How will you support that today?"
      subtitle="What's your plan for following through?"
    >
      <form className="stack-xl" onSubmit={handleSubmit}>
        <div className="stack-sm">
          <FieldLabel>Choose one support</FieldLabel>
          <PillGroup
            options={MORNING_SUPPORT_OPTIONS}
            selected={strategy}
            onToggle={setStrategy}
          />
        </div>

        <div className="stack-sm">
          <FieldLabel helper="Optional">Add your own plan</FieldLabel>
          <TextInput
            value={customText}
            onChange={setCustomText}
            placeholder="Keep one short block clear before noon."
          />
        </div>

        <button className="primary-button" type="submit">
          Continue
        </button>
      </form>
    </ScreenShell>
  );
}

export function DayPauseScreen({
  name,
  objectives,
  onReflectNow,
  onEdit,
  onViewHistory,
}) {
  return (
    <ScreenShell
      eyebrow={`Today, ${name}`}
      title="Your objectives are set."
      subtitle="You can return tonight for evaluation, or move forward now if you want to capture the day early."
    >
      <div className="stack-lg">
        <InlineMessage subtle>
          <span className="quote-label">Today's objectives</span>
          <SummaryPillList items={objectives} />
        </InlineMessage>

        <div className="button-stack">
          <button className="primary-button" type="button" onClick={onReflectNow}>
            Evaluate today
          </button>
          <button className="secondary-button" type="button" onClick={onEdit}>
            Edit objectives
          </button>
        </div>

        {onViewHistory ? (
          <button className="utility-button" type="button" onClick={onViewHistory}>
            Recent days
          </button>
        ) : null}
      </div>
    </ScreenShell>
  );
}

export function LateIntentPromptScreen({ name, onContinue }) {
  return (
    <ScreenShell
      eyebrow={`Welcome back, ${name}.`}
      title="You didn't set your objectives this morning."
      subtitle="That's okay. Choose them now, then look honestly at how the day unfolded."
    >
      <button className="primary-button" type="button" onClick={onContinue}>
        Enter them now
      </button>
    </ScreenShell>
  );
}

export function ObjectiveOutcomeScreen({ name, objectives = [], onSubmit }) {
  const [objectiveStates, setObjectiveStates] = useState(
    objectives.map((objective) => ({
      ...objective,
      pendingProgressCheck: false,
    })),
  );
  const { score, completed, partially, missed } = getObjectiveCounts(objectiveStates);
  const maxScore = objectiveStates.length * 2;
  const alignmentRatio = maxScore ? score / maxScore : 0;
  const evaluationStatus =
    alignmentRatio >= 0.75 ? 'architect-led' : alignmentRatio >= 0.4 ? 'mixed' : 'pulled';
  const evaluationSegments = Array.from(
    { length: 10 },
    (_, index) => index < Math.max(0, Math.min(10, Math.round(alignmentRatio * 10))),
  );
  const allScored =
    objectiveStates.length > 0 &&
    objectiveStates.every((objective) => Boolean(objective.outcome));

  function handleSubmit(event) {
    event.preventDefault();

    if (!allScored) {
      return;
    }

    onSubmit(
      objectiveStates.map(({ pendingProgressCheck, ...objective }) => objective),
    );
  }

  function markDidIt(objectiveId) {
    setObjectiveStates((current) =>
      current.map((objective) =>
        objective.id === objectiveId
          ? {
              ...objective,
              outcome: 'Completed',
              pendingProgressCheck: false,
            }
          : objective,
      ),
    );
  }

  function askProgressQuestion(objectiveId) {
    setObjectiveStates((current) =>
      current.map((objective) =>
        objective.id === objectiveId
          ? {
              ...objective,
              outcome: '',
              pendingProgressCheck: true,
            }
          : objective,
      ),
    );
  }

  function resolveProgress(objectiveId, outcome) {
    setObjectiveStates((current) =>
      current.map((objective) =>
        objective.id === objectiveId
          ? {
              ...objective,
              outcome,
              pendingProgressCheck: false,
            }
          : objective,
      ),
    );
  }

  return (
    <ScreenShell
      eyebrow={`Evening evaluation, ${name}`}
      title="How did today actually play out?"
      subtitle="Call each one clearly before you interpret the day."
    >
      <form className="stack-xl" onSubmit={handleSubmit}>
        <div className={`status-panel objective-evaluation-panel status-${evaluationStatus}`}>
          <p className="pattern-title">Life energy</p>
          <p className="objective-evaluation-score">
            {score} / {maxScore}
          </p>
          <div
            className="alignment-block objective-evaluation-meter"
            aria-label={`Life energy ${score} out of ${maxScore}`}
          >
            <div className="alignment-copy-row">
              <p className="alignment-label">Day control</p>
              <p className="alignment-score">
                {Math.max(1, Math.min(10, Math.round(alignmentRatio * 10)))} / 10
              </p>
            </div>
            <div className="alignment-meter" aria-hidden="true">
              {evaluationSegments.map((filled, index) => (
                <span
                  key={index}
                  className={`alignment-segment ${filled ? 'is-filled' : ''}`.trim()}
                  style={{ '--segment-index': index }}
                >
                  <span className="alignment-segment-fill" />
                </span>
              ))}
            </div>
          </div>
          <p className="quiet-line">
            {completed} did it, {partially} some progress, {missed} not at all
          </p>
        </div>

        <div className="objective-review-list">
          {objectiveStates.map((objective) => (
            <div key={objective.id} className="objective-review-card">
              <div className="objective-review-top">
                <p className="objective-review-title">{objective.label}</p>
                <OutcomeTag status={objective.outcome} />
              </div>

              <div className="objective-binary-row">
                <button
                  type="button"
                  className={`pill ${objective.outcome === 'Completed' ? 'is-active' : ''}`.trim()}
                  onClick={() => markDidIt(objective.id)}
                >
                  Did it
                </button>
                <button
                  type="button"
                  className={`pill ${
                    objective.outcome === 'Partially' ||
                    objective.outcome === 'Missed' ||
                    objective.pendingProgressCheck
                      ? 'is-active'
                      : ''
                  }`.trim()}
                  onClick={() => askProgressQuestion(objective.id)}
                >
                  Didn't do it
                </button>
              </div>

              {objective.pendingProgressCheck ? (
                <div className="objective-follow-up stack-sm">
                  <p className="objective-follow-up-title">Did you make any progress at all?</p>
                  <div className="objective-binary-row">
                    <button
                      type="button"
                      className={`pill ${
                        objective.outcome === 'Partially' ? 'is-active' : ''
                      }`.trim()}
                      onClick={() => resolveProgress(objective.id, 'Partially')}
                    >
                      Yes, some progress
                    </button>
                    <button
                      type="button"
                      className={`pill ${
                        objective.outcome === 'Missed' ? 'is-active' : ''
                      }`.trim()}
                      onClick={() => resolveProgress(objective.id, 'Missed')}
                    >
                      No, not at all
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <button className="primary-button" type="submit">
          Continue
        </button>
      </form>
    </ScreenShell>
  );
}

export function EveningReflectionScreen({
  name,
  objectives,
  alignment,
  initialReflection,
  onSubmit,
}) {
  const [intentionalTime, setIntentionalTime] = useState(
    initialReflection?.intentionalTime ?? '',
  );
  const [passiveTime, setPassiveTime] = useState(
    initialReflection?.passiveTime ?? '',
  );
  const [distractions, setDistractions] = useState(
    initialReflection?.distractions ?? [],
  );
  const [notes, setNotes] = useState(initialReflection?.notes ?? '');
  const nothingSignificantSelected = distractions.includes('Nothing significant');
  const slippedObjectives = objectives
    .filter((objective) => objective.outcome !== 'Completed')
    .map((objective) => objective.label);

  function toggleDistraction(option) {
    setDistractions((current) => {
      if (option === 'Nothing significant') {
        return current.includes(option) ? [] : ['Nothing significant'];
      }

      const withoutNothingSignificant = current.filter(
        (item) => item !== 'Nothing significant',
      );

      return withoutNothingSignificant.includes(option)
        ? withoutNothingSignificant.filter((item) => item !== option)
        : [...withoutNothingSignificant, option];
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!intentionalTime || !passiveTime || distractions.length === 0) {
      return;
    }

    onSubmit({
      intentionalTime,
      passiveTime,
      distractions,
      notes: notes.trim(),
    });
  }

  return (
    <ScreenShell
      eyebrow={`Evening reflection, ${name}`}
      title="What shaped the result?"
      subtitle="Stay close to what happened. No spin, no self-attack."
    >
      <form className="stack-xl" onSubmit={handleSubmit}>
        <InlineMessage subtle>
          <span className="quote-label">Today's alignment</span>
          <p className="quote-text">
            {alignment.score} / {alignment.max}
          </p>
          {slippedObjectives.length > 0 ? (
            <p className="quiet-line">
              Objectives that slipped: {slippedObjectives.join(', ')}
            </p>
          ) : (
            <p className="quiet-line">Every objective was marked complete.</p>
          )}
        </InlineMessage>

        <div className="stack-sm">
          <FieldLabel>Time spent intentionally</FieldLabel>
          <PillGroup
            options={TIME_OPTIONS}
            selected={intentionalTime}
            onToggle={setIntentionalTime}
          />
        </div>

        <div className="stack-sm">
          <FieldLabel>Time spent passively</FieldLabel>
          <PillGroup
            options={TIME_OPTIONS}
            selected={passiveTime}
            onToggle={setPassiveTime}
          />
        </div>

        <div className="stack-sm">
          <FieldLabel>What pulled you away?</FieldLabel>
          <PillGroup
            options={DISTRACTION_OPTIONS}
            selected={distractions}
            onToggle={toggleDistraction}
            multiSelect
          />
          {nothingSignificantSelected ? (
            <p className="field-helper">
              "Nothing significant" stands on its own and skips the friction-based path.
            </p>
          ) : null}
        </div>

        <div className="stack-sm">
          <FieldLabel helper="Optional">Notes</FieldLabel>
          <TextArea
            value={notes}
            onChange={setNotes}
            placeholder="Anything else you want to name about the day."
            rows={5}
          />
        </div>

        <button className="primary-button" type="submit">
          Continue
        </button>
      </form>
    </ScreenShell>
  );
}

export function MirrorMomentScreen({
  objectives,
  completedCount,
  partialCount,
  missedCount,
  primaryDistraction,
  secondaryDistractions,
  noSignificantChallenges = false,
  onContinue,
}) {
  const totalObjectives = objectives.length;
  const slippedCount = partialCount + missedCount;
  const lines = noSignificantChallenges
    ? [
        {
          label: null,
          value: `You set ${totalObjectives} ${
            totalObjectives === 1 ? 'priority' : 'priorities'
          } today.`,
          details: objectives,
        },
        {
          label: null,
          value: `You followed through on ${completedCount}.`,
        },
        {
          label: null,
          value:
            partialCount > 0
              ? `${partialCount} stayed in motion, but only partially.`
              : 'Most of the day stayed aligned.',
        },
        {
          label: null,
          value: 'Nothing significant pulled the day off course.',
          emphasis: true,
        },
      ]
    : [
        {
          label: null,
          value: `You set ${totalObjectives} ${
            totalObjectives === 1 ? 'priority' : 'priorities'
          } today.`,
          details: objectives,
        },
        {
          label: null,
          value: `You followed through on ${completedCount}.`,
        },
        {
          label: null,
          value:
            partialCount > 0
              ? `${partialCount} stayed in motion, but only partially.`
              : 'However...',
        },
        {
          label: null,
          value:
            slippedCount > 0
              ? `${slippedCount} ${
                  slippedCount === 1 ? 'was' : 'were'
                } pulled off course.`
              : 'The list held, but pressure still showed up.',
        },
        {
          label: 'And the biggest pull came from:',
          value: primaryDistraction,
          emphasis: true,
        },
      ];

  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);

    const timers = lines.map((_, index) =>
      window.setTimeout(() => {
        setVisibleCount(index + 1);
      }, index * 1100),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <ScreenShell
      eyebrow="Mirror moment"
      title="Look at the day without turning away."
      subtitle="Let each line land before you move on."
      className="mirror-shell"
      footer={
        visibleCount === lines.length ? (
          <button className="primary-button" type="button" onClick={onContinue}>
            Continue
          </button>
        ) : null
      }
    >
      <div className="mirror-flow" aria-live="polite">
        {lines.map((line, index) => {
          const isVisible = index < visibleCount;

          return (
            <div
              key={`${line.label ?? 'however'}-${
                isDisplayValue(line.value) ? line.value.text : line.value
              }`}
              className={`mirror-line ${isVisible ? 'is-visible' : ''} ${
                line.emphasis ? 'is-emphasis' : ''
              }`.trim()}
            >
              {line.label ? <p className="mirror-label">{line.label}</p> : null}
              <DisplayValue
                value={line.value}
                className="mirror-value"
                rawClassName="mirror-raw-value"
              />

              {line.details?.length ? (
                <p className="mirror-secondary">{line.details.join(', ')}</p>
              ) : null}

              {line.emphasis && secondaryDistractions.length > 0 ? (
                <div className="mirror-secondary-list">
                  <p className="mirror-secondary">Also present:</p>
                  <DisplayValueList
                    items={secondaryDistractions}
                    className="mirror-secondary"
                    rawClassName="mirror-secondary-raw"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </ScreenShell>
  );
}

export function GapScreen({ objectives, slippedCount, gapText, onContinue }) {
  const alignedDay = gapText === 'Nothing significant';

  return (
    <ScreenShell
      eyebrow="The gap"
      title={alignedDay ? 'The alignment matters.' : 'The contrast matters.'}
      subtitle={
        alignedDay
          ? 'What held together is worth learning from too.'
          : 'Not as a punishment. As a clear starting point.'
      }
    >
      <div className="stack-xl">
        <div className="contrast-block">
          <p className="contrast-label">You set these priorities:</p>
          <SummaryPillList items={objectives} />
        </div>

        <div className="contrast-block contrast-block-strong">
          <p className="contrast-label">
            {alignedDay
              ? 'And no significant pull took over:'
              : slippedCount > 0
                ? 'What shaped the priorities that slipped:'
                : 'What shaped the day:'}
          </p>
          <DisplayValue
            value={gapText}
            className="contrast-value"
            rawClassName="contrast-raw-value"
          />
        </div>

        <p className="quiet-line">
          {alignedDay
            ? 'That alignment is worth carrying forward.'
            : 'That gap is where change starts.'}
        </p>

        <button className="primary-button" type="button" onClick={onContinue}>
          I see it
        </button>
      </div>
    </ScreenShell>
  );
}

export function EmotionCheckInScreen({ initialEmotion, onSubmit }) {
  const [emotion, setEmotion] = useState(initialEmotion);

  function handleSubmit(event) {
    event.preventDefault();

    if (!emotion) {
      return;
    }

    onSubmit(emotion);
  }

  return (
    <ScreenShell
      eyebrow="Emotional check-in"
      title="What comes up when you see this?"
      subtitle="Choose the closest fit. It doesn't have to be perfect."
    >
      <form className="stack-lg" onSubmit={handleSubmit}>
        <PillGroup
          options={EMOTION_OPTIONS}
          selected={emotion}
          onToggle={setEmotion}
        />

        <button className="primary-button" type="submit">
          Continue
        </button>
      </form>
    </ScreenShell>
  );
}

export function SuccessReflectionScreen({
  initialFactor,
  initialNote,
  onSubmit,
}) {
  const [successFactor, setSuccessFactor] = useState(initialFactor);
  const [successNote, setSuccessNote] = useState(initialNote);

  function handleSubmit(event) {
    event.preventDefault();

    if (!successFactor) {
      return;
    }

    onSubmit({
      successFactor,
      successNote: successNote.trim(),
    });
  }

  return (
    <ScreenShell
      eyebrow="Success reflection"
      title="You stayed aligned today"
      subtitle="Notice what helped, so you can carry it forward."
    >
      <form className="stack-xl" onSubmit={handleSubmit}>
        <div className="stack-sm">
          <FieldLabel>What helped you follow through?</FieldLabel>
          <PillGroup
            options={SUCCESS_REFLECTION_OPTIONS}
            selected={successFactor}
            onToggle={setSuccessFactor}
          />
        </div>

        <div className="stack-sm">
          <FieldLabel helper="Optional">Anything else?</FieldLabel>
          <TextArea
            value={successNote}
            onChange={setSuccessNote}
            placeholder="Anything else?"
            rows={4}
          />
        </div>

        <button className="primary-button" type="submit">
          Continue
        </button>
      </form>
    </ScreenShell>
  );
}

export function RootCauseScreen({
  options,
  affectedObjectives = [],
  initialCause,
  initialOtherText,
  initialReasoning,
  onSubmit,
}) {
  const reflectionOptions = options.filter((option) => option !== 'Other factors');
  const defaultCause =
    initialCause ||
    (reflectionOptions.length === 1
      ? reflectionOptions[0]
      : options.length === 1
        ? options[0]
        : '');
  const [rootCause, setRootCause] = useState(defaultCause);
  const [otherText, setOtherText] = useState(initialOtherText);
  const [reasoning, setReasoning] = useState(initialReasoning);

  function handleSubmit(event) {
    event.preventDefault();

    if (!rootCause) {
      return;
    }

    if (rootCause === 'Other factors' && !otherText.trim()) {
      return;
    }

    onSubmit({
      rootCause,
      rootCauseOtherText: otherText.trim(),
      rootCauseReasoning: reasoning.trim(),
    });
  }

  return (
    <ScreenShell
      eyebrow="Interpretation"
      title="Let's understand what drove today"
      subtitle="Awareness is useful when it leads somewhere."
    >
      <form className="stack-xl" onSubmit={handleSubmit}>
        {affectedObjectives.length > 0 ? (
          <InlineMessage subtle>
            <span className="quote-label">Objectives that lost ground</span>
            <SummaryPillList items={affectedObjectives} />
          </InlineMessage>
        ) : null}

        <div className="stack-sm">
          <FieldLabel>
            Looking at the objectives that slipped, what played the biggest role?
          </FieldLabel>
          <PillGroup
            options={options}
            selected={rootCause}
            onToggle={setRootCause}
          />

          {rootCause === 'Other factors' ? (
            <TextInput
              value={otherText}
              onChange={setOtherText}
              placeholder="Name it simply"
            />
          ) : null}
        </div>

        <div className="stack-sm">
          <FieldLabel helper="Optional">Why do you think this showed up today?</FieldLabel>
          <TextArea
            value={reasoning}
            onChange={setReasoning}
            placeholder="Type your thoughts..."
            rows={4}
          />
        </div>

        <button className="primary-button" type="submit">
          Continue
        </button>
      </form>
    </ScreenShell>
  );
}

export function SuggestedShiftScreen({
  variant = 'challenge',
  rootCauseLabel,
  suggestion,
  initialSource,
  initialCustomValue,
  onUseSuggestion,
  onUseCustom,
}) {
  const [mode, setMode] = useState(initialSource === 'custom' ? 'custom' : 'suggested');
  const [customAction, setCustomAction] = useState(initialCustomValue);

  function handleCustomSubmit(event) {
    event.preventDefault();

    if (!customAction.trim()) {
      return;
    }

    onUseCustom(customAction.trim());
  }

  return (
    <ScreenShell
      eyebrow="Starting point"
      title="Here's the next move"
      subtitle={
        variant === 'success'
          ? 'Keep this grounded. Carry one useful condition forward.'
          : 'Keep this grounded. Name what happened, then choose one move for tomorrow.'
      }
    >
      <div className="stack-xl">
        <InlineMessage subtle>
          <span className="quote-label">
            {variant === 'success' ? 'What helped most:' : 'What showed up most:'}
          </span>
          <DisplayValue
            value={rootCauseLabel}
            className="quote-text"
            rawClassName="quote-raw-value"
          />
        </InlineMessage>

        <div className="suggestion-panel">
          <p className="suggestion-reality">{suggestion.reality}</p>
          {suggestion.pattern ? (
            <p className="suggestion-pattern">{suggestion.pattern}</p>
          ) : null}
          <p className="suggestion-next-label">Next move</p>
          <p className="suggestion-action">{suggestion.action}</p>
        </div>

        {mode === 'suggested' ? (
          <div className="button-stack">
            <button className="primary-button" type="button" onClick={onUseSuggestion}>
              Use this
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setMode('custom')}
            >
              Choose my own
            </button>
          </div>
        ) : (
          <form className="stack-lg" onSubmit={handleCustomSubmit}>
            <div className="stack-sm">
              <FieldLabel>What would be more useful for tomorrow?</FieldLabel>
              <TextArea
                value={customAction}
                onChange={setCustomAction}
                placeholder="Keep it simple. Make it real."
                rows={4}
              />
            </div>

            <div className="button-stack">
              <button className="primary-button" type="submit">
                Use my own
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setMode('suggested')}
              >
                Use suggestion instead
              </button>
            </div>
          </form>
        )}
      </div>
    </ScreenShell>
  );
}

export function CommitmentScreen({
  action,
  initialWindow,
  onSubmit,
  onEdit,
}) {
  const [commitmentWindow, setCommitmentWindow] = useState(initialWindow);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(commitmentWindow);
  }

  return (
    <ScreenShell
      eyebrow="Commitment"
      title="Tomorrow, I will:"
      subtitle="Add a time window if it helps this actually happen."
    >
      <form className="stack-lg" onSubmit={handleSubmit}>
        <InlineMessage>
          <p className="commitment-preview">{action}</p>
        </InlineMessage>

        <div className="stack-sm">
          <FieldLabel helper="Optional">When?</FieldLabel>
          <PillGroup
            options={COMMITMENT_WINDOWS}
            selected={commitmentWindow}
            onToggle={setCommitmentWindow}
          />
        </div>

        <div className="button-stack">
          <button className="primary-button" type="submit">
            Lock it in
          </button>
          <button className="secondary-button" type="button" onClick={onEdit}>
            Edit
          </button>
        </div>
      </form>
    </ScreenShell>
  );
}

export function ReturnMomentScreen({ onContinue }) {
  return (
    <ScreenShell
      eyebrow="Return"
      title="Welcome back."
      subtitle="Let's check what happened."
    >
      <button className="primary-button" type="button" onClick={onContinue}>
        Continue
      </button>
    </ScreenShell>
  );
}

export function CommitmentCheckScreen({ action, onSubmit }) {
  return (
    <ScreenShell
      eyebrow="Follow-through"
      title="Did you follow through?"
      subtitle="Yesterday, you said:"
    >
      <div className="stack-xl">
        <InlineMessage>
          <p className="commitment-preview">{action}</p>
        </InlineMessage>

        <div className="button-stack">
          <button
            className="primary-button"
            type="button"
            onClick={() => onSubmit('Yes, I did it')}
          >
            Yes, I did it
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onSubmit('Not fully')}
          >
            Not fully
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onSubmit('No')}
          >
            No
          </button>
        </div>
      </div>
    </ScreenShell>
  );
}

export function FollowUpResultScreen({ result, onContinue }) {
  const followedThrough = result === 'Yes, I did it';

  return (
    <ScreenShell
      eyebrow="Return"
      title={followedThrough ? 'You followed through.' : "It didn't hold yesterday."}
      subtitle={
        followedThrough
          ? "That's how change actually happens."
          : "Let's understand why."
      }
    >
      <div className="stack-xl">
        {followedThrough ? (
          <>
            <p className="quiet-line">You kept a promise to yourself.</p>
            <div className="pattern-panel quiet-pattern-panel">
              <p className="pattern-title">Early signal</p>
              <p className="pattern-item">1 day in control</p>
            </div>
          </>
        ) : (
          <p className="quiet-line">
            Name it clearly when the day slips again, then adjust from there.
          </p>
        )}

        <button className="primary-button" type="button" onClick={onContinue}>
          Continue
        </button>
      </div>
    </ScreenShell>
  );
}

export function RecentDaysScreen({
  trendSummary = '',
  patternSummary,
  repeatedOtherPattern,
  entries,
  onSelectDay,
  onClose,
}) {
  return (
    <ScreenShell
      eyebrow="Review"
      title="Recent days"
      subtitle="A quiet look back at what has been shaping your days."
    >
      <div className="stack-xl">
        <div className="pattern-panel quiet-pattern-panel">
          <p className="pattern-title">Where things are heading</p>
          <p className="pattern-body">{trendSummary}</p>
        </div>

        {repeatedOtherPattern ? (
          <div className="pattern-panel quiet-pattern-panel">
            <p className="pattern-title">Something has been showing up</p>
            <p className="pattern-body">
              {repeatedOtherPattern.phrase} has appeared in your last{' '}
              {repeatedOtherPattern.count} entries.
            </p>
          </div>
        ) : null}

        <div className="pattern-panel">
          <p className="pattern-title">Recent pattern</p>
          <p className="pattern-body">Lately, your days have mostly been shaped by:</p>
          {patternSummary.length > 0 ? (
            <div className="pattern-list">
              {patternSummary.map((cause) => (
                <p key={cause} className="pattern-item">
                  {cause}
                </p>
              ))}
            </div>
          ) : (
            <p className="quiet-line">Not enough completed days yet.</p>
          )}
        </div>

        <div className="history-list">
          {entries.map((entry) => (
            <button
              key={entry.dateKey}
              type="button"
              className="history-item"
              onClick={() => onSelectDay(entry.dateKey)}
            >
              <div className="history-item-top">
                <p className="history-item-title">{entry.dayLabel}</p>
                <span className={`status-tag status-${entry.status.toLowerCase()}`}>
                  {entry.status}
                </span>
              </div>
              <p className="history-item-description">{entry.description}</p>
            </button>
          ))}
        </div>

        <button className="secondary-button" type="button" onClick={onClose}>
          Back to today
        </button>
      </div>
    </ScreenShell>
  );
}

export function RecentDayDetailScreen({
  dayLabel,
  dateLabel,
  status,
  alignment,
  objectives,
  legacyIntention,
  morningSupport,
  intentionalTime,
  passiveTime,
  distractions,
  rootCause,
  successReflection,
  noSignificantChallenges,
  committedAction,
  followUp,
  onBack,
}) {
  return (
    <ScreenShell
      eyebrow="Day review"
      title={dayLabel}
      subtitle={dateLabel}
    >
      <div className="stack-xl">
        <div className="history-item-top">
          <p className="pattern-title">Status</p>
          <span className={`status-tag status-${status.toLowerCase()}`}>{status}</span>
        </div>

        <div className="detail-block">
          <p className="detail-label">Alignment</p>
          <p className="detail-value">
            {alignment.score} / {alignment.max}
          </p>
        </div>

        <div className="detail-list">
          {objectives.length > 0 ? (
            <div className="detail-block">
              <p className="detail-label">Daily objectives</p>
              <div className="objective-detail-list">
                {objectives.map((objective) => (
                  <div key={objective.id} className="objective-detail-item">
                    <p className="objective-detail-label">{objective.label}</p>
                    <OutcomeTag status={objective.outcome} />
                  </div>
                ))}
              </div>
            </div>
          ) : legacyIntention ? (
            <div className="detail-block">
              <p className="detail-label">Intention</p>
              <p className="detail-value">{legacyIntention}</p>
            </div>
          ) : null}

          {morningSupport ? (
            <div className="detail-block">
              <p className="detail-label">Support plan</p>
              <p className="detail-value">{morningSupport}</p>
            </div>
          ) : null}

          <div className="detail-block">
            <p className="detail-label">Time breakdown</p>
            <p className="detail-value">
              Intentional: {intentionalTime}
              <br />
              Passive: {passiveTime}
            </p>
          </div>

          <div className="detail-block">
            <p className="detail-label">Distractions</p>
            <DisplayValueList
              items={distractions}
              className="detail-value"
              rawClassName="detail-raw-value"
            />
          </div>

          <div className="detail-block">
            <p className="detail-label">
              {noSignificantChallenges ? 'What helped' : 'Root cause'}
            </p>
            <DisplayValue
              value={noSignificantChallenges ? successReflection : rootCause}
              className="detail-value"
              rawClassName="detail-raw-value"
            />
          </div>

          <div className="detail-block">
            <p className="detail-label">Committed action</p>
            <p className="detail-value">{committedAction}</p>
          </div>

          {followUp ? (
            <div className="detail-block">
              <p className="detail-label">Next-day follow-through</p>
              <p className="detail-value">{followUp}</p>
            </div>
          ) : null}
        </div>

        <button className="secondary-button" type="button" onClick={onBack}>
          Back to recent days
        </button>
      </div>
    </ScreenShell>
  );
}

export function CompleteScreen({
  name,
  dayStatus,
  dayStatusHeadline,
  dayStatusCopy,
  alignment,
  trendLine,
  smallShift,
  commitmentWindow,
  onViewHistory,
  onStartOver,
  onResetAllData,
}) {
  const segments = Array.from(
    { length: 10 },
    (_, index) => index < alignment.filledSegments,
  );

  return (
    <ScreenShell
      eyebrow={`Until tomorrow, ${name}`}
      title="Day complete"
      subtitle="The day landed. Keep what you learned and carry one thing forward."
    >
      <div className="stack-lg">
        <div className={`status-panel result-moment status-${dayStatus.toLowerCase()}`}>
          <p className="result-headline">{dayStatusHeadline}</p>
          <span className={`status-tag status-${dayStatus.toLowerCase()}`}>{dayStatus}</span>
            <div
              className="alignment-block"
              aria-label={`Day control ${alignment.score} out of ${alignment.max}`}
            >
              <div className="alignment-copy-row">
                <p className="alignment-label">Day control</p>
                <p className="alignment-score">
                  {alignment.score} / {alignment.max}
                </p>
            </div>
            <div className="alignment-meter" aria-hidden="true">
              {segments.map((filled, index) => (
                <span
                  key={index}
                  className={`alignment-segment ${filled ? 'is-filled' : ''}`.trim()}
                  style={{ '--segment-index': index }}
                >
                  <span className="alignment-segment-fill" />
                </span>
              ))}
            </div>
          </div>
          {trendLine ? <p className="trend-line">{trendLine}</p> : null}
          <p className="status-panel-copy">{dayStatusCopy}</p>
        </div>

        <InlineMessage subtle>
          <span className="quote-label">Tomorrow, I will:</span>
          <p className="quote-text">{smallShift}</p>
          {commitmentWindow ? (
            <p className="quiet-line">Best window: {commitmentWindow}</p>
          ) : null}
        </InlineMessage>

        <div className="button-stack">
          {onViewHistory ? (
            <button className="secondary-button" type="button" onClick={onViewHistory}>
              Recent days
            </button>
          ) : null}
          <button className="secondary-button" type="button" onClick={onStartOver}>
            Start over
          </button>
        </div>

        <button className="utility-button" type="button" onClick={onResetAllData}>
          Reset all local data
        </button>
      </div>
    </ScreenShell>
  );
}
