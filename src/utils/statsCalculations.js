/**
 * Advanced Statistics Utilities
 * Calculate advanced baseball metrics and trends
 */

/**
 * Calculate weighted on-base average (wOBA)
 * Formula from FanGraphs: (0.69×uBB + 0.72×HBP + 0.88×1B + 1.27×2B + 1.62×3B + 2.10×HR) / (AB + BB + SF + HBP)
 */
export const calculateWOBA = (stats) => {
  const {AB, BB, HBP = 0, H, '2B': doubles = 0, '3B': triples = 0, HR = 0, SF = 0} = stats;
  
  const singles = H - doubles - triples - HR;
  const numerator = (0.69 * BB) + (0.72 * HBP) + (0.88 * singles) + 
                    (1.27 * doubles) + (1.62 * triples) + (2.10 * HR);
  const denominator = AB + BB + SF + HBP;
  
  return denominator > 0 ? (numerator / denominator).toFixed(3) : '.000';
};

/**
 * Calculate isolated power (ISO)
 * ISO = SLG - AVG
 */
export const calculateISO = (stats) => {
  const slg = parseFloat(stats.SLG) || 0;
  const avg = parseFloat(stats.AVG) || 0;
  return (slg - avg).toFixed(3);
};

/**
 * Calculate batting average on balls in play (BABIP)
 * BABIP = (H - HR) / (AB - SO - HR + SF)
 */
export const calculateBABIP = (stats) => {
  const {H, HR = 0, AB, SO = 0, SF = 0} = stats;
  const numerator = H - HR;
  const denominator = AB - SO - HR + SF;
  return denominator > 0 ? (numerator / denominator).toFixed(3) : '.000';
};

/**
 * Calculate walk rate (BB%)
 */
export const calculateBBPercent = (stats) => {
  const {BB = 0, PA = 0, AB = 0} = stats;
  const plateAppearances = PA || AB;
  return plateAppearances > 0 ? ((BB / plateAppearances) * 100).toFixed(1) : '0.0';
};

/**
 * Calculate strikeout rate (K%)
 */
export const calculateKPercent = (stats) => {
  const {SO = 0, PA = 0, AB = 0} = stats;
  const plateAppearances = PA || AB;
  return plateAppearances > 0 ? ((SO / plateAppearances) * 100).toFixed(1) : '0.0';
};

/**
 * Calculate secondary average
 * SecA = (TB - H + BB + SB) / AB
 */
export const calculateSecondaryAverage = (stats) => {
  const {TB = 0, H, BB = 0, SB = 0, AB} = stats;
  return AB > 0 ? ((TB - H + BB + SB) / AB).toFixed(3) : '.000';
};

/**
 * Calculate base runs
 * BaseRuns = A × B / (B + C) + D
 */
export const calculateBaseRuns = (stats) => {
  const {H, BB = 0, HBP = 0, HR = 0, AB, '2B': doubles = 0, '3B': triples = 0, TB = 0} = stats;
  
  const A = H + BB + HBP - HR;
  const B = (1.4 * TB) - (0.6 * H) + (3 * BB) + (HBP);
  const C = AB - H;
  const D = HR;
  
  return B + C > 0 ? (A * B / (B + C) + D).toFixed(1) : '0.0';
};

/**
 * Get performance rating based on OPS
 */
export const getOPSRating = (ops) => {
  const opsValue = parseFloat(ops) || 0;
  
  if (opsValue >= 0.900) return { label: 'Elite', color: '#198754', tier: 'A+' };
  if (opsValue >= 0.800) return { label: 'Excellent', color: '#0d6efd', tier: 'A' };
  if (opsValue >= 0.750) return { label: 'Above Average', color: '#20c997', tier: 'B+' };
  if (opsValue >= 0.700) return { label: 'Average', color: '#ffc107', tier: 'B' };
  if (opsValue >= 0.650) return { label: 'Below Average', color: '#fd7e14', tier: 'C' };
  return { label: 'Poor', color: '#dc3545', tier: 'D' };
};

/**
 * Get ERA rating for pitchers
 */
export const getERARating = (era) => {
  const eraValue = parseFloat(era) || 99;
  
  if (eraValue <= 2.50) return { label: 'Elite', color: '#198754', tier: 'A+' };
  if (eraValue <= 3.50) return { label: 'Excellent', color: '#0d6efd', tier: 'A' };
  if (eraValue <= 4.00) return { label: 'Above Average', color: '#20c997', tier: 'B+' };
  if (eraValue <= 4.50) return { label: 'Average', color: '#ffc107', tier: 'B' };
  if (eraValue <= 5.00) return { label: 'Below Average', color: '#fd7e14', tier: 'C' };
  return { label: 'Poor', color: '#dc3545', tier: 'D' };
};

