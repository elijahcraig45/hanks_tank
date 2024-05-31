import React, { useState, useEffect } from "react";
import { Card, ListGroup, Container, Row, Col, Button } from "react-bootstrap";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import "./styles/TodaysGames.css"; // Make sure to create and import a CSS file for custom styles

const TodaysGames = () => {
  const [games, setGames] = useState([]);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const fetchTodaysGames = async () => {
      try {
        const response = await fetch(`https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1`);
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

  return (
    <Container fluid className="horizontal-scroll-container bg-body-secondary" data-bs-theme="dark">
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
          {games.map((game) => (
            <Card key={game.gamePk} className="game-card">
              <Card.Body className="d-flex justify-content-between">
                <Col className="team-names">
                  <Row className="team-name">
                    {game.teams.away.team.name}
                  </Row>
                  <Row className="team-record">
                    ({game.teams.away.leagueRecord.wins}-{game.teams.away.leagueRecord.losses})
                  </Row>
                  <Row className="team-name">
                    {game.teams.home.team.name}
                  </Row>
                  <Row className="team-record">
                    ({game.teams.home.leagueRecord.wins}-{game.teams.home.leagueRecord.losses})
                  </Row>
                </Col>
                <Col className="game-time">
                  <Row>
                    {new Date(game.gameDate).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Row>
                </Col>
              </Card.Body>
            </Card>
          ))}
        </ListGroup>
      )}
    </Container>
  );
};

export default TodaysGames;
