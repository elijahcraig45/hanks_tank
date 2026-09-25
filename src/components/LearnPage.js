import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LEARN_GROUPS, LEARN_PAGES, learnPagePath } from '../config/learn';
import './styles/LearnPage.css';

/**
 * /learn: the index of long-form write-ups on how the models work.
 *
 * The write-ups themselves are standalone HTML pages in public/learn/ (they carry
 * their own charts and scripts), so the cards are plain links, not router links.
 */
function LearnPage() {
  const { hash } = useLocation();

  // Router navigation does not scroll to a hash on its own; the sport bars link here
  // with #mlb / #football.
  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'start' });
    }
  }, [hash]);

  const totalMinutes = LEARN_PAGES.reduce((sum, p) => sum + p.minutes, 0);

  return (
    <div className="learn">
      <header className="ht-page-head">
        <div className="ht-page-head-inner">
          <div>
            <p className="ht-eyebrow">Learn</p>
            <h1>How the models work</h1>
            <p className="ht-page-sub">
              Long-form write-ups behind the predictions and rankings: the methods, the numbers
              they were scored on, and the ideas that did not work. Every figure is measured out
              of sample.
            </p>
          </div>
          <nav className="learn-jump" aria-label="Topics">
            {LEARN_GROUPS.map((g) => (
              <a key={g.key} href={`#${g.key}`} className="learn-jump-link" data-sport={g.sport}>
                {g.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="learn-body">
        <p className="learn-count">
          {LEARN_PAGES.length} pages &middot; about {Math.round(totalMinutes / 5) * 5} minutes in all.
          Start with Foundations if the terms are new.
        </p>

        {LEARN_GROUPS.map((group) => {
          const pages = LEARN_PAGES.filter((p) => p.group === group.key);
          return (
            <section
              key={group.key}
              id={group.key}
              className="learn-group"
              data-sport={group.sport}
              aria-labelledby={`learn-${group.key}`}
            >
              <div className="learn-group-head">
                <h2 id={`learn-${group.key}`}>{group.label}</h2>
                <p>{group.blurb}</p>
              </div>
              <ul className="learn-grid">
                {pages.map((page) => (
                  <li key={page.slug}>
                    <a className="learn-card" href={learnPagePath(page.slug)}>
                      <span className="learn-card-title">{page.title}</span>
                      <span className="learn-card-desc">{page.description}</span>
                      <span className="learn-card-meta">{page.minutes} min read</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default LearnPage;
