import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Table, Dropdown, Form } from 'react-bootstrap';

const TeamPage = () => {
  const { teamAbbr } = useParams();
  const [teamData, setTeamData] = useState({
    teamBatting: [],
    teamPitching: [],
    topBatters: [],
    topPitchers: [],
    scheduleAndRecord: []
  });
  const [selectedYear, setSelectedYear] = useState('2024');
  const [visibleStats, setVisibleStats] = useState(new Set([
    'Name', 'Team', 'ERA', 'SO', 'G', 'IP', 'H', 'ER', 'HR', 'BB', 'K/9', 'BB/9', 'WHIP',
    'AB', 'PA', 'H', 'HR', 'R', 'RBI', 'BB', 'SO', 'AVG', 'SB'
  ]));

  useEffect(() => {
    const fetchData = async () => {
      const apiUrl = `${process.env.REACT_APP_API_URL}/teamData?teamAbbr=${teamAbbr}&year=${selectedYear}`;
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
  }, [teamAbbr, selectedYear]);

  const toggleStatVisibility = stat => {
    setVisibleStats(prevStats => {
      const newStats = new Set(prevStats);
      if (newStats.has(stat)) newStats.delete(stat);
      else newStats.add(stat);
      return newStats;
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

  return (
    <Container className="mt-4">
      <Row className="justify-content-between align-items-center mb-4">
        <Col><h1>{teamAbbr} Team Page - {selectedYear}</h1></Col>
        <Col xs="auto">
          <Dropdown>
            <Dropdown.Toggle variant="secondary">Select Year</Dropdown.Toggle>
            <Dropdown.Menu>
              {[2024, 2023, 2022, 2021, 2020, 2019].map(year => (
                <Dropdown.Item key={year} onClick={() => setSelectedYear(year.toString())}>
                  {year}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Col>
        <Col xs="auto">
          <Dropdown>
            <Dropdown.Toggle variant="info">Customize Stats</Dropdown.Toggle>
            <Dropdown.Menu>
              {Array.from(visibleStats).map(stat => (
                <Form.Check 
                  key={stat}
                  label={formatHeader(stat)}
                  id={`check-${stat}`}
                  type="checkbox"
                  className="mx-3"
                  checked={visibleStats.has(stat)}
                  onChange={() => toggleStatVisibility(stat)}
                />
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>

      {/* Sections for team batting, team pitching, top batters, top pitchers */}
      {['teamBatting', 'teamPitching', 'topBatters', 'topPitchers'].map(datasetKey => (
        <Row key={datasetKey} className="my-4">
          <Col>
            <h2>{formatHeader(datasetKey)}</h2>
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  {teamData[datasetKey].length > 0 && Object.keys(teamData[datasetKey][0])
                    .filter(stat => visibleStats.has(stat))
                    .map(stat => <th key={stat}>{formatHeader(stat)}</th>)}
                </tr>
              </thead>
              <tbody>
                {teamData[datasetKey].map((item, idx) => (
                  <tr key={idx}>
                    {Object.keys(item)
                      .filter(stat => visibleStats.has(stat))
                      .map(stat => (
                        <td key={`${stat}-${idx}`}>{item[stat]}</td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </Col>
        </Row>
      ))}

      {/* Schedule and Record Section */}
      <Row className="my-4">
        <Col>
          <h2>Schedule and Record</h2>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                {teamData.scheduleAndRecord.length > 0 && Object.keys(teamData.scheduleAndRecord[0])
                  .map(stat => <th key={stat}>{formatHeader(stat)}</th>)}
              </tr>
            </thead>
            <tbody>
              {teamData.scheduleAndRecord.map((record, idx) => (
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
