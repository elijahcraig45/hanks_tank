/**
 * Small formatting helpers for the football components.
 *
 * Deliberately local to this folder. FootballPage.js has its own copies of pct/num that
 * predate it; unifying them is part of splitting that file up, which is a separate move.
 */

export function pct(v, digits = 1) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return `${(Number(v) * 100).toFixed(digits)}%`;
}

export function num(v, digits = 2) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(digits);
}

/** Kickoff, in the reader's own timezone. */
export function kickoff(iso) {
  if (!iso) return 'TBD';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'TBD';
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

/** "Q3 4:12", or the status where there is no clock to show. */
export function gameClock(game) {
  if (!game) return '';
  if (game.status === 'completed') return 'Final';
  if (game.status === 'scheduled') return kickoff(game.start_date);
  const period = game.period ? `Q${game.period}` : '';
  return [period, game.clock].filter(Boolean).join(' ') || 'In progress';
}

/**
 * Yard line as the broadcast would say it — "OWN 35" / "OPP 12" rather than the
 * 0-100 scale the feed uses, which is meaningless without knowing who has the ball.
 */
export function yardLine(yardsToGoal) {
  if (yardsToGoal === null || yardsToGoal === undefined) return '—';
  const y = Number(yardsToGoal);
  if (y > 50) return `OWN ${100 - y}`;
  if (y === 50) return 'MID 50';
  return `OPP ${y}`;
}
