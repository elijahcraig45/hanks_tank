# Frontend YearSelector Component - Implementation Guide

## Overview

The `YearSelector` component has been created to provide a consistent year selection experience across the entire Hank's Tank frontend. This guide shows you how to integrate it into existing pages.

## Quick Start

### Import the Component

```javascript
import YearSelector from './YearSelector';
import { SEASONS } from '../config/constants';
```

### Basic Usage

```javascript
function TeamBatting() {
  const [selectedYear, setSelectedYear] = useState(SEASONS.DEFAULT);
  
  return (
    <div>
      <YearSelector 
        selectedYear={selectedYear}
        onChange={setSelectedYear}
      />
      {/* Your component content */}
    </div>
  );
}
```

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedYear` | number | `SEASONS.DEFAULT` | Currently selected year |
| `onChange` | function | - | Callback when year changes: `(year) => {}` |
| `label` | string | `'Season'` | Label text for the selector |
| `size` | string | `'md'` | Bootstrap size: `'sm'`, `'md'`, `'lg'` |
| `disabled` | boolean | `false` | Whether selector is disabled |
| `className` | string | `''` | Additional CSS classes |
| `showLabel` | boolean | `true` | Whether to show the label |

## Integration Examples

### Example 1: TeamBatting Component

**Location**: `src/components/TeamBatting.js`

**Before**:
```javascript
function TeamBatting() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    apiService.getTeamBatting(2026).then(setData);
  }, []);
  
  return (
    <Container>
      <h2>Team Batting Statistics</h2>
      {/* ... content ... */}
    </Container>
  );
}
```

**After**:
```javascript
import YearSelector from './YearSelector';
import { SEASONS } from '../config/constants';

function TeamBatting() {
  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(SEASONS.DEFAULT);
  
  useEffect(() => {
    apiService.getTeamBatting(selectedYear).then(setData);
  }, [selectedYear]);
  
  return (
    <Container>
      <Row className="mb-4">
        <Col md={6}>
          <h2>Team Batting Statistics</h2>
        </Col>
        <Col md={6} className="text-end">
          <YearSelector 
            selectedYear={selectedYear}
            onChange={setSelectedYear}
            size="sm"
          />
        </Col>
      </Row>
      {/* ... content ... */}
    </Container>
  );
}
```

### Example 2: PlayerBatting Component

**Location**: `src/components/PlayerBatting.js`

```javascript
import YearSelector from './YearSelector';
import { SEASONS } from '../config/constants';

