import * as d3 from 'd3';
import React, { useRef, useEffect, useState } from 'react';
import { Card, ListGroup, Form } from 'react-bootstrap';
import './styles/Strikezone.css';

const StrikeZone = ({ pitches }) => {
  const svgRef = useRef(null);
  const [highlightedPitch, setHighlightedPitch] = useState(null);
  const [view, setView] = useState('umpire');

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    const scaleX = d3.scaleLinear()
      .domain([-1.5, 1.5])
      .range(view === 'umpire' ? [0, 600] : [600, 0]);

    const scaleY = d3.scaleLinear()
      .domain([0, 4.5])
      .range([600, 0]);

    svg.selectAll('*').remove();

    svg.append('rect')
      .attr('x', view === 'umpire' ? scaleX(-0.71) : scaleX(0.71) )
      .attr('y', scaleY(3.5))
      .attr('width', Math.abs(scaleX(0.71) - scaleX(-0.71)))
      .attr('height', Math.abs(scaleY(1.5) - scaleY(3.5)))
      .attr('stroke', 'red')
      .attr('fill', 'rgba(255, 0, 0, 0.1)');

    svg.selectAll('circle')
      .data(pitches)
      .enter()
      .append('circle')
      .attr('cx', d => scaleX(d.pitchData.coordinates.pX))
      .attr('cy', d => scaleY(d.pitchData.coordinates.pZ))
      .attr('r', 5)
      .attr('fill', d => (d === highlightedPitch ? 'yellow' : 'blue'))
      .attr('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        setHighlightedPitch(d);
      })
      .on('mouseout', () => {
        setHighlightedPitch(null);
      });

  }, [pitches, highlightedPitch, view]);

  return (
    <Card>
      <Card.Body>
        <Form>
          <Form.Check
            type="switch"
            id="view-switch"
            label={`View: ${view === 'umpire' ? 'Umpire' : 'Pitcher'}`}
            checked={view === 'umpire'}
            onChange={() => setView(view === 'umpire' ? 'pitcher' : 'umpire')}
            className="mb-3"
          />
        </Form>
        <svg ref={svgRef} width="600" height="600"></svg>
        <ListGroup>
          {pitches.slice().reverse().map((pitch, index) => (
            <ListGroup.Item
              key={index}
              onMouseOver={() => setHighlightedPitch(pitch)}
              onMouseOut={() => setHighlightedPitch(null)}
              style={{ cursor: 'pointer' }}
            >
              <strong>Type:</strong> {pitch.details.type.code} | <strong>Description:</strong> {pitch.details.description} | <strong>Speed:</strong> {pitch.pitchData.startSpeed} MPH | <strong>Count:</strong> {pitch.count.balls}-{pitch.count.strikes}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

export default StrikeZone;
