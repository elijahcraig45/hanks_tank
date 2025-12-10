/**
 * Centralized API Service for Hanks Tank
 * Handles all backend communication with error handling, retries, and caching
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://hankstank.uc.r.appspot.com/api';
const API_TIMEOUT = 60000; // 60 seconds for mobile networks
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

class ApiService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(key) {
    if (!this.cache.has(key)) return false;
    const expiry = this.cacheExpiry.get(key);
    return expiry && expiry > Date.now();
  }

  /**
   * Set cache with TTL
   */
  setCache(key, data, ttlMinutes = 10) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + (ttlMinutes * 60 * 1000));
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (expiry <= now) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  /**
   * Make HTTP request with timeout, retries, and error handling
   */
  async request(endpoint, options = {}, retryCount = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle specific HTTP errors
        if (response.status === 404) {
          throw new Error('Resource not found');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout specifically for mobile
      if (error.name === 'AbortError') {
        console.warn('Request timeout - slow network detected');
      }

      // Retry on network errors or 5xx errors
      if (retryCount < RETRY_ATTEMPTS && 
          (error.name === 'AbortError' || 
           error.message.includes('Server error') ||
           error.message.includes('Failed to fetch'))) {
        console.warn(`Request failed, retrying (${retryCount + 1}/${RETRY_ATTEMPTS})...`, error.message);
        await this.sleep(RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
        return this.request(endpoint, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * GET request with caching and deduplication
   */
  async get(endpoint, options = {}) {
    const cacheKey = `GET:${endpoint}`;
    
    // Return cached data if valid
    if (this.isCacheValid(cacheKey)) {
      console.log(`📦 Cache hit: ${endpoint}`);
      return this.cache.get(cacheKey);
    }

    // Deduplicate simultaneous requests
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`⏳ Awaiting pending request: ${endpoint}`);
      return this.pendingRequests.get(cacheKey);
    }

    // Make request
    const requestPromise = this.request(endpoint, { ...options, method: 'GET' })
      .then(data => {
        this.setCache(cacheKey, data, options.cacheTTL || 10);
        this.pendingRequests.delete(cacheKey);
        return data;
      })
      .catch(error => {
        this.pendingRequests.delete(cacheKey);
        throw error;
      });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * POST request
   */
  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ============ MLB Data Endpoints ============

  /**
   * Get team batting statistics
   */
  async getTeamBatting(year = 2026, options = {}) {
    const { sortStat = 'ops', direction = 'desc', limit = 30 } = options;
    return this.get(`/team-batting?year=${year}&sortStat=${sortStat}&direction=${direction}&limit=${limit}`, {
      cacheTTL: 30 // 30 minutes
    });
  }

  /**
   * Get team pitching statistics
   */
  async getTeamPitching(year = 2026, options = {}) {
    const { sortStat = 'era', direction = 'asc', limit = 30 } = options;
    return this.get(`/team-pitching?year=${year}&sortStat=${sortStat}&direction=${direction}&limit=${limit}`, {
      cacheTTL: 30
    });
  }

  /**
   * Get player batting statistics
   */
  async getPlayerBatting(year = 2026, options = {}) {
    const { sortStat = 'ops', direction = 'desc', limit = 100 } = options;
    return this.get(`/player-batting?year=${year}&sortStat=${sortStat}&direction=${direction}&limit=${limit}`, {
      cacheTTL: 30
    });
  }

  /**
   * Get player pitching statistics
   */
  async getPlayerPitching(year = 2026, options = {}) {
    const { sortStat = 'era', direction = 'asc', limit = 100 } = options;
    return this.get(`/player-pitching?year=${year}&sortStat=${sortStat}&direction=${direction}&limit=${limit}`, {
      cacheTTL: 30
    });
  }

  /**
   * Get standings
   */
  async getStandings(year = 2026) {
    return this.get(`/standings?year=${year}`, {
      cacheTTL: 10 // 10 minutes for standings (changes frequently)
    });
  }

  /**
   * Get MLB news
   */
  async getMLBNews() {
    return this.get('/mlb-news', { cacheTTL: 60 }); // 1 hour
  }

  /**
   * Get Braves news
   */
  async getBravesNews() {
    return this.get('/braves-news', { cacheTTL: 60 });
  }

  /**
   * Refresh news (force update)
   */
  async refreshNews() {
    // Clear news cache
    this.cache.delete('GET:/mlb-news');
    this.cache.delete('GET:/braves-news');
    this.cacheExpiry.delete('GET:/mlb-news');
    this.cacheExpiry.delete('GET:/braves-news');
    
    return this.post('/news/refresh');
  }

  /**
   * Get available statistics
   */
  async getAvailableStats(dataType = 'team-batting') {
    return this.get(`/available-stats?dataType=${dataType}`, { cacheTTL: 1440 }); // 24 hours
  }

  /**
   * Get player data from FanGraphs
   */
  async getPlayerData(playerId, position = 'batter') {
    return this.get(`/playerData?playerId=${playerId}&position=${position}`, { cacheTTL: 60 });
  }

  /**
   * Get Statcast data
   */
  async getStatcast(year = 2026, options = {}) {
    const { playerId, position = 'batter', p_throws = '', stands = '', events = '' } = options;
    const params = new URLSearchParams({
      year: year.toString(),
      position,
      ...(playerId && { playerId: playerId.toString() }),
      ...(p_throws && { p_throws }),
      ...(stands && { stands }),
      ...(events && { events }),
    });
    return this.get(`/statcast?${params}`, { cacheTTL: 60 });
  }

  /**
   * Get games for a specific date
   */
  async getGames(date = null) {
    const dateParam = date || new Date().toISOString().split('T')[0];
    // MLB Stats API direct call (not cached)
    return this.get(`https://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${dateParam}`, {
      cacheTTL: 2 // 2 minutes for live games
    });
  }

  /**
   * Get game details
   */
  async getGameDetails(gamePk) {
    return this.get(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`, {
      cacheTTL: 1 // 1 minute for live game data
    });
  }

  /**
   * Get team details
   */
  async getTeamDetails(teamId, year = 2026) {
    return this.get(`/v2/teams/${teamId}?season=${year}`, { cacheTTL: 60 });
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
    console.log('🧹 Cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    this.clearExpiredCache();
    return {
      entries: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
const apiService = new ApiService();

// Clear expired cache every 5 minutes
setInterval(() => apiService.clearExpiredCache(), 5 * 60 * 1000);

export default apiService;
