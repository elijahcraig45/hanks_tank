import React from 'react';
import { MODEL_CARDS } from '../config/modelRegistry';
import './styles/StandInNotice.css';

/**
 * Automatic notice shown when the production model is hidden or paused by the model
 * control plane and the API is serving a stand-in instead (`stand_in` on the models
 * compare and slate responses). Not dismissible and not configurable: it is a fact about
 * what the page is showing. Text is inert (React text nodes, never HTML). Tolerant of an
 * older backend (field missing) and of malformed values: either way, no notice.
 */

const REASONS = ['production_hidden', 'production_paused'];
const BASES = ['season_log_loss', 'fixed_order'];
const isStr = (v) => typeof v === 'string' && v.trim() !== '';

/** A validated stand-in { model, label, reason, basis, nGames } or null. */
export function readStandIn(data) {
  const s = data && typeof data === 'object' ? data.stand_in : null;
  if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
  if (!isStr(s.model) || !REASONS.includes(s.reason)) return null;
  const nGames = Number.isFinite(s.n_games) ? s.n_games : null;
  return {
    model: s.model,
    label: isStr(s.label) ? s.label : s.model,
    reason: s.reason,
    basis: BASES.includes(s.basis) ? s.basis : null,
    nGames,
  };
}

/** Label of the sport's production model: API list, then registry name, then the key. */
export function productionLabel(sport, models) {
  const list = Array.isArray(models) ? models.filter((m) => m && typeof m === 'object') : [];
  const fromApi = list.find((m) => m.role === 'production');
  let key = isStr(fromApi?.key) ? fromApi.key : null;
  if (!key) {
    const cards = MODEL_CARDS[sport] || {};
    key = Object.keys(cards).find((k) => cards[k].status === 'production') || null;
  }
  if (!key) return 'the main model';
  const api = list.find((m) => m.key === key);
  if (isStr(api?.label)) return api.label;
  const name = MODEL_CARDS[sport]?.[key]?.name;
  return isStr(name) ? name : key;
}

export default function StandInNotice({ sport, data }) {
  const s = readStandIn(data);
  if (!s) return null;
  const detail = s.basis === 'season_log_loss' && s.nGames !== null
    ? `Chosen by best log loss this season (${s.nGames} games).` : null;
  return (
    <div className="ht-standin" role="status" data-testid="stand-in-notice" data-reason={s.reason}>
      <p className="ht-standin-text">
        Showing {s.label} while {productionLabel(sport, data.models)} is {s.reason === 'production_paused' ? 'paused' : 'offline'}.
      </p>
      {detail && <p className="ht-standin-detail">{detail}</p>}
    </div>
  );
}
