import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import Table from 'react-bootstrap/Table';
// import ScatterPlotMatrix from './ScatterPlotMatrix';

const TeamPitching = () => {
  const [pitchingData, setPitchingData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  useEffect(() => {
    // Construct the full endpoint URL
    const teamDataEndpoint = `${process.env.REACT_APP_API_URL}/TeamPitching`; // Adjust '/player-batting' as needed

    fetch(teamDataEndpoint)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        if (data && data.length > 0) {
          setPitchingData(data);
        }
      })
      .catch((error) => console.error("Failed to fetch player data:", error));
  }, []);


  const sortedPitchingData = useMemo(() => {
    let sortableData = [...pitchingData];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [pitchingData, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const formatData = (data, key) => {
    if (['SO', 'W', 'L'].includes(key)) return parseInt(data).toLocaleString();
    if (['ERA', 'WHIP'].includes(key)) return parseFloat(data).toFixed(2);
    return data;
  };


  if (!pitchingData) {
    return <div>Loading...</div>; // or any other fallback UI
  }

  return (
    <Container class="container-md" className="pt-3">
      <Row style={ {height:"50px"}}> <h1>Team Pitching</h1></Row>
      <Row>
        <Col xs={12} style={{ overflow: 'auto', maxHeight: '500px' }}>
          <Table striped bordered hover size="sm" className="mt-3">
            <thead>
              <tr>
                {pitchingData.length > 0 && Object.keys(pitchingData[0]).map(key => (
                  <th key={key} onClick={() => requestSort(key)} style={{ cursor: 'pointer' }}>
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedPitchingData.map((team, idx) => (
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
      <Row style={ {height:"100px"}}> <h2>Visualizations</h2></Row>
      {/* Visualizations */}
      <Row>
        {/* ERA Bar Chart */}
        <Col xs={12} md={6} lg={4}>
          <h4>Team ERA</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedPitchingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ERA" fill="#8884d8" name="Earned Run Average" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        {/* WHIP Bar Chart */}
        <Col xs={12} md={6} lg={4}>
          <h4>Team WHIP</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedPitchingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="WHIP" fill="#82ca9d" name="Walks Plus Hits per Inning Pitched" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        {/* Strikeouts (SO) Bar Chart */}
        <Col xs={12} md={6} lg={4}>
          <h4>Team Strikeouts</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedPitchingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="SO" fill="#a4de6c" name="Strikeouts" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        {/* Walks (BB) Bar Chart */}
        <Col xs={12} md={6} lg={4}>
          <h4>Team Walks</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedPitchingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="BB" fill="#f4050f" name="Walks (BB)" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        {/* FIP  Bar Chart */}
        <Col xs={12} md={6} lg={4}>
          <h4>Team Field Independent Pitching</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedPitchingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="FIP" fill="#0f4d2e" name="Field Independent Pitching (FIP)" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        {/* BABIP Bar Chart */}
        <Col xs={12} md={6} lg={4}>
          <h4>Team BABIP</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sortedPitchingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="Team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="BABIP" fill="#0956ee" name="BABIP" />
            </BarChart>
          </ResponsiveContainer>
        </Col>

        {/* Additional charts can be added here based on the available data */}
      </Row>
      
      {/* <Row style={ {height:"100px"}}> <h2>Correlations</h2></Row>
      <Row>
        <Col>
          <ScatterPlotMatrix data={pitchingData} sortKey="Team" />
        </Col>
      </Row> */}
    </Container>
  );
};

export default TeamPitching;
