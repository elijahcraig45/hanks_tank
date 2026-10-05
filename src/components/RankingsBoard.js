import React, { useEffect, useMemo, useState } from 'react';
import ApiService from '../services/api';
import RankBand from './RankBand';
import { ComparePicker, OrderChip, PairExplanation, TeamRationale } from './RankingRationale';
import './styles/RankingsBoard.css';

/**
 * Power-rankings board, shared by every sport.
 *
 * The boards have one schema, so they get one component; the sport only supplies an
 * accent colour and which optional columns it actually has. Columns a sport does not
 * carry are dropped from the header rather than rendered as a wall of dashes — MLB has
 * no FPI at all, and the NFL has strength of schedule but no strength of record.
 *
 * There are no tier dividers. Every row instead carries its own reason — a summary line
 * the ML job builds from the fit, expandable to the full rationale — and each row can
 * say why it sits above the next one, with the share of bootstrap resamples that keep
 * that order shown as a chip on the affordance. The summary quotes the same share with a
 * coarse band ("a coin flip" under 60%, up to "separated" at 90%+), which is what the
 * tier labels were trying (and failing) to express.
 */

const ord = (v) => (v == null ? '—' : `${v}`);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09-24" -> "Sep 24". Parsed by hand: `new Date('2026-09-24')` is UTC midnight,
 * which renders as the previous day anywhere west of Greenwich. */
