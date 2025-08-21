import React, { useState, useEffect } from 'react';
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

const PlayerBatting = () => {
  const [playerData, setPlayerData] = useState([]);
  const [selectedYear, setSelectedYear] = useState('2024'); // Updated to use 2024 season
  const [availableStats, setAvailableStats] = useState([]);
  const [visibleStats, setVisibleStats] = useState(new Set([
    'Name', 'Team', 'G', 'AB', 'R', 'H', 'HR', 'RBI', 'BB', 'SO', 'AVG', 'OBP', 'SLG', 'OPS'
  ]));
  const [sortConfig, setSortConfig] = useState({ key: 'OPS', direction: "desc" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);

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
      console.log(`🔄 PlayerBatting: Fetching ${selectedYear} player batting data`);
      
      // Use the new player-batting endpoint with leaderboard data
      const url = `${process.env.REACT_APP_API_URL}/player-batting?year=${selectedYear}&limit=50&sortStat=${sortConfig.key}&direction=${sortConfig.direction}`;
      
      console.log(`⚾ PlayerBatting: Fetching from:`, url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch player batting data`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ PlayerBatting: Received ${data.length} players`);
        setPlayerData(data);
        setFilteredData(data);
      } else {
        console.warn('⚠️ PlayerBatting: No data received, using fallback');
        // Generate mock data for demonstration if no data
        const mockData = generateMockPlayerData();
        setPlayerData(mockData);
        setFilteredData(mockData);
      }
    } catch (error) {
      console.error("❌ PlayerBatting: Error fetching player data:", error);
      setError(`Failed to load player batting data: ${error.message}`);
      // Use mock data as fallback
      const mockData = generateMockPlayerData();
      setPlayerData(mockData);
      setFilteredData(mockData);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock data for demonstration (until backend is properly configured)
  const generateMockPlayerData = () => {
    const teams = ['ATL', 'NYY', 'LAD', 'HOU', 'TB', 'SF', 'TOR', 'SD', 'CHC', 'PHI'];
    const names = [
      'Ronald Acuña Jr.', 'Mookie Betts', 'Mike Trout', 'Aaron Judge', 
      'Juan Soto', 'Vladimir Guerrero Jr.', 'Fernando Tatis Jr.', 'Freddie Freeman',
      'Manny Machado', 'Jose Altuve', 'Rafael Devers', 'Yordan Alvarez'
    ];
    
    return names.map((name, i) => ({
      IDfg: 1000 + i,
      Name: name,
      Team: teams[i % teams.length],
      G: Math.floor(Math.random() * 50) + 100,
      AB: Math.floor(Math.random() * 200) + 400,
      R: Math.floor(Math.random() * 50) + 60,
      H: Math.floor(Math.random() * 80) + 120,
      HR: Math.floor(Math.random() * 25) + 15,
      RBI: Math.floor(Math.random() * 50) + 70,
      BB: Math.floor(Math.random() * 40) + 30,
      SO: Math.floor(Math.random() * 80) + 100,
      AVG: (Math.random() * 0.150 + 0.220).toFixed(3),
      OBP: (Math.random() * 0.100 + 0.300).toFixed(3),
      SLG: (Math.random() * 0.200 + 0.400).toFixed(3),
      OPS: (Math.random() * 0.300 + 0.700).toFixed(3),
      'wRC+': Math.floor(Math.random() * 60) + 90,
      WAR: (Math.random() * 4 + 1).toFixed(1)
    }));
  };

  useEffect(() => {
    fetchAvailableStats();
  }, []);

  useEffect(() => {
    fetchPlayerData();
  }, [selectedYear, visibleStats, sortConfig]);

  useEffect(() => {
    // Filter data based on search term
    if (searchTerm) {
      const filtered = playerData.filter(player => 
        player.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.Team?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(playerData);
    }
  }, [searchTerm, playerData]);

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
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col xs={12} md={2}>
              <Form.Label>Season</Form.Label>
              <Dropdown>
                <Dropdown.Toggle variant="outline-primary" className="w-100">
                  {selectedYear}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  {["2020", "2021", "2022", "2023", "2024", "2025"].map(year => (
                    <Dropdown.Item key={year} onClick={() => setSelectedYear(year)}>
                      {year}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </Col>

            <Col xs={12} md={3}>
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

            <Col xs={12} md={3}>
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
            <div style={{ overflowX: 'auto' }}>
              <Table striped hover responsive className="mb-0">
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
                              <Link to={`/player/${player.IDfg}`} className="text-decoration-none fw-bold">
                                {value}
                              </Link>
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
