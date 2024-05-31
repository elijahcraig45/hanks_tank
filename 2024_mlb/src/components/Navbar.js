import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';


function BasicExample() {
  return (
    <Navbar expand="lg" className="bg-body-tertiary" data-bs-theme="dark">
      <Container>
        <Navbar.Brand href="/">Hank's Tank 2024</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="/">Home</Nav.Link>
            <Nav.Link href="/TeamBatting">Team Batting</Nav.Link>
            <Nav.Link href="/TeamPitching">Team Pitching</Nav.Link>
            <Nav.Link href="/PlayerBatting">Player Batting</Nav.Link>
            <Nav.Link href="/PlayerPitching">Player Pitching</Nav.Link>
            <Nav.Link href="/AssistedAnalysis">Assisted</Nav.Link>
            
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default BasicExample;