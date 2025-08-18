import React, { useState, useEffect } from "react";
import { Container, Row, Col, Dropdown, Form } from "react-bootstrap";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import Table from "react-bootstrap/Table";
import {Link } from "react-router-dom"; // Assuming React Router is used for routing


const TeamPitching = () => {
  const [teamData, setTeamData] = useState([]);
  const [selectedYear, setSelectedYear] = useState("2025");
  const [availableStats, setAvailableStats] = useState([]);
  const [visibleStats, setVisibleStats] = useState(new Set(["Team", "HR", "AVG",'H'	,'HR'	,'R','ERA', 'IP', 'H', 'ER', 'K/9', 'BB/9', "WHIP"	,'BB'	,'SO'])); // Initial visible stats
  const [sortConfig, setSortConfig] = useState({ key: 'ERA', direction: "asc" });

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
    const teamDataEndpoint = `${process.env.REACT_APP_API_URL}/TeamPitching?year=${selectedYear}&stats=${encodedStats}&orderBy=${sortConfig.key}&direction=${sortConfig.direction}`;
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
      .catch(error => console.error("Failed to fetch team Pitching data:", error));
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
          <h1>Team Pitching</h1>
        </Col>
        <Col xs="auto">
          <Row>
            <Col>
          <Dropdown>
            <Dropdown.Toggle variant="secondary" id="dropdown-year">
              Year: {selectedYear}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {["2020", "2021", "2022", "2023", "2024", "2025"].map(year => (
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
          <h4>Home Runs (HR) Allowed</h4>
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
          <h4>Batting Average Allowed (AVG)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="AVG" fill="#82ca9d" name="Pitching Average" />
            </BarChart>
          </ResponsiveContainer>
        </Col>
                {/* Earned Run Average (ERA) Bar Chart */}
                <Col xs={12} md={6} lg={4} className="mb-4">
          <h4>Earned Run Average (ERA)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ERA" fill="#8884d8" name="Earned Run Average" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        {/* Strikeouts (SO) Bar Chart */}
        <Col xs={12} md={6} lg={4} className="mb-4">
          <h4>Strikeouts (SO)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="SO" fill="#82ca9d" name="Strikeouts" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        {/* Walks Plus Hits Per Innings Pitched (WHIP) Bar Chart */}
        <Col xs={12} md={6} lg={4} className="mb-4">
          <h4>WHIP</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="WHIP" fill="#ffc658" name="Walks Plus Hits Per Innings Pitched" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        {/* Saves (SV) Bar Chart */}
        <Col xs={12} md={6} lg={4} className="mb-4">
          <h4>Saves (SV)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="SV" fill="#20c997" name="Saves" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        

      </Row>
      
      </Row>
    </Container>
  );
};

export default TeamPitching;
