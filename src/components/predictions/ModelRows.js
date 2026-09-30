import React from 'react';
import { ROLE_LABEL, shortName } from '../../config/modelRegistry';
import {
  distMean, fmtNum, fmtPct, hasDist, missingReason,
} from '../../utils/unifiedPredictions';
import DistTerm from './DistTerm';
import '../styles/Models.css';

/**
 * Every model's call on one game, one compact row each, in the slate's model order.
 * A model with no row, or whose table does not exist yet, keeps its row with "—" and a
 * tooltip saying which — nothing disappears silently.
 */

const ROLE_SHORT = { benchmark: 'Benchmark', backtest: 'Backtest', production: 'Prod' };

export function RoleTag({ role }) {
  if (!role) return null;
  return (
    <span className={`mdl-role mdl-role--${role} up-role`} title={ROLE_LABEL[role] || role}>
      {ROLE_SHORT[role] || ROLE_LABEL[role] || role}
    </span>
  );
}

function ProbBar({ homeProb, homeAbbr, awayAbbr }) {
  const home = Math.round(homeProb * 100);
  return (
    <div className="up-prob" aria-hidden="true">
      <div className="up-prob-away" style={{ width: `${100 - home}%` }} />
      <div className="up-prob-home" style={{ width: `${home}%` }} />
      <span className="up-prob-mid" />
      <span className="up-prob-lbl up-prob-lbl--away">{awayAbbr} {100 - home}</span>
      <span className="up-prob-lbl up-prob-lbl--home">{home} {homeAbbr}</span>
    </div>
  );
}

/** The registry's short name (V10, Sim blend …) for compact rows; the API label is the title. */
export function modelName(sport, model) {
  const short = shortName(sport, model.key);
  return short && short !== model.key ? short : (model.label || model.key);
}

/** "ATL by 1.2" from a home-minus-away margin. */
export function marginText(margin, game) {
  if (margin == null) return null;
  if (Math.abs(margin) < 0.05) return 'Even';
  const side = margin > 0 ? game.home : game.away;
  return `${side?.abbr || (margin > 0 ? 'Home' : 'Away')} by ${fmtNum(Math.abs(margin), 1)}`;
}

function Numbers({ pred, game, sport }) {
  const hs = distMean(pred.home_score);
  const as = distMean(pred.away_score);
  const total = distMean(pred.total) ?? (hs != null && as != null ? hs + as : null);
  const margin = distMean(pred.margin) ?? (hs != null && as != null ? hs - as : null);
  const unit = sport === 'mlb' ? 'runs' : 'pts';
  const bits = [];
  if (hs != null && as != null) {
    bits.push(<span key="s" className="up-num" title={`Expected score (mean), ${unit}`}>
      {game.away.abbr} {fmtNum(as, 1)}–{fmtNum(hs, 1)} {game.home.abbr}
    </span>);
  } else if (margin != null) {
    bits.push(<span key="m" className="up-num" title="Predicted margin (home minus away)">{marginText(margin, game)}</span>);
  }
  if (total != null) {
    bits.push(<span key="t" className="up-num" title={`Predicted total ${unit}`}>Total {fmtNum(total, 1)}</span>);
  }
  if (!bits.length) return null;
  return <>{bits}</>;
}

export default function ModelRows({ rows, game, sport, featured, onOpenDetail }) {
  return (
    <ul className="up-models" aria-label={`Every model for ${game.away.name} at ${game.home.name}`}>
      {rows.map((row) => {
        const { model, pred, state } = row;
        const isFeatured = model.key === featured;
        const name = modelName(sport, model);
        return (
          <li
            key={model.key}
            className={`up-model${isFeatured ? ' up-model--featured' : ''} up-model--${state}`}
            data-testid={`model-row-${model.key}`}
            data-state={state}
          >
            <span className="up-model-name">
              {isFeatured && <span className="up-star" title="Featured model" aria-label="Featured">★</span>}
              {model.learn
                ? <a href={model.learn} title={`${model.label || model.key}: how it works`}>{name}</a>
                : <span title={model.label || model.key}>{name}</span>}
              <RoleTag role={model.role} />
            </span>
            {state === 'ok' ? (
              <>
                <span className="up-model-bar">
                  {pred.home_win_prob != null ? (
                    <>
                      <ProbBar homeProb={pred.home_win_prob} homeAbbr={game.home.abbr} awayAbbr={game.away.abbr} />
                      <span className="visually-hidden">
                        {game.home.name} {fmtPct(pred.home_win_prob)} to win
                      </span>
                    </>
                  ) : <span className="up-missing">no win probability</span>}
                </span>
                <span className="up-model-nums"><Numbers pred={pred} game={game} sport={sport} /></span>
                <span className="up-model-flag">
                  {pred.pregame === false ? (
                    <span className="up-flag up-flag--late">
                      <DistTerm term="late">after start</DistTerm>
                    </span>
                  ) : (
                    <span className="up-flag up-flag--pre" title={pred.predicted_at ? `Written ${new Date(pred.predicted_at).toLocaleString()}` : 'Pregame'}>pregame</span>
                  )}
                  {hasDist(pred) && onOpenDetail && (
                    <button type="button" className="up-dist-link" onClick={() => onOpenDetail(model.key)}>
                      ranges
                    </button>
                  )}
                </span>
              </>
            ) : (
              <span
                className="up-model-missing"
                title={missingReason(row, sport)}
                tabIndex={0}
                aria-label={missingReason(row, sport)}
              >
                <span aria-hidden="true">—</span>
                <span className="up-missing">{state === 'unavailable' ? 'not available yet' : 'no prediction'}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
