import { useEffect, useState } from 'react';
import apiService from '../../services/api';

/** Loads GET /api/predictions/:sport/slate for a query; `key` changes refetch. */
export default function useSlate(sport, query) {
  const key = JSON.stringify(query);
  const [state, setState] = useState({ loading: true, error: null, data: null });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    apiService.getPredictionsSlate(sport, JSON.parse(key))
      .then((data) => { if (alive) setState({ loading: false, error: null, data }); })
      .catch((e) => { if (alive) setState({ loading: false, error: e.message || 'Could not load', data: null }); });
    return () => { alive = false; };
  }, [sport, key]);
  return state;
}

export function todayEt() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

export const SPORT_LABEL = { mlb: 'MLB', nfl: 'NFL', cfb: 'College football' };
