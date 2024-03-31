import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Table, Dropdown, Form } from 'react-bootstrap';

const PlayerPage = () => {
  const { firstName, lastName } = useParams();
  const [playerData, setPlayerData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [visibleBattingStats, setVisibleBattingStats] = useState(new Set([ 'Team','AB', 'H', 'HR', 'RBI', 'AVG', "SO", "BB", "BABIP"]));
  const [visiblePitchingStats, setVisiblePitchingStats] = useState(new Set([ 'Team','ERA',"G", 'W', "L" ,'IP', 'ER', 'SO', 'BB', 'WHIP']));

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); // Start loading
      const apiUrl = `${process.env.REACT_APP_API_URL}/player-stats/${firstName}/${lastName}`;
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setPlayerData(data);
      } catch (error) {
        console.error("Failed to fetch player data:", error);
      } finally {
        setIsLoading(false); // Stop loading regardless of success or failure
      }
    };
    fetchData();
  }, [firstName, lastName]);

  if (isLoading) {
    return (
      <Container className="mt-4">
        <Row>
          <Col>
            <h1>Loading player stats...</h1>
          </Col>
        </Row>
      </Container>
    );
  }

  const toggleStatVisibility = (setStatsFn, stat) => {
    setStatsFn(prevStats => {
      const updatedStats = new Set(prevStats);
      if (updatedStats.has(stat)) updatedStats.delete(stat);
      else updatedStats.add(stat);
      return updatedStats;
    });
  };

  const renderStatSelectionDropdown = (visibleStats, setStatsFn, allStats, category) => (
    <Dropdown className="mb-3">
      <Dropdown.Toggle variant="info" id={`dropdown-${category}`}>
        Choose Stats
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {allStats.map(stat => (
          // Use "div" instead of "Dropdown.Item" for custom handling
          <div key={stat} className="dropdown-item">
            <Form.Check 
              type="checkbox" 
              label={stat}
              checked={visibleStats.has(stat)}
              onChange={(e) => {
                // Toggle stat visibility
                toggleStatVisibility(setStatsFn, stat);
                // Stop propagation to keep dropdown open
                e.stopPropagation();
              }}
              // Clicks on the checkbox itself should not close the dropdown
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
  
  
  


  const renderTable = (category, visibleStats) => {
    // Define the years you're interested in
    const years = ['2024', '2023', '2022', '2021', '2020', '2019'];
  
    // Early exit if there's no data for any year
    if (years.every(year => !playerData[`${category}_${year}`] || playerData[`${category}_${year}`].length === 0)) {
      return null;
    }
  
    const allStats = Object.keys(playerData[`${category}_2024`] ? playerData[`${category}_2024`][0] : {}).concat(Array.from(visibleStats));
  
    return (
      <>
        <Row>
          <Col>
            <h2>{`${category} Stats`}</h2>
          </Col>
          <Col xs="auto">
            {renderStatSelectionDropdown(visibleStats, category.includes('Batting') ? setVisibleBattingStats : setVisiblePitchingStats, allStats, category)}
          </Col>
        </Row>
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              {['Year', ...Array.from(visibleStats)].map(stat => <th key={stat}>{stat}</th>)}
            </tr>
          </thead>
          <tbody>
            {years.map(year => {
              const dataKey = `${category}_${year}`;
              const data = playerData[dataKey];
              if (!data) return null;
              return data.map((item, index) => (
                <tr key={`${year}-${index}`}>
                  <td>{year}</td>
                  {Array.from(visibleStats).map(stat => <td key={stat}>{item[stat]}</td>)}
                </tr>
              ));
            })}
          </tbody>
        </Table>
      </>
    );
  };
  

  
  return (
    <Container className="mt-4">
      <Row>
        <Col>
          <h1>{`Player Stats: ${firstName} ${lastName}`}</h1>
        </Col>
      </Row>

      {renderTable('playerBatting', visibleBattingStats)}
     {renderTable('playerPitching', visiblePitchingStats)}
      {/* Add additional years and pitching stats as needed */}
    </Container>
  );
};

export default PlayerPage;
