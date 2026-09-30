import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ApiService from '../services/api';
import { sportContext } from '../config/sports';
import './styles/SiteBanner.css';

/**
 * A site-wide notice set from the model control plane (GET /api/site-status).
 *
 * Shown for the current sport on sport routes, or the first sport that has one on other
 * pages. Text is inert: rendered as a React text node, never as HTML. Fail open: if the
 * route is missing (older backend) or errors, nothing renders. Only `info` can be
 * dismissed, once per browser session; `warn` and `error` stay up.
 */

const SPORT_ORDER = ['mlb', 'nfl', 'cfb'];
const LEVELS = ['info', 'warn', 'error'];
const REFRESH_MS = 60 * 1000;
const dismissKey = (sport, text) => `ht-banner-dismissed:${sport}:${text}`;

function isDismissed(sport, text) {
  try {
    return window.sessionStorage.getItem(dismissKey(sport, text)) === '1';
  } catch (e) {
    return false;
  }
}

/** The banner to show for a path: { sport, text, level } or null. */
export function pickBanner(status, pathname) {
  const sports = status && typeof status === 'object' ? status.sports : null;
  if (!sports || typeof sports !== 'object') return null;
  const read = (sport) => {
    const b = sports[sport]?.banner;
    if (!b || typeof b.text !== 'string' || !b.text.trim()) return null;
    return { sport, text: b.text, level: LEVELS.includes(b.level) ? b.level : 'info' };
  };
  const { sport } = sportContext(pathname);
  if (sport !== 'all') return read(sport);
  for (const s of SPORT_ORDER) {
    const found = read(s);
    if (found) return found;
  }
  return null;
}

export default function SiteBanner() {
  const { pathname } = useLocation();
  const [status, setStatus] = useState(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () => {
      Promise.resolve(ApiService.getSiteStatus())
        .then((s) => { if (alive) setStatus(s || null); })
        .catch(() => { if (alive) setStatus(null); });
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const banner = pickBanner(status, pathname);
  if (!banner || (banner.level === 'info' && isDismissed(banner.sport, banner.text))) return null;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(dismissKey(banner.sport, banner.text), '1');
    } catch (e) { /* storage blocked: dismiss for this render only */ }
    setTick((t) => t + 1);
  };

  return (
    <div
      className={`ht-banner ht-banner--${banner.level}`}
      role={banner.level === 'info' ? 'status' : 'alert'}
      data-sport={banner.sport}
    >
      <p className="ht-banner-text">{banner.text}</p>
      {banner.level === 'info' && (
        <button type="button" className="ht-banner-close" onClick={dismiss} aria-label="Dismiss notice">
          &times;
        </button>
      )}
    </div>
  );
}
