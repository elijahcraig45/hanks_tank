const DEFAULT_SPLIT_STAT = {
  avg: 0.245,
  obp: 0.315,
  slg: 0.400,
  ops: 0.715,
  hitRate: 0.215,
  totalBasesPerPa: 0.365,
  homeRunRate: 0.032,
  strikeoutRate: 0.220,
  walkRate: 0.085,
};

const SLOT_EXPECTED_PLATE_APPEARANCES = {
  1: 4.85,
  2: 4.72,
  3: 4.61,
  4: 4.52,
  5: 4.42,
  6: 4.28,
  7: 4.15,
  8: 4.03,
  9: 3.92,
};

const LINEUP_ROLE_WEIGHTS = {
  1: { onBase: 0.40, contact: 0.25, power: 0.10, matchup: 0.25 },
  2: { onBase: 0.32, contact: 0.28, power: 0.12, matchup: 0.28 },
  3: { onBase: 0.22, contact: 0.18, power: 0.22, matchup: 0.38 },
  4: { onBase: 0.12, contact: 0.13, power: 0.38, matchup: 0.37 },
  5: { onBase: 0.14, contact: 0.14, power: 0.34, matchup: 0.38 },
  6: { onBase: 0.18, contact: 0.18, power: 0.24, matchup: 0.40 },
  7: { onBase: 0.20, contact: 0.22, power: 0.20, matchup: 0.38 },
  8: { onBase: 0.21, contact: 0.24, power: 0.16, matchup: 0.39 },
  9: { onBase: 0.28, contact: 0.20, power: 0.12, matchup: 0.40 },
};

const PROJECTED_LINEUP_SLOT_RANKERS = {
  1: (profile) => profile.onBaseScore * 0.42 + profile.contactScore * 0.28 + profile.matchupScore * 0.30,
  2: (profile) => profile.onBaseScore * 0.30 + profile.contactScore * 0.30 + profile.matchupScore * 0.30 + profile.powerScore * 0.10,
  3: (profile) => profile.matchupScore * 0.40 + profile.onBaseScore * 0.20 + profile.powerScore * 0.25 + profile.contactScore * 0.15,
  4: (profile) => profile.powerScore * 0.44 + profile.matchupScore * 0.34 + profile.onBaseScore * 0.12 + profile.contactScore * 0.10,
  5: (profile) => profile.powerScore * 0.36 + profile.matchupScore * 0.34 + profile.onBaseScore * 0.15 + profile.contactScore * 0.15,
  6: (profile) => profile.matchupScore * 0.34 + profile.powerScore * 0.24 + profile.onBaseScore * 0.20 + profile.contactScore * 0.22,
  7: (profile) => profile.matchupScore * 0.34 + profile.contactScore * 0.24 + profile.onBaseScore * 0.20 + profile.powerScore * 0.22,
  8: (profile) => profile.contactScore * 0.28 + profile.matchupScore * 0.30 + profile.onBaseScore * 0.22 + profile.powerScore * 0.20,
  9: (profile) => profile.onBaseScore * 0.30 + profile.matchupScore * 0.30 + profile.contactScore * 0.22 + profile.powerScore * 0.18,
};

function clampRate(value, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(0.999, Math.max(0.001, numericValue));
}

function clampShare(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(0.999, Math.max(0, numericValue));
}

function parseNumeric(value, fallback = null) {
  if (value == null || value === '') {
    return fallback;
  }

  const numericValue = Number.parseFloat(String(value));
  return Number.isNaN(numericValue) ? fallback : numericValue;
}

function parseRate(value, fallback) {
  const numericValue = parseNumeric(value);
  if (numericValue == null) {
    return fallback;
  }

  return numericValue > 1 ? numericValue / 100 : numericValue;
}

function normalizeScore(value, leagueAverage) {
  return Number((value / leagueAverage).toFixed(3));
}

function getSlotRoleWeights(slot) {
  return LINEUP_ROLE_WEIGHTS[slot] || LINEUP_ROLE_WEIGHTS[5];
}

function getExpectedPlateAppearances(slot) {
  return SLOT_EXPECTED_PLATE_APPEARANCES[slot] || SLOT_EXPECTED_PLATE_APPEARANCES[5];
}

function getSplitStatForPitcherHand(splitResponse, pitcherHand) {
  const handednessCode = String(pitcherHand || 'R').toUpperCase() === 'L' ? 'vl' : 'vr';
  const splitRows = Array.isArray(splitResponse?.splits) ? splitResponse.splits : [];
  const matchedSplit = splitRows.find((row) => row?.split?.code === handednessCode);
  return matchedSplit?.stat || splitResponse?.baseline?.stat || {};
}

function formatRosterName(entry) {
  return (
    entry?.playerName ||
    entry?.person?.fullName ||
    entry?.fullName ||
    entry?.name ||
    'Unknown player'
  );
}

