import React, { useState, useEffect } from 'react';
import { DropdownButton, Dropdown } from 'react-bootstrap';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './styles/ScatterMatrix.css'; // Uncomment if you have styles

const ScatterPlotMatrix = ({ data, sortKey }) => {
  const [selectedXStats, setSelectedXStats] = useState([]);
  const [selectedYStats, setSelectedYStats] = useState([]);

  useEffect(() => {
    // Filter numeric keys and exclude the sortKey
    const numericKeys = Object.keys(data[0])
      .filter(key => typeof data[0][key] === 'number' && key !== sortKey);
  
    // Ensure the correct number of keys are selected
    const numXStats = Math.min(numericKeys.length, 3); // Use Math.min to handle cases with fewer than 3 numeric keys
    const numYStats = Math.min(numericKeys.length - numXStats, 3); // Ensure enough Y stats are selected
  
    // Set state variables with filtered and sliced numeric keys
    setSelectedXStats(numericKeys.slice(0, numXStats));
    setSelectedYStats(numericKeys.slice(numXStats, numXStats + numYStats));
  }, [data, sortKey]);
  

  const handleSelectAxis = (axis, index, stat) => {
    const newStats = [...(axis === 'x' ? selectedXStats : selectedYStats)]; // Create a copy of the correct array
    newStats[index] = stat;

    // Update the correct state variable based on the axis
    if (axis === 'x') {
      setSelectedXStats(newStats);
    } else {
      setSelectedYStats(newStats);
    }
  };

  const renderDropdowns = (axis, index) => (
    <DropdownButton
      key={`${axis}-${index}`}
      id={`dropdown-${axis}-${index}`}
      
      title={`${axis.toUpperCase()} Axis ${index + 1}: ${(axis === 'x' ? selectedXStats[index] : selectedYStats[index])}`}
      onSelect={(e) => handleSelectAxis(axis, index, e)}
    >
      {Object.keys(data[0])
        .filter(key => key !== sortKey && !selectedXStats.concat(selectedYStats).includes(key))
        .map(key => (
          <Dropdown.Item key={key} eventKey={key}>{key}</Dropdown.Item>
        ))}
    </DropdownButton>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p>{`Name: ${data[sortKey]}`}</p>
          {payload.map(entry => (
            <p key={entry.name}>{`${entry.name}: ${entry.value}`}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="scatter-matrix-grid">
      <div className="row">
        <div className="col"></div> {/* Empty top-left cell */}
        {selectedXStats.map((_, index) => (
          <div className="col" key={`yx-dropdown-${index}`}>
            {renderDropdowns('x', index)}
          </div>
        ))}
      </div>
      {selectedYStats.map((yStat, rowIndex) => (
        <div className="row" key={`y-dropdown-${rowIndex}`}>
          <div className="col">
            {renderDropdowns('y', rowIndex)}
          </div>
          {selectedXStats.map((xStat, colIndex) => (
            <div className="col" key={`${yStat}-${xStat}`}>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid />
                  <YAxis type="number" dataKey={xStat} name={xStat} />
                  <XAxis type="number" dataKey={yStat} name={yStat} />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter name={`${yStat} vs ${xStat}`} data={data} fill="#8884d8" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default ScatterPlotMatrix;
