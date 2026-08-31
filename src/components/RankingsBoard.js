import React, { useEffect, useMemo, useState } from 'react';
import ApiService from '../services/api';
import './styles/RankingsBoard.css';

/**
 * Power-rankings board, shared by every sport.
 *
 * The boards have one schema, so they get one component; the sport only supplies an
 * accent colour and which optional columns it actually has. Columns a sport does not
 * carry are dropped from the header rather than rendered as a wall of dashes — MLB has
 * no FPI at all, and the NFL has strength of schedule but no strength of record.
 */

const TIER_NAMES = [
  ['In a class alone', 'clear separation from everyone below'],
  ['Real contenders', 'separated from the pack, not from each other'],
  ['The pack', 'interchangeable on this season’s results'],
  ['Solid', 'good teams without a distinguishing result'],
  ['The rest', 'ordering here is close to arbitrary'],
];

/**
 * Group the board into tiers.
 *
 * A flat 1..N list implies a precision the fit does not have — neighbouring teams are
 * often separated by less than a point. A break starts wherever the gap to the next
 * team is large relative to the typical gap, so teams inside a tier are genuinely
 * interchangeable and teams across tiers are genuinely separated.
 */
export function buildTiers(rows) {
  if (!rows.length) return [];
  const gaps = rows.map((r) => r.gap_to_next).filter((g) => g != null && !Number.isNaN(g));
  if (!gaps.length) return [{ label: 'All teams', desc: '', rows }];

  const sorted = [...gaps].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 1;
  const breakAt = Math.max(median * 3, 25);

  const tiers = [];
  let current = [];
  rows.forEach((r, i) => {
    current.push(r);
    const isLast = i === rows.length - 1;
    if (!isLast && r.gap_to_next != null && r.gap_to_next >= breakAt) {
      tiers.push(current);
      current = [];
    }
  });
  if (current.length) tiers.push(current);

  // One tier holding everybody means no gap was large enough to break on — the teams
  // are not separable, which is the opposite of what "In a class alone" claims. This
  // is the normal case for baseball, where the whole league fits inside a few points.
  if (tiers.length === 1) {
    return [{
      label: 'No clear tiers',
      desc: 'no gap here is large enough to separate one group from another',
      rows: tiers[0],
    }];
  }

  return tiers.map((group, i) => {
    const [label, desc] = TIER_NAMES[Math.min(i, TIER_NAMES.length - 1)];
    return {
      label: tiers.length > TIER_NAMES.length && i >= TIER_NAMES.length - 1
        ? `${label} (${group[0].rank}–${group[group.length - 1].rank})`
        : label,
      desc,
      rows: group,
    };
  });
}

const ord = (v) => (v == null ? '—' : `${v}`);
const dec = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d));

/** Optional columns, rendered only where the sport actually supplies the data. */
const OPTIONAL_COLUMNS = [
  { key: 'sor_rank', label: 'SOR', title: 'Strength of record rank (ESPN FPI)', render: (r) => ord(r.sor_rank) },
  { key: 'sos_rank', label: 'SOS', title: 'Strength of schedule rank (ESPN FPI)', render: (r) => ord(r.sos_rank) },
  { key: 'fpi', label: 'FPI', title: "ESPN's Football Power Index", render: (r) => dec(r.fpi, 1) },
  { key: 'eff_offense', label: 'Off', title: 'Offensive efficiency (ESPN)', render: (r) => dec(r.eff_offense, 1) },
  { key: 'eff_defense', label: 'Def', title: 'Defensive efficiency (ESPN)', render: (r) => dec(r.eff_defense, 1) },
  { key: 'epa_offense', label: 'Off EPA', title: 'Offensive EPA per play', render: (r) => dec(r.epa_offense, 2) },
  { key: 'epa_defense', label: 'Def EPA', title: 'Defensive EPA per play', render: (r) => dec(r.epa_defense, 2) },
  { key: 'projected_wins', label: 'Proj W', title: 'Projected season wins (ESPN)', render: (r) => dec(r.projected_wins, 1) },
];

