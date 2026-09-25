import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SEASONS } from '../config/constants';
import {
  CFB_DIVISIONS, MLB_NAV, SPORTS, footballNav, footballPath, sportContext,
} from '../config/sports';
import { SECTIONS as FOOTBALL_SECTIONS } from './FootballPage';
import { resolvedTheme, setTheme } from '../utils/theme';
import './styles/Navbar.css';

/**
 * The site shell.
 *
 * Three sports, one navigation model. The sport is the first choice (top bar on
 * desktop, bottom tab bar on a phone); inside a sport the same sections always sit in
 * the same order, so NFL, college and MLB read as peers rather than a baseball site
 * with football attached. Football's sections come from FootballPage's own SECTIONS
 * list, so a section added there shows up here without editing the nav.
 */

/** Football section the path points at; a game page belongs to the scoreboard. */
export function footballSectionOf(pathname, pickem) {
  if (pickem) return 'pickem';
  const seg = pathname.split('/').filter(Boolean);
  const rest = seg[0] === 'cfb' ? seg.slice(2) : seg.slice(1);
  if (rest[0] === 'game') return 'scoreboard';
  return rest[0] || 'picks';
}

const pathHit = (pathname, to, exact) => (
  exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
);

function mlbNav(pathname) {
  return MLB_NAV.map((item) => {
    const children = item.children?.map((c) => ({ ...c, active: pathHit(pathname, c.to, c.exact) })) || null;
    const active = pathHit(pathname, item.to, item.exact)
      || (item.match || []).some((m) => pathname.startsWith(m))
      || Boolean(children?.some((c) => c.active));
    return { ...item, active, children };
  });
}

function footballNavWithState(ctx, pathname) {
  const current = footballSectionOf(pathname, ctx.pickem);
  return footballNav(ctx.league, FOOTBALL_SECTIONS || []).map((item) => {
    const children = item.children?.map((c) => ({ ...c, active: c.key === current })) || null;
    const ownKey = item.key === 'pickem' ? 'pickem' : item.to.split('/').pop();
    const active = children ? children.some((c) => c.active) : ownKey === current;
    return { ...item, active, children };
  });
}

function ThemeToggle() {
  const [theme, setThemeState] = useState(
    () => document.documentElement.getAttribute('data-theme') || resolvedTheme()
  );
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="ht-icon-btn"
      onClick={() => setThemeState(setTheme(next))}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
    </button>
  );
}

const SWITCHER = [
  { key: 'all', label: 'All sports', short: 'Home', icon: '◎', to: '/' },
  ...SPORTS.map((s) => ({ key: s.key, label: s.label, short: s.label, icon: s.icon, to: s.home })),
];

function SportBar({ ctx, nav, pathname }) {
  const sport = SPORTS.find((s) => s.key === ctx.sport);
  const activeGroup = nav.find((i) => i.active && i.children);
  const currentSection = footballSectionOf(pathname, ctx.pickem);

  return (
    <div className="ht-sportbar" data-sport={ctx.sport}>
      <div className="ht-sportbar-inner">
        <Link to={sport.home} className="ht-sportbar-name">
          <span aria-hidden="true">{sport.icon}</span>
          <span className="ht-sportbar-full">{sport.name}</span>
        </Link>

        <nav className="ht-sections" aria-label={`${sport.label} sections`}>
          {nav.map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={`ht-section${item.active ? ' ht-section--active' : ''}`}
              aria-current={item.active && !item.children ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {ctx.sport === 'cfb' && !ctx.pickem && (
          <div className="ht-division" role="group" aria-label="Division">
            {CFB_DIVISIONS.map((d) => (
              <Link
                key={d}
                to={footballPath(d, currentSection)}
                className={`ht-division-btn${ctx.league === d ? ' ht-division-btn--active' : ''}`}
                aria-current={ctx.league === d ? 'true' : undefined}
              >
                {d.toUpperCase()}
              </Link>
            ))}
          </div>
        )}
      </div>

      {activeGroup && (
        <div className="ht-subnav">
          <nav className="ht-subnav-inner" aria-label={`${activeGroup.label} pages`}>
            {activeGroup.children.map((c) => (
              <Link
                key={c.key}
                to={c.to}
                className={`ht-pill${c.active ? ' ht-pill--active' : ''}`}
                aria-current={c.active ? 'page' : undefined}
              >
                {c.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

function Navbar() {
  const { pathname } = useLocation();
  const ctx = useMemo(() => sportContext(pathname), [pathname]);
  const nav = useMemo(() => {
    if (ctx.sport === 'mlb') return mlbNav(pathname);
    if (ctx.sport === 'nfl' || ctx.sport === 'cfb') return footballNavWithState(ctx, pathname);
    return [];
  }, [ctx, pathname]);
  const onPickem = pathname.startsWith('/pickem');

  // The accent follows the sport everywhere, including portalled modals.
  useEffect(() => {
    document.documentElement.setAttribute('data-sport', ctx.sport);
  }, [ctx.sport]);

  const switcherActive = (key) => !onPickem && ctx.sport === key;

  return (
    <>
      <a href="#main" className="ht-skip">Skip to content</a>
      <header className="ht-shell" data-sport={ctx.sport}>
        <div className="ht-top">
          <div className="ht-top-inner">
            <Link to="/" className="ht-brand">
              <span className="ht-brand-mark" aria-hidden="true">HT</span>
              <span className="ht-brand-name">Hank&rsquo;s Tank</span>
              <span className="ht-brand-year">{SEASONS.DEFAULT}</span>
            </Link>

            <nav className="ht-switcher" aria-label="Sport">
              {SWITCHER.map((s) => (
                <Link
                  key={s.key}
                  to={s.to}
                  data-sport={s.key}
                  className={`ht-switch${switcherActive(s.key) ? ' ht-switch--active' : ''}`}
                  aria-current={switcherActive(s.key) ? 'page' : undefined}
                >
                  {s.key !== 'all' && <span className="ht-switch-icon" aria-hidden="true">{s.icon}</span>}
                  {s.label}
                </Link>
              ))}
            </nav>

            <div className="ht-top-actions">
              <Link to="/pickem" className={`ht-pickem${onPickem ? ' ht-pickem--active' : ''}`}>
                <span aria-hidden="true">🎯</span> Pick&rsquo;em
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {ctx.sport !== 'all' && <SportBar ctx={ctx} nav={nav} pathname={pathname} />}
      </header>

      {/* Phone: the sport choice moves to a thumb-reachable bottom bar. */}
      <nav className="ht-bottom" aria-label="Sports">
        {SWITCHER.map((s) => (
          <Link
            key={s.key}
            to={s.to}
            data-sport={s.key}
            className={`ht-bottom-link${switcherActive(s.key) ? ' ht-bottom-link--active' : ''}`}
            aria-current={switcherActive(s.key) ? 'page' : undefined}
          >
            <span className="ht-bottom-icon" aria-hidden="true">{s.icon}</span>
            <span className="ht-bottom-label">{s.short}</span>
          </Link>
        ))}
        <Link
          to="/pickem"
          className={`ht-bottom-link${onPickem ? ' ht-bottom-link--active' : ''}`}
          aria-current={onPickem ? 'page' : undefined}
        >
          <span className="ht-bottom-icon" aria-hidden="true">🎯</span>
          <span className="ht-bottom-label">Pick&rsquo;em</span>
        </Link>
      </nav>
    </>
  );
}

export default Navbar;
