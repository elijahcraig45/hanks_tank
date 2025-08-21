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
import './styles/PlayerStats.css';

const PlayerPitching = () => {
  const [playerData, setPlayerData] = useState([]);
  const [teamData, setTeamData] = useState([]);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [availableStats, setAvailableStats] = useState([]);
  const [visibleStats, setVisibleStats] = useState(new Set([
    'Name', 'Team', 'G', 'GS', 'W', 'L', 'SV', 'IP', 'H', 'R', 'ER', 'HR', 'BB', 'SO', 'ERA', 'WHIP'
  ]));
  const [sortConfig, setSortConfig] = useState({ key: 'ERA', direction: "asc" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [showQualifiedOnly, setShowQualifiedOnly] = useState(false);

  // Pitching stats presets for MLB API data
  const statPresets = {
    'Essential': ['Name', 'Team', 'G', 'GS', 'W', 'L', 'ERA', 'WHIP', 'SO', 'IP'],
    'Traditional': ['Name', 'Team', 'W', 'L', 'ERA', 'GS', 'SV', 'IP', 'H', 'R', 'ER', 'HR', 'BB', 'SO'],
    'Rate Stats': ['Name', 'Team', 'ERA', 'WHIP', 'K/9', 'BB/9', 'HR/9', 'BF'],
    'Control': ['Name', 'Team', 'BB', 'SO', 'HBP', 'WP', 'BK', 'BB/9', 'K/9'],
    'Workload': ['Name', 'Team', 'G', 'GS', 'IP', 'BF', 'H', 'R', 'ER']
  };

  const fetchAvailableStats = async () => {
    try {
      // For Phase 1, we'll use a predefined set of MLB API pitching stats
      const mlbApiStats = [
        'Name', 'Team', 'G', 'GS', 'W', 'L', 'SV', 'IP', 'H', 'R', 'ER', 
        'HR', 'BB', 'SO', 'ERA', 'WHIP', 'K/9', 'BB/9', 'HR/9', 'BF', 
        'HBP', 'WP', 'BK'
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
      console.log(`🔄 PlayerPitching: Fetching ${selectedYear} player and team pitching data`);
      
      // Fetch both player and team data in parallel
      const playerUrl = `${process.env.REACT_APP_API_URL}/player-pitching?year=${selectedYear}&limit=1000&sortStat=${sortConfig.key}&direction=${sortConfig.direction}`;
      const teamUrl = `${process.env.REACT_APP_API_URL}/team-pitching?year=${selectedYear}`;
      
      console.log(`⚾ PlayerPitching: Fetching player data from:`, playerUrl);
      console.log(`⚾ PlayerPitching: Fetching team data from:`, teamUrl);
      
      const [playerResponse, teamResponse] = await Promise.all([
        fetch(playerUrl),
        fetch(teamUrl)
      ]);
      
      if (!playerResponse.ok) {
        throw new Error(`HTTP ${playerResponse.status}: Failed to fetch player pitching data`);
      }
      
      const playerData = await playerResponse.json();
      
      // Team data is optional - if it fails, we'll use fallback
      let teamDataResult = [];
      if (teamResponse.ok) {
        teamDataResult = await teamResponse.json();
        console.log(`✅ PlayerPitching: Received ${teamDataResult.length} teams`);
        setTeamData(teamDataResult);
      } else {
        console.warn('⚠️ PlayerPitching: Team data fetch failed, using fallback');
      }
      
      if (Array.isArray(playerData) && playerData.length > 0) {
        console.log(`✅ PlayerPitching: Received ${playerData.length} players`);
        setPlayerData(playerData);
        setFilteredData(playerData);
      } else {
        console.warn('⚠️ PlayerPitching: No data received, using fallback');
        // Generate mock data for demonstration if no data
        const mockData = generateMockPlayerData();
        setPlayerData(mockData);
        setFilteredData(mockData);
      }
    } catch (error) {
      console.error("❌ PlayerPitching: Error fetching player data:", error);
      setError(`Failed to load player pitching data: ${error.message}`);
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

  // Determine if a pitcher is qualified for ERA title (1 IP per team game)
  const isQualifiedPitcher = (player) => {
    const inningsPitched = parseFloat(player.IP) || 0;
    
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
        console.log(`⚾ Found ${player.Team} games played: ${teamGamesPlayed}`);
      }
    }
    
    const requiredIP = 1.0 * teamGamesPlayed;
    return inningsPitched >= requiredIP;
  };
  useEffect(() => {
    fetchAvailableStats();
  }, []);

  useEffect(() => {
    fetchPlayerData();
  }, [selectedYear, visibleStats, sortConfig]);

  useEffect(() => {
    // Filter data based on search term and qualification status
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
      filtered = filtered.filter(player => isQualifiedPitcher(player));
    }
    
    setFilteredData(filtered);
  }, [searchTerm, playerData, showQualifiedOnly]);

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
                  {["2020", "2021", "2022", "2023", "2024", "2025"].map(year => (
                    <Dropdown.Item key={year} onClick={() => setSelectedYear(year)}>
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
                  id="qualified-switch-pitching"
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
                              <span>
                                <Link to={`/player/${player.IDfg}`} className="text-decoration-none fw-bold player-name">
                                  {value}
                                </Link>
                                {isQualifiedPitcher(player) && (
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
            `No pitchers found matching "${searchTerm}". Try a different search term.` :
            "No pitcher data available for the selected criteria."
          }
        </Alert>
      )}
    </Container>
  );
};

export default PlayerPitching;
