import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col, Dropdown, Form } from "react-bootstrap";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import Table from "react-bootstrap/Table";
import {Link } from "react-router-dom"; // Assuming React Router is used for routing

const TeamBatting = () => {
  const [teamData, setTeamData] = useState([]);
  const [selectedYear, setSelectedYear] = useState("2024");
  const [availableStats, setAvailableStats] = useState([]);
  const [visibleStats, setVisibleStats] = useState(new Set(["Team", "HR", "AVG", "RBI", "OPS", 'H', 'HBP','HR'	,'R',	'RBI'	,'BB'	,'SO',	'AVG',])); // Initial visible stats
  const [sortConfig, setSortConfig] = useState({ key: 'OPS', direction: "desc" });

  useEffect(() => {
    // Fetch available stats on component mount
    const fetchAvailableStats = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/TeamBatting/avaliableStats`);
        if (!response.ok) {
          throw new Error("Failed to fetch available stats");
        }
        const stats = await response.json();
        setAvailableStats(stats);
      } catch (error) {
        console.error("Error fetching available stats:", error);
      }
    };

    fetchAvailableStats();
  }, []);


  useEffect(() => {
    // Replace '/' with '%2f' in each stat and join with a comma
    const encodedStats = Array.from(visibleStats).map(stat => stat.replace('/', '%2f')).join(',');
    const teamDataEndpoint = `${process.env.REACT_APP_API_URL}/TeamBatting?year=${selectedYear}&stats=${encodedStats}&orderBy=${sortConfig.key}&direction=${sortConfig.direction}`;
    fetch(teamDataEndpoint)
      .then(response => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then(data => {
        if (data && data.length > 0) {
          setTeamData(data);
        }
      })
      .catch(error => console.error("Failed to fetch team batting data:", error));
  }, [selectedYear, visibleStats, sortConfig]);


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

  const formatData = (data, key) => {
    if (["HR", "RBI", "SB"].includes(key)) return parseInt(data).toLocaleString();
    if (["AVG", "OBP", "SLG", "OPS"].includes(key)) return parseFloat(data).toFixed(3);
    return data;
  };

  if (!teamData.length) {
    return <div>Loading...</div>;
  }

  return (
    <Container className="container-md pt-3">
      <Row className="justify-content-between align-items-center mb-3">
        <Col>
          <h1>Team Batting</h1>
        </Col>
        <Col xs="auto">
          <Row>
            <Col>
          <Dropdown>
            <Dropdown.Toggle variant="secondary" id="dropdown-year">
              Year: {selectedYear}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {["2019", "2020", "2021", "2022", "2023", "2024"].map(year => (
                <Dropdown.Item key={year} onClick={() => setSelectedYear(year)}>
                  {year}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          </Col> <Col>
          <Dropdown>
                <Dropdown.Toggle variant="info">Choose Stats</Dropdown.Toggle>
                <Dropdown.Menu>
                  {availableStats.map(key => (
                    <Dropdown.ItemText key={key}>
                      <Form.Check
                        type="checkbox"
                        label={key}
                        checked={visibleStats.has(key)}
                        onChange={() => toggleStatVisibility(key)}
                      />
                    </Dropdown.ItemText>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
          </Col>
          </Row>
        </Col>
      </Row>
      <Row>
        <Col xs={12} style={{ overflow: "auto", maxHeight: "500px" }}>
          <Table striped bordered hover size="sm" className="mt-3">
            <thead>
              <tr>
                {teamData.length > 0 && Object.keys(teamData[0])
                  .filter(key => visibleStats.has(key))
                  .map(key => (
                    <th key={key} onClick={() => requestSort(key)} style={{ cursor: "pointer" }}>
                      {key}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {teamData.map((team, idx) => (
                <tr key={idx}>
                  {Object.entries(team)
                    .filter(([key]) => visibleStats.has(key))
                    .map(([key, value], valueIdx) => (
                      <td key={`${key}-${valueIdx}`}>
                      {key === "Team" ? <Link to={`/team/${team.Team}`}>{value}</Link> : formatData(value, key)}
                    </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>
      </Row>
      {/* Visualizations updated to reflect the format and year selection */}
      <Row className="mt-4">
              {/* Visualizations */}
      <Row>
        {/* Home Runs (HR) Bar Chart */}
        <Col xs={12} md={6} lg={4} className="mb-4">
          <h4>Home Runs (HR)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="HR" fill="#8884d8" name="Home Runs" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        {/* Batting Average (AVG) Bar Chart */}
        <Col xs={12} md={6} lg={4} className="mb-4">
          <h4>Batting Average (AVG)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="AVG" fill="#82ca9d" name="Batting Average" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        {/* Runs Batted In (RBI) Bar Chart */}
        <Col xs={12} md={6} lg={4} className="mb-4">
          <h4>Runs Batted In (RBI)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="RBI" fill="#ffc658" name="Runs Batted In" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        {/* On-base Plus Slugging (OPS) Bar Chart */}
        <Col xs={12} md={6} lg={4} className="mb-4">
          <h4>On-base Plus Slugging (OPS)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="OPS" fill="#fa8072" name="On-base Plus Slugging" />
            </BarChart>
          </ResponsiveContainer>
        </Col>
              {/* Stolen Bases (SB) Bar Chart */}
      <Col xs={12} md={6} lg={4} className="mb-4">
        <h4>Stolen Bases (SB)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={teamData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Team" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="SB" fill="#4287f5" name="Stolen Bases" />
          </BarChart>
        </ResponsiveContainer>
      </Col>

      {/* On-Base Percentage (OBP) Bar Chart */}
      <Col xs={12} md={6} lg={4} className="mb-4">
        <h4>On-Base Percentage (OBP)</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={teamData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="Team" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="OBP" fill="#20c997" name="On-Base Percentage" />
          </BarChart>
        </ResponsiveContainer>
      </Col>

      </Row>
      
      </Row>
    </Container>
  );
};

export default TeamBatting;
