import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SEASONS } from '../config/constants';
import './styles/Navbar.css';

/**
 * Sport-first navigation.
 *
 * The site covers two sports, so the top level is the two sports — not baseball's
 * feature list. Every MLB page lives inside the Baseball mega menu; football is a
 * single tab whose leagues (NFL / FBS / FCS) are sub-navigation on the page itself.
 */
const BASEBALL_MENU = [
  {
    heading: 'Today',
    items: [
      { to: '/games', label: 'Scoreboard' },
      { to: '/predictions', label: 'Predictions' },
      { to: '/rankings', label: 'Power Rankings' },
      { to: '/transactions', label: 'Transactions' },
    ],
  },
  {
    heading: 'Leaderboards',
    items: [
      { to: '/TeamBatting', label: 'Team Batting' },
      { to: '/TeamPitching', label: 'Team Pitching' },
      { to: '/PlayerBatting', label: 'Player Batting' },
      { to: '/PlayerPitching', label: 'Player Pitching' },
    ],
  },
  {
    heading: 'Analysis',
    items: [
      { to: '/prediction-diagnostics', label: 'Prediction Diagnostics' },
      { to: '/split-explorer', label: 'Split Explorer' },
      { to: '/statcast-lab', label: 'Statcast Lab' },
      { to: '/scenario-simulator', label: 'Scenario Simulator' },
      { to: '/advanced-analysis', label: 'Advanced Analysis' },
    ],
  },
  {
    heading: 'Compare',
    items: [
      { to: '/comparison-workbench', label: 'Comparison Workbench' },
      { to: '/team-comparison', label: 'Team Comparison' },
      { to: '/player-comparison', label: 'Player Comparison' },
      { to: '/season-comparison', label: 'Season Comparison' },
      { to: '/research-workflow', label: 'Research Workflow' },
    ],
  },
];

const BASEBALL_PATHS = BASEBALL_MENU.flatMap((group) => group.items.map((i) => i.to))
  .concat(['/game/', '/team/', '/player/', '/AssistedAnalysis']);

function Navbar() {
  const [baseballOpen, setBaseballOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const baseballRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setBaseballOpen(false);
  }, [location]);

  useEffect(() => {
    const handler = (e) => {
      if (baseballRef.current && !baseballRef.current.contains(e.target)) setBaseballOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setBaseballOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const closeAll = () => { setBaseballOpen(false); setMobileOpen(false); };

  const startsWithAny = (paths) => paths.some((p) => location.pathname.startsWith(p));
  const onBaseball = startsWithAny(BASEBALL_PATHS);
  const onFootball = startsWithAny(['/football', '/nfl']);
  const onPickem = startsWithAny(['/pickem']);

  return (
    <nav className="ht-nav">
      <div className="ht-nav-inner">
        <Link to="/" className="ht-brand" onClick={closeAll}>
          <span className="ht-brand-mark" aria-hidden="true">HT</span>
          <span className="ht-brand-name">Hank's Tank</span>
          <span className="ht-brand-year">{SEASONS.DEFAULT}</span>
        </Link>

        <div className="ht-links">
          <Link
            to="/"
            className={`ht-link${location.pathname === '/' ? ' ht-link--active' : ''}`}
          >
            Home
          </Link>

          {/* Baseball — everything MLB, one menu */}
          <div ref={baseballRef} className="ht-sport-wrap">
            <button
              className={`ht-sport ht-sport--mlb${onBaseball ? ' ht-sport--active' : ''}`}
              onClick={() => setBaseballOpen((o) => !o)}
              aria-expanded={baseballOpen}
            >
              <span className="ht-sport-icon" aria-hidden="true">⚾</span>
              Baseball
              <span className="ht-caret">{baseballOpen ? '▴' : '▾'}</span>
            </button>

            {baseballOpen && (
              <div className="ht-mega">
                {BASEBALL_MENU.map((group) => (
                  <div className="ht-mega-col" key={group.heading}>
                    <div className="ht-mega-heading">{group.heading}</div>
                    {group.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`ht-mega-item${location.pathname === item.to ? ' ht-mega-item--active' : ''}`}
                        onClick={closeAll}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Football — one tab; leagues are sub-nav inside the page */}
          <Link
            to="/football"
            className={`ht-sport ht-sport--ftbl${onFootball ? ' ht-sport--active' : ''}`}
          >
            <span className="ht-sport-icon" aria-hidden="true">🏈</span>
            Football
          </Link>

          {/* The contest gets its own tab rather than a football sub-section: it is a
              different thing to come to the site for, and it is the one page a visitor
              may arrive at from a link someone else shared. */}
          <Link
            to="/pickem"
            className={`ht-sport ht-sport--ftbl${onPickem ? ' ht-sport--active' : ''}`}
          >
            <span className="ht-sport-icon" aria-hidden="true">🎯</span>
            Pick&rsquo;em
          </Link>
        </div>

        <button
          className="ht-mobile-toggle"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={mobileOpen}
        >
          <span /><span /><span />
        </button>
      </div>

      {mobileOpen && (
        <div className="ht-mobile-menu">
          <Link className="ht-mobile-link" to="/" onClick={closeAll}>Home</Link>

          <div className="ht-mobile-sport ht-mobile-sport--ftbl">
            <Link className="ht-mobile-sport-link" to="/football" onClick={closeAll}>
              🏈 Football
            </Link>
          </div>

          <div className="ht-mobile-sport ht-mobile-sport--mlb">
            <span className="ht-mobile-sport-link">⚾ Baseball</span>
          </div>
          {BASEBALL_MENU.map((group) => (
            <div key={group.heading}>
              <div className="ht-mobile-section">{group.heading}</div>
              {group.items.map((item) => (
                <Link key={item.to} className="ht-mobile-link" to={item.to} onClick={closeAll}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
