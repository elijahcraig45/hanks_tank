import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SEASONS } from '../config/constants';
import './styles/Navbar.css';

function BasicExample() {
  const [statsOpen, setStatsOpen]     = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const statsRef    = useRef(null);
  const analysisRef = useRef(null);
  const location    = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setStatsOpen(false);
    setAnalysisOpen(false);
  }, [location]);

  useEffect(() => {
    const handler = (e) => {
      if (statsRef.current    && !statsRef.current.contains(e.target))    setStatsOpen(false);
      if (analysisRef.current && !analysisRef.current.contains(e.target)) setAnalysisOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const closeAll = () => { setStatsOpen(false); setAnalysisOpen(false); setMobileOpen(false); };

  const isActive = (paths) =>
    Array.isArray(paths)
      ? paths.some(p => location.pathname.startsWith(p))
      : location.pathname === paths;

  return (
    <nav className="ht-nav">
      <div className="ht-nav-inner">
        {/* Brand */}
        <Link to="/" className="ht-brand" onClick={closeAll}>
          <span className="ht-brand-icon">⚾</span>
          <span className="ht-brand-name">Hank's Tank</span>
          <span className="ht-brand-year">{SEASONS.DEFAULT}</span>
        </Link>

        {/* Desktop links */}
        <div className="ht-links">
          <Link to="/" className={`ht-link${location.pathname === '/' ? ' ht-link--active' : ''}`}>Home</Link>
          <Link to="/games" className={`ht-link${isActive('/games') ? ' ht-link--active' : ''}`}>Games</Link>
          <Link to="/predictions" className={`ht-link ht-link--highlight${isActive('/predictions') ? ' ht-link--active' : ''}`}>
            Predictions
          </Link>

          {/* Stats dropdown */}
          <div ref={statsRef} className="ht-dropdown">
            <button
              className={`ht-link ht-link--btn${isActive(['/TeamBatting','/TeamPitching','/PlayerBatting','/PlayerPitching']) ? ' ht-link--active' : ''}`}
              onClick={() => { setStatsOpen(o => !o); setAnalysisOpen(false); }}
            >
              Stats <span className="ht-caret">{statsOpen ? '▴' : '▾'}</span>
            </button>
            {statsOpen && (
              <div className="ht-dropdown-menu">
                <div className="ht-dropdown-section">Team</div>
                <Link className="ht-dropdown-item" to="/TeamBatting"    onClick={closeAll}>Team Batting</Link>
                <Link className="ht-dropdown-item" to="/TeamPitching"   onClick={closeAll}>Team Pitching</Link>
                <div className="ht-dropdown-section" style={{marginTop:6}}>Player</div>
                <Link className="ht-dropdown-item" to="/PlayerBatting"  onClick={closeAll}>Player Batting</Link>
                <Link className="ht-dropdown-item" to="/PlayerPitching" onClick={closeAll}>Player Pitching</Link>
              </div>
            )}
          </div>

          {/* Analysis dropdown */}
          <div ref={analysisRef} className="ht-dropdown">
            <button
              className={`ht-link ht-link--btn${isActive(['/season-comparison','/team-comparison','/player-comparison','/advanced-analysis']) ? ' ht-link--active' : ''}`}
              onClick={() => { setAnalysisOpen(o => !o); setStatsOpen(false); }}
            >
              Analysis <span className="ht-caret">{analysisOpen ? '▴' : '▾'}</span>
            </button>
            {analysisOpen && (
              <div className="ht-dropdown-menu">
                <Link className="ht-dropdown-item" to="/season-comparison"  onClick={closeAll}>Season Comparison</Link>
                <Link className="ht-dropdown-item" to="/team-comparison"    onClick={closeAll}>Team Comparison</Link>
                <Link className="ht-dropdown-item" to="/player-comparison"  onClick={closeAll}>Player Comparison</Link>
                <div className="ht-dropdown-divider" />
                <Link className="ht-dropdown-item" to="/advanced-analysis"  onClick={closeAll}>Advanced Analysis</Link>
              </div>
            )}
          </div>

          <Link to="/transactions" className={`ht-link${isActive('/transactions') ? ' ht-link--active' : ''}`}>Transactions</Link>
        </div>

        {/* Mobile toggle */}
        <button className="ht-mobile-toggle" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="ht-mobile-menu">
          <Link className="ht-mobile-link" to="/"              onClick={closeAll}>Home</Link>
          <Link className="ht-mobile-link" to="/games"         onClick={closeAll}>Games</Link>
          <Link className="ht-mobile-link ht-mobile-link--hl" to="/predictions" onClick={closeAll}>Predictions</Link>
          <div className="ht-mobile-section">Stats</div>
          <Link className="ht-mobile-link" to="/TeamBatting"   onClick={closeAll}>Team Batting</Link>
          <Link className="ht-mobile-link" to="/TeamPitching"  onClick={closeAll}>Team Pitching</Link>
          <Link className="ht-mobile-link" to="/PlayerBatting" onClick={closeAll}>Player Batting</Link>
          <Link className="ht-mobile-link" to="/PlayerPitching" onClick={closeAll}>Player Pitching</Link>
          <div className="ht-mobile-section">Analysis</div>
          <Link className="ht-mobile-link" to="/season-comparison"  onClick={closeAll}>Season Comparison</Link>
          <Link className="ht-mobile-link" to="/team-comparison"    onClick={closeAll}>Team Comparison</Link>
          <Link className="ht-mobile-link" to="/player-comparison"  onClick={closeAll}>Player Comparison</Link>
          <Link className="ht-mobile-link" to="/advanced-analysis"  onClick={closeAll}>Advanced Analysis</Link>
          <Link className="ht-mobile-link" to="/transactions"       onClick={closeAll}>Transactions</Link>
        </div>
      )}
    </nav>
  );
}

export default BasicExample;
