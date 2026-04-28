const TEAM_STORAGE_KEY = 'ht-favorite-teams';
const PLAYER_STORAGE_KEY = 'ht-favorite-players';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadList(key) {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`Failed to load favorites for ${key}.`, error);
    return [];
  }
}

function saveList(key, list) {
  if (!canUseStorage()) {
    return [];
  }

  window.localStorage.setItem(key, JSON.stringify(list));
  return list;
}

function toggleListItem(key, item, matcher) {
  const current = loadList(key);
  const exists = current.some((entry) => matcher(entry, item));
  const next = exists
    ? current.filter((entry) => !matcher(entry, item))
    : [item, ...current];

  return saveList(key, next);
}

export function loadFavoriteTeams() {
  return loadList(TEAM_STORAGE_KEY);
}

export function isFavoriteTeam(abbreviation) {
  return loadFavoriteTeams().some((team) => team.abbreviation === abbreviation);
}

export function toggleFavoriteTeam(team) {
  if (!team?.abbreviation) {
    return loadFavoriteTeams();
  }

  return toggleListItem(
    TEAM_STORAGE_KEY,
    team,
    (entry, item) => entry.abbreviation === item.abbreviation
  );
}

export function loadFavoritePlayers() {
  return loadList(PLAYER_STORAGE_KEY);
}

export function isFavoritePlayer(playerId) {
  return loadFavoritePlayers().some((player) => String(player.playerId) === String(playerId));
}

export function toggleFavoritePlayer(player) {
  if (!player?.playerId) {
    return loadFavoritePlayers();
  }

  return toggleListItem(
    PLAYER_STORAGE_KEY,
    player,
    (entry, item) => String(entry.playerId) === String(item.playerId)
  );
}

export { PLAYER_STORAGE_KEY, TEAM_STORAGE_KEY };
