import React, { useState, useEffect } from "react";
import { Card, Container, Row, Col, Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./styles/TodaysGames.css"; // Make sure to create and import a CSS file for custom styles

const TodaysGames = () => {
  const [games, setGames] = useState([]);
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
    <Container fluid className="bg-light" style={{ minHeight: "100vh" }}>
      <h1 className="my-4">Today's Games</h1>
      <Row>
        {games.map((game) => {
          const gameFeed = livefeed.find((feed) => feed.gamePk === game.gamePk);
          const inProgress =
            game.status.statusCode !== "S" &&
            game.status.statusCode !== "P" &&
            game.status.statusCode !== "F";

          const innings = gameFeed
            ? gameFeed.liveData.linescore.innings
            : [];
          const awayTotals = gameFeed
            ? gameFeed.liveData.linescore.teams.away
            : { runs: "0", hits: "0", errors: "0" };
          const homeTotals = gameFeed
            ? gameFeed.liveData.linescore.teams.home
            : { runs: "0", hits: "0", errors: "0" };

          return (
            <Col key={game.gamePk} xs={12} md={6} lg={4} className="mb-3">
              <Link to={`/game/${game.gamePk}`} className="text-decoration-none">
                <Card className="game-card h-100 bg-white border-light shadow-sm">
                  <Card.Body>
                    <Row className="align-items-center">
                      <Col>
                        <h5 className="team-name">
                          {game.teams.away.team.name}
                        </h5>
                        <p className="team-record text-muted">
                          ({game.teams.away.leagueRecord.wins}-
                          {game.teams.away.leagueRecord.losses})
                        </p>
                      </Col>
                      <Col>
                        <h5 className="team-name">
                          {game.teams.home.team.name}
                        </h5>
                        <p className="team-record text-muted">
                          ({game.teams.home.leagueRecord.wins}-
                          {game.teams.home.leagueRecord.losses})
                        </p>
                      </Col>
                    </Row>
                    <Table striped bordered hover size="sm" className="mt-3">
                      <thead>
                        <tr>
                          <th></th>
                          {innings.map((inning, index) => (
                            <th key={index}>{index + 1}</th>
                          ))}
                          <th>R</th>
                          <th>H</th>
                          <th>E</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                          {gameFeed && (
                          <>
                            {gameFeed.gameData.teams.away.abbreviation}{" "}
                          </>)}
                            </td>
                          {innings.map((inning, index) => (
                            <td key={index}>{inning.away?.runs || "0"}</td>
                          ))}
                          <td>{awayTotals.runs}</td>
                          <td>{awayTotals.hits}</td>
                          <td>{awayTotals.errors}</td>
                        </tr>
                        <tr>
                          <td>
                            {gameFeed && (
                          <>
                            {gameFeed.gameData.teams.home.abbreviation}{" "}
                          </>)}
                          </td>
                          {innings.map((inning, index) => (
                            <td key={index}>{inning.home?.runs || "0"}</td>
                          ))}
                          <td>{homeTotals.runs}</td>
                          <td>{homeTotals.hits}</td>
                          <td>{homeTotals.errors}</td>
                        </tr>
                      </tbody>
                    </Table>
                    <Row className="game-status mt-3">
                      <Col className="text-center">
                        {game.status.statusCode === "S" &&
                          new Date(game.gameDate).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        {game.status.statusCode === "P" && "Pregame"}
                        {game.status.statusCode === "F" && "Final"}
                        {inProgress && gameFeed && (
                          <>
                            {gameFeed.liveData.plays.currentPlay.about.halfInning.toUpperCase()}{" "}
                            {gameFeed.liveData.plays.currentPlay.about.inning}
                          </>
                        )}
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
};

export default TodaysGames;
