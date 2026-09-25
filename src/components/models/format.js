/** Formatting helpers for the Models section. */

export const pct = (x, d = 1) => (x == null || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(d)}%`);
export const num = (x, d = 4) => (x == null || !Number.isFinite(x) ? '—' : x.toFixed(d));
export const signed = (x, d = 4) => (x == null || !Number.isFinite(x) ? '—'
  : `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(d)}`);

/** "0.6821 [0.6712–0.6930]" for an { value, lo, hi } interval. */
export function withCi(iv, kind = 'num') {
  if (!iv) return { main: '—', ci: '' };
  const f = kind === 'pct' ? (x) => pct(x, 1) : kind === 'pts' ? (x) => x.toFixed(2) : (x) => num(x, 4);
  return { main: f(iv.value), ci: `${f(iv.lo)}–${f(iv.hi)}` };
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
}
