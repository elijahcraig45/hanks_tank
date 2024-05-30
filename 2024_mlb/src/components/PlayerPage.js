import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Table, Image } from 'react-bootstrap';

const PlayerPage = () => {
  const { playerId } = useParams();
  const [playerData, setPlayerData] = useState({});
  const [teamData, setTeamData] = useState({});
  const [battingStatsData, setBattingStatsData] = useState([]);
  const [pitchingStatsData, setPitchingStatsData] = useState([]);
  const [visiblePitchingStats, setVisiblePitchingStats] = useState(new Set(['Season', 'Team', 'ERA', 'SO', 'G', 'IP', 'H', 'ER', 'HR', 'BB', 'K/9', 'BB/9', "WHIP", "WAR"]));
  const [visibleBattingStats, setVisibleBattingStats] = useState(new Set(['Season', 'G', 'OPS', 'AB', 'PA', 'H', 'HR', 'R', 'RBI', 'BB', 'SO', 'AVG', 'Team', 'WAR']));

  useEffect(() => {
    const fetchData = async () => {
      const apiUrl = `${process.env.REACT_APP_API_URL}/playerData?playerId=${playerId}`;
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setPlayerData(data.playerInfo);
        setTeamData(data.teamInfo);
        setBattingStatsData(data.data.filter(stats => !stats.hasOwnProperty('ERA')));
      } catch (error) {
        console.error("Failed to fetch player data:", error);
      }
    };
    fetchData();
  }, [playerId]);

  useEffect(() => {
    const fetchData = async () => {
      const apiUrl = `${process.env.REACT_APP_API_URL}/playerData?playerId=${playerId}&position=P`;
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        console.log(data.data);
        setPitchingStatsData(data.data);
      } catch (error) {
        console.error("Failed to fetch player data:", error);
      }
    };
    fetchData();
  }, [playerId]);

  const StatsTable = ({ statsData, visibleStatsSet }) => {
    if (statsData.length === 0) {
      return null; // Render nothing if statsData is empty
    }
  
    // Filter out statsData where Season does not contain a four-digit year or where AbbLevel is "PROJ"
    const filteredStatsData = statsData.filter(stats => {
      const isYear = /\b\d{4}\b/.test(stats.Season);
      const isNotProjection = stats.AbbLevel !== "PROJ";
      const isNotROS = stats.AbbLevel !== 'ROS';
      const moreAB = stats.AB > 0 || stats.hasOwnProperty('ERA');
      return isYear && isNotProjection && isNotROS && moreAB && stats.Team !== "Average";
    });
  
    // Separate "Total" entries from other entries
    const totalStats = filteredStatsData.filter(stats => stats.Season.includes("Total"));
    const otherStats = filteredStatsData.filter(stats => !stats.Season.includes("Total")).reverse();
  
    // Combine otherStats with totalStats at the end
    const finalStatsData = [...otherStats, ...totalStats];
  
    return (
      <Table striped bordered hover responsive> 
        <thead>
          <tr>
            {Array.from(visibleStatsSet).map((key, index) => (
              <th key={index}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {finalStatsData.map((stats, index) => (
            <tr key={index}>
              {Array.from(visibleStatsSet).map((key, idx) => (
                <td key={`${index}-${idx}`}>
                  {stats[key] != null && stats[key] !== "" ? (
                    key === "Season" && (typeof stats[key] === "string" && !stats[key].includes("<a")) ? (
                      `${stats[key]} (Postseason)`
                    ) : typeof stats[key] === "string" && stats[key].startsWith("<a") ? (
                      <span dangerouslySetInnerHTML={{ __html: stats[key] }} />
                    ) : typeof stats[key] === "number" && stats[key] % 1 !== 0 ? (
                      stats[key].toFixed(3)
                    ) : (
                      stats[key]
                    )
                  ) : (
                    "--"
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };
  
  
  return (
    <Container className="mt-4">
      <Row className="justify-content-between align-items-center mb-4">
        <Col><h1>{`${playerData.firstLastName}`}</h1></Col>
      </Row>
      <Row>
        <Col xs={3} md={4}>
          <Image src={playerData.urlHeadshot} alt={playerData.firstLastName} rounded fluid />
        </Col>
        <Col xs={9} md={4}>
          <p><strong>Height:</strong> {playerData.HeightDisplay}</p>
          <p><strong>Weight:</strong> {playerData.Weight} lbs</p>
          <p><strong>Position:</strong> {playerData.Position}</p>
          <p><strong>Team:</strong> {teamData.MLB_FullName} ({teamData.tlevel})</p>
          <p><strong>Rookie Season:</strong> {playerData.RookieSeason}</p>
        </Col>
        <Col xs={9} md={4}>
          <p><strong>Bats:</strong> {playerData.Bats}</p>
          <p><strong>Throws:</strong> {playerData.Throws}</p>
          <p><strong>Birth Date:</strong> {playerData.BirthDateDisplay}</p>
          <p><strong>Age:</strong> {playerData.AgeDisplay}</p>
          <p><strong>College:</strong> {playerData.College}</p>
        </Col>
      </Row>
      <Row>
        <Col style={{ overflow: "auto"}}>
          {pitchingStatsData.length > 0 && <h2>Pitching Stats</h2>}
          {pitchingStatsData.length > 0 && <StatsTable statsData={pitchingStatsData} visibleStatsSet={visiblePitchingStats} />}
          {battingStatsData.length > 0 && <h2>Batting Stats</h2>}
          {battingStatsData.length > 0 && <StatsTable statsData={battingStatsData} visibleStatsSet={visibleBattingStats} />}
          {pitchingStatsData.length === 0 && battingStatsData.length === 0 && <p>No stats available.</p>}
        </Col>
      </Row>
    </Container>
  );
};

export default PlayerPage;