export default function RankingsBoard({
  sport,
  season,
  division = null,
  accent = 'mlb',
  title,
  limit = 400,
  showTiers = true,
}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setExpanded(false);
      setError(null);
      try {
        const res = await ApiService.getRankings(sport, { season, division, limit });
        if (cancelled) return;
        setRows(res.data || []);
        setMeta(res.meta || null);
      } catch {
        if (!cancelled) { setRows([]); setMeta(null); setError('Could not load rankings.'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sport, season, division, limit]);

  // Only keep an optional column if some team actually has a value for it.
  const columns = useMemo(
    () => OPTIONAL_COLUMNS.filter((c) => rows.some((r) => r[c.key] != null)),
    [rows]
  );

  const shown = expanded ? rows : rows.slice(0, 25);
  const tiers = useMemo(
    () => (showTiers ? buildTiers(rows.slice(0, 25)) : []),
    [rows, showTiers]
  );

  const scale = useMemo(() => {
    if (!rows.length) return { top: 1, floor: 0 };
    const top = rows[0].rating;
    const floor = rows[Math.min(rows.length, 25) - 1].rating;
    const pad = Math.max(Math.abs(top - floor) * 0.15, 1);
    return { top, floor: floor - pad };
  }, [rows]);

  if (loading) return <div className="rb-state">Loading rankings…</div>;
  if (error) return <div className="rb-state rb-state--error">{error}</div>;

  if (!rows.length) {
    return (
      <div className="rb-empty">
        <div className="rb-empty-title">No power rankings for {title} {season}</div>
        <p className="rb-empty-detail">
          {meta?.note
            || 'The ratings for this season have not been built yet. They appear once enough games have been played.'}
        </p>
      </div>
    );
  }

  const width = (r) =>
    Math.max(3, ((r.rating - scale.floor) / (scale.top - scale.floor)) * 100);

  const Row = ({ r }) => (
    <tr>
      <td className="rb-num">{r.rank}</td>
      <td className="rb-team">
        <span className="rb-name">{r.team}</span>
        <span className="rb-strength">
          <span className={`rb-strength-fill rb-strength-fill--${accent}`}
                style={{ width: `${width(r)}%` }} />
        </span>
      </td>
      <td className="rb-mono">{r.record}</td>
      <td className="rb-mono rb-rating">{Math.round(r.rating)}</td>
      <td className="rb-mono rb-range">
        {r.rank_p05 != null ? `${r.rank_p05}–${r.rank_p95}` : '—'}
      </td>
      {columns.map((c) => (
        <td key={c.key} className="rb-mono">{c.render(r)}</td>
      ))}
    </tr>
  );

  return (
    <section className={`rb rb--${accent}`}>
      <div className="rb-head">
        <h2>{title} — {season}</h2>
        <span className="rb-meta">
          {meta?.as_of_week ? `through week ${meta.as_of_week}` : null}
          {meta?.count ? ` · ${rows.length} teams` : null}
        </span>
      </div>

      {meta?.is_preseason && (
        <div className="rb-banner">
          <strong>Preseason.</strong> No games have been played this season, so every
          rating here comes entirely from {meta.record_season}
          {meta.record_season ? ` (records shown are ${meta.record_season})` : ''}.
        </div>
      )}

      <p className="rb-note">
        One global fit over every game rather than a week-by-week rating walk, so the
        result does not depend on the order games were played. Home field is fit
        explicitly{meta?.home_field_points != null && ` (${Math.round(meta.home_field_points)} points)`}
        {meta?.prior_weight != null && !meta?.is_preseason
          && ` and last season carries in as a decaying prior, down to ${Math.round(meta.prior_weight * 100)}% weight by now`}.
        {' '}<strong>Rank range</strong> is a bootstrap over resampled seasons — where it
        is wide, that rank is not meaningfully separated from its neighbours.
      </p>

      {meta?.note && <p className="rb-caveat">{meta.note}</p>}

      <div className="rb-table-wrap">
        <table className="rb-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Rec</th>
              <th>Rating</th>
              <th title="5th–95th percentile rank across bootstrap resamples">Rank range</th>
              {columns.map((c) => <th key={c.key} title={c.title}>{c.label}</th>)}
            </tr>
          </thead>
          {expanded || !tiers.length ? (
            <tbody>{shown.map((r) => <Row key={r.team} r={r} />)}</tbody>
          ) : (
            tiers.map((tier) => (
              <tbody key={tier.label}>
                <tr className="rb-tier">
                  <td colSpan={5 + columns.length}>
                    <span className="rb-tier-name">{tier.label}</span>
                    <span className="rb-tier-desc">{tier.desc}</span>
                  </td>
                </tr>
                {tier.rows.map((r) => <Row key={r.team} r={r} />)}
              </tbody>
            ))
          )}
        </table>
      </div>

      {rows.length > 25 && (
        <button className="rb-expand" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show top 25 by tier' : `Show all ${rows.length} teams`}
        </button>
      )}
    </section>
  );
}
