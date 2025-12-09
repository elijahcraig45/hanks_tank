import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Table,
  Spinner,
  Alert,
  Badge
} from 'react-bootstrap';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import apiService from '../services/api';
import { SEASONS, AVAILABLE_SEASONS } from '../config/constants';
import './styles/SeasonComparison.css';

const SeasonComparison = () => {
  const [selectedSeasons, setSelectedSeasons] = useState([
    SEASONS.CURRENT.toString(),
    (SEASONS.CURRENT - 1).toString()
  ]);
  const [comparisonType, setComparisonType] = useState('team-batting');
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStat, setSelectedStat] = useState('AVG');
  const [selectedTeam, setSelectedTeam] = useState('ALL');

  const comparisonTypes = [
    { value: 'team-batting', label: 'Team Batting' },
    { value: 'team-pitching', label: 'Team Pitching' },
    { value: 'league-batting', label: 'League Batting Averages' },
    { value: 'league-pitching', label: 'League Pitching Averages' }
  ];

  const battingStats = ['AVG', 'OBP', 'SLG', 'OPS', 'HR', 'RBI', 'R', 'SB', 'BB', 'SO'];
  const pitchingStats = ['ERA', 'WHIP', 'SO', 'BB', 'W', 'L', 'SV', 'IP'];

  const availableStats = comparisonType.includes('batting') ? battingStats : pitchingStats;

  const toggleSeason = (season) => {
    setSelectedSeasons(prev => {
      if (prev.includes(season)) {
        return prev.filter(s => s !== season);
      } else if (prev.length < 5) {
        return [...prev, season].sort((a, b) => b - a);
      }
      return prev;
    });
  };

  const fetchComparisonData = async () => {
    if (selectedSeasons.length === 0) {
      setError('Please select at least one season');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const promises = selectedSeasons.map(async (season) => {
        const year = parseInt(season);
        let data;

        switch (comparisonType) {
          case 'team-batting':
            data = await apiService.getTeamBatting(year);
            break;
          case 'team-pitching':
            data = await apiService.getTeamPitching(year);
            break;
          case 'league-batting':
            data = await apiService.getTeamBatting(year);
            break;
          case 'league-pitching':
            data = await apiService.getTeamPitching(year);
            break;
          default:
            data = [];
        }

        return { season, data };
      });

      const results = await Promise.all(promises);
      
      // For league comparisons, calculate averages
      if (comparisonType.startsWith('league-')) {
        const processedResults = results.map(({ season, data }) => {
          if (!Array.isArray(data) || data.length === 0) return { season, stats: {} };

          const stats = {};
          availableStats.forEach(stat => {
            const values = data.map(team => parseFloat(team[stat])).filter(v => !isNaN(v));
            stats[stat] = values.length > 0 
              ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(3)
              : 0;
          });

          return { season, stats };
        });

        setComparisonData(processedResults);
      } else {
        setComparisonData(results);
      }
    } catch (err) {
      console.error('Error fetching comparison data:', err);
      setError(err.message || 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchComparisonData();
  }, [selectedSeasons, comparisonType]);

  const renderLeagueComparison = () => {
    if (comparisonData.length === 0) return null;

    const chartData = availableStats.map(stat => {
      const dataPoint = { stat };
      comparisonData.forEach(({ season, stats }) => {
        dataPoint[season] = parseFloat(stats[stat]) || 0;
      });
      return dataPoint;
    });

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a4de6c'];

    return (
      <Card className="mt-4">
        <Card.Header>
          <h5>League Average Comparison</h5>
        </Card.Header>
        <Card.Body>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stat" />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedSeasons.map((season, idx) => (
                <Bar 
                  key={season} 
                  dataKey={season} 
                  fill={colors[idx % colors.length]}
                  name={`${season} Season`}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          <Table striped bordered hover className="mt-4">
            <thead>
              <tr>
                <th>Stat</th>
                {selectedSeasons.map(season => (
                  <th key={season}>{season}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {availableStats.map(stat => (
                <tr key={stat}>
                  <td><strong>{stat}</strong></td>
                  {comparisonData.map(({ season, stats }) => (
                    <td key={season}>{stats[stat]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    );
  };

  const renderTeamComparison = () => {
    if (comparisonData.length === 0) return null;

    // Get all unique teams across all seasons
    const allTeams = new Set();
    comparisonData.forEach(({ data }) => {
      if (Array.isArray(data)) {
        data.forEach(team => allTeams.add(team.Team));
      }
    });

    const teamsArray = selectedTeam === 'ALL' 
      ? Array.from(allTeams).sort()
      : [selectedTeam];

    const allTeamsForFilter = Array.from(allTeams).sort();

    return (
      <Card className="mt-4">
        <Card.Header>
          <h5>Team {comparisonType.includes('batting') ? 'Batting' : 'Pitching'} Comparison</h5>
          <Row className="mt-2">
            <Col md={4}>
              <Form.Label>Statistic</Form.Label>
              <Form.Select 
                value={selectedStat} 
                onChange={(e) => setSelectedStat(e.target.value)}
              >
                {availableStats.map(stat => (
                  <option key={stat} value={stat}>{stat}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Label>Filter by Team</Form.Label>
              <Form.Select 
                value={selectedTeam} 
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="ALL">All Teams</option>
                {allTeamsForFilter.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          <div style={{ overflowX: 'auto' }}>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Team</th>
                  {[...selectedSeasons].sort().map(season => (
                    <th key={season}>{season}</th>
                  ))}
                  <th>Change ({Math.min(...selectedSeasons)} → {Math.max(...selectedSeasons)})</th>
                </tr>
              </thead>
              <tbody>
                {teamsArray.map(teamAbbr => {
                  const sortedSeasons = [...selectedSeasons].sort();
                  const teamStats = sortedSeasons.map(season => {
                    const seasonData = comparisonData.find(d => d.season === season);
                    if (!seasonData || !Array.isArray(seasonData.data)) return null;
                    const teamData = seasonData.data.find(t => t.Team === teamAbbr);
                    return teamData ? parseFloat(teamData[selectedStat]) : null;
                  });

                  const validStats = teamStats.filter(s => s !== null);
                  if (validStats.length === 0) return null;

                  const change = validStats.length >= 2 
                    ? (validStats[validStats.length - 1] - validStats[0]).toFixed(3)
                    : 'N/A';

                  const changeColor = change !== 'N/A' 
                    ? (parseFloat(change) > 0 ? 'success' : parseFloat(change) < 0 ? 'danger' : 'secondary')
                    : 'secondary';

                  return (
                    <tr key={teamAbbr}>
                      <td><strong>{teamAbbr}</strong></td>
                      {teamStats.map((stat, idx) => (
                        <td key={idx}>{stat !== null ? stat.toFixed(3) : '--'}</td>
                      ))}
                      <td>
                        <Badge bg={changeColor}>
                          {change !== 'N/A' ? (parseFloat(change) > 0 ? '+' : '') + change : change}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    );
  };

  return (
    <Container className="season-comparison py-4">
      <h2 className="mb-4">Season Comparison Tool</h2>

      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header>
              <h5>Configuration</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label><strong>Comparison Type</strong></Form.Label>
                <Form.Select 
                  value={comparisonType} 
                  onChange={(e) => setComparisonType(e.target.value)}
                >
                  {comparisonTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group>
                <Form.Label><strong>Select Seasons (up to 5)</strong></Form.Label>
                <div className="season-selector">
                  {AVAILABLE_SEASONS.map(season => (
                    <Form.Check
                      key={season}
                      type="checkbox"
                      id={`season-${season}`}
                      label={season}
                      checked={selectedSeasons.includes(season.toString())}
                      onChange={() => toggleSeason(season.toString())}
                      inline
                      disabled={!selectedSeasons.includes(season.toString()) && selectedSeasons.length >= 5}
                    />
                  ))}
                </div>
              </Form.Group>

              <Button 
                variant="primary" 
                onClick={fetchComparisonData}
                disabled={loading || selectedSeasons.length === 0}
                className="mt-3"
              >
                {loading ? <Spinner animation="border" size="sm" /> : 'Update Comparison'}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && (
        <div className="text-center my-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading comparison data...</p>
        </div>
      )}

      {!loading && comparisonData.length > 0 && (
        comparisonType.startsWith('league-') ? renderLeagueComparison() : renderTeamComparison()
      )}
    </Container>
  );
};

export default SeasonComparison;
