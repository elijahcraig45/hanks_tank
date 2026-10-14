import React, { useState } from 'react';

/**
 * Plain-language help for the power-rankings table: a hover / focus / tap tooltip on every column header and a
 * "How to read this table" guide. One source of wording (HELP) feeds both, so they cannot drift apart.
 *
 * The tooltip text lives in a data- attribute and is drawn by CSS (RankingsBoard.css, `.rb-info::after`), so the
 * header's own text content is unchanged. The button's accessible name carries the full explanation.
 */

export const HELP = {
  rank_resume: 'This team\'s place on the board, ordered by season resume: who has earned it from the games played so far.',
  rank_rating: 'This team\'s place on the board, ordered by the next-week rating: who would be favoured in a game next week.',
  team: 'The bar compares this team with the top 25 on the measure the table is ordered by.',
  record: 'Win–loss record this season.',
  resume: 'Strength of record. How this team\'s results compare with what a typical top-25 team would have managed against the '
    + 'same schedule, home and away. Above 0 is better than that. Beating strong opponents counts the most, beating weak ones '
    + 'almost nothing. The margin of victory refines each result, but a win never scores below zero.',
  range: 'How firm this rank is. After a few games, teams with very similar records cannot really be told apart. This is the '
    + 'range of places the team could reasonably hold; “firm” means no other team is close enough to swap with it. '
    + 'Head-to-head results decide the order inside a range.',
  rating_resume: 'The forecast rating, and the place it gives this team: who would be favoured in a game next week. It uses '
    + 'scores and last season, so it can disagree with the resume. Predictions and matchups use this.',
  rating: 'Forecast rating on a points-like scale, higher is better. A 100-point gap is about a 64% chance for the higher team '
    + 'on a neutral field.',
  rank_range: 'How far this team\'s rank moves when the season\'s games are resampled (5th to 95th percentile). A wide range '
    + 'means the rank is not well separated from its neighbours.',
  delta: 'A small +/− number beside another order shows when it puts the team 10 or more places higher (+) or lower (−) '
    + 'than the table\'s own order.',
  details: '“Details” under a team opens what each game was worth to its resume.',
};

/** A <th> with a label and an info marker. `align="end"` opens the tooltip leftwards, for columns near the right edge. */
export function HelpHeader({ label, text, align = 'start' }) {
  const [open, setOpen] = useState(false);
  return (
    <th scope="col">
      <span className="rb-th">
        {label}
        <button
          type="button"
          className="rb-info"
          aria-label={`${label}: ${text}`}
          aria-expanded={open}
          data-tip={text}
          data-align={align}
          data-open={open ? 'true' : 'false'}
          onClick={() => setOpen((o) => !o)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        />
      </span>
    </th>
  );
}

/** The collapsible guide under the table's notes: the same wording as the tooltips, for the columns actually drawn.
 * The list is only rendered while it is open, so the page does not repeat every column name and description. */
export function ReadingGuide({ resumeMode, columns, hasDetails }) {
  const [open, setOpen] = useState(false);
  const entries = resumeMode
    ? [['#', HELP.rank_resume], ['Resume', HELP.resume], ['Range', HELP.range], ['Next-week rating', HELP.rating_resume]]
    : [['#', HELP.rank_rating], ['Rating', HELP.rating], ['Rank range', HELP.rank_range]];
  const extra = columns.filter((c) => c.title).map((c) => [c.label, c.title]);
  const items = [...entries, ...extra];
  if (columns.some((c) => c.id)) items.push(['+ / − beside a column', HELP.delta]);
  if (hasDetails && resumeMode) items.push(['Details', HELP.details]);
  return (
    <details className="rb-guide" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>How to read this table</summary>
      {open && (
        <dl className="rb-guide-list">
          {items.map(([term, text]) => (
            <div key={term} className="rb-guide-row">
              <dt>{term}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      )}
    </details>
  );
}
