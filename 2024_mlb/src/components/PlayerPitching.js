import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Dropdown, Form } from 'react-bootstrap';

const PlayerPitching = () => {
  const [playerData, setPlayerData] = useState([]);
  const [selectedYear, setSelectedYear] = useState('2023');
  const [visibleStats, setVisibleStats] = useState(new Set(['Name', 'Team', 'ERA', 'SO', 'G', 'IP', 'H', 'ER', 'HR', 'BB', 'K/9', 'BB/9', "WHIP"])); // Assuming these are the "essentials"

  useEffect(() => {
    const playerDataEndpoint = `${process.env.REACT_APP_API_URL}/PlayerPitching?year=${selectedYear}`;
    console.log('Fetching from:', playerDataEndpoint);

    fetch(playerDataEndpoint)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log('Received data:', data);
      if (data && data.length > 0) {
        setPlayerData(data);
      }
    })
    .catch(error => console.error("Failed to fetch player data:", error));
  }, [selectedYear]);

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

  const headers = playerData.length > 0 ? Object.keys(playerData[0]) : [];

  return (
    <Container className="container-md">
      <Row className="my-4 justify-content-between">
        <Col xs="auto">
          <h1>Player Pitching</h1>
        </Col>
        <Col xs="auto">
          <Dropdown>
            <Dropdown.Toggle variant="secondary" id="dropdown-year">
              Year: {selectedYear}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {[2019, 2020, 2021, 2022, 2023, 2024].map(year => (
                <Dropdown.Item key={year} onClick={() => setSelectedYear(year.toString())}>
                  {year}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Col>
        <Col xs="auto">
          <Dropdown>
            <Dropdown.Toggle variant="info" id="dropdown-stats">
              Customize Stats
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {headers.map(stat => (
                <Dropdown.ItemText key={stat}>
                  <Form.Check 
                    type="checkbox"
                    label={stat.toUpperCase()}
                    checked={visibleStats.has(stat)}
                    onChange={() => toggleStatVisibility(stat)}
                  />
                </Dropdown.ItemText>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>
      <Row className="my-4">
        <Col xs={12} style={{ overflow: 'auto', maxHeight: '500px' }}>
          <Table striped bordered hover size="sm" className="mt-3">
            <thead>
              <tr>
                {headers.filter(header => visibleStats.has(header)).map(key => (
                  <th key={key}>{key.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerData.map((player, idx) => (
                <tr key={idx}>
                  {headers.filter(header => visibleStats.has(header)).map(key => (
                    <td key={`${key}-${idx}`}>{player[key]}</td>
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

export default PlayerPitching;
