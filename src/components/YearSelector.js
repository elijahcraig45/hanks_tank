import React from 'react';
import { Form } from 'react-bootstrap';
import { AVAILABLE_SEASONS, SEASONS } from '../config/constants';
import './styles/YearSelector.css';

/**
 * YearSelector Component
 * 
 * Reusable dropdown for selecting MLB seasons
 * Automatically includes all years from MIN_SEASON to current year
 * 
 * Props:
 * - selectedYear: Currently selected year
 * - onChange: Callback function when year changes (year) => {}
 * - label: Optional label for the selector
 * - size: Bootstrap form size ('sm', 'lg')
 * - disabled: Whether selector is disabled
 * - className: Additional CSS classes
 */
const YearSelector = ({ 
  selectedYear = SEASONS.DEFAULT, 
  onChange,
  label = 'Season',
  size = 'md',
  disabled = false,
  className = '',
  showLabel = true
}) => {
  
  const handleChange = (e) => {
    const year = parseInt(e.target.value);
    if (onChange) {
      onChange(year);
    }
  };

  return (
    <div className={`year-selector ${className}`}>
      {showLabel && (
        <Form.Label className="year-selector-label">
          {label}
        </Form.Label>
      )}
      <Form.Select
        value={selectedYear}
        onChange={handleChange}
        size={size}
        disabled={disabled}
        className="year-selector-dropdown"
        aria-label={`Select ${label}`}
      >
        {AVAILABLE_SEASONS.map((year) => (
          <option key={year} value={year}>
            {year}
            {year === SEASONS.CURRENT && ' (Current)'}
            {year === SEASONS.DEFAULT && year !== SEASONS.CURRENT && ' (Default)'}
          </option>
        ))}
      </Form.Select>
      
      {selectedYear < SEASONS.CURRENT && (
        <Form.Text className="text-muted year-selector-hint">
          <small>
            📊 Historical data from BigQuery
          </small>
        </Form.Text>
      )}
      
      {selectedYear === SEASONS.CURRENT && (
        <Form.Text className="text-success year-selector-hint">
          <small>
            🔴 Live data from MLB API
          </small>
        </Form.Text>
      )}
    </div>
  );
};

export default YearSelector;
