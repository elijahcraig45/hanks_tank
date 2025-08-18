import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  ListGroup,
  Badge,
  Image,
  Table,
} from "react-bootstrap";
function HomePage() {
  const [newsData, setNewsData] = useState({ mlb: [], braves: [] });
  const [standings, setStandings] = useState([]);

  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const fetchData = async () => {
      try {
        const [mlbNews, bravesNews, standingsData] = await Promise.all([
          fetch(`${apiUrl}/mlb-news`),
          fetch(`${apiUrl}/braves-news`),
          fetch(`${apiUrl}/standings?orderBy=W&direction=desc`),
        ]);

        if (!mlbNews.ok || !bravesNews.ok || !standingsData.ok) {
          throw new Error("Network response was not ok");
        }

        const mlbData = await mlbNews.json();
        const bravesData = await bravesNews.json();
        let standingsRawData = await standingsData.json();

        // Format the standings data
        standingsRawData = standingsRawData.map((team) => ({
          ...team,
          L: team.L === false ? 0 : team.L === true ? 1 : team.L,
        }));
        const mlbDivisions = {
          AL_EAST: [
            "Baltimore Orioles",
            "Boston Red Sox",
            "New York Yankees",
            "Tampa Bay Rays",
            "Toronto Blue Jays",
          ],
          AL_CENTRAL: [
            "Chicago White Sox",
            "Cleveland Guardians",
            "Detroit Tigers",
            "Kansas City Royals",
            "Minnesota Twins",
          ],
          AL_WEST: [
            "Houston Astros",
            "Los Angeles Angels",
            "Oakland Athletics",
            "Seattle Mariners",
            "Texas Rangers",
          ],
          NL_EAST: [
            "Atlanta Braves",
            "Miami Marlins",
            "New York Mets",
            "Philadelphia Phillies",
            "Washington Nationals",
          ],
          NL_CENTRAL: [
            "Chicago Cubs",
            "Cincinnati Reds",
            "Milwaukee Brewers",
            "Pittsburgh Pirates",
            "St. Louis Cardinals",
          ],
          NL_WEST: [
            "Arizona Diamondbacks",
            "Colorado Rockies",
            "Los Angeles Dodgers",
            "San Diego Padres",
            "San Francisco Giants",
          ],
        };

        const sortedStandings = Object.keys(mlbDivisions).reduce(
          (acc, division) => {
            acc[division] = standingsRawData.filter((team) =>
              mlbDivisions[division].includes(team.Tm)
            );
            return acc;
          },
          {}
        );
        const standingsOrdered = [
          sortedStandings.AL_EAST,
          sortedStandings.AL_CENTRAL,
          sortedStandings.AL_WEST,
          sortedStandings.NL_EAST,
          sortedStandings.NL_CENTRAL,
          sortedStandings.NL_WEST,
        ].reduce(
          (acc, currentDivision) => acc.concat(currentDivision),
          [] // Initial value for the accumulator (empty array)
        );;
  
        
        console.log(standingsOrdered);
        setNewsData({ mlb: mlbData.articles, braves: bravesData.articles });
        setStandings(standingsOrdered);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, []);

  const sortNewsByDate = (newsArray) => {
    return newsArray.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );
  };


  const divisions = [
    "AL East",
    "AL Central",
    "AL West",
    "NL East",
    "NL Central",
    "NL West",
  ];

  return (
    <Container fluid="lg" className="py-5">
      <Row className="g-4">
        <Col xs={12} lg={8}>
          <Card>
            <Card.Header as="h5" className="text-center">
              Trending News
            </Card.Header>
            <ListGroup variant="flush">
              {[
                ...newsData.mlb.slice(0, 3),
                ...newsData.braves.slice(0, 3),
              ].map((article, index) => (
                <ListGroup.Item
                  key={index}
                  className="d-flex align-items-center"
                >
                  <Image
                    src={article.urlToImage}
                    alt="Article image"
                    rounded
                    style={{
                      width: "80px",
                      height: "80px",
                      marginRight: "20px",
                      objectFit: "cover",
                    }}
                  />
                  <div>
                    <h6 className="mb-0">
                      <Badge
                        bg={index < 3 ? "primary" : "secondary"}
                        className="me-2"
                      >
                        {index < 3 ? "MLB" : "Braves"}
                      </Badge>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link-dark"
                      >
                        {article.title}
                      </a>
                    </h6>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
          <Card>
            <Card.Header as="h5">Braves News</Card.Header>
            <ListGroup variant="flush">
              {sortNewsByDate(newsData.braves)
                .slice(10, 20)
                .map((item, index) => (
                  <ListGroup.Item
                    key={index}
                    className="d-flex align-items-center"
                  >
                    <Image
                      src={item.urlToImage}
                      alt=""
                      rounded
                      style={{
                        width: "60px",
                        height: "60px",
                        marginRight: "15px",
                        objectFit: "cover",
                      }}
                    />
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-dark"
                    >
                      {item.title}
                    </a>
                  </ListGroup.Item>
                ))}
            </ListGroup>
          </Card>
          <Card>
            <Card.Header as="h5">MLB News</Card.Header>
            <ListGroup variant="flush">
              {sortNewsByDate(newsData.mlb)
                .slice(10, 20)
                .map((item, index) => (
                  <ListGroup.Item
                    key={index}
                    className="d-flex align-items-center"
                  >
                    <Image
                      src={item.urlToImage}
                      alt=""
                      rounded
                      style={{
                        width: "60px",
                        height: "60px",
                        marginRight: "15px",
                        objectFit: "cover",
                      }}
                    />
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-dark"
                    >
                      {item.title}
                    </a>
                  </ListGroup.Item>
                ))}
            </ListGroup>
          </Card>
        </Col>
        <Col xs={12} lg={4}>
          {/* This space can be used for current standings, upcoming games, or any other relevant information. */}
          <Card>
            {/* Standings or other content goes here */}
            <Card.Header as="h5" className="text-center">
              Current Standings
            </Card.Header>
            <Card.Body>
              {divisions.map((division, divIndex) => (
                <div key={division} className="mb-3">
                  <h6>{division}</h6>
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>Team</th>
                        <th>W-L</th>
                        <th>%</th>
                        <th>GB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(standings)
                        .slice(divIndex * 5, (divIndex + 1) * 5)
                        .map((team, index) => (
                          <tr key={index}>
                            <td>{team.Tm}</td>
                            <td>
                              {team.W}-{team.L}
                            </td>
                            <td>{team["W-L%%"]}</td>
                            <td>{team.GB ?? "--"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="g-4 mt-4">
        <Col xs={12} md={6}></Col>
        <Col xs={12} md={6}></Col>
      </Row>
    </Container>
  );
}

export default HomePage;
