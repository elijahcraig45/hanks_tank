import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Alert, Card, Badge, Button, Table, Spinner, Tab, Tabs } from 'react-bootstrap';

const TeamPage = () => {
  const { teamAbbr } = useParams();
  const [teamBattingData, setTeamBattingData] = useState(null);
  const [teamPitchingData, setTeamPitchingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Team information mapping
  const teamInfo = {
    'ATL': { name: 'Atlanta Braves', color: '#CE1141', city: 'Atlanta', founded: 1871 },
    'NYY': { name: 'New York Yankees', color: '#132448', city: 'New York', founded: 1903 },
    'LAD': { name: 'Los Angeles Dodgers', color: '#005A9C', city: 'Los Angeles', founded: 1883 },
    'HOU': { name: 'Houston Astros', color: '#002D62', city: 'Houston', founded: 1962 },
    'TB': { name: 'Tampa Bay Rays', color: '#8FBCE6', city: 'Tampa Bay', founded: 1998 },
    'SF': { name: 'San Francisco Giants', color: '#FD5A1E', city: 'San Francisco', founded: 1883 },
    'TOR': { name: 'Toronto Blue Jays', color: '#134A8E', city: 'Toronto', founded: 1977 },
    'SD': { name: 'San Diego Padres', color: '#2F241D', city: 'San Diego', founded: 1969 },
    'CHC': { name: 'Chicago Cubs', color: '#0E3386', city: 'Chicago', founded: 1876 },
    'PHI': { name: 'Philadelphia Phillies', color: '#E81828', city: 'Philadelphia', founded: 1883 },
    'BOS': { name: 'Boston Red Sox', color: '#BD3039', city: 'Boston', founded: 1901 },
    'WSN': { name: 'Washington Nationals', color: '#AB0003', city: 'Washington', founded: 1969 },
    'MIA': { name: 'Miami Marlins', color: '#00A3E0', city: 'Miami', founded: 1993 },
    'MIL': { name: 'Milwaukee Brewers', color: '#FFC52F', city: 'Milwaukee', founded: 1969 },
    'STL': { name: 'St. Louis Cardinals', color: '#C41E3A', city: 'St. Louis', founded: 1882 },
    'CIN': { name: 'Cincinnati Reds', color: '#C6011F', city: 'Cincinnati', founded: 1881 },
    'PIT': { name: 'Pittsburgh Pirates', color: '#FDB827', city: 'Pittsburgh', founded: 1881 },
    'TEX': { name: 'Texas Rangers', color: '#C0111F', city: 'Arlington', founded: 1961 },
    'LAA': { name: 'Los Angeles Angels', color: '#BA0021', city: 'Anaheim', founded: 1961 },
    'OAK': { name: 'Oakland Athletics', color: '#003831', city: 'Oakland', founded: 1901 },
    'SEA': { name: 'Seattle Mariners', color: '#0C2C56', city: 'Seattle', founded: 1977 },
    'MIN': { name: 'Minnesota Twins', color: '#002B5C', city: 'Minneapolis', founded: 1901 },
    'CWS': { name: 'Chicago White Sox', color: '#27251F', city: 'Chicago', founded: 1901 },
    'DET': { name: 'Detroit Tigers', color: '#0C2340', city: 'Detroit', founded: 1901 },
    'KC': { name: 'Kansas City Royals', color: '#004687', city: 'Kansas City', founded: 1969 },
    'CLE': { name: 'Cleveland Guardians', color: '#E31937', city: 'Cleveland', founded: 1901 },
    'BAL': { name: 'Baltimore Orioles', color: '#DF4601', city: 'Baltimore', founded: 1901 },
    'COL': { name: 'Colorado Rockies', color: '#333366', city: 'Denver', founded: 1993 },
    'ARI': { name: 'Arizona Diamondbacks', color: '#A71930', city: 'Phoenix', founded: 1998 },
    'NYM': { name: 'New York Mets', color: '#FF5910', city: 'New York', founded: 1962 }
  };

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!teamAbbr) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch both batting and pitching data for the team
        const [battingResponse, pitchingResponse] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/team-batting?year=2024&limit=30`),
          fetch(`${process.env.REACT_APP_API_URL}/team-pitching?year=2024&limit=30`)
        ]);

        if (!battingResponse.ok || !pitchingResponse.ok) {
          throw new Error('Failed to fetch team data');
        }

        const battingData = await battingResponse.json();
        const pitchingData = await pitchingResponse.json();

        // Find the specific team data
        const teamBatting = battingData.find(team => 
          team.Team?.toUpperCase().includes(teamAbbr.toUpperCase()) ||
          getTeamAbbreviation(team.Team) === teamAbbr.toUpperCase()
        );
        
        const teamPitching = pitchingData.find(team => 
          team.Team?.toUpperCase().includes(teamAbbr.toUpperCase()) ||
          getTeamAbbreviation(team.Team) === teamAbbr.toUpperCase()
        );

        setTeamBattingData(teamBatting);
        setTeamPitchingData(teamPitching);

        if (!teamBatting && !teamPitching) {
          setError(`No data found for team: ${teamAbbr}`);
        }

      } catch (error) {
        console.error('Error fetching team data:', error);
        setError(`Failed to load data for ${teamAbbr}: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [teamAbbr]);

  // Helper function to get team abbreviation from full name
  const getTeamAbbreviation = (teamName) => {
    const abbrevMap = {
      'Atlanta Braves': 'ATL',
      'New York Yankees': 'NYY',
      'Los Angeles Dodgers': 'LAD',
      'Houston Astros': 'HOU',
      'Tampa Bay Rays': 'TB',
      'San Francisco Giants': 'SF',
      'Toronto Blue Jays': 'TOR',
      'San Diego Padres': 'SD',
      'Chicago Cubs': 'CHC',
      'Philadelphia Phillies': 'PHI',
      'Boston Red Sox': 'BOS',
      'Washington Nationals': 'WSN',
      'Miami Marlins': 'MIA',
      'Milwaukee Brewers': 'MIL',
      'St. Louis Cardinals': 'STL',
      'Cincinnati Reds': 'CIN',
      'Pittsburgh Pirates': 'PIT',
      'Texas Rangers': 'TEX',
      'Los Angeles Angels': 'LAA',
      'Oakland Athletics': 'OAK',
      'Seattle Mariners': 'SEA',
      'Minnesota Twins': 'MIN',
      'Chicago White Sox': 'CWS',
      'Detroit Tigers': 'DET',
      'Kansas City Royals': 'KC',
      'Cleveland Guardians': 'CLE',
      'Baltimore Orioles': 'BAL',
      'Colorado Rockies': 'COL',
      'Arizona Diamondbacks': 'ARI',
      'New York Mets': 'NYM'
    };
    return abbrevMap[teamName] || teamAbbr?.toUpperCase();
  };

  const team = teamInfo[teamAbbr?.toUpperCase()];

  if (loading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" role="status" />
        <p className="mt-2">Loading team data...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Team Data</Alert.Heading>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center mb-3">
            <Badge 
              bg="primary" 
              className="me-3 fs-4 p-3"
              style={{ backgroundColor: team?.color || '#007bff' }}
            >
              {teamAbbr?.toUpperCase()}
            </Badge>
            <div>
              <h1 className="display-6 mb-0">{team?.name || `${teamAbbr} Team`}</h1>
              <p className="text-muted mb-0">
                {team?.city} • Founded {team?.founded} • 2024 Season Stats
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <Tabs defaultActiveKey="batting" className="mb-4">
        <Tab eventKey="batting" title="🏏 Batting Stats">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Team Batting Statistics</h5>
            </Card.Header>
            <Card.Body>
              {teamBattingData ? (
                <Table responsive striped>
                  <tbody>
                    <tr><td><strong>Games Played</strong></td><td>{teamBattingData.G}</td></tr>
                    <tr><td><strong>At Bats</strong></td><td>{teamBattingData.AB}</td></tr>
                    <tr><td><strong>Runs</strong></td><td>{teamBattingData.R}</td></tr>
                    <tr><td><strong>Hits</strong></td><td>{teamBattingData.H}</td></tr>
                    <tr><td><strong>Doubles</strong></td><td>{teamBattingData['2B']}</td></tr>
                    <tr><td><strong>Triples</strong></td><td>{teamBattingData['3B']}</td></tr>
                    <tr><td><strong>Home Runs</strong></td><td>{teamBattingData.HR}</td></tr>
                    <tr><td><strong>RBIs</strong></td><td>{teamBattingData.RBI}</td></tr>
                    <tr><td><strong>Stolen Bases</strong></td><td>{teamBattingData.SB}</td></tr>
                    <tr><td><strong>Walks</strong></td><td>{teamBattingData.BB}</td></tr>
                    <tr><td><strong>Strikeouts</strong></td><td>{teamBattingData.SO}</td></tr>
                    <tr><td><strong>Batting Average</strong></td><td>{teamBattingData.AVG}</td></tr>
                    <tr><td><strong>On-Base %</strong></td><td>{teamBattingData.OBP}</td></tr>
                    <tr><td><strong>Slugging %</strong></td><td>{teamBattingData.SLG}</td></tr>
                    <tr><td><strong>OPS</strong></td><td>{teamBattingData.OPS}</td></tr>
                  </tbody>
                </Table>
              ) : (
                <Alert variant="warning">No batting data available for this team.</Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="pitching" title="⚾ Pitching Stats">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Team Pitching Statistics</h5>
            </Card.Header>
            <Card.Body>
              {teamPitchingData ? (
                <Table responsive striped>
                  <tbody>
                    <tr><td><strong>Games</strong></td><td>{teamPitchingData.G}</td></tr>
                    <tr><td><strong>Games Started</strong></td><td>{teamPitchingData.GS}</td></tr>
                    <tr><td><strong>Wins</strong></td><td>{teamPitchingData.W}</td></tr>
                    <tr><td><strong>Losses</strong></td><td>{teamPitchingData.L}</td></tr>
                    <tr><td><strong>Win %</strong></td><td>{teamPitchingData['W-L%']}</td></tr>
                    <tr><td><strong>ERA</strong></td><td>{teamPitchingData.ERA}</td></tr>
                    <tr><td><strong>Innings Pitched</strong></td><td>{teamPitchingData.IP}</td></tr>
                    <tr><td><strong>Hits Allowed</strong></td><td>{teamPitchingData.H}</td></tr>
                    <tr><td><strong>Runs Allowed</strong></td><td>{teamPitchingData.R}</td></tr>
                    <tr><td><strong>Earned Runs</strong></td><td>{teamPitchingData.ER}</td></tr>
                    <tr><td><strong>Home Runs Allowed</strong></td><td>{teamPitchingData.HR}</td></tr>
                    <tr><td><strong>Walks</strong></td><td>{teamPitchingData.BB}</td></tr>
                    <tr><td><strong>Strikeouts</strong></td><td>{teamPitchingData.SO}</td></tr>
                    <tr><td><strong>WHIP</strong></td><td>{teamPitchingData.WHIP}</td></tr>
                    <tr><td><strong>Saves</strong></td><td>{teamPitchingData.SV}</td></tr>
                    <tr><td><strong>Complete Games</strong></td><td>{teamPitchingData.CG}</td></tr>
                    <tr><td><strong>Shutouts</strong></td><td>{teamPitchingData.SHO}</td></tr>
                  </tbody>
                </Table>
              ) : (
                <Alert variant="warning">No pitching data available for this team.</Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Row className="mt-4">
        <Col className="d-flex gap-3 justify-content-center">
          <Button as={Link} to="/teams/batting" variant="primary">
            View All Team Batting Stats
          </Button>
          <Button as={Link} to="/teams/pitching" variant="outline-primary">
            View All Team Pitching Stats
          </Button>
          <Button as={Link} to="/players/batting" variant="outline-secondary">
            View Player Stats
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default TeamPage;
