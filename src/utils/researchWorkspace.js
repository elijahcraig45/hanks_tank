export const SAVED_RESEARCH_VIEWS_KEY = 'ht-saved-research-views';
export const RESEARCH_WATCHLIST_KEY = 'ht-research-watchlist';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadCollection(key) {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`Failed to parse ${key}.`, error);
    return [];
  }
}

function saveCollection(key, value) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadSavedResearchViews() {
  return loadCollection(SAVED_RESEARCH_VIEWS_KEY);
}

export function saveResearchView(view) {
  const nextView = {
    id: view.id || view.path,
    label: view.label,
    hint: view.hint || '',
    category: view.category || 'analytics',
    path: view.path,
    savedAt: new Date().toISOString(),
  };

  const current = loadSavedResearchViews().filter((entry) => entry.path !== nextView.path);
  const next = [nextView, ...current].slice(0, 30);
  saveCollection(SAVED_RESEARCH_VIEWS_KEY, next);
  return next;
}

export function removeResearchView(id) {
  const next = loadSavedResearchViews().filter((entry) => entry.id !== id);
  saveCollection(SAVED_RESEARCH_VIEWS_KEY, next);
  return next;
}

export function loadResearchWatchlist() {
  return loadCollection(RESEARCH_WATCHLIST_KEY);
}

export function addResearchWatchlistItem(item) {
  const nextItem = {
    id: item.id,
    type: item.type,
    label: item.label,
    subtitle: item.subtitle || '',
    path: item.path,
    savedAt: new Date().toISOString(),
  };

  const current = loadResearchWatchlist().filter((entry) => entry.id !== nextItem.id);
  const next = [nextItem, ...current].slice(0, 50);
  saveCollection(RESEARCH_WATCHLIST_KEY, next);
  return next;
}

export function removeResearchWatchlistItem(id) {
  const next = loadResearchWatchlist().filter((entry) => entry.id !== id);
  saveCollection(RESEARCH_WATCHLIST_KEY, next);
  return next;
}

export function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