function PlayerBatting() {
  const [playerData, setPlayerData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(SEASONS.DEFAULT);
  const [loading, setLoading] = useState(false);
  
  const loadData = async (year) => {
    setLoading(true);
    try {
      const data = await apiService.getPlayerBatting(year, {
        sortStat: 'ops',
        limit: 100
      });
      setPlayerData(data);
    } catch (error) {
      console.error('Error loading player data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadData(selectedYear);
  }, [selectedYear]);
  
  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Player Batting Leaders</h2>
        <YearSelector 
          selectedYear={selectedYear}
          onChange={setSelectedYear}
        />
      </div>
      
      {loading ? (
        <Spinner animation="border" />
      ) : (
        <Table striped bordered hover>
          {/* Player data table */}
        </Table>
      )}
    </Container>
  );
}
```

### Example 3: Inline Year Selector (Compact)

For space-constrained areas:

```javascript
<div className="stats-header">
  <h4>
    Team Statistics
    <YearSelector 
      selectedYear={year}
      onChange={setYear}
      size="sm"
      showLabel={false}
      className="inline ms-3"
    />
  </h4>
</div>
```

### Example 4: With Data Source Indicator

The component automatically shows whether data is coming from BigQuery (historical) or Live API (current):

```javascript
<YearSelector 
  selectedYear={selectedYear}
  onChange={handleYearChange}
  label="Select Season"
/>
// Shows: "📊 Historical data from BigQuery" for 2015-2025
// Shows: "🔴 Live data from MLB API" for 2026
```

## Styling Variants

### Default
```javascript
<YearSelector selectedYear={year} onChange={setYear} />
```

### Small (for toolbars)
```javascript
<YearSelector selectedYear={year} onChange={setYear} size="sm" />
```

### Large (for prominent selections)
```javascript
<YearSelector selectedYear={year} onChange={setYear} size="lg" />
```

### Inline (no label, compact)
```javascript
<YearSelector 
  selectedYear={year} 
  onChange={setYear} 
  showLabel={false}
  className="inline"
/>
```

### Compact (smaller spacing)
```javascript
<YearSelector 
  selectedYear={year} 
  onChange={setYear} 
  className="compact"
/>
```

## Components to Update

### High Priority (User-facing stats pages)
1. ✅ `TeamBatting.js`
2. ✅ `TeamPitching.js`
3. ✅ `PlayerBatting.js`
4. ✅ `PlayerPitching.js`
5. ✅ `HomePage.js` (for standings)

### Medium Priority (Analysis pages)
6. `AdvancedPlayerAnalysis.js`
7. `PlayerComparison.js`
8. `SeasonComparison.js`
9. `ScatterPlotMatrix.js`

### Low Priority (Utility pages)
10. `BoxScore.js`
11. `AssistedAnalysis.js`

## Best Practices

### 1. Use Centralized Constants
Always import `SEASONS` from config:
```javascript
import { SEASONS } from '../config/constants';

// ✅ Good
const [year, setYear] = useState(SEASONS.DEFAULT);

// ❌ Bad
const [year, setYear] = useState(2026);
```

### 2. Handle Year Changes Properly
```javascript
// ✅ Good - Clear loading state
const handleYearChange = async (newYear) => {
  setLoading(true);
  setSelectedYear(newYear);
  try {
    const data = await apiService.getTeamBatting(newYear);
    setData(data);
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};

// ❌ Bad - No loading feedback
const handleYearChange = (newYear) => {
  setSelectedYear(newYear);
  apiService.getTeamBatting(newYear).then(setData);
};
```

### 3. Persist Year Selection (Optional)
```javascript
// Save to localStorage
const [selectedYear, setSelectedYear] = useState(() => {
  const saved = localStorage.getItem('selectedYear');
  return saved ? parseInt(saved) : SEASONS.DEFAULT;
});

const handleYearChange = (year) => {
  setSelectedYear(year);
  localStorage.setItem('selectedYear', year.toString());
};
```

## Testing Checklist

After integrating YearSelector:

- [ ] Component renders without errors
- [ ] Dropdown shows years from 2015 to 2026
- [ ] Current year (2026) is marked as "(Current)"
- [ ] Selecting a year triggers data refresh
- [ ] Data source indicator shows correctly:
  - "Historical data from BigQuery" for 2015-2025
  - "Live data from MLB API" for 2026
- [ ] Loading state displays during data fetch
- [ ] Error handling works if API fails
- [ ] Styles look good on mobile and desktop

## Common Issues & Solutions

### Issue: Dropdown doesn't update data
**Solution**: Make sure `selectedYear` is in the useEffect dependency array:
```javascript
useEffect(() => {
  loadData(selectedYear);
}, [selectedYear]); // ← Must include selectedYear
```

### Issue: Year selector overlaps content on mobile
**Solution**: Use responsive layout:
```javascript
<Row className="mb-4">
  <Col xs={12} md={6}>
    <h2>Statistics</h2>
  </Col>
  <Col xs={12} md={6} className="text-md-end mt-2 mt-md-0">
    <YearSelector selectedYear={year} onChange={setYear} />
  </Col>
</Row>
```

### Issue: Multiple year selectors on same page get out of sync
**Solution**: Lift state to parent component:
```javascript
// Parent component
function StatsPage() {
  const [year, setYear] = useState(SEASONS.DEFAULT);
  
  return (
    <>
      <YearSelector selectedYear={year} onChange={setYear} />
      <TeamBatting year={year} />
      <PlayerBatting year={year} />
    </>
  );
}
```

## Example Implementation: Full Component Update

See `/examples/TeamBattingWithYearSelector.js` for a complete implementation example.

## Questions?

- Frontend architecture: Check `src/config/constants.js`
- API service: Check `src/services/api.js`
- Backend data routing: Check backend `/2026_SEASON_READINESS.md`

---

**Remember**: The system automatically routes historical years (2015-2025) to BigQuery and the current year (2026) to live MLB API. The YearSelector component makes this transparent to the user while providing clear visual feedback about the data source.
