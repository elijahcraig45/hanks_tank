import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Alert, Card, Badge, Button } from 'react-bootstrap';

const TeamPage = () => {
  const { teamAbbr } = useParams();

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="display-6">⚾ Team Profile</h1>
          <p className="text-muted">Comprehensive team information and analysis</p>
        </Col>
      </Row>

      <Card>
        <Card.Body className="text-center py-5">
          <h3 className="mb-3">
            <Badge bg="primary" className="me-2">{teamAbbr?.toUpperCase()}</Badge>
            Team Profile
          </h3>
          <Alert variant="info" className="mb-4">
            <Alert.Heading>Coming Soon!</Alert.Heading>
            <p className="mb-0">
              Individual team profiles with detailed statistics, roster information, and performance analysis 
              are currently under development. 
            </p>
            <hr />
            <p className="mb-0">
              <small>
                For now, you can view comprehensive team statistics on the 
                <strong> Team Batting</strong> and <strong>Team Pitching</strong> pages.
              </small>
            </p>
          </Alert>
          
          <div className="mt-4 mb-4">
            <p className="text-muted">
              🏟️ This will include team roster, season stats, recent games, and historical performance
            </p>
          </div>

          <div className="d-flex gap-3 justify-content-center">
            <Button as={Link} to="/teams/batting" variant="primary">
              View Team Batting Stats
            </Button>
            <Button as={Link} to="/teams/pitching" variant="outline-primary">
              View Team Pitching Stats
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default TeamPage;
