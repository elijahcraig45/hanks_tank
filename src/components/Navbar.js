import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
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
            <Nav.Link as={Link} to="/TeamBatting">Team Batting</Nav.Link>
            <Nav.Link as={Link} to="/TeamPitching">Team Pitching</Nav.Link>
            <Nav.Link as={Link} to="/PlayerBatting">Player Batting</Nav.Link>
            <Nav.Link as={Link} to="/PlayerPitching">Player Pitching</Nav.Link>
            <Nav.Link as={Link} to="/season-comparison">Season Comparison</Nav.Link>
            <Nav.Link as={Link} to="/team-comparison">Team Comparison</Nav.Link>
            <Nav.Link as={Link} to="/player-comparison">Player Comparison</Nav.Link>
            <Nav.Link as={Link} to="/advanced-analysis">Advanced Analysis</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default BasicExample;