export function shortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}` : null;
}

/** Header freshness text. A date where the board has one — an MLB "week" is an
 * internal index nobody counts in — falling back to the week for older tables. */
export function asOfLabel(meta) {
  if (!meta) return null;
  const through = shortDate(meta.as_of_date);
  const updated = shortDate(meta.computed_at);
  if (through) return `through ${through}${updated ? ` · updated ${updated}` : ''}`;
  return meta.as_of_week ? `through week ${meta.as_of_week}` : null;
}
const dec = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d));

/** Where a custom order puts a team, and how far that is from the rating's order.
 * "+24" means that order has the team 24 places higher than the rating does. Shown
 * only when the two disagree by 10 or more, so the column stays quiet where they agree. */
export const RESULTS_DISAGREEMENT = 10;
export function RankCell({ row, field }) {
  if (row[field] == null) return '—';
  const delta = row.rank - row[field];
  const big = Math.abs(delta) >= RESULTS_DISAGREEMENT;
  return (
    <>
      {row[field]}
      {big && (
        <span className={`rb-delta rb-delta--${delta > 0 ? 'up' : 'down'}`}
              title={`This order puts ${row.team} ${Math.abs(delta)} places ${delta > 0 ? 'higher' : 'lower'} than the rating does`}>
          {delta > 0 ? ` +${delta}` : ` −${-delta}`}
        </span>
      )}
    </>
  );
}
export const ResultsCell = ({ row }) => <RankCell row={row} field="results_rank" />;

/** Our own orders that can sit beside the rating. Which ones are drawn is a site setting
 * (`meta.display.show`, an ordered list of these keys); with no setting, every one the
 * data carries is drawn, in this order. */
export const CUSTOM_COLUMNS = [
  {
    id: 'results', key: 'results_rank', label: 'Results',
    title: 'Results-only order: the ranking that contradicts the fewest games already played. Who has beaten whom, with no scores, no last season and no schedule model. A record, not a forecast.',
    note: 'Results is a record of who has beaten whom this season (the fewest games where a lower team beat a higher one), not a forecast.',
  },
  {
    id: 'season', key: 'season_rank', label: 'This season',
    title: "Rank by this season's games only (no carry-over from last season), schedule-adjusted, margin-based",
    note: "This season rates teams on this year's games alone, with nothing carried over from last year.",
  },
  {
    id: 'forecast', key: 'forecast_rank', label: 'Forecast',
    title: 'Rank by the earlier forecast weighting: last season counts for more',
    note: 'Forecast is the earlier weighting, where last season counts for more.',
  },
  {
    id: 'resume', key: 'resume_rank', label: 'Resume',
    title: 'Rank by strength of record: wins above what an average team would win against this schedule',
    note: 'Resume ranks teams by wins above what an average team would win against the same schedule.',
  },
].map((c) => ({ ...c, render: (r) => <RankCell row={r} field={c.key} /> }));

/** Media polls, filtered by `meta.display.media` (poll ids). */
const MEDIA_COLUMNS = [
  { key: 'ap_rank', media: 'ap', label: 'AP', title: 'Associated Press poll', render: (r) => ord(r.ap_rank) },
  { key: 'coaches_rank', media: 'coaches', label: 'Coaches', title: 'AFCA Coaches poll', render: (r) => ord(r.coaches_rank) },
  { key: 'fcs_coaches_rank', media: 'coaches', label: 'Coaches', title: 'FCS Coaches poll', render: (r) => ord(r.fcs_coaches_rank) },
];

/** Optional columns, rendered only where the sport actually supplies the data. */
const OPTIONAL_COLUMNS = [
  { key: 'conference', label: 'Conf', title: 'Conference or division', render: (r) => r.conference || '—' },
  { key: 'sor_rank', label: 'SOR', title: 'Strength of record rank: wins against this schedule relative to what an average team would expect (ESPN FPI for college; computed from these ratings where ESPN publishes none)', render: (r) => ord(r.sor_rank) },
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
}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conference, setConference] = useState('all');
  // Which team's rationale is open, and which "why above #N+1" panel is open.
  const [openTeam, setOpenTeam] = useState(null);
  const [openPair, setOpenPair] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setExpanded(false);
      setOpenTeam(null);
      setOpenPair(null);
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

  // Only keep an optional column if some team actually has a value for it. The site
  // setting `meta.display` narrows the custom orders (ordered) and the media polls; absent
  // or null means no setting, so every column the data carries is drawn as before.
  const display = meta?.display || null;
  const columns = useMemo(() => {
    const has = (c) => rows.some((r) => r[c.key] != null);
    const show = Array.isArray(display?.show) ? display.show : null;
    const media = Array.isArray(display?.media) ? display.media : null;
    const custom = show
      ? show.map((id) => CUSTOM_COLUMNS.find((c) => c.id === id)).filter(Boolean)
      : CUSTOM_COLUMNS;
    const polls = media ? MEDIA_COLUMNS.filter((c) => media.includes(c.media)) : MEDIA_COLUMNS;
    const [conf, ...rest] = OPTIONAL_COLUMNS;
    return [...custom, conf, ...polls, ...rest].filter(has);
  }, [rows, display]);

  // Conferences present on this board, so the picker never offers an empty option.
  const conferences = useMemo(() => {
    const found = [...new Set(rows.map((r) => r.conference).filter(Boolean))];
    return found.sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const inConference = useMemo(
    () => (conference === 'all' ? rows : rows.filter((r) => r.conference === conference)),
    [rows, conference]
  );

  const filtering = conference !== 'all';
  const shown = filtering
    ? inConference
    : (expanded ? rows : rows.slice(0, 25));
  const hasRationale = rows.some((r) => r.summary);

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

  const span = 5 + columns.length;
  const nextOf = (r) => rows.find((x) => x.rank === r.rank + 1 && x.team === r.vs_next?.b);

  const Row = ({ r }) => {
    const isOpen = openTeam === r.team;
    const pairOpen = openPair === r.team;
    const next = r.vs_next ? nextOf(r) || { rank: r.vs_next.b_rank, team: r.vs_next.b } : null;
    return (
      <>
        <tr className={`rb-row${isOpen ? ' rb-row--open' : ''}`}>
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
            <span className="rb-range-text">
              {r.rank_p05 != null ? `${r.rank_p05}–${r.rank_p95}` : '—'}
            </span>
            <RankBand rank={r.rank} lo={r.rank_p05} hi={r.rank_p95} total={rows.length} />
          </td>
          {columns.map((c) => (
            <td key={c.key} className="rb-mono">{c.render(r)}</td>
          ))}
        </tr>
        {r.summary && (
          <tr className="rb-sumrow">
            <td colSpan={span}>
              <div className="rb-sum">
                <p className="rb-summary">{r.summary}</p>
                <div className="rb-sum-actions">
                  <button type="button" className="rb-link" aria-expanded={isOpen}
                          onClick={() => setOpenTeam(isOpen ? null : r.team)}>
                    {isOpen ? 'Hide details' : 'Details'}
                  </button>
                  {next && (
                    <button type="button" className="rb-link rb-link--quiet" aria-expanded={pairOpen}
                            onClick={() => setOpenPair(pairOpen ? null : r.team)}>
                      why above #{next.rank}?
                      <OrderChip pair={r.vs_next} />
                    </button>
                  )}
                </div>
                {pairOpen && <PairExplanation pair={r.vs_next} sport={sport} />}
                {isOpen && (
                  <TeamRationale row={r} rows={rows} season={season} model={meta?.model}
                                 boardSize={rows.length} />
                )}
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <section className={`rb rb--${accent}`}>
      <div className="rb-head">
        <h2>{title} — {season}</h2>
        <span className="rb-meta">
          {asOfLabel(meta)}
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
        result does not depend on the order games were played.
        {meta?.model === 'margin' && ' Ratings are fitted on scoring margin, not just wins and losses.'}
        {meta?.model === 'blend' && ' Ratings combine a win/loss fit with a scoring-margin fit.'} Home field is fit
        explicitly{meta?.home_field_points != null && ` (${Math.round(meta.home_field_points)} points)`}
        {meta?.prior_weight != null && !meta?.is_preseason
          && ` and last season carries in as a decaying prior, down to ${Math.round(meta.prior_weight * 100)}% weight by now`}.
        {' '}<strong>Rank range</strong> is a bootstrap over resampled seasons — where it
        is wide, that rank is not meaningfully separated from its neighbours.
      </p>

      {meta?.note && <p className="rb-caveat">{meta.note}</p>}

      {columns.some((c) => c.id) && (
        <p className="rb-note">
          {columns.filter((c) => c.id).map((c) => c.note).join(' ')}
          {columns.some((c) => c.id === 'results') && (
            ' In past seasons the results order fit 98% of the games already played and picked the winners of the next three weeks about 7 points less often than the rating (64% against 71%).'
          )}
          {' '}Where an order differs from the rating by 10 or more places the gap is shown beside it.
        </p>
      )}

      {hasRationale && (
        <p className="rb-note">
          <strong>Why each team is where it is</strong> comes from the same fit: how much of
          the rating was carried over from last season, what each game was worth to it, and
          how hard the schedule has been. The percentage next to each "why above" is the
          share of bootstrap resamples that keep the two teams in that order. Under 60% is
          called a coin flip, 60–74% a slight edge, 75–89% a clear edge and 90% or more
          separated; at 40% or under the resamples lean the other way.
        </p>
      )}

      {hasRationale && rows.length > 1 && (
        <ComparePicker rows={rows} sport={sport} season={season} />
      )}

      {conferences.length > 1 && (
        <div className="rb-filter">
          <label>
            Conference
            <select value={conference} onChange={(e) => setConference(e.target.value)}>
              <option value="all">All ({rows.length})</option>
              {conferences.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          {filtering && (
            <span className="rb-filter-note">
              {shown.length} teams · ranks are their position on the full board
            </span>
          )}
        </div>
      )}

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
          <tbody>{shown.map((r) => <Row key={r.team} r={r} />)}</tbody>
        </table>
      </div>

      {!filtering && rows.length > 25 && (
        <button className="rb-expand" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show top 25' : `Show all ${rows.length} teams`}
        </button>
      )}
    </section>
  );
}
