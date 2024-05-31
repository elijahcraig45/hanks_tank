import React, { useState, useEffect } from "react";
import { Card, ListGroup, Container, Row, Col, Button } from "react-bootstrap";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import "./styles/TodaysGames.css"; // Make sure to create and import a CSS file for custom styles

const TodaysGames = () => {
  const [games, setGames] = useState([]);
  const [collapsed, setCollapsed] = useState(true);
  const [livefeed, setlivefeed] = useState([]);

  useEffect(() => {
    const fetchTodaysGames = async () => {
      try {
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1`
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const data = await response.json();
        setGames(data.dates[0].games);
      } catch (error) {
        console.error("Failed to fetch today's games:", error);
      }
    };

    fetchTodaysGames();
  }, []);

  useEffect(() => {
    const fetchGameDetails = async () => {
      try {
        const responses = await Promise.all(
          games.map(async (game) => {
            const gamePk = game.gamePk;
            const response = await fetch(
              `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`
            );
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.json();
          })
        );
        setlivefeed(responses);
      } catch (error) {
        console.error("Failed to fetch today's games:", error);
      }
    };

    fetchGameDetails();
  }, [games]);

  return (
    <Container
      fluid
      className="horizontal-scroll-container bg-body-secondary"
      data-bs-theme="dark"
    >
      <Button
        variant="link"
        className="toggle-button"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <FaChevronDown size={15} /> : <FaChevronUp size={15} />}
        Today's Games
      </Button>

      {!collapsed && (
        <ListGroup horizontal className="flex-row">
          {games.map((game) => {
  // Find the live feed data for the current game
  const gameFeed = livefeed.find(feed => feed.gamePk === game.gamePk);
 console.log(livefeed)
  // Calculate scores based on the live feed data
  const awayScore = gameFeed ? gameFeed.liveData.linescore.teams.away.runs : '-';
  const homeScore = gameFeed ? gameFeed.liveData.linescore.teams.home.runs : '-';

  return (
    <Card key={game.gamePk} className="game-card">
      <Card.Body className="d-flex justify-content-between">
        <Col className="team-names">
          <Row className="team-name">
            {game.teams.away.team.name}
            <Col className="game-score">
            {game.status.statusCode === "F" && `${awayScore}`}
            </Col>
            <Row className="team-record">
            ({game.teams.away.leagueRecord.wins}-{game.teams.away.leagueRecord.losses})
          </Row>
          </Row>
          
          <Col >
            <Row className="game-time">
              {game.status.statusCode === "S" &&
                new Date(game.gameDate).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              {game.status.statusCode === "P" && "Pregame"}
              {game.status.statusCode === "F" && "Final"}
              {game.status.statusCode !== "S" &&
                game.status.statusCode !== "P" &&
                game.status.statusCode !== "F" && (
                  <>
                    {game.status.inningState} {game.status.inning}
                  </>
                )}
            </Row>
          </Col>

          <Row className="team-name">
            {game.teams.home.team.name}
            <Col className="game-score">
            {game.status.statusCode === "F" && `${homeScore}`}
            </Col>
            <Row className="team-record">
            ({game.teams.home.leagueRecord.wins}-{game.teams.home.leagueRecord.losses})
          </Row>
          </Row>
          
        </Col>
      </Card.Body>
    </Card>
  );
})}

        </ListGroup>
      )}
    </Container>
  );
};

export default TodaysGames;
