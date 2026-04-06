import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Alert, Spinner, Button, Tab, Tabs } from 'react-bootstrap';
import apiService from '../services/api';
import { SEASONS } from '../config/constants';

const PlayerPage = () => {
  const { playerId } = useParams();
  const [battingData, setBattingData] = useState(null);
  const [pitchingData, setPitchingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (!playerId || playerId === 'undefined') {
        setError('No player ID provided');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch both batting and pitching data to see if player exists in either
        const [allBattingData, allPitchingData] = await Promise.all([
          apiService.getPlayerBatting(SEASONS.CURRENT, { limit: 500 }),
          apiService.getPlayerPitching(SEASONS.CURRENT, { limit: 500 })
        ]);

        // Find player in both datasets
        const playerBatting = allBattingData.find(player => 
          player.playerId && player.playerId.toString() === playerId
        );
        
        const playerPitching = allPitchingData.find(player => 
          player.playerId && player.playerId.toString() === playerId
        );

        setBattingData(playerBatting);
        setPitchingData(playerPitching);

        if (!playerBatting && !playerPitching) {
          setError(`No player found with ID: ${playerId}.`);
        }

      } catch (error) {
        console.error('Error fetching player data:', error);
        setError(`Failed to load player data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerId]);

  if (loading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" role="status" />
        <p className="mt-2">Loading player data...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Player Data</Alert.Heading>
          {error}
          <hr />
          <p className="mb-0">
            <Button as={Link} to="/PlayerBatting" variant="primary" className="me-2">
              Browse All Players
            </Button>
            <Button as={Link} to="/" variant="outline-secondary">
              Back to Home
            </Button>
          </p>
        </Alert>
      </Container>
    );
  }

  const playerName = battingData?.Name || pitchingData?.Name || 'Unknown Player';
  const team = battingData?.Team || pitchingData?.Team || 'Unknown Team';

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center gap-3 mb-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold fs-5"
              style={{ width: 60, height: 60, background: '#1a1a2e', flexShrink: 0 }}
            >
              {playerName.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <h1 className="display-6 mb-1 fw-bold">{playerName}</h1>
              <p className="text-muted mb-0">
                {team} • {SEASONS.CURRENT} Season Stats
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <Tabs defaultActiveKey={battingData ? "batting" : "pitching"} className="mb-4">
        {battingData && (
          <Tab eventKey="batting" title="🏏 Batting Stats">
            <Row className="g-3 mb-3">
              {[
                { label: 'AVG', value: battingData.AVG },
                { label: 'OBP', value: battingData.OBP },
                { label: 'SLG', value: battingData.SLG },
                { label: 'OPS', value: battingData.OPS },
              ].map(s => (
                <Col xs={6} md={3} key={s.label}>
                  <Card className="text-center h-100 border-0 shadow-sm">
                    <Card.Body className="py-3">
                      <div className="fs-4 fw-bold text-primary">{s.value ?? '—'}</div>
                      <div className="text-muted small">{s.label}</div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
            <Row className="g-3">
              {[
                { label: 'Games', value: battingData.G },
                { label: 'PA', value: battingData.PA },
                { label: 'At Bats', value: battingData.AB },
                { label: 'Runs', value: battingData.R },
                { label: 'Hits', value: battingData.H },
                { label: '2B', value: battingData['2B'] },
                { label: '3B', value: battingData['3B'] },
                { label: 'HR', value: battingData.HR },
                { label: 'RBI', value: battingData.RBI },
                { label: 'SB', value: battingData.SB },
                { label: 'BB', value: battingData.BB },
                { label: 'SO', value: battingData.SO },
                { label: 'BABIP', value: battingData.BABIP },
                { label: 'TB', value: battingData.TB },
                { label: 'HBP', value: battingData.HBP },
                { label: 'CS', value: battingData.CS },
              ].map(s => (
                <Col xs={6} sm={4} md={3} lg={2} key={s.label}>
                  <Card className="text-center h-100 border-0 bg-light">
                    <Card.Body className="py-2">
                      <div className="fw-semibold">{s.value ?? '—'}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{s.label}</div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Tab>
        )}

        {pitchingData && (
          <Tab eventKey="pitching" title="⚾ Pitching Stats">
            {pitchingData ? (
              <>
                <Row className="g-3 mb-3">
                  {[
                    { label: 'ERA', value: pitchingData.ERA },
                    { label: 'WHIP', value: pitchingData.WHIP },
                    { label: 'IP', value: pitchingData.IP },
                    { label: 'K/9', value: pitchingData.SO9 ?? (pitchingData.SO && pitchingData.IP ? (pitchingData.SO / parseFloat(pitchingData.IP) * 9).toFixed(2) : null) },
                  ].map(s => (
                    <Col xs={6} md={3} key={s.label}>
                      <Card className="text-center h-100 border-0 shadow-sm">
                        <Card.Body className="py-3">
                          <div className="fs-4 fw-bold text-danger">{s.value ?? '—'}</div>
                          <div className="text-muted small">{s.label}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
                <Row className="g-3">
                  {[
                    { label: 'Games', value: pitchingData.G },
                    { label: 'GS', value: pitchingData.GS },
                    { label: 'Wins', value: pitchingData.W },
                    { label: 'Losses', value: pitchingData.L },
                    { label: 'Saves', value: pitchingData.SV },
                    { label: 'Strikeouts', value: pitchingData.SO },
                    { label: 'Walks', value: pitchingData.BB },
                    { label: 'Hits', value: pitchingData.H },
                    { label: 'Runs', value: pitchingData.R },
                    { label: 'Earned Runs', value: pitchingData.ER },
                    { label: 'HR Allowed', value: pitchingData.HR },
                    { label: 'HBP', value: pitchingData.HBP },
                    { label: 'Wild Pitches', value: pitchingData.WP },
                    { label: 'Balks', value: pitchingData.BK },
                    { label: 'BF', value: pitchingData.BF },
                  ].map(s => (
                    <Col xs={6} sm={4} md={3} lg={2} key={s.label}>
                      <Card className="text-center h-100 border-0 bg-light">
                        <Card.Body className="py-2">
                          <div className="fw-semibold">{s.value ?? '—'}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{s.label}</div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </>
            ) : (
              <Alert variant="info">No pitching stats found for this player.</Alert>
            )}
          </Tab>
        )}
      </Tabs>

      {!battingData && !pitchingData && (
        <Alert variant="info">
          <Alert.Heading>No Statistics Available</Alert.Heading>
          <p>This player does not have batting or pitching statistics for the {SEASONS.CURRENT} season.</p>
        </Alert>
      )}

      <Row className="mt-4">
        <Col className="d-flex gap-3 justify-content-center">
          <Button as={Link} to="/PlayerBatting" variant="primary">
            View All Batting Stats
          </Button>
          <Button as={Link} to="/PlayerPitching" variant="outline-primary">
            View All Pitching Stats
          </Button>
          <Button as={Link} to="/TeamBatting" variant="outline-secondary">
            View Team Stats
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default PlayerPage;
