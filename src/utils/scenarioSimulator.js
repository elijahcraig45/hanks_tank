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
      hint: `Lineup wOBA diff ${lineupDiff.toFixed(3)}`,
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
