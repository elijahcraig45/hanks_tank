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
import { Link } from 'react-router-dom';

const PlayerPitching = () => {
  const [playerData, setPlayerData] = useState([]);
  const [selectedYear, setSelectedYear] = useState('2025');
  const [availableStats, setAvailableStats] = useState([]);
  const [visibleStats, setVisibleStats] = useState(new Set([
    'Name', 'Team', 'GS', 'IP', 'ERA', 'WHIP', 'SO', 'BB', 'H', 'HR', 'K/9', 'BB/9', 'FIP'
  ]));
  const [sortConfig, setSortConfig] = useState({ key: 'ERA', direction: "asc" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);

  // Pitching stats presets
  const statPresets = {
    'Essential': ['Name', 'Team', 'GS', 'IP', 'ERA', 'WHIP', 'SO', 'K/9', 'FIP'],
    'Advanced': ['Name', 'Team', 'FIP', 'xFIP', 'SIERA', 'WAR', 'WPA', 'ERA-', 'FIP-'],
    'Sabermetrics': ['Name', 'Team', 'WAR', 'FIP', 'xFIP', 'BABIP', 'LOB%', 'HR/FB', 'SIERA'],
    'Traditional': ['Name', 'Team', 'W', 'L', 'ERA', 'GS', 'CG', 'SHO', 'SV', 'IP', 'H', 'R', 'ER', 'HR', 'BB', 'SO'],
    'Rate Stats': ['Name', 'Team', 'ERA', 'WHIP', 'K/9', 'BB/9', 'HR/9', 'K%', 'BB%', 'K-BB%']
  };

  const fetchAvailableStats = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/PlayerPitching/avaliableStats`);
      if (!response.ok) throw new Error("Failed to fetch available stats");
      const stats = await response.json();
      setAvailableStats(stats);
    } catch (error) {
      console.error("Error fetching available stats:", error);
      setError("Failed to load available statistics");
    }
  };

  const fetchPlayerData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const statsParam = Array.from(visibleStats).join(',');
      const url = `${process.env.REACT_APP_API_URL}/PlayerPitching?year=${selectedYear}&stats=${statsParam}&orderBy=${sortConfig.key}&direction=${sortConfig.direction}`;
      
      console.log('Fetching from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 500) {
          throw new Error("Player pitching data requires specific implementation. Using mock data for now.");
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setPlayerData(data);
        setFilteredData(data);
      } else {
        // Generate mock data for demonstration
        setPlayerData(generateMockPlayerData());
        setFilteredData(generateMockPlayerData());
      }
    } catch (error) {
      console.error("Error fetching player data:", error);
      setError(error.message);
      // Use mock data as fallback
      const mockData = generateMockPlayerData();
      setPlayerData(mockData);
      setFilteredData(mockData);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock data for demonstration
  const generateMockPlayerData = () => {
    const teams = ['ATL', 'NYY', 'LAD', 'HOU', 'TB', 'SF', 'TOR', 'SD', 'CHC', 'PHI'];
    const names = [
      'Spencer Strider', 'Gerrit Cole', 'Walker Buehler', 'Justin Verlander', 
      'Shane Baz', 'Logan Webb', 'Alek Manoah', 'Yu Darvish',
      'Marcus Stroman', 'Zack Wheeler', 'Corbin Burnes', 'Sandy Alcantara'
    ];
    
    return names.map((name, i) => ({
      IDfg: 2000 + i,
      Name: name,
      Team: teams[i % teams.length],
      GS: Math.floor(Math.random() * 10) + 25,
      IP: (Math.random() * 50 + 150).toFixed(1),
      W: Math.floor(Math.random() * 8) + 8,
      L: Math.floor(Math.random() * 8) + 4,
      ERA: (Math.random() * 2.5 + 2.00).toFixed(2),
      WHIP: (Math.random() * 0.4 + 1.0).toFixed(2),
      SO: Math.floor(Math.random() * 100) + 180,
      BB: Math.floor(Math.random() * 30) + 35,
      H: Math.floor(Math.random() * 50) + 130,
      HR: Math.floor(Math.random() * 15) + 15,
      'K/9': (Math.random() * 4 + 8).toFixed(1),
      'BB/9': (Math.random() * 2 + 2).toFixed(1),
      'HR/9': (Math.random() * 0.8 + 0.8).toFixed(1),
      FIP: (Math.random() * 2 + 3.0).toFixed(2),
      xFIP: (Math.random() * 2 + 3.5).toFixed(2),
      WAR: (Math.random() * 4 + 2).toFixed(1),
      'K%': (Math.random() * 10 + 20).toFixed(1) + '%',
      'BB%': (Math.random() * 5 + 5).toFixed(1) + '%'
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
    if (["GS", "W", "L", "G", "CG", "SHO", "SV", "SO", "BB", "H", "HR", "R", "ER"].includes(key)) {
      return parseInt(data).toLocaleString();
    }
    if (["IP"].includes(key)) {
      return parseFloat(data).toFixed(1);
    }
    if (["ERA", "WHIP", "FIP", "xFIP", "SIERA", "WAR", "WPA"].includes(key)) {
      return parseFloat(data).toFixed(2);
    }
    if (["K/9", "BB/9", "HR/9"].includes(key)) {
      return parseFloat(data).toFixed(1);
    }
    return data;
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return ' ↕️';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const getStatTypeColor = (key) => {
    // Color coding for different stat types
    if (['ERA', 'WHIP', 'FIP', 'xFIP'].includes(key)) return 'text-danger'; // Lower is better
    if (['SO', 'K/9', 'WAR'].includes(key)) return 'text-success'; // Higher is better
    return '';
  };

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="display-6">⚾ Player Pitching Statistics</h1>
          <p className="text-muted">Comprehensive pitching statistics for MLB players</p>
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
              {filteredData.length} Pitchers
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
              <p className="mt-3">Loading pitching statistics...</p>
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
                          <td 
                            key={`${key}-${valueIdx}`} 
                            style={{ whiteSpace: 'nowrap' }}
                            className={getStatTypeColor(key)}
                          >
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
            `No pitchers found matching "${searchTerm}". Try a different search term.` :
            "No pitcher data available for the selected criteria."
          }
        </Alert>
      )}
    </Container>
  );
};

export default PlayerPitching;
