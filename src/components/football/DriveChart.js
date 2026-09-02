import { yardLine } from './format';

/**
 * Drive-by-drive field position.
 *
 * The football answer to the strike zone on the baseball game page: what actually
 * happened, laid out spatially. Each row is one possession, drawn as a span across a
 * 100-yard field from where the drive started to where it ended.
 *
 * Deliberately CSS rather than a chart library. This is one bar per row across ~20 rows
 * — a chart instance per row would mean twenty SVG trees and as many resize observers
 * for a mark that is a positioned div. The same reason RankingsBoard draws its strength
 * bars in CSS.
 *
 * Colour carries only which team had the ball — two hues, validated for colour-vision
 * separation against the panel surface. The outcome is a text label, not a colour: drive
 * results run to a dozen values (TD, FG, PUNT, DOWNS, INT, FUMBLE, END OF HALF, MISSED
 * FG...), well past the point where hues stay distinguishable, so encoding them by
 * colour would be unreadable.
 */

const HOME_HUE = 'fg-drive--home';   // --sport-ftbl
const AWAY_HUE = 'fg-drive--away';

/** Results worth calling out; everything else is just the label. */
const SCORING = new Set(['TD', 'FG', 'PASSING TD', 'RUSHING TD', 'PUNT RETURN TD',
  'KICKOFF RETURN TD', 'INT TD', 'FUMBLE RETURN TD', 'FUMBLE TD']);
const TURNOVER = new Set(['INT', 'FUMBLE', 'INT TD', 'FUMBLE RETURN TD',
  'FUMBLE TD', 'DOWNS']);

function resultTone(result) {
  const r = String(result || '').toUpperCase();
  if (SCORING.has(r)) return 'fg-res--score';
  if (TURNOVER.has(r)) return 'fg-res--turnover';
  return '';
}

export default function DriveChart({ drives, homeName, awayName }) {
  const rows = (drives || []).filter((d) => d
    && d.startYardsToGoal !== null && d.startYardsToGoal !== undefined);

  if (!rows.length) {
    return <p className="ft-note">No drive data for this game.</p>;
  }

  return (
    <figure className="fg-figure">
      <figcaption className="fg-figure-cap">
        <span className="fg-figure-title">Drives</span>
        {/* Two series, so identity is never colour alone. */}
        <span className="fg-legend">
          <span className="fg-key"><i className={`fg-dot ${HOME_HUE}`} />{homeName}</span>
          <span className="fg-key"><i className={`fg-dot ${AWAY_HUE}`} />{awayName}</span>
        </span>
      </figcaption>

      <div className="ft-table-wrap">
        <table className="ft-table fg-drive-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Offense</th>
              <th>Start</th>
              <th className="fg-field-head">Field position</th>
              <th>Yds</th>
              <th>Plays</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => {
              // The feed counts yards-to-goal, so a drive moving downfield has a
              // decreasing value; convert to left-to-right progress for the span.
              const startPct = 100 - Number(d.startYardsToGoal);
              const endPct = d.endYardsToGoal === null || d.endYardsToGoal === undefined
                ? startPct
                : 100 - Number(d.endYardsToGoal);
              const left = Math.max(0, Math.min(startPct, endPct));
              const width = Math.max(1.5, Math.abs(endPct - startPct));
              const isHome = Boolean(d.isHomeOffense);

              return (
                <tr key={d.id ?? `${d.driveNumber}-${i}`}>
                  <td>{d.driveNumber ?? i + 1}</td>
                  <td><strong>{d.offense}</strong></td>
                  <td>{yardLine(d.startYardsToGoal)}</td>
                  <td className="fg-field-cell">
                    <div className="fg-field">
                      <span className="fg-field-mid" aria-hidden="true" />
                      <span
                        className={`fg-drive ${isHome ? HOME_HUE : AWAY_HUE}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        title={`${d.offense}: ${yardLine(d.startYardsToGoal)} → `
                          + `${yardLine(d.endYardsToGoal)} (${d.yards ?? 0} yds)`}
                      />
                    </div>
                  </td>
                  <td>{d.yards ?? '—'}</td>
                  <td>{d.plays ?? '—'}</td>
                  <td className={resultTone(d.driveResult)}>{d.driveResult || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="fg-figure-note">
        Each bar spans where a drive started to where it ended, left to right toward the
        opponent&rsquo;s goal line. The midfield tick marks the 50.
      </p>
    </figure>
  );
}
