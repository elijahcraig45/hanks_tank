import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ApiService from '../../services/api';
import { getSession, onAuthChange } from '../../services/googleAuth';
import SignInPanel from './SignInPanel';
import PickSheet from './PickSheet';
import Leaderboard from './Leaderboard';
import '../styles/PickemPage.css';

/**
 * The pick'em contest.
 *
 * Sport and section live in the URL so a sheet or a leaderboard can be linked and
 * shared — which is most of the point of a contest that other people are in.
 *
 * The client ID comes from the server rather than a build-time variable, so the browser
 * and the server verifying the token cannot disagree about which app is asking.
 */

const SPORTS = [
  { key: 'nfl', label: 'NFL' },
  { key: 'cfb', label: 'College FBS' },
];

/**
 * Two sections, not three.
 *
 * "Make picks" and "My picks" were the same screen a day apart — the sheet already
 * showed your selections, and the separate view only added how they turned out. Results
 * now appear on the sheet itself, so there is one place to both make and review picks.
 * `mine` still resolves here so any link to it keeps working.
 */
const SECTIONS = [
  { key: 'sheet', label: 'My picks' },
  { key: 'leaderboard', label: 'Leaderboard' },
];

/**
 * Leaderboard scopes. Against-the-spread is absent for the same reason it is absent from
 * the sheet: college lines only appear near kickoff, so there is nothing to score. See
 * PickSheet for the numbers. The view still computes ATS, so restoring the entry brings
 * the board back with its history intact.
 */
const PICK_TYPES = [
  { key: 'su', label: 'Straight up' },
];

export default function PickemPage() {
  const { sport: sportParam, section: sectionParam } = useParams();
  const navigate = useNavigate();

  const sport = SPORTS.find((s) => s.key === sportParam)?.key || 'cfb';
  // 'mine' was a section of its own before the two were merged; it maps to the sheet
  // so an existing link or bookmark still lands somewhere sensible.
  const section = sectionParam === 'mine'
    ? 'sheet'
    : (SECTIONS.find((s) => s.key === sectionParam)?.key || 'sheet');

  const [config, setConfig] = useState(null);
  const [session, setSession] = useState(getSession());
  const [boardType, setBoardType] = useState('su');
  const [boardWeek, setBoardWeek] = useState('');

  useEffect(() => onAuthChange(setSession), []);

  useEffect(() => {
    ApiService.getPickemConfig()
      .then((res) => setConfig(res.data))
      // A failed config fetch must not blank the page: the sheet and the leaderboard
      // are readable without sign-in, so fall back to "auth unavailable".
      .catch(() => setConfig({ auth_configured: false, season: null }));
  }, []);

  const go = useCallback((nextSport, nextSection) => {
    navigate(`/pickem/${nextSport}/${nextSection}`);
  }, [navigate]);

  const season = config?.season || new Date().getFullYear();

  return (
    <div className="ft-page pk-page">
      <header className="ft-hero">
        <div className="ft-hero-inner">
          <div className="ft-hero-top">
            <h1>Pick&rsquo;em</h1>
            <SignInPanel
              clientId={config?.google_client_id}
              authConfigured={Boolean(config?.auth_configured)}
            />
          </div>

          <p className="pk-tagline">
            Pick winners straight up or against the spread. Picks stay editable until
            each game kicks off, and every record is set against the closing line on the
            same games.
          </p>

          <nav className="ft-leagues" aria-label="Sport">
            {SPORTS.map((s) => (
              <button
                key={s.key}
                className={`ft-league${s.key === sport ? ' ft-league--active' : ''}`}
                onClick={() => go(s.key, section)}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <nav className="ft-sections" aria-label="Section">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                className={`ft-section${s.key === section ? ' ft-section--active' : ''}`}
                onClick={() => go(sport, s.key)}
              >
                {s.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="ft-body">
        {section === 'sheet' && (
          <PickSheet
            sport={sport}
            season={season}
            authConfigured={Boolean(config?.auth_configured)}
          />
        )}

        {section === 'leaderboard' && (
          <section className="ft-panel">
            <div className="ft-panel-head">
              <h2>Standings — {SPORTS.find((s) => s.key === sport)?.label} {season}</h2>
            </div>

            {PICK_TYPES.length > 1 && (
              <div className="ft-scope-switch">
                {PICK_TYPES.map((t) => (
                  <button
                    key={t.key}
                    className={`ft-scope${boardType === t.key ? ' ft-scope--on' : ''}`}
                    onClick={() => setBoardType(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            <div className="ft-filters">
              <label>
                Scope
                <select
                  value={boardWeek}
                  onChange={(e) => setBoardWeek(e.target.value)}
                >
                  <option value="">Whole season</option>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={String(w)}>Week {w}</option>
                  ))}
                </select>
              </label>
            </div>

            <Leaderboard
              sport={sport}
              season={season}
              pickType={boardType}
              week={boardWeek}
              you={session?.profile?.userId}
            />
          </section>
        )}

      </div>
    </div>
  );
}
