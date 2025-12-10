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
  InputGroup,
  ButtonGroup,
  Button,
  ProgressBar
} from 'react-bootstrap';
import {
  ResponsiveContainer,
  Legend,
  Tooltip,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ZAxis
} from 'recharts';
import apiService from '../services/api';
import { SEASONS } from '../config/constants';
import './styles/AdvancedPlayerAnalysis.css';

const AdvancedPlayerAnalysis = () => {
  const [selectedYear, setSelectedYear] = useState(SEASONS.CURRENT.toString());
  const [statType, setStatType] = useState('batting');
  const [allPlayers, setAllPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('percentile'); // 'percentile', 'headtohead', 'scatter', 'trends'

  // Advanced batting stats with categories
  const battingStatCategories = {
    'Overall': ['AVG', 'OBP', 'SLG', 'OPS', 'wOBA', 'wRC+'],
    'Power': ['HR', 'RBI', 'ISO', 'SLG', 'TB'],
    'Contact': ['AVG', 'BABIP', 'K%', 'BB%'],
    'Speed': ['SB', 'CS', 'SB%'],
    'Counting': ['G', 'PA', 'AB', 'R', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'SO']
  };

  const pitchingStatCategories = {
    'Overall': ['ERA', 'WHIP', 'FIP', 'xFIP', 'K/9', 'BB/9'],
    'Strikeouts': ['SO', 'K/9', 'K%', 'K-BB%'],
    'Control': ['BB/9', 'BB%', 'WHIP'],
    'Results': ['W', 'L', 'SV', 'ERA', 'WHIP'],
    'Counting': ['G', 'GS', 'IP', 'SO', 'BB', 'H', 'ER', 'HR']
  };

  const statCategories = statType === 'batting' ? battingStatCategories : pitchingStatCategories;
  const [selectedCategory, setSelectedCategory] = useState('Overall');

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
        ? await apiService.getPlayerBatting(year, { limit: 1000 })
        : await apiService.getPlayerPitching(year, { limit: 1000 });

      if (Array.isArray(data)) {
        // Calculate missing advanced stats if not present
        const enrichedData = data.map(player => {
          const enriched = { ...player };
          
          if (statType === 'batting') {
            // Calculate ISO (Isolated Power) if missing
            if (!enriched.ISO && enriched.SLG && enriched.AVG) {
              enriched.ISO = (parseFloat(enriched.SLG) - parseFloat(enriched.AVG)).toFixed(3);
            }
            
            // Calculate wOBA if missing (simplified version)
            if (!enriched.wOBA) {
              enriched.wOBA = enriched.OBP || 0; // Fallback to OBP if wOBA not available
            }
            
            // Calculate wRC+ if missing (simplified - would need league average)
            if (!enriched['wRC+']) {
              enriched['wRC+'] = enriched.OPS ? Math.round((parseFloat(enriched.OPS) / 0.730) * 100) : 0;
            }
            
            // Calculate K% and BB% if missing
            if (!enriched['K%'] && enriched.SO && enriched.PA) {
              enriched['K%'] = ((parseFloat(enriched.SO) / parseFloat(enriched.PA)) * 100).toFixed(1);
            }
            if (!enriched['BB%'] && enriched.BB && enriched.PA) {
              enriched['BB%'] = ((parseFloat(enriched.BB) / parseFloat(enriched.PA)) * 100).toFixed(1);
            }
            
            // Calculate SB% if missing
            if (!enriched['SB%'] && enriched.SB && enriched.CS) {
              const attempts = parseFloat(enriched.SB) + parseFloat(enriched.CS);
              if (attempts > 0) {
                enriched['SB%'] = ((parseFloat(enriched.SB) / attempts) * 100).toFixed(1);
              }
            }
          } else {
            // Pitching stats
            // Calculate K/9 if missing
            if (!enriched['K/9'] && enriched.SO && enriched.IP) {
              enriched['K/9'] = ((parseFloat(enriched.SO) / parseFloat(enriched.IP)) * 9).toFixed(2);
            }
            
            // Calculate BB/9 if missing
            if (!enriched['BB/9'] && enriched.BB && enriched.IP) {
              enriched['BB/9'] = ((parseFloat(enriched.BB) / parseFloat(enriched.IP)) * 9).toFixed(2);
            }
            
            // Calculate HR/9 if missing
            if (!enriched['HR/9'] && enriched.HR && enriched.IP) {
              enriched['HR/9'] = ((parseFloat(enriched.HR) / parseFloat(enriched.IP)) * 9).toFixed(2);
            }
            
            // Calculate K% and BB% if missing
            if (!enriched['K%'] && enriched.SO && enriched.BF) {
              enriched['K%'] = ((parseFloat(enriched.SO) / parseFloat(enriched.BF)) * 100).toFixed(1);
            }
            if (!enriched['BB%'] && enriched.BB && enriched.BF) {
              enriched['BB%'] = ((parseFloat(enriched.BB) / parseFloat(enriched.BF)) * 100).toFixed(1);
            }
            
            // Calculate K-BB% if missing
            if (!enriched['K-BB%'] && enriched['K%'] && enriched['BB%']) {
              enriched['K-BB%'] = (parseFloat(enriched['K%']) - parseFloat(enriched['BB%'])).toFixed(1);
            }
            
            // FIP and xFIP would need league constants, so we'll leave those if missing
            if (!enriched.FIP) {
              enriched.FIP = enriched.ERA || 0; // Fallback
            }
            if (!enriched.xFIP) {
              enriched.xFIP = enriched.FIP || enriched.ERA || 0; // Fallback
            }
          }
          
          return enriched;
        });
        
        setAllPlayers(enrichedData);
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

  // Calculate percentile ranking
  const calculatePercentile = (value, stat) => {
    if (!allPlayers.length || value === null || value === undefined) return 0;
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return 0;
    
    const values = allPlayers
      .map(p => parseFloat(p[stat]))
      .filter(v => !isNaN(v) && v !== null && v !== undefined);
    
    if (!values.length) return 0;
    
    // For stats where lower is better (ERA, WHIP, etc.)
    const lowerIsBetter = ['ERA', 'WHIP', 'BB/9', 'HR/9', 'BB%', 'FIP', 'xFIP', 'SO'];
    
    // Count how many players are WORSE than this player
    let worseThanPlayer = 0;
    if (lowerIsBetter.includes(stat)) {
      // Lower is better, so count players with HIGHER values
      worseThanPlayer = values.filter(v => v > numValue).length;
    } else {
      // Higher is better, so count players with LOWER values
      worseThanPlayer = values.filter(v => v < numValue).length;
    }
    
    // Percentile = (number of players worse than you / total players) * 100
    const percentile = (worseThanPlayer / values.length) * 100;
    return Math.round(percentile);
  };

  // Get percentile color
  const getPercentileColor = (percentile) => {
    if (percentile >= 90) return '#10b981'; // Green
    if (percentile >= 75) return '#3b82f6'; // Blue
    if (percentile >= 50) return '#f59e0b'; // Orange
    if (percentile >= 25) return '#ef4444'; // Red
    return '#6b7280'; // Gray
  };

  // Get percentile label
  const getPercentileLabel = (percentile) => {
    if (percentile >= 90) return 'Elite';
    if (percentile >= 75) return 'Great';
    if (percentile >= 50) return 'Above Avg';
    if (percentile >= 25) return 'Below Avg';
    return 'Poor';
  };

  const addPlayer = (player) => {
    const playerId = player.IDfg || player.playerId;
    if (selectedPlayers.length < 6 && !selectedPlayers.find(p => (p.IDfg || p.playerId) === playerId)) {
      setSelectedPlayers([...selectedPlayers, player]);
      setSearchTerm('');
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

  // Head-to-head comparison
  const getHeadToHeadData = () => {
    const stats = statCategories[selectedCategory] || [];
    const lowerIsBetter = ['ERA', 'WHIP', 'BB/9', 'HR/9', 'BB%', 'FIP', 'xFIP', 'SO'];
    
    return stats.map(stat => {
      const row = { stat };
      
      selectedPlayers.forEach((player, idx) => {
        const value = parseFloat(player[stat]) || 0;
        row[`player${idx}`] = value;
        row[`player${idx}_name`] = player.Name;
      });

      // Find winner(s) - could be multiple in case of tie
      const values = selectedPlayers.map((p, idx) => ({
        idx,
        value: parseFloat(p[stat]) || 0
      }));
      
      // Find the best value
      const bestValue = lowerIsBetter.includes(stat)
        ? Math.min(...values.map(v => v.value))
        : Math.max(...values.map(v => v.value));
      
      // Get all winners (in case of tie) - use larger tolerance for ties
      const tolerance = 0.001; // Adjust for stat precision
      const winners = values.filter(v => Math.abs(v.value - bestValue) <= tolerance).map(v => v.idx);
      
      row.winners = winners; // Array of winner indices
      row.isTie = winners.length > 1;
      
      return row;
    });
  };

  // Percentile comparison data
  const getPercentileData = () => {
    const stats = statCategories[selectedCategory] || [];
    
    return selectedPlayers.map((player, idx) => ({
      player: player.Name,
      color: colors[idx],
      stats: stats.map(stat => ({
        stat,
        value: parseFloat(player[stat]) || 0,
        percentile: calculatePercentile(player[stat], stat)
      }))
    }));
  };

  // Scatter plot data for two-stat comparison
  const getScatterData = () => {
    const xStat = statType === 'batting' ? 'HR' : 'SO';
    const yStat = statType === 'batting' ? 'OPS' : 'ERA';
    
    return selectedPlayers.map((player, idx) => ({
      name: player.Name,
      x: parseFloat(player[xStat]) || 0,
      y: parseFloat(player[yStat]) || 0,
      z: parseFloat(player.AB || player.IP) || 0,
      color: colors[idx]
    }));
  };

  // Calculate composite score
  const calculateCompositeScore = (player) => {
    const stats = statCategories[selectedCategory] || [];
    const percentiles = stats.map(stat => calculatePercentile(player[stat], stat));
    return Math.round(percentiles.reduce((a, b) => a + b, 0) / percentiles.length);
  };

  // Render percentile view
  const renderPercentileView = () => {
    const playerData = getPercentileData();
    const stats = statCategories[selectedCategory] || [];

    return (
      <Card className="mb-4">
        <Card.Header>
          <h5>Percentile Rankings - {selectedCategory} Stats</h5>
          <small className="text-muted">
            Percentile ranking shows where each player ranks among all {allPlayers.length} players
          </small>
        </Card.Header>
        <Card.Body>
          {playerData.map((data, playerIdx) => (
            <div key={playerIdx} className="mb-4">
              <h6 style={{ color: data.color }}>{data.player}</h6>
              <div className="composite-score mb-3">
                <strong>Composite Score: </strong>
                <Badge 
                  bg="secondary" 
                  style={{ backgroundColor: getPercentileColor(calculateCompositeScore(selectedPlayers[playerIdx])) }}
                >
                  {calculateCompositeScore(selectedPlayers[playerIdx])}th percentile
                </Badge>
              </div>
              <Row>
                {data.stats.map((statData, statIdx) => (
                  <Col md={6} lg={4} key={statIdx} className="mb-3">
                    <div className="stat-card">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong>{statData.stat}</strong>
                        <Badge 
                          style={{ backgroundColor: getPercentileColor(statData.percentile) }}
                        >
                          {getPercentileLabel(statData.percentile)}
                        </Badge>
                      </div>
                      <div className="stat-value mb-1">
                        {statData.value.toFixed(statData.stat === 'AVG' || statData.stat === 'OBP' || statData.stat === 'SLG' ? 3 : 1)}
                      </div>
                      <ProgressBar 
                        now={statData.percentile} 
                        variant={
                          statData.percentile >= 75 ? 'success' : 
                          statData.percentile >= 50 ? 'info' : 
                          statData.percentile >= 25 ? 'warning' : 'danger'
                        }
                        label={`${statData.percentile}%`}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </Card.Body>
      </Card>
    );
  };

  // Render head-to-head view
  const renderHeadToHeadView = () => {
    const data = getHeadToHeadData();

    return (
      <Card className="mb-4">
        <Card.Header>
          <h5>Head-to-Head Comparison - {selectedCategory} Stats</h5>
          <small className="text-muted">Winner highlighted in bold with checkmark</small>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Stat</th>
                  {selectedPlayers.map((player, idx) => (
                    <th key={idx} style={{ color: colors[idx] }}>
                      {player.Name}
                      <div className="text-muted small">{player.Team}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx}>
                    <td><strong>{row.stat}</strong></td>
                    {selectedPlayers.map((player, playerIdx) => {
                      const value = row[`player${playerIdx}`];
                      const isWinner = row.winners.includes(playerIdx);
                      const isTie = row.isTie && isWinner;
                      return (
                        <td 
                          key={playerIdx}
                          className={isWinner ? 'winner-cell' : ''}
                          style={{ 
                            fontWeight: isWinner ? 'bold' : 'normal',
                            backgroundColor: isWinner && !isTie ? `${colors[playerIdx]}15` : 
                                           isTie ? '#fbbf2420' : 'transparent',
                            borderLeft: isWinner ? `3px solid ${colors[playerIdx]}` : 'none',
                            paddingLeft: isWinner ? '0.5rem' : '0.75rem'
                          }}
                        >
                          {isTie ? '🤝 ' : isWinner ? '✓ ' : ''}
                          {value.toFixed(
                            row.stat === 'AVG' || row.stat === 'OBP' || row.stat === 'SLG' || row.stat === 'OPS' || 
                            row.stat === 'ERA' || row.stat === 'WHIP' || row.stat === 'ISO' || row.stat === 'BABIP' ||
                            row.stat === 'wOBA' ? 3 : 
                            row.stat.includes('%') || row.stat.includes('/9') ? 1 : 0
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          
          {/* Win-Loss Record */}
          <div className="mt-4">
            <h6>Head-to-Head Record</h6>
            <div className="d-flex flex-wrap gap-3">
              {selectedPlayers.map((player, playerIdx) => {
                const wins = data.filter(row => row.winners.includes(playerIdx) && !row.isTie).length;
                const ties = data.filter(row => row.winners.includes(playerIdx) && row.isTie).length;
                const total = data.length;
                const losses = total - wins - ties;
                return (
                  <div key={playerIdx} className="h2h-record">
                    <strong style={{ color: colors[playerIdx] }}>{player.Name}</strong>
                    <div className="record-badge">
                      <Badge bg="success" className="me-1">{wins}W</Badge>
                      <Badge bg="warning" className="me-1">{ties}T</Badge>
                      <Badge bg="secondary">{losses}L</Badge>
                      <span className="ms-2 text-muted">
                        ({((wins / total) * 100).toFixed(0)}% win)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  // Render scatter plot
  const renderScatterView = () => {
    const xStat = statType === 'batting' ? 'HR' : 'SO';
    const yStat = statType === 'batting' ? 'OPS' : 'ERA';
    
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5>Statistical Scatter Plot</h5>
          <small className="text-muted">Compare players across multiple dimensions</small>
        </Card.Header>
        <Card.Body>
          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="x" 
                type="number" 
                name={xStat}
                label={{ value: xStat, position: 'insideBottom', offset: -5, fill: '#6b7280', fontWeight: 600 }}
                tick={{ fill: '#374151' }}
              />
              <YAxis 
                dataKey="y" 
                type="number" 
                name={yStat}
                label={{ value: yStat, angle: -90, position: 'insideLeft', fill: '#6b7280', fontWeight: 600 }}
                tick={{ fill: '#374151' }}
              />
              <ZAxis dataKey="z" type="number" range={[200, 1200]} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3', stroke: '#9ca3af' }}
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '12px'
                }}
                labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="custom-tooltip bg-white p-3 border rounded shadow">
                        <p style={{ fontWeight: 'bold', color: payload[0].payload.color, marginBottom: '8px' }}>
                          {payload[0].payload.name}
                        </p>
                        <p style={{ margin: '4px 0' }}>{xStat}: <strong>{payload[0].value.toFixed(0)}</strong></p>
                        <p style={{ margin: '4px 0' }}>{yStat}: <strong>{payload[1].value.toFixed(3)}</strong></p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              {selectedPlayers.map((player, idx) => (
                <Scatter
                  key={idx}
                  name={player.Name}
                  data={[getScatterData()[idx]]}
                  fill={colors[idx]}
                  fillOpacity={0.7}
                  stroke={colors[idx]}
                  strokeWidth={2}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>
    );
  };

  return (
    <Container fluid className="advanced-player-analysis py-4">
      <Row className="mb-4">
        <Col>
          <h2>🔬 Advanced Player Analysis</h2>
          <p className="text-muted">
            Deep statistical comparison with percentile rankings, head-to-head matchups, and advanced metrics
          </p>
        </Col>
      </Row>

      {/* Controls */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Body>
              <Row className="align-items-end">
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Season</Form.Label>
                    <Form.Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                      {[...Array(12)].map((_, i) => {
                        const year = 2026 - i;
                        return <option key={year} value={year}>{year}</option>;
                      })}
                    </Form.Select>
                  </Form.Group>
                </Col>
                
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Type</Form.Label>
                    <Form.Select value={statType} onChange={(e) => setStatType(e.target.value)}>
                      <option value="batting">Batting</option>
                      <option value="pitching">Pitching</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Category</Form.Label>
                    <Form.Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                      {Object.keys(statCategories).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={5}>
                  <Form.Group>
                    <Form.Label>Search Players</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        placeholder="Search by player name or team..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
              </Row>

              {/* Search Results */}
              {searchTerm && filteredPlayers.length > 0 && (
                <div className="search-results mt-3">
                  {filteredPlayers.map((player) => (
                    <div
                      key={player.IDfg || player.playerId}
                      className="search-result-item"
                      onClick={() => addPlayer(player)}
                    >
                      <strong>{player.Name}</strong> - {player.Team}
                      {statType === 'batting' && (
                        <span className="ms-2 text-muted">
                          {player.AVG} AVG, {player.HR} HR, {player.RBI} RBI
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

              {/* Selected Players */}
              <div className="selected-players mt-3">
                <strong>Selected Players ({selectedPlayers.length}/6):</strong>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {selectedPlayers.map((player, idx) => (
                    <Badge
                      key={player.IDfg || player.playerId}
                      className="p-2 player-badge"
                      style={{ 
                        backgroundColor: colors[idx],
                        fontSize: '0.9rem', 
                        cursor: 'pointer' 
                      }}
                      onClick={() => removePlayer(player.IDfg || player.playerId)}
                    >
                      {player.Name} ({player.Team}) ✕
                    </Badge>
                  ))}
                  {selectedPlayers.length === 0 && (
                    <span className="text-muted">No players selected - search and click to add up to 6 players</span>
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

      {/* View Mode Selector */}
      {selectedPlayers.length >= 2 && (
        <>
          <Row className="mb-4">
            <Col>
              <ButtonGroup className="w-100">
                <Button
                  variant={viewMode === 'percentile' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('percentile')}
                >
                  📊 Percentile Rankings
                </Button>
                <Button
                  variant={viewMode === 'headtohead' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('headtohead')}
                >
                  ⚔️ Head-to-Head
                </Button>
                <Button
                  variant={viewMode === 'scatter' ? 'primary' : 'outline-primary'}
                  onClick={() => setViewMode('scatter')}
                >
                  🎯 Scatter Plot
                </Button>
              </ButtonGroup>
            </Col>
          </Row>

          {/* Render based on view mode */}
          {viewMode === 'percentile' && renderPercentileView()}
          {viewMode === 'headtohead' && renderHeadToHeadView()}
          {viewMode === 'scatter' && renderScatterView()}
        </>
      )}

      {selectedPlayers.length === 1 && (
        <Alert variant="info">
          Select at least one more player to start comparing
        </Alert>
      )}
    </Container>
  );
};

export default AdvancedPlayerAnalysis;
