/** Formatting shared by the pick sheet and the leaderboard. */

/** "Sat 13 Sep, 1:00 pm" in the reader's own timezone. */
export function kickoffLabel(iso) {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit',
  });
}

/**
 * The spread as each side would see it.
 *
 * Stored positive-means-home-favoured, which is a convention for a database and not for
 * a reader: nobody says "Chicago at Carolina, minus two and a half for the home team".
 * They say "Bears -2.5". So each side gets its own signed number.
 */
export function spreadFor(side, spreadLine) {
  if (spreadLine === null || spreadLine === undefined) return null;
  const n = Number(spreadLine);
  const value = side === 'home' ? -n : n;
  if (value === 0) return 'PK';
  return value > 0 ? `+${value}` : `${value}`;
}

/**
 * Just the clock, for a row that already sits under a day heading.
 *
 * Repeating the date on every one of sixty games under a "Saturday 12 Sep" header is
 * noise that crowds out the thing the row is for.
 */
export function timeLabel(iso) {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function pct(v, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return `${(Number(v) * 100).toFixed(digits)}%`;
}

/** "9-3-1", omitting pushes when there are none. */
export function record(wins, losses, pushes) {
  const base = `${wins ?? 0}-${losses ?? 0}`;
  return pushes ? `${base}-${pushes}` : base;
}
