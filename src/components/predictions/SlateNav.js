import React from 'react';
import { shiftIsoDate, formatIsoDateLabel } from '../../utils/analytics';

/** Date navigation (MLB) or season + week navigation (football), one component for both. */

const FOOTBALL_SEASONS = [2026, 2025, 2024];

export default function SlateNav({ sport, date, onDate, season, week, weeks: weekList, onSeasonWeek }) {
  if (sport === 'mlb') {
    return (
      <div className="up-slatenav" role="group" aria-label="Date">
        <button type="button" className="up-navbtn" aria-label="Previous day" onClick={() => onDate(shiftIsoDate(date, -1))}>‹</button>
        <input type="date" className="up-date" value={date} onChange={(e) => e.target.value && onDate(e.target.value)} aria-label="Date" />
        <button type="button" className="up-navbtn" aria-label="Next day" onClick={() => onDate(shiftIsoDate(date, 1))}>›</button>
        <span className="up-slatenav-label">
          {formatIsoDateLabel(date, { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>
    );
  }
  // The slate lists the weeks that have predictions; fall back to a full season.
  const weeks = weekList?.length
    ? [...weekList].map(Number).sort((a, b) => a - b)
    : Array.from({ length: sport === 'nfl' ? 22 : 16 }, (_, i) => i + 1);
  const maxWeek = weeks[weeks.length - 1];
  const minWeek = weeks[0];
  const w = Number(week) || null;
  return (
    <div className="up-slatenav" role="group" aria-label="Season and week">
      <select className="up-select" value={season || ''} aria-label="Season"
        onChange={(e) => onSeasonWeek(Number(e.target.value), null)}>
        {FOOTBALL_SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <button type="button" className="up-navbtn" aria-label="Previous week" disabled={!w || w <= minWeek}
        onClick={() => onSeasonWeek(season, weeks.filter((x) => x < w).pop() ?? w - 1)}>‹</button>
      <select className="up-select" value={w || ''} aria-label="Week"
        onChange={(e) => onSeasonWeek(season, Number(e.target.value))}>
        {!w && <option value="">Current week</option>}
        {weeks.map((x) => <option key={x} value={x}>Week {x}</option>)}
      </select>
      <button type="button" className="up-navbtn" aria-label="Next week" disabled={w != null && w >= maxWeek}
        onClick={() => onSeasonWeek(season, weeks.find((x) => x > (w || 0)) ?? (w || 0) + 1)}>›</button>
    </div>
  );
}