/**
 * Calculate plate appearances
 */
export const calculatePA = (stats) => {
  const {AB = 0, BB = 0, HBP = 0, SF = 0, SH = 0} = stats;
  return AB + BB + HBP + SF + SH;
};

/**
 * Format stat value for display
 */
export const formatStat = (stat, value) => {
  if (value === null || value === undefined || value === '') return '-';
  
  // Percentage stats
  if (['AVG', 'OBP', 'SLG', 'OPS', 'wOBA', 'BABIP', 'ISO'].includes(stat)) {
    return parseFloat(value).toFixed(3);
  }
  
  // Percentage displays
  if (stat.endsWith('%') || stat === 'W-L%') {
    return `${parseFloat(value * 100).toFixed(1)}%`;
  }
  
  // Decimal stats
  if (['ERA', 'WHIP', 'FIP'].includes(stat)) {
    return parseFloat(value).toFixed(2);
  }
  
  // Innings pitched
  if (stat === 'IP') {
    return parseFloat(value).toFixed(1);
  }
  
  // Integer stats
  return Math.round(parseFloat(value) || 0);
};

/**
 * Calculate stat percentile rank
 */
export const calculatePercentile = (value, allValues) => {
  if (!allValues || allValues.length === 0) return 50;
  
  const sorted = [...allValues].sort((a, b) => a - b);
  const index = sorted.findIndex(v => v >= value);
  
  if (index === -1) return 100;
  return Math.round((index / sorted.length) * 100);
};

/**
 * Get trend direction
 */
export const getTrendDirection = (current, previous) => {
  if (!previous || !current) return { direction: 'neutral', change: 0 };
  
  const change = ((current - previous) / previous) * 100;
  
  return {
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    change: Math.abs(change).toFixed(1),
    isPositive: change > 0
  };
};

/**
 * Calculate rolling average
 */
export const calculateRollingAverage = (values, window = 10) => {
  if (!values || values.length < window) return values;
  
  return values.map((_, idx) => {
    if (idx < window - 1) return null;
    const slice = values.slice(idx - window + 1, idx + 1);
    return slice.reduce((sum, val) => sum + val, 0) / window;
  });
};

/**
 * Identify hot/cold streaks
 */
export const identifyStreaks = (gameLog, stat = 'H', threshold = 0.300) => {
  if (!gameLog || gameLog.length === 0) return { hot: false, cold: false, games: 0 };
  
  const recentGames = gameLog.slice(-10);
  const statValues = recentGames.map(g => parseFloat(g[stat]) || 0);
  const average = statValues.reduce((sum, val) => sum + val, 0) / statValues.length;
  
  if (average >= threshold * 1.2) {
    return { hot: true, cold: false, games: recentGames.length, average };
  } else if (average <= threshold * 0.8) {
    return { hot: false, cold: true, games: recentGames.length, average };
  }
  
  return { hot: false, cold: false, games: 0, average };
};

/**
 * Calculate consistency score (0-100)
 * Lower coefficient of variation = higher consistency
 */
export const calculateConsistency = (values) => {
  if (!values || values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = (stdDev / mean) * 100;
  
  // Invert and scale to 0-100
  return Math.max(0, Math.min(100, 100 - coefficientOfVariation));
};

/**
 * Get position-specific benchmarks
 */
export const getPositionBenchmarks = (position) => {
  const benchmarks = {
    'C': { AVG: 0.240, HR: 15, OPS: 0.720 },      // Catcher
    '1B': { AVG: 0.265, HR: 25, OPS: 0.800 },     // First Base
    '2B': { AVG: 0.260, HR: 15, OPS: 0.750 },     // Second Base
    '3B': { AVG: 0.255, HR: 22, OPS: 0.775 },     // Third Base
    'SS': { AVG: 0.255, HR: 18, OPS: 0.760 },     // Shortstop
    'LF': { AVG: 0.260, HR: 20, OPS: 0.780 },     // Left Field
    'CF': { AVG: 0.265, HR: 18, OPS: 0.770 },     // Center Field
    'RF': { AVG: 0.265, HR: 23, OPS: 0.790 },     // Right Field
    'DH': { AVG: 0.260, HR: 28, OPS: 0.820 },     // Designated Hitter
  };
  
  return benchmarks[position] || benchmarks['RF'];
};

export default {
  calculateWOBA,
  calculateISO,
  calculateBABIP,
  calculateBBPercent,
  calculateKPercent,
  calculateSecondaryAverage,
  calculateBaseRuns,
  getOPSRating,
  getERARating,
  calculatePA,
  formatStat,
  calculatePercentile,
  getTrendDirection,
  calculateRollingAverage,
  identifyStreaks,
  calculateConsistency,
  getPositionBenchmarks
};
