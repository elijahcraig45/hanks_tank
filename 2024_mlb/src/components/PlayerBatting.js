import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Dropdown, Form } from 'react-bootstrap';
import {Link } from "react-router-dom"; // Assuming React Router is used for routing


const PlayerBatting = () => {
  const [playerData, setPlayerData] = useState([]);
  const [selectedYear, setSelectedYear] = useState('2024');
  const [availableStats, setAvailableStats] = useState([]);
  const [visibleStats, setVisibleStats] = useState(new Set(['Name','G','OPS', 'AB',	'PA',	'H'	,'HR'	,'R',	'RBI'	,'BB'	,'SO',	'AVG', "Team"])); // Assuming these are the "essentials"
  const [sortConfig, setSortConfig] = useState({ key: 'OPS', direction: "desc" });

  useEffect(() => {
    // Fetch available stats on component mount
    const fetchAvailableStats = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/PlayerBatting/avaliableStats`);
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
    const playerDataEndpoint = `${process.env.REACT_APP_API_URL}/PlayerBatting?year=${selectedYear}&stats=${encodedStats}&orderBy=${sortConfig.key}&direction=${sortConfig.direction}`;
    console.log('Fetching from:', playerDataEndpoint);

    fetch(playerDataEndpoint)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data && data.length > 0) {
        setPlayerData(data);
      }
    })
    .catch(error => console.error("Failed to fetch player data:", error));
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

  return (
    <Container className="container-md">
      <Row className="justify-content-between align-items-center mb-3">
        <Col>
          <h1>Player Batting</h1>
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
        <Col xs={12} style={{ overflow: "auto" }}>
          <Table striped bordered hover size="sm" className="mt-3">
            <thead>
              <tr>
                {playerData.length > 0 && Object.keys(playerData[0])
                  .filter(key => visibleStats.has(key))
                  .map(key => (
                    <th key={key} onClick={() => requestSort(key)} style={{ cursor: "pointer" }}>
                      {key}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {playerData.map((team, idx) => (
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
    </Container>
  );
};

export default PlayerBatting;
