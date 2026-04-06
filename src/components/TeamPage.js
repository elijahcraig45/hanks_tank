import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Alert, Card, Button, Spinner, Tab, Tabs } from 'react-bootstrap';
import apiService from '../services/api';
import { SEASONS } from '../config/constants';

const TeamPage = () => {
  const { teamAbbr } = useParams();
  const [teamBattingData, setTeamBattingData] = useState(null);
  const [teamPitchingData, setTeamPitchingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Team information mapping
  const teamInfo = {
    'ATL': { id: 144, name: 'Atlanta Braves', color: '#CE1141', city: 'Atlanta', founded: 1871 },
    'NYY': { id: 147, name: 'New York Yankees', color: '#132448', city: 'New York', founded: 1903 },
    'LAD': { id: 119, name: 'Los Angeles Dodgers', color: '#005A9C', city: 'Los Angeles', founded: 1883 },
    'HOU': { id: 117, name: 'Houston Astros', color: '#002D62', city: 'Houston', founded: 1962 },
    'TB':  { id: 139, name: 'Tampa Bay Rays', color: '#8FBCE6', city: 'Tampa Bay', founded: 1998 },
    'SF':  { id: 137, name: 'San Francisco Giants', color: '#FD5A1E', city: 'San Francisco', founded: 1883 },
    'TOR': { id: 141, name: 'Toronto Blue Jays', color: '#134A8E', city: 'Toronto', founded: 1977 },
    'SD':  { id: 135, name: 'San Diego Padres', color: '#2F241D', city: 'San Diego', founded: 1969 },
    'CHC': { id: 112, name: 'Chicago Cubs', color: '#0E3386', city: 'Chicago', founded: 1876 },
    'PHI': { id: 143, name: 'Philadelphia Phillies', color: '#E81828', city: 'Philadelphia', founded: 1883 },
    'BOS': { id: 111, name: 'Boston Red Sox', color: '#BD3039', city: 'Boston', founded: 1901 },
    'WSN': { id: 120, name: 'Washington Nationals', color: '#AB0003', city: 'Washington', founded: 1969 },
    'MIA': { id: 146, name: 'Miami Marlins', color: '#00A3E0', city: 'Miami', founded: 1993 },
    'MIL': { id: 158, name: 'Milwaukee Brewers', color: '#FFC52F', city: 'Milwaukee', founded: 1969 },
    'STL': { id: 138, name: 'St. Louis Cardinals', color: '#C41E3A', city: 'St. Louis', founded: 1882 },
    'CIN': { id: 113, name: 'Cincinnati Reds', color: '#C6011F', city: 'Cincinnati', founded: 1881 },
    'PIT': { id: 134, name: 'Pittsburgh Pirates', color: '#FDB827', city: 'Pittsburgh', founded: 1881 },
    'TEX': { id: 140, name: 'Texas Rangers', color: '#C0111F', city: 'Arlington', founded: 1961 },
    'LAA': { id: 108, name: 'Los Angeles Angels', color: '#BA0021', city: 'Anaheim', founded: 1961 },
    'OAK': { id: 133, name: 'Oakland Athletics', color: '#003831', city: 'Oakland', founded: 1901 },
    'SEA': { id: 136, name: 'Seattle Mariners', color: '#0C2C56', city: 'Seattle', founded: 1977 },
    'MIN': { id: 142, name: 'Minnesota Twins', color: '#002B5C', city: 'Minneapolis', founded: 1901 },
    'CWS': { id: 145, name: 'Chicago White Sox', color: '#27251F', city: 'Chicago', founded: 1901 },
    'DET': { id: 116, name: 'Detroit Tigers', color: '#0C2340', city: 'Detroit', founded: 1901 },
    'KC':  { id: 118, name: 'Kansas City Royals', color: '#004687', city: 'Kansas City', founded: 1969 },
    'CLE': { id: 114, name: 'Cleveland Guardians', color: '#E31937', city: 'Cleveland', founded: 1901 },
    'BAL': { id: 110, name: 'Baltimore Orioles', color: '#DF4601', city: 'Baltimore', founded: 1901 },
    'COL': { id: 115, name: 'Colorado Rockies', color: '#333366', city: 'Denver', founded: 1993 },
    'ARI': { id: 109, name: 'Arizona Diamondbacks', color: '#A71930', city: 'Phoenix', founded: 1998 },
    'NYM': { id: 121, name: 'New York Mets', color: '#FF5910', city: 'New York', founded: 1962 }
  };

  useEffect(() => {
    const fetchTeamData = async () => {
      if (!teamAbbr) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch both batting and pitching data for the team
        const [battingData, pitchingData] = await Promise.all([
          apiService.getTeamBatting(SEASONS.CURRENT, { limit: 30 }),
          apiService.getTeamPitching(SEASONS.CURRENT, { limit: 30 })
        ]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="d-flex align-items-center gap-3 mb-3">
            {team?.id && (
              <img
                src={`https://www.mlbstatic.com/team-logos/${team.id}.svg`}
                alt={team.name}
                style={{ width: 72, height: 72, objectFit: 'contain' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            )}
            <div>
              <h1 className="display-6 mb-1 fw-bold">{team?.name || `${teamAbbr} Team`}</h1>
              <p className="text-muted mb-0">
                {team?.city} • Est. {team?.founded} • {SEASONS.CURRENT} Season Stats
              </p>
            </div>
          </div>
        </Col>
      </Row>

      <Tabs defaultActiveKey="batting" className="mb-4">
        <Tab eventKey="batting" title="🏏 Batting Stats">
          {teamBattingData ? (
            <>
              <Row className="g-3 mb-3">
                {[
                  { label: 'AVG', value: teamBattingData.AVG },
                  { label: 'OBP', value: teamBattingData.OBP },
                  { label: 'SLG', value: teamBattingData.SLG },
                  { label: 'OPS', value: teamBattingData.OPS },
                ].map(s => (
                  <Col xs={6} md={3} key={s.label}>
                    <Card className="text-center h-100 border-0 shadow-sm">
                      <Card.Body className="py-3">
                        <div className="fs-4 fw-bold" style={{ color: team?.color || '#007bff' }}>{s.value ?? '—'}</div>
                        <div className="text-muted small">{s.label}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              <Row className="g-3">
                {[
                  { label: 'Games', value: teamBattingData.G },
                  { label: 'At Bats', value: teamBattingData.AB },
                  { label: 'Runs', value: teamBattingData.R },
                  { label: 'Hits', value: teamBattingData.H },
                  { label: 'Doubles', value: teamBattingData['2B'] },
                  { label: 'Triples', value: teamBattingData['3B'] },
                  { label: 'Home Runs', value: teamBattingData.HR },
                  { label: 'RBIs', value: teamBattingData.RBI },
                  { label: 'Stolen Bases', value: teamBattingData.SB },
                  { label: 'Walks', value: teamBattingData.BB },
                  { label: 'Strikeouts', value: teamBattingData.SO },
                  { label: 'Total Bases', value: teamBattingData.TB },
                ].map(s => (
                  <Col xs={6} md={3} lg={2} key={s.label}>
                    <Card className="text-center h-100 border-0 bg-light">
                      <Card.Body className="py-2">
                        <div className="fw-semibold">{s.value ?? '—'}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{s.label}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          ) : (
            <Alert variant="warning">No batting data available for this team.</Alert>
          )}
        </Tab>

        <Tab eventKey="pitching" title="⚾ Pitching Stats">
          {teamPitchingData ? (
            <>
              <Row className="g-3 mb-3">
                {[
                  { label: 'ERA', value: teamPitchingData.ERA },
                  { label: 'WHIP', value: teamPitchingData.WHIP },
                  { label: 'W-L%', value: teamPitchingData['W-L%'] },
                  { label: 'IP', value: teamPitchingData.IP },
                ].map(s => (
                  <Col xs={6} md={3} key={s.label}>
                    <Card className="text-center h-100 border-0 shadow-sm">
                      <Card.Body className="py-3">
                        <div className="fs-4 fw-bold" style={{ color: team?.color || '#007bff' }}>{s.value ?? '—'}</div>
                        <div className="text-muted small">{s.label}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
              <Row className="g-3">
                {[
                  { label: 'Games', value: teamPitchingData.G },
                  { label: 'GS', value: teamPitchingData.GS },
                  { label: 'Wins', value: teamPitchingData.W },
                  { label: 'Losses', value: teamPitchingData.L },
                  { label: 'Saves', value: teamPitchingData.SV },
                  { label: 'Strikeouts', value: teamPitchingData.SO },
                  { label: 'Walks', value: teamPitchingData.BB },
                  { label: 'HR Allowed', value: teamPitchingData.HR },
                  { label: 'Hits Allowed', value: teamPitchingData.H },
                  { label: 'Earned Runs', value: teamPitchingData.ER },
                  { label: 'CG', value: teamPitchingData.CG },
                  { label: 'SHO', value: teamPitchingData.SHO },
                ].map(s => (
                  <Col xs={6} md={3} lg={2} key={s.label}>
                    <Card className="text-center h-100 border-0 bg-light">
                      <Card.Body className="py-2">
                        <div className="fw-semibold">{s.value ?? '—'}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{s.label}</div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </>
          ) : (
            <Alert variant="warning">No pitching data available for this team.</Alert>
          )}
        </Tab>
      </Tabs>

      <Row className="mt-4">
        <Col className="d-flex gap-3 justify-content-center">
          <Button as={Link} to="/TeamBatting" variant="primary">
            View All Team Batting Stats
          </Button>
          <Button as={Link} to="/TeamPitching" variant="outline-primary">
            View All Team Pitching Stats
          </Button>
          <Button as={Link} to="/PlayerBatting" variant="outline-secondary">
            View Player Stats
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default TeamPage;
