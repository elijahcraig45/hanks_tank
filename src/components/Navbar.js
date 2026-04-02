import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import { Link } from 'react-router-dom';
import './styles/Navbar.css';


function BasicExample() {
  return (
    <Navbar expand="lg" className="bg-body-tertiary" data-bs-theme="dark">
      <Container>
        <Navbar.Brand as={Link} to="/">Hank's Tank 2026</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/games">Games</Nav.Link>
            <NavDropdown title="Stats" id="stats-dropdown">
              <NavDropdown.Item as={Link} to="/TeamBatting">Team Batting</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/TeamPitching">Team Pitching</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item as={Link} to="/PlayerBatting">Player Batting</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/PlayerPitching">Player Pitching</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title="Analysis" id="analysis-dropdown">
              <NavDropdown.Item as={Link} to="/season-comparison">Season Comparison</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/team-comparison">Team Comparison</NavDropdown.Item>
              <NavDropdown.Item as={Link} to="/player-comparison">Player Comparison</NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item as={Link} to="/advanced-analysis">Advanced Analysis</NavDropdown.Item>
            </NavDropdown>
            <Nav.Link as={Link} to="/transactions">Transactions</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default BasicExample;