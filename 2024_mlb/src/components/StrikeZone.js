import * as d3 from 'd3';
import React, { useRef, useState, useEffect } from 'react';
import { Card, Row, Col, Form, Dropdown } from 'react-bootstrap';
import './styles/Strikezone.css';

const StrikeZone = ({ MLBAMId, position }) => {
  const svgRef = useRef(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [pitchData, setPitchData] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState(new Set());
  const [pitchThrows, setPitchThrows] = useState('');
  const [batterStands, setBatterStands] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedYear, setSelectedYear] = useState('2024'); // Default to 2024

  useEffect(() => {
    const fetchData = async () => {
      let apiUrl = `${process.env.REACT_APP_API_URL}/statcast?year=${selectedYear}&playerId=${MLBAMId}&position=${position}&limit=1000`;

      if (pitchThrows) {
        apiUrl += `&p_throws=${pitchThrows}`;
      }
      if (batterStands) {
        apiUrl += `&stands=${batterStands}`;
      }
      if (selectedEvent) {
        apiUrl += `&events=${selectedEvent}`;
      }

      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        console.log(data);
        setPitchData(data);
      } catch (error) {
        console.error("Failed to fetch player data:", error);
      }
    };

    fetchData();
  }, [MLBAMId, position, pitchThrows, batterStands, selectedEvent, selectedYear]);

  const uniqueEvents = [...new Set(pitchData.map(d => d.events))];
  const colorScale = d3.scaleOrdinal().domain(uniqueEvents).range(d3.schemeCategory10);

  const eventCounts = uniqueEvents.reduce((acc, event) => {
    const filteredPitchData = pitchData.filter(d => d.events === event);
    const count = filteredPitchData.length;
    acc[event === null ? "No event" : event] = count;
    return acc;
  }, {});

  const totalNonNullOrNoEventPitches = pitchData.filter(d => d.events !== null).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!svgRef.current.contains(event.target)) {
        setTooltipData(null);
      }
    };

    document.addEventListener('click', handleClickOutside);

    return () => document.removeEventListener('click', handleClickOutside);
  }, [svgRef]);

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    const scaleX = d3.scaleLinear()
      .domain([-1.5, 1.5])
      .range([0, 600]);

    const scaleY = d3.scaleLinear()
      .domain([0, 4.5])
      .range([600, 0]);

    svg.selectAll('*').remove();

    svg.append('rect')
      .attr('x', scaleX(-0.71))
      .attr('y', scaleY(3.5))
      .attr('width', scaleX(0.71) - scaleX(-0.71))
      .attr('height', scaleY(1.5) - scaleY(3.5))
      .attr('stroke', 'red')
      .attr('fill', 'rgba(255, 0, 0, 0.1)');

    svg.selectAll('circle')
      .data(pitchData.filter(d => (
        (filteredEvents.size === 0 || filteredEvents.has(d.events)) &&
        (pitchThrows === '' || d.p_throws === pitchThrows) &&
        (batterStands === '' || d.stand === batterStands) &&
        (selectedEvent === '' || d.events === selectedEvent)
      )))
      .enter()
      .append('circle')
      .attr('cx', d => scaleX(d.plate_x))
      .attr('cy', d => scaleY(d.plate_z))
      .attr('r', 5)
      .attr('fill', d => colorScale(d.events))
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        const [x, y] = d3.pointer(event);
        console.log(d)
        setTooltipData({ ...d, x, y });
      });

  }, [pitchData, filteredEvents, pitchThrows, batterStands, selectedEvent]);

  return (
    <Card>
      <Card.Body>
        <Row>
          <Col md={6}>
            <Form>
              <Form.Group>
              <Dropdown style={{ marginBottom: "16px"}}>
            <Dropdown.Toggle variant="secondary" id="dropdown-year">
              Year: {selectedYear}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {["2019", "2020", "2021", "2022", "2023", "2024"].map(year => (
                <Dropdown.Item key={year} onClick={() => setSelectedYear(year)}>
                  {year}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
                <Form.Label>Pitch Throws</Form.Label>
                <Form.Control as="select" value={pitchThrows} onChange={e => setPitchThrows(e.target.value)}>
                  <option value="">All</option>
                  <option value="L">Left</option>
                  <option value="R">Right</option>
                </Form.Control>
                <Form.Label>Batter Stands</Form.Label>
                <Form.Control as="select" value={batterStands} onChange={e => setBatterStands(e.target.value)}>
                  <option value="">All</option>
                  <option value="L">Left</option>
                  <option value="R">Right</option>
                </Form.Control>
                <Form.Label>Events</Form.Label>
                <Form.Control as="select" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                  <option value="">All</option>
                  {uniqueEvents.map(event => (
                    <option key={event} value={event}>
                      {event}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            </Form>
            <Card style={ { marginTop: '24px'}}>
         
             
                <Card.Body>
                  <Row>
                  <Col>
                  <p>Pitch Type: { tooltipData &&  tooltipData.pitch_type}</p>
                  <p>Pitch Speed: {tooltipData && tooltipData.release_speed} MPH</p>
                  <p>Plate X: {tooltipData && tooltipData.plate_x}  ft</p>
                  <p>Plate Z:{tooltipData && tooltipData.plate_z} ft</p>
                  <p>Estimated BA:{tooltipData && tooltipData.estimated_ba_using_speedangle}</p>
                  <p>Description:{tooltipData && tooltipData.des}</p>
                  </Col>
                  <Col>
                  <p>Hit Distance: {tooltipData && tooltipData.hit_distance_sc} ft</p>
                  <p>Exit Velocity: { tooltipData &&  tooltipData.launch_speed} MPH</p>
                  <p>Launch Angle: { tooltipData &&  tooltipData.launch_angle}</p>
                  <p>Bat Speed: { tooltipData &&  tooltipData.bat_speed} MPH</p>
                  <p>Swing Length: {tooltipData && tooltipData.swing_length} ft</p>
                  <p>Estimated woba:{tooltipData && tooltipData.estimated_woba_using_speedangle}</p>
                  </Col>
                  </Row>
                </Card.Body>
          </Card>
          <Card style={ { marginTop: '24px'}}>
              <Card.Body>
                <h5>Event Counts (out of events shown)</h5>
                {Object.entries(eventCounts).map(([event, count]) => (
                  <p key={event}>{event}: {count} {event != "No event" && "("}{event != "No event" && ((count / totalNonNullOrNoEventPitches) * 100).toFixed(2)}{event != "No event" && "%)"}</p>
                ))}
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <svg ref={svgRef} width="600" height="600"></svg>
            <div className="legend">
              {uniqueEvents.map(events => (
                <div key={events} className="legend-item">
                  <span style={{ backgroundColor: colorScale(events), display: 'inline-block', width: '12px', height: '12px', marginRight: '5px' }}></span>
                  {events}
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default StrikeZone;
