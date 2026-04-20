import { render, screen } from '@testing-library/react';
import ScoutingReport from './ScoutingReport';

describe('ScoutingReport', () => {
  test('formats ordinal percentiles and normalized copy', () => {
    render(
      <ScoutingReport
        alwaysExpanded={true}
        report={{
          home_team_name: 'Boston Red Sox',
          away_team_name: 'Detroit Tigers',
          generated_at: '2026-04-20T15:10:00Z',
          prediction: {
            home_win_probability: 0.45,
            away_win_probability: 0.55,
            predicted_winner: 'Detroit Tigers',
            confidence_tier: 'low',
            model_version: 'v10',
            lineup_confirmed: false,
          },
          starters: {
            away: { name: 'Jack Flaherty', hand: 'R' },
            home: { name: 'Tanner Houck', hand: 'R' },
          },
          arsenal: {
            away: { xera_pct: 23, k_pct: 65, whiff_pct: 58, bb_pct: 42, fbv_pct: 71 },
            home: { xera_pct: 81, k_pct: 60, whiff_pct: 54, bb_pct: 40, fbv_pct: 77 },
          },
          momentum: {
            home: { pythag_pct: 0.48, streak: 'L2', run_diff_10g: -5 },
            away: { pythag_pct: 0.57, streak: 'W3', run_diff_10g: 9 },
            elo_differential: -32,
          },
          bullpen: {
            home_fatigue: 3.2,
            away_fatigue: 2.6,
            home_closer_rest: 0,
            away_closer_rest: 2,
          },
        }}
      />
    );

    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getAllByText('(RHP)')).toHaveLength(2);
    expect(screen.getAllByText('23rd')[0]).toBeInTheDocument();
    expect(screen.getByText(/bullpen projects fresher/i)).toBeInTheDocument();
    expect(screen.getByText(/generated/i)).toBeInTheDocument();
  });
});
