import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { Link, useNavigate } from 'react-router-dom';
import './styles/Navbar.css';


function BasicExample() {
  const navigate = useNavigate();

  return (
    <Navbar expand="lg" bg="dark" variant="dark" sticky="top">
      <Container>
        <Navbar.Brand as={Link} to="/">Hank's Tank 2026</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/games">Games</Nav.Link>
            <NavDropdown title="Stats" id="stats-dropdown" renderOnMount>
              <NavDropdown.Item onClick={() => navigate('/TeamBatting')}>Team Batting</NavDropdown.Item>
              <NavDropdown.Item onClick={() => navigate('/TeamPitching')}>Team Pitching</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={() => navigate('/PlayerBatting')}>Player Batting</NavDropdown.Item>
              <NavDropdown.Item onClick={() => navigate('/PlayerPitching')}>Player Pitching</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title="Analysis" id="analysis-dropdown" renderOnMount>
              <NavDropdown.Item onClick={() => navigate('/season-comparison')}>Season Comparison</NavDropdown.Item>
              <NavDropdown.Item onClick={() => navigate('/team-comparison')}>Team Comparison</NavDropdown.Item>
              <NavDropdown.Item onClick={() => navigate('/player-comparison')}>Player Comparison</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item onClick={() => navigate('/advanced-analysis')}>Advanced Analysis</NavDropdown.Item>
            </NavDropdown>
            <Nav.Link as={Link} to="/transactions">Transactions</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default BasicExample;