import { useState, useEffect, useRef } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Link } from 'react-router-dom';
import './styles/Navbar.css';


function BasicExample() {
  const [statsOpen, setStatsOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const statsRef = useRef(null);
  const analysisRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleOutsideClick(e) {
      if (statsRef.current && !statsRef.current.contains(e.target)) setStatsOpen(false);
      if (analysisRef.current && !analysisRef.current.contains(e.target)) setAnalysisOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const closeAll = () => { setStatsOpen(false); setAnalysisOpen(false); };

  return (
    <Navbar expand="lg" bg="dark" variant="dark" sticky="top">
      <Container>
        <Navbar.Brand as={Link} to="/">Hank's Tank 2026</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto align-items-lg-center">
            <Nav.Link as={Link} to="/" onClick={closeAll}>Home</Nav.Link>
            <Nav.Link as={Link} to="/games" onClick={closeAll}>Games</Nav.Link>

            {/* Stats dropdown */}
            <div ref={statsRef} className={`dropdown${statsOpen ? ' show' : ''}`}>
              <button
                className="btn btn-link nav-link dropdown-toggle text-white-50"
                onClick={() => { setStatsOpen(o => !o); setAnalysisOpen(false); }}
              >
                Stats
              </button>
              <ul className={`dropdown-menu dropdown-menu-dark${statsOpen ? ' show' : ''}`}>
                <li><Link className="dropdown-item" to="/TeamBatting" onClick={closeAll}>Team Batting</Link></li>
                <li><Link className="dropdown-item" to="/TeamPitching" onClick={closeAll}>Team Pitching</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item" to="/PlayerBatting" onClick={closeAll}>Player Batting</Link></li>
                <li><Link className="dropdown-item" to="/PlayerPitching" onClick={closeAll}>Player Pitching</Link></li>
              </ul>
            </div>

            {/* Analysis dropdown */}
            <div ref={analysisRef} className={`dropdown${analysisOpen ? ' show' : ''}`}>
              <button
                className="btn btn-link nav-link dropdown-toggle text-white-50"
                onClick={() => { setAnalysisOpen(o => !o); setStatsOpen(false); }}
              >
                Analysis
              </button>
              <ul className={`dropdown-menu dropdown-menu-dark${analysisOpen ? ' show' : ''}`}>
                <li><Link className="dropdown-item" to="/season-comparison" onClick={closeAll}>Season Comparison</Link></li>
                <li><Link className="dropdown-item" to="/team-comparison" onClick={closeAll}>Team Comparison</Link></li>
                <li><Link className="dropdown-item" to="/player-comparison" onClick={closeAll}>Player Comparison</Link></li>
                <li><hr className="dropdown-divider" /></li>
                <li><Link className="dropdown-item" to="/advanced-analysis" onClick={closeAll}>Advanced Analysis</Link></li>
              </ul>
            </div>

            <Nav.Link as={Link} to="/predictions" onClick={closeAll}>Predictions</Nav.Link>
            <Nav.Link as={Link} to="/transactions" onClick={closeAll}>Transactions</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default BasicExample;