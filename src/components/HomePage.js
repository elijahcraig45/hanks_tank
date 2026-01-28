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
  Spinner,
  Alert,
  Button
} from "react-bootstrap";
import { Link } from "react-router-dom";
import apiService from '../services/api';
import './styles/HomePage.css';

function HomePage() {
  const [newsData, setNewsData] = useState({ mlb: [], braves: [] });
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refreshNews = async () => {
    setNewsLoading(true);
    try {
      const BASE_URL = process.env.REACT_APP_API_URL || 'https://hankstank.uc.r.appspot.com/api';
      const response = await fetch(`${BASE_URL}/news/refresh`, {
        method: 'POST'
      });
      if (response.ok) {
        // Refetch news data after refresh completes
        await fetchNewsData();
      }
    } catch (error) {
      console.error('Error refreshing news:', error);
    } finally {
      setNewsLoading(false);
    }
  };

  const fetchNewsData = async () => {
    const BASE_URL = process.env.REACT_APP_API_URL || 'https://hankstank.uc.r.appspot.com/api';
    const [mlbNews, bravesNews] = await Promise.all([
      fetch(`${BASE_URL}/mlb-news`),
      fetch(`${BASE_URL}/braves-news`)
    ]);

    if (mlbNews.ok && bravesNews.ok) {
      const mlbData = await mlbNews.json();
      const bravesData = await bravesNews.json();
      setNewsData({ 
        mlb: mlbData.articles || [], 
        braves: bravesData.articles || [] 
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const BASE_URL = process.env.REACT_APP_API_URL || 'https://hankstank.uc.r.appspot.com/api';
        
        // Fetch all data concurrently
        const currentYear = new Date().getFullYear();
        const [mlbNews, bravesNews, standingsData] = await Promise.all([
          fetch(`${BASE_URL}/mlb-news`).catch(() => ({ ok: false })),
          fetch(`${BASE_URL}/braves-news`).catch(() => ({ ok: false })),
          apiService.getStandings(currentYear).catch(() => null)
        ]);

        // Handle news data (optional)
        if (mlbNews.ok && bravesNews.ok) {
          const mlbData = await mlbNews.json();
          const bravesData = await bravesNews.json();
          setNewsData({ 
            mlb: mlbData.articles || [], 
            braves: bravesData.articles || [] 
          });
        }

        // Handle standings data
        console.log('Standings data received:', standingsData);
        if (standingsData && standingsData.records) {
          console.log('Processing standings with records');
          const formattedStandings = formatStandingsData(standingsData.records);
          console.log('Formatted standings:', formattedStandings);
          setStandings(formattedStandings);
        } else if (standingsData && typeof standingsData === 'object') {
          // Data might already be formatted
          console.log('Using standings data as-is');
          setStandings(standingsData);
        } else {
          console.log('No standings data available for current year');
          setStandings({});
        }

        setLastUpdated(new Date());
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setError("Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatStandingsData = (rawData) => {
    if (!Array.isArray(rawData)) return {};
    
    const mlbDivisions = {
      'AL East': [
        "Baltimore Orioles", "Boston Red Sox", "New York Yankees", 
        "Tampa Bay Rays", "Toronto Blue Jays"
      ],
      'AL Central': [
        "Chicago White Sox", "Cleveland Guardians", "Detroit Tigers",
        "Kansas City Royals", "Minnesota Twins"
      ],
      'AL West': [
        "Houston Astros", "Los Angeles Angels", "Oakland Athletics",
        "Seattle Mariners", "Texas Rangers"
      ],
      'NL East': [
        "Atlanta Braves", "Miami Marlins", "New York Mets",
        "Philadelphia Phillies", "Washington Nationals"
      ],
      'NL Central': [
        "Chicago Cubs", "Cincinnati Reds", "Milwaukee Brewers",
        "Pittsburgh Pirates", "St. Louis Cardinals"
      ],
      'NL West': [
        "Arizona Diamondbacks", "Colorado Rockies", "Los Angeles Dodgers",
        "San Diego Padres", "San Francisco Giants"
      ]
    };

    // Flatten all team records from all divisions/leagues
    const allTeamRecords = [];
    rawData.forEach(record => {
      if (record.teamRecords) {
        record.teamRecords.forEach(teamRecord => {
          allTeamRecords.push({
            Tm: teamRecord.team.name,
            W: teamRecord.wins,
            L: teamRecord.losses,
            winPct: teamRecord.winningPercentage || ((teamRecord.wins / (teamRecord.wins + teamRecord.losses)) || 0).toFixed(3),
            GB: teamRecord.gamesBack || (teamRecord.divisionRank === 1 ? '--' : teamRecord.gamesBack)
          });
        });
      }
    });

    const sortedStandings = {};
    
    Object.entries(mlbDivisions).forEach(([division, teams]) => {
      sortedStandings[division] = allTeamRecords
        .filter(team => teams.includes(team.Tm))
        .sort((a, b) => (b.W || 0) - (a.W || 0))
        .map(team => ({
          ...team,
          L: team.L === false ? 0 : team.L === true ? 1 : team.L || 0,
          winPct: team.winPct || (team.W / (team.W + team.L)).toFixed(3)
        }));
    });

    return sortedStandings;
  };

  const sortNewsByDate = (newsArray) => {
    if (!Array.isArray(newsArray)) return [];
    return newsArray.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );
  };

  const getTeamAbbreviation = (teamName) => {
    if (!teamName) return 'UNK';
    
    const teamMap = {
      "Atlanta Braves": "ATL",
      "Miami Marlins": "MIA",
      "New York Mets": "NYM",
      "Philadelphia Phillies": "PHI",
      "Washington Nationals": "WSN",
      // Add more mappings as needed
    };
    return teamMap[teamName] || teamName.substring(0, 3).toUpperCase();
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary" />
          <p className="mt-3">Loading Hank's Tank...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="lg" className="py-4">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Header Section */}
      <Row className="mb-4">
        <Col>
          <div className="text-center">
            <p className="lead text-muted">Your Ultimate MLB Analytics Dashboard</p>
            {lastUpdated && (
              <small className="text-muted">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </small>
            )}
          </div>
        </Col>
      </Row>

      <Row className="g-4">
        <Col xs={12} lg={8}>
          {/* Hero News Section */}
          <Card className="mb-4 hero-news">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">🔥 Trending News</h5>
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={refreshNews}
                disabled={newsLoading}
              >
                {newsLoading ? <Spinner animation="border" size="sm" /> : "Refresh"}
              </Button>
            </Card.Header>
            <ListGroup variant="flush">
              {[...newsData.mlb.slice(0, 3), ...newsData.braves.slice(0, 3)]
                .slice(0, 5)
                .map((article, index) => (
                <ListGroup.Item key={`trending-${index}`} className="news-item">
                  <Row className="align-items-center">
                    <Col xs={3} md={2}>
                      <Image
                        src={article.urlToImage || '/placeholder-news.png'}
                        alt="Article"
                        rounded
                        fluid
                        style={{
                          height: "80px",
                          objectFit: "cover",
                          aspectRatio: "1:1"
                        }}
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjBmMGYwIi8+CjxwYXRoIGQ9Ik00MCA1MEM0NSA1MCA1MCA0NSA1MCA0MEM1MCAzNSA0NSAzMCA0MCAzMEM3NSAzMCAzMCAzNSAzMCA0MFMzNSA1MCA0MCA1MFoiIGZpbGw9IiNjY2MiLz4KPC9zdmc+';
                        }}
                      />
                    </Col>
                    <Col xs={9} md={10}>
                      <div>
                        <Badge 
                          bg={index < 3 ? "primary" : "info"} 
                          className="me-2 mb-1"
                        >
                          {index < 3 ? "MLB" : "Braves"}
                        </Badge>
                        <h6 className="news-title">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-decoration-none text-dark"
                          >
                            {article.title}
                          </a>
                        </h6>
                        <small className="text-muted">
                          {article.source?.name} • {new Date(article.publishedAt).toLocaleDateString()}
                        </small>
                      </div>
                    </Col>
                  </Row>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>

          {/* News Sections */}
          <Row className="g-3">
            <Col md={6}>
              <Card className="news-section">
                <Card.Header>
                  <h5 className="mb-0">⚾ MLB News</h5>
                </Card.Header>
                <Card.Body style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <ListGroup variant="flush">
                    {sortNewsByDate(newsData.mlb)
                      .slice(0, 8)
                      .map((item, index) => (
                        <ListGroup.Item key={`mlb-${index}`} className="border-0 px-0 py-2">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-decoration-none"
                          >
                            <h6 className="news-title-small mb-1">{item.title}</h6>
                            <small className="text-muted">
                              {item.source?.name} • {new Date(item.publishedAt).toLocaleDateString()}
                            </small>
                          </a>
                        </ListGroup.Item>
                      ))}
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="news-section">
                <Card.Header>
                  <h5 className="mb-0">🪓 Braves News</h5>
                </Card.Header>
                <Card.Body style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <ListGroup variant="flush">
                    {sortNewsByDate(newsData.braves)
                      .slice(0, 8)
                      .map((item, index) => (
                        <ListGroup.Item key={`braves-${index}`} className="border-0 px-0 py-2">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-decoration-none"
                          >
                            <h6 className="news-title-small mb-1">{item.title}</h6>
                            <small className="text-muted">
                              {item.source?.name} • {new Date(item.publishedAt).toLocaleDateString()}
                            </small>
                          </a>
                        </ListGroup.Item>
                      ))}
                  </ListGroup>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Col>

        <Col xs={12} lg={4}>
          {/* Quick Analytics Dashboard */}
          <Card className="mb-3">
            <Card.Header>
              <h5 className="mb-0">📊 Quick Analytics</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Link to="/TeamBatting" className="btn btn-outline-primary">
                  Team Batting Stats
                </Link>
                <Link to="/TeamPitching" className="btn btn-outline-success">
                  Team Pitching Stats
                </Link>
                <Link to="/PlayerBatting" className="btn btn-outline-info">
                  Player Batting
                </Link>
                <Link to="/PlayerPitching" className="btn btn-outline-warning">
                  Player Pitching
                </Link>
                <Link to="/AssistedAnalysis" className="btn btn-outline-secondary">
                  AI Analysis
                </Link>
              </div>
            </Card.Body>
          </Card>

          {/* Current Standings */}
          <Card>
            <Card.Header>
              <h5 className="mb-0">🏆 {new Date().getFullYear()} Standings</h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: "600px", overflowY: "auto" }}>
              {Object.keys(standings).length === 0 ? (
                <div className="text-center text-muted py-4">
                  <p>📊 Standings data not available for {new Date().getFullYear()}</p>
                  <p className="small">Standings will be available once the season begins</p>
                </div>
              ) : (
                Object.entries(standings).map(([division, divisionTeams]) => (
                <div key={division} className="mb-4">
                  <h6 className="text-primary mb-2">{division}</h6>
                  <Table size="sm" className="standings-table">
                    <thead>
                      <tr>
                        <th>Team</th>
                        <th>W-L</th>
                        <th>PCT</th>
                        <th>GB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {divisionTeams && Array.isArray(divisionTeams) && divisionTeams
                        .filter(team => team && team.Tm && typeof team.Tm === 'string')
                        .map((team, index) => (
                        <tr 
                          key={`${division}-${index}`}
                          className={team.Tm === "Atlanta Braves" ? "table-warning" : ""}
                        >
                          <td>
                            <Link 
                              to={`/team/${getTeamAbbreviation(team.Tm)}`}
                              className="text-decoration-none fw-bold"
                            >
                              {team.Tm}
                            </Link>
                          </td>
                          <td>{team.W || 0}-{team.L || 0}</td>
                          <td>{team.winPct || '---'}</td>
                          <td>{team.GB || '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default HomePage;
