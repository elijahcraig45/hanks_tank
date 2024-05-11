import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Table, Dropdown, Form } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const PlayerPage = () => {
  const [playerData, setPlayerData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [visibleBattingStats, setVisibleBattingStats] = useState(new Set([ 'Team','AB', 'H', 'HR', 'RBI', 'AVG', "SO", "BB", "BABIP"]));
  const [visiblePitchingStats, setVisiblePitchingStats] = useState(new Set([ 'Team','ERA',"G", 'W', "L" ,'IP', 'ER', 'SO', 'BB', 'WHIP']));

  const query = useQuery();
  const playerName = query.get('name');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true); // Start loading
      const encodedName = encodeURIComponent(playerName);
      const apiUrl = `${process.env.REACT_APP_API_URL}/player-stats?name=${encodedName}`;
      console.log(apiUrl)
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        console.log(data)
        setPlayerData(data);
      } catch (error) {
        console.error("Failed to fetch player data:", error);
      } finally {
        setIsLoading(false); // Stop loading regardless of success or failure
      }
    };
    fetchData();
  }, [playerName]);

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
  
    // Check if there is data for any year for the specific category (batting or pitching)
    const hasDataForAnyYear = years.some(year => playerData[`${category}_${year}`] && Array.isArray(playerData[`${category}_${year}`]) && playerData[`${category}_${year}`].length > 0);
    let dataYears = [];
    for (let i = 0; i < years.length; i++) {
      let tableName = `${category}_${years[i]}`
      if (playerData[tableName] != null  && playerData[tableName].length > 0) {
        dataYears.push(years[i]);
      }
    }
    console.log(dataYears.toString());
    
    // Early exit if there's no data for any year for the specific category
    if (!hasDataForAnyYear) {
      return (
        <div>
          <h2>{`${category.includes('Batting') ? 'Batting' : 'Pitching'} Stats`}</h2>
          <p>No data available</p>
        </div>
      );
    }
    let latestYear = dataYears[0];
    const allStats = Object.keys(playerData[`${category}_${latestYear}`] ? playerData[`${category}_${latestYear}`][0] : {}).concat(Array.from(visibleStats));
  
    return (
      <>
        <Row>
          <Col>
            <h2>{`${category.includes('Batting') ? 'Batting' : 'Pitching'} Stats`}</h2>
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
              if (dataYears.includes(year)) {
                const dataKey = `${category}_${year}`;
                const data = playerData[dataKey];
                if (!data || !Array.isArray(data) || data.length === 0) {
                  return (
                    <tr key={`no-data-${year}`}>
                      <td>{year}</td>
                      <td colSpan={visibleStats.size}>No data available</td>
                    </tr>
                  );
                }
                return data.map((item, index) => (
                  <tr key={`${year}-${index}`}>
                    <td>{year}</td>
                    {Array.from(visibleStats).map(stat => <td key={stat}>{item[stat]}</td>)}
                  </tr>
                ));
              } else {
                return  (
                  <tr key={`${year}-null`}>
                    <td>{year}</td>
                    {<td key={year-null}>No data available</td>}
                  </tr>
                );
              }
              
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
          <h1>{`Player Stats: ${playerName}`}</h1>
        </Col>
      </Row>

     {renderTable('playerBatting', visibleBattingStats)}
     {renderTable('playerPitching', visiblePitchingStats)}
      {/* Add additional years and pitching stats as needed */}
    </Container>
  );
};

export default PlayerPage;
