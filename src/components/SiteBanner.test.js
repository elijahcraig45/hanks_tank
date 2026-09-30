import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SiteBanner from './SiteBanner';
import ApiService from '../services/api';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: { getSiteStatus: jest.fn() },
}));

const status = (sports) => ({ generated_at: 'x', control_available: true, sports });
const b = (text, level) => ({ banner: { text, level } });

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <SiteBanner />
  </MemoryRouter>,
);

describe('SiteBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  test('shows the current sport banner on a sport route, not another sport', async () => {
    ApiService.getSiteStatus.mockResolvedValue(status({
      mlb: b('MLB notice', 'info'), nfl: b('NFL notice', 'warn'), cfb: { banner: null },
    }));
    renderAt('/nfl/predictions');
    expect(await screen.findByText('NFL notice')).toBeInTheDocument();
    expect(screen.queryByText('MLB notice')).toBeNull();
  });

  test('on a non-sport page shows the first sport that has a banner', async () => {
    ApiService.getSiteStatus.mockResolvedValue(status({
      mlb: { banner: null }, nfl: b('NFL first', 'info'), cfb: b('CFB later', 'info'),
    }));
    renderAt('/learn');
    expect(await screen.findByText('NFL first')).toBeInTheDocument();
    expect(screen.queryByText('CFB later')).toBeNull();
  });

  test('renders nothing on a sport route with no banner', async () => {
    ApiService.getSiteStatus.mockResolvedValue(status({ mlb: { banner: null }, nfl: b('NFL', 'warn') }));
    const { container } = renderAt('/mlb/predictions');
    await waitFor(() => expect(ApiService.getSiteStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test('info is a status, warn and error are alerts', async () => {
    ApiService.getSiteStatus.mockResolvedValue(status({ mlb: b('hello', 'info') }));
    const { unmount } = renderAt('/mlb');
    expect(await screen.findByRole('status')).toHaveTextContent('hello');
    unmount();

    for (const level of ['warn', 'error']) {
      ApiService.getSiteStatus.mockResolvedValue(status({ mlb: b(`lvl ${level}`, level) }));
      const r = renderAt('/mlb');
      const el = await screen.findByRole('alert');
      expect(el).toHaveTextContent(`lvl ${level}`);
      expect(el).toHaveClass(`ht-banner--${level}`);
      expect(screen.queryByRole('button', { name: /dismiss/i })).toBeNull();
      r.unmount();
    }
  });

  test('an unknown level falls back to info', async () => {
    ApiService.getSiteStatus.mockResolvedValue(status({ mlb: b('odd', 'loud') }));
    renderAt('/mlb');
    expect(await screen.findByRole('status')).toHaveTextContent('odd');
  });

  test('info can be dismissed and stays dismissed for the session', async () => {
    ApiService.getSiteStatus.mockResolvedValue(status({ mlb: b('bye', 'info') }));
    const { unmount } = renderAt('/mlb');
    fireEvent.click(await screen.findByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('bye')).toBeNull();
    unmount();
    const again = renderAt('/mlb');
    await waitFor(() => expect(ApiService.getSiteStatus).toHaveBeenCalledTimes(2));
    expect(again.container).toBeEmptyDOMElement();
  });

  test('banner text is plain text: markup is shown literally, no element created', async () => {
    ApiService.getSiteStatus.mockResolvedValue(status({ mlb: b('Down <b>x</b> <img src=x onerror=alert(1)>', 'warn') }));
    const { container } = renderAt('/mlb');
    const el = await screen.findByRole('alert');
    expect(el).toHaveTextContent('Down <b>x</b> <img src=x onerror=alert(1)>');
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  test('API failure or a null status renders nothing and no error UI', async () => {
    ApiService.getSiteStatus.mockRejectedValue(new Error('404'));
    const { container, unmount } = renderAt('/mlb');
    await waitFor(() => expect(ApiService.getSiteStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    unmount();
    ApiService.getSiteStatus.mockResolvedValue(null);
    const r = renderAt('/mlb');
    await waitFor(() => expect(ApiService.getSiteStatus).toHaveBeenCalledTimes(2));
    expect(r.container).toBeEmptyDOMElement();
  });

  test('a malformed payload renders nothing', async () => {
    ApiService.getSiteStatus.mockResolvedValue({ sports: { mlb: { banner: { text: 42 } } } });
    const { container } = renderAt('/mlb');
    await waitFor(() => expect(ApiService.getSiteStatus).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
