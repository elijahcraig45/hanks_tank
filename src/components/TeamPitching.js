import React, { useState, useEffect, useCallback } from "react";
import { 
  Container, 
  Row, 
  Col, 
  Dropdown, 
  Form, 
  Alert, 
  Spinner, 
  Card, 
  Button, 
  Badge, 
  InputGroup,
  Table 
} from "react-bootstrap";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, ScatterChart, Scatter
} from "recharts";
import { Link } from "react-router-dom";
import "./styles/TeamStats.css";

const TeamPitching = () => {
  const [teamData, setTeamData] = useState([]);
  const [selectedYear, setSelectedYear] = useState("2024"); // Updated to use 2024 season
  const [availableStats, setAvailableStats] = useState([]);
  const [visibleStats, setVisibleStats] = useState(new Set([
    "Team", "G", "GS", "IP", "ERA", "WHIP", "SO", "BB", "H", "HR", "W", "L"
  ]));
  const [sortConfig, setSortConfig] = useState({ key: 'ERA', direction: "asc" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [chartType, setChartType] = useState('bar');
  const [chartStat, setChartStat] = useState('ERA');

  // Team colors for visualizations
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

  // Available stats based on MLB API team pitching data structure
  const statPresets = {
    'Essential': ['Team', 'G', 'GS', 'IP', 'ERA', 'WHIP', 'SO', 'W', 'L'],
    'Traditional': ['Team', 'W', 'L', 'W-L%', 'ERA', 'GS', 'CG', 'SHO', 'SV', 'IP', 'H', 'R', 'ER', 'HR', 'BB', 'SO'],
    'Advanced': ['Team', 'WHIP', 'BF', 'HBP', 'WP', 'BK'],
    'Relief': ['Team', 'SV', 'SVO', 'BS', 'HLD', 'GF'],
    'Rate Stats': ['Team', 'ERA', 'WHIP', 'H', 'BB', 'HR', 'SO']
  };

  const fetchAvailableStats = async () => {
    try {
      // For Phase 1, we'll use a predefined set of MLB API stats
      // This matches what's available from the MLB Stats API team pitching leaderboards
      const mlbApiStats = [
        'Team', 'G', 'GS', 'W', 'L', 'W-L%', 'ERA', 'IP', 'H', 'R', 'ER', 'HR', 'BB', 'SO',
        'WHIP', 'BF', 'HBP', 'WP', 'BK', 'SV', 'SVO', 'BS', 'HLD', 'GF', 'CG', 'SHO'
      ];
      setAvailableStats(mlbApiStats);
    } catch (error) {
      console.error("Error fetching available stats:", error);
      setError("Failed to load available statistics");
    }
  };

  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the new team-pitching endpoint
      const url = `${process.env.REACT_APP_API_URL}/team-pitching?year=${selectedYear}&limit=30&sortStat=${sortConfig.key}&direction=${sortConfig.direction}`;
      
      console.log(`⚾ TeamPitching: Fetching ${selectedYear} data from:`, url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ TeamPitching: Received ${data.length} teams for ${selectedYear}`, data);
        setTeamData(data);
        setFilteredData(data);
      } else {
        console.log(`⚠️ TeamPitching: No data available for ${selectedYear}`);
        setTeamData([]);
        setError(`No team pitching data available for ${selectedYear}`);
      }
    } catch (error) {
      console.error(`❌ TeamPitching: Error fetching ${selectedYear} data:`, error);
      setError(`Failed to load team pitching data: ${error.message}`);
      setTeamData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

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

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  useEffect(() => {
    // Apply sorting and filtering when data or sort config changes
    let processedData = sortData(teamData);
    
    if (searchTerm) {
      processedData = processedData.filter(team => 
        team.Team?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredData(processedData);
  }, [teamData, sortData, searchTerm]);

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
    if (["GS", "W", "L", "CG", "SHO", "SV", "SO", "BB", "H", "HR", "R", "ER"].includes(key)) {
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
    // Color coding for different stat types (lower is better for pitching)
    if (['ERA', 'WHIP', 'FIP', 'xFIP', 'BB/9', 'HR/9'].includes(key)) return 'text-success'; // Lower is better
    if (['SO', 'K/9', 'WAR', 'K%'].includes(key)) return 'text-primary'; // Higher is better
    return '';
  };

  const getChartData = () => {
    return filteredData.map(team => ({
      ...team,
      color: teamColors[team.Team] || '#8884d8'
    }));
  };

  const renderChart = () => {
    const data = getChartData();
    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-2 border rounded shadow">
            <p className="fw-bold">{`Team: ${label}`}</p>
            <p style={{ color: payload[0].color }}>
              {`${chartStat}: ${formatData(payload[0].value, chartStat)}`}
            </p>
          </div>
        );
      }
      return null;
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Team" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey={chartStat} stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        );
      case 'scatter':
        return (
          <ScatterChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Team" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Scatter dataKey={chartStat} fill="#8884d8" />
          </ScatterChart>
        );
      default:
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Team" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={chartStat} fill="#8884d8" />
          </BarChart>
        );
    }
  };

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h1 className="display-6">🥎 Team Pitching Statistics</h1>
          <p className="text-muted">Comprehensive team pitching statistics and analysis</p>
          <Alert variant="info" className="mb-0">
            <div className="d-flex align-items-center">
              <i className="bi bi-calendar3 me-2"></i>
              <strong>Currently viewing {selectedYear} season data</strong>
              {selectedYear === "2025" && (
                <Badge bg="success" className="ms-2">Current Season</Badge>
              )}
            </div>
          </Alert>
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
              <Dropdown className="year-dropdown">
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
              <Form.Label>Search Teams</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  placeholder="Search team abbreviations..."
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
                onClick={fetchTeamData} 
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
              {filteredData.length} Teams
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
      <Card className="mb-4">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Loading pitching statistics...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover className="mb-0">
                <thead className="table-dark">
                  <tr>
                    {filteredData.length > 0 && Object.keys(filteredData[0])
                      .filter(key => visibleStats.has(key))
                      .map(key => (
                        <th 
                          key={key} 
                          onClick={() => requestSort(key)} 
                          className="sortable-header user-select-none"
                          style={{ cursor: "pointer", whiteSpace: 'nowrap' }}
                        >
                          {key}{getSortIcon(key)}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((team, idx) => (
                    <tr key={`team-${idx}`}>
                      {Object.entries(team)
                        .filter(([key]) => visibleStats.has(key))
                        .map(([key, value], valueIdx) => (
                          <td 
                            key={`${key}-${valueIdx}`} 
                            style={{ whiteSpace: 'nowrap' }}
                            className={getStatTypeColor(key)}
                          >
                            {key === "Team" ? (
                              <Link to={`/team/${value}`} className="text-decoration-none fw-bold">
                                <span 
                                  className="team-badge" 
                                  style={{ backgroundColor: teamColors[value] || '#6c757d' }}
                                >
                                  {value}
                                </span>
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

      {/* Visualization Section */}
      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col>
              <h5 className="mb-0">📊 Pitching Data Visualization</h5>
            </Col>
            <Col xs="auto">
              <Row className="g-2">
                <Col>
                  <Form.Select 
                    size="sm" 
                    value={chartType} 
                    onChange={(e) => setChartType(e.target.value)}
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="scatter">Scatter Plot</option>
                  </Form.Select>
                </Col>
                <Col>
                  <Form.Select 
                    size="sm" 
                    value={chartStat} 
                    onChange={(e) => setChartStat(e.target.value)}
                  >
                    {Array.from(visibleStats).filter(stat => stat !== 'Team').map(stat => (
                      <option key={stat} value={stat}>{stat}</option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              {renderChart()}
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-5">
              <p>No data available for visualization</p>
            </div>
          )}
        </Card.Body>
      </Card>

      {filteredData.length === 0 && !loading && (
        <Alert variant="info" className="mt-3">
          <Alert.Heading>No Results Found</Alert.Heading>
          {searchTerm ? 
            `No teams found matching "${searchTerm}". Try a different search term.` :
            "No pitching data available for the selected criteria."
          }
        </Alert>
      )}
    </Container>
  );
};

export default TeamPitching;
