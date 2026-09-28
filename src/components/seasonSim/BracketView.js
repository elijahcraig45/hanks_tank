import React, { useMemo } from 'react';
import {
  BRACKET_LABEL, ROUND_LABEL, fmtPct, shapeBracket,
} from './simFormat';

const MAX_OTHERS = 5;

function Occupant({ row, isSeed, onSelect }) {
  return (
    <li className="ssim-occ">
      <button type="button" className="ssim-occ-team" onClick={() => onSelect(row.team)} title={row.team_name}>
        {row.team_name && row.team_name !== row.team && <span className="ssim-team-abbr">{row.team}</span>}
        <span className="ssim-occ-name">{row.team_name || row.team}</span>
      </button>
      <span className="ssim-occ-p" title={isSeed ? 'Chance of holding this seed' : 'Chance of playing in this game'}>
        {fmtPct(row.p_slot)}
      </span>
      {!isSeed && (
        <span className="ssim-occ-w" title="Chance of playing in and winning this game">
          W {fmtPct(row.p_win)}
        </span>
      )}
    </li>
  );
}

function Slot({ slot, isSeed, onSelect }) {
  const shown = slot.others.slice(0, MAX_OTHERS);
  return (
    <div className="ssim-slot" data-testid="ssim-slot">
      <div className="ssim-slot-label">{slot.label}</div>
      <ul className="ssim-occs">
        {slot.modal.map((r) => <Occupant key={r.team} row={r} isSeed={isSeed} onSelect={onSelect} />)}
      </ul>
      {shown.length > 0 && (
        <details className="ssim-alts">
          <summary>Other {isSeed ? 'candidates' : 'possible teams'} ({slot.others.length})</summary>
          <ul className="ssim-alts-list">
            {shown.map((r) => (
              <li key={r.team}>
                <button type="button" className="ssim-link-btn" onClick={() => onSelect(r.team)}>{r.team_name || r.team}</button>
                <span className="ssim-occ-p">{fmtPct(r.p_slot)}</span>
              </li>
            ))}
            {slot.others.length > MAX_OTHERS && (
              <li className="ssim-faint">+{slot.others.length - MAX_OTHERS} more, each less likely</li>
            )}
          </ul>
        </details>
      )}
    </div>
  );
}

/**
 * The most likely bracket (the is_modal rows), round by round, each slot with its
 * probability and the next-likeliest alternatives behind a disclosure. Rounds sit side
 * by side on a wide screen and stack on a phone.
 */
export default function BracketView({ bracket, onSelect }) {
  const shaped = useMemo(() => shapeBracket(bracket), [bracket]);
  if (!shaped.length) {
    return <p className="ssim-faint">No bracket rows in this run.</p>;
  }
  return (
    <div className="ssim-brackets" data-testid="ssim-bracket">
      {shaped.map((b) => (
        <section key={b.bracket} className="ssim-bracket" aria-label={`${BRACKET_LABEL[b.bracket] || b.bracket} bracket`}>
          <h4 className="ssim-bracket-name">{BRACKET_LABEL[b.bracket] || b.bracket}</h4>
          <div className={`ssim-rounds ssim-rounds--${b.rounds.length}`}>
            {b.rounds.map((rd) => (
              <div key={rd.round} className={`ssim-round ssim-round--${rd.round}`}>
                <h5 className="ssim-round-name">{ROUND_LABEL[rd.round] || rd.round}</h5>
                <div className="ssim-round-slots">
                  {rd.slots.map((s) => (
                    <Slot key={s.slot} slot={s} isSeed={rd.round === 'seed'} onSelect={onSelect} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
