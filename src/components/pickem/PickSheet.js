import { useCallback, useEffect, useMemo, useState } from 'react';
import ApiService from '../../services/api';
import { getSession, onAuthChange } from '../../services/googleAuth';
import { timeLabel, spreadFor } from './format';

/**
 * The week's pick sheet.
 *
 * Selections are held locally and saved on demand rather than on every click: a college
 * week is sixty games, and a request per tap would be both slow and a good way to lose
 * half a sheet to a flaky connection.
 *
 * The server decides what is locked. Every game arrives with a `locked` flag computed
 * against the server clock, and the save response reports any game that kicked off
 * between loading the sheet and pressing save — so a stale tab degrades into an
 * explanation rather than a silent no-op.
 */

const PICK_TYPES = [
  { key: 'su', label: 'Straight up', hint: 'Pick the winner' },
  { key: 'ats', label: 'Against the spread', hint: 'Pick who covers' },
];

function GameRow({ game, pickType, selected, onSelect }) {
  const locked = game.locked;
  const noLine = pickType === 'ats' && game.spread_line === null;
  const disabled = locked || noLine;

  const sideButton = (side) => {
    const display = side === 'home' ? game.home_display : game.away_display;
    const spread = pickType === 'ats' ? spreadFor(side, game.spread_line) : null;
    const isPicked = selected === side;
    return (
      <button
        type="button"
        className={`pk-side${isPicked ? ' pk-side--on' : ''}`}
        disabled={disabled}
        aria-pressed={isPicked}
        onClick={() => onSelect(isPicked ? null : side)}
      >
        <span className="pk-side-team">{display}</span>
        {spread && <span className="pk-side-spread">{spread}</span>}
      </button>
    );
  };

  return (
    <li
      className={`pk-game${locked ? ' pk-game--locked' : ''}`}
      // Named container so the sides can stack when the card itself is narrow,
      // independently of the viewport — the grid decides the card width, not the screen.
      style={{ containerType: 'inline-size', containerName: 'pk-card' }}
    >
      <div className="pk-game-meta">
        <span className="pk-kick">{timeLabel(game.kickoff)}</span>
        {game.neutral_site && <span className="pk-tag">neutral</span>}
        {locked && (
          <span className="pk-tag pk-tag--locked">
            {game.completed
              ? `Final ${game.away_score}–${game.home_score}`
              : 'Kicked off'}
          </span>
        )}
        {noLine && !locked && <span className="pk-tag">no line</span>}
      </div>
      <div className="pk-sides">
        {sideButton('away')}
        <span className="pk-at">at</span>
        {sideButton('home')}
      </div>
    </li>
  );
}

