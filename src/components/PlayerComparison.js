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
import './styles/PlayerComparison.css';

const PlayerComparison = () => {
  const [selectedYear, setSelectedYear] = useState(SEASONS.CURRENT.toString());
  const [statType, setStatType] = useState('batting');
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const battingStats = ['AVG', 'OBP', 'SLG', 'HR', 'RBI', 'R', 'SB'];
  const pitchingStats = ['ERA', 'WHIP', 'SO', 'W', 'IP'];
  const comparisonStats = statType === 'batting' ? battingStats : pitchingStats;

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a4de6c'];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchPlayers();
  }, [selectedYear, statType]);

  const fetchPlayers = async () => {
    setLoading(true);
    setError(null);

    try {
      const year = parseInt(selectedYear);
      const data = statType === 'batting'
        ? await apiService.getPlayerBatting(year, { limit: 500 })
        : await apiService.getPlayerPitching(year, { limit: 500 });

      if (Array.isArray(data)) {
        setAllPlayers(data);
      } else {
        setAllPlayers([]);
        setError(`No ${statType} data available for ${selectedYear}`);
      }
    } catch (err) {
      console.error('Error fetching players:', err);
      setError(err.message || 'Failed to load player data');
      setAllPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = (player) => {
    const playerId = player.IDfg || player.playerId;
    if (selectedPlayers.length < 5 && !selectedPlayers.find(p => (p.IDfg || p.playerId) === playerId)) {
      setSelectedPlayers([...selectedPlayers, player]);
    }
  };

  const removePlayer = (playerId) => {
    setSelectedPlayers(selectedPlayers.filter(p => (p.IDfg || p.playerId) !== playerId));
  };

  const filteredPlayers = allPlayers
    .filter(player => {
      if (!searchTerm) return false;
      const name = player.Name?.toLowerCase() || '';
      const team = player.Team?.toLowerCase() || '';
      const search = searchTerm.toLowerCase();
      return name.includes(search) || team.includes(search);
    })
    .slice(0, 10);

  const normalizeValue = (value, stat) => {
    if (!allPlayers.length) return 0;
    
    const values = allPlayers
      .map(p => parseFloat(p[stat]))
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
      selectedPlayers.forEach((player, idx) => {
        dataPoint[`player${idx}`] = normalizeValue(player[stat], stat);
      });
      return dataPoint;
    });
  };

  const getBarData = () => {
    return comparisonStats.map(stat => {
      const dataPoint = { stat };
      selectedPlayers.forEach((player) => {
        dataPoint[player.Name] = parseFloat(player[stat]) || 0;
      });
      return dataPoint;
    });
  };

  return (
    <Container className="player-comparison py-4">
      <h2 className="mb-4">Player Comparison Tool</h2>

      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header>
              <h5>Search & Select Players (up to 5)</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={4}>
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
                  <Form.Select
                    value={statType}
                    onChange={(e) => {
                      setStatType(e.target.value);
                      setSelectedPlayers([]);
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
                  placeholder="Search by player name or team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading || selectedPlayers.length >= 5}
                />
              </InputGroup>

              {searchTerm && filteredPlayers.length > 0 && (
                <div className="search-results">
                  {filteredPlayers.map(player => (
                    <div
                      key={player.IDfg || player.playerId}
                      className="search-result-item"
                      onClick={() => {
                        addPlayer(player);
                        setSearchTerm('');
                      }}
                    >
                      <strong>{player.Name}</strong> ({player.Team})
                      {statType === 'batting' && (
                        <span className="ms-2 text-muted">
                          .{player.AVG} AVG, {player.HR} HR, {player.RBI} RBI
                        </span>
                      )}
                      {statType === 'pitching' && (
                        <span className="ms-2 text-muted">
                          {player.ERA} ERA, {player.SO} SO, {player.W}-{player.L}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="selected-players mt-3">
                <strong>Selected Players:</strong>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {selectedPlayers.map((player, idx) => (
                    <Badge
                      key={player.IDfg || player.playerId}
                      bg="primary"
                      className="p-2"
                      style={{ fontSize: '0.9rem', cursor: 'pointer' }}
                      onClick={() => removePlayer(player.IDfg || player.playerId)}
                    >
                      {player.Name} ({player.Team}) ✕
                    </Badge>
                  ))}
                  {selectedPlayers.length === 0 && (
                    <span className="text-muted">No players selected</span>
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
          <p className="mt-2">Loading player data...</p>
        </div>
      )}

      {selectedPlayers.length >= 2 && (
        <>
          <Row>
            <Col md={12}>
              <Card className="mb-4">
                <Card.Header>
                  <h5>Normalized Comparison (Radar Chart)</h5>
                  <small className="text-muted">Values normalized to 0-100 scale based on all players</small>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={getRadarData()}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="stat" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      {selectedPlayers.map((player, idx) => (
                        <Radar
                          key={player.IDfg || player.playerId}
                          name={player.Name}
                          dataKey={`player${idx}`}
                          stroke={colors[idx]}
                          fill={colors[idx]}
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
                      {selectedPlayers.map((player, idx) => (
                        <Bar
                          key={player.IDfg || player.playerId}
                          dataKey={player.Name}
                          fill={colors[idx]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>

                  <Table striped bordered hover className="mt-4">
                    <thead>
                      <tr>
                        <th>Stat</th>
                        {selectedPlayers.map(player => (
                          <th key={player.IDfg || player.playerId}>
                            {player.Name}
                            <br />
                            <small className="text-muted">({player.Team})</small>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonStats.map(stat => (
                        <tr key={stat}>
                          <td><strong>{stat}</strong></td>
                          {selectedPlayers.map(player => {
                            const value = player[stat];
                            const formatted = ['AVG', 'OBP', 'SLG', 'ERA', 'WHIP'].includes(stat)
                              ? parseFloat(value).toFixed(3)
                              : value;
                            return <td key={player.IDfg || player.playerId}>{formatted}</td>;
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

      {selectedPlayers.length === 1 && (
        <Alert variant="info">
          Select at least one more player to compare
        </Alert>
      )}

      {selectedPlayers.length === 0 && !loading && (
        <Alert variant="info">
          Search and select players to start comparing their statistics
        </Alert>
      )}
    </Container>
  );
};

export default PlayerComparison;
