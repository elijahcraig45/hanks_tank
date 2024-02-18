import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table } from 'react-bootstrap';
import ScatterPlotMatrix from './ScatterPlotMatrix';

const PlayerBatting = () => {
  const [playerData, setPlayerData] = useState([]);

  useEffect(() => {
    fetch('/data/2023_PlayerBatting.json')
      .then(response => response.json())
      .then(data => {
        if (data && data.length > 0) {
          setPlayerData(data);
        }
      })
      .catch(error => console.error("Failed to fetch player data:", error));
  }, []);

  if (playerData.length === 0) {
    // Show a loading state, or simply return null to render nothing
    return <div>Loading...</div>;
  }

  const headers = Object.keys(playerData[0]);

  return (
    <Container class="container-md">
      <Row style={ {height:"50px"}}> <h1>Player Batting</h1></Row>
      <Row className="my-4">
      <Col xs={12} style={{ overflow: 'auto', maxHeight: '500px' }}>
          
        <Table striped bordered hover size="sm" className="mt-3">
          <thead>
            <tr>
              {headers.map(key => (
                <th key={key}>{key.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {playerData.map((player, idx) => (
              <tr key={idx}>
                {headers.map(key => (
                  <td key={`${key}-${idx}`}>{player[key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
        </Col>
      </Row>
      <Row style={ {height:"50px"}}> <h2>Correlations</h2></Row>
      {/* Pass the loaded playerData and a key to sort by (e.g., 'Name') to the ScatterPlotMatrix */}
      <Row>
        <Col>
          <ScatterPlotMatrix data={playerData} sortKey="Name" />
        </Col>
      </Row>
    </Container>
  );
};

export default PlayerBatting;
