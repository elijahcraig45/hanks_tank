import { extractIsoDate, formatIsoDateLabel } from './analytics';

const CONFIDENCE_ORDER = ['HIGH', 'MEDIUM', 'LOW'];

export function normalizeConfidenceTier(value) {
  if (!value) {
    return 'LOW';
  }

  const normalized = String(value).toUpperCase();
  return CONFIDENCE_ORDER.includes(normalized) ? normalized : 'LOW';
}

export function filterPredictionDiagnostics(rows, filters) {
  const normalizedSearch = filters.searchTerm.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.confidence !== 'all' && normalizeConfidenceTier(row.confidenceTier) !== filters.confidence) {
      return false;
    }

    if (filters.lineups === 'confirmed' && !row.lineupConfirmed) {
      return false;
    }

    if (filters.lineups === 'probable' && row.lineupConfirmed) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const haystack = [
      row.awayTeamName,
      row.homeTeamName,
      row.predictedWinner,
      row.actualWinner,
      row.awayStarterName,
      row.homeStarterName,
      row.modelVersion,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}

export function summarizePredictionDiagnostics(rows) {
  if (!rows.length) {
    return {
      games: 0,
      accuracy: null,
      avgEdge: null,
      avgPredictedWinProbability: null,
      brierScore: null,
      logLoss: null,
      confirmedLineupRate: null,
    };
  }

  const totals = rows.reduce(
    (accumulator, row) => ({
      wins: accumulator.wins + (row.correct ? 1 : 0),
      edge: accumulator.edge + Number(row.edge || 0),
      probability: accumulator.probability + Number(row.predictedWinProbability || 0),
      brierScore: accumulator.brierScore + Number(row.brierScore || 0),
      logLoss: accumulator.logLoss + Number(row.logLoss || 0),
      confirmed: accumulator.confirmed + (row.lineupConfirmed ? 1 : 0),
    }),
    { wins: 0, edge: 0, probability: 0, brierScore: 0, logLoss: 0, confirmed: 0 }
  );

  return {
    games: rows.length,
    accuracy: totals.wins / rows.length,
    avgEdge: totals.edge / rows.length,
    avgPredictedWinProbability: totals.probability / rows.length,
    brierScore: totals.brierScore / rows.length,
    logLoss: totals.logLoss / rows.length,
    confirmedLineupRate: totals.confirmed / rows.length,
  };
}

export function buildConfidenceBreakdown(rows) {
  return CONFIDENCE_ORDER
    .map((tier) => {
      const matches = rows.filter((row) => normalizeConfidenceTier(row.confidenceTier) === tier);
      const summary = summarizePredictionDiagnostics(matches);

      return {
        tier,
        ...summary,
      };
    })
    .filter((entry) => entry.games > 0);
}

export function buildCalibrationBins(rows) {
  const bins = [
    { label: '50-54%', min: 0.5, max: 0.55 },
    { label: '55-59%', min: 0.55, max: 0.6 },
    { label: '60-64%', min: 0.6, max: 0.65 },
    { label: '65-69%', min: 0.65, max: 0.7 },
    { label: '70-74%', min: 0.7, max: 0.75 },
    { label: '75%+', min: 0.75, max: 1.01 },
  ];

  return bins
    .map((bin) => {
      const matches = rows.filter((row) => row.predictedWinProbability >= bin.min && row.predictedWinProbability < bin.max);
      if (!matches.length) {
        return null;
      }

      return {
        label: bin.label,
        games: matches.length,
        predictedRate: matches.reduce((sum, row) => sum + Number(row.predictedWinProbability || 0), 0) / matches.length,
        observedRate: matches.reduce((sum, row) => sum + (row.correct ? 1 : 0), 0) / matches.length,
      };
    })
    .filter(Boolean);
}

export function buildDailyDiagnosticsTrend(rows) {
  const byDate = rows.reduce((accumulator, row) => {
    const key = extractIsoDate(row.gameDate);
    if (!key) {
      return accumulator;
    }

    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(row);
    return accumulator;
  }, {});

  return Object.entries(byDate)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, entries]) => {
      const summary = summarizePredictionDiagnostics(entries);
      return {
        date,
        shortDate: formatIsoDateLabel(date, {
          month: 'short',
          day: 'numeric',
        }),
        games: summary.games,
        accuracy: summary.accuracy,
        avgEdge: summary.avgEdge,
        brierScore: summary.brierScore,
      };
    });
}