export default function PickSheet({ sport, season, authConfigured }) {
  const [week, setWeek] = useState('');
  const [pickType, setPickType] = useState('su');
  const [games, setGames] = useState([]);
  const [meta, setMeta] = useState(null);
  const [draft, setDraft] = useState({});      // game_id -> side
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [signedIn, setSignedIn] = useState(Boolean(getSession()));
  const [onlyOpen, setOnlyOpen] = useState(true);

  useEffect(() => onAuthChange((s) => setSignedIn(Boolean(s))), []);

  // `keepStatus` matters: saving reloads the sheet so anything that locked meanwhile
  // shows as locked, and clearing the status on every load would wipe the "saved N
  // picks" confirmation the instant it appeared.
  const load = useCallback(async ({ keepStatus = false } = {}) => {
    setLoading(true);
    if (!keepStatus) setStatus(null);
    try {
      const res = await ApiService.getPickemGames(sport, { season, week });
      setGames(res.data || []);
      setMeta(res.meta || null);
      if (!week && res.meta?.week) setWeek(String(res.meta.week));

      // Seed the draft from what the server already has for this pick type, so the
      // sheet opens showing existing picks rather than blank.
      const existing = {};
      for (const p of res.meta?.picks || []) {
        if (p.pick_type === pickType) existing[p.game_id] = p.selected;
      }
      setDraft(existing);
    } catch (e) {
      setGames([]); setMeta(null);
      setStatus({ kind: 'error', text: 'Could not load the week.' });
    } finally {
      setLoading(false);
    }
  }, [sport, season, week, pickType]);

  useEffect(() => { load(); }, [load]);

  // Signing in mid-visit has to reload the sheet, because the user's existing picks
  // only come back on an authenticated request. Its own effect rather than a `load`
  // dependency, since load does not read the flag — it just needs to run again.
  useEffect(() => {
    if (signedIn) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  // Switching sport resets the week, since week numbers do not line up across sports.
  useEffect(() => { setWeek(''); }, [sport]);

  const shown = useMemo(() => (
    onlyOpen ? games.filter((g) => !g.locked) : games
  ), [games, onlyOpen]);

  /**
   * Games grouped by kickoff day.
   *
   * A college Saturday is sixty games, and one flat list of them is unscannable. The
   * day is also the unit people actually think in — "who have I got Thursday" — and it
   * is what makes the lock legible, since a whole day locks at a time.
   */
  const byDay = useMemo(() => {
    const groups = new Map();
    for (const g of shown) {
      const key = g.kickoff
        ? new Date(g.kickoff).toLocaleDateString(undefined, {
          weekday: 'long', month: 'short', day: 'numeric',
        })
        : 'Kickoff to be announced';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(g);
    }
    return [...groups.entries()];
  }, [shown]);

  const pickable = useMemo(() => shown.filter(
    (g) => !g.locked && (pickType === 'su' || g.spread_line !== null),
  ), [shown, pickType]);

  const chosen = pickable.filter((g) => draft[g.game_id]).length;

  const save = async () => {
    const picks = Object.entries(draft)
      .filter(([gameId]) => games.some(
        (g) => g.game_id === gameId && !g.locked
          && (pickType === 'su' || g.spread_line !== null),
      ))
      .map(([gameId, side]) => ({
        game_id: gameId, pick_type: pickType, selected: side,
      }));

    if (!picks.length) {
      setStatus({ kind: 'error', text: 'Nothing to save yet — pick a side first.' });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const res = await ApiService.submitPicks(sport, {
        season, week: Number(week), picks,
      });
      const rejected = res.data?.rejected || [];
      setStatus({
        kind: rejected.length ? 'warn' : 'ok',
        text: rejected.length
          // Names the games rather than a count: "3 rejected" tells the reader
          // nothing they can act on.
          ? `Saved ${res.data.accepted}. Not saved: ${rejected
            .map((r) => {
              const g = games.find((x) => x.game_id === r.game_id);
              const who = g ? `${g.away_display} at ${g.home_display}` : r.game_id;
              return `${who} (${r.reason})`;
            }).join('; ')}`
          : `Saved ${res.data.accepted} pick${res.data.accepted === 1 ? '' : 's'}.`,
      });
      // Reload so anything that locked while the sheet was open shows as locked,
      // keeping the confirmation the reader just earned.
      await load({ keepStatus: true });
    } catch (e) {
      setStatus({
        kind: 'error',
        text: e?.message?.includes('401')
          ? 'Your sign-in expired. Sign in again and retry.'
          : 'Could not save. Nothing was changed.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !meta) return <div className="ft-state">Loading the sheet…</div>;

  if (meta?.note) {
    return (
      <div className="ft-empty">
        <div className="ft-empty-title">No sheet for {sport.toUpperCase()} yet</div>
        <p className="ft-empty-detail">{meta.note}</p>
      </div>
    );
  }

  return (
    <section className="ft-panel pk-sheet">
      <div className="ft-panel-head">
        <h2>Week {meta?.week} — {sport === 'nfl' ? 'NFL' : 'College FBS'}</h2>
        <span className="ft-panel-meta">
          {meta?.open ?? 0} of {meta?.count ?? 0} still open
        </span>
      </div>

      <div className="ft-scope-switch">
        {PICK_TYPES.map((t) => (
          <button
            key={t.key}
            className={`ft-scope${pickType === t.key ? ' ft-scope--on' : ''}`}
            onClick={() => setPickType(t.key)}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pickType === 'ats' && meta && meta.with_spread < meta.count && (
        <p className="ft-note ft-note--warn">
          {meta.count - meta.with_spread} of these games have no posted line, so they
          can only be picked straight up.
        </p>
      )}

      <div className="ft-filters">
        <label>
          Week
          <select value={week} onChange={(e) => setWeek(e.target.value)}>
            {(meta?.weeks || []).map((w) => (
              <option key={w} value={String(w)}>Week {w}</option>
            ))}
          </select>
        </label>
        <label className="pk-toggle">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
          />
          Hide games that have started
        </label>
      </div>

      {!signedIn && (
        <p className="ft-note ft-note--warn">
          {authConfigured
            ? 'Sign in above to save picks. You can browse the sheet without signing in.'
            : 'Sign-in is not set up on this server yet, so picks cannot be saved.'}
        </p>
      )}

      {byDay.map(([day, dayGames]) => (
        <div key={day} className="pk-day">
          <h3 className="pk-day-head">
            {day}
            <span className="pk-day-count">
              {dayGames.length} game{dayGames.length === 1 ? '' : 's'}
            </span>
          </h3>
          <ul className="pk-games">
            {dayGames.map((g) => (
              <GameRow
                key={g.game_id}
                game={g}
                pickType={pickType}
                selected={draft[g.game_id] || null}
                onSelect={(side) => setDraft((d) => {
                  const next = { ...d };
                  if (side) next[g.game_id] = side; else delete next[g.game_id];
                  return next;
                })}
              />
            ))}
          </ul>
        </div>
      ))}

      {!shown.length && (
        <div className="ft-state">
          {onlyOpen
            ? 'Every game this week has started. Untick the filter to see them.'
            : 'No games this week.'}
        </div>
      )}

      {status && (
        <p className={`pk-status pk-status--${status.kind}`}>{status.text}</p>
      )}

      <div className="pk-actions">
        <span className="pk-count">
          {chosen} of {pickable.length} open games picked
        </span>
        <button
          className="pk-save"
          disabled={!signedIn || saving || !chosen}
          onClick={save}
        >
          {saving ? 'Saving…' : 'Save picks'}
        </button>
      </div>
    </section>
  );
}
