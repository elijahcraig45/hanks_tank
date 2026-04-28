import {
  getTeamLogoUrl,
  getTeamMetaByAbbr,
  normalizeTeamAbbreviation,
} from './teamMetadata';

const METRIC_CONFIG = {
  player: {
    hitting: [
      { key: 'OPS', label: 'OPS', digits: 3 },
      { key: 'AVG', label: 'AVG', digits: 3 },
      { key: 'OBP', label: 'OBP', digits: 3 },
      { key: 'SLG', label: 'SLG', digits: 3 },
      { key: 'HR', label: 'HR', digits: 0 },
      { key: 'RBI', label: 'RBI', digits: 0 },
      { key: 'SB', label: 'SB', digits: 0 },
      { key: 'BB', label: 'BB', digits: 0 },
    ],
    pitching: [
      { key: 'ERA', label: 'ERA', digits: 3, lowerIsBetter: true },
      { key: 'WHIP', label: 'WHIP', digits: 3, lowerIsBetter: true },
      { key: 'SO', label: 'SO', digits: 0 },
      { key: 'W', label: 'W', digits: 0 },
      { key: 'IP', label: 'IP', digits: 1 },
      { key: 'K/9', label: 'K/9', digits: 2 },
      { key: 'BB/9', label: 'BB/9', digits: 2, lowerIsBetter: true },
      { key: 'HR/9', label: 'HR/9', digits: 2, lowerIsBetter: true },
    ],
  },
  team: {
    hitting: [
      { key: 'OPS', label: 'OPS', digits: 3 },
      { key: 'AVG', label: 'AVG', digits: 3 },
      { key: 'OBP', label: 'OBP', digits: 3 },
      { key: 'SLG', label: 'SLG', digits: 3 },
      { key: 'HR', label: 'HR', digits: 0 },
      { key: 'RBI', label: 'RBI', digits: 0 },
      { key: 'R', label: 'R', digits: 0 },
      { key: 'BB', label: 'BB', digits: 0 },
    ],
    pitching: [
      { key: 'ERA', label: 'ERA', digits: 3, lowerIsBetter: true },
      { key: 'WHIP', label: 'WHIP', digits: 3, lowerIsBetter: true },
      { key: 'SO', label: 'SO', digits: 0 },
      { key: 'W', label: 'W', digits: 0 },
      { key: 'IP', label: 'IP', digits: 1 },
      { key: 'H', label: 'H', digits: 0, lowerIsBetter: true },
      { key: 'BB', label: 'BB', digits: 0, lowerIsBetter: true },
      { key: 'SV', label: 'SV', digits: 0 },
    ],
  },
};

