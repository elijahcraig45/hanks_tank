const SWING_MISS_DESCRIPTIONS = new Set([
  'swinging_strike',
  'swinging_strike_blocked',
  'missed_bunt',
]);

const STRIKE_DESCRIPTIONS = new Set([
  'called_strike',
  'swinging_strike',
  'swinging_strike_blocked',
  'foul',
  'foul_tip',
  'hit_into_play',
  'hit_into_play_no_out',
  'hit_into_play_score',
  'foul_bunt',
  'missed_bunt',
]);

function toNumber(value) {
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

export function filterStatcastData(rows = [], filters = {}) {
  const {
    pitchThrows = '',
    batterStands = '',
    event = '',
    pitchType = '',
  } = filters;

  return rows.filter((row) => {
    if (pitchThrows && row.p_throws !== pitchThrows) {
      return false;
    }

    if (batterStands && row.stand !== batterStands) {
      return false;
    }

    if (event && row.events !== event) {
      return false;
    }

    if (pitchType && (row.pitch_name || row.pitch_type) !== pitchType) {
      return false;
    }

    return true;
  });
}

export function summarizeStatcast(rows = []) {
  if (!rows.length) {
    return {
      pitches: 0,
      strikeRate: null,
      whiffRate: null,
      hardHitRate: null,
      avgReleaseSpeed: null,
      avgExitVelo: null,
      avgSpin: null,
    };
  }

  const strikes = rows.filter((row) => STRIKE_DESCRIPTIONS.has(row.description)).length;
  const whiffs = rows.filter((row) => SWING_MISS_DESCRIPTIONS.has(row.description)).length;
  const releaseSpeeds = rows.map((row) => toNumber(row.release_speed)).filter((value) => value != null);
  const exitVelocities = rows.map((row) => toNumber(row.launch_speed)).filter((value) => value != null);
  const spinRates = rows.map((row) => toNumber(row.release_spin_rate)).filter((value) => value != null);
  const hardHitBalls = exitVelocities.filter((value) => value >= 95).length;

  return {
    pitches: rows.length,
    strikeRate: rows.length ? strikes / rows.length : null,
    whiffRate: rows.length ? whiffs / rows.length : null,
    hardHitRate: exitVelocities.length ? hardHitBalls / exitVelocities.length : null,
    avgReleaseSpeed: average(releaseSpeeds),
    avgExitVelo: average(exitVelocities),
    avgSpin: average(spinRates, 0),
  };
}

export function buildPitchMix(rows = []) {
  const pitchMap = new Map();

  rows.forEach((row) => {
    const pitchName = row.pitch_name || row.pitch_type || 'Unknown';
    const bucket = pitchMap.get(pitchName) || {
      pitchName,
      count: 0,
      whiffs: 0,
      releaseSpeeds: [],
      spinRates: [],
    };

    bucket.count += 1;
    if (SWING_MISS_DESCRIPTIONS.has(row.description)) {
      bucket.whiffs += 1;
    }

    const releaseSpeed = toNumber(row.release_speed);
    const spinRate = toNumber(row.release_spin_rate);
    if (releaseSpeed != null) {
      bucket.releaseSpeeds.push(releaseSpeed);
    }
    if (spinRate != null) {
      bucket.spinRates.push(spinRate);
    }

    pitchMap.set(pitchName, bucket);
  });

  return Array.from(pitchMap.values())
    .map((bucket) => ({
      pitchName: bucket.pitchName,
      count: bucket.count,
      usage: rows.length ? bucket.count / rows.length : 0,
      whiffRate: bucket.count ? bucket.whiffs / bucket.count : 0,
      avgReleaseSpeed: average(bucket.releaseSpeeds),
      avgSpin: average(bucket.spinRates, 0),
    }))
    .sort((left, right) => right.count - left.count);
}

export function buildRollingTrend(rows = [], limitGames = 12) {
  const dateMap = new Map();

  rows.forEach((row) => {
    if (!row.game_date) {
      return;
    }

    const bucket = dateMap.get(row.game_date) || {
      date: row.game_date,
      count: 0,
      whiffs: 0,
      releaseSpeeds: [],
      exitVelos: [],
    };

    bucket.count += 1;
    if (SWING_MISS_DESCRIPTIONS.has(row.description)) {
      bucket.whiffs += 1;
    }

    const releaseSpeed = toNumber(row.release_speed);
    const exitVelo = toNumber(row.launch_speed);
    if (releaseSpeed != null) {
      bucket.releaseSpeeds.push(releaseSpeed);
    }
    if (exitVelo != null) {
      bucket.exitVelos.push(exitVelo);
    }

    dateMap.set(row.game_date, bucket);
  });

  return Array.from(dateMap.values())
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-limitGames)
    .map((bucket) => ({
      date: bucket.date.slice(5),
      pitches: bucket.count,
      whiffRate: bucket.count ? Number(((bucket.whiffs / bucket.count) * 100).toFixed(1)) : 0,
      avgReleaseSpeed: average(bucket.releaseSpeeds),
      avgExitVelo: average(bucket.exitVelos),
    }));
}

export function buildEventBreakdown(rows = []) {
  const eventMap = new Map();

  rows.forEach((row) => {
    const eventName = row.events || 'No event';
    eventMap.set(eventName, (eventMap.get(eventName) || 0) + 1);
  });

  return Array.from(eventMap.entries())
    .map(([event, count]) => ({
      event,
      count,
      share: rows.length ? count / rows.length : 0,
    }))
    .sort((left, right) => right.count - left.count);
}

export function buildContactQuality(rows = []) {
  const battedBallRows = rows.filter((row) => toNumber(row.launch_speed) != null);
  const buckets = [
    { label: '< 85 mph', min: -Infinity, max: 85, count: 0 },
    { label: '85-95 mph', min: 85, max: 95, count: 0 },
    { label: '95-105 mph', min: 95, max: 105, count: 0 },
    { label: '105+ mph', min: 105, max: Infinity, count: 0 },
  ];

  battedBallRows.forEach((row) => {
    const launchSpeed = toNumber(row.launch_speed);
    const bucket = buckets.find((item) => launchSpeed >= item.min && launchSpeed < item.max);
    if (bucket) {
      bucket.count += 1;
    }
  });

  return buckets.map((bucket) => ({
    label: bucket.label,
    count: bucket.count,
    share: battedBallRows.length ? bucket.count / battedBallRows.length : 0,
  }));
}

export function buildZoneHeatmap(rows = []) {
  const cells = Array.from({ length: 9 }, (_, index) => ({
    id: index,
    label: index,
    count: 0,
    whiffs: 0,
  }));

  rows.forEach((row) => {
    const plateX = toNumber(row.plate_x);
    const plateZ = toNumber(row.plate_z);
    if (plateX == null || plateZ == null) {
      return;
    }

    const xBucket = plateX < -0.24 ? 0 : plateX <= 0.24 ? 1 : 2;
    const zBucket = plateZ > 3 ? 0 : plateZ >= 2 ? 1 : 2;
    const index = zBucket * 3 + xBucket;
    const cell = cells[index];
    cell.count += 1;
    if (SWING_MISS_DESCRIPTIONS.has(row.description)) {
      cell.whiffs += 1;
    }
  });

  const maxCount = Math.max(...cells.map((cell) => cell.count), 1);
  return cells.map((cell) => ({
    ...cell,
    intensity: cell.count / maxCount,
    whiffRate: cell.count ? cell.whiffs / cell.count : 0,
  }));
}
