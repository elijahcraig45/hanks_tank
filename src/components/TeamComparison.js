import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Table,
  Spinner,
  Alert,
  Badge,
  InputGroup
} from 'react-bootstrap';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import apiService from '../services/api';
import { SEASONS } from '../config/constants';
import './styles/TeamComparison.css';

const TeamComparison = () => {
  const [selectedYear, setSelectedYear] = useState(SEASONS.CURRENT.toString());
  const [statType, setStatType] = useState('batting');
  const [allTeams, setAllTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const battingStats = ['AVG', 'OBP', 'SLG', 'OPS', 'HR', 'RBI', 'R'];
  const pitchingStats = ['ERA', 'WHIP', 'SO', 'W', 'IP', 'H', 'BB'];
  const comparisonStats = statType === 'batting' ? battingStats : pitchingStats;

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a4de6c', '#8dd1e1'];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchTeams();
  }, [selectedYear, statType]);

  const fetchTeams = async () => {
    setLoading(true);
    setError(null);

    try {
      const year = parseInt(selectedYear);
      const data = statType === 'batting'
        ? await apiService.getTeamBatting(year)
        : await apiService.getTeamPitching(year);

      if (Array.isArray(data)) {
        setAllTeams(data);
      } else {
        setAllTeams([]);
        setError(`No ${statType} data available for ${selectedYear}`);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err.message || 'Failed to load team data');
      setAllTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const addTeam = (team) => {
    const teamId = team.Team;
    if (selectedTeams.length < 6 && !selectedTeams.find(t => t.Team === teamId)) {
      setSelectedTeams([...selectedTeams, team]);
    }
  };

  const removeTeam = (teamId) => {
    setSelectedTeams(selectedTeams.filter(t => t.Team !== teamId));
  };

  const filteredTeams = allTeams
    .filter(team => {
      if (!searchTerm) return false;
      const teamAbbr = team.Team?.toLowerCase() || '';
      const search = searchTerm.toLowerCase();
      return teamAbbr.includes(search);
    })
    .slice(0, 10);

  const normalizeValue = (value, stat) => {
    if (!allTeams.length) return 0;
    
    const values = allTeams
      .map(t => parseFloat(t[stat]))
      .filter(v => !isNaN(v));
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    if (range === 0) return 50;
    
    const normalized = ((parseFloat(value) - min) / range) * 100;
    return Math.round(normalized);
  };

  const getRadarData = () => {
    return comparisonStats.map(stat => {
      const dataPoint = { stat };
      selectedTeams.forEach((team, idx) => {
        dataPoint[`team${idx}`] = normalizeValue(team[stat], stat);
      });
      return dataPoint;
    });
  };

  const getBarData = () => {
    return comparisonStats.map(stat => {
      const dataPoint = { stat };
      selectedTeams.forEach((team) => {
        dataPoint[team.Team] = parseFloat(team[stat]) || 0;
      });
      return dataPoint;
    });
  };

  const getTeamColor = (teamAbbr) => {
    const teamColors = {
      'ATL': '#CE1141', 'NYY': '#132448', 'LAD': '#005A9C', 'HOU': '#002D62',
      'TB': '#8FBCE6', 'SF': '#FD5A1E', 'TOR': '#134A8E', 'SD': '#2F241D',
      'CHC': '#0E3386', 'PHI': '#E81828', 'BOS': '#BD3039', 'WSN': '#AB0003',
      'MIA': '#00A3E0', 'MIL': '#FFC52F', 'STL': '#C41E3A', 'CIN': '#C6011F',
      'PIT': '#FDB827', 'TEX': '#C0111F', 'LAA': '#BA0021', 'OAK': '#003831',
      'SEA': '#0C2C56', 'MIN': '#002B5C', 'CWS': '#27251F', 'DET': '#0C2340',
      'KC': '#004687', 'CLE': '#E31937', 'BAL': '#DF4601', 'COL': '#333366',
      'ARI': '#A71930', 'NYM': '#FF5910'
    };
    return teamColors[teamAbbr] || colors[0];
  };

  return (
    <Container className="team-comparison py-4">
      <h2 className="mb-4">Team Comparison Tool</h2>

      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header>
              <h5>Search & Select Teams (up to 6)</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Label>Season</Form.Label>
                  <Form.Select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    {[...Array(SEASONS.CURRENT - SEASONS.MIN + 1)].map((_, i) => {
                      const year = SEASONS.CURRENT - i;
                      return <option key={year} value={year}>{year}</option>;
                    })}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label>Statistics Type</Form.Label>
                  <Form.Select
                    value={statType}
                    onChange={(e) => {
                      setStatType(e.target.value);
                      setSelectedTeams([]);
                    }}
                  >
                    <option value="batting">Batting</option>
                    <option value="pitching">Pitching</option>
                  </Form.Select>
                </Col>
              </Row>

              <InputGroup className="mb-3">
                <InputGroup.Text>🔍</InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search by team abbreviation (e.g., ATL, NYY)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading || selectedTeams.length >= 6}
                />
              </InputGroup>

              {searchTerm && filteredTeams.length > 0 && (
                <div className="search-results">
                  {filteredTeams.map(team => (
                    <div
                      key={team.Team}
                      className="search-result-item"
                      onClick={() => {
                        addTeam(team);
                        setSearchTerm('');
                      }}
                    >
                      <strong>{team.Team}</strong>
                      {statType === 'batting' && (
                        <span className="ms-2 text-muted">
                          {team.AVG} AVG, {team.HR} HR, {team.OPS} OPS
                        </span>
                      )}
                      {statType === 'pitching' && (
                        <span className="ms-2 text-muted">
                          {team.ERA} ERA, {team.SO} SO, {team.W} W
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="selected-teams mt-3">
                <strong>Selected Teams:</strong>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {selectedTeams.map((team, idx) => (
                    <Badge
                      key={team.Team}
                      style={{ 
                        backgroundColor: getTeamColor(team.Team),
                        fontSize: '0.9rem', 
                        cursor: 'pointer',
                        padding: '0.5rem 0.75rem'
                      }}
                      onClick={() => removeTeam(team.Team)}
                    >
                      {team.Team} ✕
                    </Badge>
                  ))}
                  {selectedTeams.length === 0 && (
                    <span className="text-muted">No teams selected</span>
                  )}
                </div>
              </div>
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
          <p className="mt-2">Loading team data...</p>
        </div>
      )}

      {selectedTeams.length >= 2 && (
        <>
          <Row>
            <Col md={12}>
              <Card className="mb-4">
                <Card.Header>
                  <h5>Normalized Comparison (Radar Chart)</h5>
                  <small className="text-muted">Values normalized to 0-100 scale based on all teams</small>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={getRadarData()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="stat" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      {selectedTeams.map((team, idx) => (
                        <Radar
                          key={team.Team}
                          name={team.Team}
                          dataKey={`team${idx}`}
                          stroke={getTeamColor(team.Team)}
                          fill={getTeamColor(team.Team)}
                          fillOpacity={0.3}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Card className="mb-4">
                <Card.Header>
                  <h5>Raw Statistics Comparison</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={getBarData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stat" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {selectedTeams.map((team, idx) => (
                        <Bar
                          key={team.Team}
                          dataKey={team.Team}
                          fill={getTeamColor(team.Team)}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>

                  <Table striped bordered hover className="mt-4">
                    <thead>
                      <tr>
                        <th>Stat</th>
                        {selectedTeams.map(team => (
                          <th key={team.Team}>
                            {team.Team}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonStats.map(stat => (
                        <tr key={stat}>
                          <td><strong>{stat}</strong></td>
                          {selectedTeams.map(team => {
                            const value = team[stat];
                            const formatted = ['AVG', 'OBP', 'SLG', 'OPS', 'ERA', 'WHIP'].includes(stat)
                              ? parseFloat(value).toFixed(3)
                              : value;
                            return <td key={team.Team}>{formatted}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}

      {selectedTeams.length === 1 && (
        <Alert variant="info">
          Select at least one more team to compare
        </Alert>
      )}

      {selectedTeams.length === 0 && !loading && (
        <Alert variant="info">
          Search and select teams to start comparing their statistics
        </Alert>
      )}
    </Container>
  );
};

export default TeamComparison;
