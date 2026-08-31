/**
 * Football-specific slices of the diagnostics rows.
 *
 * The shared summarize/calibration helpers in predictionDiagnostics.js already work on
 * these rows — the backend deliberately emits the MLB shape — so this file only adds
 * the groupings football has and baseball does not: week, season, conference, and the
 * comparison against the closing line.
 */

import { summarizePredictionDiagnostics } from './predictionDiagnostics';

/** Group rows by an arbitrary key, summarize each, and drop empty buckets. */
function groupBy(rows, keyOf, labelOf = (k) => k) {
  const buckets = new Map();
  rows.forEach((row) => {
    const key = keyOf(row);
    if (key === null || key === undefined || key === '') return;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  });

  return [...buckets.entries()].map(([key, entries]) => ({
    key,
    label: labelOf(key),
    ...summarizePredictionDiagnostics(entries),
  }));
}

export function buildSeasonBreakdown(rows) {
  return groupBy(rows, (r) => r.season, (k) => String(k))
    .sort((a, b) => a.key - b.key);
}

export function buildWeeklyTrend(rows) {
  return groupBy(rows, (r) => r.week, (k) => `Wk ${k}`)
    .sort((a, b) => a.key - b.key);
}

export function buildConferenceBreakdown(rows, conferenceOf) {
  // A game is credited to both conferences when they differ, because "how does the
  // model do on SEC games" means games the SEC played, not games between two SEC teams.
  const buckets = new Map();
  rows.forEach((row) => {
    const confs = new Set(
      [conferenceOf(row.homeTeamName), conferenceOf(row.awayTeamName)].filter(Boolean)
    );
    confs.forEach((conf) => {
      if (!buckets.has(conf)) buckets.set(conf, []);
      buckets.get(conf).push(row);
    });
  });

  return [...buckets.entries()]
    .map(([conf, entries]) => ({
      key: conf,
      label: conf,
      ...summarizePredictionDiagnostics(entries),
    }))
    .filter((entry) => entry.games >= 5)
    .sort((a, b) => b.accuracy - a.accuracy);
}

/**
 * Model accuracy against the closing favourite, on the games where a line exists.
 *
 * Restricted to that subset on purpose: comparing the model's record over every game
 * with Vegas's over a smaller one would flatter whichever had the easier slate.
 */
export function buildVegasComparison(rows) {
  const withLine = rows.filter((r) => r.vegasCorrect !== null && r.vegasCorrect !== undefined);
  if (!withLine.length) return null;

  const model = withLine.filter((r) => r.correct).length / withLine.length;
  const vegas = withLine.filter((r) => r.vegasCorrect).length / withLine.length;
  const agree = withLine.filter((r) => r.correct === r.vegasCorrect).length / withLine.length;

  return {
    games: withLine.length,
    modelAccuracy: model,
    vegasAccuracy: vegas,
    agreementRate: agree,
    // Where they disagreed, how often was the model the one that was right?
    modelWinsDisagreements: (() => {
      const split = withLine.filter((r) => r.correct !== r.vegasCorrect);
      return split.length ? split.filter((r) => r.correct).length / split.length : null;
    })(),
  };
}

/**
 * Splits football has and baseball does not.
 *
 * `inGroupLabel` differs by sport because the underlying flag does: for college it
 * marks a conference game, for the NFL a divisional one. Calling both "conference"
 * would be wrong for half the site.
 */
export function buildContextSplits(rows, inGroupLabel = 'Conference game') {
  const outGroupLabel = inGroupLabel.startsWith('Division')
    ? 'Non-divisional'
    : 'Non-conference';

  const splits = [
    { key: 'conference', label: inGroupLabel, match: (r) => r.isDivisional },
    { key: 'nonconference', label: outGroupLabel, match: (r) => !r.isDivisional },
    { key: 'neutral', label: 'Neutral site', match: (r) => r.neutralSite },
    { key: 'home', label: 'Home site', match: (r) => !r.neutralSite },
    { key: 'cross', label: 'Cross-division', match: (r) => r.crossDivision },
  ];

  return splits
    .map((split) => {
      const matches = rows.filter(split.match);
      return matches.length ? { ...split, ...summarizePredictionDiagnostics(matches) } : null;
    })
    .filter(Boolean);
}

export function filterFootballDiagnostics(rows, filters) {
  const needle = (filters.search || '').trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.seasons?.length && !filters.seasons.includes(row.season)) return false;
    if (filters.tier !== 'all'
        && (row.confidenceTier || '').toUpperCase() !== filters.tier) return false;
    if (filters.context === 'conference' && !row.isDivisional) return false;
    if (filters.context === 'nonconference' && row.isDivisional) return false;
    if (filters.context === 'neutral' && !row.neutralSite) return false;
    if (filters.hideMismatch && row.crossDivision) return false;
    if (filters.model !== 'all' && row.modelVersion !== filters.model) return false;
    if (filters.conference !== 'all') {
      const home = filters.conferenceOf(row.homeTeamName);
      const away = filters.conferenceOf(row.awayTeamName);
      if (home !== filters.conference && away !== filters.conference) return false;
    }
    if (needle) {
      const haystack = `${row.homeTeamName} ${row.awayTeamName} ${row.predictedWinner}`
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}
