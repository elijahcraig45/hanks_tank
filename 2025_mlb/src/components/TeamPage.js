import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Table, Dropdown, Form } from 'react-bootstrap';

const TeamPage = () => {
  const { teamAbbr } = useParams();
  const [teamData, setTeamData] = useState({});
  const [visibleBattingStats, setVisibleBattingStats] = useState(new Set([ 'AB', 'H', 'HR', 'RBI', 'AVG']));
  const [visiblePitchingStats, setVisiblePitchingStats] = useState(new Set([ 'ERA', 'SO', 'IP', 'ER', 'WHIP']));
  const [visibleTopBattingStats, setVisibleTopBattingStats] = useState(new Set(['Name', 'AB', 'H', 'HR', 'RBI', 'AVG']));
  const [visibleTopPitchingStats, setVisibleTopPitchingStats] = useState(new Set(['Name', 'ERA', 'SO', 'IP', 'ER', 'WHIP']));

  
  useEffect(() => {
    const fetchData = async () => {
      const apiUrl = `${process.env.REACT_APP_API_URL}/teamData?teamAbbr=${teamAbbr}`;
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setTeamData(data);
      } catch (error) {
        console.error("Failed to fetch team data:", error);
      }
    };
    fetchData();
  }, [teamAbbr]);

  const toggleStatVisibility = (setStatsFn, stat) => {
    setStatsFn(prevStats => {
      const updatedStats = new Set(prevStats);
      if (updatedStats.has(stat)) updatedStats.delete(stat);
      else updatedStats.add(stat);
      return updatedStats;
    });
  };
  


  const formatHeader = (header) => {
    return header.replace(/([A-Z])/g, ' $1')
                 .replace('_', ' ')
                 .trim();
  };

  const formatTime = (timeObj) => {
    if (!timeObj || typeof timeObj !== 'object') return 'N/A';
    const { hours, minutes } = timeObj;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${hours}:${formattedMinutes}`;
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
    const years = ['2025', '2024', '2023', '2022', '2021', '2020'];
    const allStats = Object.keys(teamData[`${category}_2025`] ? teamData[`${category}_2025`][0] : {}).concat(Array.from(visibleStats));

    return (
      <>
        <Row>
          <Col>
        <h2>{category}</h2>
        </Col>
        <Col xs="auto">
        {renderStatSelectionDropdown(visibleStats, category.includes('Batting') ? setVisibleBattingStats : setVisiblePitchingStats, allStats)}
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
              const data = teamData[dataKey];
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

  const renderTopBattersTable = () => {
    // Assuming 'topBatters' is the key in teamData for top batters stats
    const data = teamData.topBatters || [];
    const allStats = Object.keys(teamData[`topBatters`] ? teamData[`topBatters`][0] : {}).concat(Array.from(visibleTopBattingStats));

    return (
        <>
        <Row>
            <Col>
            <h2>Top Batters</h2>
            </Col>
            <Col xs="auto">
            {renderStatSelectionDropdown(visibleTopBattingStats, setVisibleTopBattingStats, allStats, 'topBatters')}
            </Col>
          </Row>
            <Table striped bordered hover className="mt-3">
                <thead>
                    <tr>
                        {Array.from(visibleTopBattingStats).map(stat => <th key={stat}>{stat}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        <tr key={index}>
                            {Array.from(visibleTopBattingStats).map(stat => <td key={stat}>{item[stat]}</td>)}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </>
    );
};

const renderTopPitchersTable = () => {
    // Assuming 'topPitchers' is the key in teamData for top pitchers stats
    const data = teamData.topPitchers || [];
    const allStats = Object.keys(teamData[`topPitchers`] ? teamData[`topPitchers`][0] : {}).concat(Array.from(visiblePitchingStats));

    return (
        <>
           <Row>
            <Col>
            <h2>Top Pitchers</h2>
            </Col>
            <Col xs="auto">
            {renderStatSelectionDropdown(visibleTopPitchingStats, setVisibleTopPitchingStats, allStats, 'topPitchers')}
            </Col>
          </Row>
            <Table striped bordered hover className="mt-3">
                <thead>
                    <tr>
                        {Array.from(visibleTopPitchingStats).map(stat => <th key={stat}>{stat}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, index) => (
                        <tr key={index}>
                            {Array.from(visibleTopPitchingStats).map(stat => <td key={stat}>{item[stat]}</td>)}
                        </tr>
                    ))}
                </tbody>
            </Table>
        </>
    );
};



  return (
    <Container className="mt-4">
      <Row className="justify-content-between align-items-center mb-4">
        <Col><h1>{`${teamAbbr} Team Stats`}</h1></Col>
      </Row>

      {/* Team Batting Stats Table */}
      <Row>
        <Col>
          {renderTable('teamBatting', visibleBattingStats)}
        </Col>
      </Row>

      {/* Team Pitching Stats Table */}
      <Row>
        <Col>
          {renderTable('teamPitching', visiblePitchingStats)}
        </Col>
      </Row>

      {/* Top Batting Stats Table */}
      <Row>
        <Col>
          {renderTopBattersTable()}
        </Col>
      </Row>

      {/* Top Pitching Stats Table */}
      <Row>
        <Col>
          {renderTopPitchersTable()}
        </Col>
      </Row>

       {/* Schedule and Record Section */}
      
<Row className="my-4">
  <Col>
    <h2>Schedule and Record</h2>
    <Table striped bordered hover size="sm">
      <thead>
        <tr>
          {teamData.scheduleAndRecord && teamData.scheduleAndRecord.length > 0 &&
            Object.keys(teamData.scheduleAndRecord[0])
            .map(stat => <th key={stat}>{formatHeader(stat)}</th>)}
        </tr>
      </thead>
      <tbody>
        {teamData.scheduleAndRecord && teamData.scheduleAndRecord.map((record, idx) => (
          <tr key={idx}>
            {Object.keys(record).map(stat => (
              <td key={`${stat}-${idx}`}>{typeof record[stat] === 'object' ? formatTime(record[stat]) : record[stat]}</td>
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

export default TeamPage;
