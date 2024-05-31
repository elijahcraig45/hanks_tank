import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Container, Row, Col, Card, Table, Button } from "react-bootstrap";
import StrikeZone from './LiveGameStrikeZone';
import BoxScore from './BoxScore';

const GameDetailsPage = () => {
  const { gamePk } = useParams();
  const [gameDetails, setGameDetails] = useState(null);
  const [selectedAtBat, setSelectedAtBat] = useState(null);

  const fetchGameDetails = async () => {
    try {
      const response = await fetch(
        `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      setGameDetails(data);
      setSelectedAtBat(gameDetails.liveData.plays.currentPlay);
    } catch (error) {
      console.error("Failed to fetch game details:", error);
    }
  };

  useEffect(() => {
    fetchGameDetails();
  }, [gamePk]);

  if (!gameDetails) {
    return <div>Loading...</div>;
  }

  const awayTeam = gameDetails.gameData.teams.away;
  const homeTeam = gameDetails.gameData.teams.home;
  const linescore = gameDetails.liveData.linescore;
  const weather = gameDetails.gameData.weather;
  const probablePitchers = gameDetails.gameData.probablePitchers;
  const events = gameDetails.liveData.plays.allPlays.slice().reverse(); // Reversed order

  const getPlayerDetails = (playerId, team) => {
    return gameDetails.liveData.boxscore.teams[team].players[`ID${playerId}`];
  };

  const renderPlayerRow = (playerId, team) => {
    const player = getPlayerDetails(playerId, team);
    if (!player || !player.person || !player.stats.batting || player.position.type === "Pitcher") return null;
    const stats = player.stats.batting;
    const seasonStats = player.seasonStats.batting;

    return (
      <tr key={player.person.id}>
        <td>{player.person.fullName}</td>
        <td>{player.position ? player.position.abbreviation : 'N/A'}</td>
        <td>{stats.atBats}</td>
        <td>{stats.hits}</td>
        <td>{stats.strikeOuts}</td>
        <td>{stats.baseOnBalls}</td>
        <td>{stats.rbi}</td>
        <td>{seasonStats.avg}</td>
        <td>{seasonStats.obp}</td>
        <td>{seasonStats.slg}</td>
      </tr>
    );
  };

  const renderPitcherRow = (playerId, team) => {
    const player = getPlayerDetails(playerId, team);
    if (!player || !player.person || !player.stats.pitching) return null;
    const stats = player.stats.pitching;
    const seasonStats = player.seasonStats.pitching;

    return (
      <tr key={player.person.id}>
        <td>{player.person.fullName}</td>
        <td>{seasonStats.wins}-{seasonStats.losses}</td>
        <td>{seasonStats.era}</td>
        <td>{stats.inningsPitched}</td>
        <td>{stats.strikeOuts}</td>
        <td>{stats.baseOnBalls}</td>
        <td>{stats.hits}</td>
        <td>{stats.runs}</td>
        <td>{seasonStats.whip}</td>
        <td>{seasonStats.strikeoutsPer9Inn}</td>
      </tr>
    );
  };

  const handleEventClick = (event) => {
    setSelectedAtBat(event);
  };

  const renderEvent = (event) => {
    const { result, about, count } = event;
    return (
      <Card key={about.atBatIndex} className="mb-2" onClick={() => handleEventClick(event)} style={{ cursor: 'pointer' }}>
        <Card.Body>
          <h5>{result.description}</h5>
          <p><strong>Inning:</strong> {about.halfInning} {about.inning}</p>
          <p><strong>Count:</strong> {count.balls} Balls, {count.strikes} Strikes, {count.outs} Outs</p>
        </Card.Body>
      </Card>
    );
  };

  return (
    <Container>
      <h1>{awayTeam.teamName} @ {homeTeam.teamName}</h1>
      
      <Row className="mb-4">
        <Col>
          <BoxScore linescore={linescore} awayTeam={awayTeam} homeTeam={homeTeam} />
        </Col>
      </Row>
      
      <Row>
        <Col md={6}>
          <Card className="mb-4" style={{ maxHeight: "800px", overflowY: "auto" }}>
            <Card.Header as="h3">
              Play by Play
              <Button variant="secondary" onClick={fetchGameDetails} style={{ float: 'right' }}>Refresh</Button>
            </Card.Header>
            <Card.Body>
              {events.map((event) => renderEvent(event))}
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4" style={{ maxHeight: "800px", overflowY: "auto" }}>
            <Card.Header as="h3">Strike Zone</Card.Header>
            <Card.Body>
              <StrikeZone pitches={selectedAtBat ? selectedAtBat.playEvents.filter(event => event.isPitch) : []} />
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col>
          <Card>
            <Card.Header as="h3">{awayTeam.teamName} Lineup</Card.Header>
            <Card.Body>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Position</th>
                    <th>AB</th>
                    <th>H</th>
                    <th>K</th>
                    <th>BB</th>
                    <th>RBI</th>
                    <th>AVG</th>
                    <th>OBP</th>
                    <th>SLG</th>
                  </tr>
                </thead>
                <tbody>
                  {gameDetails.liveData.boxscore.teams.away.batters.map(playerId => renderPlayerRow(playerId, 'away'))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card>
            <Card.Header as="h3">{homeTeam.teamName} Lineup</Card.Header>
            <Card.Body>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Position</th>
                    <th>AB</th>
                    <th>H</th>
                    <th>K</th>
                    <th>BB</th>
                    <th>RBI</th>
                    <th>AVG</th>
                    <th>OBP</th>
                    <th>SLG</th>
                  </tr>
                </thead>
                <tbody>
                  {gameDetails.liveData.boxscore.teams.home.batters.map(playerId => renderPlayerRow(playerId, 'home'))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card>
            <Card.Header as="h3">{awayTeam.teamName} Pitchers</Card.Header>
            <Card.Body>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>W-L</th>
                    <th>ERA</th>
                    <th>IP</th>
                    <th>SO</th>
                    <th>BB</th>
                    <th>H</th>
                    <th>R</th>
                    <th>WHIP</th>
                    <th>K/9</th>
                  </tr>
                </thead>
                <tbody>
                  {gameDetails.liveData.boxscore.teams.away.pitchers.map(playerId => renderPitcherRow(playerId, 'away'))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
        <Col>
          <Card>
            <Card.Header as="h3">{homeTeam.teamName} Pitchers</Card.Header>
            <Card.Body>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>W-L</th>
                    <th>ERA</th>
                    <th>IP</th>
                    <th>SO</th>
                    <th>BB</th>
                    <th>H</th>
                    <th>R</th>
                    <th>WHIP</th>
                    <th>K/9</th>
                  </tr>
                </thead>
                <tbody>
                  {gameDetails.liveData.boxscore.teams.home.pitchers.map(playerId => renderPitcherRow(playerId, 'home'))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="mt-3">
        <Col>
          <Card className="mb-4">
            <Card.Body>
              <Row className="mt-3">
                <Col>
                  <h4>Weather</h4>
                  <p><strong>Condition:</strong> {weather.condition}</p>
                  <p><strong>Temperature:</strong> {weather.temp}°F</p>
                  <p><strong>Wind:</strong> {weather.wind}</p>
                </Col>
                <Col>
                  <h4>Probable Starting Pitchers</h4>
                  <p><strong>{awayTeam.teamName} Pitcher:</strong> {probablePitchers.away.fullName}</p>
                  <p><strong>{homeTeam.teamName} Pitcher:</strong> {probablePitchers.home.fullName}</p>
                </Col>
              </Row>
              <Row className="mt-3">
                <Col>
                  <h4>Game Details</h4>
                  <p><strong>Game Status:</strong> {gameDetails.gameData.status.detailedState}</p>
                  <p><strong>Game Date:</strong> {new Date(gameDetails.gameData.datetime.dateTime).toLocaleString()}</p>
                  <p><strong>Venue:</strong> {gameDetails.gameData.venue.name}</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default GameDetailsPage;
