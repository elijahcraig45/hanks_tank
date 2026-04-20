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
});
