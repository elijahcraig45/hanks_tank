import * as d3 from 'd3';
import React, { useRef, useState, useEffect } from 'react';
import { Badge, Form, Spinner } from 'react-bootstrap';
import './styles/Strikezone.css';

// Normalize API base — REACT_APP_API_URL may or may not include /api suffix
const RAW_BASE = process.env.REACT_APP_API_URL || 'https://hankstank.uc.r.appspot.com';
const API_BASE = RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE}/api`;

const SVG_SIZE = 440;
const MARGIN = 30;

const StrikeZone = ({ MLBAMId, position }) => {
  const svgRef = useRef(null);
  const [pitchData, setPitchData]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [pitchThrows, setPitchThrows] = useState('');
  const [batterStands, setBatterStands] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedYear, setSelectedYear] = useState('2025');

  // ── Data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!MLBAMId) return;
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setTooltipData(null);
      let url = `${API_BASE}/statcast?year=${selectedYear}&playerId=${MLBAMId}&position=${position}&limit=1000`;
      if (pitchThrows)   url += `&p_throws=${pitchThrows}`;
      if (batterStands)  url += `&stands=${batterStands}`;
      if (selectedEvent) url += `&events=${selectedEvent}`;
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        setPitchData(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [MLBAMId, position, pitchThrows, batterStands, selectedEvent, selectedYear]);

  // ── Derived data ──────────────────────────────────────────────────
  const uniqueEvents = [...new Set(pitchData.map(d => d.events))];
  const colorScale   = d3.scaleOrdinal().domain(uniqueEvents).range(d3.schemeCategory10);
  const totalWithEvent = pitchData.filter(d => d.events !== null).length;
  const eventCounts = uniqueEvents.reduce((acc, ev) => {
    acc[ev ?? 'No event'] = pitchData.filter(d => d.events === ev).length;
    return acc;
  }, {});

  // ── D3 render ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;
    const inner = SVG_SIZE - MARGIN * 2;
    const scaleX = d3.scaleLinear().domain([-2, 2]).range([0, inner]);
    const scaleY = d3.scaleLinear().domain([0, 5]).range([inner, 0]);

    const svg = d3.select(svgRef.current);
    svg.attr('width', SVG_SIZE).attr('height', SVG_SIZE);
    svg.selectAll('*').remove();

    // background
    svg.append('rect').attr('width', SVG_SIZE).attr('height', SVG_SIZE)
      .attr('fill', '#f8f9fa').attr('rx', 8);

    const g = svg.append('g').attr('transform', `translate(${MARGIN},${MARGIN})`);

    // grid lines
    scaleX.ticks(8).forEach(v => {
      g.append('line')
        .attr('x1', scaleX(v)).attr('x2', scaleX(v)).attr('y1', 0).attr('y2', inner)
        .attr('stroke', '#dee2e6').attr('stroke-width', 0.5);
    });
    scaleY.ticks(8).forEach(v => {
      g.append('line')
        .attr('x1', 0).attr('x2', inner).attr('y1', scaleY(v)).attr('y2', scaleY(v))
        .attr('stroke', '#dee2e6').attr('stroke-width', 0.5);
    });

    // home plate silhouette
    const plateW = scaleX(0.71) - scaleX(-0.71);
    const plateX = scaleX(-0.71);
    const plateY = scaleY(0.5);
    g.append('rect')
      .attr('x', plateX).attr('y', plateY)
      .attr('width', plateW).attr('height', 12)
      .attr('fill', '#6c757d').attr('rx', 2).attr('opacity', 0.4);

    // strike zone
    g.append('rect')
      .attr('x', scaleX(-0.71)).attr('y', scaleY(3.5))
      .attr('width', scaleX(0.71) - scaleX(-0.71))
      .attr('height', scaleY(1.5) - scaleY(3.5))
      .attr('stroke', '#dc3545').attr('stroke-width', 1.5).attr('fill', 'rgba(220,53,69,0.05)');

    // zone quadrant labels
    [['inner', scaleX(-0.5), scaleY(3.2)], ['middle', scaleX(0), scaleY(2.5)], ['outer', scaleX(0.5), scaleY(1.8)]].forEach(([, , ]) => {});

    // pitches
    const visible = pitchData.filter(d =>
      (pitchThrows   === '' || d.p_throws === pitchThrows) &&
      (batterStands  === '' || d.stand    === batterStands) &&
      (selectedEvent === '' || d.events   === selectedEvent)
    );

    g.selectAll('circle')
      .data(visible)
      .enter()
      .append('circle')
      .attr('cx', d => scaleX(d.plate_x))
      .attr('cy', d => scaleY(d.plate_z))
      .attr('r', 4)
      .attr('fill', d => colorScale(d.events))
      .attr('opacity', 0.75)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setTooltipData(d);
      });

    // axis labels
    g.append('text').attr('x', inner / 2).attr('y', inner + 22)
      .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#6c757d')
      .text('Horizontal Location (ft)');
    g.append('text')
      .attr('transform', `rotate(-90)`)
      .attr('x', -inner / 2).attr('y', -22)
      .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#6c757d')
      .text('Vertical Location (ft)');

    // click-outside to clear tooltip
    const handleOutside = () => setTooltipData(null);
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, [pitchData, pitchThrows, batterStands, selectedEvent, colorScale]);

  // ── Helpers ───────────────────────────────────────────────────────
  const stat = (label, value, unit = '') =>
    value != null ? (
      <div className="sz-stat-item" key={label}>
        <span className="sz-stat-label">{label}</span>
        <span className="sz-stat-value">{value}{unit && ` ${unit}`}</span>
      </div>
    ) : null;

  return (
    <div className="sz-root">
      {/* ── Filter bar ── */}
      <div className="sz-filters">
        <Form.Select size="sm" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} style={{ width: 100 }}>
          {['2020','2021','2022','2023','2024','2025','2026'].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Form.Select>
        <Form.Select size="sm" value={pitchThrows} onChange={e => setPitchThrows(e.target.value)} style={{ width: 130 }}>
          <option value="">All Handedness</option>
          <option value="L">LHP</option>
          <option value="R">RHP</option>
        </Form.Select>
        <Form.Select size="sm" value={batterStands} onChange={e => setBatterStands(e.target.value)} style={{ width: 130 }}>
          <option value="">All Batters</option>
          <option value="L">LHB</option>
          <option value="R">RHB</option>
        </Form.Select>
        <Form.Select size="sm" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} style={{ width: 160 }}>
          <option value="">All Events</option>
          {uniqueEvents.filter(Boolean).map(ev => (
            <option key={ev} value={ev}>{ev}</option>
          ))}
        </Form.Select>
        {loading && <Spinner animation="border" size="sm" variant="secondary" />}
        {!loading && pitchData.length > 0 && (
          <span className="text-muted" style={{ fontSize: '0.82rem' }}>{pitchData.length.toLocaleString()} pitches</span>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '0.875rem' }}>
          Failed to load statcast data: {error}
        </div>
      )}

      {/* ── Main layout: plot + right panel ── */}
      <div className="sz-body">

        {/* Plot */}
        <div className="sz-plot-wrap">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            className="sz-svg"
            style={{ width: '100%', maxWidth: SVG_SIZE }}
          />
          {/* Legend */}
          {uniqueEvents.length > 0 && (
            <div className="sz-legend">
              {uniqueEvents.map(ev => (
                <span key={ev ?? 'null'} className="sz-legend-item">
                  <span className="sz-legend-dot" style={{ background: colorScale(ev) }} />
                  {ev ?? 'no event'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="sz-panel">

          {/* Pitch detail */}
          <div className="sz-detail-card">
            <div className="sz-detail-header">
              {tooltipData ? (
                <>
                  <span className="fw-semibold">{tooltipData.pitch_type || '—'}</span>
                  {tooltipData.events && (
                    <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.72rem' }}>
                      {tooltipData.events}
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Click a pitch to inspect</span>
              )}
            </div>
            {tooltipData && (
              <div className="sz-detail-body">
                <div className="sz-detail-section">
                  <div className="sz-detail-section-title">Pitch</div>
                  <div className="sz-stat-grid">
                    {stat('Speed', tooltipData.release_speed, 'mph')}
                    {stat('Plate X', tooltipData.plate_x != null ? parseFloat(tooltipData.plate_x).toFixed(2) : null, 'ft')}
                    {stat('Plate Z', tooltipData.plate_z != null ? parseFloat(tooltipData.plate_z).toFixed(2) : null, 'ft')}
                    {stat('Est. BA', tooltipData.estimated_ba_using_speedangle)}
                    {stat('Est. wOBA', tooltipData.estimated_woba_using_speedangle)}
                  </div>
                  {tooltipData.des && (
                    <p className="sz-desc">{tooltipData.des}</p>
                  )}
                </div>
                {(tooltipData.launch_speed || tooltipData.hit_distance_sc) && (
                  <div className="sz-detail-section">
                    <div className="sz-detail-section-title">Contact</div>
                    <div className="sz-stat-grid">
                      {stat('Exit Velo', tooltipData.launch_speed, 'mph')}
                      {stat('Launch Angle', tooltipData.launch_angle, '°')}
                      {stat('Distance', tooltipData.hit_distance_sc, 'ft')}
                      {stat('Bat Speed', tooltipData.bat_speed, 'mph')}
                      {stat('Swing Length', tooltipData.swing_length, 'ft')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Event summary */}
          {Object.keys(eventCounts).length > 0 && (
            <div className="sz-event-summary">
              <div className="sz-detail-section-title mb-2">Event Summary</div>
              {Object.entries(eventCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([ev, count]) => (
                  <div key={ev} className="sz-event-row">
                    <span
                      className="sz-event-dot"
                      style={{ background: colorScale(ev === 'No event' ? null : ev) }}
                    />
                    <span className="sz-event-name">{ev}</span>
                    <span className="sz-event-count">{count}</span>
                    {ev !== 'No event' && totalWithEvent > 0 && (
                      <span className="sz-event-pct">
                        {((count / totalWithEvent) * 100).toFixed(1)}%
                      </span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StrikeZone;
