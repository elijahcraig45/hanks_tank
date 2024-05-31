import React, { useState, useEffect } from "react";
import { Card, ListGroup, Container, Row, Col, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import "./styles/TodaysGames.css"; // Make sure to create and import a CSS file for custom styles

const TodaysGames = () => {
  const [games, setGames] = useState([]);
  const [collapsed, setCollapsed] = useState(true);
  const [livefeed, setLivefeed] = useState([]);

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
        setLivefeed(responses);
      } catch (error) {
        console.error("Failed to fetch game details:", error);
      }
    };

    if (games.length) {
      fetchGameDetails();
    }
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
            const gameFeed = livefeed.find(
              (feed) => feed.gamePk === game.gamePk
            );
            const awayScore = gameFeed
              ? gameFeed.liveData.linescore.teams.away.runs
              : "-";
            const homeScore = gameFeed
              ? gameFeed.liveData.linescore.teams.home.runs
              : "-";
            const inProgress = game.status.statusCode !== "S" && game.status.statusCode !== "P" && game.status.statusCode !== "F";

            return (
              <Link key={game.gamePk} to={`/game/${game.gamePk}`} className="text-decoration-none">
                <Card className="game-card mb-2" style={{ minHeight : "182px"}}>
                  <Card.Body className="d-flex justify-content-between">
                    <Col className="team-names">
                      <Row className="team-name align-items-center">
                        <Col>
                          {game.teams.away.team.name}{" "}
                          <span className="game-score">{awayScore}</span>
                        </Col>
                      </Row>
                      <Row className="team-record">
                        ({game.teams.away.leagueRecord.wins}-
                        {game.teams.away.leagueRecord.losses})
                      </Row>
                      <Row className="game-time">
                        {game.status.statusCode === "S" &&
                          new Date(game.gameDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        {game.status.statusCode === "P" && "Pregame"}
                        {game.status.statusCode === "F" && "Final"}
                        {inProgress && (
                          <>
                            {gameFeed.liveData.plays.currentPlay.about.halfInning} {gameFeed.liveData.plays.currentPlay.about.inning}
                          </>
                        )}
                      </Row>
                      <Row className="team-name align-items-center">
                        <Col>
                          {game.teams.home.team.name}{" "}
                          <span className="game-score">{homeScore}</span>
                        </Col>
                      </Row>
                      <Row className="team-record">
                        ({game.teams.home.leagueRecord.wins}-
                        {game.teams.home.leagueRecord.losses})
                      </Row>
                    </Col>
                  </Card.Body>
                </Card>
              </Link>
            );
          })}
        </ListGroup>
      )}
    </Container>
  );
};

export default TodaysGames;