function formatRosterPosition(entry) {
  return (
    entry?.position?.abbreviation ||
    entry?.primaryPosition?.abbreviation ||
    entry?.position ||
    ''
  );
}

export function clampProbability(value) {
  if (!Number.isFinite(Number(value))) {
    return 0.5;
  }

  return Math.min(0.999, Math.max(0.001, Number(value)));
}

export function formatSignedPoints(value) {
  const numericValue = Number(value) || 0;
  return `${numericValue > 0 ? '+' : ''}${numericValue.toFixed(1)} pts`;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createNormalSample(random) {
  const u1 = Math.max(random(), 1e-7);
  const u2 = Math.max(random(), 1e-7);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function applyScenarioAdjustments(baseHomeProbability, adjustments = {}) {
  const totalAdjustment = Object.values(adjustments).reduce((sum, value) => sum + (Number(value) || 0), 0);
  return clampProbability(Number(baseHomeProbability) + totalAdjustment / 100);
}

export function simulateMatchupDistribution(homeWinProbability, iterations = 5000, seed = 1) {
  const simulationCount = Math.max(250, Number(iterations) || 5000);
  const random = createSeededRandom(seed);
  const meanMargin = (clampProbability(homeWinProbability) - 0.5) * 9.5;
  const standardDeviation = 3.6;
  const bins = [
    { label: 'Away 4+', count: 0, min: Number.NEGATIVE_INFINITY, max: -3.5 },
    { label: 'Away 2-3', count: 0, min: -3.5, max: -1.5 },
    { label: 'One-run', count: 0, min: -1.5, max: 1.5 },
    { label: 'Home 2-3', count: 0, min: 1.5, max: 3.5 },
    { label: 'Home 4+', count: 0, min: 3.5, max: Number.POSITIVE_INFINITY },
  ];

  let homeWins = 0;
  let totalMargin = 0;
  let closeGames = 0;

  for (let index = 0; index < simulationCount; index += 1) {
    const margin = meanMargin + createNormalSample(random) * standardDeviation;
    totalMargin += margin;

    if (margin > 0) {
      homeWins += 1;
    }

    if (Math.abs(margin) <= 1.5) {
      closeGames += 1;
    }

    const bucket = bins.find((entry) => margin >= entry.min && margin < entry.max);
    if (bucket) {
      bucket.count += 1;
    }
  }

  return {
    simulations: simulationCount,
    homeWinRate: homeWins / simulationCount,
    awayWinRate: 1 - homeWins / simulationCount,
    averageMargin: totalMargin / simulationCount,
    closeGameRate: closeGames / simulationCount,
    bins: bins.map((entry) => ({
      label: entry.label,
      count: entry.count,
      share: entry.count / simulationCount,
    })),
  };
}

export function getScenarioContext(prediction) {
  const lineupDiff =
    (Number(prediction?.home_lineup_woba_vs_hand) || 0) -
    (Number(prediction?.away_lineup_woba_vs_hand) || 0);

  return [
    {
      key: 'starter',
      label: 'Starter adjustment',
      hint: `SP quality diff ${Number(prediction?.sp_quality_composite_diff || prediction?.starter_arsenal_advantage || 0).toFixed(2)}`,
      min: -12,
      max: 12,
      step: 0.5,
    },
    {
      key: 'lineup',
      label: 'Lineup adjustment',
      hint: `Manual lineup override beyond the slot-value model (${lineupDiff.toFixed(3)} baseline diff)`,
      min: -10,
      max: 10,
      step: 0.5,
    },
    {
      key: 'bullpen',
      label: 'Bullpen adjustment',
      hint: `Bullpen fatigue diff ${Number(prediction?.bullpen_fatigue_differential || 0).toFixed(2)}`,
      min: -8,
      max: 8,
      step: 0.5,
    },
    {
      key: 'form',
      label: 'Form adjustment',
      hint: `Elo home win ${((Number(prediction?.elo_home_win_prob) || 0.5) * 100).toFixed(1)}%`,
      min: -6,
      max: 6,
      step: 0.5,
    },
    {
      key: 'context',
      label: 'Context adjustment',
      hint: `Venue diff ${Number(prediction?.venue_woba_differential || 0).toFixed(3)}`,
      min: -5,
      max: 5,
      step: 0.5,
    },
  ];
}

export function normalizeRosterCandidates(roster = []) {
  const seen = new Set();

  return (Array.isArray(roster) ? roster : [])
    .map((entry) => {
      const playerId = Number(entry?.playerId || entry?.person?.id || entry?.id || 0);
      return {
        playerId,
        playerName: formatRosterName(entry),
        position: formatRosterPosition(entry),
        status: entry?.status?.description || entry?.status?.code || entry?.status || '',
      };
    })
    .filter((entry) => {
      if (!entry.playerId || seen.has(entry.playerId)) {
        return false;
      }

      seen.add(entry.playerId);
      return entry.position !== 'P';
    })
    .sort((left, right) => {
      const leftActive = String(left.status).toLowerCase() === 'active' ? 1 : 0;
      const rightActive = String(right.status).toLowerCase() === 'active' ? 1 : 0;

      if (leftActive !== rightActive) {
        return rightActive - leftActive;
      }

      return left.playerName.localeCompare(right.playerName);
    });
}

export function buildPlayerMatchupProfile(player, splitResponse, pitcherHand) {
  const splitStat = getSplitStatForPitcherHand(splitResponse, pitcherHand);
  const baselineStat = splitResponse?.baseline?.stat || {};

  const plateAppearances = parseNumeric(
    splitStat.plateAppearances ?? baselineStat.plateAppearances,
    0
  );
  const atBats = parseNumeric(splitStat.atBats ?? baselineStat.atBats, null);
  const hits = parseNumeric(splitStat.hits ?? baselineStat.hits, null);
  const totalBases = parseNumeric(splitStat.totalBases ?? baselineStat.totalBases, null);
  const homeRuns = parseNumeric(splitStat.homeRuns ?? baselineStat.homeRuns, null);
  const strikeOuts = parseNumeric(splitStat.strikeOuts ?? baselineStat.strikeOuts, null);
  const walks = parseNumeric(splitStat.baseOnBalls ?? baselineStat.baseOnBalls, null);

  const avg = clampRate(parseRate(splitStat.avg ?? baselineStat.avg, DEFAULT_SPLIT_STAT.avg), DEFAULT_SPLIT_STAT.avg);
  const obp = clampRate(parseRate(splitStat.obp ?? baselineStat.obp, DEFAULT_SPLIT_STAT.obp), DEFAULT_SPLIT_STAT.obp);
  const slg = clampRate(parseRate(splitStat.slg ?? baselineStat.slg, DEFAULT_SPLIT_STAT.slg), DEFAULT_SPLIT_STAT.slg);
  const ops = clampRate(parseRate(splitStat.ops ?? baselineStat.ops, DEFAULT_SPLIT_STAT.ops), DEFAULT_SPLIT_STAT.ops);

  const hitRate = clampRate(
    plateAppearances > 0 && hits != null ? hits / plateAppearances : avg * 0.88,
    DEFAULT_SPLIT_STAT.hitRate
  );
  const totalBasesPerPa = clampRate(
    plateAppearances > 0 && totalBases != null
      ? totalBases / plateAppearances
      : (atBats != null ? slg * atBats : slg * 3.4) / Math.max(plateAppearances || 3.8, 1),
    DEFAULT_SPLIT_STAT.totalBasesPerPa
  );
  const homeRunRate = clampRate(
    plateAppearances > 0 && homeRuns != null ? homeRuns / plateAppearances : DEFAULT_SPLIT_STAT.homeRunRate,
    DEFAULT_SPLIT_STAT.homeRunRate
  );
  const strikeoutRate = clampRate(
    plateAppearances > 0 && strikeOuts != null ? strikeOuts / plateAppearances : DEFAULT_SPLIT_STAT.strikeoutRate,
    DEFAULT_SPLIT_STAT.strikeoutRate
  );
  const walkRate = clampRate(
    plateAppearances > 0 && walks != null ? walks / plateAppearances : DEFAULT_SPLIT_STAT.walkRate,
    DEFAULT_SPLIT_STAT.walkRate
  );

  const onBaseScore = normalizeScore(obp, DEFAULT_SPLIT_STAT.obp);
  const powerScore = normalizeScore(slg, DEFAULT_SPLIT_STAT.slg);
  const contactScore = normalizeScore(1 - strikeoutRate, 1 - DEFAULT_SPLIT_STAT.strikeoutRate);
  const matchupScore = Number(
    (
      normalizeScore(ops, DEFAULT_SPLIT_STAT.ops) * 0.48 +
      onBaseScore * 0.22 +
      powerScore * 0.20 +
      contactScore * 0.10
    ).toFixed(3)
  );

  return {
    ...player,
    pitcherHand: String(pitcherHand || 'R').toUpperCase(),
    plateAppearances,
    avg,
    obp,
    slg,
    ops,
    hitRate,
    totalBasesPerPa,
    homeRunRate,
    strikeoutRate,
    walkRate,
    onBaseScore,
    powerScore,
    contactScore,
    matchupScore,
    splitLabel: String(pitcherHand || 'R').toUpperCase() === 'L' ? 'vs LHP' : 'vs RHP',
  };
}

export function assignLineupSlot(profile, slot) {
  if (!profile) {
    return null;
  }

  const expectedPlateAppearances = getExpectedPlateAppearances(slot);
  const roleWeights = getSlotRoleWeights(slot);
  const slotSkillScore = Number(
    (
      profile.onBaseScore * roleWeights.onBase +
      profile.contactScore * roleWeights.contact +
      profile.powerScore * roleWeights.power +
      profile.matchupScore * roleWeights.matchup
    ).toFixed(3)
  );

  return {
    ...profile,
    slot,
    expectedPlateAppearances,
    slotSkillScore,
    slotValue: Number((slotSkillScore * expectedPlateAppearances).toFixed(3)),
    hitProbability: clampShare(1 - Math.pow(1 - profile.hitRate, expectedPlateAppearances)),
    expectedHits: Number((profile.hitRate * expectedPlateAppearances).toFixed(2)),
    expectedTotalBases: Number((profile.totalBasesPerPa * expectedPlateAppearances).toFixed(2)),
    homeRunProbability: clampShare(1 - Math.pow(1 - profile.homeRunRate, expectedPlateAppearances)),
    strikeoutProbability: clampShare(1 - Math.pow(1 - profile.strikeoutRate, expectedPlateAppearances)),
    walkProbability: clampShare(1 - Math.pow(1 - profile.walkRate, expectedPlateAppearances)),
  };
}

export function buildProjectedLineup(profiles = []) {
  const remaining = [...profiles];
  const assignments = [];

  for (let slot = 1; slot <= 9; slot += 1) {
    const ranker = PROJECTED_LINEUP_SLOT_RANKERS[slot] || PROJECTED_LINEUP_SLOT_RANKERS[5];
    const bestIndex = remaining.reduce((best, profile, index) => {
      if (best === -1) {
        return index;
      }

      return ranker(profile) > ranker(remaining[best]) ? index : best;
    }, -1);

    if (bestIndex === -1) {
      break;
    }

    const [profile] = remaining.splice(bestIndex, 1);
    assignments.push(assignLineupSlot(profile, slot));
  }

  return assignments.filter(Boolean);
}

export function evaluateLineup(playerIds = [], candidates = []) {
  const candidateMap = new Map(candidates.map((candidate) => [candidate.playerId, candidate]));
  const assignments = playerIds
    .map((playerId, index) => assignLineupSlot(candidateMap.get(Number(playerId)), index + 1))
    .filter(Boolean);

  const top3Value = assignments
    .filter((entry) => entry.slot <= 3)
    .reduce((sum, entry) => sum + entry.slotValue, 0);
  const middle3Value = assignments
    .filter((entry) => entry.slot >= 4 && entry.slot <= 6)
    .reduce((sum, entry) => sum + entry.slotValue, 0);
  const bottom3Value = assignments
    .filter((entry) => entry.slot >= 7)
    .reduce((sum, entry) => sum + entry.slotValue, 0);
  const totalSlotValue = assignments.reduce((sum, entry) => sum + entry.slotValue, 0);
  const totalExpectedHits = assignments.reduce((sum, entry) => sum + entry.expectedHits, 0);
  const totalExpectedBases = assignments.reduce((sum, entry) => sum + entry.expectedTotalBases, 0);
  const weightedOps = assignments.reduce(
    (sum, entry) => sum + entry.ops * entry.expectedPlateAppearances,
    0
  );
  const totalExpectedPa = assignments.reduce((sum, entry) => sum + entry.expectedPlateAppearances, 0);

  return {
    assignments,
    top3Value: Number(top3Value.toFixed(2)),
    middle3Value: Number(middle3Value.toFixed(2)),
    bottom3Value: Number(bottom3Value.toFixed(2)),
    totalSlotValue: Number(totalSlotValue.toFixed(2)),
    totalExpectedHits: Number(totalExpectedHits.toFixed(2)),
    totalExpectedBases: Number(totalExpectedBases.toFixed(2)),
    weightedOps: totalExpectedPa > 0 ? Number((weightedOps / totalExpectedPa).toFixed(3)) : 0,
  };
}

export function summarizeLineupAdjustment(currentHome, baselineHome, currentAway, baselineAway) {
  const homeDelta = Number(
    ((currentHome?.totalSlotValue || 0) - (baselineHome?.totalSlotValue || 0)).toFixed(2)
  );
  const awayDelta = Number(
    ((currentAway?.totalSlotValue || 0) - (baselineAway?.totalSlotValue || 0)).toFixed(2)
  );
  const rawShift = homeDelta - awayDelta;
  const winProbabilityPoints = Math.max(-12, Math.min(12, Number((rawShift * 6).toFixed(1))));

  return {
    homeDelta,
    awayDelta,
    rawShift: Number(rawShift.toFixed(2)),
    winProbabilityPoints,
  };
}
