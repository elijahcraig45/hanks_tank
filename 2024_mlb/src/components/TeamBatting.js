import React, { useState, useEffect, useMemo } from "react";
import { Container, Row, Col } from "react-bootstrap";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import Table from "react-bootstrap/Table";
// import ScatterPlotMatrix from './ScatterPlotMatrix';

const TeamBatting = () => {
  const [teamData, setTeamData] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  useEffect(() => {
    // Construct the full endpoint URL
    const teamDataEndpoint = `${process.env.REACT_APP_API_URL}/TeamBatting`; // Adjust '/player-batting' as needed

    fetch(teamDataEndpoint)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        if (data && data.length > 0) {
          setTeamData(data);
        }
      })
      .catch((error) => console.error("Failed to fetch player data:", error));
  }, []);

  

  const sortedTeams = useMemo(() => {
    let sortableTeams = [...teamData]; // Clone to avoid directly mutating state
    if (sortConfig !== null) {
      sortableTeams.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === "ascending" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableTeams;
  }, [teamData, sortConfig]);

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  if (!teamData) {
    return <div>Loading...</div>; // or any other fallback UI
  }

  // Data formatter for table
  const formatData = (data, key) => {
    if (["HR", "RBI", "SB"].includes(key))
      return parseInt(data).toLocaleString();
    if (["AVG", "OBP", "SLG", "OPS"].includes(key))
      return parseFloat(data).toFixed(3);
    return data;
  };

  return (
    <Container class="container-md" className="pt-3">
      <Row style={{ height: "50px" }}>
        {" "}
        <h1>Team Batting</h1>
      </Row>
      <Row>
        <Col xs={12} style={{ overflow: "auto", maxHeight: "500px" }}>
          <Table striped bordered hover size="sm" className="mt-3">
            <thead>
              <tr>
                {teamData.length > 0 &&
                  Object.keys(teamData[0]).map((key) => (
                    <th
                      key={key}
                      onClick={() => requestSort(key)}
                      style={{ cursor: "pointer" }}
                    >
                      {key}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, idx) => (
                <tr key={idx}>
                  {Object.entries(team).map(([key, value], valueIdx) => (
                    <td key={valueIdx}>{formatData(value, key)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </Col>
      </Row>

      {/* <Row>
          <Col xs={12}>
            <Select
              options={teamOptions}
              value={selectedTeams}
              onChange={handleChange}
              components={{ Option }}
              isMulti
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </Col>
        </Row> */}
      <Row style={{ height: "100px" }}>
        {" "}
        <h2>Visualizations</h2>
      </Row>
      <Row>
        <Row>
          {/* HR Pie Chart */}
          <Col xs={12} md={6} lg={4}>
            <h4>Home Runs Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedTeams}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="Team" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="HR" fill="#82ca9d" name="Home Runs" />
              </BarChart>
            </ResponsiveContainer>
          </Col>

          {/* Batting Average (AVG) Bar Chart */}
          <Col xs={12} md={6} lg={4}>
            <h4>Team Batting Averages</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedTeams}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="Team" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="AVG" fill="#82ca9d" name="Batting Average" />
              </BarChart>
            </ResponsiveContainer>
          </Col>

          {/* On-base Plus Slugging (OPS) Line Chart */}
          <Col xs={12} md={6} lg={4}>
            <h4>OPS Trend Across Teams</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedTeams}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="Team" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="OPS" fill="#ff7300" name="OPS" />
              </BarChart>
            </ResponsiveContainer>
          </Col>

          {/* RBI Pie Chart */}
          <Col xs={12} md={6} lg={4}>
            <h4>Runs Batted In (RBI) Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedTeams}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="Team" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="RBI" fill="#a4de6c" name="Runs Batted In (RBI)" />
              </BarChart>
            </ResponsiveContainer>
          </Col>

          {/* Stolen Bases (SB) Bar Chart */}
          <Col xs={12} md={6} lg={4}>
            <h4>Stolen Bases Comparison</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sortedTeams}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="Team" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="SB" fill="#a4de6c" name="Stolen Bases" />
              </BarChart>
            </ResponsiveContainer>
          </Col>

          {/* Extra Base Hits (XBH) Calculation & Bar Chart */}
          <Col xs={12} md={6} lg={4}>
            <h4>Extra Base Hits (XBH)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={sortedTeams.map((team) => ({
                  ...team,
                  XBH: team["2B"] + team["3B"] + team.HR, // Assuming 2B, 3B, and HR keys exist
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="Team" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="XBH" fill="#4d4dff" name="Extra Base Hits" />
              </BarChart>
            </ResponsiveContainer>
          </Col>
        </Row>
      </Row>

      {/* <Row style={ {height:"100px"}}> <h2>Correlations</h2></Row>
      <Row>
        <Col>
          <ScatterPlotMatrix data={teamData} sortKey="Team" />
        </Col>
      </Row> */}
    </Container>
  );
};

export default TeamBatting;
