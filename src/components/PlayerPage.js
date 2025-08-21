import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Alert, Spinner, Badge, Button, Tab, Tabs } from 'react-bootstrap';

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
        const [battingResponse, pitchingResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/player-batting?year=2024&limit=1000`),
          fetch(`${process.env.REACT_APP_API_URL}/player-pitching?year=2024&limit=1000`)
        ]);

        if (!battingResponse.ok || !pitchingResponse.ok) {
          throw new Error('Failed to fetch player data');
        }

        const allBattingData = await battingResponse.json();
        const allPitchingData = await pitchingResponse.json();

        console.log(`🔍 PlayerPage: Looking for player ID ${playerId}`);
        console.log(`📊 Available batting players:`, allBattingData.slice(0, 3).map(p => ({ name: p.Name, id: p.playerId })));
        console.log(`⚾ Available pitching players:`, allPitchingData.slice(0, 3).map(p => ({ name: p.Name, id: p.playerId })));

        // Find player in both datasets
        const playerBatting = allBattingData.find(player => 
          player.playerId && player.playerId.toString() === playerId
        );
        
        const playerPitching = allPitchingData.find(player => 
          player.playerId && player.playerId.toString() === playerId
        );

        console.log(`🏏 Found batting data:`, playerBatting ? playerBatting.Name : 'None');
        console.log(`⚾ Found pitching data:`, playerPitching ? playerPitching.Name : 'None');

        setBattingData(playerBatting);
        setPitchingData(playerPitching);

        if (!playerBatting && !playerPitching) {
          setError(`No player found with ID: ${playerId}. Check the browser console for available player IDs.`);
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
            <Button as={Link} to="/players/batting" variant="primary" className="me-2">
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
          <div className="d-flex align-items-center mb-3">
            <Badge bg="primary" className="me-3 fs-5 p-3">
              {team}
            </Badge>
            <div>
              <h1 className="display-6 mb-0">{playerName}</h1>
              <p className="text-muted mb-0">
                Player ID: {playerId} • 2024 Season Stats
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <Tabs defaultActiveKey={battingData ? "batting" : "pitching"} className="mb-4">
        {battingData && (
          <Tab eventKey="batting" title="🏏 Batting Stats">
            <Card>
              <Card.Header>
                <h5 className="mb-0">Batting Statistics</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <h6 className="text-muted">Basic Stats</h6>
                      <p><strong>Games:</strong> {battingData.G}</p>
                      <p><strong>At Bats:</strong> {battingData.AB}</p>
                      <p><strong>Plate Appearances:</strong> {battingData.PA}</p>
                      <p><strong>Runs:</strong> {battingData.R}</p>
                      <p><strong>Hits:</strong> {battingData.H}</p>
                      <p><strong>Doubles:</strong> {battingData['2B']}</p>
                      <p><strong>Triples:</strong> {battingData['3B']}</p>
                      <p><strong>Home Runs:</strong> {battingData.HR}</p>
                      <p><strong>RBIs:</strong> {battingData.RBI}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-3">
                      <h6 className="text-muted">Advanced Stats</h6>
                      <p><strong>Batting Average:</strong> {battingData.AVG}</p>
                      <p><strong>On-Base %:</strong> {battingData.OBP}</p>
                      <p><strong>Slugging %:</strong> {battingData.SLG}</p>
                      <p><strong>OPS:</strong> {battingData.OPS}</p>
                      <p><strong>Walks:</strong> {battingData.BB}</p>
                      <p><strong>Strikeouts:</strong> {battingData.SO}</p>
                      <p><strong>Stolen Bases:</strong> {battingData.SB}</p>
                      <p><strong>Caught Stealing:</strong> {battingData.CS}</p>
                      <p><strong>BABIP:</strong> {battingData.BABIP}</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab>
        )}

        {pitchingData && (
          <Tab eventKey="pitching" title="⚾ Pitching Stats">
            <Card>
              <Card.Header>
                <h5 className="mb-0">Pitching Statistics</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <div className="mb-3">
                      <h6 className="text-muted">Basic Stats</h6>
                      <p><strong>Games:</strong> {pitchingData.G}</p>
                      <p><strong>Games Started:</strong> {pitchingData.GS}</p>
                      <p><strong>Wins:</strong> {pitchingData.W}</p>
                      <p><strong>Losses:</strong> {pitchingData.L}</p>
                      <p><strong>Saves:</strong> {pitchingData.SV}</p>
                      <p><strong>Innings Pitched:</strong> {pitchingData.IP}</p>
                      <p><strong>Hits Allowed:</strong> {pitchingData.H}</p>
                      <p><strong>Runs Allowed:</strong> {pitchingData.R}</p>
                      <p><strong>Earned Runs:</strong> {pitchingData.ER}</p>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="mb-3">
                      <h6 className="text-muted">Advanced Stats</h6>
                      <p><strong>ERA:</strong> {pitchingData.ERA}</p>
                      <p><strong>WHIP:</strong> {pitchingData.WHIP}</p>
                      <p><strong>Strikeouts:</strong> {pitchingData.SO}</p>
                      <p><strong>Walks:</strong> {pitchingData.BB}</p>
                      <p><strong>Home Runs Allowed:</strong> {pitchingData.HR}</p>
                      <p><strong>Hit Batters:</strong> {pitchingData.HBP}</p>
                      <p><strong>Wild Pitches:</strong> {pitchingData.WP}</p>
                      <p><strong>Balks:</strong> {pitchingData.BK}</p>
                      <p><strong>Batters Faced:</strong> {pitchingData.BF}</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab>
        )}
      </Tabs>

      {!battingData && !pitchingData && (
        <Alert variant="info">
          <Alert.Heading>No Statistics Available</Alert.Heading>
          <p>This player does not have batting or pitching statistics for the 2024 season.</p>
        </Alert>
      )}

      <Row className="mt-4">
        <Col className="d-flex gap-3 justify-content-center">
          <Button as={Link} to="/players/batting" variant="primary">
            View All Batting Stats
          </Button>
          <Button as={Link} to="/players/pitching" variant="outline-primary">
            View All Pitching Stats
          </Button>
          <Button as={Link} to="/teams/batting" variant="outline-secondary">
            View Team Stats
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default PlayerPage;