function toNumber(value) {
  if (value == null || value === '') {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function average(values, digits = 1) {
  if (!values.length) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(digits));
}

function calculatePercentile(value, values, lowerIsBetter = false) {
  if (value == null || !values.length) {
    return null;
  }

  const passingCount = values.filter((candidate) =>
    lowerIsBetter ? candidate >= value : candidate <= value
  ).length;

  return Math.round((passingCount / values.length) * 100);
}

function calculateZScore(value, mean, stdDev, lowerIsBetter = false) {
  if (value == null || mean == null || !stdDev) {
    return null;
  }

  const rawScore = (value - mean) / stdDev;
  const orientedScore = lowerIsBetter ? -rawScore : rawScore;
  return Number(orientedScore.toFixed(2));
}

export function getMetricConfig(entityType = 'player', group = 'hitting') {
  return METRIC_CONFIG[entityType]?.[group] || METRIC_CONFIG.player.hitting;
}

export function getEntityId(row, entityType = 'player') {
  if (entityType === 'team') {
    return normalizeTeamAbbreviation(row?.Team || row?.team_name || row?.abbreviation || '');
  }

  return String(row?.playerId || row?.IDfg || row?.id || '');
}

export function getEntityPresentation(row, entityType = 'player') {
  if (entityType === 'team') {
    const abbreviation = getEntityId(row, entityType);
    const teamMeta = getTeamMetaByAbbr(abbreviation);
    return {
      label: teamMeta?.name || abbreviation,
      shortLabel: abbreviation,
      subtitle: teamMeta?.city || '',
      logoUrl: teamMeta ? getTeamLogoUrl(teamMeta.id) : '',
    };
  }

  return {
    label: row?.Name || 'Unknown player',
    shortLabel: row?.Name || 'Unknown player',
    subtitle: row?.Team || '',
    logoUrl: '',
  };
}

export function formatMetricValue(metric, value, forDelta = false) {
  if (value == null || Number.isNaN(Number(value))) {
    return '—';
  }

  if (metric.digits === 0) {
    const rounded = Math.round(Number(value));
    return forDelta && rounded > 0 ? `+${rounded}` : `${rounded}`;
  }

  const fixedValue = Number(value).toFixed(metric.digits);
  const normalized = fixedValue.startsWith('0.') ? fixedValue.slice(1) : fixedValue;
  if (!forDelta) {
    return normalized;
  }

  return Number(value) > 0 ? `+${normalized}` : normalized;
}

export function buildWorkbenchEntities(rows = [], previousRows = [], entityType = 'player', group = 'hitting') {
  const metrics = getMetricConfig(entityType, group);
  const previousMap = new Map(previousRows.map((row) => [getEntityId(row, entityType), row]));
  const benchmarks = Object.fromEntries(
    metrics.map((metric) => {
      const values = rows.map((row) => toNumber(row?.[metric.key])).filter((value) => value != null);
      const mean = average(values, 4);
      const variance = values.length
        ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
        : 0;
      return [metric.key, { values, mean, stdDev: Number(Math.sqrt(variance).toFixed(4)) }];
    })
  );

  return rows
    .map((row) => {
      const id = getEntityId(row, entityType);
      if (!id) {
        return null;
      }

      const previousRow = previousMap.get(id) || null;
      const presentation = getEntityPresentation(row, entityType);
      const metricRows = metrics.map((metric) => {
        const value = toNumber(row?.[metric.key]);
        const previousValue = previousRow ? toNumber(previousRow?.[metric.key]) : null;
        const delta = value != null && previousValue != null ? Number((value - previousValue).toFixed(metric.digits || 2)) : null;
        const benchmark = benchmarks[metric.key];
        const percentile = calculatePercentile(value, benchmark.values, metric.lowerIsBetter);
        const zScore = calculateZScore(value, benchmark.mean, benchmark.stdDev, metric.lowerIsBetter);
        const deltaScore = delta == null ? null : metric.lowerIsBetter ? -delta : delta;

        return {
          ...metric,
          value,
          previousValue,
          delta,
          deltaScore,
          percentile,
          zScore,
          formattedValue: formatMetricValue(metric, value),
          formattedPreviousValue: formatMetricValue(metric, previousValue),
          formattedDelta: formatMetricValue(metric, delta, true),
        };
      });

      const percentileValues = metricRows.map((metric) => metric.percentile).filter((value) => value != null);
      const zScoreValues = metricRows.map((metric) => metric.zScore).filter((value) => value != null);
      const deltaScores = metricRows.map((metric) => metric.deltaScore).filter((value) => value != null);
      const topMetric = [...metricRows]
        .filter((metric) => metric.percentile != null)
        .sort((left, right) => right.percentile - left.percentile)[0] || null;

      return {
        id,
        ...presentation,
        metrics: metricRows,
        compositePercentile: percentileValues.length ? Math.round(average(percentileValues, 1)) : null,
        averageZScore: zScoreValues.length ? Number(average(zScoreValues, 2).toFixed(2)) : null,
        averageDeltaScore: deltaScores.length ? Number(average(deltaScores, 2).toFixed(2)) : null,
        topMetric,
      };
    })
    .filter(Boolean);
}

export function buildPercentileChartData(selectedEntities = [], entityType = 'player', group = 'hitting') {
  return getMetricConfig(entityType, group)
    .slice(0, 6)
    .map((metric) => {
      const row = { metric: metric.label };
      selectedEntities.forEach((entity) => {
        const metricMatch = entity.metrics.find((item) => item.key === metric.key);
        row[`entity_${entity.id}`] = metricMatch?.percentile ?? null;
      });
      return row;
    });
}

export function findClosestMatches(allEntities = [], focusEntity, limit = 5) {
  if (!focusEntity) {
    return [];
  }

  return allEntities
    .filter((entity) => entity.id !== focusEntity.id)
    .map((entity) => {
      const sharedMetrics = focusEntity.metrics
        .map((metric) => {
          const candidateMetric = entity.metrics.find((item) => item.key === metric.key);
          if (metric.zScore == null || candidateMetric?.zScore == null) {
            return null;
          }

          return Math.abs(metric.zScore - candidateMetric.zScore);
        })
        .filter((value) => value != null);

      if (!sharedMetrics.length) {
        return null;
      }

      const distance = average(sharedMetrics, 2);
      return {
        ...entity,
        similarityDistance: distance,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.similarityDistance - right.similarityDistance)
    .slice(0, limit);
}
