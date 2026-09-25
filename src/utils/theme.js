/**
 * Light / dark theme.
 *
 * The first paint is handled by the inline script in public/index.html; this module
 * owns changes after that. "system" is stored as the absence of a choice, so a visitor
 * who never touched the toggle keeps following their OS.
 */
export const THEME_KEY = 'ht-theme';

function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function storedTheme() {
  try {
    const t = window.localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

export function resolvedTheme() {
  return storedTheme() || systemTheme();
}

export function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-bs-theme', theme);
}

export function setTheme(theme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private window: the choice lasts for this page only */
  }
  applyTheme(theme);
  return theme;
}
