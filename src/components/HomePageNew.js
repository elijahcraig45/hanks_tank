import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  ListGroup,
  Badge,
  Table,
  Spinner,
  Alert,
  Button
} from "react-bootstrap";
import { Link } from "react-router-dom";
import apiService from '../services/api';
import { SEASONS } from '../config/constants';
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
      await apiService.refreshNews();
      // Refetch news data
      await fetchNewsData();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error refreshing news:', error);
      setError('Failed to refresh news');
    } finally {
      setNewsLoading(false);
    }
  };

  const fetchNewsData = async () => {
    try {
      const [mlbData, bravesData] = await Promise.allSettled([
        apiService.getMLBNews(),
        apiService.getBravesNews()
      ]);

      setNewsData({
        mlb: mlbData.status === 'fulfilled' ? (mlbData.value?.articles || []) : [],
        braves: bravesData.status === 'fulfilled' ? (bravesData.value?.articles || []) : []
      });
    } catch (error) {
      console.error('Error fetching news:', error);
      // Non-fatal error, just log it
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch all data concurrently
        const [newsResult, standingsResult] = await Promise.allSettled([
          fetchNewsData(),
          apiService.getStandings(SEASONS.CURRENT)
        ]);

        // Handle standings data
        if (standingsResult.status === 'fulfilled' && standingsResult.value) {
          const rawStandings = standingsResult.value;
          
          // Check if we have actual standings data
          if (rawStandings && rawStandings.records && rawStandings.records.length > 0) {
            const processedStandings = formatStandingsData(rawStandings.records);
            setStandings(processedStandings);
          } else {
            console.log('No standings data available for current year');
            setStandings({});
          }
        } else {
          console.log('Failed to fetch standings data');
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
    const teamMap = {
      "Atlanta Braves": "ATL",
      "Miami Marlins": "MIA",
      "New York Mets": "NYM",
      "Philadelphia Phillies": "PHI",
      "Washington Nationals": "WSH",
      "Chicago Cubs": "CHC",
      "Cincinnati Reds": "CIN",
      "Milwaukee Brewers": "MIL",
      "Pittsburgh Pirates": "PIT",
      "St. Louis Cardinals": "STL",
      "Arizona Diamondbacks": "ARI",
      "Colorado Rockies": "COL",
      "Los Angeles Dodgers": "LAD",
      "San Diego Padres": "SD",
      "San Francisco Giants": "SF",
      "Baltimore Orioles": "BAL",
      "Boston Red Sox": "BOS",
      "New York Yankees": "NYY",
      "Tampa Bay Rays": "TB",
      "Toronto Blue Jays": "TOR",
      "Chicago White Sox": "CWS",
      "Cleveland Guardians": "CLE",
      "Detroit Tigers": "DET",
      "Kansas City Royals": "KC",
      "Minnesota Twins": "MIN",
      "Houston Astros": "HOU",
      "Los Angeles Angels": "LAA",
      "Oakland Athletics": "OAK",
      "Seattle Mariners": "SEA",
      "Texas Rangers": "TEX"
    };
    return teamMap[teamName] || teamName.substring(0, 3).toUpperCase();
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary" size="lg" />
          <p className="mt-3 text-muted">Loading Hank's Tank...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid="lg" className="py-4">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <Alert.Heading>Error</Alert.Heading>
          {error}
        </Alert>
      )}
      
      {/* Header Section */}
      <Row className="mb-4">
        <Col>
          <div className="text-center">
            <h1 className="display-4 fw-bold">⚾ Hank's Tank</h1>
            <p className="lead text-muted">Your Ultimate MLB Analytics Dashboard - {SEASONS.CURRENT} Season</p>
            {lastUpdated && (
              <small className="text-muted">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </small>
            )}
          </div>
        </Col>
      </Row>

      {/* Quick Links */}
      <Row className="mb-4 g-3">
        <Col xs={6} md={3}>
          <Card className="h-100 text-center hover-shadow" as={Link} to="/TeamBatting" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <Card.Body>
              <h3>🏏</h3>
              <h6 className="text-dark">Team Batting</h6>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="h-100 text-center hover-shadow" as={Link} to="/TeamPitching" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <Card.Body>
              <h3>⚡</h3>
              <h6 className="text-dark">Team Pitching</h6>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="h-100 text-center hover-shadow" as={Link} to="/PlayerBatting" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <Card.Body>
              <h3>👤</h3>
              <h6 className="text-dark">Player Batting</h6>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} md={3}>
          <Card className="h-100 text-center hover-shadow" as={Link} to="/games" style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <Card.Body>
              <h3>🎯</h3>
              <h6 className="text-dark">Today's Games</h6>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col xs={12} lg={8}>
          {/* Hero News Section */}
          <Card className="mb-4 shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center bg-primary text-white">
              <h5 className="mb-0">🔥 Latest MLB News</h5>
              <Button 
                variant="light" 
                size="sm" 
                onClick={refreshNews}
                disabled={newsLoading}
              >
                {newsLoading ? <Spinner animation="border" size="sm" /> : "Refresh"}
              </Button>
            </Card.Header>
            <ListGroup variant="flush">
              {sortNewsByDate([...newsData.mlb, ...newsData.braves])
                .slice(0, 8)
                .map((article, index) => (
                <ListGroup.Item key={`news-${index}`} action href={article.url} target="_blank" className="py-3">
                  <div className="d-flex align-items-start">
                    {article.urlToImage && (
                      <img 
                        src={article.urlToImage} 
                        alt={article.title}
                        className="me-3 rounded"
                        style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div className="flex-grow-1">
                      <h6 className="mb-1">{article.title}</h6>
                      <small className="text-muted">
                        {article.source?.name} • {new Date(article.publishedAt).toLocaleDateString()}
                      </small>
                      {article.description && (
                        <p className="mb-0 mt-2 text-muted small">{article.description.slice(0, 150)}...</p>
                      )}
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card>
        </Col>

        {/* Standings Sidebar */}
        <Col xs={12} lg={4}>
          <Card className="shadow-sm">
            <Card.Header className="bg-success text-white">
              <h5 className="mb-0">📊 Standings - {SEASONS.CURRENT}</h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {Object.keys(standings).length === 0 ? (
                <Alert variant="info" className="mb-0">
                  <small>Standings will be available once the {SEASONS.CURRENT} season begins.</small>
                </Alert>
              ) : (
                Object.entries(standings).map(([division, teams]) => (
                  <div key={division} className="mb-4">
                    <h6 className="fw-bold text-primary border-bottom pb-2">{division}</h6>
                    <Table size="sm" className="mb-0" hover>
                      <thead>
                        <tr>
                          <th style={{ fontSize: '0.85rem' }}>Team</th>
                          <th className="text-center" style={{ fontSize: '0.85rem' }}>W</th>
                          <th className="text-center" style={{ fontSize: '0.85rem' }}>L</th>
                          <th className="text-center" style={{ fontSize: '0.85rem' }}>PCT</th>
                          <th className="text-center" style={{ fontSize: '0.85rem' }}>GB</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((team, idx) => (
                          <tr key={idx}>
                            <td>
                              <Link 
                                to={`/team/${getTeamAbbreviation(team.Tm)}`} 
                                className="text-decoration-none text-dark fw-semibold"
                              >
                                {getTeamAbbreviation(team.Tm)}
                              </Link>
                            </td>
                            <td className="text-center">{team.W}</td>
                            <td className="text-center">{team.L}</td>
                            <td className="text-center">{team.winPct}</td>
                            <td className="text-center">{team.GB}</td>
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

      {/* Footer Info */}
      <Row className="mt-5">
        <Col className="text-center">
          <small className="text-muted">
            Powered by MLB Stats API • FanGraphs • Baseball Savant | 
            {' '}Data coverage: {SEASONS.MIN} - {SEASONS.MAX}
          </small>
        </Col>
      </Row>
    </Container>
  );
}

export default HomePage;
