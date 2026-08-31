import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import RankingsBoard from './RankingsBoard';
import { SEASONS } from '../config/constants';
import './styles/RankingsBoard.css';

/**
 * MLB power rankings.
 *
 * The same Bradley-Terry fit the football boards use, which is worth stating plainly
 * because baseball is the sport where it separates least: measured walk-forward, team
 * strength moves log loss from 0.6931 (a coin flip) only to 0.6808. The ordering is a
 * fair summary of who has played best; it is not a betting tool, and the rank ranges
 * are wide because the results genuinely do not distinguish these teams.
 */

const YEARS = Array.from({ length: 4 }, (_, i) => SEASONS.DEFAULT - i);

export default function BaseballRankingsPage() {
  const [season, setSeason] = useState(SEASONS.DEFAULT);

  return (
    <div className="rank-page">
      <header className="rank-hero rank-hero--mlb">
        <div className="rank-hero-inner">
          <div>
            <h1>MLB Power Rankings</h1>
            <p className="rank-sub">
              Every 2026 game refit at once, so the order does not depend on when games
              were played.
            </p>
          </div>
          <select
            className="rank-season"
            value={season}
            onChange={(e) => setSeason(Number(e.target.value))}
            aria-label="Season"
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </header>

      <div className="rank-body">
        <RankingsBoard sport="mlb" season={season} accent="mlb" title="MLB" />

        <p className="rank-foot">
          Football boards use the identical model —{' '}
          <Link to="/football/nfl/rankings">NFL</Link>,{' '}
          <Link to="/football/fbs/rankings">College FBS</Link>,{' '}
          <Link to="/football/fcs/rankings">College FCS</Link>.
        </p>
      </div>
    </div>
  );
}
