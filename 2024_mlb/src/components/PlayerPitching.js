import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table } from 'react-bootstrap';
import ScatterPlotMatrix from './ScatterPlotMatrix';

const PlayerPitching = () => {
  const [playerData, setPlayerData] = useState([]);

  useEffect(() => {
    // Construct the full endpoint URL
    const playerDataEndpoint = `${process.env.REACT_APP_API_URL}/PlayerPitching`; // Adjust '/player-batting' as needed
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
}, []);



  if (!playerData || playerData.length === 0) {
    return <div>Loading...</div>; // or any other fallback UI
  }

  const headers = Object.keys(playerData[0]);

  return (
    <Container class="container-md">
      <Row style={ {height:"50px"}}> <h1>Player Pitching</h1></Row>
      <Row className="my-4">
      <Col xs={12} style={{ overflow: 'auto', maxHeight: '500px' }}>
          
        <Table striped bordered hover className="mt-3">
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

      {/* Pass the loaded playerData and a key to sort by (e.g., 'Name') to the ScatterPlotMatrix */}
      <Row style={ {height:"50px"}}> <h2>Correlations</h2></Row>
      <Row>
        <Col>
          <ScatterPlotMatrix data={playerData} sortKey="Name" />
        </Col>
      </Row>
    </Container>
  );
};

export default PlayerPitching;
