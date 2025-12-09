/**
 * Application Constants and Configuration
 * Centralized configuration for the Hanks Tank MLB Analytics Application
 */

// Season Configuration
export const SEASONS = {
  DEFAULT: parseInt(process.env.REACT_APP_DEFAULT_SEASON) || new Date().getFullYear(),
  MIN: parseInt(process.env.REACT_APP_MIN_SEASON) || 2015,
  MAX: parseInt(process.env.REACT_APP_MAX_SEASON) || 2026,
  CURRENT: new Date().getFullYear(),
};

// Generate array of available seasons
export const AVAILABLE_SEASONS = Array.from(
  { length: SEASONS.MAX - SEASONS.MIN + 1 },
  (_, i) => SEASONS.MAX - i
);

// MLB Teams Configuration
export const MLB_TEAMS = {
  // American League East
  BAL: { name: 'Baltimore Orioles', division: 'AL East', league: 'AL' },
  BOS: { name: 'Boston Red Sox', division: 'AL East', league: 'AL' },
  NYY: { name: 'New York Yankees', division: 'AL East', league: 'AL' },
  TB: { name: 'Tampa Bay Rays', division: 'AL East', league: 'AL' },
  TOR: { name: 'Toronto Blue Jays', division: 'AL East', league: 'AL' },
  
  // American League Central
  CWS: { name: 'Chicago White Sox', division: 'AL Central', league: 'AL' },
  CLE: { name: 'Cleveland Guardians', division: 'AL Central', league: 'AL' },
  DET: { name: 'Detroit Tigers', division: 'AL Central', league: 'AL' },
  KC: { name: 'Kansas City Royals', division: 'AL Central', league: 'AL' },
  MIN: { name: 'Minnesota Twins', division: 'AL Central', league: 'AL' },
  
  // American League West
  HOU: { name: 'Houston Astros', division: 'AL West', league: 'AL' },
  LAA: { name: 'Los Angeles Angels', division: 'AL West', league: 'AL' },
  OAK: { name: 'Oakland Athletics', division: 'AL West', league: 'AL' },
  SEA: { name: 'Seattle Mariners', division: 'AL West', league: 'AL' },
  TEX: { name: 'Texas Rangers', division: 'AL West', league: 'AL' },
  
  // National League East
  ATL: { name: 'Atlanta Braves', division: 'NL East', league: 'NL' },
  MIA: { name: 'Miami Marlins', division: 'NL East', league: 'NL' },
  NYM: { name: 'New York Mets', division: 'NL East', league: 'NL' },
  PHI: { name: 'Philadelphia Phillies', division: 'NL East', league: 'NL' },
  WSH: { name: 'Washington Nationals', division: 'NL East', league: 'NL' },
  
  // National League Central
  CHC: { name: 'Chicago Cubs', division: 'NL Central', league: 'NL' },
  CIN: { name: 'Cincinnati Reds', division: 'NL Central', league: 'NL' },
  MIL: { name: 'Milwaukee Brewers', division: 'NL Central', league: 'NL' },
  PIT: { name: 'Pittsburgh Pirates', division: 'NL Central', league: 'NL' },
  STL: { name: 'St. Louis Cardinals', division: 'NL Central', league: 'NL' },
  
  // National League West
  ARI: { name: 'Arizona Diamondbacks', division: 'NL West', league: 'NL' },
  COL: { name: 'Colorado Rockies', division: 'NL West', league: 'NL' },
  LAD: { name: 'Los Angeles Dodgers', division: 'NL West', league: 'NL' },
  SD: { name: 'San Diego Padres', division: 'NL West', league: 'NL' },
  SF: { name: 'San Francisco Giants', division: 'NL West', league: 'NL' },
};

// Statistical Categories
export const BATTING_STATS = {
  BASIC: ['G', 'AB', 'PA', 'R', 'H', '2B', '3B', 'HR', 'RBI', 'SB', 'CS', 'BB', 'SO'],
  RATE: ['AVG', 'OBP', 'SLG', 'OPS', 'wOBA', 'wRC+', 'ISO'],
  ADVANCED: ['WAR', 'wRC+', 'wOBA', 'ISO', 'BABIP', 'K%', 'BB%', 'HR/FB'],
};

export const PITCHING_STATS = {
  BASIC: ['W', 'L', 'ERA', 'G', 'GS', 'CG', 'SHO', 'SV', 'IP', 'H', 'R', 'ER', 'HR', 'BB', 'SO'],
  RATE: ['ERA', 'WHIP', 'K/9', 'BB/9', 'HR/9', 'K/BB', 'FIP', 'xFIP'],
  ADVANCED: ['WAR', 'FIP', 'xFIP', 'SIERA', 'K%', 'BB%', 'BABIP', 'LOB%', 'GB%'],
};

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  CACHE_TTL: {
    TEAMS: 30, // minutes
    PLAYERS: 30,
    STANDINGS: 10,
    GAMES: 2,
    NEWS: 60,
  },
};

// Feature Flags
export const FEATURES = {
  DEBUG: process.env.REACT_APP_DEBUG === 'true',
  ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  CACHE: process.env.REACT_APP_CACHE_API_RESPONSES !== 'false',
  DEBUG_LOGS: process.env.REACT_APP_ENABLE_DEBUG_LOGS === 'true',
};

// UI Configuration
export const UI_CONFIG = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,
  DEFAULT_CHART_HEIGHT: 400,
  DEFAULT_CHART_WIDTH: 600,
  ANIMATION_DURATION: 300,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection and try again.',
  TIMEOUT: 'Request timed out. Please try again.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  GENERIC: 'An error occurred. Please try again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  DATA_LOADED: 'Data loaded successfully',
  CACHE_CLEARED: 'Cache cleared successfully',
  NEWS_REFRESHED: 'News updated successfully',
};

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  API: 'YYYY-MM-DD',
  TIMESTAMP: 'YYYY-MM-DD HH:mm:ss',
};

// Colors (for charts and visualizations)
export const CHART_COLORS = {
  PRIMARY: '#0d6efd',
  SUCCESS: '#198754',
  DANGER: '#dc3545',
  WARNING: '#ffc107',
  INFO: '#0dcaf0',
  LIGHT: '#f8f9fa',
  DARK: '#212529',
  BRAVES: {
    PRIMARY: '#CE1141',
    SECONDARY: '#13274F',
  },
};

// Export default config object
const config = {
  SEASONS,
  AVAILABLE_SEASONS,
  MLB_TEAMS,
  BATTING_STATS,
  PITCHING_STATS,
  API_CONFIG,
  FEATURES,
  UI_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  DATE_FORMATS,
  CHART_COLORS,
};

export default config;
