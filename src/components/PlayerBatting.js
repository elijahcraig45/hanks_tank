import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Table, 
  Dropdown, 
  Form, 
  Alert, 
  Spinner, 
  Card, 
  Button, 
  Badge, 
  InputGroup 
} from 'react-bootstrap';
import { Link } from "react-router-dom";
import apiService from '../services/api';
import { SEASONS, AVAILABLE_SEASONS } from '../config/constants';
import './styles/PlayerStats.css';

const PlayerBatting = () => {
  const [playerData, setPlayerData] = useState([]);
  const [teamData, setTeamData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(SEASONS.CURRENT.toString());
  const [availableStats, setAvailableStats] = useState([]);
  const [visibleStats, setVisibleStats] = useState(new Set([
    'Name', 'Team', 'G', 'AB', 'R', 'H', 'HR', 'RBI', 'BB', 'SO', 'AVG', 'OBP', 'SLG', 'OPS'
  ]));
  const [sortConfig, setSortConfig] = useState({ key: 'OPS', direction: "desc" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [showQualifiedOnly, setShowQualifiedOnly] = useState(false);

  // Essential stats presets for MLB API data
  const statPresets = {
    'Essential': ['Name', 'Team', 'G', 'AB', 'R', 'H', 'HR', 'RBI', 'AVG', 'OPS'],
    'Traditional': ['Name', 'Team', 'G', 'AB', 'R', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'SO', 'AVG'],
    'Advanced': ['Name', 'Team', 'PA', 'TB', 'SLG', 'OBP', 'OPS', 'BABIP', 'HBP', 'SF'],
    'Power': ['Name', 'Team', 'HR', 'RBI', 'SLG', 'TB', 'H', 'G'],
    'Plate Discipline': ['Name', 'Team', 'PA', 'BB', 'SO', 'HBP', 'AVG', 'OBP']
  };

  const fetchAvailableStats = async () => {
    try {
      // For Phase 1, we'll use a predefined set of MLB API stats
      // This matches what's available from the MLB Stats API player leaderboards
      const mlbApiStats = [
        'Name', 'Team', 'G', 'AB', 'R', 'H', '2B', '3B', 'HR', 'RBI', 
        'SB', 'CS', 'BB', 'SO', 'AVG', 'OBP', 'SLG', 'OPS', 'TB', 'HBP', 
        'SF', 'SH', 'BABIP', 'PA'
      ];
      setAvailableStats(mlbApiStats);
    } catch (error) {
      console.error("Error setting available stats:", error);
      setError("Failed to load available statistics");
    }
  };

  const fetchPlayerData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [playerData, teamDataResult] = await Promise.allSettled([
        apiService.getPlayerBatting(parseInt(selectedYear), {
          sortStat: sortConfig.key,
          direction: sortConfig.direction,
          limit: 1000
        }),
        apiService.getTeamBatting(parseInt(selectedYear))
      ]);
      
      if (playerData.status === 'fulfilled' && Array.isArray(playerData.value) && playerData.value.length > 0) {
        setPlayerData(playerData.value);
        setFilteredData(playerData.value);
      } else {
        setPlayerData([]);
        setError(`No player batting data available for ${selectedYear}`);
      }
      
      if (teamDataResult.status === 'fulfilled' && Array.isArray(teamDataResult.value)) {
        setTeamData(teamDataResult.value);
      }
    } catch (error) {
      console.error("Error fetching player data:", error);
      setError(error.message || 'Failed to load player batting data');
      setPlayerData([]);
    } finally {
      setLoading(false);
    }
  };

  // Determine if a player is qualified for batting title (3.1 PA per team game)
  const isQualifiedBatter = (player) => {
    const plateAppearances = player.PA || (player.AB + player.BB + player.HBP + player.SF + player.SH) || 0;
    
    // Try to get team games played from team data
    let teamGamesPlayed = 162; // Default fallback
    
    if (teamData && teamData.length > 0) {
      // Find the player's team in team data
      const playerTeam = teamData.find(team => 
        team.Team === player.Team || 
        team.Tm === player.Team ||
        team.Name === player.Team
      );
      
      if (playerTeam && playerTeam.G) {
        teamGamesPlayed = parseInt(playerTeam.G);
        console.log(`📊 Found ${player.Team} games played: ${teamGamesPlayed}`);
      }
    }
    
    const requiredPA = 3.1 * teamGamesPlayed;
    return plateAppearances >= Math.floor(requiredPA);
  };

  const sortData = useCallback((data) => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      // Handle numeric values
      if (!isNaN(aVal) && !isNaN(bVal)) {
        const numA = parseFloat(aVal);
        const numB = parseFloat(bVal);
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }
      
      // Handle string values
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return strA < strB ? -1 : strA > strB ? 1 : 0;
      } else {
        return strA > strB ? -1 : strA < strB ? 1 : 0;
      }
    });
  }, [sortConfig]);

  useEffect(() => {
    fetchAvailableStats();
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchPlayerData();
  }, [selectedYear]);

  useEffect(() => {
    // Filter and sort data
    let filtered = playerData;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(player => 
        player.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.Team?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply qualification filter
    if (showQualifiedOnly) {
      filtered = filtered.filter(player => isQualifiedBatter(player));
    }
    
    // Apply sorting
    filtered = sortData(filtered);
    
    setFilteredData(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, playerData, showQualifiedOnly, sortData]);

  const requestSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc"
    });
  };

  const toggleStatVisibility = (stat) => {
    setVisibleStats(prevStats => {
      const newStats = new Set(prevStats);
      if (newStats.has(stat)) {
        newStats.delete(stat);
      } else {
        newStats.add(stat);
      }
      return newStats;
    });
  };

  const applyStatPreset = (presetName) => {
    setVisibleStats(new Set(statPresets[presetName]));
  };

  const formatData = (data, key) => {
    if (!data && data !== 0) return '--';
    if (["HR", "RBI", "SB", "G", "AB", "R", "H", "BB", "SO"].includes(key)) {
      return parseInt(data).toLocaleString();
    }
    if (["AVG", "OBP", "SLG", "OPS", "WAR"].includes(key)) {
      return parseFloat(data).toFixed(3);
    }
    if (["wRC+", "OPS+"].includes(key)) {
      return Math.round(parseFloat(data));
    }
    return data;
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return ' ↕️';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="display-6">⚾ Player Batting Statistics</h1>
          <p className="text-muted">Comprehensive batting statistics for MLB players</p>
        </Col>
      </Row>

      {error && (
        <Alert variant="warning" dismissible onClose={() => setError(null)}>
          <Alert.Heading>Data Notice</Alert.Heading>
          {error}
          <hr />
          <small>Currently displaying sample data for demonstration purposes.</small>
        </Alert>
      )}

      {/* Controls Section */}
      <Card className="mb-4 controls-section">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col xs={12} md={2}>
              <Form.Label>Season</Form.Label>
              <Dropdown>
                <Dropdown.Toggle variant="outline-primary" className="w-100">
                  {selectedYear}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {AVAILABLE_SEASONS.map(year => (
                    <Dropdown.Item key={year} onClick={() => setSelectedYear(year.toString())}>
                      {year}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            <Col xs={12} md={2}>
              <Form.Label>Search Players</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Search by name or team..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>

            <Col xs={12} md={2}>
              <Form.Label>Stat Presets</Form.Label>
              <Dropdown>
                <Dropdown.Toggle variant="outline-secondary" className="w-100">
                  Quick Stats
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {Object.keys(statPresets).map(preset => (
                    <Dropdown.Item key={preset} onClick={() => applyStatPreset(preset)}>
                      {preset}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            <Col xs={12} md={2}>
              <Form.Label>Player Filter</Form.Label>
              <div className="filter-section">
                <Form.Check
                  type="switch"
                  id="qualified-switch"
                  label="Qualified Only"
                  checked={showQualifiedOnly}
                  onChange={(e) => setShowQualifiedOnly(e.target.checked)}
                />
              </div>
            </Col>

            <Col xs={12} md={2}>
              <Form.Label>Columns</Form.Label>
              <Dropdown>
                <Dropdown.Toggle variant="outline-info" className="w-100">
                  Customize
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {availableStats.map(stat => (
                    <Form.Check
                      key={stat}
                      type="checkbox"
                      id={`stat-${stat}`}
                      label={stat}
                      checked={visibleStats.has(stat)}
                      onChange={() => toggleStatVisibility(stat)}
                      className="dropdown-item-text"
                    />
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            <Col xs={12} md={2}>
              <Button 
                variant="success" 
                onClick={fetchPlayerData} 
                disabled={loading}
                className="w-100"
              >
                {loading ? <Spinner animation="border" size="sm" /> : "Refresh"}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Stats Summary */}
      <Row className="mb-3">
        <Col>
          <div className="d-flex flex-wrap gap-2">
            <Badge bg="primary">
              {filteredData.length} Players
            </Badge>
            <Badge bg="info">
              {visibleStats.size} Columns
            </Badge>
            <Badge bg="secondary">
              Season {selectedYear}
            </Badge>
            {searchTerm && (
              <Badge bg="warning">
                Filtered: "{searchTerm}"
              </Badge>
            )}
          </div>
        </Col>
      </Row>

      {/* Data Table */}
      <Card>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Loading player statistics...</p>
            </div>
          ) : (
            <div className="table-container">
              <Table striped hover responsive className="mb-0 player-table">
                <thead className="table-dark">
                  <tr>
                    {filteredData.length > 0 && Object.keys(filteredData[0])
                      .filter(key => visibleStats.has(key))
                      .map(key => (
                        <th 
                          key={key} 
                          onClick={() => requestSort(key)} 
                          style={{ cursor: "pointer", whiteSpace: 'nowrap' }}
                          className="user-select-none"
                        >
                          {key}{getSortIcon(key)}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((player, idx) => (
                    <tr key={`player-${idx}`}>
                      {Object.entries(player)
                        .filter(([key]) => visibleStats.has(key))
                        .map(([key, value], valueIdx) => (
                          <td key={`${key}-${valueIdx}`} style={{ whiteSpace: 'nowrap' }}>
                            {key === "Team" ? (
                              <Link to={`/team/${value}`} className="text-decoration-none fw-bold">
                                {value}
                              </Link>
                            ) : key === "Name" ? (
                              <span>
                                <Link to={`/player/${player.playerId}`} className="text-decoration-none fw-bold player-name">
                                  {value}
                                </Link>
                                {isQualifiedBatter(player) && (
                                  <Badge bg="success" className="qualified-indicator">Q</Badge>
                                )}
                              </span>
                            ) : (
                              formatData(value, key)
                            )}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {filteredData.length === 0 && !loading && (
        <Alert variant="info" className="mt-3">
          <Alert.Heading>No Results Found</Alert.Heading>
          {searchTerm ? 
            `No players found matching "${searchTerm}". Try a different search term.` :
            "No player data available for the selected criteria."
          }
        </Alert>
      )}
    </Container>
  );
};

export default PlayerBatting;
