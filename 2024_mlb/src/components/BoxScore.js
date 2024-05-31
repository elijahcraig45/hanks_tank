import React from 'react';
import { Table } from 'react-bootstrap';

const BoxScore = ({ linescore, awayTeam, homeTeam }) => {
  const innings = linescore.innings;
  const totalInnings = 9; // Standard 9 innings
  const extraInnings = innings.length > totalInnings ? innings.length - totalInnings : 0;

  return (
    <Table striped bordered hover>
      <thead>
        <tr>
          <th></th>
          {[...Array(totalInnings)].map((_, index) => (
            <th key={index}>{index + 1}</th>
          ))}
          {extraInnings > 0 && <th colSpan={extraInnings}>Extras</th>}
          <th style={{borderLeft: "2px solid black"}}>R</th>
          <th>H</th>
          <th>E</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{awayTeam.teamName}</td>
          {[...Array(totalInnings)].map((_, index) => (
            <td key={index}>{innings[index] ? innings[index].away.runs : ''}</td>
          ))}
          {extraInnings > 0 && innings.slice(totalInnings).map((inning, index) => (
            <td key={index}>{inning.away.runs}</td>
          ))}
          <td style={{borderLeft: "2px solid black"}}>{linescore.teams.away.runs}</td>
          <td>{linescore.teams.away.hits}</td>
          <td>{linescore.teams.away.errors}</td>
        </tr>
        <tr>
          <td>{homeTeam.teamName}</td>
          {[...Array(totalInnings)].map((_, index) => (
            <td key={index}>{innings[index] ? innings[index].home.runs : ''}</td>
          ))}
          {extraInnings > 0 && innings.slice(totalInnings).map((inning, index) => (
            <td key={index}>{inning.home.runs}</td>
          ))}
          <td style={{borderLeft: "2px solid black"}}>{linescore.teams.home.runs}</td>
          <td>{linescore.teams.home.hits}</td>
          <td>{linescore.teams.home.errors}</td>
        </tr>
      </tbody>
    </Table>
  );
};

export default BoxScore;
