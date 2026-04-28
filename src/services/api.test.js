import { ApiService, API_BASE_URL } from './api';

describe('ApiService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('normalizes relative URLs and caches GET responses', async () => {
    const service = new ApiService();
    const payload = { articles: [] };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => payload,
    });

    const first = await service.get('/mlb-news', { cacheTTL: 10 });
    const second = await service.get('/mlb-news', { cacheTTL: 10 });

    expect(first).toEqual(payload);
    expect(second).toEqual(payload);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/mlb-news`,
      expect.objectContaining({ method: 'GET' })
    );
  });

  test('deduplicates simultaneous GET requests', async () => {
    const service = new ApiService();
    let resolveFetch;
    global.fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = () =>
            resolve({
              ok: true,
              json: async () => ({ ok: true }),
            });
        })
    );

    const first = service.get('/braves-news');
    const second = service.get('/braves-news');
    resolveFetch();

    await expect(first).resolves.toEqual({ ok: true });
    await expect(second).resolves.toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('retries failed fetches before succeeding', async () => {
    const service = new ApiService();
    jest.spyOn(service, 'sleep').mockResolvedValue();
    global.fetch
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ recovered: true }),
      });

    await expect(service.get('/mlb-news')).resolves.toEqual({ recovered: true });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(service.sleep).toHaveBeenCalledTimes(1);
  });

  test('builds prediction diagnostics range requests', async () => {
    const service = new ApiService();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ diagnostics: [] }),
    });

    await service.getPredictionDiagnostics({ startDate: '2026-04-01', endDate: '2026-04-30' });

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/predictions/diagnostics?endDate=2026-04-30&startDate=2026-04-01`,
      expect.objectContaining({ method: 'GET' })
    );
  });

  test('builds split explorer requests', async () => {
    const service = new ApiService();
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ splits: [] }),
    });

    await service.getSplits({
      entityType: 'player',
      entityId: 660271,
      season: 2025,
      group: 'hitting',
      family: 'handedness',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/splits?entityType=player&entityId=660271&season=2025&group=hitting&family=handedness`,
      expect.objectContaining({ method: 'GET' })
    );
  });

  test('normalizes nested hybrid roster responses', async () => {
    const service = new ApiService();
    const roster = [{ person: { id: 660670, fullName: 'Ronald Acuna Jr.' } }];
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          roster: {
            roster,
          },
        },
      }),
    });

    await expect(service.getTeamRoster(144, 2026)).resolves.toEqual(roster);
  });
});
